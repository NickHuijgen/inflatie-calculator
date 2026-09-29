# inflatie-calculator

## Over

Deze inflatie bereken app heeft het doel om iedereen een makkelijke en gebruiksvriendelijke manier te geven om inflatie te bereken.
Inflatie is steeds meer te merken en het is dus belangrijk dat iedereen op de hoogte is van hoe de inflatie hun leven beïnvloed.

Naast de calculator op de voorpagina is er een pagina [salaris en inflatie](https://inflatie-berekenen.nl/salaris/) — wat je salaris van vroeger vandaag waard is, en hoe je eigen loonstijging zich verhoudt tot de gemiddelde cao-loonstijging — en een pagina per jaar (`/gulden/1980/`, `/euro/2010/`) met het antwoord op "wat is 100 gulden uit 1980 nu waard?".

Voor de berekening zijn drie datasets van het CBS gebruikt: de [prijsindex 1900=100](https://opendata.cbs.nl/#/CBS/nl/dataset/71905ned/table) voor jaargemiddelden vanaf 1900, de [jaarmutatie consumentenprijsindex](https://opendata.cbs.nl/#/CBS/nl/dataset/70936ned/table?ts=1664823822870) voor maandcijfers vanaf 1963, en de [cao-loonindex](https://opendata.cbs.nl/#/CBS/nl/dataset/85663NED/table) voor de loonvergelijking op de salarispagina.

Dit project is open source zodat het voor iedereen duidelijk is hoe deze data precies gebruikt wordt, en de data en berekening kan verifiëren.

Op de website worden nergens gebruikersgegevens vastgelegd.
De dataset wordt bij het bouwen van de site (dagelijks) bij het CBS opgehaald.

## About

This inflation calculation app is made to ensure everyone has an easy and user-friendly way to calculate inflation.
Inflation is very noticeable in our day-to-day life and so it is important that everyone knows just how much inflation is affecting their lives.

Besides the calculator on the front page there is a [salary and inflation](https://inflatie-berekenen.nl/salaris/) page — what an earlier salary is worth today, and how your own pay rise compares with the average collectively agreed wage rise — and a page per year (`/gulden/1980/`, `/euro/2010/`) answering "what is 100 guilders from 1980 worth now?".

The calculation uses three CBS datasets: the [price index 1900=100](https://opendata.cbs.nl/#/CBS/nl/dataset/71905ned/table) for yearly averages from 1900, the [yearly CPI change](https://opendata.cbs.nl/#/CBS/nl/dataset/70936ned/table?ts=1664823822870) for monthly figures from 1963, and the [collectively agreed wage index](https://opendata.cbs.nl/#/CBS/nl/dataset/85663NED/table) for the wage comparison on the salary page.

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
| `npm test` | Run the calculation and invariant tests (`node --test`) |
| `npm run verify` | `check`, `test`, then `build` — run this before pushing |
| `npm run preview` | Preview the build locally |
| `npm run lint` | Lint and auto-fix with ESLint |
| `npx wrangler dev --port 8787 --local` | Serve `./dist/` the way Cloudflare does (404 page, `_headers`) — run `npm run build` first |
