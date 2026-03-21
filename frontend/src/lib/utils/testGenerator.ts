import type { Entity, Relationship, MBSEData } from "$lib/types/mbse.js";

const ENTITY_TYPES = [
	"Capability",
	"OperationalPerformer",
	"Resource",
	"System",
	"Function",
	"Activity",
	"Requirement",
	"Component",
	"Interface",
	"Process",
	"Service",
	"Node",
	"Port",
];

const RELATIONSHIP_TYPES = [
	"allocates",
	"performs",
	"contains",
	"dependsOn",
	"implements",
	"requires",
	"provides",
	"connectsTo",
	"triggers",
	"flowsTo",
];

function generateId(): string {
	return crypto.randomUUID();
}

function randomItem<T>(array: T[]): T {
	return array[Math.floor(Math.random() * array.length)];
}

function randomName(prefix: string, index: number): string {
	const suffixes = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta"];
	const suffix = suffixes[index % suffixes.length];
	return `${prefix}_${suffix}_${index + 1}`;
}

export interface TestGeneratorOptions {
	entityCount: number;
	linkDensity: number;
}

export function generateTestMBSEData(options: TestGeneratorOptions): MBSEData {
	const { entityCount, linkDensity } = options;

	if (entityCount === 0) {
		return { entities: [], relationships: [] };
	}

	const entities: Entity[] = [];
	const relationships: Relationship[] = [];

	for (let i = 0; i < entityCount; i++) {
		const type = randomItem(ENTITY_TYPES);
		entities.push({
			uuid: generateId(),
			name: randomName(type, i),
			type,
			description: `Test ${type} entity #${i + 1}`,
		});
	}

	const maxLinks = Math.floor(entityCount * linkDensity);
	const linkCount = Math.min(maxLinks, (entityCount * (entityCount - 1)) / 2);

	const possiblePairs: [number, number][] = [];
	for (let i = 0; i < entities.length; i++) {
		for (let j = i + 1; j < entities.length; j++) {
			possiblePairs.push([i, j]);
		}
	}

	for (let i = possiblePairs.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[possiblePairs[i], possiblePairs[j]] = [possiblePairs[j], possiblePairs[i]];
	}

	for (let i = 0; i < Math.min(linkCount, possiblePairs.length); i++) {
		const [sourceIdx, targetIdx] = possiblePairs[i];
		const relType = randomItem(RELATIONSHIP_TYPES);
		relationships.push({
			uuid: generateId(),
			name: `${entities[sourceIdx].name}_${relType}_${entities[targetIdx].name}`,
			source: entities[sourceIdx].uuid,
			target: entities[targetIdx].uuid,
			description: `Test relationship: ${relType}`,
		});
	}

	return { entities, relationships };
}
