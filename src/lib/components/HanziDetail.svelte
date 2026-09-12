<script lang="ts">
	import { untrack } from 'svelte';
	import { base } from '$app/paths';
	import {
		bookOf,
		charOf,
		componentsOf,
		curriculumLabel,
		frameOf,
		formatLesson,
		isPlaceholder,
		kwOf,
		lessonMergedOf,
		lessonOf,
		optOf,
		readingsFor,
		sameForm,
		splitSenses,
		type Curriculum,
		type RawRow,
		type ReadingSet
	} from '$lib/hanzi';
	import Stars from './Stars.svelte';
	import ToneSyllables from './ToneSyllables.svelte';
	import ToneLegend from './ToneLegend.svelte';
	import { starSentence, starsOf } from '$lib/frequency';
	import { MAX_STORY_LENGTH } from '$lib/story';
	import type { ProgressStatus } from '$lib/progress';

	let {
		rows,
		index,
		curriculum,
		signedIn = false,
		status = null,
		story = '',
		onmark,
		onstory,
		onclose,
		onselect
	}: {
		rows: RawRow[];
		index: number;
		curriculum: Curriculum;
		/** whether a viewer is signed in — progress and stories need an account */
		signedIn?: boolean;
		/** the viewer's current mark for this character */
		status?: ProgressStatus | null;
		/** the viewer's own saved story, empty when none is written */
		story?: string;
		onmark?: (id: number, status: ProgressStatus | null) => void;
		/** resolves false when the story could not be saved */
		onstory?: (id: number, body: string | null) => Promise<boolean>;
		onclose: () => void;
		onselect: (index: number) => void;
	} = $props();

	const row: RawRow | undefined = $derived(rows[index]);
	const book = $derived(bookOf(curriculum));
	const char = $derived(row ? charOf(row, curriculum) : '');
	const other = $derived(row ? (curriculum === 'simp' ? row.th : row.sh) : '');
	const same = $derived(row ? sameForm(row) : false);
	const kw = $derived(row ? kwOf(row, curriculum) : '');
	const otherKw = $derived(row ? (curriculum === 'simp' ? row.kr ?? '' : row.ks ?? '') : '');
	const frame = $derived(row ? frameOf(row, curriculum) : null);
	const opt = $derived(row ? optOf(row, curriculum) : null);
	const lesson = $derived(row ? lessonOf(row, curriculum) : '');
	const lessonMerged = $derived(row ? lessonMergedOf(row, curriculum) : '');
	const senses = $derived(row ? splitSenses(row.mean ?? '') : []);
	const readings = $derived<ReadingSet>(row ? readingsFor(row, curriculum) : { taught: [], also: [] });
	const inOther = $derived(row ? (curriculum === 'simp' ? row.nr != null : row.ns != null) : false);
	const otherFrame = $derived(
		row ? (curriculum === 'simp' ? row.nr ?? null : row.ns ?? null) : null
	);
	const otherLesson = $derived(row ? (curriculum === 'simp' ? row.lr ?? '' : row.ls ?? '') : '');
	const prev = $derived(rows[index - 1]);
	const next = $derived(rows[index + 1]);
	const rank = $derived(row ? row.rank ?? null : null);
	/** 1–5, from the deck's own rank bands ($lib/frequency). */
	const stars = $derived(row ? starsOf(row) : 1);
	const pos = $derived(row ? row.pos ?? '' : '');
	const components = $derived(row ? componentsOf(row) : []);
	/** Japanese is a placeholder for now, and reads as the traditional deck. */
	const placeholder = $derived(isPlaceholder(curriculum));
	/** Chinese-script cross-references make no sense inside the japanese deck. */
	const chinese = $derived(!placeholder);

	// Kept as plain values so click handlers need no narrowing of `row`.
	const rowId = $derived(row?.id ?? 0);
	const signInHref = $derived(
		`${base}/login?redirect=${encodeURIComponent(`/#${curriculum}/orig/${rowId}`)}`
	);
	const signUpHref = $derived(
		`${base}/signup?redirect=${encodeURIComponent(`/#${curriculum}/orig/${rowId}`)}`
	);

	// ---- the viewer's story ------------------------------------------------
	let draft = $state('');
	let storyState = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');

	/** One story per character *and* per curriculum: one deck row is three stories. */
	const storyId = $derived(`${curriculum}:${rowId}`);
	let lastStoryId = '';

	/**
	 * A different character — or the same character in another curriculum —
	 * always starts from what is actually stored. Within one story the draft is
	 * never thrown away, including after a failed save: the store rolls back
	 * then, and the text on screen is all the learner has left to retry with.
	 */
	$effect(() => {
		const id = storyId;
		if (id !== lastStoryId) {
			lastStoryId = id;
			draft = story;
			storyState = 'idle';
			return;
		}
		if (storyState !== 'idle') return;
		if (story.trim() !== untrack(() => draft).trim()) draft = story;
	});

	const storyDirty = $derived(draft.trim() !== story.trim());
	const storyTooLong = $derived(draft.length > MAX_STORY_LENGTH);

	async function saveStory(body: string | null) {
		if (!onstory || storyState === 'saving') return;
		const sent = draft;
		storyState = 'saving';
		const ok = await onstory(rowId, body);
		if (ok) {
			storyState = 'saved';
		} else {
			draft = sent;
			storyState = 'error';
		}
	}

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
						{#if chinese}
							{#if !same}
								<div class="mt-4 flex items-baseline gap-2 border-t border-line pt-3">
									<span class="char-hanzi text-3xl text-ink2 md:text-4xl" lang="zh">{other}</span>
									<span class="eyebrow">{curriculum === 'simp' ? 'traditional form' : 'simplified form'}</span>
								</div>
							{:else}
								<p class="eyebrow mt-5">written identically in both scripts</p>
							{/if}
						{/if}
					</div>
					<div class="min-w-0 flex-1">
						<h1 class="serif-word text-4xl font-light leading-tight md:text-5xl">{kw || '—'}</h1>
						{#if pos}
							<p class="eyebrow mt-4">
								part of speech <span class="text-ink2 normal-case tracking-normal">{pos.replace(/\//g, ' / ')}</span>
							</p>
						{/if}
						{#if chinese && !same && otherKw && otherKw !== kw}
							<p class="eyebrow mt-3">alternate keyword · {curriculum === 'simp' ? 'RTH' : 'RSH'}: <span class="text-ink2 normal-case tracking-normal">{otherKw}</span></p>
						{/if}
						{#if chinese && inOther}
							<p class="eyebrow mt-3">
								also taught in {curriculum === 'simp' ? 'RTH' : 'RSH'}{otherFrame != null ? ` · frame ${pad(otherFrame)}` : ''}
								{#if otherLesson}<span class="normal-case tracking-normal text-ink2"> · {formatLesson(otherLesson)}</span>{/if}
							</p>
						{/if}
						{#if placeholder}
							<p class="mt-5 max-w-md border-l-2 border-line pl-3 text-[12px] leading-relaxed text-ink2">
								The Japanese deck is on its way. Until it lands this is the traditional
								curriculum shown in place of it — the keyword and readings below are the
								Chinese ones, not their kanji equivalents.
							</p>
						{/if}
					</div>
				</div>
			</section>

			<!-- the viewer's own mark -->
			<section class="border-t border-line py-8">
				<div class="flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
					<div>
						<p class="eyebrow mb-3">Your progress</p>
						{#if !signedIn}
							<p class="max-w-md text-sm leading-relaxed text-ink2">
								<a class="underline decoration-line underline-offset-4 hover:text-ink" href={signUpHref}>Create an account</a>
								or <a class="underline decoration-line underline-offset-4 hover:text-ink" href={signInHref}>sign in</a>
								to keep track of this character.
							</p>
						{:else if status === 'known'}
							<p class="text-sm text-ink2">
								Marked as <span class="font-semibold text-moss">known</span>.
							</p>
						{:else if status === 'learning'}
							<p class="text-sm text-ink2">
								Marked as <span class="font-semibold text-tone-2">learning</span>.
							</p>
						{:else}
							<p class="text-sm text-ink2">Not marked yet.</p>
						{/if}
					</div>

					{#if signedIn}
						<div
							class="flex items-stretch overflow-hidden rounded-[3px] border border-line"
							role="group"
							aria-label="Mark this character"
						>
							<button
								type="button"
								aria-pressed={status === 'learning'}
								onclick={() => onmark?.(rowId, status === 'learning' ? null : 'learning')}
								class={[
									'cursor-pointer px-3.5 py-2 text-xs transition-colors',
									status === 'learning'
										? 'bg-tone-2 font-semibold text-paper'
										: 'text-ink2 hover:bg-ink/5 hover:text-ink'
								].join(' ')}
							>
								Learning
							</button>
							<button
								type="button"
								aria-pressed={status === 'known'}
								onclick={() => onmark?.(rowId, status === 'known' ? null : 'known')}
								class={[
									'cursor-pointer border-l border-line px-3.5 py-2 text-xs transition-colors',
									status === 'known'
										? 'bg-moss font-semibold text-paper'
										: 'text-ink2 hover:bg-ink/5 hover:text-ink'
								].join(' ')}
							>
								Known
							</button>
							{#if status}
								<button
									type="button"
									onclick={() => onmark?.(rowId, null)}
									class="cursor-pointer border-l border-line px-3.5 py-2 text-xs text-ink2 transition-colors hover:bg-ink/5 hover:text-ink"
								>
									Clear
								</button>
							{/if}
						</div>
					{/if}
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
						Senses{#if chinese && !same && curriculum === 'trad'} · of the simplified form <span class="normal-case tracking-normal text-ink2">{row.sh}</span>{/if}
					</p>
					<p class="serif-word max-w-3xl text-xl font-light leading-relaxed text-ink md:text-2xl">
						{#each senses as sense, i (sense + i)}
							<span>{sense}</span>{#if i < senses.length - 1}<span class="mx-2 text-faint">·</span>{/if}
						{/each}
					</p>
				</section>
			{/if}

			<!-- components -->
			<section class="border-t border-line py-8" aria-label="Components">
				<div class="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
					<p class="eyebrow">Components</p>
					{#if components.length}
						<p class="eyebrow tnum">{components.length} part{components.length === 1 ? '' : 's'}</p>
					{/if}
				</div>

				{#if components.length}
					<ul class="mt-5 flex flex-wrap gap-3">
						{#each components as part (part)}
							<li class="flex min-w-[4.5rem] flex-col items-center gap-1.5 border border-line px-3 py-3">
								<span class="char-hanzi select-none text-3xl leading-none" lang="zh">{part}</span>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="mt-4 max-w-xl text-sm leading-relaxed text-ink2">
						The parts this character is built from are not recorded yet — the deck carries no
						decomposition data. This section fills as soon as it does.
					</p>
					{#if placeholder}
						<p class="eyebrow mt-3">awaiting the japanese deck</p>
					{/if}
				{/if}
			</section>

			<!-- the viewer's own story -->
			<section class="border-t border-line py-8" aria-label="Your story">
				<div class="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
					<p class="eyebrow">Your story</p>
					{#if signedIn && story.trim()}
						<p class="eyebrow tnum text-moss">saved</p>
					{/if}
				</div>

				{#if !signedIn}
					<p class="mt-4 max-w-xl text-sm leading-relaxed text-ink2">
						<a class="underline decoration-line underline-offset-4 hover:text-ink" href={signUpHref}>Create an account</a>
						or <a class="underline decoration-line underline-offset-4 hover:text-ink" href={signInHref}>sign in</a>
						to keep a story of your own for this character. Nobody else can read it.
					</p>
				{:else}
					<p class="mt-3 max-w-xl text-[12px] leading-relaxed text-ink2">
						A story of your own — the image that ties the components to the keyword. Private
						to you, and kept per {curriculumLabel(curriculum)} character. No stories ship with
						the index yet, so this is blank until you write it.
					</p>

					<label class="mt-5 block max-w-2xl">
						<span class="sr-only">Your story for {char}</span>
						<textarea
							bind:value={draft}
							rows="5"
							maxlength={MAX_STORY_LENGTH}
							placeholder={`Write the story for ${char}…`}
							class="w-full resize-y rounded-[3px] border border-line bg-panel px-3.5 py-3 text-sm leading-relaxed text-ink outline-none transition-colors placeholder:text-faint focus:border-ink"
						></textarea>
					</label>

					<div class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
						<button
							type="button"
							disabled={!storyDirty || storyTooLong || storyState === 'saving'}
							onclick={() => saveStory(draft)}
							class="cursor-pointer rounded-[3px] bg-ink px-4 py-2 text-xs font-semibold text-paper transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-40"
						>
							{storyState === 'saving' ? 'Saving…' : 'Save story'}
						</button>
						{#if story.trim()}
							<button
								type="button"
								onclick={() => {
									draft = '';
									saveStory(null);
								}}
								class="cursor-pointer rounded-[3px] border border-line px-4 py-2 text-xs text-ink2 transition-colors hover:border-cinnabar hover:text-cinnabarink"
							>
								Delete story
							</button>
						{/if}
						<span class="eyebrow tnum">{draft.length} / {MAX_STORY_LENGTH}</span>
						{#if storyTooLong}
							<span class="eyebrow text-cinnabarink" role="status">too long to save</span>
						{:else if storyState === 'saved' && !storyDirty}
							<span class="eyebrow text-moss" role="status">saved</span>
						{:else if storyState === 'error'}
							<span class="eyebrow text-cinnabarink" role="status">
								could not save — try again
							</span>
						{:else if storyDirty && story.trim()}
							<span class="eyebrow" role="status">unsaved changes</span>
						{/if}
					</div>
				{/if}
			</section>

			<!-- usage + index facts -->
			<section class="grid gap-8 border-t border-line py-8 sm:grid-cols-2">
				<div>
					<p class="eyebrow mb-4">How common it is</p>
					<dl class="grid grid-cols-2 divide-x divide-line border border-line">
						<div class="flex flex-col items-center justify-center gap-2 px-3 py-4 text-center">
							<dt class="eyebrow">Commonness</dt>
							<dd><Stars stars={stars} /></dd>
							<dd class="text-[11px] leading-snug text-ink2">{starSentence(stars)}</dd>
						</div>
						<div class="flex flex-col items-center justify-center gap-2 px-3 py-4 text-center">
							<dt class="eyebrow">Rank</dt>
							<dd class="tnum text-xl font-light">{rank != null ? `#${rank}` : '—'}</dd>
							<dd class="text-[11px] leading-snug text-ink2">
								{rank != null ? 'of the simplified frequency list' : 'not on the frequency list'}
							</dd>
						</div>
					</dl>
					<p class="mt-3 text-[11px] leading-relaxed text-ink2">
						One star per band of the deck's frequency ranking — five for the 300 commonest
						characters, one for the rest. The percentage that used to sit here said less than the
						rank it came from.
					</p>
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
						<span class="char-hanzi text-3xl leading-none" lang="zh">{charOf(prev, curriculum)}</span>
						<span class="min-w-0">
							<span class="eyebrow block">previous</span>
							<span class="mt-1 block truncate text-sm text-ink2">{kwOf(prev, curriculum) || '\u00a0'}</span>
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
							<span class="mt-1 block truncate text-sm text-ink2">{kwOf(next, curriculum) || '\u00a0'}</span>
						</span>
						<span class="char-hanzi text-3xl leading-none" lang="zh">{charOf(next, curriculum)}</span>
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
