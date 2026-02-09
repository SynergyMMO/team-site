import puppeteer from 'puppeteer';
import { createServer } from 'http';
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

/* ---------------- STATIC SERVER ---------------- */

function createStaticServer() {
  return createServer(async (req, res) => {
    let pathname = new URL(req.url, 'http://localhost').pathname;
    let filePath = join(DIST, pathname);

    if (!extname(pathname)) {
      filePath = join(DIST, 'index.html');
    }

    try {
      const data = await readFile(filePath);
      const ext = extname(filePath);
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      });
      res.end(data);
    } catch {
      try {
        const data = await readFile(join(DIST, 'index.html'));
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    }
  });
}

/* ---------------- FETCH DYNAMIC ROUTES ---------------- */

async function getEventRoutes() {
  try {
    const res = await fetch('https://adminpage.hypersmmo.workers.dev/admin/events');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.map((e) => `/event/${e.id}`);
  } catch (err) {
    console.warn('⚠ Failed to fetch events:', err.message);
    return [];
  }
}

async function getTrophyRoutes() {
  try {
    const trophiesPath = join(DIST, 'data', 'trophies.json');
    const raw = await readFile(trophiesPath, 'utf-8');
    const data = JSON.parse(raw);
    return Object.keys(data.trophies || {}).map(
      (name) => `/trophy/${encodeURIComponent(name.toLowerCase())}`
    );
  } catch (err) {
    console.warn('⚠ Failed to load trophies.json:', err.message);
    return [];
  }
}

async function getPlayerRoutes() {
  try {
    const res = await fetch('https://adminpage.hypersmmo.workers.dev/admin/database');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Object.keys(data).map(
      (name) => `/player/${encodeURIComponent(name.toLowerCase())}`
    );
  } catch (err) {
    console.warn('⚠ Failed to fetch player database:', err.message);
    return [];
  }
}

/* ---------------- RENDER A SINGLE ROUTE ---------------- */

async function renderRoute(browser, port, route) {
  const url = `http://localhost:${port}${route}`;
  const outDir = route === '/' ? DIST : join(DIST, route.slice(1));
  const outPath = join(outDir, 'index.html');

  // Skip if file already exists
  try {
    await readFile(outPath);
    console.log(`✓ Skipped ${route}`);
    return;
  } catch {}

  const page = await browser.newPage();

  // Block heavy assets & analytics
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const type = req.resourceType();
    const url = req.url();
    if (
      ['image', 'font', 'media'].includes(type) ||
      url.includes('analytics') ||
      url.includes('gtag') ||
      url.includes('doubleclick')
    ) {
      req.abort();
    } else {
      req.continue();
    }
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    await page.waitForFunction(() => document.title && document.title.length > 0, { timeout: 8000 });
    const html = await page.content();
    await mkdir(outDir, { recursive: true });
    const finalHtml = html.startsWith('<!DOCTYPE') ? html : `<!DOCTYPE html>${html}`;
    await writeFile(outPath, finalHtml);
    console.log(`→ ${route}`);
  } catch (err) {
    console.warn(`⚠ Failed ${route}:`, err.message);
  }

  await page.close();
}

/* ---------------- PARALLEL RENDERING ---------------- */

async function prerender() {
  console.log('Starting prerender...');

  const server = createStaticServer();
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`Static server running on port ${port}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // Fetch all dynamic routes
  const EVENT_ROUTES = await getEventRoutes();
  const TROPHY_ROUTES = await getTrophyRoutes();
  const PLAYER_ROUTES = await getPlayerRoutes();
  const ALL_ROUTES = [...STATIC_ROUTES, ...EVENT_ROUTES, ...TROPHY_ROUTES, ...PLAYER_ROUTES];

  console.log(`Total routes to prerender: ${ALL_ROUTES.length}`);

  const CONCURRENCY = 6; // adjust for your CPU/memory
  const queue = [...ALL_ROUTES];

  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const route = queue.shift();
      if (route) await renderRoute(browser, port, route);
    }
  });

  await Promise.all(workers);

  await browser.close();
  server.close();
  console.log('Prerender complete!');
}

/* ---------------- RUN ---------------- */

prerender().catch((err) => {
  console.error('Prerender failed:', err);
  process.exit(1);
});
