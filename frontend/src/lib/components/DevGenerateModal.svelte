<script lang="ts">
    // ─── DevGenerateModal ────────────────────────────────────────────────────────
    //
    // Dev-only modal (never rendered in production) that generates a synthetic
    // MBSE file from the live UAF definitions and either loads it directly into
    // the graph view or downloads it as a JSON file.

    import {
        FlaskConical,
        X,
        Download,
        Play,
        Zap,
        TriangleAlert,
    } from "lucide-svelte";
    import { app } from "$lib/state/app.svelte";
    import {
        generateMockMBSEFile,
        generateMockJSON,
    } from "$lib/utils/mockGenerator";

    interface Props {
        onclose: () => void;
    }
    let { onclose }: Props = $props();

    // ── Form state ────────────────────────────────────────────────────────────
    let nodeCount = $state(50);
    let relationCount = $state(80);
    let error = $state("");
    let isGenerating = $state(false);

    // ── Derived preview stats ─────────────────────────────────────────────────
    const typeCount = $derived(app.uafDefinitions.size);
    const maxPossibleEdges = $derived(nodeCount * (nodeCount - 1));
    const clampedRelations = $derived(
        Math.min(relationCount, maxPossibleEdges),
    );
    const isRelationClamped = $derived(
        relationCount > maxPossibleEdges && nodeCount > 1,
    );
    const density = $derived(
        maxPossibleEdges > 0
            ? ((clampedRelations / maxPossibleEdges) * 100).toFixed(1)
            : "0.0",
    );
    const isHighDensity = $derived(parseFloat(density) > 60);
    const isLargeGraph = $derived(nodeCount > 500 || clampedRelations > 2000);

    // ── Preset configs ────────────────────────────────────────────────────────
    const PRESETS = [
        { label: "Tiny", nodes: 10, relations: 12 },
        { label: "Small", nodes: 50, relations: 80 },
        { label: "Medium", nodes: 200, relations: 350 },
        { label: "Large", nodes: 800, relations: 1400 },
    ] as const;

    function applyPreset(nodes: number, relations: number) {
        nodeCount = nodes;
        relationCount = relations;
        error = "";
    }

    // ── Actions ───────────────────────────────────────────────────────────────

    function handleGenerate() {
        error = "";
        isGenerating = true;
        try {
            const {
                file,
                actualRelationCount,
                typeCount: tc,
            } = generateMockMBSEFile(app.uafDefinitions, {
                nodeCount,
                relationCount,
            });
            const name = `mock-${nodeCount}n-${actualRelationCount}r.json`;
            app.loadFile(file, name);
            console.info(
                `[DevGen] Loaded mock graph: ${nodeCount} entities (${tc} types), ` +
                    `${actualRelationCount} relationships → "${name}"`,
            );
            onclose();
        } catch (e) {
            error = e instanceof Error ? e.message : String(e);
        } finally {
            isGenerating = false;
        }
    }

    function handleDownload() {
        error = "";
        try {
            const { json, result } = generateMockJSON(app.uafDefinitions, {
                nodeCount,
                relationCount,
            });
            const name = `mock-${nodeCount}n-${result.actualRelationCount}r.json`;
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = name;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            error = e instanceof Error ? e.message : String(e);
        }
    }

    function onBackdropClick(e: MouseEvent) {
        if (e.target === e.currentTarget) onclose();
    }

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") onclose();
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleGenerate();
    }
</script>

<svelte:window onkeydown={onKeyDown} />

<!-- ── Backdrop ──────────────────────────────────────────────────────────── -->
<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    onclick={onBackdropClick}
>
    <!-- ── Modal card ───────────────────────────────────────────────────────── -->
    <div
        class="relative w-full max-w-md rounded-2xl border border-yellow-600/30 bg-gray-950 shadow-2xl shadow-black/60 flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="devgen-title"
    >
        <!-- ── Header ─────────────────────────────────────────────────────── -->
        <div
            class="flex items-center gap-3 px-5 py-4 border-b border-gray-800 rounded-t-2xl bg-yellow-950/20"
        >
            <span
                class="flex items-center justify-center rounded-lg bg-yellow-500/15 border border-yellow-600/30 p-1.5"
            >
                <FlaskConical class="h-4 w-4 text-yellow-400" />
            </span>

            <div class="flex-1 min-w-0">
                <h2
                    id="devgen-title"
                    class="text-sm font-semibold text-yellow-300"
                >
                    Mock Data Generator
                </h2>
                <p class="text-[11px] text-yellow-700 mt-0.5">
                    Dev only · hidden in production builds
                </p>
            </div>

            <button
                onclick={onclose}
                class="rounded-lg p-1.5 text-gray-600 hover:text-gray-300 hover:bg-gray-800 transition-colors"
                aria-label="Close modal"
            >
                <X class="h-4 w-4" />
            </button>
        </div>

        <!-- ── Body ───────────────────────────────────────────────────────── -->
        <div class="px-5 pt-5 pb-4 space-y-5">
            <!-- UAF info pill -->
            <div
                class="flex items-center gap-2 rounded-lg bg-gray-900 border border-gray-800 px-3 py-2 text-xs text-gray-400"
            >
                <span class="h-2 w-2 rounded-full bg-emerald-400 shrink-0"
                ></span>
                <span>
                    <span class="font-semibold text-gray-200">{typeCount}</span>
                    UAF stereotypes loaded — entities will be randomly assigned types
                </span>
            </div>

            <!-- Presets -->
            <div>
                <p
                    class="text-[11px] font-medium uppercase tracking-wider text-gray-600 mb-2"
                >
                    Presets
                </p>
                <div class="grid grid-cols-4 gap-1.5">
                    {#each PRESETS as preset}
                        {@const active =
                            nodeCount === preset.nodes &&
                            relationCount === preset.relations}
                        <button
                            onclick={() =>
                                applyPreset(preset.nodes, preset.relations)}
                            class={[
                                "flex flex-col items-center gap-0.5 rounded-lg border px-2 py-2 text-[11px] transition-colors",
                                active
                                    ? "border-yellow-600/60 bg-yellow-950/40 text-yellow-300"
                                    : "border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-700 hover:text-gray-200",
                            ].join(" ")}
                        >
                            <span class="font-semibold">{preset.label}</span>
                            <span
                                class="text-[10px] text-gray-600 tabular-nums"
                            >
                                {preset.nodes}n / {preset.relations}r
                            </span>
                        </button>
                    {/each}
                </div>
            </div>

            <!-- Inputs -->
            <div class="grid grid-cols-2 gap-3">
                <!-- Node count -->
                <div>
                    <label
                        for="devgen-nodes"
                        class="block text-[11px] font-medium text-gray-400 mb-1.5"
                    >
                        Entities
                        <span class="text-gray-600 font-normal ml-1"
                            >(nodes)</span
                        >
                    </label>
                    <input
                        id="devgen-nodes"
                        type="number"
                        bind:value={nodeCount}
                        min={1}
                        max={5000}
                        step={1}
                        oninput={() => (error = "")}
                        class="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white tabular-nums
                               outline-none focus:border-yellow-600/60 focus:ring-1 focus:ring-yellow-600/30 transition-colors"
                    />
                </div>

                <!-- Relation count -->
                <div>
                    <label
                        for="devgen-relations"
                        class="block text-[11px] font-medium text-gray-400 mb-1.5"
                    >
                        Relations
                        <span class="text-gray-600 font-normal ml-1"
                            >(edges)</span
                        >
                    </label>
                    <input
                        id="devgen-relations"
                        type="number"
                        bind:value={relationCount}
                        min={0}
                        max={20000}
                        step={1}
                        oninput={() => (error = "")}
                        class="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white tabular-nums
                               outline-none focus:border-yellow-600/60 focus:ring-1 focus:ring-yellow-600/30 transition-colors"
                    />
                </div>
            </div>

            <!-- Stats preview -->
            <div
                class="rounded-lg border border-gray-800 bg-gray-900/60 px-4 py-3 space-y-1.5 text-xs"
            >
                <div class="flex justify-between text-gray-400">
                    <span>Entities</span>
                    <span class="tabular-nums font-semibold text-gray-200"
                        >{nodeCount.toLocaleString()}</span
                    >
                </div>
                <div class="flex justify-between text-gray-400">
                    <span>Relations</span>
                    <span class="tabular-nums font-semibold text-gray-200">
                        {clampedRelations.toLocaleString()}
                        {#if isRelationClamped}
                            <span class="text-yellow-600 ml-1">(clamped)</span>
                        {/if}
                    </span>
                </div>
                <div class="flex justify-between text-gray-400">
                    <span>Graph density</span>
                    <span
                        class={[
                            "tabular-nums font-semibold",
                            isHighDensity ? "text-orange-400" : "text-gray-200",
                        ].join(" ")}
                    >
                        {density}%
                    </span>
                </div>
                <div
                    class="border-t border-gray-800 pt-1.5 flex justify-between text-gray-500"
                >
                    <span>Max possible edges</span>
                    <span class="tabular-nums"
                        >{maxPossibleEdges.toLocaleString()}</span
                    >
                </div>
            </div>

            <!-- Warnings -->
            {#if isRelationClamped}
                <div
                    class="flex items-start gap-2 rounded-lg bg-yellow-950/30 border border-yellow-700/40 px-3 py-2.5 text-xs text-yellow-400"
                >
                    <TriangleAlert class="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>
                        Requested relations exceed the maximum for {nodeCount} nodes.
                        Will generate
                        <strong>{clampedRelations.toLocaleString()}</strong> instead.
                    </span>
                </div>
            {/if}

            {#if isLargeGraph}
                <div
                    class="flex items-start gap-2 rounded-lg bg-orange-950/30 border border-orange-700/40 px-3 py-2.5 text-xs text-orange-400"
                >
                    <Zap class="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>
                        Large graphs may take a moment to simulate and render.
                    </span>
                </div>
            {/if}

            <!-- Error -->
            {#if error}
                <div
                    class="flex items-start gap-2 rounded-lg bg-red-950/40 border border-red-800/50 px-3 py-2.5 text-xs text-red-400"
                >
                    <TriangleAlert class="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span class="break-words">{error}</span>
                </div>
            {/if}
        </div>

        <!-- ── Footer ──────────────────────────────────────────────────────── -->
        <div
            class="flex items-center justify-between gap-2 px-5 py-4 border-t border-gray-800 rounded-b-2xl"
        >
            <!-- Download JSON -->
            <button
                onclick={handleDownload}
                class="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-gray-300
                       hover:bg-gray-800 hover:border-gray-600 hover:text-white transition-colors"
                title="Generate and download as a JSON file without loading it"
            >
                <Download class="h-3.5 w-3.5" />
                Download JSON
            </button>

            <div class="flex items-center gap-2">
                <!-- Cancel -->
                <button
                    onclick={onclose}
                    class="rounded-lg px-3 py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                    Cancel
                </button>

                <!-- Generate & Load -->
                <button
                    onclick={handleGenerate}
                    disabled={isGenerating || nodeCount < 1}
                    class="flex items-center gap-1.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50
                           disabled:cursor-not-allowed px-4 py-2 text-xs font-semibold text-gray-950 transition-colors"
                    title="Generate data and load it into the graph view (Ctrl+Enter)"
                >
                    <Play class="h-3.5 w-3.5" />
                    {isGenerating ? "Generating…" : "Generate & Load"}
                </button>
            </div>
        </div>
    </div>
</div>
