// @ts-check
// https://docs.astro.build/en/reference/configuration-reference/
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://inflatie-berekenen.nl',
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
