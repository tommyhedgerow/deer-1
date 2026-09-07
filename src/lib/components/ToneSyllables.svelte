<script lang="ts">
	import type { Syllable } from '$lib/pinyin';

	let {
		syllables,
		variant = 'sm',
		withNumbers = true
	}: {
		syllables: Syllable[];
		/** 'xl' for the taught reading, 'sm' for secondary lines */
		variant?: 'xl' | 'sm';
		withNumbers?: boolean;
	} = $props();

	const sizeClass = $derived(variant === 'xl' ? 'text-[26px] md:text-4xl' : 'text-sm md:text-base');
	const toneClass = (t: number) =>
		t === 1 ? 'text-tone-1' : t === 2 ? 'text-tone-2' : t === 3 ? 'text-tone-3' : t === 4 ? 'text-tone-4' : 'text-ink2';
</script>

{#if syllables.length}
	<span class="inline-flex flex-wrap items-baseline gap-x-1 gap-y-0.5" lang="zh-Latn">
		{#each syllables as syl, i (syl.letters + syl.tone)}
			{#if i > 0}<span class="text-faint" aria-hidden="true">·</span>{/if}
			<span class={['font-medium tracking-wide', sizeClass, toneClass(syl.tone)].join(' ')}>
				{syl.text}{#if withNumbers && syl.tone > 0}<sup class="text-[0.55em] font-semibold">{syl.tone}</sup>{/if}
			</span>
		{/each}
	</span>
{/if}
