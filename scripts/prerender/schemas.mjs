// JSON-LD builders. Each returns a plain schema.org object.
import { DOMAIN, CREATORS } from './config.mjs';
import { humanize, withTrailingSlash } from './utils.mjs';

const ORGANIZATION = { '@type': 'Organization', name: 'Team Synergy', url: DOMAIN };
const WEBSITE = { '@type': 'WebSite', name: 'Team Synergy', url: DOMAIN };
const CONTEXT = 'https://schema.org';

export const pageUrl = (route) => `${DOMAIN}${withTrailingSlash(route)}`;

export const webPageSchema = (page) => ({
  '@context': CONTEXT,
  '@type': 'WebPage',
  url: pageUrl(page.route),
  name: page.title,
  description: page.description,
  image: page.image,
  isPartOf: WEBSITE,
  publisher: { ...ORGANIZATION, '@type': 'Organization', logo: { '@type': 'ImageObject', url: `${DOMAIN}/favicon.png` } },
  author: ORGANIZATION,
});

export const collectionPageSchema = (page, itemCount) => ({
  '@context': CONTEXT,
  '@type': 'CollectionPage',
  url: pageUrl(page.route),
  name: page.title,
  description: page.description,
  image: page.image,
  ...(itemCount ? { numberOfItems: itemCount } : {}),
  isPartOf: WEBSITE,
  author: ORGANIZATION,
});

export const resourceCollectionSchema = (page) => ({
  '@context': CONTEXT,
  '@type': 'CollectionPage',
  url: pageUrl(page.route),
  name: page.title.split('|')[0].trim(),
  description: page.description,
  isPartOf: WEBSITE,
  mainEntity: {
    '@type': 'Collection',
    name: page.title.split('|')[0].trim(),
    description: page.description,
    inLanguage: 'en',
    creator: ORGANIZATION,
  },
});

export const personSchema = (page) => ({
  '@context': CONTEXT,
  '@type': 'Person',
  name: page.name,
  url: pageUrl(page.route),
  memberOf: ORGANIZATION,
});

export const pokemonSchema = (page) => ({
  '@context': CONTEXT,
  '@type': 'Thing',
  name: page.name,
  url: pageUrl(page.route),
  image: page.image,
  description: `${page.name} shiny form in PokeMMO`,
});

export const gameSchema = (page) => ({
  '@context': CONTEXT,
  '@type': 'Game',
  name: page.name,
  gamePlatform: 'Web',
  applicationCategory: 'GamingApplication',
  isPartOf: { '@type': 'Game', name: 'PokeMMO' },
});

export const eventSchema = (page) => ({
  '@context': CONTEXT,
  '@type': 'Event',
  name: page.name,
  description: page.description,
  url: pageUrl(page.route),
  image: page.image,
  ...(page.startDate ? { startDate: page.startDate } : {}),
  ...(page.endDate ? { endDate: page.endDate } : {}),
  eventStatus: 'https://schema.org/EventScheduled',
  eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
  location: { '@type': 'VirtualLocation', url: pageUrl(page.route) },
  organizer: ORGANIZATION,
});

export const trophySchema = (page) => ({
  '@context': CONTEXT,
  '@type': 'Award',
  name: page.name,
  description: `${page.name} achievement earned by Team Synergy members in PokeMMO`,
  url: pageUrl(page.route),
  awardedBy: ORGANIZATION,
});

export const faqSchema = (faqs) => ({
  '@context': CONTEXT,
  '@type': 'FAQPage',
  mainEntity: faqs.map(({ question, answer }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer },
  })),
});

export const creatorSchema = () => ({
  '@context': CONTEXT,
  '@type': 'WebSite',
  name: CREATORS.primary.name,
  url: CREATORS.primary.url,
  description: CREATORS.primary.description,
  creator: {
    '@type': 'Organization',
    name: CREATORS.primary.name,
    url: CREATORS.primary.url,
    sameAs: CREATORS.primary.sameAs,
  },
  publisher: { ...ORGANIZATION, logo: `${DOMAIN}/favicon.png` },
});

// Breadcrumb parents must be real pages (there is no /player/, /pokemon/, /event/ or /trophy/ index)
export function breadcrumbSchema(page, parent) {
  const items = [{ name: 'Home', path: '/' }];

  if (page.route !== '/') {
    if (page.type === 'resource') {
      const segments = page.route.split('/').filter(Boolean);
      items.push(parent);
      segments.slice(1).forEach((segment, index) => {
        items.push({
          name: humanize(segment),
          path: `/${segments.slice(0, index + 2).join('/')}`,
        });
      });
    } else {
      if (parent) items.push(parent);
      items.push({ name: page.name || page.title.split('|')[0].trim(), path: page.route });
    }
  }

  return {
    '@context': CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: pageUrl(item.path),
    })),
  };
}

// Picks every schema that applies to a page. `extras` carries lookups from the caller.
export function buildSchemas(source, { faqs, parent }) {
  // Alias pages describe the page they point to via canonical
  const page = source.canonical ? { ...source, route: source.canonical.replace(/\/+$/, '') || '/' } : source;
  const schemas = [webPageSchema(page)];

  if (page.collectionItems) schemas.push(collectionPageSchema(page, page.collectionItems));

  switch (page.type) {
    case 'player': schemas.push(personSchema(page)); break;
    case 'pokemon': schemas.push(pokemonSchema(page), gameSchema(page)); break;
    case 'event': schemas.push(eventSchema(page)); break;
    case 'trophy': schemas.push(trophySchema(page)); break;
    case 'resource': schemas.push(resourceCollectionSchema(page)); break;
  }

  if (faqs?.length) schemas.push(faqSchema(faqs));
  schemas.push(breadcrumbSchema(page, parent), creatorSchema());
  return schemas;
}
