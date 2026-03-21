<script lang="ts">
    import * as d3 from "d3";
    import * as Drawer from "$lib/components/ui/drawer/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
    import { Separator } from "$lib/components/ui/separator/index.js";
    import { appState } from "$lib/state/app.svelte.js";
    import { getDomainColor } from "$lib/utils/uafParser.js";
    import { X } from "lucide-svelte";
    import type { GraphNode, GraphLink } from "$lib/types/mbse.js";

    let neighborDistance = $state(1);
    let hoveredNode: GraphNode | null = $state(null);
    let tooltipPos = $state({ x: 0, y: 0 });
    let miniSvgElement = $state<SVGSVGElement | null>(null);
    let miniZoom: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;
    let miniTransform = $state(d3.zoomIdentity);

    function handleClose(): void {
        appState.clearSelection();
    }

    function handleKeydown(e: KeyboardEvent): void {
        if (e.key === "Escape") {
            handleClose();
        }
    }

    const domainColor = $derived(
        appState.selectedNode
            ? getDomainColor(appState.selectedNode.domain, appState.uafData)
            : "#64748B",
    );

    interface MiniNode extends GraphNode {
        x: number;
        y: number;
        distance: number;
    }

    interface MiniLink {
        id: string;
        source: MiniNode;
        target: MiniNode;
    }

    function getNeighborNetwork(): { nodes: MiniNode[]; links: MiniLink[] } {
        if (!appState.selectedNode) return { nodes: [], links: [] };

        const startId = appState.selectedNode.id;
        const nodeMap = new Map<string, MiniNode>();
        const links: MiniLink[] = [];
        const visited = new Set<string>();
        const queue: { id: string; distance: number }[] = [
            { id: startId, distance: 0 },
        ];

        visited.add(startId);
        const startNode = appState.graphNodes.find((n) => n.id === startId);
        if (startNode) {
            nodeMap.set(startId, { ...startNode, x: 0, y: 0, distance: 0 });
        }

        while (queue.length > 0) {
            const current = queue.shift()!;
            if (current.distance >= neighborDistance) continue;

            for (const link of appState.graphLinks) {
                const sourceId =
                    typeof link.source === "string"
                        ? link.source
                        : link.source.id;
                const targetId =
                    typeof link.target === "string"
                        ? link.target
                        : link.target.id;

                let neighborId: string | null = null;
                if (sourceId === current.id && !visited.has(targetId)) {
                    neighborId = targetId;
                } else if (targetId === current.id && !visited.has(sourceId)) {
                    neighborId = sourceId;
                }

                if (neighborId) {
                    visited.add(neighborId);
                    const neighborNode = appState.graphNodes.find(
                        (n) => n.id === neighborId,
                    );
                    if (neighborNode) {
                        nodeMap.set(neighborId, {
                            ...neighborNode,
                            x: 0,
                            y: 0,
                            distance: current.distance + 1,
                        });
                        queue.push({
                            id: neighborId,
                            distance: current.distance + 1,
                        });
                    }
                }
            }
        }

        const nodeIds = new Set(nodeMap.keys());
        for (const link of appState.graphLinks) {
            const sourceId =
                typeof link.source === "string" ? link.source : link.source.id;
            const targetId =
                typeof link.target === "string" ? link.target : link.target.id;

            if (nodeIds.has(sourceId) && nodeIds.has(targetId)) {
                links.push({
                    id: link.id,
                    source: nodeMap.get(sourceId)!,
                    target: nodeMap.get(targetId)!,
                });
            }
        }

        return { nodes: Array.from(nodeMap.values()), links };
    }

    function layoutNetwork(nodes: MiniNode[]): void {
        if (nodes.length === 0) return;

        const centerX = 150;
        const centerY = 120;
        const radiusPerRing = 60;

        const rings: MiniNode[][] = [];
        for (const node of nodes) {
            while (rings.length <= node.distance) {
                rings.push([]);
            }
            rings[node.distance].push(node);
        }

        for (let ring = 0; ring < rings.length; ring++) {
            const ringNodes = rings[ring];
            const ringRadius = ring * radiusPerRing;
            const angleStep = (2 * Math.PI) / Math.max(ringNodes.length, 1);

            for (let i = 0; i < ringNodes.length; i++) {
                const angle = i * angleStep - Math.PI / 2;
                ringNodes[i].x = centerX + ringRadius * Math.cos(angle);
                ringNodes[i].y = centerY + ringRadius * Math.sin(angle);
            }
        }
    }

    const networkData = $derived.by(() => {
        const network = getNeighborNetwork();
        const nodes = network.nodes.map((n) => ({ ...n }));
        const links = network.links.map((l) => ({
            ...l,
            source: { ...l.source },
            target: { ...l.target },
        }));
        layoutNetwork(nodes);
        return { nodes, links };
    });

    function setupMiniZoom(): void {
        if (!miniSvgElement) return;

        const svg = d3.select(miniSvgElement);

        miniZoom = d3
            .zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.5, 3])
            .on("zoom", (event) => {
                miniTransform = event.transform;
            });

        svg.call(miniZoom);
    }

    function resetMiniZoom(): void {
        if (miniSvgElement && miniZoom) {
            const svg = d3.select(miniSvgElement);
            svg.call(miniZoom.transform, d3.zoomIdentity);
        }
    }

    $effect(() => {
        if (miniSvgElement) {
            setupMiniZoom();
        }
    });

    function handleNodeHover(e: MouseEvent, node: MiniNode): void {
        hoveredNode = node;
        if (miniSvgElement) {
            const rect = miniSvgElement.getBoundingClientRect();
            const transformedX = miniTransform.applyX(node.x);
            const transformedY = miniTransform.applyY(node.y);
            tooltipPos = {
                x: rect.left + transformedX + window.scrollX,
                y: rect.top + transformedY - 30 + window.scrollY,
            };
        }
    }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if hoveredNode}
    <div
        class="fixed z-100 px-2 py-1 text-xs font-mono bg-background border border-primary/50 rounded shadow-lg pointer-events-none"
        style="left: {tooltipPos.x}px; top: {tooltipPos.y}px; transform: translateX(-50%);"
    >
        <div class="text-primary font-semibold">{hoveredNode.name}</div>
        <div class="text-secondary">{hoveredNode.type}</div>
    </div>
{/if}

<!-- <Sheet open={appState.isDetailOpen} onClose={handleClose}> -->
<Drawer.Root
    open={appState.isDetailOpen}
    onOpenChange={handleClose}
    direction="right"
>
    <Drawer.Content>
        <Drawer.Header>
            <Drawer.Title class="text-primary font-mono text-sm">
                {#if appState.selectedNode}
                    {appState.selectedNode.name}
                {:else if appState.selectedLink}
                    {appState.selectedLink.name}
                {/if}
            </Drawer.Title>
            <Drawer.Description
                class="text-secondary font-mono text-xs uppercase"
            >
                {#if appState.selectedNode}
                    Node Intelligence
                {:else if appState.selectedLink}
                    Relationship Data
                {/if}
            </Drawer.Description>
        </Drawer.Header>

        <ScrollArea class="h-full p-4">
            {#if appState.selectedNode}
                {#if networkData.nodes.length > 0}
                    <div class="mb-4">
                        <div class="flex items-center justify-between mb-2">
                            <span
                                class="text-xs font-medium text-primary/70 font-mono uppercase"
                                >Local Network</span
                            >
                            <div class="flex items-center gap-2">
                                <span class="text-xs text-[#4a5568] font-mono"
                                    >{networkData.nodes.length} nodes</span
                                >
                                <button
                                    onclick={resetMiniZoom}
                                    class="text-[10px] text-primary/50 hover:text-primary font-mono px-1 py-0.5 rounded border hover:border-primary/30"
                                    title="Reset view"
                                >
                                    RESET
                                </button>
                            </div>
                        </div>
                        <div class="relative rounded border overflow-hidden">
                            <svg
                                bind:this={miniSvgElement}
                                width="300"
                                height="240"
                                class="w-full cursor-grab active:cursor-grabbing"
                            >
                                <defs>
                                    <filter
                                        id="mini-glow"
                                        x="-50%"
                                        y="-50%"
                                        width="200%"
                                        height="200%"
                                    >
                                        <feGaussianBlur
                                            stdDeviation="2"
                                            result="coloredBlur"
                                        />
                                        <feMerge>
                                            <feMergeNode in="coloredBlur" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                    <pattern
                                        id="mini-grid"
                                        width="20"
                                        height="20"
                                        patternUnits="userSpaceOnUse"
                                    >
                                        <path
                                            d="M 20 0 L 0 0 0 20"
                                            fill="none"
                                            stroke="#1a2530"
                                            stroke-width="0.3"
                                        />
                                    </pattern>
                                </defs>
                                <rect
                                    width="300"
                                    height="240"
                                    fill="url(#mini-grid)"
                                />

                                <g transform={miniTransform.toString()}>
                                    {#each networkData.links as link (link.id)}
                                        <line
                                            x1={link.source.x}
                                            y1={link.source.y}
                                            x2={link.target.x}
                                            y2={link.target.y}
                                            stroke="#00ff88"
                                            stroke-opacity={0.4}
                                            stroke-width={0.5}
                                            stroke-dasharray="2 2"
                                        />
                                    {/each}

                                    {#each networkData.nodes as node (node.id)}
                                        {@const color = getDomainColor(
                                            node.domain,
                                            appState.uafData,
                                        )}
                                        {@const isSelected =
                                            node.id ===
                                            appState.selectedNode?.id}
                                        <g
                                            transform="translate({node.x}, {node.y})"
                                            class="cursor-pointer"
                                            onmouseenter={(e) =>
                                                handleNodeHover(e, node)}
                                            onmouseleave={() => {
                                                hoveredNode = null;
                                            }}
                                            onclick={(e) => {
                                                if (!isSelected) {
                                                    e.stopPropagation();
                                                    appState.selectNode(node);
                                                }
                                            }}
                                            role="button"
                                            tabindex={0}
                                            onkeydown={(e) => {
                                                if (
                                                    e.key === "Enter" &&
                                                    !isSelected
                                                ) {
                                                    appState.selectNode(node);
                                                }
                                            }}
                                        >
                                            {#if isSelected}
                                                <rect
                                                    x={-38}
                                                    y={-12}
                                                    width={76}
                                                    height={24}
                                                    rx={3}
                                                    fill={color}
                                                    fill-opacity={0.25}
                                                    stroke={color}
                                                    stroke-width={2}
                                                    filter="url(#mini-glow)"
                                                />
                                            {:else}
                                                <rect
                                                    x={-32}
                                                    y={-10}
                                                    width={64}
                                                    height={20}
                                                    rx={2}
                                                    fill={color}
                                                    fill-opacity={0.1}
                                                    stroke={color}
                                                    stroke-width={1}
                                                    stroke-opacity={node.distance ===
                                                    neighborDistance
                                                        ? 0.5
                                                        : 0.8}
                                                />
                                            {/if}
                                            <text
                                                y={1}
                                                text-anchor="middle"
                                                dominant-baseline="middle"
                                                fill={isSelected
                                                    ? "#fff"
                                                    : "#a0a0a0"}
                                                font-size={isSelected
                                                    ? "9px"
                                                    : "7px"}
                                                font-family="monospace"
                                                font-weight={isSelected
                                                    ? "600"
                                                    : "400"}
                                            >
                                                {node.name.length > 10
                                                    ? node.name.substring(
                                                          0,
                                                          8,
                                                      ) + ".."
                                                    : node.name}
                                            </text>
                                        </g>
                                    {/each}
                                </g>
                            </svg>
                        </div>

                        <div class="mt-3 px-1">
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-xs text-primary font-mono"
                                    >HOP DISTANCE</span
                                >
                                <span class="text-xs text-primary font-mono"
                                    >{neighborDistance}</span
                                >
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="5"
                                step="1"
                                bind:value={neighborDistance}
                                class="w-full h-1 bg-secondary rounded-full appearance-none cursor-pointer accent-primary"
                            />
                            <div class="flex justify-between mt-1">
                                <span
                                    class="text-[10px] text-secondary font-mono"
                                    >1</span
                                >
                                <span
                                    class="text-[10px] text-secondary font-mono"
                                    >5</span
                                >
                            </div>
                        </div>
                    </div>

                    <Separator class="bg-[#1a2530]" />
                {/if}

                <div class="space-y-4">
                    <div>
                        <span
                            class="text-xs font-medium text-primary/70 font-mono uppercase"
                            >Identifier</span
                        >
                        <p
                            class="text-sm font-mono mt-1 text-[#e0e0e0] bg-[#0d1318] p-2 rounded border border-[#1a2530]"
                        >
                            {appState.selectedNode.id}
                        </p>
                    </div>

                    <Separator class="bg-[#1a2530]" />

                    <div>
                        <span
                            class="text-xs font-medium text-primary/70 font-mono uppercase"
                            >Classification</span
                        >
                        <p class="text-sm mt-1 text-[#e0e0e0] font-mono">
                            {appState.selectedNode.type}
                        </p>
                    </div>

                    <Separator class="bg-[#1a2530]" />

                    <div>
                        <span
                            class="text-xs font-medium text-primary/70 font-mono uppercase"
                            >Domain</span
                        >
                        <div class="flex items-center gap-2 mt-1">
                            <div
                                class="w-4 h-3 rounded-sm border"
                                style="background-color: {domainColor}33; border-color: {domainColor}"
                            ></div>
                            <span class="text-sm text-[#e0e0e0] font-mono"
                                >{appState.selectedNode.domain}</span
                            >
                        </div>
                    </div>

                    {#if appState.selectedNode.description}
                        <Separator class="bg-[#1a2530]" />
                        <div>
                            <span
                                class="text-xs font-medium text-primary/70 font-mono uppercase"
                                >Description</span
                            >
                            <p class="text-sm mt-1 text-[#e0e0e0]">
                                {appState.selectedNode.description}
                            </p>
                        </div>
                    {/if}
                </div>
            {:else if appState.selectedLink}
                <div class="space-y-4">
                    <div>
                        <span
                            class="text-xs font-medium text-primary/70 font-mono uppercase"
                            >Identifier</span
                        >
                        <p
                            class="text-sm font-mono mt-1 text-[#e0e0e0] bg-[#0d1318] p-2 rounded border border-[#1a2530]"
                        >
                            {appState.selectedLink.id}
                        </p>
                    </div>

                    <Separator class="bg-[#1a2530]" />

                    <div>
                        <span
                            class="text-xs font-medium text-primary/70 font-mono uppercase"
                            >Source Node</span
                        >
                        <p class="text-sm mt-1 text-[#e0e0e0] font-mono">
                            {#if typeof appState.selectedLink.source === "string"}
                                {appState.graphNodes.find(
                                    (n) =>
                                        n.id === appState.selectedLink?.source,
                                )?.name || appState.selectedLink.source}
                            {:else}
                                {appState.selectedLink.source.name}
                            {/if}
                        </p>
                    </div>

                    <Separator class="bg-[#1a2530]" />

                    <div>
                        <span
                            class="text-xs font-medium text-primary/70 font-mono uppercase"
                            >Target Node</span
                        >
                        <p class="text-sm mt-1 text-[#e0e0e0] font-mono">
                            {#if typeof appState.selectedLink.target === "string"}
                                {appState.graphNodes.find(
                                    (n) =>
                                        n.id === appState.selectedLink?.target,
                                )?.name || appState.selectedLink.target}
                            {:else}
                                {appState.selectedLink.target.name}
                            {/if}
                        </p>
                    </div>

                    {#if appState.selectedLink.description}
                        <Separator class="bg-[#1a2530]" />
                        <div>
                            <span
                                class="text-xs font-medium text-primary/70 font-mono uppercase"
                                >Description</span
                            >
                            <p class="text-sm mt-1 text-[#e0e0e0]">
                                {appState.selectedLink.description}
                            </p>
                        </div>
                    {/if}
                </div>
            {/if}
        </ScrollArea>
    </Drawer.Content>
</Drawer.Root>
