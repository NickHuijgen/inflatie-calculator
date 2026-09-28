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

## Priorities

**SEO and mobile usability are the top priorities for this site.** It
lives on organic search traffic (people searching "inflatie berekenen"
and similar), and most of those visitors are on phones. When a change
trades either of these off against anything else — visual polish, code
elegance, a new feature — they win. If a request would hurt either one,
say so before doing it.

What that means in practice here:
- **Content is static HTML.** Everything a search engine should read
  (headings, the info text, the FAQ) is rendered at build time in
  `index.astro` — including a default calculation and the table of
  historical values, both computed from build-time CBS data. JS only
  makes the calculator interactive and refreshes the numbers. Never move
  indexable copy into client-side rendering or behind a fetch.
- **Don't break the head.** Title, description, canonical, Open Graph and
  JSON-LD (`Layout.astro`, see SEO) must survive every change. The same
  goes for the sitemap and `robots.txt`, and the URL `/` itself: never
  change the URL of an indexed page without a redirect.
- **Speed is part of both.** Keep the page light: no client framework,
  no new render-blocking resources, no web fonts or large images
  without a clear reason. Don't let content shift around while the CBS
  data loads.
- **Mobile first.** Design and check at a real phone width (360–430px)
  before desktop. Tap targets must be comfortably large, text readable
  without zooming, and no horizontal scrolling. Inputs should bring up
  the right keyboard (numeric for amounts and years).
- **Accessible by default**, which overlaps with both: real labels,
  real buttons, sufficient contrast. When a choice has a
  mobile/accessible default and a desktop/visual-only default, pick the
  former.

## Invariants

Places that have to say the same thing or it silently breaks. None of
these fail a build.

| If you change… | …also check | Why |
|---|---|---|
| An element `id` in `src/pages/index.astro` | The matching `element()` call in `src/scripts/calculator.ts` | The script looks every element up by id and casts the result. A renamed id is `null` at runtime and the script throws on load, leaving a dead calculator — `astro check` can't see it. |
| The shareable URL parameters (`PARAMS` in `calculator.ts`: `bedrag`, `van`, `naar`, `maand`) | Nothing in code — but links people have already shared | Renaming a parameter silently breaks every shared link. Only ever add parameters; keep reading old names if one must change. |
| `public/_redirects` | That the target exists in `dist/` | Cloudflare applies these before the static assets; a redirect to a missing file just becomes a redirect to a 404. |
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
- CBS data is fetched **only at build time** (`fetchInflationData()` and
  `fetchDatasetModified()` in `index.astro`'s frontmatter). That one copy
  renders the default result, the "Wat is geld van vroeger nu waard?"
  table, the dates, and is embedded in the page as compact JSON
  (`<script type="application/json" id="cbs-data">`, via
  `InflationData.toCompact()`/`fromCompact()`) for the calculator. The
  browser never contacts CBS: the calculator works instantly and doesn't
  break when CBS is slow or down. A CBS failure fails the *build* on
  purpose, so the previous deployment stays live. The daily scheduled
  rebuild (see Hosting) keeps the data at most a day behind — which is
  what the FAQ's "Worden de cijfers bijgewerkt?" promises; keep them in
  sync.
- Numbers are shown in Dutch notation (`€ 1.234,50`, `39,28%`) through
  `formatMoney`/`formatAmount`/`formatPercent` in `inflation.ts` — never
  `toFixed()` or `String()` in the UI. The amount field is
  `type="text" inputmode="decimal"` rather than `type="number"`, so
  visitors can type Dutch notation; `parseAmount()` is the single place
  that interprets it (comma = decimal separator; dots in groups of three
  = thousands). The year fields stay `type="number"` with
  `inputmode="numeric"`.
- UI copy is Dutch and lives directly in `index.astro`. There is no
  i18n layer, and none is needed for one language.
- The page must be fully readable before the script runs: all content,
  including the default result, is static HTML.
- Result behaviour (`render()`/`commit()` in `calculator.ts`):
  - While typing (`input`), the result updates visually. A half-typed or
    out-of-range value dims the last result (`opacity-40`) rather than
    flashing an error; leaving the field (`change`) runs
    `resetBadInputs()`, which corrects it.
  - A valid year with no figures for the chosen month (later months of
    the current year, or its yearly average) shows a specific message in
    `#result-missing` instead.
  - Screen readers hear the result via the `role="status"` element
    `#result-status`, updated only on `change` — not on every keystroke.
  - `change` also mirrors the form into the URL (`?bedrag=…&van=…&naar=…
    &maand=08|jaar`) with `replaceState`; defaults give a clean `/`. The
    page reads these on load, so results can be shared. Canonical stays
    `/`, so parameter URLs never compete in search.
  - "Deel dit resultaat" uses the native share sheet
    (`navigator.share`) where available, else copies the link.
- Every focusable element needs a visible focus style: inputs use
  `focus:outline-*`, buttons/links the `focusRing` classes in
  `index.astro`. Field borders are `border-gray-500` (≥ 3:1 against
  white). Lighthouse does not check either — it scored 100 while both
  were missing.

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
- The result describes the price change **forwards in time**, from the
  earlier to the later year, whatever order the visitor entered the
  years in ("Tussen 1990 en 2026 stegen de prijzen met 141,32%"). The
  converted amount itself still goes in the direction entered. This
  replaced a "totale inflatie van -58,58%" wording that read as
  deflation when it just meant "going back in time".
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
  description (props), Open Graph / Twitter tags, canonical, icons, and
  the `WebApplication` JSON-LD (free `offers`, `author`). `index.astro`
  adds page-specific JSON-LD through the `schema` prop: `dateModified`
  (CBS's own last-update date of the dataset — not the build date, which
  changes daily and would misrepresent freshness) and `isBasedOn` (the
  CBS dataset). No `meta keywords` — search engines ignore it.
- Trust signals, visible on the page: the source line under the result
  ("Bron: CBS, cijfers tot en met … (bijgewerkt op …)"), and the author
  linking to https://nickhuijgen.nl/.
- Each table row has an id (`#jaar-1980`) so a specific year can be
  linked to directly; the targeted row is highlighted.
- The social image is `public/og-image.png` (1200×630 PNG, a
  `summary_large_image` card). Its source is `design/og-image.html`, with
  the command to regenerate it in a comment at the top. The
  `og:image:width`/`height`/`type` meta in `Layout.astro` assume exactly
  that size and format.
- Icons: `favicon.ico` (32×32) and `apple-touch-icon.png` (180×180) are
  both resized from `public/icon.png`.
- Deliberately **not** used: FAQPage structured data (Google only shows
  FAQ rich results for government and health sites) and ratings in the
  JSON-LD (none are actually collected; adding them violates Google's
  guidelines).
- The historical-values table is the page's main content for long-tail
  searches ("wat is 100 gulden uit 1980 nu waard"). It's one table on
  the homepage on purpose: separate pages per year were considered and
  rejected for now, as near-identical pages risk being treated as thin
  content.
- `public/robots.txt` is minimal: allow all, plus the `Sitemap:` line.

## Hosting

Most of this setup lives outside the repo (Cloudflare dashboard,
registrar), so it's written down here.

| Piece | Where | Setting |
|---|---|---|
| Domain registration | Hostnet | `inflatie-berekenen.nl`. Only the nameservers are set here; they point at Cloudflare. |
| DNS | Cloudflare (zone `inflatie-berekenen.nl`) | The apex record is created and managed by the Worker's custom domain — don't add one by hand. `www` needs its own **proxied** (orange-cloud) record so the redirect below can act on it; it never reaches an origin, so a placeholder such as `AAAA www 100::` is enough. |
| Hosting | Cloudflare Worker `inflatie-calculator` | Static assets only, configured by `wrangler.jsonc` (`name` must match the Worker's name in the dashboard). |
| Build & deploy | Cloudflare Workers Builds, connected to the GitHub repo | Production branch `master`, automatic builds on. Build command `npm run build`, deploy command `npx wrangler deploy`. Node version from `.node-version`. The Cloudflare Workers and Pages GitHub App needs access to this repo — without it the first build works but pushes never trigger another one (happened during the migration). |
| Custom domain | Worker → Settings → Domains & Routes | `inflatie-berekenen.nl` only. |
| HTTPS | Zone → SSL/TLS → Edge Certificates | **Always Use HTTPS** on, so `http://` 301s to `https://` instead of serving a second copy of the page. |
| `www` redirect | Zone → Rules → Redirect Rules | `www.inflatie-berekenen.nl/*` → `https://inflatie-berekenen.nl/${1}`, **301**, query string preserved (Cloudflare's "Redirect from WWW to root" template). The apex is the one canonical host — it's what `site` in `astro.config.mjs` and every canonical/og:url say, so `www` must redirect permanently rather than serve a duplicate copy. |

In the repo:
- `wrangler.jsonc` — Worker name, `assets.directory: ./dist`, and
  `not_found_handling: "404-page"` (see Invariants).
- `public/_headers` (Cloudflare syntax): security headers on every
  response (HSTS, `nosniff`, `Referrer-Policy`, `X-Frame-Options`,
  `Permissions-Policy`), and a one-year `immutable` cache for `/_astro/*`
  — safe because every file there is content-hashed. Everything else
  gets Cloudflare's default `max-age=0, must-revalidate`. There is
  deliberately no Content-Security-Policy: Cloudflare injects its own
  scripts/headers (speculation rules), and a CSP that breaks those can't
  be tested locally.
- `public/_redirects`: `/sitemap.xml` → `/sitemap-index.xml` (the old
  Nuxt sitemap URL) and `/index.html` → `/` as a 301 (Cloudflare would
  otherwise answer with a 307).
- `.node-version` — Node for Cloudflare's build.
- CI is Cloudflare's build: its status shows on each commit in GitHub
  and in the Worker's Deployments tab.
- **Scheduled rebuild:** `.github/workflows/scheduled-rebuild.yml` runs
  daily at 07:00 UTC (and on demand via "Run workflow") and POSTs to a
  Cloudflare **Deploy Hook** (Worker → Settings → Builds → Deploy Hooks,
  branch `master`). The hook URL is itself the credential, so it lives
  in the `CLOUDFLARE_DEPLOY_HOOK_URL` repository secret, never in the
  repo; the workflow fails loudly if the secret is missing. CBS
  publishes monthly, so daily keeps the build-time data at most a day
  behind. GitHub pauses scheduled workflows after 60 days without repo
  activity — if the table's period stops advancing, check that first.
- To run it the way Cloudflare does: `npm run build`, then
  `npx wrangler dev --port 8787 --local`. Deploying by hand
  (`npx wrangler deploy`) works too, but needs `wrangler login` and
  bypasses the Git-connected build; prefer pushing.


## Don't
- Don't add dependencies without asking.
- Don't scaffold features I didn't ask for.
- Don't push to `master` without being asked — it deploys to production.

## Verification

Before calling a change done:
- If you touched anything visible or anything in `<head>`: check the page
  at a phone width (~390px) as well as desktop, and confirm the built
  `dist/index.html` still has its title, description, canonical, og:
  tags and JSON-LD (see Priorities). A Lighthouse run in mobile mode is
  the quickest way to catch an SEO, performance or tap-target
  regression.
- `npm run verify` — `astro check` then `astro build`, the same setup as
  the portfolio project. This is the normal way to run both: `check`
  first, because `build` on its own is not a safety net for type errors
  (`astro build` does not type-check). 0 errors, warnings and hints
  expected. Deliberately *not* wired into `build` itself, matching the
  portfolio — which means Cloudflare (which runs `npm run build`) will
  deploy code that fails `check`, so run `verify` before every push.
- `npm run check` / `npm run build` — the two halves on their own.
- `npm run lint` — ESLint (flat config, `eslint-plugin-astro`,
  typescript-eslint). Note that it runs with `--fix`.
- Load the built page (`npm run preview`) and exercise the calculator,
  not just the build: default result on load, a pre-2002 → post-2002
  calculation (`ƒ` → `€`), the swap button, Dutch input (`1.234,50` is
  read as 1234.5 and reformatted on blur), amount `0` or text (dims;
  resets to `1,00` on blur), years outside 1963–latest (clamped on
  blur), an empty year field, a month without data (e.g. December of
  the current year: explains why), Enter in a field (must not reload),
  a URL with parameters (`/?bedrag=250&van=1980&naar=2026&maand=08`)
  loading that result, and the share button (stub `navigator.share`
  and `navigator.clipboard` in the console rather than opening the real
  share sheet). Tab through the form and check focus is always visible.
- Check the static `dist/index.html` too — it's what search engines
  see first: the default result, the latest period and the table must
  all be there with real numbers. Astro drops the space at a line break
  that directly follows or precedes an `{expression}` or a tag in some
  positions; this has already produced "vandeze dataset", "1963zie",
  "deCBS-dataset", "dataugustus" and "Nu waarddaarnaast". Scan the built
  HTML for text directly touching an inline tag
  (`[letter]<a|strong|span|time` or `</a|strong|span|time>[letter]`)
  after any copy change.
- If you touched `inflation.ts`: the full old-vs-new diff described
  under Calculation.
- If you touched `wrangler.jsonc`, `_headers`, `_redirects` or the 404 page: run
  `npx wrangler dev --port 8787 --local` against a fresh `npm run build`
  (`astro dev`/`astro preview` don't apply Cloudflare's asset handling)
  and check `/` is 200, an unknown path is 404 *with* the custom page's
  body, and `/_astro/*` carries the immutable `Cache-Control`.
- Cloudflare builds on the Node version in `.node-version`; Astro needs
  ≥ 22.12 (`engines`). If you bump dependencies, check that a clean
  `npm ci && npm run build` works on that version, not only on your
  local Node.
