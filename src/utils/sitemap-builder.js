// src/sitemap-builder.js
import fs from 'fs';

const baseUrl = 'https://synergymmo.com';
const databaseUrl = 'https://adminpage.hypersmmo.workers.dev/admin/database';

const staticRoutes = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/shotm', changefreq: 'daily', priority: '0.9' },
  { path: '/pokedex', changefreq: 'weekly', priority: '0.8' },
  { path: '/streamers', changefreq: 'daily', priority: '0.7' },
  { path: '/trophy-board', changefreq: 'monthly', priority: '0.6' },
  { path: '/counter-generator', changefreq: 'monthly', priority: '0.6' },
  { path: '/random-pokemon-generator', changefreq: 'monthly', priority: '0.7' },
];

async function buildSitemap() {
  const today = new Date().toISOString().split('T')[0];
  const allRoutes = [...staticRoutes];

  // Fetch player names from the API
  try {
    const res = await fetch(databaseUrl);
    const database = await res.json();
    const players = Object.keys(database).sort();
    console.log(`Found ${players.length} players`);

    for (const name of players) {
      allRoutes.push({
        path: `/player/${name}`,
        changefreq: 'weekly',
        priority: '0.4',
      });
    }
  } catch (err) {
    console.error('Failed to fetch players, generating sitemap with static routes only:', err.message);
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes
    .map(route => `  <url>
    <loc>${baseUrl}${route.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`)
    .join('\n')}
</urlset>`;

  fs.writeFileSync('./public/sitemap.xml', sitemapXml);
  console.log(`Sitemap generated with ${allRoutes.length} URLs!`);
}

buildSitemap();
