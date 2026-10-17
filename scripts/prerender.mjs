// Post-build prerender: turns dist/index.html into one static HTML file per route
// so GitHub Pages serves real, crawlable pages (each at /route/index.html).
//
// Where to change things (no code edits needed for most additions):
//   scripts/seo/static_pages.json    - add a static page (title, description, image, sitemap entry)
//   scripts/seo/page_keywords.json   - meta keywords (static pages + templates for dynamic pages)
//   scripts/seo/page_faqs.json      - FAQ schema (static pages + templates for dynamic pages)
//   scripts/seo/seo_hidden_content.json - optional hidden <h1>/copy per static page
//   scripts/seo/dynamic_pages.json  - title/description templates for players, pokemon, events, ...
//   scripts/seo/site.json           - domain, API endpoints, default nav links
// See scripts/seo/README.md for details.
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, dirname, resolve, sep } from 'path';
import { DIST } from './prerender/config.mjs';
import { renderPage, PRERENDER_MARKER } from './prerender/render.mjs';
import {
  getPlayers, getEvents, getTrophies, getPokemon, getThemes, getResources,
  buildLinkGroups, getStaticPages,
} from './prerender/sources.mjs';

// /player/Foo%20Bar -> dist/player/Foo Bar/index.html (GitHub Pages decodes the URL before lookup)
function outputPath(route) {
  if (route === '/') return join(DIST, 'index.html');

  const segments = route.split('/').filter(Boolean).map(decodeURIComponent);
  const file = resolve(DIST, ...segments, 'index.html');
  if (!file.startsWith(DIST + sep)) throw new Error(`Refusing to write outside dist: ${route}`);
  return file;
}

async function writePages(templateHtml, label, pages) {
  console.log(`Prerendering ${pages.length} ${label}...`);
  for (const page of pages) {
    const file = outputPath(page.route);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, renderPage(templateHtml, page), 'utf-8');
  }
}

// Every URL we advertise in a sitemap must exist as a prerendered page, otherwise
// GitHub Pages answers 404 and Search Console reports it as not found.
function verifySitemapCoverage() {
  const missing = [];
  for (const file of readdirSync(DIST).filter(f => /^sitemap-(?!index).*\.xml$/.test(f))) {
    const xml = readFileSync(join(DIST, file), 'utf-8');
    for (const [, loc] of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const path = new URL(loc).pathname;
      if (!existsSync(outputPath(path))) missing.push(`${path} (${file})`);
    }
  }
  if (missing.length) {
    console.warn(`\nSitemap lists ${missing.length} URL(s) with no prerendered page:`);
    missing.forEach(entry => console.warn(`  - ${entry}`));
  } else {
    console.log('Sitemap check passed: every sitemap URL has a prerendered page.');
  }
}

async function prerender() {
  console.log('Starting prerender...');
  const templateHtml = await readFile(join(DIST, 'index.html'), 'utf-8');
  if (templateHtml.includes(PRERENDER_MARKER)) {
    throw new Error('dist/index.html is already prerendered. Run "vite build" first so pages are not rendered twice.');
  }

  const [players, events, themes] = await Promise.all([getPlayers(), getEvents(), getThemes()]);
  const trophies = getTrophies();
  const pokemon = getPokemon();
  const resources = getResources();

  const linkGroups = buildLinkGroups({ players, events, trophies, pokemon });
  const counts = { players: players.length, pokemon: pokemon.length, trophies: trophies.length };
  const staticPages = getStaticPages(linkGroups, counts);

  await writePages(templateHtml, 'static pages', staticPages);
  await writePages(templateHtml, 'player pages', players);
  await writePages(templateHtml, 'event pages', events);
  await writePages(templateHtml, 'trophy pages', trophies);
  await writePages(templateHtml, 'resource pages', resources);
  await writePages(templateHtml, 'pokemon pages', pokemon);
  await writePages(templateHtml, 'theme pages', themes);

  verifySitemapCoverage();
  console.log('Prerender complete!');
}

prerender().catch(err => {
  console.error('Prerender failed:', err);
  process.exit(1);
});
