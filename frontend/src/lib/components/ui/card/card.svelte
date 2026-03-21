<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	interface CardProps extends HTMLAttributes<HTMLDivElement> {
		children?: Snippet;
	}

	let { class: className, children, ...restProps }: CardProps = $props();
</script>

<div class={cn("rounded-xl border bg-card text-card-foreground shadow", className)} {...restProps}>
	{@render children?.()}
</div>
