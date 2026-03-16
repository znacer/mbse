<script lang="ts">
    // ─── NodeDetailSlider ───────────────────────────────────────────────────────
    //
    // Slide-over panel that animates in from the right when a node or link is
    // selected.  Displays all metadata plus the UAF stereotype definition.
    // Uses Svelte 5 snippets for the repeated Field and TypeBadge patterns.

    import {
        X,
        Tag,
        Hash,
        FileText,
        ArrowRight,
        Link2,
        Layers,
    } from "lucide-svelte";
    import { app } from "$lib/state/app.svelte";

    const item = $derived(app.selectedItem);
    const isOpen = $derived(item !== null);
    const uafDefs = $derived(app.uafDefinitions);

    // Close handlers
    function close() {
        app.selectedItem = null;
    }

    $effect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") close();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });
</script>

{#snippet field(label: string, value: string, mono = false)}
    <div class="flex flex-col gap-1">
        <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {label}
        </p>
        {#if value}
            <p
                class={mono
                    ? "font-mono text-xs text-gray-400 bg-gray-800 rounded px-2 py-1.5 break-all"
                    : "text-sm text-gray-200 leading-relaxed wrap-break-words"}
            >
                {value}
            </p>
        {:else}
            <p class="text-sm text-gray-600 italic">—</p>
        {/if}
    </div>
{/snippet}

<!-- Backdrop (mobile) -->
<div
    class={[
        "fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity duration-300",
        "sm:pointer-events-none sm:bg-transparent sm:backdrop-blur-none",
        isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
    ].join(" ")}
    aria-hidden="true"
    onclick={close}
></div>

<!-- Panel -->
<aside
    class={[
        "fixed top-0 right-0 z-40 h-full w-full max-w-sm",
        "bg-gray-900 border-l border-gray-800 shadow-2xl",
        "flex flex-col outline-none",
        "transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "translate-x-full",
    ].join(" ")}
    tabindex="-1"
    aria-label="Element details"
>
    <!-- Header -->
    <div
        class="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0"
    >
        <div class="flex items-center gap-2 min-w-0">
            {#if item?.kind === "link"}
                <Link2 class="h-4 w-4 text-gray-400 shrink-0" />
            {:else}
                {@const color =
                    item?.kind === "node"
                        ? (uafDefs.get(item.data.type)?.color ?? "#94A3B8")
                        : "#94A3B8"}
                <span
                    class="inline-block h-3 w-3 rounded-full shrink-0"
                    style="background:{color}"
                ></span>
            {/if}
            <h2 class="text-sm font-semibold text-white truncate">
                {#if item?.kind === "node"}
                    {item.data.name || "Unnamed Node"}
                {:else if item?.kind === "link"}
                    {item.data.name || "Unnamed Relationship"}
                {:else}
                    Details
                {/if}
            </h2>
        </div>
        <button
            onclick={close}
            class="rounded-lg p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 transition-colors shrink-0"
            aria-label="Close detail panel"
        >
            <X class="h-4 w-4" />
        </button>
    </div>

    <!-- Body -->
    <div class="flex-1 overflow-y-auto px-5 py-5 space-y-6">
        {#if !item}
            <p class="text-sm text-gray-600 italic">Nothing selected.</p>
        {:else if item.kind === "node"}
            {@const uafType = uafDefs.get(item.data.type)}
            {@const color = uafType?.color ?? "#94A3B8"}
            {@const domain = uafType?.domain ?? ""}

            <!-- Kind pill -->
            <span
                class="inline-flex items-center rounded-full bg-blue-950/60 border border-blue-800 px-2.5 py-0.5 text-xs text-blue-300 font-medium"
            >
                Node
            </span>

            <!-- Type badge -->
            {#if item.data.type}
                <div class="flex flex-col gap-1.5">
                    <div
                        class="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide"
                    >
                        <Tag class="h-3 w-3" />
                        <span>Type</span>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <span
                            class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                            style="background:{color}22;color:{color};border:1px solid {color}55"
                        >
                            <span
                                class="inline-block h-2 w-2 rounded-full"
                                style="background:{color}"
                            ></span>
                            {item.data.type}
                        </span>
                        {#if domain}
                            <span
                                class="inline-flex items-center gap-1 rounded-full bg-gray-800 px-2.5 py-1 text-xs text-gray-400 border border-gray-700"
                            >
                                <Layers class="h-3 w-3" />{domain}
                            </span>
                        {/if}
                    </div>
                </div>
            {/if}

            <!-- UAF definition -->
            {#if uafType?.description}
                <div
                    class="rounded-lg bg-gray-800/60 border border-gray-700/60 px-3 py-3"
                >
                    <p
                        class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5"
                    >
                        UAF Definition
                    </p>
                    <p class="text-xs text-gray-400 leading-relaxed">
                        {uafType.description}
                    </p>
                </div>
            {/if}

            <!-- Unknown type warning -->
            {#if item.data.type && !uafType}
                <div
                    class="rounded-lg bg-yellow-950/40 border border-yellow-800/50 px-3 py-2"
                >
                    <p class="text-xs text-yellow-400">
                        Type "{item.data.type}" is not defined in the loaded UAF
                        profile.
                    </p>
                </div>
            {/if}

            <div class="border-t border-gray-800"></div>
            {@render field("Name", item.data.name)}
            {@render field("Description", item.data.description)}
            {@render field("UUID", item.data.id, true)}
            {#if uafType?.packageName}
                {@render field("Package", uafType.packageName)}
            {/if}
        {:else if item.kind === "link"}
            {@const src =
                typeof item.data.source === "object" ? item.data.source : null}
            {@const tgt =
                typeof item.data.target === "object" ? item.data.target : null}
            {@const srcName =
                src?.name ??
                (typeof item.data.source === "string" ? item.data.source : "")}
            {@const tgtName =
                tgt?.name ??
                (typeof item.data.target === "string" ? item.data.target : "")}

            <!-- Kind pill -->
            <span
                class="inline-flex items-center rounded-full bg-emerald-950/60 border border-emerald-800 px-2.5 py-0.5 text-xs text-emerald-300 font-medium"
            >
                Relationship
            </span>

            <!-- Source → Target -->
            <div class="flex flex-col gap-1.5">
                <div
                    class="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide"
                >
                    <ArrowRight class="h-3 w-3" /><span>Connection</span>
                </div>
                <div
                    class="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2.5 text-sm"
                >
                    <span
                        class="text-gray-200 truncate max-w-[100px]"
                        title={srcName}>{srcName || "—"}</span
                    >
                    <ArrowRight class="h-3.5 w-3.5 text-gray-500 shrink-0" />
                    <span
                        class="text-gray-200 truncate max-w-[100px]"
                        title={tgtName}>{tgtName || "—"}</span
                    >
                </div>
            </div>

            <div class="border-t border-gray-800"></div>
            {@render field("Name", item.data.name)}
            {@render field("Description", item.data.description)}
            {@render field("UUID", item.data.id, true)}
        {/if}
    </div>
</aside>
