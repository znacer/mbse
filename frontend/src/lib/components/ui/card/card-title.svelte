<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
		children?: Snippet;
	}

	let { class: className, children, ...restProps }: CardTitleProps = $props();
</script>

<h3 class={cn("font-semibold leading-none tracking-tight", className)} {...restProps}>
	{@render children?.()}
</h3>
