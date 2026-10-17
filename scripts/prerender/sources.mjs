// Builds the list of pages to prerender. Every function returns "page" objects:
//   { type, route, title, description, image, vars?, crawlerLinks?, canonical?, noindex?, ... }
import { existsSync } from 'fs';
import { join } from 'path';
import {
  DOMAIN, SITE, ROOT, STATIC_PAGES, DYNAMIC_PAGES,
  tierPokemon, trophiesData, resourcesData, pokemonData,
} from './config.mjs';
import { slugify, sanitizeName, capitalize, fill, fetchJson } from './utils.mjs';

const absolute = (path) => (path.startsWith('http') ? path : `${DOMAIN}${path}`);

// ---------- pokemon tier / sprite helpers ----------
const tierLookup = {};
for (const [tier, names] of Object.entries(tierPokemon)) {
  for (const name of names) tierLookup[sanitizeName(name)] = tier;
}
const tierFolder = (tier) => `tier_${tier.replace(/\D/g, '')}`;

function localPokemonGif(name) {
  const sanitized = sanitizeName(name);
  const tier = tierLookup[sanitized];
  return `/images/pokemon_gifs/${tier ? tierFolder(tier) : 'tier_0'}/${sanitized}.gif?v=2`;
}

// ---------- players ----------
export async function getPlayers() {
  const database = await fetchJson(SITE.api.database);
  const template = DYNAMIC_PAGES.player;

  return Object.entries(database).map(([playerName, player]) => {
    const shinies = Object.values(player.shinies || {});
    const favourite = shinies.find(s => s.Favourite?.toLowerCase() === 'yes') || shinies[0];
    const image = favourite ? localPokemonGif(favourite.Pokemon) : '/images/openGraph.jpg';

    return {
      type: 'player',
      route: `/player/${encodeURIComponent(playerName)}`,
      name: playerName,
      title: fill(template.title, { name: playerName }),
      description: fill(template.description, { name: playerName, count: shinies.length }),
      image: absolute(image),
      vars: { player: playerName },
    };
  });
}

// ---------- events ----------
const MIN_DESCRIPTION_LENGTH = 90;

// Short admin-written descriptions are padded so they are not flagged as thin snippets
function padDescription(text, suffix) {
  const base = (text || '').trim();
  if (!base) return '';
  return base.length >= MIN_DESCRIPTION_LENGTH ? base : `${base} ${suffix}`;
}

function eventDescription(event, template) {
  const name = event.title;
  return padDescription(event.description, fill(template.descriptionSuffix, { name }))
    || fill(template.description, { name });
}

export async function getEvents() {
  const events = await fetchJson(SITE.api.events);
  const template = DYNAMIC_PAGES.event;

  return events.map(event => ({
    type: 'event',
    route: `/event/${slugify(event.title)}`,
    name: event.title,
    title: fill(template.title, { name: event.title }),
    description: eventDescription(event, template),
    image: absolute(event.imageLink || '/images/openGraph.jpg'),
    vars: { event: event.title },
    startDate: event.startDate,
    endDate: event.endDate,
  }));
}

// ---------- trophies ----------
export function getTrophies() {
  const template = DYNAMIC_PAGES.trophy;

  return Object.entries(trophiesData.trophies).map(([name, image]) => ({
    type: 'trophy',
    route: `/trophy/${slugify(name)}`,
    name,
    title: fill(template.title, { name }),
    description: fill(template.description, { name }),
    image: absolute(image || '/images/openGraph.jpg'),
    vars: { trophy: name },
  }));
}

// ---------- pokemon ----------
const formatTypes = (types) => types?.map(capitalize).join(' / ') || 'Unknown';

function pokemonImage(sanitized) {
  const tier = tierLookup[sanitized];
  const localFile = tier && join(ROOT, 'public/images/pokemon_gifs', tierFolder(tier), `${sanitized}.gif`);
  // Prefer our locally-hosted gif (fixed disposal method for Discord embeds)
  return localFile && existsSync(localFile)
    ? `${DOMAIN}/images/pokemon_gifs/${tierFolder(tier)}/${sanitized}.gif?v=2`
    : `https://img.pokemondb.net/sprites/black-white/anim/shiny/${sanitized}.gif`;
}

const MAX_TITLE_LENGTH = 70;

export function getPokemon() {
  const template = DYNAMIC_PAGES.pokemon;

  const pages = Object.entries(pokemonData).map(([key, pokemon]) => {
    const name = capitalize(pokemon.displayName || key);
    const sanitized = key.toLowerCase().replace(/\s/g, '-');
    const vars = {
      name,
      types: formatTypes(pokemon.types),
      tier: tierLookup[sanitized] || 'Unknown',
      generation: pokemon.generation ? ` - Gen ${pokemon.generation}` : '',
    };

    return {
      type: 'pokemon',
      route: `/pokemon/${sanitized}`,
      name,
      title: [template.title, template.titleShort]
        .map(t => fill(t, vars))
        .find(t => t.length <= MAX_TITLE_LENGTH) || fill(template.titleShort, vars),
      description: fill(template.description, vars),
      image: pokemonImage(sanitized),
      vars: { pokemon: name },
    };
  });

  return pages.map((page, index) => ({
    ...page,
    previousPokemon: pages[index - 1],
    nextPokemon: pages[index + 1],
  }));
}

// ---------- themes ----------
export async function getThemes() {
  const themesByCategory = await fetchJson(SITE.api.themes);
  const template = DYNAMIC_PAGES.theme;
  const pages = [];

  for (const [category, themes] of Object.entries(themesByCategory)) {
    for (const theme of Object.values(themes)) {
      const vars = { name: theme.name, author: theme.author || 'unknown author', category };
      pages.push({
        type: 'theme',
        route: `/themes/${slugify(theme.name)}`,
        name: theme.name,
        title: fill(template.title, vars),
        description: padDescription(theme.description, fill(template.descriptionSuffix, vars)) || fill(template.description, vars),
        image: absolute(theme.previewImage || '/images/openGraph.jpg'),
        vars: { theme: theme.name, author: vars.author, category },
      });
    }
  }
  return pages;
}

// ---------- resources (nested up to 3 levels, driven by resources.json) ----------
const MAX_RESOURCE_DEPTH = 3;
const isNode = (value) => value && typeof value === 'object' && !Array.isArray(value);
const childrenOf = (node) =>
  Object.entries(node).filter(([key, value]) => !key.startsWith('_') && isNode(value));

export function getResources() {
  const pages = [];
  const hubLink = { href: '/resources/', title: 'Resources' };
  const hrefFor = (trail) => `/resources/${trail.map(slugify).join('/')}/`;

  function walk(node, trail) {
    const siblings = childrenOf(node);

    for (const [name, child] of siblings) {
      const childTrail = [...trail, name];

      if (child._meta) {
        const ancestors = trail.map((ancestor, index) => ({
          href: hrefFor(trail.slice(0, index + 1)),
          title: ancestor,
        }));
        const siblingLinks = siblings
          .filter(([siblingName, sibling]) => siblingName !== name && sibling._meta)
          .map(([siblingName]) => ({ href: hrefFor([...trail, siblingName]), title: siblingName }));
        const childLinks = childTrail.length < MAX_RESOURCE_DEPTH
          ? childrenOf(child)
              .filter(([, grandChild]) => grandChild._meta)
              .map(([childName]) => ({ href: hrefFor([...childTrail, childName]), title: childName }))
          : [];

        pages.push({
          type: 'resource',
          route: hrefFor(childTrail).slice(0, -1),
          title: child._meta.title,
          description: child._meta.description,
          image: SITE.defaultImage,
          crawlerLinks: [hubLink, ...ancestors, ...siblingLinks, ...childLinks],
        });
      }

      if (childTrail.length < MAX_RESOURCE_DEPTH) walk(child, childTrail);
    }
  }

  walk(resourcesData, []);
  return pages;
}

// ---------- static pages (scripts/seo/static_pages.json) ----------
const toLinks = (pages) =>
  pages.map(page => ({ href: `${page.route}/`, title: page.name }));

// Named link groups that static_pages.json entries can reference via "crawlerLinks"
export function buildLinkGroups({ players, events, trophies, pokemon }) {
  // One link per base form (unown, unown-a, unown-b -> unown) to keep the nav small
  const seen = new Set();
  const pokemonLinks = [];
  for (const page of pokemon) {
    const base = page.route.split('/').pop().split('-')[0];
    if (seen.has(base)) continue;
    seen.add(base);
    pokemonLinks.push({ href: `${page.route}/`, title: page.name });
  }

  return {
    ...SITE.crawlerGroups,
    players: players.map(p => ({ href: `${p.route}/`, title: p.name })),
    events: toLinks(events),
    trophies: toLinks(trophies),
    pokemon: pokemonLinks,
    allPokemon: toLinks(pokemon),
  };
}

export function getStaticPages(linkGroups, counts) {
  return Object.entries(STATIC_PAGES).map(([route, page]) => ({
    type: 'static',
    route,
    title: page.title,
    description: page.description,
    image: page.image || SITE.defaultImage,
    canonical: page.canonical,
    noindex: page.noindex,
    collectionItems: page.collection ? counts[page.collection] : undefined,
    pokemonIndexItems: page.collection === 'pokemon' ? linkGroups.allPokemon : undefined,
    crawlerLinks: (page.crawlerLinks || []).flatMap(group => linkGroups[group] || []),
  }));
}
