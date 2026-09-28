# inflatie-calculator

## Over

Deze inflatie bereken app heeft het doel om iedereen een makkelijke en gebruiksvriendelijke manier te geven om inflatie te bereken.
Inflatie is steeds meer te merken en het is dus belangrijk dat iedereen op de hoogte is van hoe de inflatie hun leven beïnvloed.

Voor de berekening is gebruik gemaakt van [deze](https://opendata.cbs.nl/#/CBS/nl/dataset/70936ned/table?ts=1664823822870) dataset van het CBS.

Dit project is open source zodat het voor iedereen duidelijk is hoe deze data precies gebruikt wordt, en de data en berekening kan verifiëren.

Op de website worden nergens gebruikersgegevens vastgelegd.
De dataset wordt direct van het cbs opgehaald.

## About

This inflation calculation app is made to ensure everyone has an easy and user-friendly way to calculate inflation.
Inflation is very noticeable in our day-to-day life and so it is important that everyone knows just how much inflation is affecting their lives.

For the calculation [this](https://opendata.cbs.nl/#/CBS/nl/dataset/70936ned/table?ts=1664823822870) dataset from the CBS was used.

This project is open source so everyone can see how the data is being used and can very the data and calculation are correct.

No user data is collected on the website.
The dataset is fetched directly from the cbs.

## Setup

Built with [Astro](https://astro.build) and Tailwind CSS, with a small
vanilla TypeScript script for the calculator — no client framework. The
CBS data is fetched in the browser on every visit, so new figures show up
without a rebuild.

Deployed to Cloudflare as Workers static assets (`wrangler.jsonc`):
Cloudflare builds and deploys every push to `master`. The domain's DNS is
on Cloudflare; the registrar is Hostnet. See the Hosting section of
[`AGENTS.md`](./AGENTS.md) for the full setup — it's the primary reference
for working on this codebase, human or AI.

All commands run from the project root:

| Command | Action |
| :--- | :--- |
| `npm install` | Install dependencies |
| `npm run dev` | Start the dev server at `localhost:4321` |
| `npm run build` | Type-check (`astro check`) and build the site to `./dist/` |
| `npm run preview` | Preview the build locally |
| `npm run lint` | Lint and auto-fix with ESLint |
| `npx wrangler dev --port 8787 --local` | Serve `./dist/` the way Cloudflare does (404 page, `_headers`) — run `npm run build` first |
