<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { appState } from "$lib/state/app.svelte.js";
    import {
        validateMBSEData,
        createEmptyMBSEData,
    } from "$lib/utils/graphTransform.js";
    import type { MBSEData } from "$lib/types/mbse.js";
    import { Upload, FileBraces, X } from "lucide-svelte";

    interface FileLoaderProps {
        open: boolean;
    }

    // let { open = $bindable() }: FileLoaderProps = $props();

    let projectName = $state("");
    let projectDescription = $state("");
    let loadedData: MBSEData | null = $state(null);
    let fileName = $state("");
    let error = $state<string | null>(null);
    let fileInput: HTMLInputElement;

    function handleClose(): void {
        // open = false;
        resetForm();
    }

    function resetForm(): void {
        projectName = "";
        projectDescription = "";
        loadedData = null;
        fileName = "";
        error = null;
    }

    async function handleFileSelect(e: Event): Promise<void> {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;

        fileName = file.name;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (validateMBSEData(data)) {
                loadedData = data;
                error = null;
                projectName = file.name.replace(/\.json$/i, "");
            } else {
                error =
                    "Invalid MBSE file format. Please ensure the file contains valid entities and relationships.";
                loadedData = null;
            }
        } catch (e) {
            error =
                "Failed to parse JSON file. Please ensure the file is valid JSON.";
            loadedData = null;
        }
    }

    function handleDrop(e: DragEvent): void {
        e.preventDefault();
        const file = e.dataTransfer?.files[0];
        if (file) {
            const input = { target: { files: [file] } } as unknown as Event;
            handleFileSelect(input);
        }
    }

    function handleDragOver(e: DragEvent): void {
        e.preventDefault();
    }

    function handleLoad(): void {
        if (!loadedData) return;

        const project = appState.createProject(
            projectName || fileName.replace(/\.json$/i, ""),
            projectDescription,
        );
        appState.loadProject(project.id);
        appState.setGraphData(loadedData);

        handleClose();
    }

    function handleCreateNew(): void {
        const project = appState.createProject(
            projectName || "New Project",
            projectDescription,
        );
        appState.loadProject(project.id);
        appState.setGraphData(createEmptyMBSEData());

        handleClose();
    }
</script>

<Dialog.Root>
    <Dialog.Trigger>
        <Button variant="outline" size="icon" aria-label="Load file">
            <Upload class="size-4" />
        </Button>
    </Dialog.Trigger>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title class="text-primary font-mono text-sm"
                >LOAD DATA</Dialog.Title
            >
            <Dialog.Description>
                Import MBSE entities and relationships
            </Dialog.Description>
        </Dialog.Header>

        <div class="space-y-4">
            <button
                type="button"
                class="border-2 border-dashed border-primary rounded p-8 text-center cursor-pointer hover:border-primary/50 transition-colors w-full bg-primary]/50"
                ondrop={handleDrop}
                ondragover={handleDragOver}
                onclick={() => fileInput?.click()}
            >
                <Upload class="size-8 mx-auto mb-2 text-primary/50" />
                <p class="text-sm text-primary font-mono">
                    DROP ZONE - CLICK TO BROWSE
                </p>
                <input
                    type="file"
                    accept=".json"
                    bind:this={fileInput}
                    onchange={handleFileSelect}
                    class="hidden"
                />
            </button>

            {#if fileName}
                <div
                    class="flex items-center gap-2 p-2 bg-muted rounded border border-primary"
                >
                    <FileBraces class="size-4 text-primary" />
                    <span class="text-sm flex-1 truncate text-primary font-mono"
                        >{fileName}</span
                    >
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        onclick={() => {
                            fileName = "";
                            loadedData = null;
                        }}
                        class="text-primary hover:text-primary hover:bg-primary/10"
                    >
                        <X class="size-3" />
                    </Button>
                </div>
            {/if}

            {#if error}
                <p class="text-sm text-red-500 font-mono">{error}</p>
            {/if}

            {#if loadedData}
                <div class="space-y-2">
                    <label
                        for="project-name"
                        class="text-xs font-medium text-primary/70 font-mono uppercase"
                        >Project Name</label
                    >
                    <Input
                        id="project-name"
                        bind:value={projectName}
                        placeholder="Enter project name"
                    />
                </div>

                <div class="space-y-2">
                    <label
                        for="project-desc"
                        class="text-xs font-medium text-primary/70 font-mono uppercase"
                        >Description</label
                    >
                    <Input
                        id="project-desc"
                        bind:value={projectDescription}
                        placeholder="Enter description"
                    />
                </div>

                <p class="text-xs text-primary/50 font-mono">
                    DETECTED: {loadedData.entities.length} ENTITIES / {loadedData
                        .relationships.length} RELATIONSHIPS
                </p>
            {/if}

            <div class="flex justify-end gap-2 pt-4">
                {#if loadedData}
                    <Button variant="outline" onclick={handleCreateNew}>
                        NEW PROJECT
                    </Button>
                    <Dialog.Close>
                        <Button
                            onclick={handleLoad}
                            class="bg-primary/20 border border-primary/50 text-primary hover:bg-primary/30"
                        >
                            LOAD DATA
                        </Button>
                    </Dialog.Close>
                {:else}
                    <Dialog.Close>
                        <Button variant="outline" onclick={handleClose}>
                            CANCEL
                        </Button>
                    </Dialog.Close>
                    <Button
                        onclick={handleCreateNew}
                        class="bg-primary/20 border border-primary/50 text-primary hover:bg-primary/30"
                    >
                        NEW PROJECT
                    </Button>
                {/if}
            </div>
        </div>
        <!-- </DialogContent> -->
    </Dialog.Content>
</Dialog.Root>
