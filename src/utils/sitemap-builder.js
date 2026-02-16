// src/sitemap-builder.js
import fs from 'fs';

const baseUrl = 'https://synergymmo.com';
const databaseUrl = 'https://adminpage.hypersmmo.workers.dev/admin/database';
const pokemonDataPath = new URL('../data/pokemmo_data/pokemon-data.json', import.meta.url);
const pokemonData = JSON.parse(fs.readFileSync(pokemonDataPath, 'utf-8'));
const trophiesPath = new URL('../data/trophies.json', import.meta.url);
const trophiesData = JSON.parse(fs.readFileSync(trophiesPath, 'utf-8'));

const staticRoutes = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/shotm/', changefreq: 'daily', priority: '0.9' },
  { path: '/pokedex/', changefreq: 'weekly', priority: '0.8' },
  { path: '/streamers/', changefreq: 'daily', priority: '0.7' },
  { path: '/trophy-board/', changefreq: 'monthly', priority: '0.6' },
  { path: '/counter-generator/', changefreq: 'monthly', priority: '0.6' },
  { path: '/random-pokemon-generator/', changefreq: 'monthly', priority: '0.7' },
  { path: '/events/', changefreq: 'weekly', priority: '0.6' },
  { path: '/shiny-war-2025/', changefreq: 'weekly', priority: '0.7' },
  { path: '/about/', changefreq: 'monthly', priority: '0.5' },
];

// Ensure we always publish canonical URLs with a trailing slash
function ensureTrailingSlash(path) {
  if (!path) return '/';
  return path.endsWith('/') ? path : `${path}/`;
}

// Function to generate sitemap file
function generateSitemapFile(filename, routes) {
  const today = new Date().toISOString().split('T')[0];
  
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${routes
    .map(route => {
      const normalizedPath = ensureTrailingSlash(route.path);

      let url = `  <url>
    <loc>${baseUrl}${normalizedPath}</loc>
    <lastmod>${route.lastmod || today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>`;
      
      // Add image tag if route has associated image
      if (route.image) {
        url += `
    <image:image>
      <image:loc>${route.image}</image:loc>
      <image:title>${route.imageTitle || 'Image'}</image:title>
    </image:image>`;
      }
      
      url += `
  </url>`;
      return url;
    })
    .join('\n')}
</urlset>`;

  fs.writeFileSync(`./public/${filename}`, sitemapXml);
  console.log(`✓ Generated ${filename} with ${routes.length} URLs`);
  return routes.length;
}

// Function to generate sitemap index
function generateSitemapIndex(sitemapFiles) {
  const today = new Date().toISOString().split('T')[0];
  
  const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapFiles
    .map(file => `  <sitemap>
    <loc>${baseUrl}/${file}</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`)
    .join('\n')}
</sitemapindex>`;

  fs.writeFileSync('./public/sitemap-index.xml', indexXml);
  console.log(`✓ Generated sitemap-index.xml with ${sitemapFiles.length} sitemaps`);
}

async function buildSitemap() {
  const today = new Date().toISOString().split('T')[0];
  
  // STEP 1: Static routes
  console.log('\n📋 Building static pages sitemap...');
  generateSitemapFile('sitemap-static.xml', staticRoutes);

  // STEP 2: Player pages
  console.log('\n👤 Building player pages sitemap...');
  let playerRoutes = [];
  try {
    const res = await fetch(databaseUrl);
    const database = await res.json();
    const players = Object.keys(database).sort();
    console.log(`   Found ${players.length} players`);

    playerRoutes = players.map(name => ({
      path: `/player/${name}`,
      changefreq: 'weekly',
      priority: '0.4',
      lastmod: today,
    }));

    generateSitemapFile('sitemap-players.xml', playerRoutes);
  } catch (err) {
    console.error('   ⚠️  Failed to fetch players:', err.message);
  }

  // STEP 3: Pokemon pages with images
  console.log('\n🐉 Building pokemon pages sitemap with images...');
  const pokemonNames = Object.keys(pokemonData).sort();
  const pokemonRoutes = pokemonNames.map(name => {
    const sanitized = name.toLowerCase().replace(/\s/g, '-');
    return {
      path: `/pokemon/${sanitized}`,
      changefreq: 'monthly',
      priority: '0.5',
      lastmod: today,
      // Add image data for Google Images
      image: `https://img.pokemondb.net/sprites/black-white/anim/shiny/${sanitized}.gif`,
      imageTitle: `${name} shiny form`,
    };
  });

  generateSitemapFile('sitemap-pokemon.xml', pokemonRoutes);

  // STEP 4: Event pages
  console.log('\n📅 Building event pages sitemap...');
  let eventRoutes = [];
  try {
    const res = await fetch('https://adminpage.hypersmmo.workers.dev/admin/events');
    const events = await res.json();
    console.log(`   Found ${events.length} events`);

    // Helper function to slugify
    function slugify(title) {
      return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    eventRoutes = events.map(e => ({
      path: `/event/${slugify(e.title)}`,
      changefreq: 'weekly',
      priority: '0.5',
      lastmod: today,
    }));

    generateSitemapFile('sitemap-events.xml', eventRoutes);
  } catch (err) {
    console.error('   ⚠️  Failed to fetch events:', err.message);
  }

  // STEP 5: Trophy pages
  console.log('\n🏆 Building trophy pages sitemap...');
  let trophyRoutes = [];
  try {
    const { trophies } = trophiesData;
    const trophyNames = Object.keys(trophies);
    console.log(`   Found ${trophyNames.length} trophies`);

    // Helper function to slugify
    function slugify(title) {
      return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    trophyRoutes = trophyNames.map(name => ({
      path: `/trophy/${slugify(name)}`,
      changefreq: 'monthly',
      priority: '0.4',
      lastmod: today,
    }));

    generateSitemapFile('sitemap-trophies.xml', trophyRoutes);
  } catch (err) {
    console.error('   ⚠️  Failed to load trophies:', err.message);
  }

  // STEP 6: Create sitemap index
  console.log('\n📑 Creating sitemap index...');
  const sitemapFiles = [
    'sitemap-static.xml',
    'sitemap-players.xml',
    'sitemap-pokemon.xml',
    'sitemap-events.xml',
    'sitemap-trophies.xml'
  ];
  generateSitemapIndex(sitemapFiles);

  // Summary
  const totalUrls = staticRoutes.length + playerRoutes.length + pokemonNames.length + eventRoutes.length + trophyRoutes.length;
  console.log(
    `\n✅ Sitemap generation complete!\n` +
    `   Total URLs: ${totalUrls}\n` +
    `   Static: ${staticRoutes.length}\n` +
    `   Players: ${playerRoutes.length}\n` +
    `   Pokemon: ${pokemonNames.length}\n` +
    `   Events: ${eventRoutes.length}\n` +
    `   Trophies: ${trophyRoutes.length}`
  );
}

buildSitemap().catch(err => {
  console.error('❌ Sitemap generation failed:', err);
  process.exit(1);
});
