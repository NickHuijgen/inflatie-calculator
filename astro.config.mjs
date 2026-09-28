// https://docs.astro.build/en/reference/configuration-reference/
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://inflatie-berekenen.nl',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
