# Deer-1 — Remembering the Hanzi

A nature × technology study index for the characters in James W. Heisig's
_Remembering the Hanzi 1 & 2_ (traditional) and _Remembering Simplified Hanzi
1 & 2_. Built with SvelteKit 5 + Tailwind CSS v4, in the spirit of
[sondaven.com](https://sondaven.com/en): quiet, editorial, hairline-ruled, with
full light/dark themes — wrapped in ink-brushed plum blossoms, swallows, a deer
seal (`鹿`) and paper-grain "shader" textures.

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
- Search by keyword, character, reading or meaning (`/` to focus). Each tile
  shows its **book frame number** — fixed, whatever the query or order.
- Infinite-scroll grid with hairline rules, deep-linkable view state via the URL
  hash (e.g. `#simp/opt/55`).

## Data pipeline

`static/data/hanzi.json` is generated from the bundled CSV deck:

```sh
npm run data          # node scripts/build-data.mjs [path-to.csv]
```

The CSV merges the RTH and RSH curricula (~3,123 entries; 3,035 traditional and
3,018 simplified teaching frames, with many-to-many script mappings preserved).

## Developing

```sh
npm install
npm run dev -- --open
npm run check         # svelte-check
npm run build         # production build (pick an adapter for your host)
```
