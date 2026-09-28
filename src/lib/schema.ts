import { CBS_DATASET_TITLE, CBS_DATASET_URL, CBS_INDEX_DATASET_URL, CBS_INDEX_TITLE } from './inflation';

// JSON-LD builders. Every indexable page passes its list to Layout.astro's
// `jsonLd` prop; nothing else writes structured data.

export const SITE_NAME = 'Inflatie Berekenen';

const author = { '@type': 'Person', 'name': 'Nick Huijgen', 'url': 'https://nickhuijgen.nl/' };
const cbs = { '@type': 'Organization', 'name': 'Centraal Bureau voor de Statistiek', 'url': 'https://www.cbs.nl/' };

export const datasets = [
  { '@type': 'Dataset', 'name': CBS_DATASET_TITLE, 'url': CBS_DATASET_URL, 'creator': cbs },
  { '@type': 'Dataset', 'name': CBS_INDEX_TITLE, 'url': CBS_INDEX_DATASET_URL, 'creator': cbs },
];

/** The calculator itself (the homepage). */
export function webApplicationSchema(site: URL, dateModified: Date): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': new URL('/#app', site).href,
    'name': SITE_NAME,
    'url': new URL('/', site).href,
    'inLanguage': 'nl',
    'description': 'Calculator voor inflatie en koopkracht in Nederland',
    'applicationCategory': 'FinanceApplication',
    'operatingSystem': 'Any',
    'isAccessibleForFree': true,
    'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'EUR' },
    'author': author,
    'dateModified': dateModified.toISOString(),
    'isBasedOn': datasets,
  };
}

/** An ordinary content page that belongs to the calculator site. */
export function webPageSchema(page: { url: URL; name: string; description: string; dateModified: Date; site: URL }): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    'url': page.url.href,
    'name': page.name,
    'description': page.description,
    'inLanguage': 'nl',
    'isPartOf': { '@type': 'WebSite', 'name': SITE_NAME, 'url': new URL('/', page.site).href },
    'author': author,
    'dateModified': page.dateModified.toISOString(),
    'isBasedOn': datasets,
  };
}

export function breadcrumbSchema(items: { name: string; url: URL }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': items.map((item, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'name': item.name,
      'item': item.url.href,
    })),
  };
}
