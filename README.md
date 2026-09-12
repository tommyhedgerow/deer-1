# Deer-1 — Remembering the Hanzi

A nature × technology study index for the characters in James W. Heisig's
_Remembering the Hanzi 1 & 2_ (traditional) and _Remembering Simplified Hanzi
1 & 2_. Built with SvelteKit 5 + Tailwind CSS v4, in the spirit of
[sondaven.com](https://sondaven.com/en): quiet, editorial, hairline-ruled, with
full light/dark themes — wrapped in ink-brushed plum blossoms, swallows, a deer
seal (`鹿`) and paper-grain "shader" textures.

## Languages

The index speaks three curricula, chosen in the header:

- **中文 · Chinese** — the two Heisig books, with the **Simplified / Traditional**
  choice appearing only while Chinese is selected.
- **日本語 · Japanese** — _Remembering the Kanji_. No kanji deck ships yet, so this
  view renders the traditional frames as a **placeholder** and says so in the
  hero, in the detail panel and in the footer. It carries its own progress and
  its own stories, so the deck can be dropped in without re-marking anything.

A view is identified by a *curriculum* (`trad` · `simp` · `jp`), which is what the
data layer, the URL hash (`#jp/orig/55`) and every stored row are keyed by.

## Design

- **Two typefaces** — the editorial serif set plus **Chakra Petch**, a digital /
  retro-futuristic face used for the `1`, eyebrows and all numerals.
- **Nature × tech margins** — blossoms, swallow flights and an antler mark live
  in the page margins and the header/footer edges; a cinnabar deer seal stamps
  the header, footer and detail panels; a faint mat frame and calligraphy rail
  appear on very wide screens.
- **Tone legend** — the four tones plus neutral, shown as coloured example
  syllables (`mā má mǎ mà ma`) with plain-language descriptions.

## Features

- **Original / Optimised order** — the frames as numbered in the book, or the
  re-sequenced order from the merged deck.
- **Simplified / Traditional** — each curriculum carries its own script, keyword,
  frame numbers and lessons.
- Click any character for a detail view: Heisig keyword, pinyin with **tone
  colours** (1 red · 2 amber · 3 green · 4 blue, neutral grey), alternate
  readings, senses, frequency stats and book references. Navigate with `←` `→`,
  close with `Esc`.
- **Commonness in stars** — one to five stars, five for the 300 most frequent
  characters down to one for the rarest (`$lib/frequency`). The stars are the
  deck's own `SH Freq Group` bands collapsed, so a star is comparable between
  characters; the raw percentage that used to sit there said less than the rank
  it came from, and the exact rank is still shown beside it.
- **Components** — the parts a character is built from. The deck carries no
  decomposition data yet, so the section states that plainly for every
  character instead of inventing one; `scripts/build-data.mjs` reads a
  `Components` column the moment the CSV has one.
- **Your story** — a private mnemonic note per character, per curriculum,
  written in the detail panel. No stories ship with the index, so every one
  starts blank and belongs to whoever wrote it.
- Search by keyword, character, reading or meaning (`/` to focus). Each tile
  shows its **book frame number** — fixed, whatever the query or order.
- Infinite-scroll grid with hairline rules, deep-linkable view state via the URL
  hash (e.g. `#simp/opt/55`).
- **Accounts and progress** — create an account to mark each character as
  *learning* or *known*, per curriculum, save your own stories, drill them as
  flashcards and follow your tally on `/account`.
- **Flashcards with spaced repetition** — `/review` shows the Heisig keyword and
  asks for the character, then schedules it further and further out (see below).
- **A heatmap of days and reviews** — a year of squares on `/account`, counting
  reviews per UTC day, beside your streak.
- **Achievements** — ladders for characters learned, reviews done, days in a row
  and stories written.

## Review & spaced repetition

`/review` is a flashcard session. One card is one character in one curriculum;
the front is the Heisig keyword (with your story, if you wrote one), the back is
the character, its readings and its senses.

Grading is a plain yes-or-no, and it moves a card along a fixed ladder — no
per-card ease factor, no fuzz, no four-way judgement call, so the next interval
is always predictable:

| grade | meaning | effect | from a new card | from 14 days |
| --- | --- | --- | --- | --- |
| Again | did not know it | back to the learning step, counts as a lapse | 10 min | 10 min |
| Good | knew it | one step up | 1 day | 30 days |

The ladder is `1 · 3 · 7 · 14 · 30 · 60 · 120 · 240` days (`$lib/srs`). A card
reaches **30 days** — `GRADUATED_STAGE` — and from then on its character counts
as *known*; a lapse on a graduated card drops it to the ten-minute step and marks
the character *learning* again. The SRS is therefore the one thing that decides
those marks: reviewing a new card marks it learning straight away, and drilling
it through the ladder is what makes it known.

- **New cards** are the characters of a curriculum that have no card yet, taken
  in book order, ten or twenty or fifty at a time from the session's empty state.
  Nothing is capped per day — you decide the pace.
- Cards on a learning step come back **ten minutes later**, so they reappear in
  your next session rather than spinning inside this one.
- Every grading is written to `review_log` with the UTC day it happened on, which
  is what the heatmap, the streak and the review achievements count.
- `/api/review/new` picks up new characters, `GET /api/review` returns the due
  queue, `POST /api/review` grades a card, and `GET /api/review/summary` feeds the
  header badge.

## Achievements

Tiers are plain data in `$lib/achievements`; the tallies are read live, so
nothing is awarded by a background job. Reaching a tier writes one row to
`achievement_unlock` the first time it is seen, which is what dates it.

- **Characters learned** — 50 · 100 · 300 · 1,000 · 1,500 · 2,000 · 3,000, per
  curriculum. (Japanese is the placeholder deck, so its ladder tracks the
  traditional one until real kanji data lands.)
- **Reviews** — 1 · 50 · 100 · 500 · 1,000 · 2,500 · 5,000 · 10,000. (A review
  is one grading; "known it" is the share the account page reports as accuracy.)
- **Streaks** — 3 · 7 · 14 · 30 · 100 · 365 consecutive days.
- **Stories** — 1 · 10 · 50 · 100 written.

A new tier is announced in the session the moment a review crosses it, and the
whole ladder lives on `/account`.

## Accounts & progress

Sign-up and sign-in are handled by [better-auth](https://www.better-auth.com)
(email + password) over the same Drizzle/SQLite database, with the session read
into `locals` by `src/hooks.server.ts`.

- `/signup` and `/login` — one shared card (`AuthForm.svelte`) in the site's
  paper-and-ink idiom. An already-authenticated visitor is sent on to
  `/account`, and a `?redirect=` path is honoured as long as it stays on-site.
- `/account` — four tabs, each deep-linkable (`?tab=study`):
  **Progress** (your tally, progress against each book's frame total, and the
  marked characters themselves), **Study** (the heatmap, the streak and the
  per-curriculum queue), **Achievements** (the whole ladder), and **Settings**
  (your account, the theme, sign-out, and clearing marks, stories, cards or the
  review log — separately, since they are different things).
- In the index a signed-in reader sees a dot on every marked cell, a `Marks`
  filter (all · learning · known), and a **Learning / Known / Clear** control in
  the character detail panel. Marks are saved optimistically and roll back if
  the write fails.

A mark is stored per user, per character, **per curriculum**: a merged deck row
carries both the traditional and the simplified form, and learning one does not
imply the other — nor does marking it in the Japanese view. All of it lives in
the `character_progress` table.

Stories work the same way and live in `character_story`: one row per user, per
character, per curriculum, holding the note they wrote. An empty story is a
deleted row, never a blank one.

Study state lives in three more tables: `review_card` (one card per user,
character and curriculum, holding its rung and due date), `review_log` (one row
per grading, with the UTC day key it belongs to) and `achievement_unlock` (the
date a tier was first reached).

All of it is written through JSON endpoints — `POST /api/progress`,
`POST /api/story`, `POST /api/review` and `POST /api/review/new` — which validate
the curriculum (`trad` · `simp` · `jp`), the deck row id, the grade and the story
length (max 4,000 characters).

Auth reads `ORIGIN` and `BETTER_AUTH_SECRET` from `.env` (see `.env.example`);
`npm run db:push` applies the schema.

## Data pipeline

`static/data/hanzi.json` is generated from the bundled CSV deck:

```sh
npm run data          # node scripts/build-data.mjs [path-to.csv]
```

The CSV merges the RTH and RSH curricula (~3,123 entries; 3,035 traditional and
3,018 simplified teaching frames, with many-to-many script mappings preserved).

Every curriculum is read from that one index: `trad` and `simp` from the two
books, and `jp` from the traditional fields until a kanji deck exists. An
optional `Components` column is picked up automatically as `comp`.

## Developing

```sh
npm install
npm run db:push       # apply the schema (marks, stories, cards, log, unlocks)
npm run dev -- --open
npm run check         # svelte-check
npm run build         # production build (pick an adapter for your host)
```

The scheduling rules are pure functions in `src/lib/srs.ts`, so a change to the
ladder can be reasoned about (and tested) without a database or a browser.
