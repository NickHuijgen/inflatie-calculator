// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-04',
  future: {
    compatibilityVersion: 4,
  },
  ssr: false,
  app: {
    baseURL: '/',
    head: {
      title: 'Inflatie Berekenen',
      htmlAttrs: {
        lang: 'en'
      },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Met deze inflatie calculator kan iedereen gemakkelijk en snel berekenen hoe inflatie jouw leven beïnvloed en hoe snel onze koopkracht daalt' },
        { name: 'format-detection', content: 'telephone=no' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/icon.png' }
      ]
    }
  },
  modules: [
    '@nuxtjs/tailwindcss',
  ],
  devtools: { enabled: true },
  nitro: {
    prerender: {
      routes: ['/']
    },
    output: {
      publicDir: '.output/public'
    }
  },
  hooks: {
    'nitro:build:public-assets': (nitro) => {
      // Ensure .nojekyll file exists for GitHub Pages
      const fs = require('fs')
      const path = require('path')
      const nojekyllPath = path.resolve(nitro.options.output.publicDir, '.nojekyll')
      if (!fs.existsSync(nojekyllPath)) {
        fs.writeFileSync(nojekyllPath, '')
      }
    }
  }
})

