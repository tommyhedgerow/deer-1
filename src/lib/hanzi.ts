// Typed access to the generated hanzi index (static/data/hanzi.json).
// Each JSON row is a merged RTH (traditional) + RSH (simplified) teaching entry.
import { base } from '$app/paths';
import { parseSyllables, stripTones, type Syllable } from './pinyin';

export type Script = 'simp' | 'trad';
export type OrderMode = 'orig' | 'opt';

export interface RawRow {
	id: number; // Orig Order (deck index; == RTH frame for traditional rows)
	th: string; // traditional form
	sh: string; // simplified form
	kr?: string; // RTH keyword
	ks?: string; // RSH keyword
	rr?: string; // RTH Read (primary reading, tone-marked)
	rt?: string; // TH Read (full traditional reading set, |-separated)
	pos?: string; // part(s) of speech
	mean?: string; // SH Freq Meaning (senses of the simplified char)
	py?: string; // SH Freq Pinyin (tone-numbered, /-separated)
	freq?: string; // SH Freq e.g. "0.16%"
	rank?: number; // SH Freq Rank
	grp?: number; // SH Freq Group
	nr?: number; // RTH frame number (absent → not in the RTH curriculum)
	ns?: number; // RSH frame number (absent → not in the RSH curriculum)
	or?: number; // Opt RTH (optimised RTH order position)
	os?: number; // Opt RSH (optimised RSH order position)
	lr?: string; // RTH Lesson
	lrm?: string; // RTH Merge Lesson
	ls?: string; // RSH Lesson
	lsm?: string; // RSH Lesson Merged
}

export const bookOf = (s: Script) => (s === 'simp' ? 'RSH' : 'RTH');
export const charOf = (r: RawRow, s: Script) => (s === 'simp' ? r.sh : r.th);
export const otherCharOf = (r: RawRow, s: Script) => (s === 'simp' ? r.th : r.sh);
export const kwOf = (r: RawRow, s: Script) => (s === 'simp' ? r.ks ?? '' : r.kr ?? '');
export const frameOf = (r: RawRow, s: Script) => (s === 'simp' ? r.ns : r.nr);
export const optOf = (r: RawRow, s: Script) => (s === 'simp' ? r.os : r.or);
export const lessonOf = (r: RawRow, s: Script) => (s === 'simp' ? r.ls ?? '' : r.lr ?? '');
export const lessonMergedOf = (r: RawRow, s: Script) => (s === 'simp' ? r.lsm ?? '' : r.lrm ?? '');
export const sameForm = (r: RawRow) => r.th === r.sh;
/** Does this row also belong to the other book's curriculum? */
export const inOtherBook = (r: RawRow, s: Script) => (s === 'simp' ? r.nr != null : r.ns != null);

/** A row belongs to a curriculum when its frame number is present. */
export function inBook(r: RawRow, s: Script): boolean {
	return frameOf(r, s) != null;
}

/** Sort key inside a curriculum view. */
export function orderKey(r: RawRow, s: Script, mode: OrderMode): number {
	if (mode === 'opt') {
		const o = optOf(r, s);
		if (typeof o === 'number') return o;
	}
	const f = frameOf(r, s);
	return typeof f === 'number' ? f : Number.MAX_SAFE_INTEGER;
}

/** Build the ordered view for a curriculum + ordering. */
export function viewRows(rows: RawRow[], s: Script, mode: OrderMode): RawRow[] {
	return rows.filter(inBookCurried(s)).sort((a, b) => orderKey(a, s, mode) - orderKey(b, s, mode));
}

const inBookCurried = (s: Script) => (r: RawRow) => inBook(r, s);

interface Searchable {
	kw: string;
	char: string;
	reads: string;
	mean: string;
	pos: string;
}

const searchCache = new WeakMap<RawRow, Searchable>();

function searchable(r: RawRow): Searchable {
	let s = searchCache.get(r);
	if (!s) {
		s = {
			kw: `${r.kr ?? ''} ${r.ks ?? ''}`.toLowerCase(),
			char: `${r.th}${r.sh}`,
			reads: stripTones(`${r.rr ?? ''} ${r.rt ?? ''} ${r.py ?? ''}`),
			mean: (r.mean ?? '').toLowerCase(),
			pos: (r.pos ?? '').toLowerCase()
		};
		searchCache.set(r, s);
	}
	return s;
}

/** Case/diacritic-insensitive filter over the given (already ordered) rows. */
export function filterRows(rows: RawRow[], query: string): RawRow[] {
	const q = query.trim().toLowerCase();
	if (!q) return rows;
	const qPlain = stripTones(q);
	const out: RawRow[] = [];
	for (const r of rows) {
		const s = searchable(r);
		if (
			s.kw.includes(q) ||
			s.char.includes(q) ||
			s.reads.includes(qPlain) ||
			s.mean.includes(q) ||
			s.pos.includes(q)
		) {
			out.push(r);
		}
	}
	return out;
}

/** Pretty-print a lesson code: 'RTH1-L04' → 'book 1 · lesson 4'. */
export function formatLesson(l: string): string {
	const m = l.match(/^(?:RTH|RSH)(\d+)-(?:L(\d+)|(.*))$/);
	if (!m) return l;
	const vol = m[1];
	if (m[2]) return `book ${vol} · lesson ${Number(m[2])}`;
	return `book ${vol} · ${(m[3] ?? '').toLowerCase()}`;
}

/** Split a meaning string into individual senses ('/' then ',' separators). */
export function splitSenses(str: string): string[] {
	if (!str) return [];
	const parts = str.split('/');
	const out: string[] = [];
	for (const part of parts) {
		let depth = 0;
		let cur = '';
		for (const ch of part.trim()) {
			if (ch === '(') depth++;
			if (ch === ')') depth--;
			if (ch === ',' && depth === 0) {
				const t = cur.trim();
				if (t) out.push(t);
				cur = '';
			} else {
				cur += ch;
			}
		}
		const t = cur.trim();
		if (t) out.push(t);
	}
	// drop immediate repeats such as "to know/to understand/to know"
	return out.filter((v, i) => i === 0 || v !== out[i - 1]);
}

export interface ReadingSet {
	/** the reading tied to the Heisig keyword (RTH Read) */
	taught: Syllable[];
	/** other genuine readings of the displayed character */
	also: Syllable[];
}

function tokensOf(str: string): string[] {
	return str
		.split(/[|/]/)
		.map((x) => x.trim())
		.filter(Boolean);
}

/**
 * Readings shown in the detail panel.
 * `taught` — the single reading Heisig attaches to the keyword.
 * `also`  — remaining readings, scoped so the simplified character never
 *           inherits readings that only belong to its traditional twin.
 */
export function readingsFor(r: RawRow, s: Script): ReadingSet {
	const same = sameForm(r);
	const taught = parseSyllables(tokensOf(r.rr ?? ''));
	const have = new Set(taught.map((x) => `${x.letters}|${x.tone}`));

	const pool: string[] = [];
	if (s === 'trad') {
		pool.push(...tokensOf(r.rt ?? ''), ...tokensOf(r.py ?? ''));
	} else {
		pool.push(...tokensOf(r.py ?? ''));
		if (same) pool.push(...tokensOf(r.rt ?? ''));
	}
	const also = parseSyllables(pool).filter((x) => !have.has(`${x.letters}|${x.tone}`));
	return { taught, also };
}

let _rows: RawRow[] | null = null;

/** Fetch + cache the index. */
export async function loadRows(): Promise<RawRow[]> {
	if (_rows) return _rows;
	try {
		const res = await fetch(`${base}/data/hanzi.json`);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		_rows = (await res.json()) as RawRow[];
	} catch {
		_rows = [];
	}
	return _rows;
}
