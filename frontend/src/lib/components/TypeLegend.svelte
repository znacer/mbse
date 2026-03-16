<script lang="ts">
    // ─── TypeLegend ─────────────────────────────────────────────────────────────
    //
    // Bottom-left panel that shows UAF domains and their sub-packages.
    // Each row is clickable to toggle a domain/sub-package filter on the graph.
    // Filter keys stored in app.domainFilter:
    //   • "Domain"           → all nodes in that domain
    //   • "Domain::Package"  → only nodes in that sub-package

    import {
        ChevronDown,
        ChevronRight,
        Layers,
        X,
        Funnel,
    } from "lucide-svelte";
    import { app } from "$lib/state/app.svelte";

    const entries = $derived(app.domainLegend);
    const activeDomain = $derived(app.activeDomain);

    // Which domain rows are expanded (local UI state only) — all open by default
    let expanded = $state(new Set<string>());
    let expandedInitialized = false;

    $effect(() => {
        if (!expandedInitialized && entries.length > 0) {
            expanded = new Set(entries.map((e) => e.domain));
            expandedInitialized = true;
        }
    });

    function toggleExpand(domain: string) {
        const next = new Set(expanded);
        if (next.has(domain)) {
            next.delete(domain);
        } else {
            next.add(domain);
        }
        expanded = next;
    }

    // ── Filter helpers ────────────────────────────────────────────────────────

    function domainKey(domain: string) {
        return domain;
    }

    function pkgKey(domain: string, pkg: string) {
        return `${domain}::${pkg}`;
    }

    function isDomainActive(domain: string) {
        return app.domainFilter.has(domainKey(domain));
    }

    function isPkgActive(domain: string, pkg: string) {
        return app.domainFilter.has(pkgKey(domain, pkg));
    }

    function toggleDomain(domain: string) {
        app.toggleDomainFilter(domainKey(domain));
    }

    function togglePkg(domain: string, pkg: string) {
        app.toggleDomainFilter(pkgKey(domain, pkg));
    }

    // Panel collapse
    let panelCollapsed = $state(false);
</script>

{#if entries.length > 0}
    <div
        class="w-60 rounded-xl bg-gray-900/95 border border-gray-800 shadow-xl backdrop-blur-sm overflow-hidden"
    >
        <!-- ── Header ───────────────────────────────────────────────────────── -->
        <div
            class="flex items-center justify-between px-3 py-2.5 border-b border-gray-800/80"
        >
            <button
                class="flex items-center gap-1.5 text-xs font-semibold text-gray-300 hover:text-white transition-colors"
                onclick={() => (panelCollapsed = !panelCollapsed)}
                aria-expanded={!panelCollapsed}
                aria-label="Toggle domain filter panel"
            >
                <Layers class="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span>UAF Domains</span>
                {#if app.isFiltered}
                    <span
                        class="inline-flex items-center gap-1 rounded-full bg-blue-600/30 border border-blue-600/50 px-1.5 py-0.5 text-[10px] text-blue-300 font-medium"
                    >
                        <Funnel class="h-2.5 w-2.5" />
                        {app.domainFilter.size}
                    </span>
                {/if}
            </button>

            <div class="flex items-center gap-1">
                <!-- Clear filters -->
                {#if app.isFiltered}
                    <button
                        onclick={() => app.clearDomainFilter()}
                        class="rounded px-1.5 py-0.5 text-[10px] text-gray-500 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                        title="Clear all filters"
                        aria-label="Clear all domain filters"
                    >
                        Clear
                    </button>
                {/if}
                <!-- Panel collapse chevron -->
                <button
                    onclick={() => (panelCollapsed = !panelCollapsed)}
                    class="text-gray-600 hover:text-gray-400 transition-colors p-0.5"
                    aria-label={panelCollapsed
                        ? "Expand panel"
                        : "Collapse panel"}
                >
                    <ChevronDown
                        class={[
                            "h-3.5 w-3.5 transition-transform duration-200",
                            panelCollapsed ? "-rotate-90" : "",
                        ].join(" ")}
                    />
                </button>
            </div>
        </div>

        <!-- ── Domain list ──────────────────────────────────────────────────── -->
        {#if !panelCollapsed}
            <ul class="py-1.5 max-h-80 overflow-y-auto">
                {#each entries as entry}
                    {@const domainActive = isDomainActive(entry.domain)}
                    {@const isExpanded = expanded.has(entry.domain)}
                    {@const isCurrentDomain = activeDomain === entry.domain}
                    {@const hasSubs = entry.subpackages.length > 0}

                    <!-- Domain row -->
                    <li>
                        <div
                            class={[
                                "flex items-center gap-1 pr-2 rounded-md mx-1.5 transition-colors group",
                                domainActive
                                    ? "bg-white/8"
                                    : isCurrentDomain
                                      ? "bg-white/5"
                                      : "hover:bg-gray-800/60",
                            ].join(" ")}
                        >
                            <!-- Expand/collapse chevron -->
                            <button
                                onclick={() => toggleExpand(entry.domain)}
                                class="shrink-0 p-1.5 text-gray-600 hover:text-gray-400 transition-colors"
                                aria-label={isExpanded
                                    ? `Collapse ${entry.domain}`
                                    : `Expand ${entry.domain}`}
                                aria-expanded={isExpanded}
                            >
                                {#if hasSubs}
                                    <ChevronRight
                                        class={[
                                            "h-3 w-3 transition-transform duration-150",
                                            isExpanded ? "rotate-90" : "",
                                        ].join(" ")}
                                    />
                                {:else}
                                    <span class="h-3 w-3 block"></span>
                                {/if}
                            </button>

                            <!-- Colour dot + label — click to toggle domain filter -->
                            <button
                                onclick={() => toggleDomain(entry.domain)}
                                class={[
                                    "flex flex-1 items-center gap-2 py-1.5 text-left min-w-0",
                                    "text-xs transition-colors",
                                    domainActive
                                        ? "text-white font-medium"
                                        : isCurrentDomain
                                          ? "text-gray-200"
                                          : "text-gray-400 hover:text-gray-200",
                                ].join(" ")}
                                title="Filter by {entry.domain}"
                                aria-pressed={domainActive}
                            >
                                <span
                                    class={[
                                        "inline-block h-2.5 w-2.5 rounded-full shrink-0 transition-all",
                                        domainActive
                                            ? "ring-2 ring-white/30 ring-offset-1 ring-offset-gray-900"
                                            : "ring-1 ring-white/10",
                                    ].join(" ")}
                                    style="background:{entry.color}"
                                    aria-hidden="true"
                                ></span>
                                <span class="truncate">{entry.domain}</span>
                            </button>

                            <!-- Active checkmark -->
                            {#if domainActive}
                                <span
                                    class="shrink-0 text-blue-400 pl-1"
                                    aria-hidden="true"
                                >
                                    <svg
                                        class="h-3 w-3"
                                        viewBox="0 0 12 12"
                                        fill="currentColor"
                                    >
                                        <path
                                            d="M10 3L5 8.5 2 5.5"
                                            stroke="currentColor"
                                            stroke-width="1.8"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            fill="none"
                                        />
                                    </svg>
                                </span>
                            {/if}
                        </div>

                        <!-- Sub-package rows -->
                        {#if isExpanded && hasSubs}
                            <ul class="pb-1">
                                {#each entry.subpackages as sub}
                                    {@const subActive = isPkgActive(
                                        entry.domain,
                                        sub.name,
                                    )}
                                    <li>
                                        <button
                                            onclick={() =>
                                                togglePkg(
                                                    entry.domain,
                                                    sub.name,
                                                )}
                                            class={[
                                                "flex w-full items-center gap-2 pl-9 pr-3 py-1 text-left",
                                                "text-xs rounded-md mx-1.5 transition-colors",
                                                "w-[calc(100%-0.75rem)]",
                                                subActive
                                                    ? "text-white bg-white/5 font-medium"
                                                    : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/40",
                                            ].join(" ")}
                                            title="{entry.domain} › {sub.name} ({sub
                                                .stereotypeNames.length} types)"
                                            aria-pressed={subActive}
                                        >
                                            <!-- Small square indicator -->
                                            <span
                                                class={[
                                                    "inline-block h-1.5 w-1.5 rounded-sm shrink-0",
                                                    subActive
                                                        ? "ring-1 ring-white/20"
                                                        : "opacity-60",
                                                ].join(" ")}
                                                style="background:{entry.color}"
                                                aria-hidden="true"
                                            ></span>

                                            <span class="truncate flex-1"
                                                >{sub.name}</span
                                            >

                                            <!-- Type count badge -->
                                            <span
                                                class={[
                                                    "shrink-0 text-[10px] tabular-nums px-1 rounded",
                                                    subActive
                                                        ? "text-blue-300 bg-blue-900/40"
                                                        : "text-gray-600",
                                                ].join(" ")}
                                                title={sub.stereotypeNames.join(
                                                    ", ",
                                                )}
                                            >
                                                {sub.stereotypeNames.length}
                                            </span>

                                            {#if subActive}
                                                <span
                                                    class="shrink-0 text-blue-400"
                                                    aria-hidden="true"
                                                >
                                                    <svg
                                                        class="h-3 w-3"
                                                        viewBox="0 0 12 12"
                                                        fill="currentColor"
                                                    >
                                                        <path
                                                            d="M10 3L5 8.5 2 5.5"
                                                            stroke="currentColor"
                                                            stroke-width="1.8"
                                                            stroke-linecap="round"
                                                            stroke-linejoin="round"
                                                            fill="none"
                                                        />
                                                    </svg>
                                                </span>
                                            {/if}
                                        </button>
                                    </li>
                                {/each}
                            </ul>
                        {/if}
                    </li>
                {/each}
            </ul>
        {/if}
    </div>
{/if}
