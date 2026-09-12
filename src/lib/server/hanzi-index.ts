// The generated deck, read once per process.
//
// The JSON lives in `static/`, so it is fetched over HTTP rather than read from
// disk: that resolves correctly in dev and under a serverless adapter alike.
import { orderKey, type Curriculum, type OrderMode, type RawRow } from '$lib/hanzi';

export type HanziTotals = Record<Curriculum, number>;

let cached: Promise<RawRow[]> | null = null;

/** The whole deck. Cached for the life of the process. */
export function hanziRows(fetchFn: typeof fetch): Promise<RawRow[]> {
	if (!cached) {
		cached = (async () => {
			const res = await fetchFn('/data/hanzi.json');
			if (!res.ok) throw new Error(`hanzi index: HTTP ${res.status}`);
			return (await res.json()) as RawRow[];
		})();
		// A transient failure must not poison the cache for later requests.
		cached.catch(() => {
			cached = null;
		});
	}
	return cached;
}

/**
 * Number of teaching frames in each book.
 *
 * Japanese has no deck of its own yet, so its total mirrors the traditional
 * one — the same placeholder the index renders.
 */
export async function hanziTotals(fetchFn: typeof fetch): Promise<HanziTotals> {
	const rows = await hanziRows(fetchFn);
	let trad = 0;
	let simp = 0;
	for (const r of rows) {
		if (r.nr != null) trad++;
		if (r.ns != null) simp++;
	}
	return { trad, simp, jp: trad };
}

/**
 * Deck row ids of one curriculum in the order a learner meets them (their book
 * frame, then the optimised order as a tie-break). This is the order new cards
 * are introduced in, so a course follows the book.
 */
export async function hanziOrder(
	fetchFn: typeof fetch,
	curriculum: Curriculum,
	mode: OrderMode = 'orig'
): Promise<number[]> {
	const rows = await hanziRows(fetchFn);
	return rows
		.filter((r) => (curriculum === 'simp' ? r.ns != null : r.nr != null))
		.sort((a, b) => orderKey(a, curriculum, mode) - orderKey(b, curriculum, mode))
		.map((r) => r.id);
}
