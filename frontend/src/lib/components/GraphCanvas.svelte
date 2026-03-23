<script lang="ts">
    import { onMount } from "svelte";
    import * as d3 from "d3";
    import { appState } from "$lib/state/app.svelte.js";
    import { getDomainColor } from "$lib/utils/uafParser.js";
    import type { GraphNode, GraphLink } from "$lib/types/mbse.js";

    interface D3Node extends GraphNode {
        x: number;
        y: number;
        vx: number;
        vy: number;
        fx: number | null;
        fy: number | null;
    }

    interface D3Link {
        id: string;
        source: D3Node;
        target: D3Node;
        name: string;
        description?: string;
    }

    let svgElement: SVGSVGElement;
    let containerElement: HTMLDivElement;
    let width = $state(800);
    let height = $state(600);

    interface Props {
        transform?: d3.ZoomTransform;
        simNodes?: { id: string; x: number; y: number; domain: string }[];
    }

    let { transform = $bindable(), simNodes = $bindable() }: Props = $props();

    let currentTransform = $derived(transform ?? d3.zoomIdentity);

    let simulation: d3.Simulation<D3Node, D3Link> | null = null;
    let zoom: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;
    let svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null =
        null;
    let currentNodes: D3Node[] = [];
    let currentLinks: D3Link[] = [];
    let hoveredNode = $state<D3Node | null>(null);
    let tooltipX = $state(0);
    let tooltipY = $state(0);

    const nodeWidth = 140;
    const nodeHeight = 40;

    const DOMAIN_ICONS: Record<string, string> = {
        Operational: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
        Services: "M4 6h16M4 12h16M4 18h16",
        Resources: "M12 2L2 7v10l10 5 10-5V7L12 2z",
        Strategic:
            "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
        Personnel:
            "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
        Security: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
        Projects:
            "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2",
        "Architecture Management":
            "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
        Standards:
            "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z",
        "Actual Resources":
            "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
        "Summary and Overview":
            "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6",
        Parameters: "M12 3v18M3 12h18",
    };

    function getIconPath(domain: string): string {
        return DOMAIN_ICONS[domain] || DOMAIN_ICONS.Parameters;
    }

    onMount(() => {
        if (!svgElement) return;

        svg = d3.select(svgElement);
        setupZoom();
        initializeSimulation();

        return () => {
            if (simulation) simulation.stop();
        };
    });

    function setupZoom(): void {
        if (!svg) return;

        zoom = d3
            .zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on("zoom", (event) => {
                const g = svg!.select<SVGGElement>("g.graph-container");
                g.attr("transform", event.transform);
                transform = event.transform;
            });

        svg.call(zoom);

        const initialTransform = d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(1);
        svg.call(zoom.transform, initialTransform);
    }

    function initializeSimulation(): void {
        if (!svg) return;

        simulation = d3
            .forceSimulation<D3Node>()
            .force(
                "link",
                d3
                    .forceLink<D3Node, D3Link>()
                    .id((d) => d.id)
                    .distance(180),
            )
            .force("charge", d3.forceManyBody().strength(-10))
            .force("center", d3.forceCenter(0, 0))
            .force(
                "collision",
                d3.forceCollide().radius(Math.max(nodeWidth, nodeHeight)),
            );

        updateGraph();
    }

    function computeHierarchicalLayout(
        nodes: D3Node[],
        links: D3Link[],
        direction: "td" | "lr",
    ): void {
        const nodeMap = new Map<string, D3Node>();
        nodes.forEach((n) => nodeMap.set(n.id, n));

        const inDegree = new Map<string, number>();
        const outDegree = new Map<string, number>();
        nodes.forEach((n) => {
            inDegree.set(n.id, 0);
            outDegree.set(n.id, 0);
        });

        links.forEach((l) => {
            const sourceId = l.source.id;
            const targetId = l.target.id;
            outDegree.set(sourceId, (outDegree.get(sourceId) ?? 0) + 1);
            inDegree.set(targetId, (inDegree.get(targetId) ?? 0) + 1);
        });

        const levels = new Map<string, number>();
        const visited = new Set<string>();

        const roots = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0);
        if (roots.length === 0 && nodes.length > 0) {
            roots.push(nodes[0]);
        }

        let maxLevel = 0;
        const queue: { node: D3Node; level: number }[] = roots.map((r) => ({
            node: r,
            level: 0,
        }));

        while (queue.length > 0) {
            const { node, level } = queue.shift()!;
            if (visited.has(node.id)) continue;
            visited.add(node.id);
            levels.set(node.id, level);
            maxLevel = Math.max(maxLevel, level);

            links.forEach((l) => {
                if (l.source.id === node.id && !visited.has(l.target.id)) {
                    queue.push({ node: l.target, level: level + 1 });
                }
            });
        }

        nodes.forEach((n) => {
            if (!visited.has(n.id)) {
                levels.set(n.id, maxLevel + 1);
            }
        });

        const nodesByLevel = new Map<number, D3Node[]>();
        nodes.forEach((n) => {
            const level = levels.get(n.id) ?? 0;
            if (!nodesByLevel.has(level)) nodesByLevel.set(level, []);
            nodesByLevel.get(level)!.push(n);
        });

        const levelSpacing =
            direction === "td" ? nodeHeight * 3 : nodeWidth * 2.5;
        const nodeSpacing =
            direction === "td" ? nodeWidth * 1.5 : nodeHeight * 2;

        nodesByLevel.forEach((levelNodes, level) => {
            const totalSize = (levelNodes.length - 1) * nodeSpacing;
            const startIndex = -totalSize / 2;

            levelNodes.forEach((node, index) => {
                if (direction === "td") {
                    node.x = startIndex + index * nodeSpacing;
                    node.y = level * levelSpacing;
                } else {
                    node.x = level * levelSpacing;
                    node.y = startIndex + index * nodeSpacing;
                }
            });
        });
    }

    function updateGraph(): void {
        if (!svg || !simulation) return;

        const g = svg.select<SVGGElement>("g.graph-container");
        if (g.empty()) {
            svg.append("g").attr("class", "graph-container");
        }

        const nodes: D3Node[] = appState.graphNodes.map((n) => ({
            ...n,
            x: n.x ?? 0,
            y: n.y ?? 0,
            vx: n.vx ?? 0,
            vy: n.vy ?? 0,
            fx: n.fx ?? null,
            fy: n.fy ?? null,
        }));

        const links: D3Link[] = appState.graphLinks.map((l) => {
            const sourceNode = nodes.find(
                (n) =>
                    n.id ===
                    (typeof l.source === "string" ? l.source : l.source.id),
            )!;
            const targetNode = nodes.find(
                (n) =>
                    n.id ===
                    (typeof l.target === "string" ? l.target : l.target.id),
            )!;
            return {
                id: l.id,
                source: sourceNode,
                target: targetNode,
                name: l.name,
                description: l.description,
            };
        });

        currentLinks = links;

        const isForceLayout = appState.layoutMode === "force";

        if (!isForceLayout) {
            computeHierarchicalLayout(
                nodes,
                links,
                appState.layoutMode === "hierarchical-td" ? "td" : "lr",
            );
            simulation.stop();
        }

        const linkSelection = svg
            .select<SVGGElement>("g.graph-container")
            .selectAll<SVGLineElement, D3Link>(".link")
            .data(links, (d) => d.id);

        linkSelection.exit().remove();

        const linkEnter = linkSelection
            .enter()
            .append("line")
            .attr("class", "link")
            .attr("stroke", "#00ff88")
            .attr("stroke-opacity", 0.5)
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "4 4")
            .style("cursor", "pointer")
            .on("click", (_, d) => {
                appState.selectLink({
                    id: d.id,
                    source: d.source.id,
                    target: d.target.id,
                    name: d.name,
                    description: d.description,
                });
            });

        const link = linkEnter.merge(linkSelection);

        const nodeSelection = svg
            .select<SVGGElement>("g.graph-container")
            .selectAll<SVGGElement, D3Node>(".node")
            .data(nodes, (d) => d.id);

        nodeSelection.exit().remove();

        const nodeEnter = nodeSelection
            .enter()
            .append("g")
            .attr("class", "node")
            .style("cursor", "pointer")
            .call(
                d3
                    .drag<SVGGElement, D3Node>()
                    .on("start", (event, d) => {
                        if (!event.active && simulation)
                            simulation.alphaTarget(0.3).restart();
                        d.fx = d.x;
                        d.fy = d.y;
                    })
                    .on("drag", (event, d) => {
                        d.fx = event.x;
                        d.fy = event.y;
                    })
                    .on("end", (event, d) => {
                        if (!event.active && simulation)
                            simulation.alphaTarget(0);
                        d.fx = null;
                        d.fy = null;
                    }),
            )
            .on("click", (_, d) => {
                appState.selectNode(d);
            })
            .on("mouseenter", (event, d) => {
                hoveredNode = d;
                const rect = containerElement.getBoundingClientRect();
                tooltipX = event.clientX - rect.left;
                tooltipY = event.clientY - rect.top;
            })
            .on("mousemove", (event) => {
                const rect = containerElement.getBoundingClientRect();
                tooltipX = event.clientX - rect.left;
                tooltipY = event.clientY - rect.top;
            })
            .on("mouseleave", () => {
                hoveredNode = null;
            });

        nodeEnter
            .append("rect")
            .attr("class", "node-bg")
            .attr("x", -nodeWidth / 2)
            .attr("y", -nodeHeight / 2)
            .attr("width", nodeWidth)
            .attr("height", nodeHeight)
            .attr("rx", 4)
            .attr("ry", 4)
            .attr("fill", (d) => getDomainColor(d.domain, appState.uafData))
            .attr("fill-opacity", 0.15)
            .attr("stroke", (d) => getDomainColor(d.domain, appState.uafData))
            .attr("stroke-width", 1.5)
            .attr("stroke-opacity", 0.8);

        nodeEnter
            .append("rect")
            .attr("class", "node-glow")
            .attr("x", -nodeWidth / 2 - 2)
            .attr("y", -nodeHeight / 2 - 2)
            .attr("width", nodeWidth + 4)
            .attr("height", nodeHeight + 4)
            .attr("rx", 6)
            .attr("ry", 6)
            .attr("fill", "none")
            .attr("stroke", (d) => getDomainColor(d.domain, appState.uafData))
            .attr("stroke-width", 0.5)
            .attr("stroke-opacity", 0.3)
            .attr("filter", "url(#glow)");

        nodeEnter
            .append("path")
            .attr("class", "node-icon")
            .attr("d", (d) => getIconPath(d.domain))
            .attr(
                "transform",
                `translate(${-nodeWidth / 2 + 16}, ${-nodeHeight / 2 + 8}) scale(0.7)`,
            )
            .attr("fill", "none")
            .attr("stroke", (d) => getDomainColor(d.domain, appState.uafData))
            .attr("stroke-width", 1.5)
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round");

        nodeEnter
            .append("text")
            .attr("class", "node-label")
            .attr("x", -nodeWidth / 2 + 36)
            .attr("y", 4)
            .attr("fill", "#e0e0e0")
            .attr("font-size", "11px")
            .attr("font-family", "monospace")
            .attr("font-weight", "500")
            .attr("text-anchor", "start")
            .attr("dominant-baseline", "middle")
            .text((d) => {
                const name = d.name || d.id;
                return name.length > 12 ? name.substring(0, 10) + "..." : name;
            });

        const node = nodeEnter.merge(nodeSelection);

        currentNodes = nodes;
        simulation.nodes(nodes);
        (simulation.force("link") as d3.ForceLink<D3Node, D3Link>).links(links);

        if (isForceLayout) {
            simulation.alpha(1).restart();
        } else {
            link.attr("x1", (d) => d.source.x)
                .attr("y1", (d) => d.source.y)
                .attr("x2", (d) => d.target.x)
                .attr("y2", (d) => d.target.y);

            node.attr("transform", (d) => `translate(${d.x}, ${d.y})`);

            simNodes = currentNodes.map((n) => ({
                id: n.id,
                x: n.x,
                y: n.y,
                domain: n.domain,
            }));
        }

        simulation.on("tick", () => {
            if (!isForceLayout) return;

            link.attr("x1", (d) => d.source.x)
                .attr("y1", (d) => d.source.y)
                .attr("x2", (d) => d.target.x)
                .attr("y2", (d) => d.target.y);

            node.attr("transform", (d) => `translate(${d.x}, ${d.y})`);

            simNodes = currentNodes.map((n) => ({
                id: n.id,
                x: n.x,
                y: n.y,
                domain: n.domain,
            }));
        });
    }

    $effect(() => {
        appState.graphNodes;
        appState.graphLinks;
        appState.layoutMode;
        if (simulation) {
            updateGraph();
        }
    });

    $effect(() => {
        appState.matchingNodeIds;
        if (simulation && svg) {
            const node = svg
                .select<SVGGElement>("g.graph-container")
                .selectAll<SVGGElement, D3Node>(".node");
            const highlighted = appState.matchingNodeIds;
            node.attr("opacity", (d) => {
                if (highlighted.size === 0) return 1;
                return highlighted.has(d.id) ? 1 : 0.2;
            });
        }
    });

    function handleResize(): void {
        if (containerElement) {
            width = containerElement.clientWidth;
            height = containerElement.clientHeight;
            if (svgElement) {
                svgElement.setAttribute("width", String(width));
                svgElement.setAttribute("height", String(height));
            }
        }
    }

    $effect(() => {
        if (containerElement) {
            handleResize();
            window.addEventListener("resize", handleResize);
            return () => window.removeEventListener("resize", handleResize);
        }
    });

    export function resetZoom(): void {
        if (svg && zoom) {
            const initialTransform = d3.zoomIdentity
                .translate(width / 2, height / 2)
                .scale(1);
            svg.call(zoom.transform, initialTransform);
        }
    }

    export function fitToScreen(): void {
        if (!svg || !zoom) return;
        const nodes = appState.graphNodes;
        if (nodes.length === 0) return;

        const xs = nodes.filter((n) => n.x !== undefined).map((n) => n.x!);
        const ys = nodes.filter((n) => n.y !== undefined).map((n) => n.y!);
        if (xs.length === 0) return;

        const minX = Math.min(...xs) - nodeWidth;
        const maxX = Math.max(...xs) + nodeWidth;
        const minY = Math.min(...ys) - nodeHeight;
        const maxY = Math.max(...ys) + nodeHeight;

        const graphWidth = maxX - minX;
        const graphHeight = maxY - minY;

        const scale = Math.min(
            (width * 0.8) / graphWidth,
            (height * 0.8) / graphHeight,
            2,
        );

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        const transform = d3.zoomIdentity
            .translate(
                width / 2 - centerX * scale,
                height / 2 - centerY * scale,
            )
            .scale(scale);

        svg.call(zoom.transform, transform);
    }

    export function navigateTo(graphX: number, graphY: number): void {
        if (!svg || !zoom) return;
        const scale = currentTransform.k;
        const transformNew = d3.zoomIdentity
            .translate(width / 2 - graphX * scale, height / 2 - graphY * scale)
            .scale(scale);
        svg.call(zoom.transform, transformNew);
    }

    export function getTransform(): d3.ZoomTransform {
        return currentTransform;
    }
</script>

<div bind:this={containerElement} class="w-full h-full bg-background">
    <!-- bg-[#0a0f14]"> -->
    <svg bind:this={svgElement} {width} {height} class="bg-primary/5">
        <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
            <pattern
                id="grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
            >
                <path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke="#1a2530"
                    stroke-width="0.5"
                />
            </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <g class="graph-container"></g>
    </svg>

    {#if hoveredNode}
        <!-- [#1a2530] -->
        <div
            class="absolute pointer-events-none z-50 bg-background border border-secondary rounded-md shadow-lg p-3 max-w-xs"
            style="left: {tooltipX + 15}px; top: {tooltipY + 15}px;"
        >
            <div class="text-xs font-mono text font-medium mb-1">
                {hoveredNode.name}
            </div>
            <div class="text-xs font-mono text-muted mb-1">
                UUID: {hoveredNode.id}
            </div>
            {#if hoveredNode.description}
                <div
                    class="text-xs font-mono text border-t border-secondary pt-2 mt-2"
                >
                    {hoveredNode.description}
                </div>
            {:else}
                <div
                    class="text-xs font-mono text italic border-t border-secondary pt-2 mt-2"
                >
                    No description
                </div>
            {/if}
        </div>
    {/if}
</div>
