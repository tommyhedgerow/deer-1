// Builds static/data/hanzi.json from the RTH+RSH CSV.
// Usage: node scripts/build-data.mjs [path-to-csv]
//
// Every curriculum the site offers is read from this one index: `trad` (RTH),
// `simp` (RSH) and — until a kanji deck of its own exists — `jp`, which the UI
// renders from the traditional fields as a placeholder.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const csvPath = resolve(process.argv[2] ?? root, process.argv[2] ? '' : 'Optimized Remembering the Hanzi - RTH + RSH.csv');

function parseCSV(text) {
	const rows = [];
	let row = [], field = '', inQ = false;
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if (inQ) {
			if (c === '"') {
				if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false;
			} else field += c;
		} else if (c === '"') {
			inQ = true;
		} else if (c === ',') {
			row.push(field); field = '';
		} else if (c === '\n' || c === '\r') {
			if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
		} else {
			field += c;
		}
	}
	if (field.length || row.length) { row.push(field); rows.push(row); }
	return rows;
}

const raw = readFileSync(csvPath, 'utf8');
const rows = parseCSV(raw);
const header = rows[0];
const I = Object.fromEntries(header.map((h, i) => [h, i]));
const intOrNull = (v) => (/^\d+$/.test(v) ? Number(v) : null);
const str = (v) => (v ?? '').trim();

const data = [];
let skip = 0;
for (const r of rows.slice(1)) {
	if (!r.some((x) => (x ?? '').trim() !== '')) continue;
	const id = intOrNull(str(r[I['Orig Order']]));
	if (id === null) { skip++; continue; }
	const th = str(r[I['TH']]);
	const sh = str(r[I['SH']]);
	if (!th || !sh) { skip++; continue; }
	const row = { id, th, sh };
	const set = (k, v) => { if (v !== '' && v !== null) row[k] = v; };
	set('kr', str(r[I['RTH Keyword']]));
	set('ks', str(r[I['RSH Keyword']]));
	set('rr', str(r[I['RTH Read']]));
	set('rt', str(r[I['TH Read']]));
	set('pos', str(r[I['Hanzi Parts of Speech']]));
	set('mean', str(r[I['SH Freq Meaning']]));
	set('py', str(r[I['SH Freq Pinyin']]));
	set('freq', str(r[I['SH Freq']]));
	set('rank', intOrNull(str(r[I['SH Freq Rank']])));
	set('grp', intOrNull(str(r[I['SH Freq Group']])));
	set('nr', intOrNull(str(r[I['RTH #']])));
	set('ns', intOrNull(str(r[I['RSH #']])));
	set('or', intOrNull(str(r[I['Opt RTH']])));
	set('os', intOrNull(str(r[I['Opt RSH']])));
	set('lr', str(r[I['RTH Lesson']]));
	set('lrm', str(r[I['RTH Merge Lesson']]));
	set('ls', str(r[I['RSH Lesson']]));
	set('lsm', str(r[I['RSH Lesson Merged']]));
	// Components — the parts a character is built from. No decomposition data
	// ships in the deck today, so this stays empty and the detail panel shows
	// its "not recorded yet" state. Add a `Components` column (space- or
	// ·-separated) to the CSV and the field fills in with no further changes.
	set('comp', str(r[I['Components']]));
	data.push(row);
}

const out = resolve(root, 'static/data/hanzi.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(data));
const bytes = Buffer.byteLength(JSON.stringify(data));
console.log(`wrote ${out}`);
console.log(`rows: ${data.length} (skipped ${skip}) | ${(bytes / 1024).toFixed(0)} KB raw`);

// quick sanity: counts of each curriculum view
const trad = data.filter((r) => r.nr != null);
const simp = data.filter((r) => r.ns != null);
console.log(`trad frames (nr): ${trad.length} | simp frames (ns): ${simp.length}`);
console.log(`sample trad first/last:`, trad[0]?.th, trad[0]?.nr, '…', trad.at(-1)?.th, trad.at(-1)?.nr);
console.log(`sample simp first/last:`, simp[0]?.sh, simp[0]?.ns, '…', simp.at(-1)?.sh, simp.at(-1)?.ns);
