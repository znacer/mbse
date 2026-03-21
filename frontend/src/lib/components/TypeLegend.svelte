<script lang="ts">
    import { Button } from "$lib/components/ui/button/index.js";
    import { appState } from "$lib/state/app.svelte.js";
    import { getDomainColor } from "$lib/utils/uafParser.js";
    import { ChevronDown, ChevronUp, Check } from "lucide-svelte";

    const domains = [
        "Operational",
        "Services",
        "Resources",
        "Strategic",
        "Personnel",
        "Security",
        "Projects",
        "Architecture Management",
        "Standards",
        "Actual Resources",
        "Summary and Overview",
        "Parameters",
    ];

    function handleDomainClick(domain: string): void {
        appState.toggleDomain(domain);
    }
</script>

<div class="fixed bottom-4 left-4 z-40">
    <div class="bg-muted/95 border border-secondary rounded shadow-lg">
        <Button
            variant="ghost"
            class="w-full justify-between px-3 py-2 text-primary hover:text-primary/80 hover:bg-primary/10"
            onclick={() => appState.toggleLegend()}
        >
            <span class="text-xs font-medium font-mono"
                >DOMAIN CLASSIFICATION</span
            >
            {#if appState.isLegendCollapsed}
                <ChevronUp class="size-4" />
            {:else}
                <ChevronDown class="size-4" />
            {/if}
        </Button>

        {#if !appState.isLegendCollapsed}
            <div class="px-3 pb-3 space-y-1">
                {#each domains as domain (domain)}
                    <button
                        class="flex items-center gap-2 w-full text-left hover:bg-primary/10 rounded px-1 py-0.5 transition-colors {appState.selectedDomains.has(
                            domain,
                        )
                            ? 'bg-primary/5'
                            : ''}"
                        onclick={() => handleDomainClick(domain)}
                    >
                        <div
                            class="w-4 h-3 rounded-sm shrink-0 border flex items-center justify-center"
                            style="background-color: {appState.selectedDomains.has(
                                domain,
                            )
                                ? getDomainColor(domain, appState.uafData)
                                : getDomainColor(domain, appState.uafData) +
                                  '33'}; border-color: {getDomainColor(
                                domain,
                                appState.uafData,
                            )}"
                        >
                            {#if appState.selectedDomains.has(domain)}
                                <Check class="size-2" />
                            {/if}
                        </div>
                        <span class="text-xs text font-mono">{domain}</span>
                    </button>
                {/each}
            </div>
        {/if}
    </div>
</div>
