<script lang="ts">
	// A year of study, one square per day — the GitHub contribution shape.
	//
	// Built from plain elements and theme colours: no SVG, no canvas. That keeps
	// it honest in both themes (the levels are the same green as the rest of the
	// site) and measurable — every square carries a real count in its label.
	import { weekdayIndex } from '$lib/day';

	let {
		days,
		today
	}: {
		/** dense run of UTC day keys, oldest first, ending today */
		days: { day: string; count: number }[];
		/** today's key — the last square, marked as such */
		today: string;
	} = $props();

	// Fixed thresholds rather than a scale against the busiest day: a single
	// review on a quiet week should not paint like fifty on a busy one.
	const LEVELS = [0, 5, 15, 30];
	const levelOf = (count: number) => {
		if (count <= 0) return 0;
		if (count >= LEVELS[3]) return 4;
		if (count >= LEVELS[2]) return 3;
		if (count >= LEVELS[1]) return 2;
		return 1;
	};

	/** Level 0 is the empty square; the rest deepen with the count. */
	const FILL = ['bg-ink/[0.06]', 'bg-moss/25', 'bg-moss/45', 'bg-moss/70', 'bg-moss'];

	const total = $derived(days.reduce((n, d) => n + d.count, 0));
	const active = $derived(days.filter((d) => d.count > 0).length);
	const busiest = $derived(days.reduce((best, d) => (d.count > best.count ? d : best), { day: today, count: 0 }));

	/** Pad the front so every column starts on a Monday. */
	const lead = $derived(days.length ? weekdayIndex(days[0].day) : 0);
	const cells = $derived([...Array(lead).fill(null), ...days]);

	interface Cell {
		day: string;
		count: number;
	}

	const columns = $derived.by(() => {
		const out: Cell[][] = [];
		for (let i = 0; i < cells.length; i += 7) {
			out.push(cells.slice(i, i + 7) as Cell[]);
		}
		return out;
	});

	/** A column is labelled when it holds the first days of a month. */
	const monthLabels = $derived.by(() =>
		columns.map((col, i) => {
			const first = col.find((c) => c && new Date(`${c.day}T00:00:00Z`).getUTCDate() === 1);
			if (!first) return '';
			if (i > 0 && i < 3) return '';
			return new Date(`${first.day}T00:00:00Z`).toLocaleDateString('en-US', {
				month: 'short',
				timeZone: 'UTC'
			});
		})
	);

	const fmtDay = (day: string) =>
		new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			timeZone: 'UTC'
		});

	const summary = $derived(
		`Study history: ${total} review${total === 1 ? '' : 's'} on ${active} day${active === 1 ? '' : 's'} in the last year. Busiest day: ${fmtDay(busiest.day)} with ${busiest.count}.`
	);
</script>

<figure class="w-full">
	<figcaption class="eyebrow mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
		<span class="sr-only">{summary}</span>
		<span class="tnum text-ink2" aria-hidden="true">
			{total} review{total === 1 ? '' : 's'} · {active} day{active === 1 ? '' : 's'} studied
		</span>
	</figcaption>

	<!-- the grid scrolls on its own, so a narrow screen never widens the page -->
	<div class="overflow-x-auto pb-1">
		<div role="img" aria-label={summary} class="w-max">
			<div class="mb-1 flex gap-[3px]" aria-hidden="true">
				<span class="w-7 shrink-0"></span>
				{#each columns as _, i (i)}
					<span class="w-[11px] shrink-0 text-[8px] leading-none tracking-[0.08em] text-faint">
						{(monthLabels[i] ?? '').toUpperCase()}
					</span>
				{/each}
			</div>

			<div class="flex gap-[3px]" aria-hidden="true">
				<div class="flex w-7 shrink-0 flex-col gap-[3px] text-[8px] leading-none text-faint">
					{#each ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'] as label, i (i)}
						<span class="flex h-[11px] items-center">{label}</span>
					{/each}
				</div>

				{#each columns as col, i (i)}
					<div class="flex shrink-0 flex-col gap-[3px]">
						{#each Array(7) as _, row (row)}
							{@const cell = col[row]}
							{#if cell}
								<span
									class={[
										'size-[11px] rounded-[2px] transition-colors',
										FILL[levelOf(cell.count)],
										cell.day === today ? 'ring-1 ring-ink/40' : ''
									].join(' ')}
									title={`${fmtDay(cell.day)} — ${cell.count} review${cell.count === 1 ? '' : 's'}`}
								></span>
							{:else}
								<span class="size-[11px]"></span>
							{/if}
						{/each}
					</div>
				{/each}
			</div>
		</div>
	</div>

	<p class="eyebrow mt-3 flex items-center gap-2" aria-hidden="true">
		less
		{#each FILL as fill, i (i)}
			<span class={['size-[11px] rounded-[2px]', fill].join(' ')}></span>
		{/each}
		more
		<span class="ml-3 normal-case tracking-normal">one square per UTC day</span>
	</p>
</figure>
