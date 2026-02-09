import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';


const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST = join(__dirname, '..', 'dist');

/* ---------------- STATIC ROUTES ---------------- */

const STATIC_ROUTES = [
  '/',
  '/shotm',
  '/pokedex',
  '/streamers',
  '/trophy-board',
  '/events',
  '/counter-generator',
  '/random-pokemon-generator',
];

/* ---------------- MIME TYPES ---------------- */

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/* ---------------- FETCH DYNAMIC DATA ---------------- */

async function getPlayers() {
  const res = await fetch('https://adminpage.hypersmmo.workers.dev/admin/database');
  const data = await res.json();
  return Object.entries(data).map(([name, player]) => {
    // Pick first favorite shiny for OG image
    const shinies = Object.values(player.shinies || {});
    const fav = shinies.find((s) => s.Favourite?.toLowerCase() === 'yes') || shinies[0];
    const ogImage = fav ? `/images/pokemon_gifs/tier_0/${fav.Pokemon.toLowerCase()}.gif` : '/favicon.png';

    return {
      route: `/player/${encodeURIComponent(name.toLowerCase())}`,
      ogTitle: `${name}'s Shinies | Team Synergy - PokeMMO`,
      ogDescription: `Browse ${name}'s shiny Pokemon collection in PokeMMO.`,
      ogImage: `https://synergymmo.com${ogImage}`,
    };
  });
}

async function getEvents() {
  const res = await fetch('https://adminpage.hypersmmo.workers.dev/admin/events');
  const data = await res.json();
  return data.map((e) => {
    const ogImage = e.imageLink || '/favicon.png';
    return {
      route: `/event/${e.id}`,
      ogTitle: `${e.title} | Team Synergy - PokeMMO`,
      ogDescription: e.description || `Join the ${e.title} event in PokeMMO.`,
      ogImage: ogImage.startsWith('http') ? ogImage : `https://synergymmo.com${ogImage}`,
    };
  });
}

/* ---------------- PRERENDER HTML ---------------- */
async function prerenderRoute(templateHtml, outPath, meta = {}) {
  let html = templateHtml;

  const title = meta.ogTitle || 'Team Synergy - PokeMMO';
  const description = meta.ogDescription || 'Team Synergy is a PokeMMO shiny hunting team.';
  const image = meta.ogImage || 'https://synergymmo.com/favicon.png';
  const url = meta.route ? `https://synergymmo.com${meta.route}` : 'https://synergymmo.com/';

    // Inject OG tags
    html = html.replace(/<title>.*<\/title>/, `<title>${title}</title>`);
    html = html.replace(
      /<meta property="og:title" content=".*">/,
      `<meta property="og:title" content="${title}">`
    );
    html = html.replace(
      /<meta property="og:description" content=".*">/,
      `<meta property="og:description" content="${description}">`
    );
    html = html.replace(
      /<meta property="og:image" content=".*">/,
      `<meta property="og:image" content="${image}">`
    );
    html = html.replace(
      /<meta property="og:url" content=".*">/,
      `<meta property="og:url" content="${url}">`
    ); 


  // Inject Twitter tags (mirror OG)
  html = html.replace(
    /<meta name="twitter:title" content=".*">/,
    `<meta name="twitter:title" content="${title}">`
  );
  html = html.replace(
    /<meta name="twitter:description" content=".*">/,
    `<meta name="twitter:description" content="${description}">`
  );
  html = html.replace(
    /<meta name="twitter:image" content=".*">/,
    `<meta name="twitter:image" content="${image}">`
  );
  html = html.replace(
    /<meta name="twitter:card" content=".*">/,
    `<meta name="twitter:card" content="summary_large_image">`
  );

  // --- Canonical link ---
  if (html.includes('<link rel="canonical"')) {
    html = html.replace(
      /<link rel="canonical" href=".*">/,
      `<link rel="canonical" href="${url}">`
    );
  } else {
    html = html.replace(
      /<\/head>/,
      `  <link rel="canonical" href="${url}">\n</head>`
    );
  }

  await mkdir(join(outPath, '..'), { recursive: true });
  await writeFile(outPath, html, 'utf-8');
  console.log(`→ Prerendered ${outPath}`);
}



/* ---------------- MAIN ---------------- */

async function prerender() {
  console.log('Starting prerender...');

  // Read template HTML once
  const templateHtml = await readFile(join(DIST, 'index.html'), 'utf-8');

  // Static routes
  for (const route of STATIC_ROUTES) {
    const outPath = route === '/' ? join(DIST, 'index.html') : join(DIST, route.slice(1), 'index.html');
    await prerenderRoute(templateHtml, outPath);
  }

  // Dynamic player pages
  const players = await getPlayers();
  for (const p of players) {
    const outPath = join(DIST, p.route.slice(1), 'index.html');
    await prerenderRoute(templateHtml, outPath, p);
  }

  // Dynamic event pages
  const events = await getEvents();
  for (const e of events) {
    const outPath = join(DIST, e.route.slice(1), 'index.html');
    await prerenderRoute(templateHtml, outPath, e);
  }

  console.log('Prerender complete!');
}

prerender().catch((err) => {
  console.error('Prerender failed:', err);
  process.exit(1);
});
