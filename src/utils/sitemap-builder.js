// src/sitemap-builder.js
import fs from 'fs';

const baseUrl = 'https://synergymmo.com';

// List of all your static routes with SEO metadata
const staticRoutes = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/shotm', changefreq: 'daily', priority: '0.9' },
  { path: '/pokedex', changefreq: 'weekly', priority: '0.8' },
  { path: '/streamers', changefreq: 'daily', priority: '0.7' },
  { path: '/trophy-board', changefreq: 'monthly', priority: '0.6' },
  { path: '/counter-generator', changefreq: 'monthly', priority: '0.6' },
  { path: '/random-pokemon-generator', changefreq: 'monthly', priority: '0.7' },
];

const today = new Date().toISOString().split('T')[0];

// Generate the sitemap XML
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticRoutes
  .map(route => `  <url>
    <loc>${baseUrl}${route.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`)
  .join('\n')}
</urlset>`;

// Save to public folder
fs.writeFileSync('./public/sitemap.xml', sitemapXml);

console.log('Sitemap generated!');
