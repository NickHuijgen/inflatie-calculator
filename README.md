# inflatie-calculator

## Over

Deze inflatie bereken app heeft het doel om iedereen een makkelijke en gebruiksvriendelijke manier te geven om inflatie te bereken.
Inflatie is steeds meer te merken en het is dus belangrijk dat iedereen op de hoogte is van hoe de inflatie hun leven beïnvloed.

Voor de berekening zijn twee datasets van het CBS gebruikt: de [prijsindex 1900=100](https://opendata.cbs.nl/#/CBS/nl/dataset/71905ned/table) voor jaargemiddelden vanaf 1900, en de [jaarmutatie consumentenprijsindex](https://opendata.cbs.nl/#/CBS/nl/dataset/70936ned/table?ts=1664823822870) voor maandcijfers vanaf 1963.

Dit project is open source zodat het voor iedereen duidelijk is hoe deze data precies gebruikt wordt, en de data en berekening kan verifiëren.

Op de website worden nergens gebruikersgegevens vastgelegd.
De dataset wordt bij het bouwen van de site (dagelijks) bij het CBS opgehaald.

## About

This inflation calculation app is made to ensure everyone has an easy and user-friendly way to calculate inflation.
Inflation is very noticeable in our day-to-day life and so it is important that everyone knows just how much inflation is affecting their lives.

The calculation uses two CBS datasets: the [price index 1900=100](https://opendata.cbs.nl/#/CBS/nl/dataset/71905ned/table) for yearly averages from 1900, and the [yearly CPI change](https://opendata.cbs.nl/#/CBS/nl/dataset/70936ned/table?ts=1664823822870) for monthly figures from 1963.

This project is open source so everyone can see how the data is being used and can very the data and calculation are correct.

No user data is collected on the website.
The dataset is fetched from the CBS when the site is built (daily).

## Setup

Built with [Astro](https://astro.build) and Tailwind CSS, with a small
vanilla TypeScript script for the calculator — no client framework. The
CBS data is fetched at build time and embedded in the page; a daily
scheduled rebuild picks up new figures.

Deployed to Cloudflare as Workers static assets (`wrangler.jsonc`):
Cloudflare builds and deploys every push to `master`. The domain's DNS is
on Cloudflare (`www` redirects to the apex); the registrar is Hostnet. See the Hosting section of
[`AGENTS.md`](./AGENTS.md) for the full setup — it's the primary reference
for working on this codebase, human or AI.

All commands run from the project root:

| Command | Action |
| :--- | :--- |
| `npm install` | Install dependencies |
| `npm run dev` | Start the dev server at `localhost:4321` |
| `npm run build` | Build the site to `./dist/` |
| `npm run check` | Type-check `.astro`/`.ts` files (`astro check`) |
| `npm run verify` | `check` then `build` — run this before pushing |
| `npm run preview` | Preview the build locally |
| `npm run lint` | Lint and auto-fix with ESLint |
| `npx wrangler dev --port 8787 --local` | Serve `./dist/` the way Cloudflare does (404 page, `_headers`) — run `npm run build` first |
