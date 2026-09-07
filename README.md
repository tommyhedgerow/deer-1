# Hanzi Index — Remembering the Hanzi

A study index for the characters in James W. Heisig's _Remembering the Hanzi 1 & 2_
(traditional) and _Remembering Simplified Hanzi 1 & 2_. Built with SvelteKit 5 +
Tailwind CSS v4, in the spirit of [sondaven.com](https://sondaven.com/en): quiet,
editorial, hairline-ruled, with full light/dark themes.

## Features

- **Original / Optimised order** — the frames as numbered in each book, or the
  re-sequenced order from the merged deck.
- **Simplified / Traditional** — each curriculum carries its own script, keyword,
  frame numbers and lessons.
- Click any character for a detail view: Heisig keyword, pinyin with **tone
  colours** (1 red · 2 amber · 3 green · 4 blue, neutral grey), alternate
  readings, senses, frequency stats and book references. Navigate with `←` `→`,
  close with `Esc`.
- Search by keyword, character, reading or meaning (`/` to focus).
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
