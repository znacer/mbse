<script lang="ts">
	import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent } from "$lib/components/ui/dialog/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { appState } from "$lib/state/app.svelte.js";
	import { validateMBSEData, createEmptyMBSEData } from "$lib/utils/graphTransform.js";
	import type { MBSEData } from "$lib/types/mbse.js";
	import { Upload, FileJson, X } from "lucide-svelte";

	interface FileLoaderProps {
		open: boolean;
	}

	let { open = $bindable() }: FileLoaderProps = $props();

	let projectName = $state("");
	let projectDescription = $state("");
	let loadedData: MBSEData | null = $state(null);
	let fileName = $state("");
	let error = $state<string | null>(null);
	let fileInput: HTMLInputElement;

	function handleClose(): void {
		open = false;
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
				error = "Invalid MBSE file format. Please ensure the file contains valid entities and relationships.";
				loadedData = null;
			}
		} catch (e) {
			error = "Failed to parse JSON file. Please ensure the file is valid JSON.";
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

		const project = appState.createProject(projectName || fileName.replace(/\.json$/i, ""), projectDescription);
		appState.loadProject(project.id);
		appState.setGraphData(loadedData);

		handleClose();
	}

	function handleCreateNew(): void {
		const project = appState.createProject(projectName || "New Project", projectDescription);
		appState.loadProject(project.id);
		appState.setGraphData(createEmptyMBSEData());

		handleClose();
	}
</script>

<Dialog {open} onClose={handleClose}>
	<DialogHeader class="bg-[#0d1318] border-b border-[#1a2530]">
		<DialogTitle class="text-[#00ff88] font-mono text-sm">LOAD DATA</DialogTitle>
		<DialogDescription class="text-[#4a5568] font-mono text-xs uppercase">
			Import MBSE entities and relationships
		</DialogDescription>
	</DialogHeader>

	<DialogContent class="bg-[#0a0f14] border-[#1a2530]">
		<div class="space-y-4">
			<button
				type="button"
				class="border-2 border-dashed border-[#1a2530] rounded p-8 text-center cursor-pointer hover:border-[#00ff88]/50 transition-colors w-full bg-[#0d1318]/50"
				ondrop={handleDrop}
				ondragover={handleDragOver}
				onclick={() => fileInput?.click()}
			>
				<Upload class="size-8 mx-auto mb-2 text-[#00ff88]/50" />
				<p class="text-sm text-[#4a5568] font-mono">
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
				<div class="flex items-center gap-2 p-2 bg-[#0d1318] rounded border border-[#1a2530]">
					<FileJson class="size-4 text-[#00ff88]" />
					<span class="text-sm flex-1 truncate text-[#e0e0e0] font-mono">{fileName}</span>
					<Button variant="ghost" size="icon-xs" onclick={() => { fileName = ""; loadedData = null; }} class="text-[#00ff88] hover:text-[#00ff88] hover:bg-[#00ff88]/10">
						<X class="size-3" />
					</Button>
				</div>
			{/if}

			{#if error}
				<p class="text-sm text-red-500 font-mono">{error}</p>
			{/if}

			{#if loadedData}
				<div class="space-y-2">
					<label for="project-name" class="text-xs font-medium text-[#00ff88]/70 font-mono uppercase">Project Name</label>
					<Input id="project-name" bind:value={projectName} placeholder="Enter project name" class="bg-[#0d1318] border-[#1a2530] text-[#e0e0e0] font-mono focus:border-[#00ff88]/50" />
				</div>

				<div class="space-y-2">
					<label for="project-desc" class="text-xs font-medium text-[#00ff88]/70 font-mono uppercase">Description</label>
					<Input id="project-desc" bind:value={projectDescription} placeholder="Enter description" class="bg-[#0d1318] border-[#1a2530] text-[#e0e0e0] font-mono focus:border-[#00ff88]/50" />
				</div>

				<p class="text-xs text-[#00ff88]/50 font-mono">
					DETECTED: {loadedData.entities.length} ENTITIES / {loadedData.relationships.length} RELATIONSHIPS
				</p>
			{/if}

			<div class="flex justify-end gap-2 pt-4">
				{#if loadedData}
					<Button variant="outline" onclick={handleCreateNew} class="border-[#1a2530] text-[#00ff88] hover:text-[#00ff88] hover:bg-[#00ff88]/10 hover:border-[#00ff88]/30">
						NEW PROJECT
					</Button>
					<Button onclick={handleLoad} class="bg-[#00ff88]/20 border border-[#00ff88]/50 text-[#00ff88] hover:bg-[#00ff88]/30">
						LOAD DATA
					</Button>
				{:else}
					<Button variant="outline" onclick={handleClose} class="border-[#1a2530] text-[#4a5568] hover:text-[#e0e0e0] hover:bg-[#1a2530]">
						CANCEL
					</Button>
					<Button onclick={handleCreateNew} class="bg-[#00ff88]/20 border border-[#00ff88]/50 text-[#00ff88] hover:bg-[#00ff88]/30">
						NEW PROJECT
					</Button>
				{/if}
			</div>
		</div>
	</DialogContent>
</Dialog>
