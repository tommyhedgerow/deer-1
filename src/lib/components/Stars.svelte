<script lang="ts">
	// Five stars for the commonest band of the deck's ranking, one for the
	// rarest. Text glyphs, not artwork: filled stars in the ink, empty ones
	// faded, with the whole scale described for anyone not looking at it.
	import { starLabel, starSentence, starWord } from '$lib/frequency';

	let {
		stars,
		size = 'md',
		showWord = true
	}: {
		/** 1–5, from `starsOf(row)` */
		stars: number;
		size?: 'sm' | 'md';
		showWord?: boolean;
	} = $props();

	const scale = $derived(Math.max(1, Math.min(5, Math.round(stars))));
</script>

<span
	class="inline-flex items-baseline gap-2"
	title={starSentence(scale)}
	aria-label={starLabel(scale)}
	role="img"
>
	<span
		class={['inline-flex items-center gap-[2px]', size === 'sm' ? 'text-sm' : 'text-lg'].join(' ')}
		aria-hidden="true"
	>
		{#each [1, 2, 3, 4, 5] as step (step)}
			<span class={step <= scale ? 'text-moss' : 'text-faint opacity-40'}>{step <= scale ? '★' : '☆'}</span>
		{/each}
	</span>
	{#if showWord}
		<span class="eyebrow" aria-hidden="true">{starWord(scale)}</span>
	{/if}
</span>
