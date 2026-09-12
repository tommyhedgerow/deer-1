<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { base } from '$app/paths';
	import Segmented from '$lib/components/Segmented.svelte';
	import Stars from '$lib/components/Stars.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import ToneSyllables from '$lib/components/ToneSyllables.svelte';
	import {
		CN_SCRIPTS,
		bookOf,
		charOf,
		componentsOf,
		curriculumLabel,
		curriculumOf,
		frameOf,
		kwOf,
		loadRows,
		readingsFor,
		splitSenses,
		type Curriculum,
		type Lang,
		type RawRow,
		type Script
	} from '$lib/hanzi';
	import { ACHIEVEMENT_BY_KEY, type Achievement } from '$lib/achievements';
	import { starsOf } from '$lib/frequency';
	import { emptyCounts, type CardView, type QueueCounts, type ReviewTotals } from '$lib/review';
	import { RATINGS, formatDueIn, previewIntervals, type Rating } from '$lib/srs';
	import { storyKey, type StoryMap } from '$lib/story';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// ---- state -------------------------------------------------------------
	let rows: RawRow[] = $state([]);
	let stories = $state<StoryMap>({});
	let lang = $state<Lang>('cn');
	let script = $state<Script>('trad');
	const curriculum = $derived<Curriculum>(curriculumOf(lang, script));

	let queue = $state<CardView[]>([]);
	// Seeded from the server load so the first paint has real numbers; the queue
	// fetch below then owns them.
	let counts = $state<QueueCounts>(untrack(() => data.allCounts.trad) ?? emptyCounts());
	let totals = $state<ReviewTotals>(
		untrack(() => ({
			totalReviews: data.stats.totalReviews,
			reviewsToday: data.stats.reviewsToday,
			streak: data.stats.streak
		}))
	);
	let loading = $state(true);
	let busy = $state(false);
	let revealed = $state(false);
	let note = $state('');
	/** the moment the current card's intervals are measured from */
	let clock = $state(untrack(() => data.now));
	let session = $state({ seen: 0, again: 0, good: 0 });
	let unlocked = $state<Achievement[]>([]);
	let finished = $state(false);

	const byId = $derived(new Map(rows.map((r) => [r.id, r])));
	const card = $derived(queue[0]);
	const row = $derived(card ? byId.get(card.hanziId) : undefined);
	const story = $derived(card ? stories[storyKey(curriculum, card.hanziId)] ?? '' : '');
	const previews = $derived(card ? previewIntervals(card.stage, clock) : null);
	const deckTotal = $derived(data.totals ? data.totals[curriculum] : null);
	const nextDue = $derived(counts.nextDueAt != null ? formatDueIn(counts.nextDueAt, clock) : null);

	const RATING_STYLE: Record<Rating, { label: string; hint: string; key: string; cls: string }> = {
		again: {
			label: 'Again',
			hint: 'did not know it',
			key: '1',
			cls: 'border-cinnabar text-cinnabarink hover:bg-cinnabar/[0.07]'
		},
		good: {
			label: 'Good',
			hint: 'knew it',
			key: '2',
			cls: 'border-moss text-mossink hover:bg-moss/[0.08]'
		}
	};

	// ---- loading -----------------------------------------------------------
	onMount(() => {
		loadRows().then((loaded) => {
			rows = loaded;
		});
		loadStories();
		loadQueue();
	});

	async function loadStories() {
		try {
			const res = await fetch(`${base}/api/story`);
			if (!res.ok) return;
			stories = ((await res.json()) as { stories?: StoryMap }).stories ?? {};
		} catch {
			/* the story is a hint on the front, never a requirement */
		}
	}

	/** Fetch the due queue for a curriculum and adopt its counts. */
	async function loadQueue(target: Curriculum = curriculum) {
		loading = true;
		note = '';
		try {
			const res = await fetch(`${base}/api/review?curriculum=${target}`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const body = (await res.json()) as {
				queue: CardView[];
				counts: QueueCounts;
				now: number;
				stats: ReviewTotals;
			};
			queue = body.queue;
			counts = body.counts;
			clock = body.now;
			totals = {
				totalReviews: body.stats.totalReviews,
				reviewsToday: body.stats.reviewsToday,
				streak: body.stats.streak
			};
		} catch {
			note = 'Could not reach the queue. Check your connection and try again.';
		} finally {
			loading = false;
		}
	}

	/** Take new characters as cards, then reload the queue. */
	async function introduce(n: number) {
		if (busy) return;
		busy = true;
		note = '';
		try {
			const res = await fetch(`${base}/api/review/new`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ script: curriculum, count: n })
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			session = { seen: 0, again: 0, good: 0 };
			finished = false;
			await loadQueue();
		} catch {
			note = 'Those cards could not be added. Please try again.';
		} finally {
			busy = false;
		}
	}

	// ---- the session -------------------------------------------------------
	function reveal() {
		if (card) revealed = true;
	}

	async function grade(rating: Rating) {
		if (!card || busy) return;
		busy = true;
		const graded = card;
		note = '';
		try {
			const res = await fetch(`${base}/api/review`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					hanziId: graded.hanziId,
					script: curriculum,
					rating
				})
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const body = (await res.json()) as {
				counts: QueueCounts;
				totals: ReviewTotals;
				unlocked: string[];
			};

			queue = queue.slice(1);
			revealed = false;
			counts = body.counts;
			totals = body.totals;
			clock = Date.now();
			session = { ...session, seen: session.seen + 1, [rating]: session[rating] + 1 };

			for (const key of body.unlocked) {
				const achievement = ACHIEVEMENT_BY_KEY.get(key);
				if (achievement) unlocked = [...unlocked, achievement];
			}

			if (!queue.length) finished = true;
		} catch {
			note = 'That review could not be saved. Please try again.';
		} finally {
			busy = false;
		}
	}

	function setCurriculum(nextLang: Lang, nextScript: Script) {
		if (nextLang === lang && nextScript === script) return;
		lang = nextLang;
		script = nextScript;
		queue = [];
		revealed = false;
		finished = false;
		session = { seen: 0, again: 0, good: 0 };
		loadQueue(curriculumOf(nextLang, nextScript));
	}

	// keyboard: space reveals, 1–4 grade once the answer is up
	$effect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
			if (e.key === ' ' || e.key === 'Enter') {
				if (!revealed && card) {
					e.preventDefault();
					reveal();
				}
				return;
			}
			if (!revealed || busy) return;
			const rating = RATINGS[Number(e.key) - 1];
			if (rating) {
				e.preventDefault();
				grade(rating);
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	const pct = (n: number) => Math.round(n * 100);
	const fmt = (n: number) => n.toLocaleString('en-US');
</script>

<svelte:head>
	<title>Review — Deer-1</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="relative min-h-screen overflow-x-clip bg-paper text-ink">
	<div class="bg-grain" aria-hidden="true"></div>
	<div class="page-mat hidden 2xl:block" aria-hidden="true"></div>

	<header class="sticky top-0 z-40 border-b border-line backdrop-blur-md">
		<div class="mx-auto max-w-[1100px] px-5 md:px-8">
			<div class="flex items-center justify-between gap-4 py-3.5">
				<a href={`${base}/`} class="flex min-w-0 items-center gap-3" aria-label="Deer-1 — back to the index">
					<span class="char-hanzi serif-word text-moss text-2xl font-medium leading-none" lang="zh">鹿</span>
					<span class="eyebrow hidden sm:block">Review</span>
				</a>
				<div class="flex items-center gap-3">
					<a
						href={`${base}/account`}
						class="rounded-[3px] border border-line px-3 py-1.5 text-[11px] font-semibold tracking-wide text-ink2 transition-colors hover:border-ink hover:text-ink"
					>
						{data.user?.name ?? 'Account'}
					</a>
					<ThemeToggle />
				</div>
			</div>

			<div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-2.5 border-t border-line py-2.5">
				<div class="flex flex-wrap items-center gap-x-6 gap-y-2.5">
					<Segmented
						label="Language"
						value={lang}
						onchange={(v) => setCurriculum(v as Lang, script)}
						options={[
							{ value: 'cn', label: '中文 · Chinese' },
							{ value: 'jp', label: '日本語 · Japanese' }
						]}
					/>
					{#if lang === 'cn'}
						<Segmented
							label="Script"
							value={script}
							onchange={(v) => setCurriculum(lang, v as Script)}
							options={CN_SCRIPTS.map((s) => ({
								value: s,
								label: s === 'simp' ? 'Simplified' : 'Traditional'
							}))}
						/>
					{/if}
				</div>
				<p class="eyebrow tnum" aria-live="polite">
					{#if loading}
						loading the queue…
					{:else}
						{fmt(counts.due)} due · {fmt(counts.learning)} learning · {fmt(counts.newAvailable)} new
					{/if}
				</p>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-[1100px] px-5 pb-24 pt-10 md:px-8">
		<!-- today's line -->
		<section class="flex flex-wrap items-end justify-between gap-x-10 gap-y-6" aria-label="Today">
			<div>
				<p class="eyebrow mb-3">{curriculumLabel(curriculum)} · {bookOf(curriculum)}</p>
				<h1 class="serif-word text-[2.2rem] font-light leading-[1.05] tracking-[-0.01em] md:text-4xl">
					Review
				</h1>
				<p class="mt-3 text-sm text-ink2">
					The keyword comes first: recall the character, then say whether you knew it. Each button
					shows where the card lands next.
				</p>
			</div>
			<dl class="flex flex-wrap gap-x-8 gap-y-4">
				<div>
					<dt class="eyebrow mb-1.5">Today</dt>
					<dd class="tnum text-2xl font-light">{fmt(totals.reviewsToday)}</dd>
				</div>
				<div>
					<dt class="eyebrow mb-1.5">Streak</dt>
					<dd class="tnum text-2xl font-light text-moss">{fmt(totals.streak)}<span class="text-sm text-faint"> d</span></dd>
				</div>
				<div>
					<dt class="eyebrow mb-1.5">All reviews</dt>
					<dd class="tnum text-2xl font-light">{fmt(totals.totalReviews)}</dd>
				</div>
				<div>
					<dt class="eyebrow mb-1.5">Known here</dt>
					<dd class="tnum text-2xl font-light">
						{fmt(counts.known)}<span class="text-sm text-faint">{deckTotal ? ` / ${fmt(deckTotal)}` : ''}</span>
					</dd>
				</div>
			</dl>
		</section>

		{#if unlocked.length}
			<section class="mt-8" aria-label="Achievements unlocked">
				{#each unlocked as achievement (achievement.key)}
					<p
						role="status"
						class="mt-2 flex flex-wrap items-baseline gap-x-3 border-l-2 border-moss bg-moss/[0.07] px-3.5 py-2.5 text-[12px] text-mossink"
					>
						<span class="eyebrow text-moss">unlocked</span>
						<span class="font-semibold">{achievement.title}</span>
						<span class="text-ink2">{achievement.detail}</span>
					</p>
				{/each}
			</section>
		{/if}

		{#if note}
			<p role="status" class="mt-8 border-l-2 border-cinnabar bg-cinnabar/[0.06] px-3.5 py-2.5 text-[12px] text-cinnabarink">
				{note}
			</p>
		{/if}

		<!-- the card -->
		<section class="mt-10" aria-label="Flashcard">
			{#if loading}
				<div class="flex h-72 items-center justify-center gap-3 border border-line text-sm text-ink2">
					<span class="inline-block size-4 animate-spin rounded-full border border-faint border-t-ink" aria-hidden="true"></span>
					reading your queue…
				</div>
			{:else if card && row}
				<div class="border border-line">
					<div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line px-5 py-3">
						<p class="eyebrow tnum">
							{bookOf(curriculum)} #{frameOf(row, curriculum) != null ? String(frameOf(row, curriculum)).padStart(4, '0') : '—'}
							{#if card.stage > 0}· stage {card.stage}{:else}· learning{/if}
						</p>
						<p class="eyebrow tnum">
							{fmt(counts.due)} left in the queue
							{#if card.lapses > 0}<span class="text-cinnabarink"> · {card.lapses} lapse{card.lapses === 1 ? '' : 's'}</span>{/if}
						</p>
					</div>

					<div class="px-5 py-10 md:px-10 md:py-14">
						<p class="eyebrow mb-5">Recall the {curriculumLabel(curriculum)} character for</p>
						<p class="serif-word text-4xl font-light leading-tight md:text-5xl">
							{kwOf(row, curriculum) || '(no keyword)'}
						</p>

						{#if story}
							<div class="mt-6 max-w-2xl border-l-2 border-line pl-3.5">
								<p class="eyebrow mb-2">Your story</p>
								<p class="text-sm leading-relaxed text-ink2">{story}</p>
							</div>
						{/if}

						{#if revealed}
							<div class="anim-rise mt-10 border-t border-line pt-8">
								<div class="flex flex-wrap items-end gap-x-10 gap-y-6">
									<span class="char-hanzi select-none text-[6rem] leading-none md:text-[8rem]" lang="zh">
										{charOf(row, curriculum)}
									</span>
									<div class="min-w-0">
										{#if readingsFor(row, curriculum).taught.length}
											<ToneSyllables syllables={readingsFor(row, curriculum).taught} variant="xl" />
										{/if}
										{#if readingsFor(row, curriculum).also.length}
											<p class="mt-3 flex items-baseline gap-2">
												<span class="eyebrow shrink-0">also read</span>
												<ToneSyllables syllables={readingsFor(row, curriculum).also} variant="sm" />
											</p>
										{/if}
									</div>
								</div>

								<p class="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
									<span class="eyebrow shrink-0">Commonness</span>
									<Stars stars={starsOf(row)} size="sm" />
									{#if row.rank != null}
										<span class="eyebrow tnum text-faint">rank #{row.rank}</span>
									{/if}
								</p>

								{#if splitSenses(row.mean ?? '').length}
									<p class="mt-4 max-w-3xl text-[15px] leading-relaxed text-ink2">
										{splitSenses(row.mean ?? '').join(' · ')}
									</p>
								{/if}

								{#if componentsOf(row).length}
									<p class="mt-5 flex flex-wrap items-center gap-2">
										<span class="eyebrow shrink-0">components</span>
										{#each componentsOf(row) as part (part)}
											<span class="char-hanzi border border-line px-2 py-1 text-lg leading-none" lang="zh">{part}</span>
										{/each}
									</p>
								{/if}
							</div>
						{/if}
					</div>

					<div class="border-t border-line px-5 py-5 md:px-10">
						{#if !revealed}
							<button
								type="button"
								onclick={reveal}
								class="w-full cursor-pointer rounded-[3px] bg-ink px-5 py-4 text-sm font-semibold text-paper transition-opacity hover:opacity-90"
							>
								Show the character
								<span class="ml-2 font-normal opacity-60">space</span>
							</button>
						{:else}
							<p class="eyebrow mb-3">Did you know it?</p>
							<div class="grid grid-cols-2 gap-2.5" role="group" aria-label="Grade this card">
								{#each RATINGS as rating (rating)}
									<button
										type="button"
										disabled={busy}
										onclick={() => grade(rating)}
										class={[
											'flex cursor-pointer flex-col items-center gap-1 rounded-[3px] border bg-paper px-3 py-3.5 transition-colors disabled:opacity-50',
											RATING_STYLE[rating].cls
										].join(' ')}
									>
										<span class="text-sm font-semibold tracking-wide">
											{RATING_STYLE[rating].label}
											<span class="ml-1.5 font-normal opacity-60">{RATING_STYLE[rating].key}</span>
										</span>
										<span class="text-[11px] text-ink2">{RATING_STYLE[rating].hint}</span>
										<span class="tnum text-[11px] text-faint">back in {previews?.[rating] ?? ''}</span>
									</button>
								{/each}
							</div>
						{/if}
					</div>
				</div>

				<p class="eyebrow mt-4 flex flex-wrap gap-x-5 gap-y-1.5">
					<span>{fmt(counts.cards)} card{counts.cards === 1 ? '' : 's'} in {curriculumLabel(curriculum)}</span>
					{#if counts.known}<span class="text-moss">{fmt(counts.known)} known</span>{/if}
					{#if card.reviews > 0}<span>seen {fmt(card.reviews)}×</span>{/if}
					{#if nextDue && !counts.due}<span>next up {nextDue}</span>{/if}
				</p>
			{:else if finished}
				<!-- end of a session -->
				<div class="border border-line px-6 py-12 text-center">
					<p class="serif-word text-3xl font-light">Session done</p>
					<p class="eyebrow mt-3 tnum">
						{fmt(session.seen)} card{session.seen === 1 ? '' : 's'} · {fmt(session.good)} known
						· {fmt(session.again)} again
					</p>
					<p class="mx-auto mt-5 max-w-md text-sm leading-relaxed text-ink2">
						{#if counts.due > 0}
							There are still {fmt(counts.due)} due — the queue refills as you go.
						{:else if nextDue}
							Nothing else is due. The next card comes back {nextDue}.
						{:else}
							Nothing else is due.
						{/if}
					</p>
					<div class="mt-8 flex flex-wrap justify-center gap-2.5">
						{#if counts.due > 0}
							<button
								type="button"
								onclick={() => {
									finished = false;
									loadQueue();
								}}
								class="cursor-pointer rounded-[3px] bg-ink px-4 py-2.5 text-xs font-semibold text-paper transition-opacity hover:opacity-90"
							>
								Load the queue again
							</button>
						{/if}
						{#each [10, 20, 50] as n (n)}
							<button
								type="button"
								disabled={busy || counts.newAvailable === 0}
								onclick={() => introduce(n)}
								class="cursor-pointer rounded-[3px] border border-line px-4 py-2.5 text-xs font-semibold text-ink2 transition-colors hover:border-ink hover:text-ink disabled:cursor-default disabled:opacity-40"
							>
								Learn {n} new
							</button>
						{/each}
					</div>
					<p class="eyebrow mt-6">
						{fmt(counts.newAvailable)} unstudied {curriculumLabel(curriculum)} characters left in the book
					</p>
				</div>
			{:else}
				<!-- nothing due, but the learner may still want to move forward -->
				<div class="border border-line px-6 py-12 text-center">
					<p class="serif-word text-3xl font-light">
						{counts.cards === 0 ? 'No cards yet' : 'Nothing due right now'}
					</p>
					<p class="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink2">
						{#if counts.cards === 0}
							Start with a handful of characters: each one becomes a card on the first step of the
							ladder, ready to review immediately.
						{:else if nextDue}
							Everything you have studied is scheduled ahead. The next card comes back {nextDue}.
						{:else}
							Everything you have studied is scheduled ahead.
						{/if}
					</p>
					<div class="mt-8 flex flex-wrap justify-center gap-2.5">
						{#each [10, 20, 50] as n (n)}
							<button
								type="button"
								disabled={busy || counts.newAvailable === 0}
								onclick={() => introduce(n)}
								class="cursor-pointer rounded-[3px] bg-ink px-4 py-2.5 text-xs font-semibold text-paper transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-40"
							>
								Learn {n} new
							</button>
						{/each}
					</div>
					<p class="eyebrow mt-6">
						{fmt(counts.cards)} card{counts.cards === 1 ? '' : 's'} · {fmt(counts.newAvailable)} unstudied characters left
					</p>
				</div>
			{/if}
		</section>

		<!-- where this is heading -->
		<section class="mt-14 grid gap-8 border-t border-line pt-8 sm:grid-cols-2" aria-label="Progress and awards">
			<div>
				<p class="eyebrow mb-4">This curriculum</p>
				<dl class="divide-y divide-line border-y border-line text-sm">
					<div class="flex items-baseline justify-between gap-6 py-2.5">
						<dt class="eyebrow shrink-0">Cards</dt>
						<dd class="tnum">{fmt(counts.cards)}</dd>
					</div>
					<div class="flex items-baseline justify-between gap-6 py-2.5">
						<dt class="eyebrow shrink-0">Due now</dt>
						<dd class="tnum">{fmt(counts.due)}</dd>
					</div>
					<div class="flex items-baseline justify-between gap-6 py-2.5">
						<dt class="eyebrow shrink-0">Learning</dt>
						<dd class="tnum">{fmt(counts.learning)}</dd>
					</div>
					<div class="flex items-baseline justify-between gap-6 py-2.5">
						<dt class="eyebrow shrink-0">Known</dt>
						<dd class="tnum">{fmt(counts.known)}</dd>
					</div>
					<div class="flex items-baseline justify-between gap-6 py-2.5">
						<dt class="eyebrow shrink-0">Unstudied</dt>
						<dd class="tnum">{fmt(counts.newAvailable)}</dd>
					</div>
				</dl>
				<p class="mt-4 text-[11px] leading-relaxed text-ink2">
					A card reaches <span class="text-moss">known</span> at a 30-day interval; a lapse sends it
					back to the ten-minute step and marks its character learning again.
				</p>
			</div>

			<div>
				<p class="eyebrow mb-4">Awards</p>
				<p class="tnum text-3xl font-light">
					{fmt(data.awards.earned)}<span class="text-lg text-faint"> / {fmt(data.awards.total)}</span>
				</p>
				{#if data.awards.next}
					{@const next = data.awards.next}
					<div class="mt-5">
						<p class="flex items-baseline justify-between gap-4 text-[12px]">
							<span class="font-semibold">{next.achievement.title}</span>
							<span class="tnum text-ink2">{fmt(next.current)} / {fmt(next.target)}</span>
						</p>
						<div class="mt-2 h-1.5 w-full overflow-hidden bg-ink/[0.08]">
							<div class="h-full bg-moss" style="width:{(next.ratio * 100).toFixed(1)}%"></div>
						</div>
						<p class="eyebrow mt-2">{next.achievement.detail}</p>
					</div>
				{:else}
					<p class="mt-4 text-sm text-ink2">Every tier reached. Extraordinary.</p>
				{/if}
				{#if data.awards.recent.length}
					<ul class="mt-6 space-y-1.5">
						{#each data.awards.recent as recent (recent.achievement.key)}
							<li class="eyebrow flex flex-wrap items-baseline gap-x-3">
								<span class="text-moss">{recent.achievement.title}</span>
								<span class="normal-case tracking-normal text-faint">
									{new Date(recent.unlockedAt ?? 0).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
								</span>
							</li>
						{/each}
					</ul>
				{/if}
				<p class="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[12px]">
					<a href={`${base}/account?tab=achievements`} class="text-ink2 underline decoration-line underline-offset-4 hover:text-ink">
						the whole ladder →
					</a>
					<a href={`${base}/account?tab=study`} class="text-ink2 underline decoration-line underline-offset-4 hover:text-ink">
						your heatmap →
					</a>
					<a href={`${base}/account?tab=settings`} class="text-ink2 underline decoration-line underline-offset-4 hover:text-ink">
						settings →
					</a>
				</p>
			</div>
		</section>

		<footer class="relative mt-14 border-t border-line pt-6">
			<p class="text-[11px] leading-relaxed text-ink2">
				<span class="eyebrow mb-2 block text-moss">Deer-1 · nature × technology</span>
				Reviews are logged against the UTC day, which is what the heatmap and the streak count.
				Keyboard: <span class="tnum">space</span> to turn a card, <span class="tnum">1</span> again,
				<span class="tnum">2</span> good.
			</p>
		</footer>
	</main>
</div>
