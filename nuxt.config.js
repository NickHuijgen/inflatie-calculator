// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-04',
  future: {
    compatibilityVersion: 4,
  },
  ssr: true,
  app: {
    baseURL: '/',
    head: {
      title: 'Inflatie Berekenen - Bereken Koopkracht en Inflatie in Nederland',
      htmlAttrs: {
        lang: 'nl'
      },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Bereken eenvoudig inflatie en koopkracht in Nederland vanaf 1963. Gratis inflatie calculator voor gulden en euro met actuele CBS data.' },
        { name: 'format-detection', content: 'telephone=no' },
        { name: 'keywords', content: 'inflatie, koopkracht, inflatie berekenen, inflatie calculator, CPI, consumentenprijsindex, Nederland, CBS, gulden inflatie, gulden' },
        { name: 'author', content: 'Nick Huijgen' },
        { property: 'og:title', content: 'Inflatie Berekenen - Bereken Koopkracht en Inflatie' },
        { property: 'og:description', content: 'Bereken eenvoudig inflatie en koopkracht in Nederland vanaf 1963.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://inflatie-berekenen.nl/' },
        { property: 'og:image', content: 'https://inflatie-berekenen.nl/icon.png' },
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:title', content: 'Inflatie Berekenen - Bereken Koopkracht en Inflatie' },
        { name: 'twitter:description', content: 'Bereken eenvoudig inflatie en koopkracht in Nederland vanaf 1963.' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/icon.png' },
        { rel: 'canonical', href: 'https://inflatie-berekenen.nl/' }
      ]
    }
  },
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/sitemap',
  ],
  site: {
    url: 'https://inflatie-berekenen.nl/',
  },
  devtools: { enabled: true },
  nitro: {
    prerender: {
      routes: ['/']
    }
  }
})

