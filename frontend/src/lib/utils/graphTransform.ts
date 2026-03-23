import type {
  MBSEData,
  GraphNode,
  GraphLink,
  UAFData,
} from "$lib/types/mbse.js";
import { getDomainForStereotype } from "./uafParser.js";

export function transformMBSEToGraph(
  data: MBSEData,
  uafData: UAFData,
): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes: GraphNode[] = data.entities.map((entity) => ({
    id: entity.uuid,
    name: entity.name,
    description: entity.description,
    type: entity.type,
    domain: getDomainForStereotype(entity.type, uafData),
  }));

  const links: GraphLink[] = data.relationships.map((rel) => ({
    id: rel.uuid,
    source: rel.source,
    target: rel.target,
    name: rel.name,
    description: rel.description,
  }));

  return { nodes, links };
}

export function parseLegacyMBSEData(data: unknown): {
  entities: object[];
  relationships: object[];
} {
  let obj = data as Record<string, unknown>;

  // if obj is an array, take the first element
  if (Array.isArray(data)) {
    obj = data[0] as Record<string, unknown>;
  }

  // if legacy data : elements become entities
  if (Array.isArray(obj.elements)) {
    obj.entities = obj.elements;
  }

  //check entities and relationships are arrays
  if (!Array.isArray(obj.entities))
    throw new Error("Invalid legacy data: elements must be an array");
  if (!Array.isArray(obj.relationships))
    throw new Error("Invalid legacy data: relationships must be an array");

  let relationships = [];
  // links sources and targets are uuids of id_local. We need to convert them to entity name
  for (let rel of obj.relationships) {
    let source = obj.entities.find((entity) => entity.uuid === rel.source);
    if (!source) {
      source = obj.entities.find((entity) => entity.id_local === rel.source);
    }
    let target = obj.entities.find((entity) => entity.uuid === rel.target);
    if (!target) {
      target = obj.entities.find((entity) => entity.id_local === rel.source);
    }

    //filter out relationships with invalid source or target
    if (!source || !target) continue;
    if (!source.uuid || !target.uuid) continue;
    if (source.uuid === "" || target.uuid === "") continue;

    relationships.push({
      uuid: rel.uuid,
      source: source?.uuid || "",
      target: target?.uuid || "",
      name: rel.name,
      description: rel.description,
    });
  }

  //   return {
  //     uuid: rel.uuid,
  //     source: source?.uuid || "",
  //     target: target?.uuid || "",
  //     name: rel.name,
  //     description: rel.description,
  //   };
  // });

  // relationships = relationships.filter((rel) => {
  //   const source = obj.entities.find((entity) => entity.uuid === rel.source);
  //   const target = obj.entities.find((entity) => entity.uuid === rel.target);
  //   return source && target;
  // });

  obj.relationships = relationships;

  return obj as {
    entities: object[];
    relationships: object[];
  };
}
export function validateMBSEData(data: unknown): data is MBSEData {
  if (typeof data !== "object" || data === null) return false;

  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj.entities)) return false;
  if (!Array.isArray(obj.relationships)) return false;

  for (const entity of obj.entities) {
    if (typeof entity !== "object" || entity === null) return false;
    const e = entity as Record<string, unknown>;
    if (typeof e.name !== "string") return false;
    if (typeof e.uuid !== "string") return false;
    if (typeof e.type !== "string") return false;
  }

  for (const rel of obj.relationships) {
    if (typeof rel !== "object" || rel === null) return false;
    const r = rel as Record<string, unknown>;
    if (typeof r.name !== "string") return false;
    if (typeof r.uuid !== "string") return false;
    if (typeof r.source !== "string") return false;
    if (typeof r.target !== "string") return false;
  }

  return true;
}

export function createEmptyMBSEData(): MBSEData {
  return {
    entities: [],
    relationships: [],
  };
}
