<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
		orientation?: "horizontal" | "vertical";
		decorative?: boolean;
	}

	let { class: className, orientation = "horizontal", decorative = true, ...restProps }: SeparatorProps = $props();
</script>

<div
	role={decorative ? "none" : "separator"}
	aria-orientation={decorative ? undefined : orientation}
	class={cn(
		"shrink-0 bg-border",
		orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
		className
	)}
	{...restProps}
></div>
