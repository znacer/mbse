<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";
	import type { SheetSide } from "./types.js";

	interface SheetProps extends HTMLAttributes<HTMLDivElement> {
		open?: boolean;
		side?: SheetSide;
		children?: Snippet;
		onClose?: () => void;
	}

	const sideClasses = {
		top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
		bottom:
			"inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
		left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
		right:
			"inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm"
	} as const;

	let {
		class: className,
		open = $bindable(false),
		side = "right",
		children,
		onClose,
		...restProps
	}: SheetProps = $props();

	function handleClose() {
		open = false;
		onClose?.();
	}
</script>

{#if open}
	<div class="fixed inset-0 z-50 bg-black/80" onclick={handleClose} role="button" tabindex="-1" aria-hidden="true"></div>
	<div
		class={cn(
			"fixed z-50 gap-4 bg-[#0a0f14] p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500 border-[#1a2530]",
			sideClasses[side],
			className
		)}
		data-state={open ? "open" : "closed"}
		{...restProps}
	>
		{@render children?.()}
	</div>
{/if}
