<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	interface DialogContentProps extends HTMLAttributes<HTMLDivElement> {
		children?: Snippet;
	}

	let { class: className, children, ...restProps }: DialogContentProps = $props();
</script>

<div class={cn("flex flex-col space-y-4", className)} {...restProps}>
	{@render children?.()}
</div>
