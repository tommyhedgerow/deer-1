<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import Favicon from '$lib/assets/favicon.ico';
	import HanziCell from '$lib/components/HanziCell.svelte';
	import HanziDetail from '$lib/components/HanziDetail.svelte';
	import InkCharacter from '$lib/components/InkCharacter.svelte';
	import Segmented from '$lib/components/Segmented.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import ToneLegend from '$lib/components/ToneLegend.svelte';
	import {
		CN_SCRIPTS,
		curriculumLabel,
		curriculumOf,
		filterRows,
		inBook,
		isPlaceholder,
		loadRows,
		viewRows,
		type Curriculum,
		type Lang,
		type OrderMode,
		type RawRow,
		type Script
	} from '$lib/hanzi';
	import {
		filterByStatus,
		progressKey,
		statusOf,
		type ProgressFilter,
		type ProgressMap,
		type ProgressStatus
	} from '$lib/progress';
	import { storyKey, type StoryMap } from '$lib/story';
	import type { PageData } from './$types';

	const BATCH = 180;

	let { data }: { data: PageData } = $props();

	/** The index is readable signed out; progress needs an account. */
	const signedIn = $derived(data.user != null);

	// ---- state -------------------------------------------------------------
	let rows: RawRow[] = $state([]);
	let loading = $state(true);
	/** The language on screen; the script only matters while that is Chinese. */
	let lang = $state<Lang>('cn');
	let script = $state<Script>('trad');
	let order = $state<OrderMode>('orig');
	let query = $state('');
	let selectedId = $state<number | null>(null);
	let loadedCount = $state(BATCH);
	let ready = $state(false);
	let searchInput: HTMLInputElement | undefined = $state();
	let sentinel: HTMLDivElement | undefined = $state();
	let lastKey = '';

	/** What the grid actually renders: a Chinese script, or the japanese deck. */
	const curriculum = $derived<Curriculum>(curriculumOf(lang, script));

	// ---- progress ----------------------------------------------------------
	// Marks for every curriculum at once, keyed `curriculum:hanziId` ($lib/progress).
	let progress = $state<ProgressMap>({});
	let progressFilter = $state<ProgressFilter>('all');
	let progressNote = $state('');
	let pending = $state(0);

	// ---- review queue ------------------------------------------------------
	// Only the badge: how many cards are waiting in the curriculum on screen.
	let dueCounts = $state<Record<Curriculum, number>>({ trad: 0, simp: 0, jp: 0 });
	let reviewsToday = $state(0);

	// ---- stories -----------------------------------------------------------
	// The viewer's own notes, keyed the same way ($lib/story). Nothing is
	// seeded: a story exists only because its author wrote it.
	let stories = $state<StoryMap>({});
	let storyNote = $state('');

	// ---- derived -----------------------------------------------------------
	const ordered = $derived(viewRows(rows, curriculum, order));
	const list = $derived(
		filterByStatus(
			filterRows(ordered, query),
			progress,
			curriculum,
			signedIn ? progressFilter : 'all'
		)
	);
	const total = $derived(ordered.length);
	const shown = $derived(list.slice(0, loadedCount));
	const openIndex = $derived(selectedId != null ? list.findIndex((r) => r.id === selectedId) : -1);
	const openRow = $derived(openIndex >= 0 ? list[openIndex] : undefined);
	const openStatus = $derived(openRow ? statusOf(progress, curriculum, openRow.id) : null);
	const openStory = $derived(openRow ? stories[storyKey(curriculum, openRow.id)] ?? '' : '');
	const countSimp = $derived(viewRows(rows, 'simp', 'orig').length);
	const countTrad = $derived(viewRows(rows, 'trad', 'orig').length);
	const countJp = $derived(viewRows(rows, 'jp', 'orig').length);
	/** The character count for whichever curriculum is on screen. */
	const countHere = $derived(
		curriculum === 'simp' ? countSimp : curriculum === 'trad' ? countTrad : countJp
	);
	const marks = $derived.by(() => {
		const prefix = `${curriculum}:`;
		let known = 0;
		let learning = 0;
		for (const [k, v] of Object.entries(progress)) {
			if (!k.startsWith(prefix)) continue;
			if (v === 'known') known++;
			else learning++;
		}
		return { known, learning };
	});

	const due = $derived(dueCounts[curriculum] ?? 0);

	const fmt = (n: number) => n.toLocaleString('en-US');
	const hashFor = (c: Curriculum, o: OrderMode, id: number | null) =>
		`#${c}/${o}${id != null ? `/${id}` : ''}`;

	// ---- load --------------------------------------------------------------
	onMount(() => {
		window.addEventListener('hashchange', onHashChange);
		if (signedIn) {
			loadProgress();
			loadStories();
		}

		loadRows().then((loaded) => {
			rows = loaded;
			loading = false;
			ready = true;
			// Read the URL only once the index is in hand: a deep link such as
			// /#trad/orig/55 can land a tick after this component mounts.
			onHashChange();
		});
	});

	/** `#jp/orig/55`, `#trad/opt/12`, `#simp/orig` — the language rides the hash. */
	function parseHash(
		hash: string
	): { lang: Lang; script: Script; order: OrderMode; id: number | null } | null {
		const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
		if (!parts.length) return null;
		const c = parts[0];
		if (c !== 'simp' && c !== 'trad' && c !== 'jp') return null;
		return {
			lang: c === 'jp' ? 'jp' : 'cn',
			script: c === 'simp' ? 'simp' : 'trad',
			order: parts[1] === 'opt' ? 'opt' : 'orig',
			id: parts[2] != null && /^\d+$/.test(parts[2]) ? Number(parts[2]) : null
		};
	}

	function onHashChange() {
		if (!ready) return;
		const h = parseHash(location.hash);
		if (!h) return;
		lang = h.lang;
		script = h.script;
		order = h.order;
		if (h.id != null && rows.some((r) => r.id === h.id && inBook(r, curriculumOf(h.lang, h.script)))) {
			selectedId = h.id;
		} else {
			selectedId = null;
		}
	}

	// ---- progress ----------------------------------------------------------
	/** Marks are kept server-side; the index only mirrors them. */
	async function loadProgress() {
		try {
			const res = await fetch(`${base}/api/progress`);
			if (!res.ok) {
				progressNote =
					res.status === 401 ? 'Your session has ended — sign in again to keep marking.' : '';
				return;
			}
			const body = (await res.json()) as { progress?: ProgressMap };
			progress = body.progress ?? {};
		} catch {
			progressNote = 'Could not load your saved progress.';
		}
	}

	/** Optimistic: the mark shows at once and rolls back if it cannot be saved. */
	async function mark(id: number, status: ProgressStatus | null) {
		if (!signedIn) return;
		const curriculumAtCall = curriculum;
		const key = progressKey(curriculumAtCall, id);
		const before = progress[key] ?? null;
		if (before === status) return;

		const next = { ...progress };
		if (status === null) delete next[key];
		else next[key] = status;
		progress = next;

		pending++;
		progressNote = '';
		try {
			const res = await fetch(`${base}/api/progress`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ hanziId: id, script: curriculumAtCall, status })
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
		} catch {
			const reverted = { ...progress };
			if (before === null) delete reverted[key];
			else reverted[key] = before;
			progress = reverted;
			progressNote =
				'That mark could not be saved. ' +
				(typeof navigator !== 'undefined' && navigator.onLine === false
					? 'You appear to be offline.'
					: 'Please try again.');
		} finally {
			pending--;
		}
	}

	// ---- stories -----------------------------------------------------------
	/** Every story the viewer has written, loaded with their marks. */
	async function loadStories() {
		try {
			const res = await fetch(`${base}/api/story`);
			if (!res.ok) return;
			const body = (await res.json()) as { stories?: StoryMap };
			stories = body.stories ?? {};
		} catch {
			storyNote = 'Could not load your stories.';
		}
	}

	/**
	 * Save or clear one story. The panel keeps its own draft and shows the
	 * result, so this only mirrors the write into the shared map — and puts the
	 * previous text back when the write fails. Resolves false on failure.
	 */
	async function saveStory(id: number, text: string | null): Promise<boolean> {
		if (!signedIn) return false;
		const curriculumAtCall = curriculum;
		const key = storyKey(curriculumAtCall, id);
		const before = stories[key] ?? '';
		const next = { ...stories };
		if (text === null || !text.trim()) delete next[key];
		else next[key] = text.trim();
		stories = next;

		storyNote = '';
		try {
			const res = await fetch(`${base}/api/story`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ hanziId: id, script: curriculumAtCall, body: text })
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			return true;
		} catch {
			const reverted = { ...stories };
			if (!before) delete reverted[key];
			else reverted[key] = before;
			stories = reverted;
			storyNote = 'That story could not be saved. Please try again.';
			return false;
		}
	}

	/**
	 * The due badge. One call covers every curriculum — the counts come back
	 * together — so switching language never costs a round trip.
	 */
	$effect(() => {
		if (!signedIn) return;
		let cancelled = false;
		fetch(`${base}/api/review/summary`)
			.then((res) => (res.ok ? res.json() : null))
			.then((body: { counts?: Record<Curriculum, { due: number }>; reviewsToday?: number } | null) => {
				if (cancelled || !body?.counts) return;
				dueCounts = {
					trad: body.counts.trad?.due ?? 0,
					simp: body.counts.simp?.due ?? 0,
					jp: body.counts.jp?.due ?? 0
				};
				reviewsToday = body.reviewsToday ?? 0;
			})
			.catch(() => {
				/* the badge is a convenience; the index works without it */
			});
		return () => {
			cancelled = true;
		};
	});

	// a sign-out elsewhere in the app must not leave marks or stories on screen
	$effect(() => {
		if (!signedIn) {
			progress = {};
			stories = {};
			dueCounts = { trad: 0, simp: 0, jp: 0 };
			reviewsToday = 0;
		}
	});

	// ---- interaction -------------------------------------------------------
	function select(id: number) {
		selectedId = selectedId === id ? null : id;
	}
	function closeDetail() {
		selectedId = null;
	}
	function setLang(v: string) {
		lang = v as Lang;
	}
	function setScript(v: string) {
		script = v as Script;
	}
	function setOrder(v: string) {
		order = v as OrderMode;
	}
	function setQuery(v: string) {
		query = v;
		loadedCount = BATCH;
	}

	// reset paging when the view changes, and keep the URL hash in sync
	$effect(() => {
		const key = `${curriculum}|${order}|${query.trim()}`;
		if (key !== lastKey) {
			lastKey = key;
			loadedCount = BATCH;
		}
		if (ready) history.replaceState(null, '', hashFor(curriculum, order, selectedId));
	});

	// close the panel when its row leaves the current view
	$effect(() => {
		if (openRow === undefined && selectedId != null && ready) selectedId = null;
	});

	// infinite scroll
	$effect(() => {
		if (!sentinel || loading || loadedCount >= list.length) return;
		const io = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting) && loadedCount < list.length) {
					loadedCount = Math.min(loadedCount + BATCH, list.length);
				}
			},
			{ rootMargin: '1000px 0px' }
		);
		io.observe(sentinel);
		return () => io.disconnect();
	});

	// '/' focuses the search box while browsing
	$effect(() => {
		if (openRow) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === '/' && !(e.target instanceof HTMLInputElement)) {
				e.preventDefault();
				searchInput?.focus();
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
</script>

<svelte:head>
	<title>PINE-3000</title>
	<meta name="description" content="PINE-3000 - A site to accompany James Heisig's Remembering the Hanzi and Remembering the Kanji, in traditional and simplified Chinese and in Japanese" />
</svelte:head>
<div class="relative min-h-screen overflow-x-clip bg-paper text-ink">
	<!-- page texture + framing -->
	<div class="bg-grain" aria-hidden="true"></div>
	<div class="page-mat hidden 2xl:block" aria-hidden="true"></div>

	<!-- calligraphy in the left page margin on very wide screens -->
	<div class="deco left-[calc(50vw-830px)] top-44 hidden text-[9.5rem] leading-none min-[1800px]:block" aria-hidden="true">
		<InkCharacter char="松" opacity={0.06} blur={2} />
	</div>

	<!-- header -->
	<header class="sticky top-0 z-40 border-b border-line backdrop-blur-md">
		<div class="mx-auto max-w-[1400px] px-5 md:px-8">
			<div class="flex items-center justify-between gap-4 py-3.5">
				<div class="flex min-w-0 items-baseline gap-3">
					<button
						type="button"
						onclick={() => {
							closeDetail();
							window.scrollTo({ top: 0, behavior: 'smooth' });
						}}
						class="text-moss char-hanzi serif-word cursor-pointer truncate text-left text-2xl font-medium leading-none tracking-tight"
						aria-label="PINE-3000 — back to the top"
					>
						鹿
					</button>
				</div>

				<div class="flex items-center gap-5">
					<label class="relative hidden md:block">
						<span class="sr-only">Search characters</span>
						<span class="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-faint" aria-hidden="true">
							<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.6" stroke="currentColor" /><path d="M9.6 9.6L13 13" stroke="currentColor" stroke-linecap="round" /></svg>
						</span>
						<input
							bind:this={searchInput}
							type="search"
							value={query}
							oninput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
							placeholder="search keyword, reading, meaning…"
							class="w-52 border-b border-line bg-transparent py-1 pl-5 pr-6 text-sm text-ink outline-none transition-colors placeholder:text-faint focus:border-ink xl:w-64"
						/>
						{#if query}
							<button
								type="button"
								aria-label="Clear search"
								onclick={() => setQuery('')}
								class="absolute right-0 top-1/2 -translate-y-1/2 cursor-pointer text-faint transition-colors hover:text-ink"
							>
								<svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.4" /></svg>
							</button>
						{/if}
					</label>

					<ThemeToggle />

					{#if signedIn}
						<a
							href={`${base}/review`}
							title={due > 0 ? `${due} cards due — start a review session` : 'Review your cards'}
							class={[
								'inline-flex items-center gap-2 rounded-[3px] border px-3 py-1.5 text-[11px] font-semibold tracking-wide transition-colors',
								due > 0
									? 'border-moss text-mossink hover:bg-moss/[0.08]'
									: 'border-line text-ink2 hover:border-ink hover:text-ink'
							].join(' ')}
						>
							{#if due > 0}
								<span class="tnum">{fmt(due)} due</span>
							{:else}
								Review
							{/if}
						</a>
						<a
							href={`${base}/account`}
							title="Your progress"
							class="inline-flex items-center gap-2 rounded-[3px] border border-line px-3 py-1.5 text-[11px] font-semibold tracking-wide text-ink2 transition-colors hover:border-ink hover:text-ink"
						>
							<span class="size-1.5 shrink-0 rounded-full bg-moss" aria-hidden="true"></span>
							<span class="max-w-[9rem] truncate">{data.user?.name ?? 'Account'}</span>
						</a>
					{:else}
						<a
							href={`${base}/login`}
							class="rounded-[3px] border border-line px-3 py-1.5 text-[11px] font-semibold tracking-wide text-ink2 transition-colors hover:border-ink hover:text-ink"
						>
							Sign in
						</a>
					{/if}
				</div>
			</div>

			<!-- controls -->
			<div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-2.5 border-t border-line py-2.5">
				<div class="flex flex-wrap items-center gap-x-6 gap-y-2.5">
					<Segmented
						label="Language"
						value={lang}
						onchange={setLang}
						options={[
							{ value: 'cn', label: '中文 · Chinese' },
							{ value: 'jp', label: '日本語 · Japanese' }
						]}
					/>
					{#if lang === 'cn'}
						<Segmented
							label="Script"
							value={script}
							onchange={setScript}
							options={CN_SCRIPTS.map((s) => ({
								value: s,
								label: s === 'simp' ? 'Simplified' : 'Traditional'
							}))}
						/>
					{/if}
					<Segmented
						label="Order"
						value={order}
						onchange={setOrder}
						options={[
							{ value: 'orig', label: 'Original' },
							{ value: 'opt', label: 'Optimised' }
						]}
					/>
					{#if signedIn}
						<Segmented
							label="Marks"
							value={progressFilter}
							onchange={(v) => (progressFilter = v as ProgressFilter)}
							options={[
								{ value: 'all', label: 'All' },
								{ value: 'learning', label: 'Learning' },
								{ value: 'known', label: 'Known' }
							]}
						/>
					{/if}
					<p class="eyebrow hidden lg:block">
						{order === 'orig' ? 'as numbered in the book' : 're-sequenced for learning'} ·
						{#if isPlaceholder(curriculum)}
							japanese · placeholder deck
						{:else}
							{curriculumLabel(curriculum)} script
						{/if}
					</p>
				</div>
				<p class="eyebrow tnum" aria-live="polite">
					{#if loading}
						loading index…
					{:else if query || (signedIn && progressFilter !== 'all')}
						{fmt(list.length)} of {fmt(total)} {curriculumLabel(curriculum)} characters
					{:else}
						{fmt(total)} {curriculumLabel(curriculum)} characters
					{/if}
				</p>

				<label class="relative block w-full md:hidden">
					<span class="sr-only">Search characters</span>
					<span class="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-faint" aria-hidden="true">
						<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.6" stroke="currentColor" /><path d="M9.6 9.6L13 13" stroke="currentColor" stroke-linecap="round" /></svg>
					</span>
					<input
						type="search"
						value={query}
						oninput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
						placeholder="search keyword, reading, meaning…"
						class="w-full border-b border-line bg-transparent py-1.5 pl-5 pr-8 text-sm text-ink outline-none transition-colors placeholder:text-faint focus:border-ink"
					/>
					{#if query}
						<button
							type="button"
							aria-label="Clear search"
							onclick={() => setQuery('')}
							class="absolute right-0 top-1/2 -translate-y-1/2 cursor-pointer text-faint transition-colors hover:text-ink"
						>
							<svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.4" /></svg>
						</button>
					{/if}
				</label>
			</div>
		</div>
	</header>

	<main>
		<!-- statement -->
		<section class="relative px-5 pb-10 pt-12 md:px-8 md:pb-14 md:pt-20 bg-cover bg-center">
			<!-- swallow flight in the hero's upper margin -->
	<!-- 		<div class="deco right-1 top-1 hidden aspect-[150/64] w-40 md:block lg:w-56 lg:right-8" aria-hidden="true">
				<Birds opacity={0.9} className="h-full w-full" />
			</div>
 -->
			<div class="grid gap-10 md:grid-cols-[1.25fr_0.75fr] md:gap-16">
				<div class="relative">
					<h1 class="serif-word relative text-[2.6rem] font-light leading-[1.04] tracking-[-0.01em] md:text-[4.2rem]">
						PINE-<span class="tech-word font-medium text-moss">3000</span>
					</h1>
					<p class="mt-7 max-w-xl text-[15px] leading-relaxed text-ink2 md:text-base">
						All {loading ? 'three thousand' : fmt(countTrad)} frames of <em>Remembering the Hanzi</em> 1 &amp; 2 —
						the traditional characters — together with the {loading ? 'three thousand' : fmt(countSimp)} frames of
						<em>Remembering Simplified Hanzi</em>. Flip between languages, scripts and orders; click a character to hear its
						reading, coloured by tone.
					</p>
					<p class="eyebrow tnum">
						{loading ? '…' : `${fmt(countTrad)} traditional · ${fmt(countSimp)} simplified · ${fmt(countJp)} japanese`}{' '}
						· press <kbd class="rounded border border-line px-1 py-px text-[9px] text-ink2">/</kbd> to search
					</p>

					{#if isPlaceholder(curriculum)}
						<p class="mt-5 max-w-xl border-l-2 border-line pl-3 text-[12px] leading-relaxed text-ink2">
							The Japanese deck is not here yet — this view shows the {fmt(countJp)} traditional
							frames in its place, so the language switch is in position for the data.
						</p>
					{/if}

					{#if signedIn}
						<p class="eyebrow tnum mt-4">
							<a href={`${base}/account`} class="transition-colors hover:underline">
								<span class="text-moss">{fmt(marks.known)} known</span>
								<span class="text-faint"> · </span>
								<span class="text-tone-2">{fmt(marks.learning)} learning</span>
								{#if reviewsToday > 0}
									<span class="text-faint"> · </span>
									<span>{fmt(reviewsToday)} reviewed today</span>
								{/if}
								<span class="text-faint"> · </span>
								your index →
							</a>
						</p>
						{#if pending > 0}
							<p class="eyebrow mt-2 text-faint">saving…</p>
						{:else if progressNote}
							<p class="eyebrow mt-2 text-cinnabarink" role="status">{progressNote}</p>
						{/if}
					{:else}
						<p class="eyebrow mt-4">
							<a href={`${base}/signup`} class="text-moss hover:underline">create an account</a>
							<span class="text-faint"> to mark the characters you know and write your own stories</span>
						</p>
					{/if}
				</div>
			</div>
		</section>

		<!-- index -->
		<section class="mx-auto max-w-[1400px] px-0 md:px-8" aria-label="Character index">
			<div class="overflow-hidden border-t border-line md:rounded-t-[4px]">
				{#if loading}
					<div class="flex h-64 items-center justify-center gap-3 text-sm text-ink2">
						<span class="inline-block size-4 animate-spin rounded-full border border-faint border-t-ink" aria-hidden="true"></span>
						reading the index…
					</div>
				{:else if rows.length === 0}
					<div class="flex h-64 items-center justify-center text-sm text-ink2">
						The index could not be loaded. Try again later.
					</div>
				{:else if list.length === 0}
					<div class="flex h-64 flex-col items-center justify-center gap-2 text-center">
						<p class="serif-word text-2xl font-light">No characters match</p>
						<p class="eyebrow">try a keyword, a reading, or a meaning</p>
						<button type="button" onclick={() => setQuery('')} class="mt-3 cursor-pointer text-sm text-ink2 underline decoration-line underline-offset-4 hover:text-ink">clear search</button>
					</div>
				{:else}
					<div
						class="grid"
						style="grid-template-columns: repeat(auto-fill, minmax(5.6rem, 1fr));"
					>
						{#each shown as row (row.id)}
							<HanziCell
								row={row}
								curriculum={curriculum}
								active={row.id === selectedId}
								status={statusOf(progress, curriculum, row.id)}
								onclick={(id) => select(id)}
							/>
						{/each}
					</div>
					<div bind:this={sentinel} class="flex h-16 items-center justify-center gap-3 bg-paper text-[11px] tracking-wide text-faint">
						{#if loadedCount < list.length}
							<span class="inline-block size-3 animate-spin rounded-full border border-faint border-t-ink" aria-hidden="true"></span>
							scroll for more
						{:else}
							<span class="tnum">— {fmt(list.length)} {list.length === 1 ? 'character' : 'characters'} · {curriculumLabel(curriculum)} · {order === 'orig' ? 'original' : 'optimised'} order —</span>
						{/if}
					</div>
				{/if}
			</div>
		</section>

		<!-- footer -->
		<footer class="relative mx-auto max-w-[1400px] overflow-hidden px-5 pb-16 pt-14 md:px-8">
			<!-- faint deer watermark in the footer margin -->
			<div class="deco -right-8 -top-8 hidden text-[16rem] leading-none lg:block" aria-hidden="true">
				<InkCharacter char="鹿" opacity={0.05} blur={2.2} className="block" />
			</div>

			<div class="relative grid gap-6 border-t border-line pt-6 text-[12px] leading-relaxed text-ink2 sm:grid-cols-2 md:grid-cols-3">
				<p>
					<span class="eyebrow mb-2 block">About</span>
					Keywords follow James W. Heisig's <em>Remembering the Hanzi 1 &amp; 2</em> (traditional) and
					<em>Remembering Simplified Hanzi 1 &amp; 2</em>. Tone colours mark the four tones; neutral syllables stay grey.
					The Japanese view stands in for <em>Remembering the Kanji</em> until its deck arrives.
				</p>
				<p>
					<span class="eyebrow mb-2 block">Orders</span>
					<span class="tnum">Original</span> follows the frame numbers in the book. <span class="tnum">Optimised</span> re-sequences
					each book to defer lookalikes and overlapping characters until after their simpler relatives.
				</p>
				<p>
					<span class="eyebrow mb-2 block">Data</span>
					Generated from a merged RTH + RSH deck (<span class="tnum">{fmt(rows.length)}</span> entries) into a small JSON index.
					Components and stories await their own data; a story you write is yours, and stays with your account.
				</p>
			</div>

			<!-- deer signature strip -->
			<div class="relative mt-10 flex flex-wrap items-end justify-between gap-x-10 gap-y-6 border-t border-line pt-7">
				<p class="max-w-md text-[11px] leading-relaxed text-ink2">
					<span class="eyebrow mb-2 block text-moss">Deer-1 · nature × technology</span>
					TO FILL IN MEYSELF
				</p>
				<div class="flex items-center gap-8">
					<img src={Favicon} alt="" class="h-6 w-6 shrink-0" />
				</div>
			</div>
		</footer>
	</main>
</div>

{#if openRow}
	<HanziDetail
		rows={list}
		index={openIndex}
		curriculum={curriculum}
		signedIn={signedIn}
		status={openStatus}
		story={openStory}
		onmark={mark}
		onstory={saveStory}
		onclose={closeDetail}
		onselect={(i: number) => {
			selectedId = list[i].id;
		}}
	/>
{/if}
