<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { Snippet, Component } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
		children?: Snippet;
		orientation?: "vertical" | "horizontal" | "both";
	}

	let { class: className, children, orientation = "vertical", ...restProps }: ScrollAreaProps = $props();
</script>

<div
	class={cn(
		"relative",
		orientation === "vertical" && "overflow-y-auto",
		orientation === "horizontal" && "overflow-x-auto",
		orientation === "both" && "overflow-auto",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
