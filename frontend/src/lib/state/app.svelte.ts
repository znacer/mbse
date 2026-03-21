import type {
	MBSEData,
	GraphNode,
	GraphLink,
	Project,
	UAFData,
} from "$lib/types/mbse.js";
import { transformMBSEToGraph } from "$lib/utils/graphTransform.js";
import { parseUAF } from "$lib/utils/uafParser.js";
import { generateTestMBSEData, type TestGeneratorOptions } from "$lib/utils/testGenerator.js";

class AppState {
	uafData = $state<UAFData>({
		domains: new Map(),
		stereotypeToDomain: new Map(),
	});
	projects = $state<Project[]>([]);
	currentProject = $state<Project | null>(null);
	graphNodes = $state<GraphNode[]>([]);
	graphLinks = $state<GraphLink[]>([]);
	selectedNode = $state<GraphNode | null>(null);
	selectedLink = $state<GraphLink | null>(null);
	searchQuery = $state<string>("");
	layoutMode = $state<"force" | "hierarchical-td" | "hierarchical-lr">("force");
	selectedDomains = $state<Set<string>>(new Set());
	isDetailOpen = $state<boolean>(false);
	isLegendCollapsed = $state<boolean>(false);

	matchingNodeIds = $derived.by(() => {
		const hasSearch = this.searchQuery.trim().length > 0;
		const hasDomainFilter = this.selectedDomains.size > 0;

		if (!hasSearch && !hasDomainFilter) return new Set<string>();

		const query = this.searchQuery.toLowerCase();
		return new Set(
			this.graphNodes
				.filter((n) => {
					const matchesSearch = !hasSearch || 
						n.name.toLowerCase().includes(query) ||
						n.type.toLowerCase().includes(query) ||
						(n.description?.toLowerCase().includes(query) ?? false);
					const matchesDomain = !hasDomainFilter || this.selectedDomains.has(n.domain);
					return matchesSearch && matchesDomain;
				})
				.map((n) => n.id),
		);
	});

	searchSuggestions = $derived.by(() => {
		if (!this.searchQuery.trim()) return [];
		const query = this.searchQuery.toLowerCase();
		return this.graphNodes
			.filter(
				(n) =>
					n.name.toLowerCase().includes(query) ||
					n.type.toLowerCase().includes(query) ||
					(n.description?.toLowerCase().includes(query) ?? false),
			)
			.slice(0, 5);
	});

	activeDomain = $derived.by(() => {
		if (this.selectedNode) {
			return this.selectedNode.domain;
		}
		return null;
	});

	constructor() {
		this.loadUAFData();
		this.loadProjects();
	}

	private async loadUAFData(): Promise<void> {
		try {
			this.uafData = await parseUAF();
		} catch (error) {
			console.error("Failed to parse UAF data:", error);
		}
	}

	private loadProjects(): void {
		if (typeof window === "undefined") return;
		try {
			const stored = localStorage.getItem("mbse-projects");
			if (stored) {
				this.projects = JSON.parse(stored);
			}
		} catch (error) {
			console.error("Failed to load projects:", error);
		}
	}

	private saveProjects(): void {
		if (typeof window === "undefined") return;
		try {
			localStorage.setItem("mbse-projects", JSON.stringify(this.projects));
		} catch (error) {
			console.error("Failed to save projects:", error);
		}
	}

	createProject(name: string, description?: string): Project {
		const project: Project = {
			id: typeof window !== "undefined" ? crypto.randomUUID() : `temp-${Date.now()}`,
			name,
			description,
			data: { entities: [], relationships: [] },
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		this.projects.push(project);
		this.saveProjects();
		return project;
	}

	createProjectWithTestData(
		name: string,
		description: string | undefined,
		options: TestGeneratorOptions,
	): Project {
		const data = generateTestMBSEData(options);
		const project: Project = {
			id: typeof window !== "undefined" ? crypto.randomUUID() : `temp-${Date.now()}`,
			name,
			description:
				description || `Generated: ${options.entityCount} entities, ~${Math.floor(options.entityCount * options.linkDensity)} links`,
			data,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		this.projects.push(project);
		this.saveProjects();
		return project;
	}

	loadProject(id: string): void {
		const project = this.projects.find((p) => p.id === id);
		if (project) {
			this.currentProject = project;
			this.setGraphData(project.data);
		}
	}

	updateCurrentProject(data: MBSEData): void {
		if (this.currentProject) {
			this.currentProject.data = data;
			this.currentProject.updatedAt = new Date().toISOString();
			const index = this.projects.findIndex(
				(p) => p.id === this.currentProject!.id,
			);
			if (index !== -1) {
				this.projects[index] = this.currentProject;
				this.saveProjects();
			}
		}
	}

	deleteProject(id: string): void {
		this.projects = this.projects.filter((p) => p.id !== id);
		this.saveProjects();
		if (this.currentProject?.id === id) {
			this.currentProject = null;
			this.graphNodes = [];
			this.graphLinks = [];
		}
	}

	setGraphData(data: MBSEData): void {
		const { nodes, links } = transformMBSEToGraph(data, this.uafData);
		this.graphNodes = nodes;
		this.graphLinks = links;
	}

	selectNode(node: GraphNode | null): void {
		this.selectedNode = node;
		this.selectedLink = null;
		this.isDetailOpen = node !== null;
	}

	selectLink(link: GraphLink | null): void {
		this.selectedLink = link;
		this.selectedNode = null;
		this.isDetailOpen = link !== null;
	}

	clearSelection(): void {
		this.selectedNode = null;
		this.selectedLink = null;
		this.isDetailOpen = false;
	}

	clearSearch(): void {
		this.searchQuery = "";
	}

	toggleDomain(domain: string): void {
		if (this.selectedDomains.has(domain)) {
			this.selectedDomains.delete(domain);
		} else {
			this.selectedDomains.add(domain);
		}
		this.selectedDomains = new Set(this.selectedDomains);
	}

	clearDomainFilter(): void {
		this.selectedDomains = new Set();
	}

	clearAllFilters(): void {
		this.searchQuery = "";
		this.selectedDomains = new Set();
	}

	toggleLegend(): void {
		this.isLegendCollapsed = !this.isLegendCollapsed;
	}
}

export const appState = new AppState();
