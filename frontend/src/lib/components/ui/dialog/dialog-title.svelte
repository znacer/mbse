<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	interface DialogTitleProps extends HTMLAttributes<HTMLHeadingElement> {
		children?: Snippet;
	}

	let { class: className, children, ...restProps }: DialogTitleProps = $props();
</script>

<h2 class={cn("text-lg font-semibold leading-none tracking-tight", className)} {...restProps}>
	{@render children?.()}
</h2>
