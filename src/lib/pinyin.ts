// Pinyin helpers: tone detection/colouring, diacritic placement, tokenization.
export type Tone = 0 | 1 | 2 | 3 | 4;

export interface Syllable {
	/** display text (diacritics included) */
	text: string;
	/** plain base letters, e.g. 'jian', 'nüe' */
	letters: string;
	tone: Tone;
}

const BASE_VOWELS: Record<string, [string, Tone][]> = {
	a: [['a', 0], ['ā', 1], ['á', 2], ['ǎ', 3], ['à', 4]],
	e: [['e', 0], ['ē', 1], ['é', 2], ['ě', 3], ['è', 4]],
	i: [['i', 0], ['ī', 1], ['í', 2], ['ǐ', 3], ['ì', 4]],
	o: [['o', 0], ['ō', 1], ['ó', 2], ['ǒ', 3], ['ò', 4]],
	u: [['u', 0], ['ū', 1], ['ú', 2], ['ǔ', 3], ['ù', 4]],
	ü: [['ü', 0], ['ǖ', 1], ['ǘ', 2], ['ǚ', 3], ['ǜ', 4]]
};

/** marked char → [base, tone] */
const MARKS: Record<string, [string, Tone]> = {};
for (const [, list] of Object.entries(BASE_VOWELS)) {
	for (const [mark, tone] of list) {
		if (tone !== 0) MARKS[mark] = [list[0][0], tone];
	}
}

const COMBINING_RE = /[\u02c9\u02ca\u02c7\u02cb\u0304\u0301\u030c\u0300]/g;

/** Normalise one pinyin token ('jiàn', 'jian4', 'lüè', 'shang') to letters + tone. */
export function parseToken(raw: string): Syllable {
	let token = raw.trim().toLowerCase().replace(COMBINING_RE, '');
	let tone: Tone = 0;
	let hadNumber = false;
	const numMatch = token.match(/([1-5])$/);
	if (numMatch) {
		hadNumber = true;
		const n = Number(numMatch[1]);
		tone = n === 5 ? 0 : (n as Tone);
		token = token.slice(0, -1);
	}
	// Recover tone + base letters from embedded diacritics.
	let letters = '';
	for (const ch of token) {
		const m = MARKS[ch];
		letters += m ? m[0] : ch;
		if (!hadNumber && m && tone === 0) tone = m[1];
	}
	letters = letters.replace(/v/g, 'ü');
	// ASCII sources (with numbers) get their diacritics rendered.
	const text = hadNumber ? addToneMark(letters, tone) : token.replace(/v/g, 'ü');
	return { text, letters, tone };
}

/** Index + base of the vowel that should carry the tone mark. */
function vowelTarget(letters: string): { idx: number; base: string } | null {
	const idxs: { idx: number; base: string }[] = [];
	const seen = new Set<string>();
	for (let i = 0; i < letters.length; i++) {
		const ch = letters[i];
		const base = 'aeiouü'.includes(ch) ? ch : null;
		if (base) {
			idxs.push({ idx: i, base });
			seen.add(base);
		}
	}
	if (!idxs.length) return null;
	for (const base of ['a', 'e', 'o']) {
		if (seen.has(base)) {
			const cands = idxs.filter((x) => x.base === base);
			return cands[cands.length - 1];
		}
	}
	if (seen.has('ü')) return idxs.find((x) => x.base === 'ü')!;
	// i/u only — mark the last one ('iu' → u, 'ui' → i).
	return idxs[idxs.length - 1];
}

/** Render base letters with the tone mark for tone 1–4 (neutral → unchanged). */
export function addToneMark(lettersIn: string, tone: Tone): string {
	const letters = lettersIn.replace(/v/g, 'ü');
	if (tone === 0) return letters;
	const t = vowelTarget(letters);
	if (!t) return letters;
	const glyph = BASE_VOWELS[t.base][tone][0];
	return letters.slice(0, t.idx) + glyph + letters.slice(t.idx + 1);
}

/** Split a reading string like 'zhōng|zhòng' or 'gan1/gan4' into syllable tokens. */
export function splitReadings(str: string): string[] {
	if (!str) return [];
	return str
		.split(/[|/]/)
		.map((s) => s.trim())
		.filter(Boolean);
}

/** Parse tokens into syllables, de-duplicated by (letters, tone). */
export function parseSyllables(tokens: string[]): Syllable[] {
	const out: Syllable[] = [];
	const seen = new Set<string>();
	for (const t of tokens) {
		const s = parseToken(t);
		const key = `${s.letters}|${s.tone}`;
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(s);
	}
	return out;
}

/** Flatten pinyin to plain searchable letters: 'nǚ' → 'nu', 'jian4' → 'jian'. */
export function stripTones(input: string): string {
	return (input || '')
		.toLowerCase()
		.replace(/[0-5]/g, '')
		.replace(COMBINING_RE, '')
		.replace(/[āáǎà]/g, 'a')
		.replace(/[ēéěè]/g, 'e')
		.replace(/[īíǐì]/g, 'i')
		.replace(/[ōóǒò]/g, 'o')
		.replace(/[ūúǔù]/g, 'u')
		.replace(/[ǖǘǚǜ]/g, 'u')
		.replace(/[üv]/g, 'u');
}

/** The reading tokens that describe the character shown in the given script mode. */
export function readingTokens(
	raw: { rr?: string; rt?: string; py?: string },
	script: 'simp' | 'trad',
	sameForm: boolean
): string[] {
	const rr = raw.rr ?? '';
	const rt = raw.rt ?? '';
	const py = raw.py ?? '';
	if (script === 'trad') {
		// TH Read carries the full reading set of the traditional character.
		const set = splitReadings(rt);
		if (set.length) return set;
		return splitReadings(rr).length ? splitReadings(rr) : splitReadings(py);
	}
	// Simplified mode: frequency pinyin describes the simplified character itself.
	const set = splitReadings(py);
	if (set.length) return set;
	if (sameForm) return splitReadings(rt);
	return splitReadings(rr).length ? splitReadings(rr) : splitReadings(rt);
}
