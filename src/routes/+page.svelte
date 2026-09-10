<script lang="ts">
	import { onMount } from 'svelte';
	import Birds from '$lib/components/Birds.svelte';
	import BlossomBranch from '$lib/components/BlossomBranch.svelte';
	import DeerAntler from '$lib/components/DeerAntler.svelte';
	import DeerSeal from '$lib/components/DeerSeal.svelte';
	import HanziCell from '$lib/components/HanziCell.svelte';
	import HanziDetail from '$lib/components/HanziDetail.svelte';
	import InkCharacter from '$lib/components/InkCharacter.svelte';
	import Segmented from '$lib/components/Segmented.svelte';
	import ToneLegend from '$lib/components/ToneLegend.svelte';
	import {
		filterRows,
		inBook,
		loadRows,
		viewRows,
		type OrderMode,
		type RawRow,
		type Script
	} from '$lib/hanzi';

	const BATCH = 180;

	// ---- state -------------------------------------------------------------
	let rows: RawRow[] = $state([]);
	let loading = $state(true);
	let script = $state<Script>('trad');
	let order = $state<OrderMode>('orig');
	let query = $state('');
	let selectedId = $state<number | null>(null);
	let loadedCount = $state(BATCH);
	let ready = $state(false);
	let isDark = $state(false);
	let searchInput: HTMLInputElement | undefined = $state();
	let sentinel: HTMLDivElement | undefined = $state();
	let lastKey = '';

	// ---- derived -----------------------------------------------------------
	const ordered = $derived(viewRows(rows, script, order));
	const list = $derived(filterRows(ordered, query));
	const total = $derived(ordered.length);
	const shown = $derived(list.slice(0, loadedCount));
	const openIndex = $derived(selectedId != null ? list.findIndex((r) => r.id === selectedId) : -1);
	const openRow = $derived(openIndex >= 0 ? list[openIndex] : undefined);
	const countSimp = $derived(viewRows(rows, 'simp', 'orig').length);
	const countTrad = $derived(viewRows(rows, 'trad', 'orig').length);

	const fmt = (n: number) => n.toLocaleString('en-US');
	const hashFor = (s: Script, o: OrderMode, id: number | null) =>
		`#${s}/${o}${id != null ? `/${id}` : ''}`;

	// ---- load --------------------------------------------------------------
	onMount(() => {
		const h = parseHash(location.hash);
		if (h) {
			if (h.script === 'simp' || h.script === 'trad') script = h.script;
			if (h.order === 'orig' || h.order === 'opt') order = h.order;
		}
		loadRows().then((data) => {
			rows = data;
			loading = false;
			if (h?.id != null) {
				const target = data.find((r) => r.id === h.id);
				if (target && inBook(target, script)) selectedId = h.id;
			}
			ready = true;
		});
		// reflect the pre-paint theme (set in app.html) into state
		isDark = document.documentElement.classList.contains('dark');
		window.addEventListener('hashchange', onHashChange);
	});

	function parseHash(hash: string): { script: Script; order: OrderMode; id: number | null } | null {
		const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
		if (!parts.length) return null;
		const s = parts[0];
		if (s !== 'simp' && s !== 'trad') return null;
		return {
			script: s,
			order: parts[1] === 'opt' ? 'opt' : 'orig',
			id: parts[2] != null && /^\d+$/.test(parts[2]) ? Number(parts[2]) : null
		};
	}

	function onHashChange() {
		if (!ready) return;
		const h = parseHash(location.hash);
		if (!h) return;
		script = h.script;
		order = h.order;
		if (h.id != null && rows.some((r) => r.id === h.id && inBook(r, h.script))) {
			selectedId = h.id;
		} else {
			selectedId = null;
		}
	}

	// ---- theme -------------------------------------------------------------
	function toggleTheme() {
		const dark = !document.documentElement.classList.contains('dark');
		document.documentElement.classList.toggle('dark', dark);
		document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
		try {
			localStorage.setItem('hanzi-theme', dark ? 'dark' : 'light');
		} catch {
			/* ignore */
		}
		isDark = dark;
	}

	// ---- interaction -------------------------------------------------------
	function select(id: number) {
		selectedId = selectedId === id ? null : id;
	}
	function closeDetail() {
		selectedId = null;
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
		const key = `${script}|${order}|${query.trim()}`;
		if (key !== lastKey) {
			lastKey = key;
			loadedCount = BATCH;
		}
		if (ready) history.replaceState(null, '', hashFor(script, order, selectedId));
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
	<title>Deer-3000</title>
	<meta name="description" content="Deer-3000 - A site to accompany James Heisig's Remembering the Hanzi and Remembering the Kanji" />
</svelte:head>
<div class="relative min-h-screen overflow-x-clip bg-paper text-ink">
	<!-- page texture + framing -->
	<div class="bg-grain" aria-hidden="true"></div>
	<div class="page-mat hidden 2xl:block" aria-hidden="true"></div>

	<!-- calligraphy in the left page margin on very wide screens -->
	<div class="deco left-[calc(50vw-830px)] top-44 hidden text-[9.5rem] leading-none min-[1800px]:block" aria-hidden="true">
		<InkCharacter char="鹿" opacity={0.06} blur={2} />
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
						aria-label="Deer-1 — back to the top"
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

					<button
						type="button"
						onclick={toggleTheme}
						aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
						class="grid size-8 cursor-pointer place-items-center rounded-full border border-line text-ink2 transition-colors hover:border-ink hover:text-ink"
					>
						{#if isDark}
							<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="3.4" stroke="currentColor" /><path d="M8 0.8v2M8 13.2v2M0.8 8h2M13.2 8h2M2.4 2.4l1.4 1.4M12.2 12.2l1.4 1.4M13.6 2.4l-1.4 1.4M3.8 12.2l-1.4 1.4" stroke="currentColor" stroke-linecap="round" /></svg>
						{:else}
							<svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M14.2 9.3A6 6 0 0 1 6.7 1.8a6 6 0 1 0 7.5 7.5z" fill="currentColor" /></svg>
						{/if}
					</button>
				</div>
			</div>

			<!-- controls -->
			<div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-2.5 border-t border-line py-2.5">
				<div class="flex flex-wrap items-center gap-x-6 gap-y-2.5">
					<Segmented label="Order" value={order} onchange={setOrder} options={[{ value: 'orig', label: 'Original' }, { value: 'opt', label: 'Optimised' }]} />
					<Segmented label="Script" value={script} onchange={setScript} options={[{ value: 'simp', label: 'Simplified' }, { value: 'trad', label: 'Traditional' }]} />
					<p class="eyebrow hidden lg:block">
						{order === 'orig' ? 'as numbered in the book' : 're-sequenced for learning'} · {script === 'simp' ? 'simplified' : 'traditional'} script
					</p>
				</div>
				<p class="eyebrow tnum" aria-live="polite">
					{#if loading}
						loading index…
					{:else if query}
						{fmt(list.length)} of {fmt(total)} {script === 'simp' ? 'simplified' : 'traditional'} characters
					{:else}
						{fmt(total)} {script === 'simp' ? 'simplified' : 'traditional'} characters
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
						DEER-<span class="tech-word font-medium text-moss">3000</span>
					</h1>
					<p class="mt-7 max-w-xl text-[15px] leading-relaxed text-ink2 md:text-base">
						All {loading ? 'three thousand' : fmt(countTrad)} frames of <em>Remembering the Hanzi</em> 1 &amp; 2 —
						the traditional characters — together with the {loading ? 'three thousand' : fmt(countSimp)} frames of
						<em>Remembering Simplified Hanzi</em>. Flip between scripts and orders; click a character to hear its
						reading, coloured by tone.
					</p>
					<p class="eyebrow tnum">
						{loading ? '…' : `${fmt(countTrad)} traditional · ${fmt(countSimp)} simplified`}{' '}
						· press <kbd class="rounded border border-line px-1 py-px text-[9px] text-ink2">/</kbd> to search
					</p>
				</div>
									<!-- plum branch climbing the margin beside the statement -->
				<div class="deco bottom-[-10px] right-[-80px] hidden aspect-[260/300]  xl:block" aria-hidden="true">
						<BlossomBranch className="h-full w-full" />
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
								script={script}
								active={row.id === selectedId}
								onclick={(id) => select(id)}
							/>
						{/each}
					</div>
					<div bind:this={sentinel} class="flex h-16 items-center justify-center gap-3 bg-paper text-[11px] tracking-wide text-faint">
						{#if loadedCount < list.length}
							<span class="inline-block size-3 animate-spin rounded-full border border-faint border-t-ink" aria-hidden="true"></span>
							scroll for more
						{:else}
							<span class="tnum">— {fmt(list.length)} {list.length === 1 ? 'character' : 'characters'} · {script === 'simp' ? 'simplified' : 'traditional'} · {order === 'orig' ? 'original' : 'optimised'} order —</span>
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
				</p>
				<p>
					<span class="eyebrow mb-2 block">Orders</span>
					<span class="tnum">Original</span> follows the frame numbers in the book. <span class="tnum">Optimised</span> re-sequences
					each book to defer lookalikes and overlapping characters until after their simpler relatives.
				</p>
				<p>
					<span class="eyebrow mb-2 block">Data</span>
					Generated from a merged RTH + RSH deck (<span class="tnum">{fmt(rows.length)}</span> entries) into a small JSON index.
				</p>
			</div>

			<!-- deer signature strip -->
			<div class="relative mt-10 flex flex-wrap items-end justify-between gap-x-10 gap-y-6 border-t border-line pt-7">
				<p class="max-w-md text-[11px] leading-relaxed text-ink2">
					<span class="eyebrow mb-2 block text-moss">Deer-1 · nature × technology</span>
					Heisig's two primers, one quiet index — ink-brushed margins, blossoms, swallows and a deer, set against a
					digital typeface. <span class="tnum">鹿</span> for the deer.
				</p>
				<div class="flex items-center gap-8">
					<span class="hidden aspect-[150/64] w-36 sm:block" aria-hidden="true">
						<Birds opacity={0.5} className="h-full w-full" />
					</span>
					<span class="hidden aspect-[150/96] w-28 sm:block" aria-hidden="true">
						<DeerAntler opacity={0.85} className="h-full w-full" />
					</span>
					<DeerSeal size={48} />
				</div>
			</div>
		</footer>
	</main>
</div>

{#if openRow}
	<HanziDetail
		rows={list}
		index={openIndex}
		script={script}
		onclose={closeDetail}
		onselect={(i: number) => {
			selectedId = list[i].id;
		}}
	/>
{/if}
