// A deliberately small spaced-repetition scheduler.
//
// One card is one character in one curriculum. A card carries a *stage*, an
// integer along a fixed ladder of intervals, and the grade is a simple
// yes-or-no:
//
//   again → back to the learning step (10 minutes), the card lapses
//   good  → one step up the ladder
//
// Two grades rather than four: the learner only has to answer "did I know it?",
// and there is nothing to tune. No per-card ease factor, no fuzz, no interval
// multiplier — the intervals are fixed, the arithmetic is integer, and the next
// interval is predictable at a glance.
//
// A card graduates — and marks its character *known* — once it reaches
// `GRADUATED_STAGE` (30 days); a lapse on a graduated card drops it straight
// back to the learning step.
//
// Bump `LADDER` and a learner's existing stages keep their meaning: stage 1 is
// still "reviewed once, due tomorrow".
import { DAY_MS } from './day';

export type Rating = 'again' | 'good';

export const RATINGS: Rating[] = ['again', 'good'];

export const isRating = (v: unknown): v is Rating => RATINGS.includes(v as Rating);

/** The learning step: where a new card starts and where a lapse returns it. */
export const AGAIN_MINUTES = 10;

/** Interval in days for stage n ≥ 1 is `LADDER[n - 1]`. */
export const LADDER = [1, 3, 7, 14, 30, 60, 120, 240];

export const MAX_STAGE = LADDER.length;

/** Stage reached at 30 days — the point a character counts as known. */
export const GRADUATED_STAGE = LADDER.indexOf(30) + 1;

export const isGraduated = (stage: number) => stage >= GRADUATED_STAGE;

/** Days a stage schedules ahead; 0 while the card is still on a learning step. */
export const intervalDaysOf = (stage: number) => (stage >= 1 ? LADDER[Math.min(stage, MAX_STAGE) - 1] : 0);

export interface Schedule {
	stage: number;
	/** when the card next comes up */
	dueAt: number;
	/** whole days ahead, 0 for an intra-day learning step */
	intervalDays: number;
	/** true when this grade takes the card off the learning steps */
	graduated: boolean;
	/** true when the card fell back to the learning step from a reviewed state */
	lapsed: boolean;
}

/** Where a stage and a grade send a card, from `now`. */
export function schedule(stage: number, rating: Rating, now: number): Schedule {
	const before = Math.max(0, Math.min(stage, MAX_STAGE));

	let next: number;
	let dueAt: number;

	if (rating === 'again') {
		// A lapse, or a card that has not left the learning step yet.
		next = 0;
		dueAt = now + AGAIN_MINUTES * 60_000;
	} else {
		// Good: off the learning step on the first success, then one rung up.
		next = before === 0 ? 1 : Math.min(MAX_STAGE, before + 1);
		dueAt = now + intervalDaysOf(next) * DAY_MS;
	}

	return {
		stage: next,
		dueAt,
		intervalDays: intervalDaysOf(next),
		graduated: isGraduated(next),
		lapsed: rating === 'again' && before >= GRADUATED_STAGE
	};
}

/** The interval each grade would produce — the labels on the review buttons. */
export function previewIntervals(stage: number, now: number): Record<Rating, string> {
	const out = {} as Record<Rating, string>;
	for (const r of RATINGS) {
		const s = schedule(stage, r, now);
		out[r] = s.intervalDays > 0 ? formatDays(s.intervalDays) : formatMinutes(Math.round((s.dueAt - now) / 60_000));
	}
	return out;
}

export const formatMinutes = (minutes: number) =>
	minutes < 60 ? `${minutes}m` : `${Math.round(minutes / 60)}h`;

/** Compact interval: 1d · 30d · 2mo · 1.3y. */
export function formatDays(days: number): string {
	if (days < 30) return `${days}d`;
	if (days < 365) {
		const months = days / 30;
		return `${Number.isInteger(months) ? months : months.toFixed(1)}mo`;
	}
	return `${(days / 365).toFixed(1)}y`;
}

/** "in 10 minutes" / "tomorrow" / "in 3 days" — for the card's schedule line. */
export function formatDueIn(dueAt: number, now: number): string {
	const ms = dueAt - now;
	if (ms <= 0) return 'due now';
	const minutes = Math.round(ms / 60_000);
	if (minutes < 60) return `in ${minutes} min`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `in ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
	const days = Math.round(ms / DAY_MS);
	if (days === 1) return 'tomorrow';
	if (days < 30) return `in ${days} days`;
	const months = Math.round(days / 30);
	return `in ${months} ${months === 1 ? 'month' : 'months'}`;
}

/** One line describing where a card stands, for the queue and the summary. */
export function stageLabel(stage: number, dueAt: number, now: number): string {
	if (stage === 0) return dueAt <= now ? 'learning · due now' : `learning · ${formatDueIn(dueAt, now)}`;
	if (isGraduated(stage)) return `known · next ${formatDueIn(dueAt, now)}`;
	return `review · ${formatDueIn(dueAt, now)}`;
}
