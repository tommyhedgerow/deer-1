// Calendar helpers for study history.
//
// Days are counted in UTC, server-side and client-side alike: a review is filed
// under one day key, and the heatmap, the streak and the daily tallies must all
// agree on which day that is. The alternative — local days — would need the
// learner's timezone travelling with every write.

export const DAY_MS = 86_400_000;

/** `2026-03-14` for the UTC day a timestamp falls in. */
export function dayKey(at: number | Date): string {
	const d = at instanceof Date ? at : new Date(at);
	return d.toISOString().slice(0, 10);
}

/** Midnight UTC at the start of a day key, as a timestamp. */
export function startOfDay(day: string): number {
	return Date.parse(`${day}T00:00:00.000Z`);
}

/** The day `offset` days after `day` (offset may be negative). */
export function shiftDay(day: string, offset: number): string {
	return dayKey(startOfDay(day) + offset * DAY_MS);
}

/**
 * A dense run of day keys ending at `end`, oldest first — the shape the heatmap
 * wants, so gaps (days never studied) are present as zeroes.
 */
export function dayRange(end: string, length: number): string[] {
	const out: string[] = [];
	const last = startOfDay(end);
	for (let i = length - 1; i >= 0; i--) out.push(dayKey(last - i * DAY_MS));
	return out;
}

/** Monday-first weekday index, 0–6. */
export function weekdayIndex(day: string): number {
	return (new Date(startOfDay(day)).getUTCDay() + 6) % 7;
}
