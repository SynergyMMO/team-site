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

  // Static routes
  for (const route of STATIC_ROUTES) {
    const outPath = route === '/' ? join(DIST, 'index.html') : join(DIST, route.slice(1), 'index.html');
    await prerenderRoute(templateHtml, outPath);
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

  console.log('Prerender complete!');
}

prerender().catch(err => {
  console.error('Prerender failed:', err);
  process.exit(1);
});