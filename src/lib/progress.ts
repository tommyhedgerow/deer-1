// Study-progress vocabulary shared by the database layer and the index UI.
import type { Curriculum, RawRow } from './hanzi';

/** `known` — the character is learned; `learning` — still being worked on. */
export type ProgressStatus = 'known' | 'learning';

/** Marks keyed by `curriculum:hanziId`, so lookups while rendering stay O(1). */
export type ProgressMap = Record<string, ProgressStatus>;

export type ProgressFilter = 'all' | ProgressStatus;

export const PROGRESS_STATUSES: ProgressStatus[] = ['known', 'learning'];

/**
 * A mark belongs to one curriculum — traditional, simplified or japanese — so
 * learning a character in one of them never implies it in another.
 */
export const progressKey = (c: Curriculum, hanziId: number) => `${c}:${hanziId}`;

export const isStatus = (v: unknown): v is ProgressStatus => v === 'known' || v === 'learning';

export const statusOf = (map: ProgressMap, c: Curriculum, id: number): ProgressStatus | null =>
	map[progressKey(c, id)] ?? null;

/** Narrow an ordered view to the marks a learner has made. */
export function filterByStatus(
	rows: RawRow[],
	map: ProgressMap,
	c: Curriculum,
	filter: ProgressFilter
): RawRow[] {
	if (filter === 'all') return rows;
	return rows.filter((r) => map[progressKey(c, r.id)] === filter);
}
