// ─── Mock MBSE Data Generator ─────────────────────────────────────────────────
//
// Generates a synthetic MBSEFile (entities + relationships) from the live UAF
// definitions.  Used exclusively from the dev-only toolbar button — tree-shaken
// out of production bundles because every call-site is guarded by
// `import.meta.env.DEV`.

import type {
  MBSEFile,
  MBSEEntity,
  MBSERelationship,
  UAFDefinitions,
} from "$lib/types/mbse";

// ─── Name-generation vocabulary ───────────────────────────────────────────────

const QUALIFIERS = [
  "Primary",
  "Secondary",
  "Forward",
  "Reserve",
  "Central",
  "Remote",
  "Integrated",
  "Distributed",
  "Tactical",
  "Strategic",
  "Advanced",
  "Core",
  "Joint",
  "Combined",
  "Mobile",
  "Fixed",
  "Persistent",
  "Interim",
  "Baseline",
  "Augmented",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** UUID v4 generator that works in both secure and non-secure contexts.
 *  crypto.randomUUID() is only available on HTTPS / localhost; when served
 *  over plain HTTP (e.g. on a local Pi without TLS) we fall back to a
 *  Math.random-based implementation that is good enough for mock data. */
function uuid(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  // RFC 4122 §4.4 compliant v4 UUID fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Pick a uniformly random element from an array */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Split a CamelCase identifier into space-separated words.
 * "OperationalActivity" → "Operational Activity"
 * "StActualOrganizationalResource" → "St Actual Organizational Resource"
 */
function camelToWords(s: string): string {
  return s
    .replace(/([A-Z])/g, " $1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Human-readable name for a generated entity */
function makeEntityName(typeName: string, index: number): string {
  const qualifier = QUALIFIERS[index % QUALIFIERS.length];
  const words = camelToWords(typeName);
  return `${qualifier} ${words} ${index + 1}`;
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface GeneratorOptions {
  /** Number of entities (nodes) to create */
  nodeCount: number;
  /** Number of relationships (edges) to create */
  relationCount: number;
  /**
   * Optional set of UAF type names to restrict generation to.
   * When empty / undefined, all available types are used.
   */
  allowedTypes?: Set<string>;
}

export interface GeneratorResult {
  file: MBSEFile;
  /** Actual number of relationships created (may be < relationCount if the
   *  graph is too dense to satisfy the request without duplicates). */
  actualRelationCount: number;
  /** How many unique UAF types appear in the generated entities */
  typeCount: number;
}

// ─── Core generator ───────────────────────────────────────────────────────────

/**
 * Generate a synthetic MBSE file from the live UAF definitions.
 *
 * Algorithm
 * ---------
 * 1. Build the pool of eligible UAF type names (optionally filtered).
 * 2. Assign each entity a random type from the pool and a deterministic name.
 * 3. Attempt to create `relationCount` unique directed edges (no self-loops,
 *    no duplicate pairs).  Stop after `relationCount × 20` failed attempts so
 *    we never hang on an impossibly dense request.
 */
export function generateMockMBSEFile(
  defs: UAFDefinitions,
  options: GeneratorOptions,
): GeneratorResult {
  const { nodeCount, relationCount, allowedTypes } = options;

  // ── Type pool ──────────────────────────────────────────────────────────────
  let types = Array.from(defs.keys());
  if (allowedTypes && allowedTypes.size > 0) {
    types = types.filter((t) => allowedTypes.has(t));
  }
  if (types.length === 0) {
    throw new Error(
      "No UAF type definitions available.  Make sure UAF.xmi loaded correctly.",
    );
  }

  // ── Entities ───────────────────────────────────────────────────────────────
  const entities: MBSEEntity[] = Array.from({ length: nodeCount }, (_, i) => {
    const type = pick(types);
    const def = defs.get(type)!;
    const desc = def.description
      ? def.description.slice(0, 140)
      : `Auto-generated ${type} element`;
    return {
      name: makeEntityName(type, i),
      uuid: uuid(),
      description: desc,
      type,
    };
  });

  // ── Relationships ──────────────────────────────────────────────────────────
  // Hard-cap: a complete directed graph has n*(n-1) edges.
  const maxPossible = nodeCount * (nodeCount - 1);
  const targetCount = Math.min(relationCount, maxPossible);

  const uuids = entities.map((e) => e.uuid);
  const relationships: MBSERelationship[] = [];
  const usedPairs = new Set<string>();

  const maxAttempts = Math.max(targetCount * 20, 1000);
  let attempts = 0;

  while (relationships.length < targetCount && attempts < maxAttempts) {
    attempts++;

    const si = Math.floor(Math.random() * nodeCount);
    let ti = Math.floor(Math.random() * nodeCount);

    // No self-loops
    if (ti === si) continue;

    const pairKey = `${si}:${ti}`;
    if (usedPairs.has(pairKey)) continue;
    usedPairs.add(pairKey);

    const srcName = entities[si].name;
    const tgtName = entities[ti].name;
    const srcType = camelToWords(entities[si].type);
    const tgtType = camelToWords(entities[ti].type);

    relationships.push({
      name: `${srcType} → ${tgtType}`,
      uuid: uuid(),
      description: `Relationship from "${srcName}" to "${tgtName}"`,
      source: uuids[si],
      target: uuids[ti],
    });
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const typeCount = new Set(entities.map((e) => e.type)).size;

  return {
    file: { entities, relationships },
    actualRelationCount: relationships.length,
    typeCount,
  };
}

/**
 * Convenience wrapper: generate and immediately serialise to a JSON string.
 * Useful for the "Download" action.
 */
export function generateMockJSON(
  defs: UAFDefinitions,
  options: GeneratorOptions,
): { json: string; result: GeneratorResult } {
  const result = generateMockMBSEFile(defs, options);
  return { json: JSON.stringify(result.file, null, 2), result };
}
