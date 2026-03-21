<script lang="ts">
    // import { page } from "$app/stores";
    import { page } from "$app/state";
    import { onMount } from "svelte";
    import * as d3 from "d3";
    import GraphCanvas from "$lib/components/GraphCanvas.svelte";
    import Toolbar from "$lib/components/Toolbar.svelte";
    import NodeDetailSlider from "$lib/components/NodeDetailSlider.svelte";
    import TypeLegend from "$lib/components/TypeLegend.svelte";
    import Minimap from "$lib/components/Minimap.svelte";
    import { appState } from "$lib/state/app.svelte.js";

    let canvasComponent: GraphCanvas;
    let canvasWidth = $state(800);
    let canvasHeight = $state(600);
    let containerRef: HTMLElement;
    let canvasTransform = $state<d3.ZoomTransform>(d3.zoomIdentity);
    let simNodes = $state<
        { id: string; x: number; y: number; domain: string }[]
    >([]);

    let projectId = page.params.id;

    onMount(() => {
        if (projectId) {
            appState.loadProject(projectId);
        }
    });

    function handleKeydown(e: KeyboardEvent): void {
        if (e.key === "Escape") {
            appState.clearSelection();
        }
    }

    function handleResize(): void {
        if (containerRef) {
            canvasWidth = containerRef.clientWidth;
            canvasHeight = containerRef.clientHeight;
        }
    }

    function handleNavigate(x: number, y: number): void {
        canvasComponent?.navigateTo(x, y);
    }

    function handleReset(): void {
        canvasComponent?.resetZoom();
    }

    $effect(() => {
        if (containerRef) {
            handleResize();
            window.addEventListener("resize", handleResize);
            return () => window.removeEventListener("resize", handleResize);
        }
    });
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
    <title>{appState.currentProject?.name || "Editor"} | MBSE</title>
</svelte:head>

<div class="flex flex-col h-screen">
    <Toolbar onReset={handleReset} />

    <main class="flex-1 relative overflow-hidden" bind:this={containerRef}>
        <GraphCanvas
            bind:this={canvasComponent}
            bind:transform={canvasTransform}
            bind:simNodes
        />
        <TypeLegend />
        <Minimap
            transform={canvasTransform}
            width={canvasWidth}
            height={canvasHeight}
            onNavigate={handleNavigate}
            nodes={simNodes}
        />
    </main>
</div>

<NodeDetailSlider />
