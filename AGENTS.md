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
  without zooming, and no horizontal scrolling. Watch anything with a
  `viewBox`: an SVG scales its text along with its geometry, so the
  price chart is drawn at 380 units wide and capped there (`max-w`)
  rather than drawn at 640 and scaled down, which rendered its axis
  labels at ~5,8px on a phone. Inputs should bring up
  the right keyboard (numeric for amounts and years).
- **Accessible by default**, which overlaps with both: real labels,
  real buttons, sufficient contrast. When a choice has a
  mobile/accessible default and a desktop/visual-only default, pick the
  former.

## Invariants

Places that have to say the same thing or it silently breaks. None of
these fail a build — but most are now checked by `npm test`
(`test/invariants.test.ts`), marked **[test]** below. The unmarked ones
are still on you.

| If you change… | …also check | Why |
|---|---|---|
| **[test]** An element `id` in `src/components/Calculator.astro` | The matching `element()` call in `src/scripts/calculator.ts` | The script looks every element up by id and casts the result. A renamed id is `null` at runtime and the script throws on load, leaving a dead calculator — `astro check` can't see it. Same reason there can be only **one** `<Calculator>` per page. |
| **[test]** An element `id` in `src/components/SalaryCalculator.astro` | The matching `element()` call in `src/scripts/salary.ts` | Exactly the same failure mode. Its ids are all `salary-`-prefixed so they can't collide with the other calculator's, but the two components still can't share a page: both embed the data as `<script id="cbs-data">`. **One data-embedding calculator per page.** |
| **[test]** An element the salary script writes into conditionally (the cao block, the keep-up block, the prompt that replaces it) | That `SalaryCalculator.astro` renders it **unconditionally** | The component hides those blocks with `hidden`, never with `{cond && …}`: an element that isn't in the static HTML is `null` when the script tries to fill it. Since "Salaris nu" ships empty, the keep-up sentences render with their value spans **blank** rather than with invented numbers — see the `keepUp` object in the frontmatter. The build throws instead if the defaults produce no figures at all. |
| **[test]** The nav links in `src/components/Header.astro` | That each `href` matches the page's real path, trailing slash and all | `aria-current="page"` is decided by comparing `Astro.url.pathname` with the link's own href (`trailingSlash: 'always'`), so a missing slash silently stops the current page from being marked. |
| **[test]** The year page URL scheme (`yearPagePath()` in `src/lib/year-pages.ts`) | The `/gulden/:year` and `/euro/:year` rules in `public/_redirects`, and `EURO_INTRODUCTION_YEAR` | Every link to a year page is built by `yearPagePath()`, and `getStaticPaths` uses the same `currencyOf()`, so those can't drift — but the redirects restate the two path prefixes by hand. |
| **[test]** The shareable URL parameters (`PARAMS` in `calculator.ts`: `bedrag`, `van`, `naar`, `maand`; `salary.ts` adds `nu`) | Nothing in code — but links people have already shared | Renaming a parameter silently breaks every shared link. Only ever add parameters; keep reading old names if one must change. The four shared names mean the same thing on both pages; keep it that way. |
| `public/_redirects` | That the target exists in `dist/` | Cloudflare applies these before the static assets; a redirect to a missing file just becomes a redirect to a 404. |
| The `<option>` values in the month `<select>` (`index.astro`) | The CBS `Perioden` format (`1963MM01`, `2025JJ00`) | Monthly lookups are `year + month` string concatenations against that key. `JJ00` means yearly average and goes to the `71905ned` index instead (`has()`, `priceFactor()`). |
| The sitemap integration or its output name | The `Sitemap:` line in `public/robots.txt` | `@astrojs/sitemap` writes `sitemap-index.xml` (not `sitemap.xml`); robots.txt names it by hand. |
| `site` in `astro.config.mjs` | The custom domain attached to the Worker in Cloudflare | Canonical, `og:url` and `og:image` are all derived from `site` (`Layout.astro`), so it's the one place in code — but the domain actually served is configured in Cloudflare. |
| `not_found_handling: "404-page"` (`wrangler.jsonc`) | That `src/pages/404.astro` exists, at the `src/pages/` root | The handler serves a literal `dist/404.html`; without it every miss is an empty-body 404. Only the root `404.astro` builds to that file. |

## Constraints
- `.astro` components only. No React, Vue, or any client framework.
- Client-side JS is vanilla TypeScript: `src/scripts/calculator.ts` for
  `/` and the year pages, `src/scripts/salary.ts` for `/salaris`, each
  imported from a processed `<script>` in its component (so it's
  bundled and type-checked, unlike an `is:inline` script). The handful of
  pieces both need — `element()`, the month↔URL-parameter mapping and
  `clampYear()` — live in `src/scripts/form.ts`. Everything that knows
  about a specific form's fields stays in that form's own script.
- Internal imports inside `src/lib` and `src/scripts` carry the `.ts`
  extension (`from './cao.ts'`). Vite and `astro check`
  (`allowImportingTsExtensions`) both accept it, and it is what lets
  `node --test` run the real modules without a loader or a bundler.
  `.astro` files import without the extension, as before.
- Every CBS request goes through `fetchJson()` in `src/lib/cbs.ts`, and
  every JSON block embedded in a page through `embedJson()` in
  `src/lib/embed.ts` (which escapes `<`, so a value containing
  `</script>` could never end the block early).
- **Nothing a CBS figure touches may reach a page as `NaN` or `∞`.**
  `has()` asks whether the figure *parses*, not whether the key exists,
  `output()` rejects a non-positive or non-finite amount and a
  non-finite result, `inflationPercentage()` returns `NaN` rather than a
  plausible-looking `-101` when a period is missing, and the guard in
  `Calculator.astro` is `!(output > 0)` rather than `< 0` — `NaN` and
  `Infinity` both pass a `< 0` test. This is deliberate: a blank figure
  from CBS used to sail past every guard and publish "€ NaN", which is
  exactly the case the "a CBS failure fails the build" rule exists for.
- `latest`/`latestPeriodLabel` is the newest period; `latestMonthly`/
  `latestMonthlyLabel` is the newest *month*. They differ for the few
  weeks after CBS publishes a yearly figure, because a year's `JJ00`
  row arrives with its December figure and sorts after it. **Copy that
  promises a month has to use the monthly one**, or it spends every
  January saying "maandcijfers tot en met 2025". `latest` is found by
  comparing periods (`periodRank`), not by taking the last row: the
  feed is chronological but not sorted, so a reordered feed would
  otherwise yield a wrong-but-plausible site instead of a failure.
- `src/lib/inflation.ts` is pure: no DOM access. All calculation lives
  there; `calculator.ts` only reads inputs, calls it, and writes text.
  Keep it that way so the logic stays testable outside a browser.
  `src/lib/salary.ts` (the wage maths) and `src/lib/cao.ts` (the cao
  dataset) follow the same rule, and `salary.ts` builds entirely on
  `InflationData` — it contains no second inflation calculation.
- CBS data is fetched **only at build time**, once per build, by
  `loadBuildData()` in `src/lib/build-data.ts` (the ~127 pages would
  otherwise make hundreds of requests). That one copy
  renders the default result, the "Wat is geld van vroeger nu waard?"
  table, the dates, and is embedded in the page as compact JSON
  (`<script type="application/json" id="cbs-data">`, via
  `InflationData.toCompact()`/`fromCompact()`) for the calculator;
  `/salaris` embeds the cao index the same way as `#cao-data`. The
  browser never contacts CBS: the calculator works instantly and doesn't
  break when CBS is slow or down. A CBS failure fails the *build* on
  purpose, so the previous deployment stays live — that now goes for the
  cao dataset too. The daily scheduled
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
Three CBS datasets, all fetched at build time (URLs and titles in
`inflation.ts`, and in `cao.ts` for the third):

| Dataset | Contents | Used for |
|---|---|---|
| `70936ned` | Year-on-year CPI change in % per month and per year (`JaarmutatieCPI_1`, a space-padded string), from January 1963, updated monthly | Every comparison **by month** (`MM01`–`MM12`) |
| `71905ned` | Yearly price index, 1900=100 (`CPI_1`), from 1900, updated once a year (around February) | Every comparison of **yearly averages** (`JJ00`), and the table |
| `85663ned` | Cao-loonindex, 2020=100 (`CaoLonenPerMaandInclBijzBeloningen_2`, incl. bijzondere beloningen — the figure CBS quotes), yearly from 1972, **monthly only from 2020**, updated monthly | The wage comparison on `/salaris` only |

CBS retires these tables when the base year changes — `85663ned` replaced
`82838ned` (2010=100) in December 2023 — and the dimension keys in
`CAO_FILTER` go with them (`Versie eq 'A045600   '` really does carry three
trailing spaces). When that happens the request still succeeds and simply
matches nothing, so `fetchCaoData()` throws by name instead: without it
`latestYearlyYear` is `-Infinity` and the table loop in `salaris.astro`
spins forever, **hanging** the Cloudflare build rather than failing it. Keep
that guard.

- **Yearly averages** use the exact ratio of CBS's own index levels
  (`priceFactor()`), without intermediate rounding: matches the index to
  within 0.005 percentage points over 1900–2025. `71905ned` lags: CBS
  publishes a year's yearly change in `70936ned` weeks before the new
  index level, so the constructor extends the index with those changes
  (`latestYearlyYear` is the last year either way). Checked: bridging
  2025 that way differs from the real 2025 level by < 0.04%.
- **Months** chain that month's yearly changes from start to end year,
  rounding at every step (`round()`) — deliberately unchanged from the
  original Vue calculation, so monthly results are identical to it (0
  differences across all 48,644 year pairs when this was introduced).
  Chaining one-decimal percentages drifts from the true index by up to
  ~0.6% over 60 years; that's why yearly averages don't use it any more.
- Before 1963 only yearly averages exist. The calculator switches to
  "Jaargemiddelde" by itself when a committed year is before 1963, and
  moves a year without a yearly average (the current one) to
  `latestYearlyYear`, explaining it in `#result-note`
  (`adjustForYearlyOnly()` in `calculator.ts`).
- Crossing 2002 applies the fixed guilder↔euro rate
  (`EURO_INTRODUCTION_YEAR`), and amounts before 2002 display as `ƒ`.
- Going *backwards* in time (end year before start year) is the exact
  inverse of going forwards (for months up to the per-step rounding:
  measured across the whole range at amount 1000, the worst round trip
  is 0,118% — `1996→2024 MM10` — and only 10 of 64,520 combinations
  exceed 0,1%; `test/inflation.test.ts` holds it under 0,12%). Until September 2026 it multiplied by `1 − |mutation|`
  instead, which made €100 in 2026 → ƒ88.07 in 1990 rather than
  ≈ƒ91.3, and counted deflation as inflation.
- The result describes the price change **forwards in time**, from the
  earlier to the later year, whatever order the visitor entered the
  years in ("Tussen 1990 en 2026 stegen de prijzen met 141,32%"). The
  converted amount itself still goes in the direction entered.
- "Gemiddeld per jaar" is the **compound** average: the constant yearly
  rate that gives the same total change (`averageInflation()`). It was
  the arithmetic mean of the yearly changes until September 2026 (3,41%
  instead of 3,37% for 2016–2026); the owner chose compound.
- The table ("Wat is geld van vroeger nu waard?") compares **yearly
  averages** of every year from 1900 with `latestYearlyYear`
  (`historicalValues()`): exact and from one source, at the cost of
  lagging the newest month by up to a year. The calculator covers the
  latest month. This was the owner's choice over a same-month table.
- **Everything about a pay rise is measured forwards in time**, like the
  price figures. Two salaries each belong to a year, so entering the
  years backwards — one click on the swap button — does not turn the
  question round; it only decides which field holds the earlier salary.
  `salaryComparison()` therefore answers from whichever salary belongs
  to the earlier year: `required`, `gap`, `realChange`, `realValue` and
  `nominalChange` all run from `baseYear` to `targetYear`, which it
  reports alongside `baseSalary`. **Both renderers take their years and
  amounts from the comparison, never from the form** (`SalaryCalculator
  .astro` and `salary.ts`) — otherwise the headline sentence names one
  pair of years while the figure under it was computed for another.
  Until September 2026 only `nominalChange` was normalised: the
  purchasing-power half still answered in the entered order, so one
  click of the swap button put "Je koopkracht is daarmee met 60,96%
  gestegen" directly above "Jouw salaris daalde tussen 2016 en 2025 met
  16,67%". `test/salary.test.ts` pins both halves to the same period.
  With **one** salary there is nothing to run forwards to, so the
  question keeps the direction it was asked in ("wat is mijn salaris van
  2025 waard in 2016?") and `baseYear`/`targetYear` are simply the years
  as entered. The keep-up sentences name their years ("In 2026 verdien
  je …") rather than saying "nu" and "sinds", which only hold when the
  years run forwards.
- **Wages (`salary.ts`, for `/salaris`).** `salaryComparison()` asks
  `InflationData` what the earlier salary has to be in the later year
  (`output()`, which already handles ƒ→€) and compares the other salary
  with it:
  the real change is `now / required − 1`, never the difference between
  two percentages. `realValue` runs the same conversion backwards, so
  it is only correct because the backwards calculation was fixed above.
  The nominal change needs `convertCurrency()` — a salary from before
  2002 is in guilders, and comparing it with a euro amount without the
  fixed rate is meaningless.
- **Never pair cao figures with prices from another period.**
  `wageComparison()` returns the period it actually used and the page
  prints it. It first tries the exact two periods the visitor asked
  about; because cao figures per month only start in 2020, that usually
  fails, so it falls back to the **yearly averages** of those years
  clamped into 1972…the latest complete cao year, and says so in a note.
  Both its cao and its price figure always come from that one period. It
  returns nothing when even the fallback is impossible (both years
  before 1972), and the block hides.
  The visitor's own rise is the one figure that can't be recomputed for
  a fallback period, so that sentence always names its own years, and
  the "meer/minder dan de cao-lonen" verdict is shown **only** when the
  periods match exactly (`exact`). Dropping that guard would compare a
  2016–2026 salary rise with a 2016–2025 cao rise.
  `wageComparison()` also reports **why** the period moved (`reason`), and
  `caoPeriodNote()` turns that into the sentence. There are three reasons —
  the month has no cao figures, the start year predates 1972, the end year
  has no complete cao year yet — and the note used to blame the first one
  every time, which is plainly false when the visitor already chose
  Jaargemiddelde. `comparedToCao()` and `caoPeriodNote()` live in
  `salary.ts` precisely because the component and the script both render
  these sentences and nothing checks that they agree.
- Cao percentages are derived from the index levels without intermediate
  rounding, like the yearly prices. CBS publishes its own percentages
  rounded to one decimal *and* the index levels this derives them from
  rounded to one decimal, so the two can differ — and the further back,
  the more: the 1972 level is 22,4, where one decimal is already ±0,22%.
  Measured against CBS's published percentages over 1972–2025, **21 of 52
  years differ by more than 0,05pp and the worst is 0,40pp** (1974: 14,80%
  here, 14,4% at CBS). Inside the table `/salaris` prints (the last 15
  years, levels near 100) the worst gap is 0,10pp, and 2025 is 5,04% here
  against "5,0 procent" in CBS's headline. An earlier version of this
  document claimed the gap never exceeds 0,05pp; it does, and the note
  under the table now says "tot ongeveer een halve procentpunt" for the
  oldest years. The long fallback the page's own default reaches
  (1972–2025, cao 458,04%) is good to roughly ±1,5pp — quote it as a
  round figure, not to two decimals. Deriving from the levels is still
  the right method: don't "fix" this by chaining rounded percentages.
- Any change to `inflation.ts` should be checked against the current
  behaviour across the whole data range, not a few spot checks: run
  old vs. new for every start year × end year × month (`JJ00`,
  `MM01`–`MM12`) on the live CBS data and diff the results; check
  yearly averages against the `71905ned` index ratio directly; and
  check the round trip (forwards then backwards returns the original
  amount).

## Routes
- `/` — the calculator (`src/pages/index.astro`).
- `/salaris/` — the wage page (`src/pages/salaris.astro`), answering "is
  mijn salaris meegegroeid met de inflatie?". Its own calculator
  (`SalaryCalculator.astro` + `scripts/salary.ts`) takes a salary from an
  earlier year, an optional current salary, and reports what the salary
  would have to be now, how far the real one is from that, and how the
  average cao-lonen moved over the same period. Then a table of
  cao-loonstijging vs. inflatie per year, a table of salaries corrected
  to now, an explanation and a FAQ — all rendered from build-time data.
  - **Why it exists.** It targets a search cluster `/` does not serve
    ("salaris inflatie berekenen", "reële loonstijging", "loonsverhoging
    inflatie"). The cao comparison is the part no competitor has and the
    reason it deserves its own URL rather than being `/` with a salary
    label — keep it, and keep `/salaris` from competing with `/` for
    plain "inflatie berekenen": the headline, the H1 and the copy are
    about *loon*, not about converting a loose amount.
  - It is bruto/netto- and maand/jaar-agnostic on purpose: it corrects an
    amount for inflation and says so. No tax, no toeslagen — those change
    for reasons that have nothing to do with the CPI.
  - **"Salaris nu" ships empty.** `currentSalary` is an optional prop and
    `salaris.astro` doesn't pass it: a prefilled value made the static page
    state "Je verdient nu € 3.600,00" before the visitor had typed
    anything, which is the one number on the page that wouldn't be a fact.
    The result card shows a prompt instead, and the keep-up block plus the
    cao "jouw salaris" line appear once a salary is entered. Everything
    still indexed is real: the required amount, the price rise and the cao
    comparison.
  - No breadcrumb: the header is the way back to `/`. The year pages keep
    theirs, so `webPageSchema()` takes a `breadcrumb` flag (see SEO).
  - `/salaris` without the trailing slash 301s (`_redirects`).
- `/gulden/<year>/` (1900–2001) and `/euro/<year>/` (2002 up to the year
  before `latestYearlyYear`) — one page per year,
  `src/pages/[currency]/[year].astro`, answering "Wat is 100 gulden uit
  1980 nu waard?". ~125 pages, all built from the same CBS data. What's
  on each, all computed for that year: the headline answer (yearly
  averages, exact), for years from 1963 the same-month comparison with
  the latest month, an amounts table (ƒ 1 … ƒ 10.000), the reverse
  conversion, that year's inflation versus the long-term average and the
  highest/lowest year since, a price-level chart (`PriceChart.astro`),
  the calculator prefilled with that year (yearly average → latest
  complete year), and links to the previous/next year and that decade.
  Linked from every row of the homepage table and from the homepage FAQ.
  - **Why they exist and the thin-content risk.** They target exact
    long-tail questions and give AI answers a precise, citable page (an
    AI summary once answered "€78–95" for ƒ 100 from 1980; the right
    figure is ~€134). Neighbouring pages differ in ~23% of their words —
    almost all numbers — so they are template pages by nature. Keep every
    addition *year-specific data*, never generic filler text. The owner
    planned to check Search Console 4–8 weeks after launch and `noindex`
    pages that get no impressions at all.
  - Wrong-currency URLs (`/euro/1980/`) are plain 404s. A missing
    trailing slash 301s (`_redirects`; Cloudflare would 307).
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
- `src/components/Header.astro` (rendered by `Layout.astro` on every
  page) follows the header on nickhuijgen.nl: wordmark left, links
  right, **no background fill, no border, not sticky** — it scrolls away
  with the page rather than sitting on top of the result on a phone.
  Two links only; the year pages are reached from the homepage table.
  The footer lives in `Layout.astro` too, so no page repeats either.

## Accessibility
- The swap control is a real `<button>` with an `aria-label`, and the
  icon inside it is `aria-hidden`.
- Recalculations are announced through the `role="status"` element
  (`#result-status`, `#salary-result-status`), updated only on `change`
  so a screen reader isn't interrupted on every keystroke. The results
  container itself is **not** `aria-live` — this doc claimed it was for a
  while, and neither calculator has ever worked that way.
- Every input has a `<label for>`.
- Nothing is signalled by colour alone: whether a salary kept up with
  inflation is carried by the words ("gedaald"/"gestegen", "meer"/
  "minder"), not by a red or green number.
- Header and nav links are ≥ 44px tall and mark the current page with
  `aria-current="page"` (plus an underline, so it isn't colour-only).

## SEO
- All `<head>` metadata lives in `src/layouts/Layout.astro`: title and
  description (props), Open Graph / Twitter tags, canonical, icons, and
  whatever JSON-LD the page passes in its `jsonLd` prop. Every JSON-LD
  object comes from `src/lib/schema.ts`. The nodes are one graph, linked
  by `@id` instead of repeating entities:
  - `WebSite` (`/#website`) — on **every** indexable page, so the
    `isPartOf` references resolve on the page itself. Google reads it on
    the homepage to pick the site name it shows in results; the matching
    signal in the head is `og:site_name`.
  - Homepage: `WebPage` (`/#webpage`) → `mainEntity` → `WebApplication`
    (`/#app`, free `offers`, `author`), which points back with
    `mainEntityOfPage`.
  - Year pages: `WebPage` (`<url>#webpage`) → `breadcrumb` →
    `BreadcrumbList` (`<url>#breadcrumb`).

  Two pairings have to hold, and **nothing checks them at build time**: a
  page emitting `webPageSchema()` must emit `breadcrumbSchema()` too
  *unless* it passes `breadcrumb: false`, and `webApplicationSchema()`
  must be accompanied by `homePageSchema()`. Drop one half and the
  other's `@id` reference points at a node that isn't on the page.
  `breadcrumb: false` exists for `/salaris`, which shows no trail:
  structured data has to describe what is actually on the page, so a
  `BreadcrumbList` for a breadcrumb the visitor can't see is the same
  kind of guidelines risk as the `FAQPage` and `QAPage` markup below.
  If a visible trail is ever added back, add `breadcrumbSchema()` with
  it.

  `dateModified` (CBS's own last-update date of the data — not the build
  date, which changes daily and would misrepresent freshness) is on every
  node that has a body of content behind it. `isBasedOn` (both CBS
  datasets) is on the `WebApplication` and on the year pages' `WebPage`;
  the homepage's `WebPage` leaves it out because the `#app` node on that
  same page already carries it. `WebSite` deliberately has no
  `alternateName`: the bare domain is already Google's fallback for the
  site name, and offering it as an alternate invites the SERP to show
  `inflatie-berekenen.nl` instead of “Inflatie Berekenen”. No
  `meta keywords` — search engines ignore it.
- `trailingSlash: 'always'` (astro.config.mjs): every page URL, canonical
  and sitemap entry ends in `/`, matching how Cloudflare serves
  directory-style pages.
- Trust signals, visible on the page: the source line under the result
  ("Bron: CBS, cijfers tot en met … (bijgewerkt op …)"), and the author
  linking to https://nickhuijgen.nl/.
- `/salaris` emits `WebPage` only — no `BreadcrumbList`, because the
  owner removed the visible trail (see above). It passes
  `datasetsWithCao` as `isBasedOn` (the `isBasedOn` prop on
  `webPageSchema()` exists for exactly that) so it cites the cao dataset
  as well. Its `dateModified` is the later of the price and cao update
  dates. It is deliberately not a second `WebApplication`: that node's
  `@id` is the homepage's `/#app`. The header is its only way back to
  `/`, so don't remove that link.
- Each table row has an id (`#jaar-1980`) so a specific year can be
  linked to directly; the targeted row is highlighted.
- The social image is `public/og-image.png` (1200×630 PNG, named by both
  `og:image` and `twitter:image` — X falls back to `og:image`, but a
  card that declares `summary_large_image` should say which image it
  means). Its source is `design/og-image.html`, with
  the command to regenerate it in a comment at the top. The
  `og:image:width`/`height`/`type` meta in `Layout.astro` assume exactly
  that size and format.
- Icons: `favicon.ico` (32×32) and `apple-touch-icon.png` (180×180) are
  both resized from `public/icon.png`.
- Deliberately **not** used: FAQPage structured data (Google only shows
  FAQ rich results for government and health sites), `QAPage` on the
  year pages (Google scopes it to pages with user-submitted answers, so
  self-authored content there is a guidelines risk), `potentialAction` /
  SearchAction (the sitelinks searchbox was retired in 2024) and ratings
  in the JSON-LD (none are actually collected; adding them violates
  Google's guidelines).
- The homepage's historical-values table is the overview for long-tail
  searches; each row links to that year's own page (see Routes), which
  is the page meant to rank for "wat is 100 gulden uit 1980 nu waard".
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
  Nuxt sitemap URL), `/index.html` → `/`, and the trailing-slash rules
  for `/salaris` and the year pages, all 301 (Cloudflare would otherwise
  answer with a 307).
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
- `npm run verify` — `astro check`, then `npm test`, then `astro build`.
  This is the normal way to run all three: `check` first, because
  `build` on its own is not a safety net for type errors (`astro build`
  does not type-check). 0 errors, warnings and hints expected.
  Deliberately *not* wired into `build` itself, matching the
  portfolio — which means Cloudflare (which runs `npm run build`) will
  deploy code that fails `check` or the tests, so run `verify` before
  every push.
- `npm test` — `node --test test/`. No dependency and no network: the
  suite runs the real modules against a **frozen** CBS snapshot
  (`test/fixtures/cbs.json`, taken 2026-09-29), so the expected values
  are facts rather than whatever CBS published this morning. Regenerate
  the fixture only on purpose, and expect to update the expected values
  with it. What it covers:
  - `test/inflation.test.ts` — `parseAmount`/formatting, yearly averages
    against the index ratio, the compound average, the round trip and
    the 2002 crossing, missing figures (including a CBS period with no
    usable value, which used to publish `€ NaN`), the latest period, and
    that the compact copy the browser rebuilds from answers identically.
  - `test/salary.test.ts` — the real-versus-nominal rules, the currency
    conversion, and `wageComparison()`'s whole contract: cao and price
    figures from one period, fallbacks yearly and inside the cao range,
    the right `reason`, and no verdict outside an exact period.
  - `test/invariants.test.ts` — the pairings in the table above, which
    nothing else checks: every `element()` id exists in its component,
    one data-embedding calculator per page, the JSON-LD pairing rules,
    the header's trailing slashes, the shared URL parameter names, and
    the year-page prefixes against `public/_redirects`.
- `npm run check` / `npm run build` — the two halves on their own.
- `npm run lint` — ESLint (flat config, `eslint-plugin-astro`,
  typescript-eslint). Note that it runs with `--fix`.
- Load the built page (`npm run preview`) and exercise the calculator,
  not just the build: default result on load, a pre-2002 → post-2002
  calculation (`ƒ` → `€`), the swap button, Dutch input (`1.234,50` is
  read as 1234.5 and reformatted on blur), amount `0` or text (dims;
  resets to `1,00` on blur), years outside 1900–latest (clamped on
  blur), an empty year field, a month without data (e.g. December of
  the current year: explains why), Enter in a field (must not reload),
  a year before 1963 with a month selected (switches to the yearly
  average and explains why), a URL with parameters
  (`/?bedrag=250&van=1980&naar=2026&maand=08`)
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
  after any copy change. A second variant: inside a `<Fragment>` within
  an expression (`{cond ? <Fragment>…</Fragment> : …}`) Astro follows
  JSX whitespace rules, so even the space in `{year} {direction}` is
  dropped ("Sinds 2024stegen"). Use a template string there
  (`` {`Sinds ${year} ${direction} …`} ``). Scanning all pages for a
  four-digit number glued to a word (`\d{4}[a-z]{2,}`) catches it.
- Year pages come in the hundreds, so check them mechanically across
  **all** of `dist/`, not by opening a few: every title and description
  unique; every internal `href` resolves to a file in `dist/`; every
  canonical equals the page's own URL; every JSON-LD block parses; the
  sitemap lists every page and not the 404. Then read a few extremes in
  full: the first year (1900, which has no previous year), a year around
  1963 (monthly data starts), 2001/2002 (currency switch) and the newest
  year (where "keer zo duur" wording would be silly).
- If you touched `inflation.ts`: the full old-vs-new diff described
  under Calculation. Adding an export counts — run it anyway; it takes
  seconds and proves the existing output is untouched (209,677
  combinations, expect **0** differences).
- If you touched anything under `/salaris`, run its own pass of the
  browser checklist above against the salary form, plus:
  - `Salaris nu` left empty must show the headline answer with the
    keep-up block hidden — not an error; garbage in that field clears it
    rather than inventing a salary.
  - A comparison whose cao period had to fall back (any month
    comparison starting before 2020, so including the page's own
    default) must print the cao period it used, the note explaining it,
    and **no** "meer/minder dan de cao-lonen" verdict. A yearly
    comparison inside 1972–latest must print the verdict.
  - A period with no cao figures at all (both years before 1972) hides
    the whole cao block.
  - Check `wageComparison()` across every year pair × month: cao and
    price figures always from the same period, fallbacks always yearly
    and inside the cao range.
- Because the header and footer now live in `Layout.astro`, a change to
  either touches all ~127 pages: check one of each kind (`/`,
  `/salaris/`, a year page, `404.html`) for the right
  `aria-current="page"` and a footer.
- If you touched `wrangler.jsonc`, `_headers`, `_redirects` or the 404 page: run
  `npx wrangler dev --port 8787 --local` against a fresh `npm run build`
  (`astro dev`/`astro preview` don't apply Cloudflare's asset handling)
  and check `/` is 200, an unknown path is 404 *with* the custom page's
  body, and `/_astro/*` carries the immutable `Cache-Control`.
- Cloudflare builds on the Node version in `.node-version`; Astro needs
  ≥ 22.12 (`engines`). If you bump dependencies, check that a clean
  `npm ci && npm run build` works on that version, not only on your
  local Node.
