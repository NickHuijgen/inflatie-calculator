import { CBS_DATASET_TITLE, CBS_DATASET_URL, CBS_INDEX_DATASET_URL, CBS_INDEX_TITLE } from './inflation';

// JSON-LD builders. Every indexable page passes its list to Layout.astro's
// `jsonLd` prop; nothing else writes structured data.
//
// The nodes form one graph, linked by @id rather than by repeating entities:
// every indexable page emits websiteSchema() (#website), so the `isPartOf`
// references resolve on the page itself; each page's WebPage node (#webpage)
// points at the calculator (#app) on the homepage, or at its own breadcrumb
// (#breadcrumb) on a year page. Two pairings have to hold, and nothing checks
// them at build time: a page emitting webPageSchema() must emit
// breadcrumbSchema() too, and webApplicationSchema() must be accompanied by
// homePageSchema() -- otherwise those references dangle.

export const SITE_NAME = 'Inflatie Berekenen';

const author = { '@type': 'Person', 'name': 'Nick Huijgen', 'url': 'https://nickhuijgen.nl/' };
const cbs = { '@type': 'Organization', 'name': 'Centraal Bureau voor de Statistiek', 'url': 'https://www.cbs.nl/' };

export const datasets = [
  { '@type': 'Dataset', 'name': CBS_DATASET_TITLE, 'url': CBS_DATASET_URL, 'creator': cbs },
  { '@type': 'Dataset', 'name': CBS_INDEX_TITLE, 'url': CBS_INDEX_DATASET_URL, 'creator': cbs },
];

const websiteId = (site: URL) => new URL('/#website', site).href;
const appId = (site: URL) => new URL('/#app', site).href;
const webPageId = (url: URL) => `${url.href}#webpage`;
const breadcrumbId = (url: URL) => `${url.href}#breadcrumb`;

/**
 * The site as an entity. Emitted on every indexable page so the `isPartOf`
 * references resolve locally; Google reads it on the homepage to decide which
 * name to show for the site in search results.
 */
export function websiteSchema(site: URL): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': websiteId(site),
    'name': SITE_NAME,
    'url': new URL('/', site).href,
    'inLanguage': 'nl',
    'publisher': author,
  };
}

/** The homepage: the page that contains the calculator. */
export function homePageSchema(page: { name: string; description: string; dateModified: Date; site: URL }): Record<string, unknown> {
  const url = new URL('/', page.site);
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': webPageId(url),
    'url': url.href,
    'name': page.name,
    'description': page.description,
    'inLanguage': 'nl',
    'isPartOf': { '@id': websiteId(page.site) },
    'mainEntity': { '@id': appId(page.site) },
    'author': author,
    'dateModified': page.dateModified.toISOString(),
  };
}

/** The calculator itself (the homepage). */
export function webApplicationSchema(site: URL, dateModified: Date): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': appId(site),
    'name': SITE_NAME,
    'url': new URL('/', site).href,
    'inLanguage': 'nl',
    'description': 'Calculator voor inflatie en koopkracht in Nederland',
    'applicationCategory': 'FinanceApplication',
    'operatingSystem': 'Any',
    'isAccessibleForFree': true,
    'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'EUR' },
    'author': author,
    'mainEntityOfPage': { '@id': webPageId(new URL('/', site)) },
    'dateModified': dateModified.toISOString(),
    'isBasedOn': datasets,
  };
}

/** An ordinary content page that belongs to the calculator site. */
export function webPageSchema(page: { url: URL; name: string; description: string; dateModified: Date; site: URL }): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': webPageId(page.url),
    'url': page.url.href,
    'name': page.name,
    'description': page.description,
    'inLanguage': 'nl',
    'isPartOf': { '@id': websiteId(page.site) },
    'breadcrumb': { '@id': breadcrumbId(page.url) },
    'author': author,
    'dateModified': page.dateModified.toISOString(),
    'isBasedOn': datasets,
  };
}

/** The trail for `pageUrl`. Referenced by that page's webPageSchema(). */
export function breadcrumbSchema(pageUrl: URL, items: { name: string; url: URL }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': breadcrumbId(pageUrl),
    'itemListElement': items.map((item, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'name': item.name,
      'item': item.url.href,
    })),
  };
}
