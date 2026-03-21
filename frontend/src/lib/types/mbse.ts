export interface Entity {
	name: string;
	uuid: string;
	description?: string;
	type: string;
}

export interface Relationship {
	name: string;
	uuid: string;
	description?: string;
	source: string;
	target: string;
}

export interface MBSEData {
	entities: Entity[];
	relationships: Relationship[];
}

export interface GraphNode {
	id: string;
	name: string;
	description?: string;
	type: string;
	domain: string;
	x?: number;
	y?: number;
	vx?: number;
	vy?: number;
	fx?: number | null;
	fy?: number | null;
}

export interface GraphLink {
	id: string;
	source: string | GraphNode;
	target: string | GraphNode;
	name: string;
	description?: string;
}

export interface Project {
	id: string;
	name: string;
	description?: string;
	data: MBSEData;
	createdAt: string;
	updatedAt: string;
}

export interface UAFDomain {
	name: string;
	color: string;
	stereotypes: string[];
}

export interface UAFData {
	domains: Map<string, UAFDomain>;
	stereotypeToDomain: Map<string, string>;
}
