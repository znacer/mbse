<script lang="ts">
    // ─── GraphCanvas ────────────────────────────────────────────────────────────
    //
    // Renders the force-directed graph using the vanilla `force-graph` library.
    // All canvas drawing functions read directly from the `app` singleton, so
    // they always use the latest selection/search state without stale closures.
    //
    // Exposes `zoomToFit()` so the parent (Toolbar) can trigger a reset.
    // Exposes `zoomToMatches()` to pan/zoom into search results.

    import { onMount } from "svelte";
    import ForceGraph from "force-graph";
    import { app } from "$lib/state/app.svelte";
    import { getTypeColor } from "$lib/utils/uafParser";
    import type { GraphNode, GraphLink } from "$lib/types/mbse";
    import dagre from "dagre";

    // ── Constants ─────────────────────────────────────────────────────────────
    const NODE_R = 6;
    const SELECTED_RING = 4;

    // DIM_ALPHA is now read from app.theme.canvas.dimAlpha at draw time

    // ── DOM ref & force-graph instance ────────────────────────────────────────
    let container: HTMLDivElement;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fg: any = null;

    // ── Minimap ────────────────────────────────────────────────────────────────
    const MM_W = 210;
    const MM_H = 148;
    const MM_PAD = 10;

    let minimapCanvas: HTMLCanvasElement;
    let minimapRaf: number;

    // Stored per-frame transform so the click handler can back-project
    let mmTransform = { minX: 0, minY: 0, scale: 1, offsetX: 0, offsetY: 0 };

    function drawMinimap() {
        minimapRaf = requestAnimationFrame(drawMinimap);
        if (!minimapCanvas || !fg) return;

        const ctx = minimapCanvas.getContext("2d");
        if (!ctx) return;

        const nodes: GraphNode[] = fg.graphData()?.nodes ?? [];

        // ── background ────────────────────────────────────────────────────────
        const ct = app.theme.canvas;
        ctx.clearRect(0, 0, MM_W, MM_H);
        ctx.fillStyle = ct.minimapBg;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
            ctx.roundRect(0, 0, MM_W, MM_H, 8);
        } else {
            ctx.rect(0, 0, MM_W, MM_H);
        }
        ctx.fill();

        // ── border ────────────────────────────────────────────────────────────
        ctx.strokeStyle = ct.minimapBorder;
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
            ctx.roundRect(0.5, 0.5, MM_W - 1, MM_H - 1, 8);
        } else {
            ctx.rect(0.5, 0.5, MM_W - 1, MM_H - 1);
        }
        ctx.stroke();

        if (nodes.length === 0) return;

        // ── bounding box of all node positions ────────────────────────────────
        let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;
        for (const n of nodes) {
            const x = n.x ?? 0,
                y = n.y ?? 0;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
        const bbPad = Math.max(maxX - minX, maxY - minY) * 0.08 + 10;
        minX -= bbPad;
        minY -= bbPad;
        maxX += bbPad;
        maxY += bbPad;
        const fullW = maxX - minX || 1;
        const fullH = maxY - minY || 1;

        const mw = MM_W - MM_PAD * 2;
        const mh = MM_H - MM_PAD * 2;
        const scale = Math.min(mw / fullW, mh / fullH);
        const offsetX = MM_PAD + (mw - fullW * scale) / 2;
        const offsetY = MM_PAD + (mh - fullH * scale) / 2;

        mmTransform = { minX, minY, scale, offsetX, offsetY };

        function toMM(gx: number, gy: number) {
            return {
                x: offsetX + (gx - minX) * scale,
                y: offsetY + (gy - minY) * scale,
            };
        }

        // ── links (skip if graph is very large) ───────────────────────────────
        const links: GraphLink[] = fg.graphData()?.links ?? [];
        if (links.length < 4000) {
            ctx.strokeStyle = ct.minimapLinkStroke;
            ctx.lineWidth = 0.5;
            for (const link of links) {
                const src = link.source as GraphNode;
                const tgt = link.target as GraphNode;
                if (
                    src?.x == null ||
                    src?.y == null ||
                    tgt?.x == null ||
                    tgt?.y == null
                )
                    continue;
                const s = toMM(src.x!, src.y!);
                const t = toMM(tgt.x!, tgt.y!);
                ctx.beginPath();
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(t.x, t.y);
                ctx.stroke();
            }
        }

        // ── nodes ─────────────────────────────────────────────────────────────
        const searching = app.searchQuery.trim().length > 0;
        for (const node of nodes) {
            const { x, y } = toMM(node.x ?? 0, node.y ?? 0);
            const color = getTypeColor(node.type, app.uafDefinitions);
            const isSelected =
                app.selectedItem?.kind === "node" &&
                app.selectedItem.data.id === node.id;
            const isMatch = app.matchingNodeIds.has(node.id);
            const passesFilter =
                !app.isFiltered || app.filteredNodeIds.has(node.id);
            const isDimmed =
                !isSelected &&
                ((searching && !isMatch) || (app.isFiltered && !passesFilter));

            const r = isSelected ? 3.5 : 1.8;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, 2 * Math.PI);
            ctx.fillStyle = isDimmed
                ? rgba(color, 0.1)
                : rgba(color, isSelected || isMatch ? 1 : 0.75);
            ctx.fill();

            if (isSelected) {
                ctx.beginPath();
                ctx.arc(x, y, r + 2.5, 0, 2 * Math.PI);
                ctx.strokeStyle = rgba(color, 0.55);
                ctx.lineWidth = 1.2;
                ctx.stroke();
            } else if (isMatch && searching) {
                ctx.beginPath();
                ctx.arc(x, y, r + 2, 0, 2 * Math.PI);
                ctx.strokeStyle = "rgba(251,191,36,0.7)";
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        // ── viewport rectangle ────────────────────────────────────────────────
        try {
            const zoom: number = fg.zoom();
            const center: { x: number; y: number } = fg.centerAt();
            if (zoom > 0 && center) {
                const vw = fg.width() / zoom;
                const vh = fg.height() / zoom;
                const vCorner = toMM(center.x - vw / 2, center.y - vh / 2);
                const viewW = vw * scale;
                const viewH = vh * scale;

                ctx.fillStyle = ct.minimapViewportFill;
                ctx.fillRect(vCorner.x, vCorner.y, viewW, viewH);
                ctx.strokeStyle = ct.minimapViewportStroke;
                ctx.lineWidth = 1;
                ctx.strokeRect(vCorner.x, vCorner.y, viewW, viewH);
            }
        } catch (_) {
            // guard against internal force-graph errors during init
        }

        // ── label ─────────────────────────────────────────────────────────────
        ctx.font = "9px Inter,system-ui,sans-serif";
        ctx.fillStyle = ct.minimapLabel;
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.fillText("MINIMAP", MM_PAD, MM_H - 4);
    }

    function onMinimapPointerDown(e: MouseEvent) {
        if (!fg || !minimapCanvas) return;
        const rect = minimapCanvas.getBoundingClientRect();
        const mmX = (e.clientX - rect.left) * (MM_W / rect.width);
        const mmY = (e.clientY - rect.top) * (MM_H / rect.height);
        const { minX, minY, scale, offsetX, offsetY } = mmTransform;
        const gx = minX + (mmX - offsetX) / scale;
        const gy = minY + (mmY - offsetY) / scale;
        fg.centerAt(gx, gy, 250);
    }

    // ── Colour helper ─────────────────────────────────────────────────────────
    function rgba(hex: string, a: number): string {
        const n = parseInt(hex.replace("#", ""), 16);
        return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    }

    // ── Canvas: draw node ─────────────────────────────────────────────────────
    function drawNode(
        node: GraphNode,
        ctx: CanvasRenderingContext2D,
        scale: number,
    ) {
        const nodeSize = NODE_R * Math.pow(scale, -0.4);
        const x = node.x ?? 0;
        const y = node.y ?? 0;
        const baseColor = getTypeColor(node.type, app.uafDefinitions);
        const isSelected =
            app.selectedItem?.kind === "node" &&
            app.selectedItem.data.id === node.id;
        const isMatch = app.matchingNodeIds.has(node.id);
        const searching = app.searchQuery.trim().length > 0;
        const passesFilter =
            !app.isFiltered || app.filteredNodeIds.has(node.id);
        const isDimmed =
            !isSelected &&
            ((searching && !isMatch) || (app.isFiltered && !passesFilter));
        const ct = app.theme.canvas;
        const alpha = isDimmed ? ct.dimAlpha : 1;

        // Selected glow ring
        if (isSelected) {
            ctx.beginPath();
            ctx.arc(x, y, nodeSize + SELECTED_RING, 0, 2 * Math.PI);
            ctx.fillStyle = rgba(baseColor, 0.25);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x, y, nodeSize + SELECTED_RING / 2, 0, 2 * Math.PI);
            ctx.strokeStyle = rgba(baseColor, 0.65);
            ctx.lineWidth = 1.5 / scale;
            ctx.stroke();
        }

        // Search match highlight ring
        if (searching && isMatch && !isSelected) {
            ctx.beginPath();
            ctx.arc(x, y, nodeSize + 3, 0, 2 * Math.PI);
            ctx.strokeStyle = `rgba(251,191,36,0.9)`;
            ctx.lineWidth = 1.5 / scale;
            ctx.stroke();
        }

        // Node fill
        ctx.beginPath();
        ctx.arc(x, y, nodeSize, 0, 2 * Math.PI);
        ctx.fillStyle = rgba(baseColor, alpha);
        ctx.fill();

        // Node border
        ctx.beginPath();
        ctx.arc(x, y, nodeSize, 0, 2 * Math.PI);
        const [nr, ng, nb] = ct.nodeRingRgb;
        ctx.strokeStyle = `rgba(${nr},${ng},${nb},${isDimmed ? 0.04 : 0.3})`;
        ctx.lineWidth = 0.8 / scale;
        ctx.stroke();

        // Label
        if (scale < 0.35) return;
        const labelAlpha = isDimmed ? 0.1 : isSelected || isMatch ? 1 : 0.75;
        // const fontSize = Math.max(6, 11 / scale);
        const fontSize = 11 * Math.pow(scale, -0.7);
        ctx.font = `${isSelected ? 600 : 400} ${fontSize}px Inter,system-ui,sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const labelY = y + nodeSize + fontSize * 0.8;
        const tw = ctx.measureText(node.name).width;
        const px = 3 / scale,
            py = 2 / scale;
        const [lr, lg, lb] = ct.labelBgRgb;
        ctx.fillStyle = `rgba(${lr},${lg},${lb},${labelAlpha * ct.labelBgAlpha})`;
        ctx.fillRect(
            x - tw / 2 - px,
            labelY - fontSize / 2 - py,
            tw + px * 2,
            fontSize + py * 2,
        );
        ctx.fillStyle = rgba(ct.labelTextHex, labelAlpha);
        ctx.fillText(node.name, x, labelY);
    }

    // ── Canvas: draw link ─────────────────────────────────────────────────────
    function drawLink(
        link: GraphLink,
        ctx: CanvasRenderingContext2D,
        scale: number,
    ) {
        const src = link.source as GraphNode;
        const tgt = link.target as GraphNode;
        const nodeSize = NODE_R * Math.pow(scale, -0.4);
        if (!src || !tgt) return;

        const sx = src.x ?? 0,
            sy = src.y ?? 0;
        const tx = tgt.x ?? 0,
            ty = tgt.y ?? 0;

        const isSelected =
            app.selectedItem?.kind === "link" &&
            app.selectedItem.data.id === link.id;
        const searching = app.searchQuery.trim().length > 0;
        const srcMatch = app.matchingNodeIds.has(src.id);
        const tgtMatch = app.matchingNodeIds.has(tgt.id);
        const srcPassesFilter =
            !app.isFiltered || app.filteredNodeIds.has(src.id);
        const tgtPassesFilter =
            !app.isFiltered || app.filteredNodeIds.has(tgt.id);
        const isDimmed =
            !isSelected &&
            ((searching && !srcMatch && !tgtMatch) ||
                (app.isFiltered && !srcPassesFilter && !tgtPassesFilter));

        const alpha = isDimmed ? 0.05 : isSelected ? 0.9 : 0.35;

        const ct = app.theme.canvas;
        const [lr, lg, lb] = ct.linkRgb;
        const [sr, sg, sb] = ct.linkSelectedRgb;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = isSelected
            ? `rgba(${sr},${sg},${sb},${alpha})`
            : `rgba(${lr},${lg},${lb},${alpha})`;
        ctx.lineWidth = (isSelected ? 2 : 1) / scale;
        ctx.stroke();

        // Arrow head
        const angle = Math.atan2(ty - sy, tx - sx);
        const aLen = 8 / scale;
        const aAngle = Math.PI / 7;
        const tipX = tx - nodeSize * Math.cos(angle);
        const tipY = ty - nodeSize * Math.sin(angle);
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(
            tipX - aLen * Math.cos(angle - aAngle),
            tipY - aLen * Math.sin(angle - aAngle),
        );
        ctx.lineTo(
            tipX - aLen * Math.cos(angle + aAngle),
            tipY - aLen * Math.sin(angle + aAngle),
        );
        ctx.closePath();
        ctx.fillStyle = isSelected
            ? `rgba(${sr},${sg},${sb},${alpha})`
            : `rgba(${lr},${lg},${lb},${alpha})`;
        ctx.fill();

        // Link label (only when selected and zoomed in)
        if (isSelected && link.name && scale > 0.6) {
            const mx = (sx + tx) / 2,
                my = (sy + ty) / 2;
            const fs = Math.max(6, 9 / scale);
            ctx.font = `${fs}px Inter,system-ui,sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            const tw = ctx.measureText(link.name).width;
            const [llr, llg, llb] = ct.labelBgRgb;
            ctx.fillStyle = `rgba(${llr},${llg},${llb},0.82)`;
            ctx.fillRect(mx - tw / 2 - 3, my - fs / 2 - 2, tw + 6, fs + 4);
            ctx.fillStyle = `rgba(${sr},${sg},${sb},0.95)`;
            ctx.fillText(link.name, mx, my);
        }
    }

    // ── Hit area for pointer events ───────────────────────────────────────────
    function nodePointerArea(
        node: GraphNode,
        color: string,
        ctx: CanvasRenderingContext2D,
        globalScale: number,
    ) {
        const nodeSize = NODE_R * Math.pow(globalScale, -0.4);
        const hitRadius = nodeSize + 4 / globalScale;
        ctx.beginPath();
        ctx.arc(node.x ?? 0, node.y ?? 0, hitRadius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
    }

    // ── Mount: create force-graph instance ───────────────────────────────────
    onMount(() => {
        fg = new ForceGraph(container)
            .nodeId("id")
            .nodeCanvasObject(drawNode as any)
            .nodeCanvasObjectMode(() => "replace")
            .nodePointerAreaPaint(nodePointerArea as any)
            .linkCanvasObject(drawLink as any)
            .linkCanvasObjectMode(() => "replace")
            .linkDirectionalArrowLength(0)
            .onNodeClick((node: any) => {
                const n = node as GraphNode;
                if (
                    app.selectedItem?.kind === "node" &&
                    app.selectedItem.data.id === n.id
                ) {
                    app.selectedItem = null;
                } else {
                    app.selectedItem = { kind: "node", data: n };
                }
                const zoom = fg?.zoom();
                fg?.zoom(zoom);
            })
            .onLinkClick((link: any) => {
                const l = link as GraphLink;
                if (
                    app.selectedItem?.kind === "link" &&
                    app.selectedItem.data.id === l.id
                ) {
                    app.selectedItem = null;
                } else {
                    app.selectedItem = { kind: "link", data: l };
                }
                const zoom = fg?.zoom();
                fg?.zoom(zoom);
            })
            .onBackgroundClick(() => {
                app.selectedItem = null;
            })
            .cooldownTicks(120)
            .d3AlphaDecay(0.02)
            .d3VelocityDecay(0.4)
            .backgroundColor(app.theme.canvas.background)
            .nodeLabel("")
            .linkLabel("");

        // Set initial data
        syncData();

        // Start minimap render loop
        drawMinimap();

        // Resize observer
        const obs = new ResizeObserver(() => {
            fg?.width(container.clientWidth).height(container.clientHeight);
        });
        obs.observe(container);
        fg.width(container.clientWidth).height(container.clientHeight);

        return () => {
            obs.disconnect();
            cancelAnimationFrame(minimapRaf);
            fg._destructor?.();
            fg = null;
        };
    });

    // ── Reactive: re-load graph data when file changes ────────────────────────
    // ── Layout helpers ────────────────────────────────────────────────────────

    //TODO: Implement this
    function applyLayout(layout: string) {
        if (!fg) return;
        switch (layout) {
            case "hierarchical-td":
                fg.dagMode("td").dagLevelDistance(80);
                break;
            case "hierarchical-lr":
                fg.dagMode("lr").dagLevelDistance(120);
                break;
            case "radial":
                fg.dagMode("radialout").dagLevelDistance(80);
                break;
            case "force":
            default:
                fg.dagMode(null);
                break;
        }
        // Re-heat simulation so new forces take effect
        fg.d3ReheatSimulation();
        setTimeout(() => fg?.zoomToFit(600, 60), 600);
    }

    function syncData() {
        if (!fg) return;
        const data = app.graphData ?? { nodes: [], links: [] };
        fg.graphData(JSON.parse(JSON.stringify(data)));
        applyLayout(app.graphLayout);
        setTimeout(() => fg?.zoomToFit(600, 60), 600);
    }

    $effect(() => {
        const _data = app.graphData; // track
        if (fg) syncData();
    });

    // ── Reactive: apply layout when graphLayout changes ────────────────────────
    $effect(() => {
        const layout = app.graphLayout; // track
        if (fg) applyLayout(layout);
    });

    // ── Reactive: repaint canvas when selection/search/theme changes ───────────
    $effect(() => {
        const _s = app.selectedItem; // track
        const _q = app.searchQuery; // track
        const _t = app.theme; // track
        const _f = app.filteredNodeIds; // track
        const _if = app.isFiltered; // track
        // fg?.refresh();

        const zoom = fg?.zoom();
        fg?.zoom(zoom);
    });

    // ── Reactive: update force-graph background colour when theme changes ──────
    $effect(() => {
        const bg = app.theme.canvas.background; // track
        fg?.backgroundColor(bg);
    });

    // ── Reactive: zoom to matching nodes when search query changes ─────────────
    let searchZoomDebounce: ReturnType<typeof setTimeout>;
    $effect(() => {
        const q = app.searchQuery; // track
        const matchIds = app.matchingNodeIds; // track
        clearTimeout(searchZoomDebounce);
        if (q && matchIds.size > 0) {
            searchZoomDebounce = setTimeout(() => {
                fg?.zoomToFit(500, 80, (node: unknown) =>
                    matchIds.has((node as GraphNode).id),
                );
            }, 300);
        } else if (!q) {
            // Search cleared — reset to full view (unless filter is active)
            if (!app.isFiltered) {
                searchZoomDebounce = setTimeout(
                    () => fg?.zoomToFit(400, 60),
                    150,
                );
            }
        }
    });

    // ── Reactive: zoom to filtered nodes when domain filter changes ────────────
    let filterZoomDebounce: ReturnType<typeof setTimeout>;
    $effect(() => {
        const filteredIds = app.filteredNodeIds; // track
        const isFiltered = app.isFiltered; // track
        clearTimeout(filterZoomDebounce);
        if (isFiltered && filteredIds.size > 0) {
            filterZoomDebounce = setTimeout(() => {
                fg?.zoomToFit(600, 60, (node: unknown) =>
                    filteredIds.has((node as GraphNode).id),
                );
            }, 300);
        } else if (!isFiltered) {
            filterZoomDebounce = setTimeout(() => fg?.zoomToFit(400, 60), 150);
        }
        fg?.refresh();
    });

    // ── Exposed methods ───────────────────────────────────────────────────────
    export function zoomToFit() {
        fg?.zoomToFit(400, 60);
    }

    export function zoomToMatches() {
        const matchIds = app.matchingNodeIds;
        if (matchIds.size === 0) return;
        fg?.zoomToFit(500, 80, (node: unknown) =>
            matchIds.has((node as GraphNode).id),
        );
    }

    export function zoomToNode(nodeId: string) {
        const nodes: GraphNode[] = fg?.graphData()?.nodes ?? [];
        const node = nodes.find((n) => n.id === nodeId);
        if (node?.x != null && node?.y != null) {
            fg?.centerAt(node.x, node.y, 500);
            fg?.zoom(4, 500);
        }
    }
</script>

<div class="absolute inset-0">
    <div
        bind:this={container}
        class="absolute inset-0"
        style="background:{app.theme.canvas.background}"
    ></div>
    <!-- Minimap overlay -->
    <canvas
        bind:this={minimapCanvas}
        width={MM_W}
        height={MM_H}
        class="absolute bottom-4 right-4 z-10 rounded-lg cursor-crosshair opacity-80 hover:opacity-100 transition-opacity shadow-xl"
        style="width:{MM_W}px;height:{MM_H}px"
        onmousedown={onMinimapPointerDown}
        title="Minimap — click to navigate"
    ></canvas>
</div>
