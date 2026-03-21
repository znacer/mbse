<script lang="ts">
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription,
	} from "$lib/components/ui/dialog/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Input } from "$lib/components/ui/input/index.js";

	interface Props {
		open: boolean;
		onClose: () => void;
		onCreateEmpty: (name: string) => void;
		onCreateWithTestData: (name: string, entityCount: number, linkDensity: number) => void;
	}

	let { open, onClose, onCreateEmpty, onCreateWithTestData }: Props = $props();

	let projectName = $state("");
	let entityCount = $state(100);
	let linkDensity = $state(1.5);
	let mode = $state<"empty" | "test">("empty");

	function handleSubmit(): void {
		const name = projectName.trim() || "New Project";
		if (mode === "test") {
			onCreateWithTestData(name, entityCount, linkDensity);
		} else {
			onCreateEmpty(name);
		}
		reset();
	}

	function reset(): void {
		projectName = "";
		entityCount = 100;
		linkDensity = 1.5;
		mode = "empty";
	}

	function handleClose(): void {
		reset();
		onClose();
	}
</script>

<Dialog {open} onClose={handleClose}>
	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<DialogTitle>Create New Project</DialogTitle>
			<DialogDescription>
				Start with an empty project or generate test data.
			</DialogDescription>
		</DialogHeader>

		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<label for="project-name" class="text-sm font-medium">Project Name</label>
				<Input id="project-name" bind:value={projectName} placeholder="My Project" />
			</div>

			<div class="space-y-2">
				<span class="text-sm font-medium">Initial Data</span>
				<div class="flex gap-2">
					<Button
						variant={mode === "empty" ? "default" : "outline"}
						class="flex-1"
						onclick={() => (mode = "empty")}
					>
						Empty
					</Button>
					<Button
						variant={mode === "test" ? "default" : "outline"}
						class="flex-1"
						onclick={() => (mode = "test")}
					>
						Test Data
					</Button>
				</div>
			</div>

			{#if mode === "test"}
				<div class="space-y-3 rounded-lg border p-4">
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<span class="text-sm">Entities</span>
							<span class="text-sm text-muted-foreground">{entityCount}</span>
						</div>
						<input
							type="range"
							id="entity-count"
							min="10"
							max="1000"
							step="10"
							bind:value={entityCount}
							class="w-full"
						/>
					</div>

					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<span class="text-sm">Link Density</span>
							<span class="text-sm text-muted-foreground">{linkDensity.toFixed(1)}x</span>
						</div>
						<input
							type="range"
							id="link-density"
							min="0.5"
							max="5"
							step="0.1"
							bind:value={linkDensity}
							class="w-full"
						/>
						<p class="text-xs text-muted-foreground">
							~{Math.floor(entityCount * linkDensity)} links will be generated
						</p>
					</div>
				</div>
			{/if}
		</div>

		<div class="flex justify-end gap-2">
			<Button variant="outline" onclick={handleClose}>
				Cancel
			</Button>
			<Button onclick={handleSubmit}>
				Create
			</Button>
		</div>
	</DialogContent>
</Dialog>
