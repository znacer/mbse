// ─── MBSE File Schema ─────────────────────────────────────────────────────────

export interface MBSEEntity {
  name: string;
  uuid: string;
  description: string;
  type: string;
}

export interface MBSERelationship {
  name: string;
  uuid: string;
  description: string;
  source: string;
  target: string;
}

export interface MBSEFile {
  entities: MBSEEntity[];
  relationships: MBSERelationship[];
}

// ─── Graph Data Structures ─────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  name: string;
  description: string;
  type: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  id: string;
  name: string;
  description: string;
  source: string | GraphNode;
  target: string | GraphNode;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// ─── UAF Definitions ───────────────────────────────────────────────────────────

export interface UAFStereotype {
  name: string;
  id: string;
  description: string;
  packageName: string;
  domain: string;
  color: string;
}

export type UAFDefinitions = Map<string, UAFStereotype>;

export interface DomainSubpackage {
  name: string;
  stereotypeNames: string[];
}

export interface DomainEntry {
  domain: string;
  color: string;
  subpackages: DomainSubpackage[];
}

// ─── UI State ──────────────────────────────────────────────────────────────────

export type SelectedItem =
  | { kind: "node"; data: GraphNode }
  | { kind: "link"; data: GraphLink }
  | null;
