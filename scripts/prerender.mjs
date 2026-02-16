import { readFile, writeFile, mkdir } from 'fs/promises';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const tierPokemonPath = join(__dirname, '../src/data/tier_pokemon.json');
const tierPokemonRaw = await readFile(tierPokemonPath, 'utf-8');
const tierPokemon = JSON.parse(tierPokemonRaw);
const trophiesPath = join(__dirname, '../src/data/trophies.json');
const trophiesRaw = await readFile(trophiesPath, 'utf-8');
const trophiesData = JSON.parse(trophiesRaw);

const DIST = join(__dirname, '..', 'dist');


const PAGE_KEYWORDS = {
  '/': 'PokeMMO shiny showcase, shiny collection, PokeMMO community, Team Synergy, team shiny hunting, Pokemon collectors',
  '/pokedex': 'PokeMMO Pokédex, Pokédex tracker, Generation 1-5 Pokemon, PokeMMO shiny tracker, Pokemon database, PokeMMO Shiny Locations, PokeMMO Where to Shiny Hunt, PokeMMO Catch Calculator',
  '/random-pokemon-generator': 'Pokemon randomizer, shiny hunt randomizer, random Pokemon generator, shiny bingo cards, encounter picker, hunt challenge',
  '/counter-generator': 'PokeMMO counter theme, counter theme generator, encounter counter, PokeMMO tools, theme customizer, counter maker',
  '/events': 'PokeMMO events, shiny hunting competition, PokeMMO PVP events, gaming tournament, team events, community challenges',
  '/trophy-board': 'PokeMMO trophies, achievement trophies, trophy list, PokeMMO leaderboard, gaming achievements, community awards',
  '/streamers': 'PokeMMO streamers, PokeMMO Twitch streamers, PokeMMO YouTube, gaming livestream, content creators, streamer directory',
  '/shiny-war-2025': 'Shiny Wars 2025, PokeMMO competition, Shiny Wars standings, leaderboard results, shiny catching championship, competition rankings, team synergy shiny war results',
  '/about': 'Team Synergy PokeMMO, PokeMMO community, how to join Team Synergy, team membership, PokeMMO guild, community guide, pokemmo team recruitment, how to find a team in PokeMMO',
};

const DYNAMIC_KEYWORDS = {
  pokemon: '{pokemon} shiny, {pokemon} PokeMMO, Pokemon stats, Pokemon abilities, {pokemon} pokemmo catch location, {pokemon} pokemmo catch calculator, {pokemon} encounter, tier rank',
  player: '{player} shiny collection, {player} PokeMMO player, player profile, encounter statistics, trophy showcase, shiny hunter',
  trophy: '{trophy} trophy, {trophy} achievement, PokeMMO trophy, trophy winners, gaming award, community milestone',
  event: '{event} PokeMMO event, {event} tournament, event details, tournament rules, competition schedule, event prizes',
};
// ================================================================

// ---------------- STATIC ROUTES ----------------
const STATIC_ROUTES = [
  '/',
  '/shotm',
  '/pokedex',
  '/streamers',
  '/trophy-board',
  '/events',
  '/counter-generator',
  '/random-pokemon-generator',
  '/shiny-war-2025',
  '/about',
];


// ---------------- OVERRIDE getLocalPokemonGif FOR NODE ----------------
function getLocalPokemonGif(name) {
  // replicate your utils/pokemon.js logic
  function sanitize(name) {
    return name
      .trim()
      .toLowerCase()
      .replace(/[\u2018\u2019']/g, '')
      .replace(/\./g, '')
      .replace(/\s+/g, '-')
      .replace(/[♀]/g, 'f')
      .replace(/[♂]/g, 'm');
  }

  const tierLookup = {};
  Object.entries(tierPokemon).forEach(([tier, names]) => {
    names.forEach(n => (tierLookup[sanitize(n)] = tier));
  });

  const GIF_FOLDER_OVERRIDES = {
    'porygon-z': 'tier_0',
    'porygon2': 'tier_0',
    'bonsly': 'tier_1',
    'happiny': 'tier_1',
    'chingling': 'tier_5',
    'cleffa': 'tier_5',
    'elekid': 'tier_5',
    'magmortar': 'tier_5',
    'probopass': 'tier_5',
    'azurill': 'tier_7',
    'igglybuff': 'tier_7',
    'mantyke': 'tier_7',
    'pichu': 'tier_7',
    'smoochum': 'tier_7',
    'wynaut': 'tier_7',
  };

  const sanitized = sanitize(name);
  if (GIF_FOLDER_OVERRIDES[sanitized]) {
    return `/images/pokemon_gifs/${GIF_FOLDER_OVERRIDES[sanitized]}/${sanitized}.gif?v=1`;
  }
  const tier = tierLookup[sanitized];
  const folder = tier ? `tier_${tier.replace(/\D/g, '')}` : 'tier_0';
  return `/images/pokemon_gifs/${folder}/${sanitized}.gif?v=1`;
}

// ---------------- FETCH DYNAMIC DATA ----------------
async function getPlayers() {
  const res = await fetch('https://adminpage.hypersmmo.workers.dev/admin/database');
  const data = await res.json();

  return Object.entries(data).map(([playerName, player]) => {
    const shinies = Object.values(player.shinies || {});
    const fav = shinies.find(s => s.Favourite?.toLowerCase() === 'yes') || shinies[0];
    const ogImage = fav ? getLocalPokemonGif(fav.Pokemon) : '/favicon.png';

    return {
      route: `/player/${encodeURIComponent(playerName.toLowerCase())}`,
      ogTitle: `${playerName}'s Shinies | Team Synergy - PokeMMO`,
      ogDescription: `Browse ${playerName}'s shiny Pokemon collection in PokeMMO.`,
      ogImage: `https://synergymmo.com${ogImage}`,
    };
  });
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // replace non-alphanumeric with dash
    .replace(/^-+|-+$/g, '')     // remove leading/trailing dashes
}

async function getStreamers() {
  const streamersPath = join(__dirname, '../src/data/streamers.json');
  const raw = await readFile(streamersPath, 'utf-8');
  const streamerNames = JSON.parse(raw);
  
  return streamerNames.map(name => ({
    route: `/streamers#${name}`,
    title: name
  }));
}

async function getEvents() {
  const res = await fetch('https://adminpage.hypersmmo.workers.dev/admin/events');
  const data = await res.json();

  return data.map(e => {
    const ogImage = e.imageLink || '/favicon.png';
    const slug = slugify(e.title);

    return {
      route: `/event/${slug}`, // updated to slug instead of id
      ogTitle: `${e.title} | Team Synergy - PokeMMO`,
      ogDescription: e.description || `Join the ${e.title} event in PokeMMO.`,
      ogImage: ogImage.startsWith('http') ? ogImage : `https://synergymmo.com${ogImage}`,
    };
  });
}

async function getPokemon() {
  const pokemonPath = join(__dirname, '../src/data/pokemmo_data/pokemon-data.json');
  const raw = await readFile(pokemonPath, 'utf-8');
  const pokemonData = JSON.parse(raw);

    function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  }

  function formatTypes(types) {
    return types?.map(capitalize).join(' / ') || 'Unknown';
  }

  function sanitize(name) {
    return name
      .trim()
      .toLowerCase()
      .replace(/[\u2018\u2019']/g, '')
      .replace(/\./g, '')
      .replace(/\s+/g, '-')
      .replace(/[♀]/g, 'f')
      .replace(/[♂]/g, 'm');
  }

  // Build tier lookup
  const tierLookup = {};
  Object.entries(tierPokemon).forEach(([tier, names]) => {
    names.forEach(n => (tierLookup[sanitize(n)] = tier));
  });

  return Object.entries(pokemonData).map(([key, pokemon]) => {
    const name = capitalize(pokemon.displayName || key);
    const sanitized = key.toLowerCase().replace(/\s/g, '-');
    const animatedShinyGif = `https://img.pokemondb.net/sprites/black-white/anim/shiny/${sanitized}.gif`;

    const types = formatTypes(pokemon.types);
    const tier = tierLookup[sanitized] || 'Unknown';
    const abilities = pokemon.abilities?.join(', ') || 'Unknown';
    const generation = pokemon.generation ? `Gen ${pokemon.generation}` : '';

    const ogDescription = `${name} (${types}) - Tier: ${tier} ${generation ? '- ' + generation : ''}. View ${name} details, shiny form, location, and abilities in Team Synergy's PokeMMO Pokédex.`;

    return {
      route: `/pokemon/${sanitized}`,
      ogTitle: `${name} Shiny Dex | Type: ${types} | Team Synergy - PokeMMO`,
      ogDescription: ogDescription,
      ogImage: animatedShinyGif,
    };
  });

}


export async function getTrophies() {
  const trophiesPath = join(__dirname, '../src/data/trophies.json');
  const raw = await readFile(trophiesPath, 'utf-8');
  const { trophies } = JSON.parse(raw);

  return Object.keys(trophies).map(name => {
    const slug = slugify(name);
    const img = trophies[name] || '/favicon.png';
    const DOMAIN = 'https://synergymmo.com';

    return {
      route: `/trophy/${slug}`,
      ogTitle: `${name} Trophy | Team Synergy - PokeMMO`,
      ogDescription: `See which Team Synergy members earned the ${name} trophy in PokeMMO.`,
      ogImage: `${DOMAIN}${img}`,
    };
  });
}

// ---- SEO SCHEMA FUNCTIONS ----
function generatePersonSchema(playerName) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": playerName,
    "url": `https://synergymmo.com/player/${playerName.toLowerCase()}/`,
    "memberOf": {
      "@type": "Organization",
      "name": "Team Synergy",
      "url": "https://synergymmo.com"
    }
  };
}

function generatePokemonSchema(name, sanitized) {
  return {
    "@context": "https://schema.org",
    "@type": "Thing",
    "name": name,
    "url": `https://synergymmo.com/pokemon/${sanitized}/`,
    "image": `https://img.pokemondb.net/sprites/black-white/anim/shiny/${sanitized}.gif`,
    "description": `${name} shiny form in PokeMMO`
  };
}

function generateBreadcrumbSchema(routePath, routeName) {
  const segments = routePath.split('/').filter(Boolean);
  let itemListElements = [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://synergymmo.com/"
    }
  ];
  
  let currentPath = '';
  segments.slice(0, -1).forEach((segment, idx) => {
    currentPath += '/' + segment;
    itemListElements.push({
      "@type": "ListItem",
      "position": idx + 2,
      "name": segment.charAt(0).toUpperCase() + segment.slice(1),
      "item": `https://synergymmo.com${currentPath}/`
    });
  });
  
  // Only add final breadcrumb if not on home page
  if (routePath !== '/') {
    itemListElements.push({
      "@type": "ListItem",
      "position": itemListElements.length + 1,
      "name": routeName,
      "item": `https://synergymmo.com${routePath}/`
    });
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": itemListElements
  };
}
// ---- END SCHEMA FUNCTIONS ----

// ---- UTILITY: SANITIZE FUNCTION ----
function sanitizePokemonName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019']/g, '')
    .replace(/\./g, '')
    .replace(/\s+/g, '-')
    .replace(/[♀]/g, 'f')
    .replace(/[♂]/g, 'm');
}

// ---- CRAWLER-FRIENDLY NAVIGATION ----
function generateCrawlerNav(links, label) {
  if (!links || links.length === 0) return '';
  
  // Create hidden nav for crawlers - display none but still in DOM for HTML parser
  return `
  <!-- Crawler-friendly navigation for SEO discovery (hidden from users, visible to search engines) -->
  <nav style="display: none; visibility: hidden;" aria-hidden="true" role="navigation">
    ${links.map(link => `<a href="${link.href}" title="${link.title}"></a>`).join('\n    ')}
  </nav>`;
}
// ---- END CRAWLER NAV ----

// ---- GET KEYWORDS FOR ROUTE ----
function getKeywordsForRoute(route) {
  // Check for static route keywords first
  if (PAGE_KEYWORDS[route]) {
    return PAGE_KEYWORDS[route];
  }
  
  // Check for dynamic route patterns and extract the name
  if (route?.includes('/pokemon/')) {
    const pokemonName = route.split('/pokemon/')[1];
    const keywords = DYNAMIC_KEYWORDS.pokemon.replace(/{pokemon}/g, pokemonName);
    return keywords;
  }
  if (route?.includes('/player/')) {
    const playerName = route.split('/player/')[1];
    const keywords = DYNAMIC_KEYWORDS.player.replace(/{player}/g, playerName);
    return keywords;
  }
  if (route?.includes('/trophy/')) {
    const trophyName = route.split('/trophy/')[1];
    const keywords = DYNAMIC_KEYWORDS.trophy.replace(/{trophy}/g, trophyName);
    return keywords;
  }
  if (route?.includes('/event/')) {
    const eventName = route.split('/event/')[1];
    const keywords = DYNAMIC_KEYWORDS.event.replace(/{event}/g, eventName);
    return keywords;
  }
  
  // Fallback to generic keywords if route not found
  return 'PokeMMO, Pokemon, gaming, shiny hunting, community';
}
// ---- END GET KEYWORDS ----

// ---------------- PRERENDER ----------------
async function prerenderRoute(templateHtml, outPath, meta = {}) {
  let html = templateHtml;

  const title = meta.ogTitle || 'Team Synergy - PokeMMO';
  const description = meta.ogDescription || 'Team Synergy is a PokeMMO shiny hunting team.';
  const image = meta.ogImage || 'https://synergymmo.com/images/pokemon_gifs/tier_7/reuniclus.gif';
  // Add trailing slash to match GitHub Pages serving pattern (avoids 301 redirects)
  // Normalize route to avoid double slashes: '/' should not become '//'
  const normalizedRoute = meta.route === '/' ? '' : meta.route;
  const url = `https://synergymmo.com${normalizedRoute}/`;
  
  // Validate description length
  const cleanDescription = description.replace(/<[^>]*>/g, '');
  if (cleanDescription.length > 160) {
    console.warn(`⚠️  Description too long for ${meta.route}: ${cleanDescription.length} chars`);
  }

  // Inject OG tags
  html = html.replace(/<title>.*<\/title>/, `<title>${title}</title>`);
  html = html.replace(/<meta property="og:title" content=".*">/, `<meta property="og:title" content="${title}">`);
  html = html.replace(/<meta property="og:description" content=".*">/, `<meta property="og:description" content="${description}">`);
  html = html.replace(/<meta property="og:image" content=".*">/, `<meta property="og:image" content="${image}">`);
  html = html.replace(/<meta property="og:url" content=".*">/, `<meta property="og:url" content="${url}">`);

  // Inject keywords meta tag
  const keywords = getKeywordsForRoute(meta.route);
  if (html.includes('<meta name="keywords"')) {
    html = html.replace(/<meta name="keywords" content=".*">/, `<meta name="keywords" content="${keywords}">`);
  } else {
    html = html.replace(/<\/head>/, `  <meta name="keywords" content="${keywords}">\n</head>`);
  }

  // Twitter mirror
  html = html.replace(/<meta name="twitter:title" content=".*">/, `<meta name="twitter:title" content="${title}">`);
  html = html.replace(/<meta name="twitter:description" content=".*">/, `<meta name="twitter:description" content="${description}">`);
  html = html.replace(/<meta name="twitter:image" content=".*">/, `<meta name="twitter:image" content="${image}">`);
  html = html.replace(/<meta name="twitter:card" content=".*">/, `<meta name="twitter:card" content="summary_large_image">`);

  // Canonical
  if (html.includes('<link rel="canonical"')) {
    html = html.replace(/<link rel="canonical" href=".*">/, `<link rel="canonical" href="${url}">`);
  } else {
    html = html.replace(/<\/head>/, `  <link rel="canonical" href="${url}">\n</head>`);
  }

  // Add robots meta tag for explicit indexing
  if (!html.includes('meta name="robots"')) {
    html = html.replace(/<\/head>/, `  <meta name="robots" content="index, follow, max-image-preview:large">\n</head>`);
  }

  // Add hreflang for language
  if (!html.includes('rel="alternate" hreflang')) {
    html = html.replace(/<\/head>/, `  <link rel="alternate" hreflang="en" href="${url}">\n</head>`);
  }

  // Add structured data based on route type
  let schemaScript = '';
  
  if (meta.route?.includes('/player/')) {
    const playerName = meta.route.split('/').pop();
    const personSchema = generatePersonSchema(decodeURIComponent(playerName));
    schemaScript = `<script type="application/ld+json">\n${JSON.stringify(personSchema, null, 2)}\n</script>`;
  } else if (meta.route?.includes('/pokemon/')) {
    const pokemonName = meta.route.split('/').pop();
    const pokemonSchema = generatePokemonSchema(pokemonName, pokemonName);
    schemaScript = `<script type="application/ld+json">\n${JSON.stringify(pokemonSchema, null, 2)}\n</script>`;
  }

  // Add breadcrumb schema for all pages
  const routePath = meta.route || '/';
  const routeName = meta.ogTitle?.split('|')[0]?.trim() || 'Page';
  const breadcrumbSchema = generateBreadcrumbSchema(routePath, routeName);
  const breadcrumbScript = `<script type="application/ld+json">\n${JSON.stringify(breadcrumbSchema, null, 2)}\n</script>`;

  // Inject all schema tags before closing body
  if (schemaScript) {
    html = html.replace(/<\/body>/, `  ${schemaScript}\n</body>`);
  }
  html = html.replace(/<\/body>/, `  ${breadcrumbScript}\n</body>`);

  // Inject crawler-friendly navigation if provided
  if (meta.crawlerLinks) {
    const navHtml = generateCrawlerNav(meta.crawlerLinks, meta.route || 'Navigation');
    html = html.replace(/<\/body>/, `${navHtml}\n</body>`);
  }

  await mkdir(join(outPath, '..'), { recursive: true });
  await writeFile(outPath, html, 'utf-8');
  console.log(`→ Prerendered ${outPath} (${cleanDescription.length} chars desc${meta.crawlerLinks ? `, ${meta.crawlerLinks.length} crawler links` : ''})`);
}

async function prerender() {
  console.log('Starting prerender...');

  const templateHtml = await readFile(join(DIST, 'index.html'), 'utf-8');

  // PRE-FETCH DYNAMIC DATA FOR CRAWLER LINKS
  console.log('📊 Fetching dynamic data for crawler navigation...');
  const players = await getPlayers();
  const events = await getEvents();
  const trophies = await getTrophies();
  const streamers = await getStreamers();
  const pokemonData = (() => {
    try {
      const pokemonPath = join(__dirname, '../src/data/pokemmo_data/pokemon-data.json');
      const raw = readFileSync(pokemonPath, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.warn('⚠️  Could not load pokemon data for crawler links:', err.message);
      return {};
    }
  })();

  // Pokemon links - deduplicate by base form (e.g., unown, unown-a, unown-b → only unown)
  const pokemonLinkMap = new Map();
  Object.entries(pokemonData).forEach(([key, pokemon]) => {
    const sanitized = sanitizePokemonName(pokemon.displayName || key);
    const baseForm = sanitized.split('-')[0]; // Get base form (before first dash)
    
    // Only add if we haven't seen this base form yet
    if (!pokemonLinkMap.has(baseForm)) {
      pokemonLinkMap.set(baseForm, {
        href: `/pokemon/${sanitized}/`,
        title: pokemon.displayName || key
      });
    }
  });
  const pokemonLinks = Array.from(pokemonLinkMap.values());
  console.log(`📊 Deduped Pokemon: ${Object.keys(pokemonData).length} forms → ${pokemonLinks.length} base forms`);

  const playerLinks = players.map(p => ({
    href: `${p.route}/`,
    title: p.route.split('/').pop()
  }));

  const streamerLinks = streamers.map(s => ({
    href: `${s.route}/`,
    title: s.title
  }));

  const eventLinks = events.map(e => ({
    href: `${e.route}/`,
    title: e.route.split('/').pop()
  }));

  const trophyLinks = trophies.map(t => ({
    href: `${t.route}/`,
    title: t.route.split('/').pop()
  }));

  // Static route OG overrides with CRAWLER LINKS
  const STATIC_META = {
    '/': {
      route: '/',
      ogTitle: 'Team Synergy - PokeMMO Shiny Hunting Team',
      ogDescription: 'Team Synergy is a PokeMMO shiny hunting team. Browse our shiny dex, view shiny collections, watch our streamers, and generate encounter counter themes.',
      ogImage: 'https://synergymmo.com/images/pokemon_gifs/tier_7/reuniclus.gif',
      crawlerLinks: playerLinks,
    },
    '/pokedex': {
      route: '/pokedex',
      ogTitle: 'Pokédex Tracker - Shiny & Living Dex | Team Synergy - PokeMMO',
      ogDescription: 'Track Team Synergy\'s complete Pokédex in PokeMMO. Filter by tier, type, location, and abilities. Search shinies, track caught progress, find encounters, and explore all generations with advanced filtering.',
      ogImage: 'https://synergymmo.com/images/pokemon_gifs/tier_7/pikachu.gif',
      crawlerLinks: pokemonLinks,
    },
    '/random-pokemon-generator': {
      route: '/random-pokemon-generator',
      ogTitle: 'Random Pokémon Generator & Shiny Bingo | Team Synergy - PokeMMO',
      ogDescription: 'Generate random Pokémon targets for PokeMMO hunts. Play shiny bingo with 3x3, 4x4, or 5x5 boards, filter by tier, randomize natures and IVs. Track your completion and find new hunt challenges.',
      ogImage: 'https://synergymmo.com/images/pokemon_gifs/tier_0/bulbasaur.gif',
      crawlerLinks: pokemonLinks,
    },
    '/counter-generator': {
      route: '/counter-generator',
      ogTitle: 'PokeMMO Counter Theme Generator | Team Synergy - PokeMMO',
      ogDescription: 'Create custom encounter counter themes for PokeMMO. Upload Pokémon GIFs, resize and customize them, then download ready-to-use counter theme packages to track your shiny hunts in-game.',
      ogImage: 'https://synergymmo.com/images/pokemon_gifs/tier_0/charmander.gif',
    },
    '/events': {
      route: '/events',
      ogTitle: 'Team Synergy Events | Team Synergy - PokeMMO',
      ogDescription: 'Discover Team Synergy\'s PokeMMO community events. Join shiny hunting competitions, seasonal tournaments, team challenges, and special gaming events. Stay connected with the latest Team Synergy activities.',
      ogImage: 'https://synergymmo.com/images/pokemon_gifs/tier_7/reuniclus.gif',
      crawlerLinks: eventLinks,
    },
    '/trophy-board': {
      route: '/trophy-board',
      ogTitle: 'Team Synergy Trophy Board | Team Synergy - PokeMMO',
      ogDescription: 'Explore trophies and achievements earned by Team Synergy members in PokeMMO. View championship awards, milestone accomplishments, and community recognition. Celebrate team success and member achievements.',
      ogImage: 'https://synergymmo.com/images/pokemon_gifs/tier_7/reuniclus.gif',
      crawlerLinks: trophyLinks,
    },
    '/streamers': {
      route: '/streamers',
      ogTitle: 'Team Synergy Streamers | Team Synergy - PokeMMO',
      ogDescription: 'Watch Team Synergy members stream PokeMMO live on Twitch. Check live status, find active streamers, join the community watching shiny hunts, encounters, and competitive gameplay.',
      ogImage: 'https://synergymmo.com/images/pokemon_gifs/tier_7/reuniclus.gif',
      crawlerLinks: streamerLinks,
    },
    '/shiny-war-2025': {
      route: '/shiny-war-2025',
      ogTitle: 'Shiny Wars 2025 Results | Team Synergy - PokeMMO',
      ogDescription: 'Team Synergy placed #25 in the Official PokeMMO Shiny Wars 2025 with 1060 points and 111 shinies. View every catch with tier breakdowns and point totals.',
      ogImage: 'https://synergymmo.com/images/pokemon_gifs/tier_1/leafeon.gif',
    },
    '/about': {
      route: '/about',
      ogTitle: 'About SynergyMMO | Team Synergy - PokeMMO',
      ogDescription: 'Learn about Team Synergy, a PokeMMO shiny hunting community. Learn how to apply, and recent updates.',
      ogImage: 'https://synergymmo.com/images/pokemon_gifs/tier_7/reuniclus.gif',
    },
  };

  // Static routes
  for (const route of STATIC_ROUTES) {
    const outPath = route === '/' ? join(DIST, 'index.html') : join(DIST, route.slice(1), 'index.html');
    await prerenderRoute(templateHtml, outPath, STATIC_META[route]);
  }

  // Player pages (already fetched above for crawler links)
  console.log(`Prerendering ${players.length} player pages...`);
  for (const p of players) {
    const outPath = join(DIST, p.route.slice(1), 'index.html');
    await prerenderRoute(templateHtml, outPath, p);
  }

  // Event pages (already fetched above for crawler links)
  console.log(`Prerendering ${events.length} event pages...`);
  for (const e of events) {
    const outPath = join(DIST, e.route.slice(1), 'index.html');
    await prerenderRoute(templateHtml, outPath, e);
  }

  // Trophy pages (already fetched above for crawler links)
  console.log(`Prerendering ${trophies.length} trophy pages...`);
  for (const t of trophies) {
    const outPath = join(DIST, t.route.slice(1), 'index.html');
    await prerenderRoute(templateHtml, outPath, t);
  }

  // Pokemon pages (already fetched above for crawler links)
  console.log(`Prerendering ${Object.keys(pokemonData).length} Pokemon pages...`);
  try {
    const pokemon = await getPokemon();
    for (const p of pokemon) {
      const outPath = join(DIST, p.route.slice(1), 'index.html');
      await prerenderRoute(templateHtml, outPath, p);
    }
  } catch (err) {
    console.warn('Failed to prerender Pokemon pages:', err.message);
  }

  console.log('✅ Prerender complete!');
}

prerender().catch(err => {
  console.error('Prerender failed:', err);
  process.exit(1);
});