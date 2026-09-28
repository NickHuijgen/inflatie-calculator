// @ts-check
// https://docs.astro.build/en/reference/configuration-reference/
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://inflatie-berekenen.nl',
  // Every page URL ends in a slash (/gulden/1980/), matching how Cloudflare
  // serves directory-style pages; canonicals and the sitemap follow.
  trailingSlash: 'always',
  integrations: [sitemap()],
  build: {
    // The one stylesheet is small; inlining it removes a render-blocking
    // request (Lighthouse: ~110ms on a throttled phone).
    inlineStylesheets: 'always',
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
