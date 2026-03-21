<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
		variant?: "default" | "secondary" | "destructive" | "outline";
		children?: Snippet;
	}

	const variants = {
		default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
		secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
		destructive: "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
		outline: "text-foreground"
	} as const;

	let { class: className, variant = "default", children, ...restProps }: BadgeProps = $props();
</script>

<div
	class={cn(
		"inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
		variants[variant],
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
