<script lang="ts">
	import "../app.css";
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="min-h-screen bg-[#0a0f14]">
	{@render children()}
</div>
