# 宝比健康成长中 — project structure

This app was refactored from a single 213KB HTML file into a plain multi-file
static site. There is **no build step** — it's still just HTML/CSS/JS loaded
directly by the browser, so it deploys to Cloudflare Pages (or any static
host) with zero configuration. This was a pure "move the code, don't change
the logic" refactor: every existing feature behaves exactly as before,
confirmed by `tests/regression.test.js` passing identically against both the
old single-file version and this new structure.

## File map — what's responsible for what

| File | Feature |
|---|---|
| `index.html` | Page markup only (header, cards, bottom sheets, nav bar) |
| `css/style.css` | All styling (Morandi color palette, layout, fonts) |
| `js/core.js` | Shared storage helpers (`loadAll`/`saveAll`/`getDay`/`setDay`/`dayKey`) and shared state used by every other module — edit with care, everything depends on it |
| `js/profile.js` | Baby profile card (age, weight, height widget next to the mascot) |
| `js/feed.js` | **Feeding record module**: add/edit/delete feed entries, the "距上次喂奶" timer banner. This is the module intended for feeding-related feature work. |
| `js/diaper.js` | 尿尿/便便 (diaper) record module: add/edit/delete |
| `js/calendar.js` | Report page's monthly calendar grid |
| `js/home-timeline.js` | Home page's day-detail timeline ("当日总结" list, the "最新" tag) |
| `js/records-list.js` | Shared list rendering for the record page — renders both the feed list and diaper list together (kept as one file since the original code combined them; splitting it further is a larger change than this pass covered) |
| `js/report.js` | Stats/report page: charts, daily report archive |
| `js/io.js` | Export/import (copy/paste sync-by-hand fallback) |
| `js/sync.js` | Family cloud sync feature (multi-channel) |
| `js/nav.js` | Bottom nav bar / page switching (`go(i)`) |
| `js/app.js` | Bootstrap: `masterRender()` orchestrator + startup calls. **Loads last** — every other module must be loaded before it. |

Load order in `index.html` matters only in that `app.js` must be last;
the other modules can be reordered freely since they all share the page's
global scope (plain `<script src>` tags, no bundler, no ES modules).

## Running the regression checks

```
npm install       # installs Playwright once
npm test
```

This runs `tests/regression.test.js`, which drives the app in a headless
browser and checks, end to end:

- feeding: add / edit-the-correct-row / delete
- the "距上次喂奶" banner, on both the home and record pages, driven by the
  record's *edited* time rather than when it was first added
- diaper: add / edit-the-correct-row / delete
- home timeline ordering and the single "最新" tag
- report page renders without throwing
- the sync merge logic (`mergeData`) combines records correctly

Run this after any future change, before shipping, to catch regressions in
modules you didn't mean to touch.

## Deploying

This is a static site — no build command, output directory is the repo root
(this folder). Once connected to Cloudflare Pages via Git, every push to the
main branch auto-deploys. See the deployment notes shared separately for the
exact GitHub + Cloudflare Pages connection steps.
