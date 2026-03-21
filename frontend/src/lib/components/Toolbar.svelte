<script lang="ts">
    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Separator } from "$lib/components/ui/separator/index.js";
    import { appState } from "$lib/state/app.svelte.js";
    import {
        Search,
        ZoomIn,
        ZoomOut,
        Maximize2,
        Save,
        Download,
        Upload,
        Home,
        FolderOpen,
        GitBranch,
        ArrowDown,
        ArrowRight,
        RotateCcw,
    } from "lucide-svelte";
    import FileLoader from "./FileLoader.svelte";
    import type { GraphNode } from "$lib/types/mbse.js";

    interface Props {
        onReset?: () => void;
    }

    let { onReset }: Props = $props();

    let showFileLoader = $state(false);
    let localSearchQuery = $state("");
    let showSuggestions = $state(false);
    let showLayoutMenu = $state(false);
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const layoutOptions = [
        { mode: "force" as const, label: "Force" },
        { mode: "hierarchical-td" as const, label: "Top-Down" },
        { mode: "hierarchical-lr" as const, label: "Left-Right" },
    ];

    function handleSearchInput(e: Event): void {
        const target = e.target as HTMLInputElement;
        localSearchQuery = target.value;
        showSuggestions = target.value.trim().length > 0;

        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            appState.searchQuery = target.value;
        }, 300);
    }

    function handleSearchKeydown(e: KeyboardEvent): void {
        if (e.key === "Escape") {
            appState.clearSearch();
            localSearchQuery = "";
            showSuggestions = false;
        }
    }

    function selectSuggestion(node: GraphNode): void {
        localSearchQuery = node.name;
        appState.searchQuery = node.name;
        appState.selectNode(node);
        showSuggestions = false;
    }

    function handleBlur(): void {
        setTimeout(() => {
            showSuggestions = false;
        }, 200);
    }

    function handleFocus(): void {
        if (localSearchQuery.trim().length > 0) {
            showSuggestions = true;
        }
    }

    function setLayoutMode(
        mode: "force" | "hierarchical-td" | "hierarchical-lr",
    ): void {
        appState.layoutMode = mode;
        showLayoutMenu = false;
    }

    function handleReset(): void {
        appState.clearAllFilters();
        appState.clearSelection();
        localSearchQuery = "";
        showSuggestions = false;
        onReset?.();
    }

    function goToHome(): void {
        window.location.href = "/";
    }

    function goToProjects(): void {
        window.location.href = "/projects";
    }

    function handleSave(): void {
        if (appState.currentProject) {
            appState.updateCurrentProject({
                entities: appState.graphNodes.map((n) => ({
                    name: n.name,
                    uuid: n.id,
                    description: n.description,
                    type: n.type,
                })),
                relationships: appState.graphLinks.map((l) => ({
                    name: l.name,
                    uuid: l.id,
                    description: l.description,
                    source:
                        typeof l.source === "string" ? l.source : l.source.id,
                    target:
                        typeof l.target === "string" ? l.target : l.target.id,
                })),
            });
        }
    }

    function handleExport(): void {
        const data = {
            entities: appState.graphNodes.map((n) => ({
                name: n.name,
                uuid: n.id,
                description: n.description,
                type: n.type,
            })),
            relationships: appState.graphLinks.map((l) => ({
                name: l.name,
                uuid: l.id,
                description: l.description,
                source: typeof l.source === "string" ? l.source : l.source.id,
                target: typeof l.target === "string" ? l.target : l.target.id,
            })),
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${appState.currentProject?.name || "mbse-export"}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    const nodeCount = $derived(appState.graphNodes.length);
    const linkCount = $derived(appState.graphLinks.length);
</script>

<header
    class="flex items-center justify-between px-4 py-2 border-b border-[#1a2530] bg-[#0d1318]"
>
    <div class="flex items-center gap-4">
        <Button
            variant="ghost"
            size="icon"
            onclick={goToHome}
            aria-label="Home"
            class="text-[#00ff88] hover:text-[#00ff88] hover:bg-[#00ff88]/10"
        >
            <Home class="size-4" />
        </Button>
        <Button
            variant="ghost"
            size="icon"
            onclick={goToProjects}
            aria-label="Projects"
            class="text-[#00ff88] hover:text-[#00ff88] hover:bg-[#00ff88]/10"
        >
            <FolderOpen class="size-4" />
        </Button>

        <Separator orientation="vertical" class="h-6 bg-[#1a2530]" />

        {#if appState.currentProject}
            <span class="text-sm font-medium text-[#e0e0e0] font-mono"
                >{appState.currentProject.name}</span
            >
        {:else}
            <span class="text-sm text-[#4a5568] font-mono">NO PROJECT</span>
        {/if}
    </div>

    <div class="flex items-center gap-2">
        <div class="relative">
            <Search
                class="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-[#00ff88]/50 z-10"
            />
            <Input
                type="search"
                placeholder="SEARCH NODES..."
                value={localSearchQuery}
                oninput={handleSearchInput}
                onkeydown={handleSearchKeydown}
                onblur={handleBlur}
                onfocus={handleFocus}
                class="w-64 pl-8 bg-[#0a0f14] border-[#1a2530] text-[#e0e0e0] placeholder:text-[#4a5568] font-mono text-xs focus:border-[#00ff88]/50"
            />
            {#if showSuggestions && appState.searchSuggestions.length > 0}
                <div
                    class="absolute top-full left-0 right-0 mt-1 bg-[#0a0f14] border border-[#1a2530] rounded-md shadow-lg z-20 max-h-60 overflow-auto"
                >
                    {#each appState.searchSuggestions as node (node.id)}
                        <button
                            type="button"
                            class="w-full px-3 py-2 text-left text-xs font-mono text-[#e0e0e0] hover:bg-[#00ff88]/10 hover:text-[#00ff88] transition-colors border-b border-[#1a2530] last:border-b-0"
                            onclick={() => selectSuggestion(node)}
                        >
                            <div class="font-medium">{node.name}</div>
                            <div class="text-[#4a5568] truncate">
                                {node.type}{node.description
                                    ? ` - ${node.description}`
                                    : ""}
                            </div>
                        </button>
                    {/each}
                </div>
            {/if}
        </div>

        <span class="text-xs text-[#00ff88]/70 font-mono">
            {nodeCount} NODES / {linkCount} LINKS
        </span>
    </div>

    <div class="flex items-center gap-2">
        <Button
            variant="outline"
            size="icon"
            onclick={handleReset}
            aria-label="Reset view"
            class="border-[#1a2530] text-[#00ff88] hover:text-[#00ff88] hover:bg-[#00ff88]/10 hover:border-[#00ff88]/30"
        >
            <RotateCcw class="size-4" />
        </Button>
        <div class="relative">
            <Button
                variant="outline"
                size="icon"
                onclick={() => (showLayoutMenu = !showLayoutMenu)}
                aria-label="Layout mode"
                class="border-[#1a2530] text-[#00ff88] hover:text-[#00ff88] hover:bg-[#00ff88]/10 hover:border-[#00ff88]/30"
            >
                <GitBranch class="size-4" />
            </Button>
            {#if showLayoutMenu}
                <div
                    class="absolute top-full right-0 mt-1 bg-[#0a0f14] border border-[#1a2530] rounded-md shadow-lg z-30 min-w-[140px]"
                >
                    {#each layoutOptions as option (option.mode)}
                        <button
                            type="button"
                            class="w-full px-3 py-2 text-left text-xs font-mono text-[#e0e0e0] hover:bg-[#00ff88]/10 hover:text-[#00ff88] transition-colors flex items-center gap-2 {appState.layoutMode ===
                            option.mode
                                ? 'text-[#00ff88] bg-[#00ff88]/5'
                                : ''}"
                            onclick={() => setLayoutMode(option.mode)}
                        >
                            {#if option.mode === "force"}
                                <GitBranch class="size-3" />
                            {:else if option.mode === "hierarchical-td"}
                                <ArrowDown class="size-3" />
                            {:else}
                                <ArrowRight class="size-3" />
                            {/if}
                            {option.label}
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
        <Button
            variant="outline"
            size="icon"
            onclick={() => (showFileLoader = true)}
            aria-label="Load file"
            class="border-[#1a2530] text-[#00ff88] hover:text-[#00ff88] hover:bg-[#00ff88]/10 hover:border-[#00ff88]/30"
        >
            <Upload class="size-4" />
        </Button>
        <Button
            variant="outline"
            size="icon"
            onclick={handleSave}
            aria-label="Save"
            disabled={!appState.currentProject}
            class="border-[#1a2530] text-[#00ff88] hover:text-[#00ff88] hover:bg-[#00ff88]/10 hover:border-[#00ff88]/30 disabled:opacity-30"
        >
            <Save class="size-4" />
        </Button>
        <Button
            variant="outline"
            size="icon"
            onclick={handleExport}
            aria-label="Export"
            disabled={!appState.currentProject}
            class="border-[#1a2530] text-[#00ff88] hover:text-[#00ff88] hover:bg-[#00ff88]/10 hover:border-[#00ff88]/30 disabled:opacity-30"
        >
            <Download class="size-4" />
        </Button>
    </div>
</header>

<FileLoader bind:open={showFileLoader} />
