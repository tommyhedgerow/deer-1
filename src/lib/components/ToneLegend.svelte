<script lang="ts">
	// Clear key to the tone colours used for pinyin across the site.
	const tones = [
		{ t: 1, ex: 'mā', mark: 'ˉ', name: '' },
		{ t: 2, ex: 'má', mark: 'ˊ', name: '' },
		{ t: 3, ex: 'mǎ', mark: 'ˇ', name: '' },
		{ t: 4, ex: 'mà', mark: 'ˋ', name: '' },
		{ t: 0, ex: 'ma', mark: '·', name: '' }
	];

	const toneCls = (t: number) =>
		t === 1
			? 'text-tone-1'
			: t === 2
				? 'text-tone-2'
				: t === 3
					? 'text-tone-3'
					: t === 4
						? 'text-tone-4'
						: 'text-ink2';

	const chipCls = (t: number) =>
		t === 1
			? 'bg-tone-1/15 text-tone-1 border-tone-1/30'
			: t === 2
				? 'bg-tone-2/15 text-tone-2 border-tone-2/30'
				: t === 3
					? 'bg-tone-3/15 text-tone-3 border-tone-3/30'
					: t === 4
						? 'bg-tone-4/15 text-tone-4 border-tone-4/30'
						: 'bg-ink/10 text-ink2 border-line';
</script>

<div class="flex flex-wrap items-center gap-x-4 gap-y-2" role="img" aria-label="Pinyin tone colours: 1st high level, 2nd rising, 3rd falling-rising, 4th falling, neutral light — shown on the syllable ma">
	{#each tones as tone (tone.t)}
		<span class="inline-flex items-center gap-2" title={tone.name}>
			<span
				class={['grid size-4 place-items-center rounded-[3px] border font-tech text-[10px] font-bold leading-none', chipCls(tone.t)]}
				aria-hidden="true"
			>
				{tone.t || '·'}
			</span>
			<span class={['font-tech text-[1.05rem] font-semibold leading-none tracking-wide', toneCls(tone.t)]} lang="zh-Latn" aria-hidden="true">
				{tone.ex}
			</span>
			<span class="text-[11px] font-normal leading-none normal-case tracking-[0.01em] text-ink2">
				<span class="sr-only">tone {tone.t || 'neutral'}: </span>{tone.name}
			</span>
		</span>
	{/each}
</div>
