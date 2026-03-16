<script lang="ts">
    // ─── App ──────────────────────────────────────────────────────────────────
    //
    // Root component.  All shared state lives in the `app` singleton; this file
    // is purely a layout shell that switches between three screens:
    //   1. Loading spinner  (UAF.xmi fetch in progress)
    //   2. Error card       (UAF.xmi could not be parsed)
    //   3. File loader      (no MBSE file loaded yet)
    //   4. Graph view       (normal operation)

    import { onMount } from "svelte";
    import { app } from "$lib/state/app.svelte";
    import FileLoader from "$lib/components/FileLoader.svelte";
    import GraphCanvas from "$lib/components/GraphCanvas.svelte";
    import NodeDetailSlider from "$lib/components/NodeDetailSlider.svelte";
    import Toolbar from "$lib/components/Toolbar.svelte";
    import TypeLegend from "$lib/components/TypeLegend.svelte";

    // Kick off UAF loading on mount; restore persisted theme first so the
    // correct colours are applied before any content paints.
    onMount(() => {
        app.initTheme();
        app.loadUAF();
    });

    // Ref to GraphCanvas so Toolbar can call zoomToFit() / zoomToMatches() / zoomToNode()
    let graphCanvas: GraphCanvas;
</script>

{#if app.uafStatus === "loading"}
    <!-- ── Spinner ─────────────────────────────────────────────────────────── -->
    <div class="flex items-center justify-center h-screen w-screen bg-gray-950">
        <div class="flex flex-col items-center gap-4 text-gray-400">
            <svg
                class="h-8 w-8 animate-spin text-blue-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
                <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                ></circle>
                <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                ></path>
            </svg>
            <p class="text-sm">Loading UAF definitions…</p>
        </div>
    </div>
{:else if app.uafStatus === "error"}
    <!-- ── Error card ──────────────────────────────────────────────────────── -->
    <div
        class="flex items-center justify-center h-screen w-screen bg-gray-950 p-8"
    >
        <div
            class="max-w-md rounded-xl bg-red-950/60 border border-red-800 p-6 text-center"
        >
            <h2 class="text-lg font-semibold text-red-300 mb-2">
                Failed to load UAF definitions
            </h2>
            <p class="text-sm text-red-400 wrap-break-words">{app.uafError}</p>
            <p class="mt-3 text-xs text-gray-500">
                Make sure <code class="text-gray-400">public/UAF.xmi</code> is a
                valid symlink to
                <code class="text-gray-400">resources/UAF.xmi</code>.
            </p>
            <button
                class="mt-4 rounded-lg bg-red-800 hover:bg-red-700 px-4 py-2 text-sm text-white transition-colors"
                onclick={() => location.reload()}>Retry</button
            >
        </div>
    </div>
{:else if !app.graphData}
    <!-- ── File loader ─────────────────────────────────────────────────────── -->
    <div class="h-screen w-screen">
        <FileLoader onfileloaded={(raw, name) => app.loadFile(raw, name)} />
    </div>
{:else}
    <!-- ── Main graph view ─────────────────────────────────────────────────── -->
    <div class="relative h-screen w-screen overflow-hidden bg-gray-950">
        <Toolbar
            onreset={() => graphCanvas?.zoomToFit()}
            onnewfile={() => app.reset()}
            onselectnode={(node) => graphCanvas?.zoomToNode(node.id)}
        />

        <!-- Graph canvas fills the area below the toolbar -->
        <div class="absolute inset-0 top-12.25">
            <GraphCanvas bind:this={graphCanvas} />
        </div>

        <!-- Domain legend (bottom-left, above toolbar offset) -->
        <div class="absolute bottom-4 left-4 z-20">
            <TypeLegend />
        </div>

        <!-- Detail slider (right edge) -->
        <NodeDetailSlider />
    </div>
{/if}
