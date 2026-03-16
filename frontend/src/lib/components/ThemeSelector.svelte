<script lang="ts">
    // ─── ThemeSelector ───────────────────────────────────────────────────────────
    //
    // A palette-icon button in the toolbar that opens a compact popover listing
    // all available themes.  Each row shows three colour swatches and the theme
    // name; the active theme is check-marked.  Clicking a row immediately applies
    // the theme via app.setTheme() which writes CSS variables onto <html> and
    // persists the choice to localStorage.

    import { Palette, Check } from "lucide-svelte";
    import { app } from "$lib/state/app.svelte";
    import { THEMES } from "$lib/themes";

    let open = $state(false);
    let buttonEl: HTMLButtonElement;
    let menuEl: HTMLDivElement;

    function toggle() {
        open = !open;
    }

    function close() {
        open = false;
    }

    function select(id: string) {
        app.setTheme(id);
        close();
    }

    function onButtonKeyDown(e: KeyboardEvent) {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            open = true;
            // Focus first item after tick
            setTimeout(() => {
                menuEl
                    ?.querySelector<HTMLButtonElement>("[role='menuitem']")
                    ?.focus();
            }, 0);
        }
        if (e.key === "Escape") close();
    }

    function onMenuKeyDown(e: KeyboardEvent) {
        const items = Array.from(
            menuEl?.querySelectorAll<HTMLButtonElement>("[role='menuitem']") ??
                [],
        );
        const idx = items.indexOf(document.activeElement as HTMLButtonElement);

        if (e.key === "ArrowDown") {
            e.preventDefault();
            items[(idx + 1) % items.length]?.focus();
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            items[(idx - 1 + items.length) % items.length]?.focus();
        } else if (e.key === "Escape") {
            close();
            buttonEl?.focus();
        } else if (e.key === "Tab") {
            close();
        }
    }

    // Close when clicking outside
    function onWindowPointerDown(e: PointerEvent) {
        if (!open) return;
        const target = e.target as Node;
        if (!buttonEl?.contains(target) && !menuEl?.contains(target)) {
            close();
        }
    }
</script>

<svelte:window
    onpointerdown={onWindowPointerDown}
    onkeydown={(e) => {
        if (e.key === "Escape" && open) close();
    }}
/>

<div class="relative">
    <!-- Trigger button -->
    <button
        bind:this={buttonEl}
        onclick={toggle}
        onkeydown={onButtonKeyDown}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Select colour theme"
        title="Select theme"
        class={[
            "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors",
            open
                ? "border-gray-600 bg-gray-800 text-white"
                : "border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600 hover:text-white",
        ].join(" ")}
    >
        <Palette class="h-3.5 w-3.5" />
        <span class="hidden sm:inline capitalize">{app.theme.name}</span>
    </button>

    <!-- Popover menu -->
    {#if open}
        <div
            bind:this={menuEl}
            role="menu"
            aria-label="Theme options"
            onkeydown={onMenuKeyDown}
            class="absolute right-0 top-full mt-1.5 z-50 w-48 rounded-xl border border-gray-700 bg-gray-900 shadow-2xl shadow-black/60 overflow-hidden py-1"
        >
            <!-- Header -->
            <p
                class="px-3 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-600"
            >
                Theme
            </p>

            {#each THEMES as theme}
                {@const isActive = app.theme.id === theme.id}
                <button
                    role="menuitem"
                    onclick={() => select(theme.id)}
                    class={[
                        "flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors",
                        isActive
                            ? "bg-gray-800 text-white"
                            : "text-gray-400 hover:bg-gray-800/60 hover:text-gray-200",
                    ].join(" ")}
                    aria-current={isActive ? "true" : undefined}
                >
                    <!-- Colour swatches -->
                    <span
                        class="flex shrink-0 items-center gap-0.5"
                        aria-hidden="true"
                    >
                        {#each theme.swatches as swatch, i}
                            <span
                                class={[
                                    "inline-block rounded-full border",
                                    i === 0
                                        ? "h-3.5 w-3.5"
                                        : i === 1
                                          ? "h-2.5 w-2.5"
                                          : "h-2 w-2",
                                    isActive
                                        ? "border-white/20"
                                        : "border-white/10",
                                ].join(" ")}
                                style="background:{swatch}"
                            ></span>
                        {/each}
                    </span>

                    <!-- Name -->
                    <span class="flex-1 font-medium">{theme.name}</span>

                    <!-- Active checkmark -->
                    {#if isActive}
                        <Check
                            class="h-3.5 w-3.5 shrink-0 text-blue-400"
                            aria-label="Active theme"
                        />
                    {/if}
                </button>
            {/each}
        </div>
    {/if}
</div>
