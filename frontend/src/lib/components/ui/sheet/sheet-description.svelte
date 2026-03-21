<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	interface SheetDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
		children?: Snippet;
	}

	let { class: className, children, ...restProps }: SheetDescriptionProps = $props();
</script>

<p class={cn("text-sm text-muted-foreground", className)} {...restProps}>
	{@render children?.()}
</p>
