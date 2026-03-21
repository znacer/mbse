<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	interface DialogProps extends HTMLAttributes<HTMLDivElement> {
		open?: boolean;
		children?: Snippet;
		onClose?: () => void;
	}

	let { class: className, open = $bindable(false), children, onClose, ...restProps }: DialogProps = $props();

	function handleClose() {
		open = false;
		onClose?.();
	}
</script>

{#if open}
	<div class="fixed inset-0 z-50 bg-black/80" onclick={handleClose} role="button" tabindex="-1" aria-hidden="true"></div>
	<div
		class={cn(
			"fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-[#0a0f14] p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg border-[#1a2530]",
			className
		)}
		data-state={open ? "open" : "closed"}
		{...restProps}
	>
		{@render children?.()}
	</div>
{/if}
