## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Client-side scripts](https://docs.astro.build/en/guides/client-side-scripts/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)

# Inflatie calculator

Astro static site, Dutch only, one page: an inflation / purchasing-power
calculator for the Netherlands, live at https://inflatie-berekenen.nl.
Deployed to Cloudflare as Workers static assets (`wrangler.jsonc`, no
worker script): Cloudflare builds and deploys from the GitHub repo on
every push to `master` — pushing to `master` *is* deploying. The custom
domain is attached to the Worker in the Cloudflare dashboard. (Hosted on
GitHub Pages until September 2026.)

Rebuilt from Nuxt/Vue in September 2026. The calculation logic was
ported unchanged on purpose and verified to produce identical output to
the old Vue code for every year/month combination; the backwards
calculation was fixed afterwards (see Calculation).

Design and build mobile-first and accessibility-first. When a layout or
interaction choice has a mobile/accessible default and a
desktop/visual-only default, pick the former.

## Invariants

Places that have to say the same thing or it silently breaks. None of
these fail a build.

| If you change… | …also check | Why |
|---|---|---|
| An element `id` in `src/pages/index.astro` | The matching `element()` call in `src/scripts/calculator.ts` | The script looks every element up by id and casts the result. A renamed id is `null` at runtime and the calculator stays stuck on "Aan het laden" — `astro check` can't see it. |
| The `<option>` values in the month `<select>` (`index.astro`) | The CBS `Perioden` format (`1963MM01`, `2025JJ00`) | Lookups are `year + month` string concatenations against that key. `JJ00` is the yearly average, `MMxx` a month. |
| The sitemap integration or its output name | The `Sitemap:` line in `public/robots.txt` | `@astrojs/sitemap` writes `sitemap-index.xml` (not `sitemap.xml`); robots.txt names it by hand. |
| `site` in `astro.config.mjs` | The custom domain attached to the Worker in Cloudflare | Canonical, `og:url` and `og:image` are all derived from `site` (`Layout.astro`), so it's the one place in code — but the domain actually served is configured in Cloudflare. |
| `not_found_handling: "404-page"` (`wrangler.jsonc`) | That `src/pages/404.astro` exists, at the `src/pages/` root | The handler serves a literal `dist/404.html`; without it every miss is an empty-body 404. Only the root `404.astro` builds to that file. |

## Constraints
- `.astro` components only. No React, Vue, or any client framework.
- Client-side JS is vanilla TypeScript: `src/scripts/calculator.ts`,
  imported from a processed `<script>` in `index.astro` (so it's
  bundled and type-checked, unlike an `is:inline` script).
- `src/lib/inflation.ts` is pure: no DOM access. All calculation lives
  there; `calculator.ts` only reads inputs, calls it, and writes text.
  Keep it that way so the logic stays testable outside a browser.
- Inflation data is fetched from CBS **in the browser** on every visit,
  not at build time. That is what makes the FAQ's "worden automatisch
  verwerkt" true without a rebuild. Moving the fetch to build time
  would need a scheduled rebuild to keep that promise.
- UI copy is Dutch and lives directly in `index.astro`. There is no
  i18n layer, and none is needed for one language.
- The page must be fully readable before the script runs: all
  FAQ/info content is static HTML, and the inputs start `disabled`
  until data has loaded. The results area has four states (loading,
  result, invalid input, CBS fetch failed) toggled via `hidden`; exactly
  one is visible at a time (`showState()`).

## Calculation
- Dataset: CBS 70936ned (`CBS_DATA_URL` / `CBS_DATASET_URL` in
  `inflation.ts`). Each row's `JaarmutatieCPI_1` is the year-on-year
  CPI change in percent for that period, as a space-padded string.
- The result compounds those yearly mutations from start year to end
  year for the selected month, rounding at every step (`round()`).
  Crossing 2002 applies the fixed guilder↔euro rate
  (`EURO_INTRODUCTION_YEAR`), and amounts before 2002 display as `ƒ`.
- Going *backwards* in time (end year before start year) is the exact
  mirror of going forwards: divide by `1 + mutation` per year, then undo
  the euro conversion when stepping back out of 2002. A backwards result
  is therefore the inverse of the forwards one, up to the per-step
  rounding (≤ ~0.1% across the whole dataset). Until September 2026 it
  multiplied by `1 − |mutation|` instead, which made €100 in 2026 →
  ƒ88.07 in 1990 rather than ≈ƒ91.3, and counted deflation as inflation.
- **Known, not fixed:** "Gemiddeld per jaar" is the arithmetic mean of
  the yearly mutations, not the geometric (compound) average. It
  changes numbers visitors already see, so don't "fix" it incidentally —
  raise it and let the owner decide.
- Any change to `inflation.ts` should be checked against the current
  behaviour across the whole data range, not a few spot checks: run
  old vs. new for every start year × end year × month (`JJ00`,
  `MM01`–`MM12`) on the live CBS data and diff the results. For the
  backwards direction also check the round trip (forwards then
  backwards returns the original amount to within ~0.1%).

## Routes
- `/` — the calculator (`src/pages/index.astro`).
- `/404` — `src/pages/404.astro`, served by Cloudflare for any unmatched
  path. `noindex` via `Layout.astro`'s `noindex` prop, which also drops
  canonical, og:/twitter: tags and the JSON-LD. `@astrojs/sitemap`
  leaves it out on its own.
- `/sitemap-index.xml`, `/sitemap-0.xml` — generated by `@astrojs/sitemap`.

## Style
- Tailwind v4 through `@tailwindcss/vite`; `src/styles/global.css` is
  just the import. Utility classes directly in the markup. Repeated class
  strings (inputs, labels, links) are frontmatter constants in
  `index.astro`, not a component or `@apply`.
- Visual design was kept as-is from the Nuxt version (bordered cards in
  a two-column grid on `lg`, one column below).

## Accessibility
- The swap control is a real `<button>` with an `aria-label`, and the
  icon inside it is `aria-hidden`.
- The results container is `aria-live="polite"`, so recalculations
  are announced.
- Every input has a `<label for>`.

## SEO
- All `<head>` metadata lives in `src/layouts/Layout.astro`: title and
  description (props), Open Graph / Twitter tags, canonical, and the
  `WebApplication` JSON-LD. Page-specific strings are passed in from
  `index.astro`.
- `public/robots.txt` is minimal: allow all, plus the `Sitemap:` line.

## Hosting

Most of this setup lives outside the repo (Cloudflare dashboard,
registrar), so it's written down here.

| Piece | Where | Setting |
|---|---|---|
| Domain registration | Hostnet | `inflatie-berekenen.nl`. Only the nameservers are set here; they point at Cloudflare. |
| DNS | Cloudflare (zone `inflatie-berekenen.nl`) | Records are managed by the Worker's custom domains — don't add A/CNAME records for the apex or `www` by hand. |
| Hosting | Cloudflare Worker `inflatie-calculator` | Static assets only, configured by `wrangler.jsonc` (`name` must match the Worker's name in the dashboard). |
| Build & deploy | Cloudflare Workers Builds, connected to the GitHub repo | Production branch `master`. Build command `npm run build`, deploy command `npx wrangler deploy`. Node version from `.node-version`. |
| Custom domains | Worker → Settings → Domains & Routes | `inflatie-berekenen.nl`, plus `www.inflatie-berekenen.nl` (either as a second custom domain or redirected to the apex). |

In the repo:
- `wrangler.jsonc` — Worker name, `assets.directory: ./dist`, and
  `not_found_handling: "404-page"` (see Invariants).
- `public/_headers` (Cloudflare syntax) caches `/_astro/*` for a year as
  `immutable` — safe because every file there is content-hashed.
  Everything else gets Cloudflare's default `max-age=0, must-revalidate`.
- `.node-version` — Node for Cloudflare's build.
- No CI of its own: there is no GitHub Actions workflow. Cloudflare's
  build status shows on each commit in GitHub and in the Worker's
  Deployments tab.
- To run it the way Cloudflare does: `npm run build`, then
  `npx wrangler dev --port 8787 --local`. Deploying by hand
  (`npx wrangler deploy`) works too, but needs `wrangler login` and
  bypasses the Git-connected build; prefer pushing.

**Migration status (2026-09-28):** moved off GitHub Pages in commit
`ec95491`. Still to do: nameserver change at Hostnet propagating;
then connect the repo in Workers Builds, attach the custom domains, and
switch off GitHub Pages in the GitHub repo settings. Until the domain
moves, `inflatie-berekenen.nl` is still served by GitHub Pages from the
last build there (`6f85ca2`), and pushes don't deploy anywhere.
Remove this paragraph once the migration is done.

## Don't
- Don't add dependencies without asking.
- Don't scaffold features I didn't ask for.
- Don't push to `master` without being asked — it deploys to production.

## Verification

Before calling a change done:
- `npm run build` — runs `astro check` then `astro build`; both must
  pass with 0 errors. CI runs the same command, so a type error blocks
  the deploy.
- `npm run lint` — ESLint (flat config, `eslint-plugin-astro`,
  typescript-eslint). Note that it runs with `--fix`.
- Load the built page (`npm run preview`) and exercise the calculator,
  not just the build: default result on load, a pre-2002 → post-2002
  calculation (`ƒ` → `€`), the swap button, amount `0` (shows the
  invalid message; resets to `1` on blur), years outside 1963–latest
  (clamped on blur), and an empty year field.
- If you touched the fetch or loading states: block
  `opendata.cbs.nl` and check the error message shows instead of an
  endless "Aan het laden".
- If you touched `inflation.ts`: the full old-vs-new diff described
  under Calculation.
- If you touched `wrangler.jsonc`, `_headers` or the 404 page: run
  `npx wrangler dev --port 8787 --local` against a fresh `npm run build`
  (`astro dev`/`astro preview` don't apply Cloudflare's asset handling)
  and check `/` is 200, an unknown path is 404 *with* the custom page's
  body, and `/_astro/*` carries the immutable `Cache-Control`.
- Cloudflare builds on the Node version in `.node-version`; Astro needs
  ≥ 22.12 (`engines`). If you bump dependencies, check that a clean
  `npm ci && npm run build` works on that version, not only on your
  local Node.
