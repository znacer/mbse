<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	interface SheetTitleProps extends HTMLAttributes<HTMLHeadingElement> {
		children?: Snippet;
	}

	let { class: className, children, ...restProps }: SheetTitleProps = $props();
</script>

<h2 class={cn("text-lg font-semibold text-foreground", className)} {...restProps}>
	{@render children?.()}
</h2>
