// src/sitemap-builder.js
import fs from 'fs';

const baseUrl = 'https://synergymmo.com';

// List of all your static routes
const staticRoutes = [
  '/',
  '/shotm',
  '/pokedex',
  '/streamers',
  '/trophy-board',
  '/counter-generator',
  '/random-pokemon-generator'
];

// Generate the sitemap XML
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticRoutes
  .map(route => `  <url><loc>${baseUrl}${route}</loc></url>`)
  .join('\n')}
</urlset>`;

// Save to public folder
fs.writeFileSync('./public/sitemap.xml', sitemapXml);

console.log('Sitemap generated!');
