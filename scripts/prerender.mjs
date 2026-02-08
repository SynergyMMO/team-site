import puppeteer from 'puppeteer';
import { createServer } from 'http';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST = join(__dirname, '..', 'dist');

const ROUTES = [
  '/',
  '/shotm',
  '/pokedex',
  '/streamers',
  '/trophy-board',
  '/counter-generator',
  '/random-pokemon-generator',
];

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

// --- Static server ---
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
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
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

// --- Prerender ---
async function prerender() {
  console.log('Starting prerender...');

  const server = createStaticServer();
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`Static server on port ${port}`);

  // Use puppeteer.launch directly (ESM-compatible)
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const route of ROUTES) {
    const url = `http://localhost:${port}${route}`;
    console.log(`Prerendering ${route}...`);

    const page = await browser.newPage();

    // Block images/fonts/media to speed up rendering
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (['image', 'font', 'media'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait for title to be set by your framework
    await page.waitForFunction(
      () => document.title && document.title.length > 0,
      { timeout: 10000 }
    );

    await new Promise((r) => setTimeout(r, 500)); // extra delay for meta tags

    const html = await page.content();
    await page.close();

    const outDir = route === '/' ? DIST : join(DIST, route.slice(1));
    await mkdir(outDir, { recursive: true });

    const outPath = join(outDir, 'index.html');
    const finalHtml = html.startsWith('<!DOCTYPE') ? html : `<!DOCTYPE html>${html}`;
    await writeFile(outPath, finalHtml);

    console.log(`  → ${outPath.replace(DIST, 'dist')}`);
  }

  await browser.close();
  server.close();
  console.log('Prerender complete!');
}

prerender().catch((err) => {
  console.error('Prerender failed:', err);
  process.exit(1);
});
