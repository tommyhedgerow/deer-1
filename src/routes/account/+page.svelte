<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { base } from '$app/paths';
	import { authClient } from '$lib/auth-client';
	import Segmented from '$lib/components/Segmented.svelte';
	import StudyHeatmap from '$lib/components/StudyHeatmap.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import {
		CN_SCRIPTS,
		CURRICULA,
		charOf,
		curriculumLabel,
		curriculumOf,
		frameOf,
		inBook,
		kwOf,
		loadRows,
		type Curriculum,
		type Lang,
		type RawRow,
		type Script
	} from '$lib/hanzi';
	import type { ProgressFilter, ProgressStatus } from '$lib/progress';
	import {
		GROUP_LABEL,
		GROUP_ORDER,
		nextUp,
		type AchievementGroup,
		type AchievementProgress
	} from '$lib/achievements';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	/** The page is split into panels; each one owns a single subject. */
	const TABS = [
		{ id: 'progress', label: 'Progress' },
		{ id: 'study', label: 'Study' },
		{ id: 'achievements', label: 'Achievements' },
		{ id: 'settings', label: 'Settings' }
	] as const;
	type TabId = (typeof TABS)[number]['id'];
	const isTab = (v: string | null): v is TabId => TABS.some((t) => t.id === v);

	// A form result always belongs to the settings panel, where the actions are.
	let tab = $state<TabId>(
		untrack(() =>
			form?.cleared || form?.clearedStories || form?.clearedStudy
				? 'settings'
				: isTab(data.tab)
					? data.tab
					: 'progress'
		)
	);

	function setTab(id: TabId) {
		tab = id;
		// Query param, not the hash: it survives a reload and can be shared.
		history.replaceState(null, '', id === 'progress' ? location.pathname : `?tab=${id}`);
	}

	function onTabKey(event: KeyboardEvent, index: number) {
		if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
		event.preventDefault();
		const next = (index + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length;
		setTab(TABS[next].id);
		document.getElementById(`tab-${TABS[next].id}`)?.focus();
	}

	let rows = $state<RawRow[]>([]);
	/** Which language, and — while that is Chinese — which script. */
	let lang = $state<Lang>('cn');
	let script = $state<Script>('trad');
	let filter = $state<ProgressFilter>('all');
	let signingOut = $state(false);

	const curriculum = $derived<Curriculum>(curriculumOf(lang, script));

	// The deck index resolves marked ids to characters for the grid below.
	onMount(() => {
		loadRows().then((r) => (rows = r));
	});

	const byId = $derived(new Map(rows.map((r) => [r.id, r])));

	/** Marks for the chosen curriculum, most recent first, resolved to deck rows. */
	const marked = $derived(
		data.entries
			.filter((e) => e.script === curriculum && (filter === 'all' || e.status === filter))
			.map((e) => {
				const row = byId.get(e.hanziId);
				return row && inBook(row, curriculum) ? { row, status: e.status } : null;
			})
			.filter((x): x is { row: RawRow; status: ProgressStatus } => x !== null)
	);

	const counts = $derived(data.counts[curriculum]);
	const total = $derived(data.totals ? data.totals[curriculum] : null);
	const knownTotal = $derived(CURRICULA.reduce((n, c) => n + data.counts[c].known, 0));
	const learningTotal = $derived(CURRICULA.reduce((n, c) => n + data.counts[c].learning, 0));
	const nothingYet = $derived(knownTotal + learningTotal === 0);
	const inScript = $derived(data.entries.filter((e) => e.script === curriculum).length);
	const storyTotal = $derived(CURRICULA.reduce((n, c) => n + data.storyCounts[c], 0));

	const study = $derived(data.study);
	const dueTotal = $derived(
		study.queue.trad.due + study.queue.simp.due + study.queue.jp.due
	);
	const awarded = $derived(data.awards);
	const nextTier = $derived(nextUp(awarded.list));

	/** The award ladders, grouped for display. */
	const awardGroups = $derived(
		GROUP_ORDER.map((group) => ({
			group: group as AchievementGroup,
			label: GROUP_LABEL[group],
			items: awarded.list.filter((p) => p.achievement.group === group)
		})).filter((g) => g.items.length)
	);

	const earnedOf = (list: AchievementProgress[]) => list.filter((p) => p.earned).length;

	const label = (c: Curriculum) =>
		c === 'trad' ? 'Traditional · RTH' : c === 'simp' ? 'Simplified · RSH' : 'Japanese · RTK';
	const fmt = (n: number) => n.toLocaleString('en-US');
	const pct = (n: number) => (total ? Math.min(100, (n / total) * 100) : 0);

	async function signOut() {
		if (signingOut) return;
		signingOut = true;
		try {
			await authClient.signOut();
			await invalidateAll();
			await goto(`${base}/`);
		} finally {
			signingOut = false;
		}
	}
</script>

<svelte:head>
	<title>Your index — Deer-1</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="relative min-h-screen overflow-x-clip bg-paper text-ink">
	<div class="bg-grain" aria-hidden="true"></div>
	<div class="page-mat hidden 2xl:block" aria-hidden="true"></div>

	<header class="sticky top-0 z-40 border-b border-line backdrop-blur-md">
		<div class="mx-auto max-w-[1400px] px-5 md:px-8">
			<div class="flex items-center justify-between gap-4 py-3.5">
				<a href={`${base}/`} class="flex min-w-0 items-center gap-3" aria-label="Deer-1 — back to the index">
					<span class="char-hanzi serif-word text-moss text-2xl font-medium leading-none" lang="zh">鹿</span>
					<span class="eyebrow hidden sm:block">Deer-1</span>
				</a>
				<div class="flex items-center gap-3">
					<ThemeToggle />
					<a
						href={`${base}/review`}
						class="rounded-[3px] border border-line px-3 py-1.5 text-[11px] font-semibold tracking-wide text-ink2 transition-colors hover:border-ink hover:text-ink"
					>
						{#if dueTotal > 0}
							<span class="tnum">{fmt(dueTotal)} due</span>
						{:else}
							Review
						{/if}
					</a>
				</div>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-[1400px] px-5 pb-24 pt-12 md:px-8">
		<!-- who -->
		<section class="flex flex-wrap items-start justify-between gap-8">
			<div>
				<p class="eyebrow mb-4">Your index</p>
				<h1 class="serif-word text-[2.4rem] font-light leading-[1.05] tracking-[-0.01em] md:text-5xl">
					{data.user?.name ?? 'Your account'}
				</h1>
				<p class="mt-4 max-w-lg text-sm leading-relaxed text-ink2">
					Everything you have marked, written and reviewed — the characters, the heatmap, the
					ladders and the account itself, each on its own tab.
				</p>
			</div>
		</section>

		{#if form?.cleared}
			<p role="status" class="mt-8 border-l-2 border-moss bg-moss/[0.07] px-3.5 py-2.5 text-[12px] text-mossink">
				{form.cleared === 'all' ? 'Cleared every mark.' : `Cleared your ${label(form.cleared as Curriculum)} marks.`}
			</p>
		{:else if form?.clearedStories}
			<p role="status" class="mt-8 border-l-2 border-moss bg-moss/[0.07] px-3.5 py-2.5 text-[12px] text-mossink">
				Cleared every story. Your marks are untouched.
			</p>
		{:else if form?.clearedStudy}
			<p role="status" class="mt-8 border-l-2 border-moss bg-moss/[0.07] px-3.5 py-2.5 text-[12px] text-mossink">
				{form.clearedStudy === 'cards'
					? 'Cleared every card. Your review history and heatmap are untouched.'
					: form.clearedStudy === 'log'
						? 'Cleared the review log. Your cards and their schedules are untouched.'
						: 'Cleared every card and the whole review log.'}
			</p>
		{/if}

		<!-- panels -->
		<div
			class="mt-10 flex flex-wrap gap-x-1 gap-y-2 border-b border-line"
			role="tablist"
			aria-label="Account sections"
		>
			{#each TABS as t, i (t.id)}
				<button
					type="button"
					id={`tab-${t.id}`}
					role="tab"
					aria-selected={tab === t.id}
					aria-controls={`panel-${t.id}`}
					tabindex={tab === t.id ? 0 : -1}
					onclick={() => setTab(t.id)}
					onkeydown={(e) => onTabKey(e, i)}
					class={[
						'-mb-px cursor-pointer border-b-2 px-4 py-2.5 text-[12px] font-semibold tracking-wide transition-colors',
						tab === t.id
							? 'border-moss text-ink'
							: 'border-transparent text-ink2 hover:border-line hover:text-ink'
					].join(' ')}
				>
					{t.label}
				</button>
			{/each}
		</div>

		<!-- tallies -->
		<div
			id="panel-progress"
			role="tabpanel"
			aria-labelledby="tab-progress"
			hidden={tab !== 'progress'}
		>
			<section class="mt-12" aria-label="Progress at a glance">
				<dl class="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
					<div class="bg-paper px-4 py-6 text-center">
						<dt class="eyebrow mb-2">Known</dt>
						<dd class="tnum text-3xl font-light text-moss">{fmt(knownTotal)}</dd>
					</div>
					<div class="bg-paper px-4 py-6 text-center">
						<dt class="eyebrow mb-2">Learning</dt>
						<dd class="tnum text-3xl font-light">{fmt(learningTotal)}</dd>
					</div>
					{#each CURRICULA as c (c)}
						<div class="bg-paper px-4 py-6 text-center">
							<dt class="eyebrow mb-2">{c === 'trad' ? 'Traditional' : c === 'simp' ? 'Simplified' : 'Japanese'}</dt>
							<dd class="tnum text-3xl font-light">
								{data.totals ? `${Math.round((data.counts[c].known / (data.totals[c] || 1)) * 100)}%` : '—'}
							</dd>
						</div>
					{/each}
				</dl>

				<div class="mt-8 grid gap-8 border-t border-line pt-8 sm:grid-cols-3">
					{#each CURRICULA as s (s)}
						{@const c = data.counts[s]}
						{@const t = data.totals ? data.totals[s] : null}
						<div>
							<div class="mb-3 flex items-baseline justify-between gap-4">
								<p class="eyebrow">{label(s)}</p>
								<p class="eyebrow tnum">
									{#if t}
										{fmt(c.known + c.learning)} of {fmt(t)}
									{:else}
										{fmt(c.known + c.learning)} marked
									{/if}
								</p>
							</div>
							<div class="h-1.5 w-full overflow-hidden bg-ink/[0.08]">
								<div class="flex h-full">
									<div class="h-full bg-moss" style="width:{(t ? (c.known / t) * 100 : 0).toFixed(2)}%"></div>
									<div class="h-full bg-tone-2" style="width:{(t ? (c.learning / t) * 100 : 0).toFixed(2)}%"></div>
								</div>
							</div>
							<p class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-ink2">
								<span class="flex items-center gap-2"><span class="size-2 bg-moss" aria-hidden="true"></span>{fmt(c.known)} known</span>
								<span class="flex items-center gap-2"><span class="size-2 bg-tone-2" aria-hidden="true"></span>{fmt(c.learning)} learning</span>
							</p>
						</div>
					{/each}
				</div>
			</section>

		<!-- the marks themselves -->
		<section class="mt-16" aria-label="Marked characters">

			<div class="flex flex-wrap items-end justify-between gap-x-8 gap-y-5 border-b border-line pb-5">
				<div class="flex flex-wrap items-center gap-x-6 gap-y-3">
					<h2 class="serif-word text-2xl font-light">Your characters</h2>
					<Segmented
						label="Language"
						value={lang}
						onchange={(v) => (lang = v as Lang)}
						options={[
							{ value: 'cn', label: '中文 · Chinese' },
							{ value: 'jp', label: '日本語 · Japanese' }
						]}
					/>
					{#if lang === 'cn'}
						<Segmented
							label="Script"
							value={script}
							onchange={(v) => (script = v as Script)}
							options={CN_SCRIPTS.map((sc) => ({
								value: sc,
								label: sc === 'trad' ? 'Traditional' : 'Simplified'
							}))}
						/>
					{/if}
					<Segmented
						label="Show"
						value={filter}
						onchange={(v) => (filter = v as ProgressFilter)}
						options={[
							{ value: 'all', label: 'All' },
							{ value: 'known', label: 'Known' },
							{ value: 'learning', label: 'Learning' }
						]}
					/>
				</div>
				<p class="eyebrow tnum">{fmt(marked.length)} shown</p>
			</div>

			{#if nothingYet}
				<div class="flex flex-col items-center gap-3 border-b border-line px-6 py-20 text-center">
					<p class="serif-word text-2xl font-light">Nothing marked yet</p>
					<p class="eyebrow">open a character and mark it as learning or known</p>
					<a
						href={`${base}/`}
						class="mt-3 rounded-[3px] bg-ink px-4 py-2.5 text-xs font-semibold text-paper transition-opacity hover:opacity-90"
					>
						Go to the character index
					</a>
				</div>
			{:else if marked.length === 0}
				<div class="flex flex-col items-center gap-3 border-b border-line px-6 py-20 text-center">
					<p class="serif-word text-2xl font-light">Nothing here</p>
					<p class="eyebrow">
						{inScript === 0 ? `no ${curriculumLabel(curriculum)} marks yet` : 'no marks match this filter'}
					</p>
					<a href={`${base}/#${curriculum}/orig`} class="mt-2 text-sm text-ink2 underline decoration-line underline-offset-4 hover:text-ink">
						browse {curriculumLabel(curriculum)} characters
					</a>
				</div>
			{:else}
				<div class="grid" style="grid-template-columns: repeat(auto-fill, minmax(5.6rem, 1fr));">
					{#each marked as m (m.row.id)}
						{@const frame = frameOf(m.row, curriculum)}
						<a
							href={`${base}/#${curriculum}/orig/${m.row.id}`}
							class="group flex min-h-[6.5rem] flex-col items-center justify-between border-r border-b border-line px-2 pb-2 pt-3.5 text-center transition-colors hover:bg-ink/[0.035] md:min-h-[7.5rem]"
							title={`${kwOf(m.row, curriculum) || 'no keyword'}${frame != null ? ` · frame ${frame}` : ''} — open in the index`}
						>
							<span
								class={['tnum text-[10px] leading-none tracking-[0.14em] md:text-[11px]', m.status === 'known' ? 'text-moss' : 'text-tone-2']}
							>
								{frame != null ? String(frame).padStart(4, '0') : '—'}
							</span>
							<span class="char-hanzi select-none text-[2rem] leading-none transition-transform duration-200 ease-out group-hover:scale-[1.06] md:text-[2.35rem]" lang="zh">
								{charOf(m.row, curriculum)}
							</span>
							<span class="flex max-w-full items-center gap-1.5">
								<span
									class={['size-1.5 shrink-0 rounded-full', m.status === 'known' ? 'bg-moss' : 'bg-tone-2']}
									aria-hidden="true"
								></span>
								<span class="truncate text-[10px] font-medium leading-tight tracking-[0.02em] text-ink2 group-hover:text-ink md:text-[11px]">
									{kwOf(m.row, curriculum) || '\u00a0'}
								</span>
							</span>
						</a>
					{/each}
				</div>
				{#if rows.length === 0}
					<p class="border-b border-line py-4 text-center text-[11px] tracking-wide text-faint">
						resolving characters from the index…
					</p>
				{/if}
			{/if}
			</section>
		</div>
		<div
			id="panel-study"
			role="tabpanel"
			aria-labelledby="tab-study"
			hidden={tab !== 'study'}
		>
			<section class="mt-16" aria-label="Study history">
				<div class="flex flex-wrap items-end justify-between gap-x-8 gap-y-5 border-b border-line pb-5">
					<div>
						<p class="eyebrow mb-3">Study</p>
						<h2 class="serif-word text-2xl font-light">Days and reviews</h2>
					</div>
					<div class="flex flex-wrap items-center gap-x-8 gap-y-4">
						<dl class="flex flex-wrap gap-x-7 gap-y-3">
							<div>
								<dt class="eyebrow mb-1">Today</dt>
								<dd class="tnum text-xl font-light">{fmt(study.reviewsToday)}</dd>
							</div>
							<div>
								<dt class="eyebrow mb-1">Streak</dt>
								<dd class="tnum text-xl font-light text-moss">{fmt(study.streak)}<span class="text-xs text-faint"> d</span></dd>
							</div>
							<div>
								<dt class="eyebrow mb-1">Longest</dt>
								<dd class="tnum text-xl font-light">{fmt(study.longestStreak)}<span class="text-xs text-faint"> d</span></dd>
							</div>
							<div>
								<dt class="eyebrow mb-1">Reviews</dt>
								<dd class="tnum text-xl font-light">{fmt(study.totalReviews)}</dd>
							</div>
							<div>
								<dt class="eyebrow mb-1">Days studied</dt>
								<dd class="tnum text-xl font-light">{fmt(study.activeDays)}</dd>
							</div>
							{#if study.totalReviews > 0}
								<div>
									<dt class="eyebrow mb-1">Known it</dt>
									<dd class="tnum text-xl font-light">{Math.round(study.accuracy * 100)}%</dd>
								</div>
							{/if}
						</dl>
						<a
							href={`${base}/review`}
							class="rounded-[3px] bg-ink px-3.5 py-2 text-[11px] font-semibold text-paper transition-opacity hover:opacity-90"
						>
							{#if study.queue.trad.due + study.queue.simp.due + study.queue.jp.due > 0}
								Review {fmt(study.queue.trad.due + study.queue.simp.due + study.queue.jp.due)} due
							{:else}
								Start a review session
							{/if}
						</a>
					</div>
				</div>

				<div class="pt-7">
					<StudyHeatmap days={study.heatmap} today={data.today} />
				</div>

				<div class="mt-8 grid gap-6 border-t border-line pt-7 sm:grid-cols-3">
					{#each CURRICULA as c (c)}
						{@const q = study.queue[c]}
						<div>
							<p class="eyebrow mb-3">{label(c)}</p>
							<p class="text-[12px] leading-relaxed text-ink2">
								<span class="tnum text-ink">{fmt(q.due)}</span> due ·
								<span class="tnum text-ink">{fmt(q.learning)}</span> learning ·
								<span class="tnum text-ink">{fmt(q.known)}</span> known ·
								<span class="tnum text-ink">{fmt(q.newAvailable)}</span> unstudied
							</p>
						</div>
					{/each}
				</div>
			</section>
		</div>

		<!-- achievements -->
		<div
			id="panel-achievements"
			role="tabpanel"
			aria-labelledby="tab-achievements"
			hidden={tab !== 'achievements'}
		>
			<section class="mt-16" aria-label="Achievements">
				<div class="flex flex-wrap items-end justify-between gap-x-8 gap-y-5 border-b border-line pb-5">
					<div>
						<p class="eyebrow mb-3">Achievements</p>
						<h2 class="serif-word text-2xl font-light">
							{fmt(awarded.earned)}<span class="text-lg text-faint"> / {fmt(awarded.total)}</span>
						</h2>
					</div>
					{#if nextTier}
						<div class="w-full max-w-sm">
							<p class="flex items-baseline justify-between gap-4 text-[12px]">
								<span class="font-semibold">Next: {nextTier.achievement.title}</span>
								<span class="tnum text-ink2">{fmt(nextTier.current)} / {fmt(nextTier.target)}</span>
							</p>
							<div class="mt-2 h-1.5 w-full overflow-hidden bg-ink/[0.08]">
								<div class="h-full bg-moss" style="width:{(nextTier.ratio * 100).toFixed(1)}%"></div>
							</div>
							<p class="eyebrow mt-2">{nextTier.achievement.detail}</p>
						</div>
					{:else}
						<p class="eyebrow text-moss">every tier reached</p>
					{/if}
				</div>

				<div class="mt-8 flex flex-col gap-10">
					{#each awardGroups as group (group.group)}
						<div>
							<div class="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
								<h3 class="eyebrow text-ink2">{group.label}</h3>
								<p class="eyebrow tnum">{earnedOf(group.items)} / {group.items.length}</p>
							</div>
							<ul class="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
								{#each group.items as item (item.achievement.key)}
									<li>
										<div class="flex items-baseline justify-between gap-4">
											<span class={item.earned ? 'text-[13px] font-semibold text-moss' : 'text-[13px] text-ink2'}>
												{item.achievement.title}
											</span>
											<span class="eyebrow tnum shrink-0">
												{#if item.earned}
													{item.unlockedAt
														? new Date(item.unlockedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
														: 'earned'}
												{:else}
													{fmt(item.current)} / {fmt(item.target)}
												{/if}
											</span>
										</div>
										<div class="mt-1.5 h-[3px] w-full overflow-hidden bg-ink/[0.08]">
											<div
												class={item.earned ? 'h-full bg-moss' : 'h-full bg-moss/45'}
												style="width:{(item.ratio * 100).toFixed(1)}%"
											></div>
										</div>
									</li>
								{/each}
							</ul>
						</div>
					{/each}
				</div>
			</section>
		</div>


		<!-- settings: who you are, what you may clear, and the way out -->
		<div
			id="panel-settings"
			role="tabpanel"
			aria-labelledby="tab-settings"
			hidden={tab !== 'settings'}
		>
			<section class="mt-12 grid gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]" aria-label="Account">
				<div>
					<p class="eyebrow mb-4">Account</p>
					<dl class="divide-y divide-line border-y border-line text-sm">
						<div class="flex items-baseline justify-between gap-6 py-2.5">
							<dt class="eyebrow shrink-0">Name</dt>
							<dd class="truncate">{data.user?.name ?? '—'}</dd>
						</div>
						<div class="flex items-baseline justify-between gap-6 py-2.5">
							<dt class="eyebrow shrink-0">Email</dt>
							<dd class="truncate text-ink2">{data.user?.email}</dd>
						</div>
						{#if data.memberSince}
							<div class="flex items-baseline justify-between gap-6 py-2.5">
								<dt class="eyebrow shrink-0">Member since</dt>
								<dd>{data.memberSince}</dd>
							</div>
						{/if}
						<div class="flex items-baseline justify-between gap-6 py-2.5">
							<dt class="eyebrow shrink-0">Theme</dt>
							<dd><ThemeToggle /></dd>
						</div>
					</dl>
					<button
						type="button"
						onclick={signOut}
						disabled={signingOut}
						class="mt-6 cursor-pointer rounded-[3px] border border-line px-4 py-2.5 text-[11px] font-semibold tracking-wide text-ink2 transition-colors hover:border-cinnabar hover:text-cinnabarink disabled:opacity-50"
					>
						{signingOut ? 'Signing out…' : 'Sign out'}
					</button>
					<p class="mt-4 text-[11px] leading-relaxed text-ink2">
						Signing out leaves everything in place: marks, stories, cards and the review log stay
						with the account.
					</p>
				</div>

				<section class="flex flex-wrap items-end justify-between gap-x-10 gap-y-8" aria-label="Clear your data">
					<div class="flex max-w-2xl flex-col gap-8">
				<form method="POST" action="?/reset">
					<p class="eyebrow mb-3">Start over</p>
					<p class="mb-4 text-[12px] leading-relaxed text-ink2">
						Clearing marks cannot be undone. Your account and sign-in stay as they are, and your
						stories are left alone.
					</p>
					<div class="flex flex-wrap gap-2.5">
						<button
							type="submit"
							name="script"
							value={curriculum}
							onclick={(e) => {
								if (!confirm(`Clear all ${curriculumLabel(curriculum)} marks?`)) e.preventDefault();
							}}
							class="cursor-pointer rounded-[3px] border border-line px-3.5 py-2 text-[11px] font-semibold tracking-wide text-ink2 transition-colors hover:border-cinnabar hover:text-cinnabarink"
						>
							Clear {curriculumLabel(curriculum)} marks
						</button>
						<button
							type="submit"
							name="script"
							value=""
							onclick={(e) => {
								if (!confirm('Clear every mark, in every curriculum?')) e.preventDefault();
							}}
							class="cursor-pointer rounded-[3px] border border-line px-3.5 py-2 text-[11px] font-semibold tracking-wide text-ink2 transition-colors hover:border-cinnabar hover:text-cinnabarink"
						>
							Clear everything
						</button>
					</div>
				</form>

				<form method="POST" action="?/resetStudy">
					<p class="eyebrow mb-3">Study history</p>
					<p class="mb-4 text-[12px] leading-relaxed text-ink2">
						<span class="tnum text-ink">{fmt(study.queue.trad.cards + study.queue.simp.cards + study.queue.jp.cards)}</span>
						card(s) scheduled, <span class="tnum text-ink">{fmt(study.totalReviews)}</span> reviews logged across
						<span class="tnum text-ink">{fmt(study.activeDays)}</span> day(s). The two halves can be cleared
						apart: cards decide what comes up next, the log is what the heatmap and the streak count.
					</p>
					<div class="flex flex-wrap gap-2.5">
						<button
							type="submit"
							name="scope"
							value="cards"
							onclick={(e) => {
								if (!confirm('Clear every card? The heatmap and streak stay.')) e.preventDefault();
							}}
							class="cursor-pointer rounded-[3px] border border-line px-3.5 py-2 text-[11px] font-semibold tracking-wide text-ink2 transition-colors hover:border-cinnabar hover:text-cinnabarink"
						>
							Clear cards
						</button>
						<button
							type="submit"
							name="scope"
							value="log"
							onclick={(e) => {
								if (!confirm('Clear the whole review log? The heatmap, streak and review counts go with it.')) e.preventDefault();
							}}
							class="cursor-pointer rounded-[3px] border border-line px-3.5 py-2 text-[11px] font-semibold tracking-wide text-ink2 transition-colors hover:border-cinnabar hover:text-cinnabarink"
						>
							Clear review log
						</button>
					</div>
				</form>

				<form method="POST" action="?/resetStories">
					<p class="eyebrow mb-3">Your stories</p>
					<p class="mb-4 text-[12px] leading-relaxed text-ink2">
						<span class="tnum text-ink">{fmt(storyTotal)}</span>
						{storyTotal === 1 ? 'story' : 'stories'} written, across every curriculum. They are
						private to you, and no stories ship with the index yet.
					</p>
					<button
						type="submit"
						disabled={storyTotal === 0}
						onclick={(e) => {
							if (!confirm('Delete every story you have written? This cannot be undone.')) e.preventDefault();
						}}
						class="cursor-pointer rounded-[3px] border border-line px-3.5 py-2 text-[11px] font-semibold tracking-wide text-ink2 transition-colors hover:border-cinnabar hover:text-cinnabarink disabled:cursor-default disabled:opacity-50"
					>
						Delete all stories
					</button>
				</form>
			</div>

					<p class="max-w-xs text-[11px] leading-relaxed text-ink2">
						<span class="eyebrow mb-2 block text-moss">Deer-1 · nature × technology</span>
						Your marks, stories, cards and review history live with your account, separate from the
						shared character index.
					</p>
				</section>
			</section>
		</div>
	</main>
</div>
