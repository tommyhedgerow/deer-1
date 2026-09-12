<script lang="ts">
	// Theme is applied before first paint in app.html; this only reflects and
	// flips it, keeping the same localStorage key.
	import { onMount } from 'svelte';

	let isDark = $state(false);

	onMount(() => {
		isDark = document.documentElement.classList.contains('dark');
	});

	function toggle() {
		const dark = !document.documentElement.classList.contains('dark');
		document.documentElement.classList.toggle('dark', dark);
		document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
		try {
			localStorage.setItem('hanzi-theme', dark ? 'dark' : 'light');
		} catch {
			/* storage unavailable — the toggle still works for this page */
		}
		isDark = dark;
	}
</script>

<button
	type="button"
	onclick={toggle}
	aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
	class="grid size-8 cursor-pointer place-items-center rounded-full border border-line text-ink2 transition-colors hover:border-ink hover:text-ink"
>
	{#if isDark}
		<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="3.4" stroke="currentColor" /><path d="M8 0.8v2M8 13.2v2M0.8 8h2M13.2 8h2M2.4 2.4l1.4 1.4M12.2 12.2l1.4 1.4M13.6 2.4l-1.4 1.4M3.8 12.2l-1.4 1.4" stroke="currentColor" stroke-linecap="round" /></svg>
	{:else}
		<svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M14.2 9.3A6 6 0 0 1 6.7 1.8a6 6 0 1 0 7.5 7.5z" fill="currentColor" /></svg>
	{/if}
</button>
