<script lang="ts">
    import { Upload, FileJson, AlertCircle, FlaskConical } from "lucide-svelte";
    import { parseMBSEFile } from "$lib/utils/graphTransform";
    import DevGenerateModal from "$lib/components/DevGenerateModal.svelte";

    interface Props {
        onfileloaded: (raw: unknown, name: string) => void;
    }
    let { onfileloaded }: Props = $props();

    let isDragging = $state(false);
    let error = $state<string | null>(null);
    let inputEl: HTMLInputElement;
    let showDevModal = $state(false);

    function processFile(file: File) {
        error = null;
        if (!file.name.endsWith(".json")) {
            error = "Please provide a .json file.";
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const raw = JSON.parse(e.target?.result as string);
                parseMBSEFile(raw); // validates shape; throws on error
                onfileloaded(raw, file.name);
            } catch (err) {
                error =
                    err instanceof Error ? err.message : "Invalid JSON file.";
            }
        };
        reader.onerror = () => {
            error = "Could not read the file.";
        };
        reader.readAsText(file);
    }

    function onDragOver(e: DragEvent) {
        e.preventDefault();
        isDragging = true;
    }
    function onDragLeave(e: DragEvent) {
        e.preventDefault();
        isDragging = false;
    }
    function onDrop(e: DragEvent) {
        e.preventDefault();
        isDragging = false;
        const file = e.dataTransfer?.files[0];
        if (file) processFile(file);
    }
    function onInputChange(e: Event) {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) processFile(file);
        (e.target as HTMLInputElement).value = "";
    }
    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Enter" || e.key === " ") inputEl?.click();
    }
</script>

<div
    class="flex flex-col items-center justify-center h-full w-full p-8 bg-gray-950"
>
    <!-- Title -->
    <div class="mb-8 text-center">
        <h1 class="text-3xl font-bold text-white tracking-tight">
            MBSE Explorer
        </h1>
        <p class="mt-2 text-gray-400 text-sm">
            Visualise and explore a Model-Based Systems Engineering file as an
            interactive network graph.
        </p>
    </div>

    <!-- Drop zone -->
    <div
        class={[
            "relative flex flex-col items-center justify-center gap-4",
            "w-full max-w-lg rounded-2xl border-2 border-dashed p-12 cursor-pointer",
            "transition-all duration-200",
            isDragging
                ? "border-blue-400 bg-blue-950/40 scale-[1.02]"
                : "border-gray-700 bg-gray-900 hover:border-gray-500 hover:bg-gray-800/60",
        ].join(" ")}
        role="button"
        tabindex="0"
        aria-label="Load MBSE JSON file"
        ondragover={onDragOver}
        ondragleave={onDragLeave}
        ondrop={onDrop}
        onclick={() => inputEl?.click()}
        onkeydown={onKeyDown}
    >
        <input
            bind:this={inputEl}
            type="file"
            accept=".json,application/json"
            class="sr-only"
            onchange={onInputChange}
        />

        <!-- Icon -->
        <div
            class={[
                "rounded-full p-4 transition-colors duration-200",
                isDragging ? "bg-blue-500/20" : "bg-gray-800",
            ].join(" ")}
        >
            {#if isDragging}
                <FileJson class="h-10 w-10 text-blue-400" />
            {:else}
                <Upload class="h-10 w-10 text-gray-400" />
            {/if}
        </div>

        <!-- Text -->
        {#if isDragging}
            <p class="text-blue-300 font-medium text-lg">Drop your file here</p>
        {:else}
            <p class="text-gray-200 font-medium text-base">
                Drop your MBSE JSON file here
            </p>
            <p class="text-gray-500 text-sm">
                or <span class="text-blue-400 underline underline-offset-2"
                    >click to browse</span
                >
            </p>
        {/if}

        <!-- Schema hint -->
        <div
            class="mt-2 rounded-lg bg-gray-800/80 px-4 py-3 text-xs text-gray-400 font-mono w-full max-w-xs text-center"
        >
            <span class="text-gray-500">&#123; </span>
            <span class="text-blue-300">entities</span>
            <span class="text-gray-500">: […], </span>
            <span class="text-green-300">relationships</span>
            <span class="text-gray-500">: […] &#125;</span>
        </div>
    </div>
    <!-- Dev: Generate mock data -->
    <div
        class="relative flex flex-col items-center justify-center gap-4 w-full max-w-lg p-12 cursor-pointer transition-all duration-200"
    >
        <button
            onclick={() => (showDevModal = true)}
            class="flex items-center gap-1.5 rounded-lg bg-yellow-600/15 border border-yellow-600/40 px-3 py-1.5 text-xs text-yellow-400 hover:bg-yellow-600/25 hover:border-yellow-500/60 hover:text-yellow-300 transition-colors"
            aria-label="Generate mock MBSE data (dev only)"
            title="Generate mock MBSE data (dev only)"
        >
            <FlaskConical class="h-3.5 w-3.5" />
            <span class="hidden sm:inline">Generate</span>
        </button>

        {#if showDevModal}
            <DevGenerateModal
                onclose={() => {
                    showDevModal = false;
                }}
            />
        {/if}
    </div>
    <!-- Error -->
    {#if error}
        <div
            class="mt-4 flex items-start gap-2 rounded-lg bg-red-950/60 border border-red-800 px-4 py-3 text-sm text-red-300 max-w-lg w-full"
            role="alert"
        >
            <AlertCircle class="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
        </div>
    {/if}
</div>
