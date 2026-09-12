---
name: verifying-ui-without-vision
description: Use when checking that a page, component, or layout in this project actually renders correctly, when tempted to capture a screenshot to look at one, or when tempted to draw new SVG/vector artwork. This model has no image input, so a screenshot is not evidence and new vector art has no feedback loop — measure the DOM, computed styles and state instead.
---

# Verifying UI without vision

This is a visual project: paper textures, ink-brush blossoms, a cinnabar deer seal, hairline rules, tone colours, two themes. Almost everything worth checking here is something you would normally *look* at. You cannot look at it.

## The constraint

This model declares no image input. `read_image` fails outright:

```
cannot read "…" as an image: model "deepseek-v4-flash" does not declare image input
```

Recognise that error and stop. Do not retry it, do not convert the format, do not shrink the file, do not install an image library. There is no path from a PNG to your understanding, and every attempt burns a turn to learn nothing.

Two consequences follow, and both are easy to get wrong:

- **A screenshot is not evidence.** Producing one proves a browser produced bytes. It says nothing about layout, colour, alignment or legibility, and you must not describe what is "in" it.
- **New vector art has no feedback loop.** You cannot see an SVG you write, so you cannot tell whether 鹿 landed where you intended, whether a branch reads as blossom or as noise, or whether a curve is a deliberate stroke or a stray blob. Authoring it is guesswork dressed up as work.

## Never

1. **Never try to view a screenshot.** Not with `read_image`, not by re-describing it back to the user as though you had seen it, not "just to check". If you catch yourself reasoning about what an image "shows", stop — you are fabricating.
2. **Never author new SVG or vector artwork here** — no new ink figures, blossoms, birds, antlers, seals or decorative paths. What you cannot evaluate, you must not ship.
3. **Never assert a visual property you did not measure.** "The form is centred", "the contrast is fine", "it looks balanced" are claims about pixels you never saw.
4. **Never present a screenshot as your verification.** Saving one is fine; calling it evidence is not.

A screenshot is still a legitimate **deliverable**: produce it, hand the human the path, and stop there. They have eyes; you do not. The rule is about what you may claim, not about what you may write to disk.

## Reuse the art that already exists

The decorative vocabulary is built and reviewed. Compose these instead of drawing:

| Component | What it is |
| --- | --- |
| `src/lib/components/DeerSeal.svelte` | cinnabar 鹿 ink-seal stamp — `size`, `rotation` |
| `src/lib/components/InkCharacter.svelte` | faint oversized character wash — `char`, `opacity`, `blur` |
| `src/lib/components/BlossomBranch.svelte` | plum branch for wide-screen margins |
| `src/lib/components/Birds.svelte` | swallow flight |
| `src/lib/components/DeerAntler.svelte` | antler mark |

Each fills its container and takes a `className`. Place them with the existing `.deco` rule (`position:absolute; pointer-events:none`), or as fixed-size art beside a stat block, as `AuthForm.svelte` and `/account` do.

If a task genuinely needs **new** artwork, say so plainly: you cannot judge it, so either the human reviews it or a model that can see should produce it. Do not quietly draw one and hope.

## Verify by measurement instead

Ask questions whose answers are values rather than impressions. That covers most of what matters.

**Types and build.** `npm run check` (svelte-kit sync + svelte-check). Cheapest real signal; catches most component mistakes.

**HTTP behaviour** with `curl`: status codes, redirect targets, cookies, JSON bodies, SSR'd HTML. `grep` the response for strings that must be present — that proves the *server* rendered correctly even though you never see the page.

**The rendered DOM**, via headless Chrome and the DevTools Protocol. Strongest substitute for looking, because it answers the questions you would otherwise ask your eyes:

- `document.documentElement.scrollWidth - window.innerWidth === 0` → no horizontal overflow. Check at 1440px **and** ~390px.
- `getBoundingClientRect()` width/height > 0 → the element actually rendered, not merely exists in markup.
- `getComputedStyle(el).backgroundColor / color` → theme tokens resolved. Check both themes by toggling the `dark` class on `<html>`.
- `textContent`, `aria-label`, `aria-pressed`, `role` → the state a real user or screen reader gets.
- Drive a real flow (`requestSubmit()`, `.click()`) then re-read the DOM → proves the interaction, not just the first paint.

Existence is not geometry, and geometry is not aesthetics. State honestly which of the two you actually established, and leave taste to the human.

### Working CDP recipe

Verified in this project. Node 24 ships a global `WebSocket`, so this needs no dependencies.

```sh
# Chrome's own sandbox cannot initialise inside the DSH file sandbox. Without
# --no-sandbox it dies with "GPU process isn't usable. Goodbye." (exit 133).
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --no-sandbox --disable-gpu \
  --disable-crash-reporter --disable-breakpad \
  --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-shot about:blank
```

Then from Node: read `webSocketDebuggerUrl` from `http://127.0.0.1:9222/json/version`, open `Target.createTarget` + `Target.attachToTarget { flatten: true }`, and drive it with `Page.navigate`, `Runtime.evaluate`, `Emulation.setDeviceMetricsOverride` and `Network.setCookie`. Wrap evaluated snippets in `(async () => { … })()` so you can `await` inside them.

Project gotchas:

- The index is **client-rendered** — it fetches `static/data/hanzi.json` on mount. Wait 2–3s before probing or you will measure the loading state.
- Signed-in states need the `better-auth.session_token` cookie set via `Network.setCookie` against `http://localhost:5173`.
- `curl` sends `Accept: */*`, which SvelteKit negotiates to `application/json` for form actions; send a browser-style `Accept: text/html,…` to get the rendered page back.
- `timeout` does not exist on macOS — use the background job tools for long-running commands.
- The dev server must be running (`npm run dev`, port 5173; `ORIGIN` in `.env` must match it).
