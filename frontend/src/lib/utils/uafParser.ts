// ─── UAF XMI Parser ───────────────────────────────────────────────────────────
//
// Fetches /UAF.xmi (a symlink pointing to resources/UAF.xmi) at runtime and
// parses every uml:Stereotype element: name, description, parent package,
// top-level UAF domain, and an assigned domain colour.
//
// Because the file is loaded dynamically, updating resources/UAF.xmi is
// enough to pick up new type definitions — no code changes required.

import type {
  UAFDefinitions,
  UAFStereotype,
  DomainEntry,
} from "$lib/types/mbse";

// ─── Domain → colour ───────────────────────────────────────────────────────────

const DOMAIN_COLORS: Record<string, string> = {
  Operational: "#3B82F6", // blue-500
  "Architecture Management": "#6366F1", // indigo-500
  Services: "#22C55E", // green-500
  Resources: "#F97316", // orange-500
  Strategic: "#A855F7", // purple-500
  "Actual Resources": "#F59E0B", // amber-500
  Personnel: "#EAB308", // yellow-500
  Security: "#EF4444", // red-500
  Standards: "#6B7280", // gray-500
  Projects: "#14B8A6", // teal-500
  "Summary and Overview": "#06B6D4", // cyan-500
  Parameters: "#64748B", // slate-500
};

const DEFAULT_COLOR = "#94A3B8"; // slate-400

const NS_XMI = "http://www.omg.org/spec/XMI/20131001";
const NS_UML = "http://www.omg.org/spec/UML/20161101";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function xmiAttr(el: Element, local: string): string {
  return (
    el.getAttributeNS(NS_XMI, local) ??
    el.getAttribute(`xmi:${local}`) ??
    el.getAttribute(local) ??
    ""
  );
}

function umlType(el: Element): string {
  return (
    el.getAttributeNS(NS_XMI, "type") ??
    el.getAttribute("xmi:type") ??
    el.getAttribute("type") ??
    ""
  );
}

function ownedCommentBody(el: Element): string {
  for (const child of Array.from(el.children)) {
    const tag = child.localName ?? child.nodeName.split(":").pop() ?? "";
    if (tag === "ownedComment") return child.getAttribute("body") ?? "";
  }
  return "";
}

// ─── Recursive package walker ─────────────────────────────────────────────────

function walkPackage(
  el: Element,
  domain: string,
  packageName: string,
  out: UAFDefinitions,
): void {
  for (const child of Array.from(el.children)) {
    const tag = child.localName ?? child.nodeName.split(":").pop() ?? "";
    if (tag !== "packagedElement") continue;

    const type = umlType(child);

    if (type === "uml:Package") {
      const childPkg = child.getAttribute("name") ?? packageName;
      const childDomain = domain === "" ? childPkg : domain;
      walkPackage(child, childDomain, childPkg, out);
    } else if (type === "uml:Stereotype") {
      const name = child.getAttribute("name");
      if (!name) continue;
      const stereotype: UAFStereotype = {
        name,
        id: xmiAttr(child, "id"),
        description: ownedCommentBody(child),
        packageName,
        domain,
        color: DOMAIN_COLORS[domain] ?? DEFAULT_COLOR,
      };
      out.set(name, stereotype);
    }
  }
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch and parse the UAF XMI file, returning a Map keyed by stereotype name.
 * The file at `uafPath` is served from public/ (symlinked to resources/UAF.xmi).
 */
export async function loadUAFDefinitions(
  uafPath = "/UAF.xmi",
): Promise<UAFDefinitions> {
  const res = await fetch(uafPath);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch ${uafPath}: ${res.status} ${res.statusText}`,
    );
  }
  const doc = new DOMParser().parseFromString(
    await res.text(),
    "application/xml",
  );
  const parseErr = doc.querySelector("parsererror");
  if (parseErr)
    throw new Error(`Failed to parse UAF.xmi: ${parseErr.textContent}`);

  const profile =
    doc.getElementsByTagNameNS(NS_UML, "Profile")[0] ??
    doc.querySelector('uml\\:Profile, Profile[name="UAF"]');
  if (!profile) throw new Error("Could not locate uml:Profile in UAF.xmi");

  const defs: UAFDefinitions = new Map();
  walkPackage(profile, "", "", defs);
  return defs;
}

export function getTypeColor(typeName: string, defs: UAFDefinitions): string {
  return defs.get(typeName)?.color ?? DEFAULT_COLOR;
}

export function getDomainLegend(defs: UAFDefinitions): DomainEntry[] {
  // domain → { color, pkgs: packageName → stereotype names[] }
  const domains = new Map<
    string,
    { color: string; pkgs: Map<string, string[]> }
  >();

  for (const s of defs.values()) {
    if (!s.domain) continue;
    if (!domains.has(s.domain)) {
      domains.set(s.domain, { color: s.color, pkgs: new Map() });
    }
    const d = domains.get(s.domain)!;
    if (!d.pkgs.has(s.packageName)) d.pkgs.set(s.packageName, []);
    d.pkgs.get(s.packageName)!.push(s.name);
  }

  return Array.from(domains.entries())
    .map(([domain, { color, pkgs }]) => ({
      domain,
      color,
      subpackages: Array.from(pkgs.entries())
        .filter(([name]) => name !== "")
        .map(([name, stereotypeNames]) => ({
          name,
          stereotypeNames: stereotypeNames.sort((a, b) => a.localeCompare(b)),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.domain.localeCompare(b.domain));
}
