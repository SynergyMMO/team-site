import { readFile, writeFile, mkdir } from 'fs/promises';
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
// ---------------- PRERENDER ----------------
async function prerenderRoute(templateHtml, outPath, meta = {}) {
  let html = templateHtml;

  const title = meta.ogTitle || 'Team Synergy - PokeMMO';
  const description = meta.ogDescription || 'Team Synergy is a PokeMMO shiny hunting team.';
  const image = meta.ogImage || 'https://synergymmo.com/favicon.png';
  const url = meta.route ? `https://synergymmo.com${meta.route}` : 'https://synergymmo.com/';

  // Inject OG tags
  html = html.replace(/<title>.*<\/title>/, `<title>${title}</title>`);
  html = html.replace(/<meta property="og:title" content=".*">/, `<meta property="og:title" content="${title}">`);
  html = html.replace(/<meta property="og:description" content=".*">/, `<meta property="og:description" content="${description}">`);
  html = html.replace(/<meta property="og:image" content=".*">/, `<meta property="og:image" content="${image}">`);
  html = html.replace(/<meta property="og:url" content=".*">/, `<meta property="og:url" content="${url}">`);

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

  await mkdir(join(outPath, '..'), { recursive: true });
  await writeFile(outPath, html, 'utf-8');
  console.log(`→ Prerendered ${outPath}`);
}

async function prerender() {
  console.log('Starting prerender...');

  const templateHtml = await readFile(join(DIST, 'index.html'), 'utf-8');

  // Static route OG overrides
  const STATIC_META = {
    '/pokedex': {
      route: '/pokedex',
      ogTitle: 'Pokédex Tracker - Shiny & Living Dex | Team Synergy - PokeMMO',
      ogDescription: 'Track Team Synergy\'s complete Pokédex in PokeMMO. Filter by tier, type, location, and abilities. Search shinies, track caught progress, find encounters, and explore all generations with advanced filtering.',
      ogImage: 'https://synergymmo.com/images/pokemon_gifs/tier_7/pikachu.gif',
    },
    '/random-pokemon-generator': {
      route: '/random-pokemon-generator',
      ogTitle: 'Random Pokémon Generator & Shiny Bingo | Team Synergy - PokeMMO',
      ogDescription: 'Generate random Pokémon targets for PokeMMO hunts. Play shiny bingo with 3x3, 4x4, or 5x5 boards, filter by tier, randomize natures and IVs. Track your completion and find new hunt challenges.',
      ogImage: 'https://synergymmo.com/images/pokemon_gifs/tier_0/bulbasaur.gif',
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
      ogImage: 'https://synergymmo.com/favicon.png',
    },
    '/trophy-board': {
      route: '/trophy-board',
      ogTitle: 'Team Synergy Trophy Board | Team Synergy - PokeMMO',
      ogDescription: 'Explore trophies and achievements earned by Team Synergy members in PokeMMO. View championship awards, milestone accomplishments, and community recognition. Celebrate team success and member achievements.',
      ogImage: 'https://synergymmo.com/favicon.png',
    },
    '/streamers': {
      route: '/streamers',
      ogTitle: 'Team Synergy Streamers | Team Synergy - PokeMMO',
      ogDescription: 'Watch Team Synergy members stream PokeMMO live on Twitch. Check live status, find active streamers, join the community watching shiny hunts, encounters, and competitive gameplay.',
      ogImage: 'https://synergymmo.com/favicon.png',
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

  // Player pages
  const players = await getPlayers();
  for (const p of players) {
    const outPath = join(DIST, p.route.slice(1), 'index.html');
    await prerenderRoute(templateHtml, outPath, p);
  }

  // Event pages
  const events = await getEvents();
  for (const e of events) {
    const outPath = join(DIST, e.route.slice(1), 'index.html');
    await prerenderRoute(templateHtml, outPath, e);
  }

  // Trophy pages
  const trophies = await getTrophies();
  for (const t of trophies) {
    const outPath = join(DIST, t.route.slice(1), 'index.html');
    await prerenderRoute(templateHtml, outPath, t);
  }

  // Pokemon pages
  console.log('Fetching Pokemon data for prerender...');
  try {
    const pokemon = await getPokemon();
    console.log(`Prerendering ${pokemon.length} Pokemon pages...`);
    for (const p of pokemon) {
      const outPath = join(DIST, p.route.slice(1), 'index.html');
      await prerenderRoute(templateHtml, outPath, p);
    }
  } catch (err) {
    console.warn('Failed to prerender Pokemon pages:', err.message);
  }

  console.log('Prerender complete!');
}

prerender().catch(err => {
  console.error('Prerender failed:', err);
  process.exit(1);
});