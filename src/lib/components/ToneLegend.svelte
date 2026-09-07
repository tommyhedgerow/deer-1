<script lang="ts">
	// Small key explaining the tone colours used across the site.
	const tones = [
		{ t: 1, mark: 'ˉ', label: '1st' },
		{ t: 2, mark: 'ˊ', label: '2nd' },
		{ t: 3, mark: 'ˇ', label: '3rd' },
		{ t: 4, mark: 'ˋ', label: '4th' },
		{ t: 0, mark: '·', label: 'neutral' }
	];
	const cls = (t: number) =>
		t === 1 ? 'text-tone-1' : t === 2 ? 'text-tone-2' : t === 3 ? 'text-tone-3' : t === 4 ? 'text-tone-4' : 'text-faint';
</script>

<div class="flex flex-wrap items-center gap-x-4 gap-y-1" role="img" aria-label="Pinyin tone colour key">
	{#each tones as tone}
		<span class="inline-flex items-baseline gap-1.5">
			<span class={['text-sm leading-none', cls(tone.t)]} aria-hidden="true">{tone.mark}</span>
			<span class="eyebrow !tracking-normal">{tone.label}</span>
		</span>
	{/each}
</div>
