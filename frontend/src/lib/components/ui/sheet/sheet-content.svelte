<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	interface SheetContentProps extends HTMLAttributes<HTMLDivElement> {
		children?: Snippet;
	}

	let { class: className, children, ...restProps }: SheetContentProps = $props();
</script>

<div class={cn("flex flex-col space-y-2", className)} {...restProps}>
	{@render children?.()}
</div>
