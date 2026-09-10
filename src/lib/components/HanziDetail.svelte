<script lang="ts">
	import { base } from '$app/paths';
	import DeerSeal from './DeerSeal.svelte';
	import {
		bookOf,
		charOf,
		frameOf,
		formatLesson,
		kwOf,
		lessonMergedOf,
		lessonOf,
		optOf,
		readingsFor,
		sameForm,
		splitSenses,
		type RawRow,
		type ReadingSet,
		type Script
	} from '$lib/hanzi';
	import ToneSyllables from './ToneSyllables.svelte';
	import ToneLegend from './ToneLegend.svelte';

	let {
		rows,
		index,
		script,
		onclose,
		onselect
	}: {
		rows: RawRow[];
		index: number;
		script: Script;
		onclose: () => void;
		onselect: (index: number) => void;
	} = $props();

	const row: RawRow | undefined = $derived(rows[index]);
	const book = $derived(bookOf(script));
	const char = $derived(row ? charOf(row, script) : '');
	const other = $derived(row ? (script === 'simp' ? row.th : row.sh) : '');
	const same = $derived(row ? sameForm(row) : false);
	const kw = $derived(row ? kwOf(row, script) : '');
	const otherKw = $derived(row ? (script === 'simp' ? row.kr ?? '' : row.ks ?? '') : '');
	const frame = $derived(row ? frameOf(row, script) : null);
	const opt = $derived(row ? optOf(row, script) : null);
	const lesson = $derived(row ? lessonOf(row, script) : '');
	const lessonMerged = $derived(row ? lessonMergedOf(row, script) : '');
	const senses = $derived(row ? splitSenses(row.mean ?? '') : []);
	const readings = $derived<ReadingSet>(row ? readingsFor(row, script) : { taught: [], also: [] });
	const inOther = $derived(row ? (script === 'simp' ? row.nr != null : row.ns != null) : false);
	const otherFrame = $derived(
		row ? (script === 'simp' ? row.nr ?? null : row.ns ?? null) : null
	);
	const otherLesson = $derived(row ? (script === 'simp' ? row.lr ?? '' : row.ls ?? '') : '');
	const prev = $derived(rows[index - 1]);
	const next = $derived(rows[index + 1]);
	const freq = $derived(row ? row.freq ?? '' : '');
	const rank = $derived(row ? row.rank ?? null : null);
	const grp = $derived(row ? row.grp ?? null : null);
	const pos = $derived(row ? row.pos ?? '' : '');

	// ---- interaction -------------------------------------------------------
	let panel: HTMLElement | undefined = $state();

	function go(delta: number) {
		const target = index + delta;
		if (target >= 0 && target < rows.length) onselect(target);
	}

	$effect(() => {
		if (!row) return;
		panel?.scrollTo({ top: 0 });
	});

	$effect(() => {
		if (!row) return;
		// scroll lock
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onclose();
			else if (e.key === 'ArrowLeft') go(-1);
			else if (e.key === 'ArrowRight') go(1);
		};
		window.addEventListener('keydown', onKey);
		return () => {
			document.body.style.overflow = prevOverflow;
			window.removeEventListener('keydown', onKey);
		};
	});

	const pad = (n: number) => String(n).padStart(4, '0');
</script>

<svelte:head>
	<title>{row ? `${char} · ${kw || 'Remembering the Hanzi'} — Deer-1` : 'Deer-1 — Hanzi Index'}</title>
</svelte:head>

{#if row}
	<div class="anim-overlay fixed inset-0 z-50 overflow-y-auto bg-paper text-ink" role="dialog" aria-modal="true" aria-label={`Character ${char}`} bind:this={panel}>
		<div class="bg-grain" aria-hidden="true"></div>
		<div class="relative mx-auto flex min-h-full w-full max-w-5xl flex-col px-5 pb-10 pt-0 md:px-10">
			<!-- masthead -->
			<header class="sticky top-0 z-10 -mx-5 flex items-center justify-between border-b border-line bg-paper/95 px-5 py-3 backdrop-blur-sm md:-mx-10 md:px-10">
				<button type="button" onclick={onclose} class="group inline-flex cursor-pointer items-center gap-2 py-1 text-xs font-semibold tracking-wide text-ink2 transition-colors hover:text-ink">
					<span class="inline-block transition-transform group-hover:-translate-x-0.5" aria-hidden="true">←</span>
					Index
				</button>
				<span class="flex items-center gap-2.5">
					<span class="hidden sm:inline-block" aria-hidden="true"><DeerSeal size={17} rotation="-6deg" /></span>
					<span class="eyebrow tnum">{book} · #{frame != null ? pad(frame) : '—'}</span>
				</span>
				<button
					type="button"
					onclick={onclose}
					aria-label="Close"
					class="grid size-8 cursor-pointer place-items-center rounded-full border border-line text-ink2 transition-colors hover:border-ink hover:text-ink"
				>
					<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
						<path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.4" />
					</svg>
				</button>
			</header>

			<!-- hero -->
			<section class="anim-rise pt-12 pb-10 md:pt-16">
				<p class="eyebrow mb-6">{formatLesson(lesson) || `${book} · frame ${frame != null ? pad(frame) : '—'}`}</p>
				<div class="flex flex-col items-start gap-8 md:flex-row md:items-center md:gap-14">
					<div class="relative">
						<span class="char-hanzi block select-none text-[7rem] leading-none md:text-[9.5rem]" lang="zh">{char}</span>
						{#if !same}
							<div class="mt-4 flex items-baseline gap-2 border-t border-line pt-3">
								<span class="char-hanzi text-3xl text-ink2 md:text-4xl" lang="zh">{other}</span>
								<span class="eyebrow">{script === 'simp' ? 'traditional form' : 'simplified form'}</span>
							</div>
						{:else}
							<p class="eyebrow mt-5">written identically in both scripts</p>
						{/if}
					</div>
					<div class="min-w-0 flex-1">
						<h1 class="serif-word text-4xl font-light leading-tight md:text-5xl">{kw || '—'}</h1>
						{#if pos}
							<p class="eyebrow mt-4">
								part of speech <span class="text-ink2 normal-case tracking-normal">{pos.replace(/\//g, ' / ')}</span>
							</p>
						{/if}
						{#if !same && otherKw && otherKw !== kw}
							<p class="eyebrow mt-3">alternate keyword · {script === 'simp' ? 'RTH' : 'RSH'}: <span class="text-ink2 normal-case tracking-normal">{otherKw}</span></p>
						{/if}
						{#if inOther}
							<p class="eyebrow mt-3">
								also taught in {script === 'simp' ? 'RTH' : 'RSH'}{otherFrame != null ? ` · frame ${pad(otherFrame)}` : ''}
								{#if otherLesson}<span class="normal-case tracking-normal text-ink2"> · {formatLesson(otherLesson)}</span>{/if}
							</p>
						{/if}
					</div>
				</div>
			</section>

			<!-- pronunciation -->
			{#if readings.taught.length}
				<section class="border-t border-line py-8">
					<div class="flex flex-wrap items-end justify-between gap-4">
						<div>
							<p class="eyebrow mb-3">Pronunciation · tone colours</p>
							<ToneSyllables syllables={readings.taught} variant="xl" />
							{#if readings.also.length}
								<p class="mt-4 flex items-baseline gap-2">
									<span class="eyebrow shrink-0">also read</span>
									<ToneSyllables syllables={readings.also} variant="sm" />
								</p>
							{/if}
						</div>
						<div class="shrink-0 pb-1"><ToneLegend /></div>
					</div>
				</section>
			{/if}

			<!-- senses -->
			{#if senses.length}
				<section class="border-t border-line py-8">
					<p class="eyebrow mb-4">
						Senses{#if !same && script === 'trad'} · of the simplified form <span class="normal-case tracking-normal text-ink2">{row.sh}</span>{/if}
					</p>
					<p class="serif-word max-w-3xl text-xl font-light leading-relaxed text-ink md:text-2xl">
						{#each senses as sense, i (sense + i)}
							<span>{sense}</span>{#if i < senses.length - 1}<span class="mx-2 text-faint">·</span>{/if}
						{/each}
					</p>
				</section>
			{/if}

			<!-- usage + index facts -->
			<section class="grid gap-8 border-t border-line py-8 sm:grid-cols-2">
				<div>
					<p class="eyebrow mb-4">Usage in the simplified corpus</p>
					{#if freq || rank != null || grp != null}
						<dl class="grid grid-cols-3 divide-x divide-line border border-line">
							<div class="px-3 py-4 text-center">
								<dt class="eyebrow mb-1.5">Frequency</dt>
								<dd class="tnum text-xl font-light">{freq || '—'}</dd>
							</div>
							<div class="px-3 py-4 text-center">
								<dt class="eyebrow mb-1.5">Rank</dt>
								<dd class="tnum text-xl font-light">{rank != null ? `#${rank}` : '—'}</dd>
							</div>
							<div class="px-3 py-4 text-center">
								<dt class="eyebrow mb-1.5">Group</dt>
								<dd class="tnum text-xl font-light">{grp != null ? grp : '—'}</dd>
							</div>
						</dl>
					{:else}
						<p class="text-sm text-ink2">not among the highest-frequency characters</p>
					{/if}
				</div>
				<div>
					<p class="eyebrow mb-4">In the books</p>
					<dl class="divide-y divide-line border-y border-line text-sm">
						<div class="flex items-baseline justify-between gap-6 py-2.5">
							<dt class="eyebrow shrink-0">Frame</dt>
							<dd class="tnum text-right">{book} #{frame != null ? pad(frame) : '—'}<span class="text-faint"> · deck #{row.id}</span></dd>
						</div>
						{#if opt != null}
							<div class="flex items-baseline justify-between gap-6 py-2.5">
								<dt class="eyebrow shrink-0">Optimised</dt>
								<dd class="tnum">{book} #{pad(opt)}</dd>
							</div>
						{/if}
						{#if lesson}
							<div class="flex items-baseline justify-between gap-6 py-2.5">
								<dt class="eyebrow shrink-0">Lesson</dt>
								<dd class="text-right">{lessonMerged && lessonMerged !== lesson ? `${lesson} · merged ${lessonMerged}` : lesson}</dd>
							</div>
						{/if}
					</dl>
				</div>
			</section>

			<!-- footer nav -->
			<nav class="grid grid-cols-2 gap-px border border-line bg-line" aria-label="Adjacent characters">
				<button
					type="button"
					disabled={!prev}
					onclick={() => go(-1)}
					class="group flex min-h-[5.5rem] cursor-pointer items-center gap-4 bg-paper px-5 py-5 text-left transition-colors enabled:hover:bg-ink/[0.03] disabled:cursor-default"
				>
					<span class="shrink-0 text-faint transition-transform group-hover:-translate-x-1" aria-hidden="true">←</span>
					{#if prev}
						<span class="char-hanzi text-3xl leading-none" lang="zh">{charOf(prev, script)}</span>
						<span class="min-w-0">
							<span class="eyebrow block">previous</span>
							<span class="mt-1 block truncate text-sm text-ink2">{kwOf(prev, script) || '\u00a0'}</span>
						</span>
					{:else}
						<span class="eyebrow text-ink2 opacity-60">no previous character</span>
					{/if}
				</button>
				<button
					type="button"
					disabled={!next}
					onclick={() => go(1)}
					class="group flex min-h-[5.5rem] cursor-pointer items-center justify-end gap-4 bg-paper px-5 py-5 text-right transition-colors enabled:hover:bg-ink/[0.03] disabled:cursor-default"
				>
					{#if next}
						<span class="min-w-0">
							<span class="eyebrow block">next</span>
							<span class="mt-1 block truncate text-sm text-ink2">{kwOf(next, script) || '\u00a0'}</span>
						</span>
						<span class="char-hanzi text-3xl leading-none" lang="zh">{charOf(next, script)}</span>
					{:else}
						<span class="eyebrow text-ink2 opacity-60">no next character</span>
					{/if}
					<span class="shrink-0 text-faint transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
				</button>
			</nav>

			<p class="mt-6 text-center text-[11px] tracking-wide text-faint">
				← → to browse · esc to close · <a class="underline decoration-line underline-offset-2 hover:text-ink" href={`${base}/data/hanzi.json`}>data</a>
			</p>
		</div>
	</div>
{/if}
