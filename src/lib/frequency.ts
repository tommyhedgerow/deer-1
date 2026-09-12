// How common a character is, as one to five stars.
//
// The deck already ranks every character and bands those ranks in threes of
// hundreds — the `SH Freq Group` column is exactly `ceil(rank / 300)`. The
// stars collapse those bands, so a star means something in the deck's own
// terms rather than a threshold invented here:
//
//   ★★★★★  rank ≤ 300     the characters a learner meets everywhere
//   ★★★★   rank ≤ 600
//   ★★★    rank ≤ 1,200
//   ★★     rank ≤ 2,400
//   ★      anything rarer, or never ranked at all
//
// The raw percentage that shipped before said little: "0.16%" of what corpus,
// measured how? A rank band is comparable between characters, which is what a
// learner actually wants to know. The exact rank is still shown beside it.
import type { RawRow } from './hanzi';

/** Upper bound of each band, commonest first. */
export const STAR_BANDS = [300, 600, 1200, 2400];

/** 1 (commonest) to 5 (rarest); unranked characters fall in the last band. */
export function bandOf(rank: number | null | undefined): number {
	if (rank == null) return STAR_BANDS.length + 1;
	const i = STAR_BANDS.findIndex((max) => rank <= max);
	return i === -1 ? STAR_BANDS.length + 1 : i + 1;
}

/** Stars for a character: 5 for the commonest band, 1 for the rarest. */
export const starsOf = (row: RawRow): number => 6 - bandOf(row.rank);

const WORDS = ['rare', 'uncommon', 'common enough', 'common', 'everywhere'];
const SENTENCES = [
	'rare — you will not meet it often',
	'uncommon — it turns up now and then',
	'common enough to meet regularly',
	'common — it shows up constantly',
	'everywhere — among the most used characters'
];

export const starWord = (stars: number) => WORDS[stars - 1] ?? WORDS[0];
export const starSentence = (stars: number) => SENTENCES[stars - 1] ?? SENTENCES[0];

/** For the tooltip and the accessible label: "3 of 5 stars — common enough". */
export const starLabel = (stars: number) => `${stars} of 5 stars — ${starWord(stars)}`;
