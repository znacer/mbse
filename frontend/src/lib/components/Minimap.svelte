<script lang="ts">
    import * as d3 from "d3";
    import { appState } from "$lib/state/app.svelte.js";
    import { getDomainColor } from "$lib/utils/uafParser.js";

    interface SimNode {
        id: string;
        x: number;
        y: number;
        domain: string;
    }

    interface Props {
        transform: d3.ZoomTransform;
        width: number;
        height: number;
        onNavigate: (x: number, y: number) => void;
        nodes?: SimNode[];
    }

    let {
        transform,
        width: canvasWidth,
        height: canvasHeight,
        onNavigate,
        nodes: simNodes = [],
    }: Props = $props();

    let minimapWidth = 180;
    let minimapHeight = 120;
    let svgElement: SVGSVGElement;

    function getBounds() {
        if (simNodes.length === 0)
            return { minX: -200, maxX: 200, minY: -150, maxY: 150 };

        const xs = simNodes.map((n) => n.x);
        const ys = simNodes.map((n) => n.y);

        const padding = 50;
        return {
            minX: Math.min(...xs) - padding,
            maxX: Math.max(...xs) + padding,
            minY: Math.min(...ys) - padding,
            maxY: Math.max(...ys) + padding,
        };
    }

    function getScale() {
        const bounds = getBounds();
        const graphWidth = bounds.maxX - bounds.minX;
        const graphHeight = bounds.maxY - bounds.minY;
        return Math.min(minimapWidth / graphWidth, minimapHeight / graphHeight);
    }

    function getNodePositions() {
        const bounds = getBounds();
        const scale = getScale();
        return simNodes.map((n) => ({
            id: n.id,
            domain: n.domain,
            x: (n.x - bounds.minX) * scale,
            y: (n.y - bounds.minY) * scale,
        }));
    }

    function getLinkPositions() {
        const bounds = getBounds();
        const scale = getScale();
        return appState.graphLinks
            .map((l) => {
                const sourceId =
                    typeof l.source === "string" ? l.source : l.source.id;
                const targetId =
                    typeof l.target === "string" ? l.target : l.target.id;
                const sourceNode = simNodes.find((n) => n.id === sourceId);
                const targetNode = simNodes.find((n) => n.id === targetId);
                if (!sourceNode || !targetNode) return null;
                return {
                    id: l.id,
                    x1: (sourceNode.x - bounds.minX) * scale,
                    y1: (sourceNode.y - bounds.minY) * scale,
                    x2: (targetNode.x - bounds.minX) * scale,
                    y2: (targetNode.y - bounds.minY) * scale,
                };
            })
            .filter(Boolean);
    }

    function getViewportRect() {
        const bounds = getBounds();
        const scale = getScale();
        const graphScale = transform.k;

        const viewWidth = canvasWidth / graphScale;
        const viewHeight = canvasHeight / graphScale;

        const viewCenterX = (canvasWidth / 2 - transform.x) / graphScale;
        const viewCenterY = (canvasHeight / 2 - transform.y) / graphScale;

        return {
            x: (viewCenterX - viewWidth / 2 - bounds.minX) * scale,
            y: (viewCenterY - viewHeight / 2 - bounds.minY) * scale,
            width: Math.max(1, viewWidth * scale),
            height: Math.max(1, viewHeight * scale),
        };
    }

    function handleClick(e: MouseEvent) {
        if (!svgElement) return;
        const rect = svgElement.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const bounds = getBounds();
        const scale = getScale();

        const graphX = clickX / scale + bounds.minX;
        const graphY = clickY / scale + bounds.minY;

        onNavigate(graphX, graphY);
    }

    let viewport = $derived(getViewportRect());
    let nodePositions = $derived(getNodePositions());
    let linkPositions = $derived(getLinkPositions());
</script>

<div
    class="absolute bottom-4 right-4 bg-muted/95 border border-secondary rounded shadow-lg overflow-hidden"
>
    <div
        class="px-2 py-1 text-xs font-medium text-primary/70 border-b border-muted"
    >
        MINI MAP
    </div>
    <svg
        bind:this={svgElement}
        width={minimapWidth}
        height={minimapHeight}
        class="cursor-pointer bg-muted"
        role="button"
        aria-label="Graph minimap - click to navigate"
        tabindex="0"
        onclick={handleClick}
        onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
                const bounds = getBounds();
                const scale = getScale();
                onNavigate(
                    minimapWidth / 2 / scale + bounds.minX,
                    minimapHeight / 2 / scale + bounds.minY,
                );
            }
        }}
    >
        <defs>
            <pattern
                id="minimap-grid"
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
            width={minimapWidth}
            height={minimapHeight}
            fill="url(#minimap-grid)"
        />

        {#each linkPositions as link (link!.id)}
            <line
                x1={link!.x1}
                y1={link!.y1}
                x2={link!.x2}
                y2={link!.y2}
                stroke="#00ff88"
                stroke-opacity={0.3}
                stroke-width={0.5}
                stroke-dasharray="2 2"
            />
        {/each}

        {#each nodePositions as node (node.id)}
            <rect
                x={node.x - 3}
                y={node.y - 2}
                width={6}
                height={4}
                fill={getDomainColor(node.domain, appState.uafData)}
                fill-opacity={0.6}
                stroke={getDomainColor(node.domain, appState.uafData)}
                stroke-width={0.5}
            />
        {/each}

        <rect
            x={viewport.x}
            y={viewport.y}
            width={viewport.width}
            height={viewport.height}
            fill="oklch(0.488 0.243 264.376 / 0.1)"
            stroke="oklch(0.488 0.243 264.376)"
            stroke-width={1}
            rx={1}
        />
    </svg>
</div>
