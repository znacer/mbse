// ─── Graph Transform ──────────────────────────────────────────────────────────
//
// Converts a raw MBSE JSON file (entities + relationships) into the node/link
// format consumed by force-graph.

import type {
  MBSEFile,
  GraphData,
  GraphNode,
  GraphLink,
} from "$lib/types/mbse";

export function transformMBSEToGraph(file: MBSEFile): GraphData {
  const nodeIds = new Set(file.entities.map((e) => e.uuid));

  const nodes: GraphNode[] = file.entities.map((e) => ({
    id: e.uuid,
    name: e.name,
    description: e.description,
    type: e.type,
  }));

  const links: GraphLink[] = file.relationships
    .filter((r) => {
      const valid = nodeIds.has(r.source) && nodeIds.has(r.target);
      if (!valid) {
        console.warn(
          `[graphTransform] Skipping "${r.name}" (${r.uuid}): source or target not found.`,
        );
      }
      return valid;
    })
    .map((r) => ({
      id: r.uuid,
      name: r.name,
      description: r.description,
      source: r.source,
      target: r.target,
    }));

  return { nodes, links };
}

export function parseMBSEFile(raw: unknown): MBSEFile {
  // Case 1: Handle array format - take first element
  if (Array.isArray(raw)) {
    if (raw.length === 0) {
      throw new Error("MBSE file array is empty.");
    }
    console.log(
      "[parseMBSEFile] Detected array format, processing first element.",
    );
    raw = raw[0];
  }

  // Ensure we have an object
  if (typeof raw !== "object" || raw === null) {
    throw new Error("MBSE file must be a JSON object.");
  }

  let obj = raw as Record<string, unknown>;

  // handle the case "entries" instead of "entities"
  if (Array.isArray(obj.entries)) {
    obj = { ...obj, entities: obj.entries };
  }

  // Validate array format
  if (!Array.isArray(obj.entities))
    throw new Error('Missing "entities" array.');
  if (!Array.isArray(obj.relationships))
    throw new Error('Missing "relationships" array.');

  for (let i = 0; i < obj.entities.length; i++) {
    const e = obj.entities[i] as Record<string, unknown>;
    for (const f of ["name", "uuid", "description", "type"] as const) {
      if (typeof e[f] !== "string")
        throw new Error(`entities[${i}].${f} must be a string.`);
    }
  }
  for (let i = 0; i < obj.relationships.length; i++) {
    const r = obj.relationships[i] as Record<string, unknown>;
    for (const f of [
      "name",
      "uuid",
      "description",
      "source",
      "target",
    ] as const) {
      if (typeof r[f] !== "string")
        throw new Error(`relationships[${i}].${f} must be a string.`);
    }
  }
  return {
    entities: obj.entities,
    relationships: obj.relationships,
  } as MBSEFile;
}
