<script lang="ts">
    import {
        Search,
        X,
        RotateCcw,
        FolderOpen,
        Circle,
        ArrowRight,
        FlaskConical,
        ChevronDown,
        GitBranch,
        Workflow,
        ArrowDown,
        CircleDot,
    } from "lucide-svelte";
    import ThemeSelector from "$lib/components/ThemeSelector.svelte";
    import { app } from "$lib/state/app.svelte";
    import { getTypeColor } from "$lib/utils/uafParser";
    import type { GraphNode } from "$lib/types/mbse";
    import type { GraphLayout } from "$lib/state/app.svelte";
    import DevGenerateModal from "$lib/components/DevGenerateModal.svelte";

    interface Props {
        onreset: () => void;
        onnewfile: () => void;
        onselectnode?: (node: GraphNode) => void;
    }
    let { onreset, onnewfile, onselectnode }: Props = $props();

    let showDevModal = $state(false);

    let searchEl: HTMLInputElement;
    let dropdownOpen = $state(false);
    let activeIndex = $state(-1);
    let layoutDropdownOpen = $state(false);

    const MAX_SUGGESTIONS = 8;

    const nodeCount = $derived(app.graphData?.nodes.length ?? 0);
    const linkCount = $derived(app.graphData?.links.length ?? 0);
    const isSearching = $derived(app.searchQuery.trim().length > 0);
    const suggestions = $derived(app.matchingNodes.slice(0, MAX_SUGGESTIONS));
    const hasMore = $derived(app.matchCount > MAX_SUGGESTIONS);
    const noResults = $derived(isSearching && app.matchCount === 0);
    const showDropdown = $derived(dropdownOpen && isSearching);

    // Reset keyboard cursor whenever the suggestion list changes
    $effect(() => {
        suggestions; // track
        activeIndex = -1;
    });

    // ── Layout options ────────────────────────────────────────────────────────

    const layoutOptions: Array<{
        id: GraphLayout;
        label: string;
        description: string;
        icon: any;
    }> = [
        {
            id: "force",
            label: "Force",
            description: "Physics-based layout",
            icon: GitBranch,
        },
        {
            id: "hierarchical-td",
            label: "Hierarchical",
            description: "Top-down tree",
            icon: ArrowDown,
        },
        {
            id: "hierarchical-lr",
            label: "Hierarchical LR",
            description: "Left-right tree",
            icon: Workflow,
        },
        {
            id: "radial",
            label: "Radial",
            description: "Circular layout",
            icon: CircleDot,
        },
    ];

    const currentLayout = $derived(
        layoutOptions.find((opt) => opt.id === app.graphLayout) ??
            layoutOptions[0],
    );

    // ── Helpers ──────────────────────────────────────────────────────────────

    /** Split `text` into segments, marking the first occurrence of `query`. */
    function highlight(
        text: string,
        query: string,
    ): Array<{ text: string; match: boolean }> {
        if (!query) return [{ text, match: false }];
        const idx = text.toLowerCase().indexOf(query.trim().toLowerCase());
        if (idx === -1) return [{ text, match: false }];
        const q = query.trim();
        return [
            { text: text.slice(0, idx), match: false },
            { text: text.slice(idx, idx + q.length), match: true },
            { text: text.slice(idx + q.length), match: false },
        ].filter((p) => p.text.length > 0);
    }

    // ── Actions ───────────────────────────────────────────────────────────────

    function openDropdown() {
        dropdownOpen = true;
    }

    /** Delay close so a mousedown on a list item fires before the input blurs. */
    function scheduleClose() {
        setTimeout(() => {
            dropdownOpen = false;
            activeIndex = -1;
        }, 150);
    }

    function clearSearch() {
        app.searchQuery = "";
        activeIndex = -1;
        dropdownOpen = false;
        searchEl?.focus();
    }

    function selectNode(node: GraphNode) {
        app.selectedItem = { kind: "node", data: node };
        app.searchQuery = "";
        dropdownOpen = false;
        activeIndex = -1;
        onselectnode?.(node);
    }

    function onSearchKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            if (dropdownOpen) {
                dropdownOpen = false;
                activeIndex = -1;
            } else {
                clearSearch();
            }
            e.preventDefault();
            return;
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            dropdownOpen = true;
            activeIndex = Math.min(activeIndex + 1, suggestions.length - 1);
            return;
        }

        if (e.key === "ArrowUp") {
            e.preventDefault();
            activeIndex = Math.max(activeIndex - 1, -1);
            return;
        }

        if (e.key === "Enter") {
            e.preventDefault();
            const target =
                activeIndex >= 0 ? suggestions[activeIndex] : suggestions[0];
            if (target) selectNode(target);
            return;
        }
    }
</script>

{#if showDevModal}
    <DevGenerateModal
        onclose={() => {
            showDevModal = false;
        }}
    />
{/if}

<header
    class="absolute top-0 left-0 right-0 z-20 flex items-center gap-3 px-4 py-2.5 bg-gray-900/90 border-b border-gray-800 backdrop-blur-sm"
>
    <!-- Title + filename -->
    <div class="flex items-center gap-2 shrink-0 min-w-0">
        <span class="text-sm font-bold text-white hidden sm:inline"
            >MBSE Explorer</span
        >
        <span class="hidden sm:inline text-gray-700">/</span>
        <span
            class="text-xs text-gray-400 font-mono truncate max-w-35"
            title={app.fileName}
        >
            {app.fileName}
        </span>
    </div>

    <div class="flex-1"></div>

    <!-- Stats -->
    <div class="flex items-center gap-2">
        <div
            class="flex items-center gap-1.5 rounded-full bg-gray-800 border border-gray-700 px-3 py-1 text-xs text-gray-300"
            title="{nodeCount} nodes"
        >
            <Circle class="h-3 w-3 text-blue-400" />
            <span class="font-semibold text-white tabular-nums"
                >{nodeCount}</span
            >
            <span class="text-gray-500 hidden sm:inline">nodes</span>
        </div>
        <div
            class="flex items-center gap-1.5 rounded-full bg-gray-800 border border-gray-700 px-3 py-1 text-xs text-gray-300"
            title="{linkCount} edges"
        >
            <ArrowRight class="h-3 w-3 text-emerald-400" />
            <span class="font-semibold text-white tabular-nums"
                >{linkCount}</span
            >
            <span class="text-gray-500 hidden sm:inline">edges</span>
        </div>
    </div>

    <!-- Search -->
    <div class="relative flex items-center">
        <!-- Icon -->
        <Search
            class={[
                "absolute left-2.5 h-3.5 w-3.5 pointer-events-none z-10",
                noResults ? "text-red-500" : "text-gray-500",
            ].join(" ")}
        />

        <!-- Input -->
        <input
            bind:this={searchEl}
            bind:value={app.searchQuery}
            type="search"
            placeholder="Search nodes…"
            aria-label="Search nodes by name"
            aria-haspopup="listbox"
            aria-expanded={showDropdown}
            aria-autocomplete="list"
            autocomplete="off"
            onfocus={openDropdown}
            onblur={scheduleClose}
            onkeydown={onSearchKeyDown}
            class={[
                "h-8 w-48 rounded-lg bg-gray-800 border pl-8 text-xs text-gray-200",
                "placeholder:text-gray-600 outline-none transition-all duration-200",
                "focus:w-64 focus:ring-1",
                isSearching ? "pr-16" : "pr-7",
                showDropdown ? "rounded-b-none border-b-transparent" : "",
                noResults
                    ? "border-red-700 focus:border-red-600 focus:ring-red-600/40"
                    : app.searchQuery
                      ? "border-blue-700 text-white focus:border-blue-600 focus:ring-blue-600/40"
                      : "border-gray-700 hover:border-gray-600 focus:border-blue-600 focus:ring-blue-600/40",
            ].join(" ")}
        />

        <!-- Match count badge -->
        {#if isSearching}
            <span
                class={[
                    "absolute right-7 text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full pointer-events-none",
                    noResults
                        ? "bg-red-900/80 text-red-300"
                        : "bg-yellow-500/20 text-yellow-300",
                ].join(" ")}
                title="{app.matchCount} matching node{app.matchCount === 1
                    ? ''
                    : 's'}"
            >
                {app.matchCount}
            </span>
        {/if}

        <!-- Clear button -->
        {#if app.searchQuery}
            <button
                onmousedown={(e) => e.preventDefault()}
                onclick={clearSearch}
                class="absolute right-2 text-gray-500 hover:text-white transition-colors z-10"
                aria-label="Clear search"
            >
                <X class="h-3.5 w-3.5" />
            </button>
        {/if}

        <!-- Dropdown -->
        {#if showDropdown}
            <ul
                role="listbox"
                aria-label="Search suggestions"
                class={[
                    "absolute top-full left-0 right-0 z-50",
                    "bg-gray-800 border border-blue-700 border-t-0",
                    "rounded-b-lg shadow-xl overflow-y-auto",
                    "max-h-68",
                ].join(" ")}
            >
                {#if noResults}
                    <li
                        class="px-3 py-3 text-xs text-gray-500 italic text-center"
                    >
                        No matching nodes
                    </li>
                {:else}
                    {#each suggestions as node, i}
                        {@const color = getTypeColor(
                            node.type,
                            app.uafDefinitions,
                        )}
                        {@const parts = highlight(node.name, app.searchQuery)}
                        <li
                            role="option"
                            aria-selected={i === activeIndex}
                            tabindex="0"
                            onmousedown={(e) => e.preventDefault()}
                            onclick={() => selectNode(node)}
                            onmouseenter={() => (activeIndex = i)}
                            onkeydown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault(); // Prevents page scroll on Space
                                    selectNode(node);
                                }
                            }}
                            class={[
                                "flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors",
                                "border-b border-gray-700/50 last:border-b-0",
                                i === activeIndex
                                    ? "bg-gray-700"
                                    : "hover:bg-gray-700/60",
                            ].join(" ")}
                        >
                            <!-- Type colour dot -->
                            <span
                                class="shrink-0 h-2 w-2 rounded-full"
                                style="background:{color}"
                            ></span>

                            <!-- Name with highlighted match -->
                            <span class="flex-1 text-xs truncate min-w-0">
                                {#each parts as part}
                                    {#if part.match}
                                        <mark
                                            class="bg-yellow-400/30 text-yellow-200 rounded-sm px-0.5 not-italic"
                                            >{part.text}</mark
                                        >
                                    {:else}
                                        <span class="text-gray-200"
                                            >{part.text}</span
                                        >
                                    {/if}
                                {/each}
                            </span>

                            <!-- Type label -->
                            {#if node.type}
                                <span
                                    class="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                                    style="background:{color}22;color:{color};border:1px solid {color}44"
                                >
                                    {node.type}
                                </span>
                            {/if}
                        </li>
                    {/each}

                    <!-- "And N more" footer -->
                    {#if hasMore}
                        <li
                            class="px-3 py-2 text-[10px] text-gray-500 text-center bg-gray-800/80 border-t border-gray-700/50"
                        >
                            +{app.matchCount - MAX_SUGGESTIONS} more — refine your
                            query to narrow results
                        </li>
                    {/if}
                {/if}
            </ul>
        {/if}
    </div>

    <!-- Dev: Generate mock data -->
    {#if import.meta.env.DEV}
        <button
            onclick={() => (showDevModal = true)}
            class="flex items-center gap-1.5 rounded-lg bg-yellow-600/15 border border-yellow-600/40 px-3 py-1.5 text-xs text-yellow-400 hover:bg-yellow-600/25 hover:border-yellow-500/60 hover:text-yellow-300 transition-colors"
            aria-label="Generate mock MBSE data (dev only)"
            title="Generate mock MBSE data (dev only)"
        >
            <FlaskConical class="h-3.5 w-3.5" />
            <span class="hidden sm:inline">Generate</span>
        </button>
    {/if}

    <!-- Theme selector -->
    <ThemeSelector />

    <!-- Layout switcher -->
    <div class="relative">
        <button
            onclick={() => (layoutDropdownOpen = !layoutDropdownOpen)}
            onblur={() => setTimeout(() => (layoutDropdownOpen = false), 150)}
            class="flex items-center gap-1.5 rounded-lg bg-gray-800 border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-gray-700 hover:border-gray-600 transition-colors"
            aria-label="Change graph layout"
            title="Change graph layout"
        >
            {#if currentLayout.icon === GitBranch}
                <GitBranch class="h-3.5 w-3.5" />
            {:else if currentLayout.icon === ArrowDown}
                <ArrowDown class="h-3.5 w-3.5" />
            {:else if currentLayout.icon === Workflow}
                <Workflow class="h-3.5 w-3.5" />
            {:else if currentLayout.icon === CircleDot}
                <CircleDot class="h-3.5 w-3.5" />
            {/if}
            <span class="hidden sm:inline">{currentLayout.label}</span>
            <ChevronDown class="h-3 w-3" />
        </button>

        {#if layoutDropdownOpen}
            <div
                class="absolute top-full right-0 mt-1 z-50 min-w-45 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden"
            >
                {#each layoutOptions as option}
                    <button
                        onmousedown={(e) => e.preventDefault()}
                        onclick={() => {
                            app.graphLayout = option.id;
                            layoutDropdownOpen = false;
                        }}
                        class={[
                            "w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors border-b border-gray-700/50 last:border-b-0",
                            app.graphLayout === option.id
                                ? "bg-blue-700/30 text-blue-200"
                                : "text-gray-300 hover:bg-gray-700/60 hover:text-white",
                        ].join(" ")}
                    >
                        {#if option.icon === GitBranch}
                            <GitBranch class="h-4 w-4 shrink-0" />
                        {:else if option.icon === ArrowDown}
                            <ArrowDown class="h-4 w-4 shrink-0" />
                        {:else if option.icon === Workflow}
                            <Workflow class="h-4 w-4 shrink-0" />
                        {:else if option.icon === CircleDot}
                            <CircleDot class="h-4 w-4 shrink-0" />
                        {/if}
                        <div class="flex-1 min-w-0">
                            <div class="text-xs font-medium">
                                {option.label}
                            </div>
                            <div class="text-[10px] text-gray-500">
                                {option.description}
                            </div>
                        </div>
                        {#if app.graphLayout === option.id}
                            <div
                                class="h-1.5 w-1.5 rounded-full bg-blue-400"
                            ></div>
                        {/if}
                    </button>
                {/each}
            </div>
        {/if}
    </div>

    <!-- Reset view -->
    <button
        onclick={onreset}
        class="flex items-center gap-1.5 rounded-lg bg-gray-800 border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-gray-700 hover:border-gray-600 transition-colors"
        aria-label="Reset graph view"
        title="Reset graph view"
    >
        <RotateCcw class="h-3.5 w-3.5" />
        <span class="hidden sm:inline">Reset</span>
    </button>

    <!-- Open new file -->
    <button
        onclick={onnewfile}
        class="flex items-center gap-1.5 rounded-lg bg-blue-700 border border-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-600 transition-colors"
        aria-label="Load a new MBSE file"
        title="Load a new file"
    >
        <FolderOpen class="h-3.5 w-3.5" />
        <span class="hidden sm:inline">Open</span>
    </button>
</header>
