import type { MBSEData, GraphNode, GraphLink, UAFData } from "$lib/types/mbse.js";
import { getDomainForStereotype } from "./uafParser.js";

export function transformMBSEToGraph(
	data: MBSEData,
	uafData: UAFData
): { nodes: GraphNode[]; links: GraphLink[] } {
	const nodes: GraphNode[] = data.entities.map((entity) => ({
		id: entity.uuid,
		name: entity.name,
		description: entity.description,
		type: entity.type,
		domain: getDomainForStereotype(entity.type, uafData)
	}));

	const links: GraphLink[] = data.relationships.map((rel) => ({
		id: rel.uuid,
		source: rel.source,
		target: rel.target,
		name: rel.name,
		description: rel.description
	}));

	return { nodes, links };
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
		relationships: []
	};
}
