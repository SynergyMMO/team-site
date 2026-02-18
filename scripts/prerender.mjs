import { readFile, writeFile, mkdir } from 'fs/promises';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const tierPokemonPath = join(__dirname, '../src/data/tier_pokemon.json');
const tierPokemonRaw = await readFile(tierPokemonPath, 'utf-8');
const tierPokemon = JSON.parse(tierPokemonRaw);
const trophiesPath = join(__dirname, '../src/data/trophies.json');
const trophiesRaw = await readFile(trophiesPath, 'utf-8');
const trophiesData = JSON.parse(trophiesRaw);
const resourcesPath = join(__dirname, '../src/data/resources.json');
const resourcesRaw = await readFile(resourcesPath, 'utf-8');
const resourcesData = JSON.parse(resourcesRaw);

const DIST = join(__dirname, '..', 'dist');


const PAGE_KEYWORDS = {
  '/': 'Team Synergy, PokeMMO shiny hunting community, shiny hunters, player shiny collections, PokeMMO Pokédex, roaming legendaries, PokeMMO tools, Trophy Board',
  '/shiny-showcase': 'PokeMMO shiny showcase, Team Synergy shiny collections, player shiny rankings, Pokemon collectors, shiny count leaderboard, Team Synergy members',
  '/pokedex': 'PokeMMO Pokédex, Pokédex tracker, Generation 1-5 Pokemon, PokeMMO shiny tracker, Pokemon database, PokeMMO Shiny Locations, PokeMMO Where to Shiny Hunt, PokeMMO Catch Calculator',
  '/roaming-legendaries': 'PokeMMO roaming legendaries, roaming legendary calendar, Zapdos, Articuno, Moltres, Entei, Suicune, Raikou, PokeMMO legendary spawns, roaming Pokémon locations, legendary monthly schedule, PokeMMO shiny hunting legendaries',
  '/random-pokemon-generator': 'Pokemon randomizer, shiny hunt randomizer, random Pokemon generator, shiny bingo cards, encounter picker, hunt challenge',
  '/counter-generator': 'PokeMMO counter theme, counter theme generator, encounter counter, PokeMMO tools, theme customizer, counter maker',
  '/events': 'PokeMMO events, shiny hunting competition, PokeMMO PVP events, gaming tournament, team events, community challenges',
  '/trophy-board': 'PokeMMO trophies, achievement trophies, trophy list, PokeMMO leaderboard, gaming achievements, community awards',
  '/streamers': 'PokeMMO streamers, PokeMMO Twitch streamers, PokeMMO YouTube, gaming livestream, content creators, streamer directory',
  '/shiny-war-2025': 'Shiny Wars 2025, PokeMMO competition, Shiny Wars standings, leaderboard results, shiny catching championship, competition rankings, team synergy shiny war results',
  '/resources': 'PokeMMO resources, PokeMMO guides, hunting tools, community links, shiny hunting guides, PokeMMO calculators, Team Synergy resources',
};

const DYNAMIC_KEYWORDS = {
  pokemon: '{pokemon} shiny, {pokemon} PokeMMO, Pokemon stats, Pokemon abilities, {pokemon} pokemmo catch location, {pokemon} pokemmo catch calculator, {pokemon} encounter, tier rank',
  player: '{player} shiny collection, {player} PokeMMO player, player profile, encounter statistics, trophy showcase, shiny hunter',
  trophy: '{trophy} trophy, {trophy} achievement, PokeMMO trophy, trophy winners, gaming award, community milestone',
  event: '{event} PokeMMO event, {event} tournament, event details, tournament rules, competition schedule, event prizes',
};
// ================================================================

// ================== PAGE-SPECIFIC FAQ SCHEMA =====================
// Add FAQs for each page to help Google understand content better
// Format: Array of { question, answer } objects - max 30 per page
const PAGE_FAQS = {
  '/': [
    { question: 'What is Team Synergy?', answer: 'Team Synergy is a PokeMMO shiny hunting community dedicated to shiny collection, competitive gameplay, and community events.' },
    { question: 'What can I find on Team Synergy?', answer: 'Explore our Shiny Showcase to see 140+ player collections, browse our detailed Pokédex, watch live Twitch streamers, check our Trophy Board, and join community events.' },
    { question: 'Where can I watch Team Synergy streamers?', answer: 'Check our Streamers page for live PokeMMO streams from team members on Twitch and YouTube.' },
    { question: 'What is shiny hunting?', answer: 'Shiny hunting is the practice of catching shiny Pokémon - rare variants with different colors. Team Synergy specializes in shiny collection and offers tools to help.' },
    { question: 'How can I track my Pokemon progress?', answer: 'Use our interactive Pokédex to filter by type, tier, and location. Track which Pokemon you need and find shiny hunting locations.' },
  ],
  '/shiny-showcase': [
    { question: 'What is the Shiny Showcase?', answer: 'The Shiny Showcase displays the shiny collections of all Team Synergy members, ranked by total shiny count.' },
    { question: 'How are players ranked?', answer: 'Players are ranked by their total number of shinies caught, with detailed statistics available for each member.' },
    { question: 'Can I filter players?', answer: 'Yes, use the search bar to find specific players or filter by various statistics.' },
    { question: 'What shinies are included?', answer: 'The showcase includes all shiny Pokémon collected by Team Synergy members across all regions.' },
    { question: 'How is this data updated?', answer: 'The shiny collections are regularly updated to reflect new catches and achievements by team members.' },
  ],
  '/shotm': [
    { question: 'What is SHOTM?', answer: 'SHOTM stands for Shiny of the Month - a monthly feature highlighting exceptional shiny catches by Team Synergy Members' },
    { question: 'How is SHOTM chosen?', answer: 'The SHOTM is based on the amount of points each players get, based on the tiers of their shinies, the better the shiny, the more points!' },
    { question: 'What are the benefits of winning SHOTM?', answer: 'SHOTM winners receive a free art commission, community appreciation, and bragging rights within Team Synergy.' },
  ],
  '/pokedex': [
    { question: 'What is the Team Synergy Pokédex?', answer: 'An interactive database tracking Gen 1-5 Pokémon with detailed stats, shiny forms, catch locations, and PokeMMO-specific information.' },
    { question: 'Can I filter by Pokémon type?', answer: 'Yes, the Pokédex supports filtering by type, tier, generation, and location for easy searching.' },
    { question: 'Where can I find shiny hunting locations?', answer: 'Each Pokémon entry includes encounter locations, rare spawn rates, and shiny hunting tips for PokeMMO.' },
    { question: 'What are Pokémon tiers?', answer: 'Tiers in PokeMMO classify Pokémon by rarity and difficulty to obtain. Higher tiers are rarer and more valuable.' },
    { question: 'How is the catch calculator used?', answer: 'The catch calculator estimates encounter rates and time to catch based on PokeMMO mechanics.' },
  ],
  '/roaming-legendaries': [
    { question: 'How do you obtain the roaming legends?', answer: 'Roaming legendaries in PokeMMO appear in different locations each month based on a rotating schedule. Once you encounter a roaming legendary in the wild, you can catch it just like any other wild Pokémon.' },
    { question: 'How do you unlock the roaming legends?', answer: 'Roaming legendaries are unlocked as soon as you Beat the 8th gym in Kanto, or defeat Ho-oh in Johto, as soon as you do this you can find them in the grass' },
    { question: 'Can the roaming legends be shiny?', answer: 'Yes! Roaming legendaries can be shiny in PokeMMO, although extremely rare. The Exact shiny rate is not officially disclosed.' },
  ],
  '/streamers': [
    { question: 'Where can I watch Team Synergy streamers?', answer: 'Team Synergy members stream on Twitch and YouTube. Visit our Streamers page for live links.' },
    { question: 'What content do Team Synergy streamers cover?', answer: 'Streamers primarily focus on PokeMMO shiny hunting, PVP battles, competitive events, and community gameplay.' },
    { question: 'How often do streamers go live?', answer: 'Stream schedules vary by member. Check our Streamers page for current live status and upcoming streams.' },
    { question: 'Can I interact with streamers?', answer: 'Yes! Most streamers have Twitch chat enabled where you can interact with them during streams.' },
  ],
  '/trophy-board': [
    { question: 'What are Team Synergy trophies?', answer: 'Trophies are achievements earned by team members for accomplishments in PokeMMO such as catching rare shinies or winning competitions.' },
    { question: 'How do I earn a trophy?', answer: 'Trophies are awarded for reaching milestones, winning events, completing challenges, and exceptional achievements.' },
    { question: 'How many trophies are available?', answer: 'Team Synergy has 12 unique trophies, each with specific achievement criteria.' },
    { question: 'Can I see which members have earned each trophy?', answer: 'Yes, click any trophy on the Trophy Board to see a list of all members who have earned it.' },
  ],
  '/events': [
    { question: 'What types of events does Team Synergy host?', answer: 'Team Synergy hosts shiny hunting competitions, PVP tournaments, seasonal challenges, team raids, and community events.' },
    { question: 'How do I participate in events?', answer: 'Visit the Events page to see upcoming events, their rules, dates, and how to register or participate.' },
    { question: 'What are the prizes for winning events?', answer: 'Event prizes vary and may include trophies, in-game rewards, and more.' },
    { question: 'How often are new events scheduled?', answer: 'Team Synergy regularly schedules events. Check the Events page for upcoming competitions and challenges.' },
    { question: 'Can non-members participate in events?', answer: 'Most events are exclusive to Team Synergy members, but some community events may be open to all.' },
  ],
  '/counter-generator': [
    { question: 'What is a counter theme in PokeMMO?', answer: 'A counter theme is a customized overlay showing Pokémon encounter counters to track shiny hunt progress in-game.' },
    { question: 'How do I use the Counter Generator?', answer: 'Upload or create Pokémon GIFs, customize sizing, arrange them as desired, then download the theme package.' },
    { question: 'Can I import existing counter themes?', answer: 'The Counter Generator allows you to create custom themes from scratch or modify templates.' },
    { question: 'What file format does the Counter Generator export?', answer: 'Themes are exported as downloadable packages compatible with PokeMMO counter mod systems.' },
    { question: 'Can I share custom themes with others?', answer: 'Yes, exported themes can be easily shared with other PokeMMO players.' },
  ],
  '/random-pokemon-generator': [
    { question: 'What is the Random Pokémon Generator?', answer: 'A tool that randomly selects Pokémon to shiny hunt, designed to help players discover new hunt targets and break monotony.' },
    { question: 'What is shiny bingo?', answer: 'Shiny bingo is a 3x3, 4x4, or 5x5 grid game where you mark off Pokémon as you catch them, aiming for bingo patterns.' },
    { question: 'Can I filter random Pokémon by tier?', answer: 'Yes, you can restrict random selection to specific tiers (easy, medium, hard, etc.).' },
    { question: 'How do I start a new bingo board?', answer: 'Click "Generate Bingo Board" and select your preferred grid size and difficulty level.' },
    { question: 'What happens when I complete a pattern?', answer: 'Completing a bingo pattern marks your achievement and you can generate a new board or challenge.' },
  ],
  '/resources': [
    { question: 'What resources does Team Synergy provide?', answer: 'Team Synergy offers comprehensive resources including shiny hunting guides, tool recommendations, calculators, community links, and official PokeMMO resources.' },
    { question: 'Where can I find PokeMMO guides?', answer: 'Visit our Resources page to access guides on shiny hunting basics, nature and IV mechanics, PVP battles, and detailed hunting strategies for specific Pokémon.' },
    { question: 'What tools are available on Team Synergy?', answer: 'Explore our Counter Generator for custom encounter overlays, Random Pokemon Generator for hunt challenges, and interactive Pokédex with location data.' },
    { question: 'How can I join the Team Synergy community?', answer: 'Join our Discord community at https://discord.gg/2BEUq6fWAj to connect with team members, share strategies, and participate in events.' },
    { question: 'Where can I learn about shiny hunting?', answer: 'Check our Resources page for beginner guides, advanced strategy articles, and links to official PokeMMO documentation and community wikis.' },
  ],
};

// FAQs for dynamic pages (use {placeholder} for dynamic values)
const DYNAMIC_FAQS = {
  pokemon: [
    { question: 'Is {pokemon} a shiny in PokeMMO?', answer: 'Yes, {pokemon} has a shiny variant available in PokeMMO with a different color palette.' },
    { question: 'What is the best location to hunt {pokemon}?', answer: 'See the location details on the {pokemon} page for recommended spawn locations and encounter rates.' },
    { question: 'What abilities does {pokemon} have?', answer: 'Check the abilities section on the {pokemon} page to see all available ability options.' },
    { question: 'What tier is {pokemon} in?', answer: 'The tier rank for {pokemon} is listed on the Pokédex page and reflects its rarity and hunt difficulty.' },
    { question: 'What is the best way to catch {pokemon}?', answer: 'Visit the Pokemon Specific Page to see the PokeMMO Catch Calculator for the most efficient way to catch them' },
    { question: 'Best way to shiny hunt {pokemon} PokeMMO', answer: 'Visit the Pokemon Specific Page to see the PokeMMO Locations for shiny hunting.' },
  ],
  event: [
    { question: 'When does the {event} event start?', answer: 'Event dates and times are shown on the event details page. Check start and end dates carefully.' },
    { question: 'How do I register for {event}?', answer: 'Registration instructions for {event} are displayed on the event details page.' },
    { question: 'What are the rules for {event}?', answer: 'Complete rules and competition guidelines for {event} are available on the event page.' },
    { question: 'What are the prizes for {event}?', answer: 'Prize information for {event} including rewards and trophies is detailed on the event page.' },
  ],
};
// ================================================================

// ================== CREATOR/AUTHOR ATTRIBUTION ==================
// Define creators and contributors for structured data markup
const CREATORS = {
  primary: {
    name: 'Team Synergy',
    title: 'Community-Driven PokeMMO Project',
    url: 'https://synergymmo.com',
    sameAs: [
      'https://www.youtube.com/@ohypers',
      'https://discord.com/invite/2BEUq6fWAj'
    ]
  },
  features: [
    { name: 'Pokédex & Data', role: 'Content Development' },
    { name: 'Shiny Showcase', role: 'Community Content' },
    { name: 'Event Management', role: 'Community Events' }
  ]
};
// ================================================================

// ---------------- STATIC ROUTES ----------------
const STATIC_ROUTES = [
  '/',
  '/shiny-showcase',
  '/shotm',
  '/pokedex',
  '/roaming-legendaries',
  '/streamers',
  '/trophy-board',
  '/events',
  '/counter-generator',
  '/random-pokemon-generator',
  '/shiny-war-2025',
  '/safari-zones',
  '/resources',
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
    const ogImage = fav ? getLocalPokemonGif(fav.Pokemon) : '/images/openGraph.jpg';

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
    .replace(/-+/g, '-') // collapse multiple dashes
    .replace(/^-+|-+$/g, ''); // remove leading/trailing dashes
}

// Extract all resource routes with metadata and breadcrumb navigation
function getResourceRoutes() {
  const resources = [];
  
  // Build a map of all resource categories for crawler links
  const allCategories = Object.keys(resourcesData).filter(k => !k.startsWith('_'));

  Object.entries(resourcesData).forEach(([categoryName, categoryData]) => {
    if (categoryName.startsWith('_')) return;

    // Category level
    if (categoryData._meta) {
      // Get subcategories for this category
      const subcategoriesInCategory = Object.keys(categoryData)
        .filter(k => !k.startsWith('_') && categoryData[k]._meta)
        .map(subcatName => ({
          href: `/resources/${slugify(categoryName)}/${slugify(subcatName)}/`,
          title: subcatName
        }));
      
      // Create crawler links: other categories + subcategories
      const crawlerLinks = [
        // Link to main resources hub
        { href: '/resources/', title: 'Resources' },
        // Links to other categories
        ...allCategories
          .filter(cat => cat !== categoryName)
          .map(cat => ({
            href: `/resources/${slugify(cat)}/`,
            title: cat
          })),
        // Links to subcategories within this category
        ...subcategoriesInCategory
      ];

      resources.push({
        route: `/resources/${slugify(categoryName)}/`,
        ogTitle: categoryData._meta.title,
        ogDescription: categoryData._meta.description,
        ogImage: 'https://synergymmo.com/images/openGraph.jpg',
        crawlerLinks: crawlerLinks,
        categoryName: categoryName
      });
    }

    // Subcategory and nested levels
    Object.entries(categoryData).forEach(([subcategoryName, subcategoryData]) => {
      if (subcategoryName.startsWith('_')) return;

      if (subcategoryData._meta) {
        // Get nested items for this subcategory
        const nestedInSubcategory = Object.keys(subcategoryData)
          .filter(k => !k.startsWith('_') && subcategoryData[k] && typeof subcategoryData[k] === 'object' && subcategoryData[k]._meta)
          .map(nestedName => ({
            href: `/resources/${slugify(categoryName)}/${slugify(subcategoryName)}/${slugify(nestedName)}/`,
            title: nestedName
          }));

        // Create breadcrumb-aware crawler links
        const crawlerLinks = [
          { href: '/resources/', title: 'Resources' },
          { href: `/resources/${slugify(categoryName)}/`, title: categoryName },
          // Links to sibling subcategories
          ...Object.keys(categoryData)
            .filter(k => !k.startsWith('_') && categoryData[k]._meta && k !== subcategoryName)
            .map(siblingName => ({
              href: `/resources/${slugify(categoryName)}/${slugify(siblingName)}/`,
              title: siblingName
            })),
          // Links to nested items in this subcategory
          ...nestedInSubcategory
        ];

        resources.push({
          route: `/resources/${slugify(categoryName)}/${slugify(subcategoryName)}/`,
          ogTitle: subcategoryData._meta.title,
          ogDescription: subcategoryData._meta.description,
          ogImage: 'https://synergymmo.com/images/openGraph.jpg',
          crawlerLinks: crawlerLinks,
          categoryName: categoryName,
          subcategoryName: subcategoryName
        });
      }

      // Nested level (third level)
      Object.entries(subcategoryData).forEach(([nestedName, nestedData]) => {
        if (nestedName.startsWith('_')) return;

        if (nestedData && typeof nestedData === 'object' && nestedData._meta) {
          // Create hierarchical crawler links for nested items
          const crawlerLinks = [
            { href: '/resources/', title: 'Resources' },
            { href: `/resources/${slugify(categoryName)}/`, title: categoryName },
            { href: `/resources/${slugify(categoryName)}/${slugify(subcategoryName)}/`, title: subcategoryName },
            // Links to sibling nested items
            ...Object.keys(subcategoryData)
              .filter(k => !k.startsWith('_') && subcategoryData[k] && typeof subcategoryData[k] === 'object' && subcategoryData[k]._meta && k !== nestedName)
              .map(sibling => ({
                href: `/resources/${slugify(categoryName)}/${slugify(subcategoryName)}/${slugify(sibling)}/`,
                title: sibling
              }))
          ];

          resources.push({
            route: `/resources/${slugify(categoryName)}/${slugify(subcategoryName)}/${slugify(nestedName)}/`,
            ogTitle: nestedData._meta.title,
            ogDescription: nestedData._meta.description,
            ogImage: 'https://synergymmo.com/images/openGraph.jpg',
            crawlerLinks: crawlerLinks,
            categoryName: categoryName,
            subcategoryName: subcategoryName,
            nestedName: nestedName
          });
        }
      });
    });
  });

  return resources;
}

async function getStreamers() {
  const streamersPath = join(__dirname, '../src/data/streamers.json');
  const raw = await readFile(streamersPath, 'utf-8');
  const streamerNames = JSON.parse(raw);
  
  return streamerNames.map(name => ({
    route: `/streamers#${name}`,
    title: name
  }));
}

async function getEvents() {
  const res = await fetch('https://adminpage.hypersmmo.workers.dev/admin/events');
  const data = await res.json();

  return data.map(e => {
    const ogImage = e.imageLink || '/images/openGraph.jpg';
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
    const img = trophies[name] || '/images/openGraph.jpg';
    const DOMAIN = 'https://synergymmo.com';

    return {
      route: `/trophy/${slug}`,
      ogTitle: `${name} Trophy | Team Synergy - PokeMMO`,
      ogDescription: `See which Team Synergy members earned the ${name} trophy in PokeMMO.`,
      ogImage: `${DOMAIN}${img}`,
    };
  });
}

// ---- SEO SCHEMA FUNCTIONS ----
function generatePersonSchema(playerName) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": playerName,
    "url": `https://synergymmo.com/player/${playerName.toLowerCase()}/`,
    "memberOf": {
      "@type": "Organization",
      "name": "Team Synergy",
      "url": "https://synergymmo.com"
    }
  };
}

function generatePokemonSchema(name, sanitized) {
  return {
    "@context": "https://schema.org",
    "@type": "Thing",
    "name": name,
    "url": `https://synergymmo.com/pokemon/${sanitized}/`,
    "image": `https://img.pokemondb.net/sprites/black-white/anim/shiny/${sanitized}.gif`,
    "description": `${name} shiny form in PokeMMO`
  };
}

function generateBreadcrumbSchema(routePath, routeName) {
  const segments = routePath.split('/').filter(Boolean);
  let itemListElements = [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://synergymmo.com/"
    }
  ];
  
  let currentPath = '';
  segments.slice(0, -1).forEach((segment, idx) => {
    currentPath += '/' + segment;
    itemListElements.push({
      "@type": "ListItem",
      "position": idx + 2,
      "name": segment.charAt(0).toUpperCase() + segment.slice(1),
      "item": `https://synergymmo.com${currentPath}/`
    });
  });
  
  // Only add final breadcrumb if not on home page
  if (routePath !== '/') {
    itemListElements.push({
      "@type": "ListItem",
      "position": itemListElements.length + 1,
      "name": routeName,
      "item": `https://synergymmo.com${routePath}/`
    });
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": itemListElements
  };
}

// ---- RESOURCE BREADCRUMB SCHEMA WITH HIERARCHY ----
// Enhanced breadcrumb schema specifically for resource pages with proper SEO hierarchy
function generateResourceBreadcrumbSchema(routePath, resourceMeta = {}) {
  const segments = routePath.split('/').filter(Boolean);
  const itemListElements = [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://synergymmo.com/"
    }
  ];
  
  // Add Resources main category
  itemListElements.push({
    "@type": "ListItem",
    "position": 2,
    "name": "Resources",
    "item": "https://synergymmo.com/resources/"
  });
  
  // Build hierarchical breadcrumbs for nested resource pages
  let currentPath = '/resources';
  let position = 3;
  
  // Start from index 1 (skip 'resources' in segments)
  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += '/' + segment;
    
    // Humanize the segment for display
    const displayName = segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    itemListElements.push({
      "@type": "ListItem",
      "position": position,
      "name": displayName,
      "item": `https://synergymmo.com${currentPath}/`,
      // Add rich data if available from metadata
      ...(resourceMeta.description ? { "description": resourceMeta.description } : {})
    });
    
    position++;
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": itemListElements
  };
}

// ---- RESOURCE COLLECTION SCHEMA ----
// Schema for resource category and subcategory pages to help search engines understand resource hierarchy
function generateResourceCollectionSchema(routePath, categoryTitle, categoryDescription) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "url": `https://synergymmo.com${routePath}/`,
    "name": categoryTitle,
    "description": categoryDescription,
    "isPartOf": {
      "@type": "WebSite",
      "name": "Team Synergy",
      "url": "https://synergymmo.com"
    },
    "mainEntity": {
      "@type": "Collection",
      "name": categoryTitle,
      "description": categoryDescription,
      "inLanguage": "en",
      "creator": {
        "@type": "Organization",
        "name": "Team Synergy",
        "url": "https://synergymmo.com"
      }
    }
  };
}

// ---- ORGANIZATION SCHEMA ----
function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Team Synergy",
    "url": "https://synergymmo.com",
    "logo": "https://synergymmo.com/favicon.png",
    "description": "A PokeMMO shiny hunting community dedicated to shiny collection, PVP competition, and gaming events.",
    "sameAs": [
      "https://www.youtube.com/@ohypers",
      "https://discord.com/invite/2BEUq6fWAj"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "",
      "contactType": "Community Support"
    }
  };
}

// ---- EVENT SCHEMA ----
function generateEventSchema(eventTitle, eventDescription) {
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": eventTitle,
    "description": eventDescription,
    "startDate": startDate.toISOString().split('T')[0],
    "endDate": endDate.toISOString().split('T')[0],
    "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
    "organizer": {
      "@type": "Organization",
      "name": "Team Synergy",
      "url": "https://synergymmo.com"
    }
  };
}

// ---- TROPHY SCHEMA ----
// Enhanced schema with aggregation for better entity recognition
function generateTrophySchema(trophyName) {
  return {
    "@context": "https://schema.org",
    "@type": "Award",
    "name": trophyName,
    "description": `${trophyName} achievement earned by Team Synergy members in PokeMMO`,
    "url": `https://synergymmo.com/trophy/${trophyName.toLowerCase().replace(/\s+/g, '-')}/`,
    "awardedBy": {
      "@type": "Organization",
      "name": "Team Synergy",
      "url": "https://synergymmo.com"
    },
    "isPartOf": {
      "@type": "AggregateOffer",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock",
      "offerCount": 1
    }
  };
}

// ---- FAQ SCHEMA ----
function generateFaqSchema(faqs) {
  if (!faqs || faqs.length === 0) return null;
  
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}
// ---- CREATOR/AUTHOR SCHEMA ----
// Adds author and creator attribution to all pages for proper content ownership
function generateCreatorSchema(route = '/') {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Team Synergy",
    "url": "https://synergymmo.com",
    "creator": {
      "@type": "Organization",
      "name": CREATORS.primary.name,
      "url": CREATORS.primary.url,
      "sameAs": CREATORS.primary.sameAs
    },
    "description": "A PokeMMO shiny hunting community dedicated to shiny collection, PVP competition, and gaming events.",
    "publisher": {
      "@type": "Organization",
      "name": "Team Synergy",
      "url": "https://synergymmo.com",
      "logo": "https://synergymmo.com/favicon.png"
    }
  };
}

// ---- WEBPAGE SCHEMA ----
// Comprehensive WebPage schema for better entity recognition and knowledge graph integration
function generateWebPageSchema(route, title, description, image) {
  const url = route === '/' ? 'https://synergymmo.com/' : `https://synergymmo.com${route}/`;
  
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "url": url,
    "name": title,
    "description": description,
    "image": image,
    "datePublished": "2024-01-01",
    "dateModified": new Date().toISOString().split('T')[0],
    "isPartOf": {
      "@type": "WebSite",
      "name": "Team Synergy",
      "url": "https://synergymmo.com"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Team Synergy",
      "logo": {
        "@type": "ImageObject",
        "url": "https://synergymmo.com/favicon.png"
      }
    },
    "author": {
      "@type": "Organization",
      "name": "Team Synergy",
      "url": "https://synergymmo.com"
    }
  };
}

// ---- COLLECTION PAGE SCHEMA ----
// For Pokédex, Trophy Board, and other collection pages
function generateCollectionPageSchema(route, title, description, image, itemCount) {
  const url = route === '/' ? 'https://synergymmo.com/' : `https://synergymmo.com${route}/`;
  
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "url": url,
    "name": title,
    "description": description,
    "image": image,
    "numberOfItems": itemCount,
    "isPartOf": {
      "@type": "WebSite",
      "name": "Team Synergy",
      "url": "https://synergymmo.com"
    },
    "author": {
      "@type": "Organization",
      "name": "Team Synergy",
      "url": "https://synergymmo.com"
    }
  };
}

// ---- GAME SCHEMA ----
// For Pokemon and gaming-related content
function generateGameSchema(pokemonName) {
  return {
    "@context": "https://schema.org",
    "@type": "Game",
    "name": pokemonName,
    "gamePlatform": "Web",
    "applicationCategory": "GamingApplication",
    "isPartOf": {
      "@type": "Game",
      "name": "PokeMMO"
    }
  };
}

// ---- SOCIAL MEDIA POSTING SCHEMA ----
// To improve social sharing signals and discoverability
function generateSocialMediaSchema(title, description, image, url) {
  return {
    "@context": "https://schema.org",
    "@type": "SocialMediaPosting",
    "headline": title,
    "description": description,
    "image": image,
    "url": url,
    // Use ISO8601 with timezone for datePublished
    "datePublished": new Date().toISOString(),
    // Add required Author field for SEO
    "author": {
      "@type": "Person",
      "name": "Team Synergy Staff"
    },
    "sharedContent": {
      "@type": "CreativeWork",
      "name": title,
      "description": description,
      "image": image
    },
    "publisher": {
      "@type": "Organization",
      "name": "Team Synergy",
      "url": "https://synergymmo.com"
    }
  };
}

// ---- WEBSITE SEARCH ACTION SCHEMA ----
// Enables search appearance in Google Search results
function generateWebsiteSearchSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Team Synergy",
    "url": "https://synergymmo.com",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://synergymmo.com/?search={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  };
}

// ---- GET FAQs FOR ROUTE ----
function getFaqsForRoute(route) {
  // Check for static route FAQs first
  if (PAGE_FAQS[route]) {
    return PAGE_FAQS[route];
  }
  
  // Check for dynamic route patterns and extract the name
  if (route?.includes('/pokemon/')) {
    const pokemonName = route.split('/pokemon/')[1];
    // Replace {pokemon} placeholder in dynamic FAQs
    return DYNAMIC_FAQS.pokemon.map(faq => ({
      question: faq.question.replace(/{pokemon}/g, pokemonName),
      answer: faq.answer.replace(/{pokemon}/g, pokemonName)
    }));
  }
  if (route?.includes('/event/')) {
    const eventName = route.split('/event/')[1];
    // Replace {event} placeholder in dynamic FAQs
    return DYNAMIC_FAQS.event.map(faq => ({
      question: faq.question.replace(/{event}/g, eventName),
      answer: faq.answer.replace(/{event}/g, eventName)
    }));
  }
  
  return null;
}
// ---- END FAQ FUNCTIONS ----

// ---- UTILITY: SANITIZE FUNCTION ----
function sanitizePokemonName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019']/g, '')
    .replace(/\./g, '')
    .replace(/\s+/g, '-')
    .replace(/[♀]/g, 'f')
    .replace(/[♂]/g, 'm');
}

// ---- CRAWLER-FRIENDLY NAVIGATION WITH INTERNAL LINKING ----
// This creates hidden navigation links for search engines to discover related content
function generateCrawlerNav(links, label, routePath = '') {
  if (!links || links.length === 0) return '';
  
  // Add strategic internal links based on route type
  let additionalLinks = [];
  
  // Link to main pages from everywhere
  const mainPageLinks = [
    { href: '/', title: 'Home' },
    { href: '/pokedex/', title: 'Pokédex' },
    { href: '/trophy-board/', title: 'Trophy Board' },
    { href: '/events/', title: 'Events' },
    { href: '/streamers/', title: 'Streamers' },
  ];
  
  // Link to home and related categories from detail pages
  if (routePath?.includes('/pokemon/')) {
    additionalLinks = [
      { href: '/pokedex/', title: 'PokeMMO Pokédex' },
      { href: '/random-pokemon-generator/', title: 'Pokemon Randomizer' },
      { href: '/counter-generator/', title: 'Counter Theme' },
    ];
  } else if (routePath?.includes('/player/')) {
    additionalLinks = [
      { href: '/trophy-board/', title: 'Trophy Board' },
      { href: '/', title: 'Shiny Showcase' },
      { href: '/streamers/', title: 'Streamers' },
    ];
  } else if (routePath?.includes('/trophy/')) {
    additionalLinks = [
      { href: '/trophy-board/', title: 'All Trophies' },
      { href: '/', title: 'Team Members' },
    ];
  } else if (routePath?.includes('/event/')) {
    additionalLinks = [
      { href: '/events/', title: 'All Events' },
      { href: '/streamers/', title: 'Team Streamers' },
    ];
  }
  
  // Combine primary links with additional contextual links
  const allLinks = [...mainPageLinks, ...additionalLinks, ...links];
  
  // Deduplicate by href
  const uniqueLinks = [];
  const seen = new Set();
  for (const link of allLinks) {
    if (!seen.has(link.href)) {
      seen.add(link.href);
      uniqueLinks.push(link);
    }
  }
  
  // Create hidden nav for crawlers - display none but still in DOM for HTML parser
  return `
  <!-- Crawler-friendly navigation for SEO discovery (hidden from users, visible to search engines) -->
  <nav class="crawler-nav" aria-hidden="true" role="navigation">
    ${uniqueLinks.map(link => `<a href="${link.href}" title="${link.title}"></a>`).join('\n    ')}
  </nav>`;
}
// ---- END CRAWLER NAV WITH INTERNAL LINKING ----

// ---- GET KEYWORDS FOR ROUTE ----
function getKeywordsForRoute(route) {
  // Check for static route keywords first
  if (PAGE_KEYWORDS[route]) {
    return PAGE_KEYWORDS[route];
  }
  
  // Check for dynamic route patterns and extract the name
  if (route?.includes('/pokemon/')) {
    const pokemonName = route.split('/pokemon/')[1];
    const keywords = DYNAMIC_KEYWORDS.pokemon.replace(/{pokemon}/g, pokemonName);
    return keywords;
  }
  if (route?.includes('/player/')) {
    const playerName = route.split('/player/')[1];
    const keywords = DYNAMIC_KEYWORDS.player.replace(/{player}/g, playerName);
    return keywords;
  }
  if (route?.includes('/trophy/')) {
    const trophyName = route.split('/trophy/')[1];
    const keywords = DYNAMIC_KEYWORDS.trophy.replace(/{trophy}/g, trophyName);
    return keywords;
  }
  if (route?.includes('/event/')) {
    const eventName = route.split('/event/')[1];
    const keywords = DYNAMIC_KEYWORDS.event.replace(/{event}/g, eventName);
    return keywords;
  }
  
  // Fallback to generic keywords if route not found
  return 'PokeMMO, Pokemon, gaming, shiny hunting, community';
}
// ---- END GET KEYWORDS ----

// ---------------- PRERENDER ----------------
async function prerenderRoute(templateHtml, outPath, meta = {}) {
  let html = templateHtml;

  const title = meta.ogTitle || 'Team Synergy - PokeMMO';
  const description = meta.ogDescription || 'Team Synergy is a PokeMMO shiny hunting team.';
  const image = meta.ogImage || 'https://synergymmo.com/images/pokemon_gifs/tier_7/reuniclus.gif';
  // Add trailing slash to match GitHub Pages serving pattern (avoids 301 redirects)
  const normalizedRoute =
    meta.route === '/'
      ? '/'
      : (meta.route || '').replace(/\/+$/, '') + '/';

  const url = `https://synergymmo.com${normalizedRoute}`;

  // ---- PERFORMANCE: ADD RESOURCE HINTS ----
  // Preconnect to external image CDN for faster resource loading
  if (!html.includes('rel="preconnect" href="https://img.pokemondb.net')) {
    html = html.replace(/<\/head>/, `  <link rel="preconnect" href="https://img.pokemondb.net" crossorigin="anonymous">\n  <link rel="dns-prefetch" href="https://img.pokemondb.net">\n  <link rel="preconnect" href="https://discord.com" crossorigin="anonymous">\n</head>`);
  }
  
  // ---- MOBILE OPTIMIZATION: ADD MOBILE-SPECIFIC META TAGS ----
  // Ensure Apple touch icon is set for iOS
  if (!html.includes('rel="apple-touch-icon')) {
    html = html.replace(/<\/head>/, `  <link rel="apple-touch-icon" href="https://synergymmo.com/favicon.png">\n</head>`);
  }
  
  // Add mobile web app meta tags for iOS
  if (!html.includes('meta name="apple-mobile-web-app-capable')) {
    html = html.replace(/<\/head>/, `  <meta name="apple-mobile-web-app-capable" content="yes">\n  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n  <meta name="apple-mobile-web-app-title" content="Team Synergy">\n</head>`);
  }
  
  // Ensure proper viewport for responsive design (check if not already present)
  if (!html.includes('name="viewport')) {
    html = html.replace(/<\/head>/, `  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">\n</head>`);
  }
  
  // Add theme color for mobile browser chrome
  if (!html.includes('name="theme-color')) {
    html = html.replace(/<\/head>/, `  <meta name="theme-color" content="#1a1a1a">\n</head>`);
  }
  
  // ---- PERFORMANCE/ATTRIBUTION: ADD AUTHOR META TAG ----
  // Proper attribution for content ownership
  if (!html.includes('meta name="author')) {
    html = html.replace(/<\/head>/, `  <meta name="author" content="Team Synergy - PokeMMO Community">\n</head>`);
  }
  
  // Validate description length
  const cleanDescription = description.replace(/<[^>]*>/g, '');
  if (cleanDescription.length > 160) {
    console.warn(`⚠️  Description too long for ${meta.route}: ${cleanDescription.length} chars`);
  }

  // Inject OG tags
  html = html.replace(/<title>.*<\/title>/, `<title>${title}</title>`);
  html = html.replace(/<meta property="og:title" content=".*">/, `<meta property="og:title" content="${title}">`);
  html = html.replace(/<meta property="og:description" content=".*">/, `<meta property="og:description" content="${description}">`);
  html = html.replace(/<meta property="og:image" content=".*">/, `<meta property="og:image" content="${image}">`);
  html = html.replace(/<meta property="og:url" content=".*">/, `<meta property="og:url" content="${url}">`);

  // Inject keywords meta tag
  const keywords = getKeywordsForRoute(meta.route);
  if (html.includes('<meta name="keywords"')) {
    html = html.replace(/<meta name="keywords" content=".*">/, `<meta name="keywords" content="${keywords}">`);
  } else {
    html = html.replace(/<\/head>/, `  <meta name="keywords" content="${keywords}">\n</head>`);
  }

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

  // Add robots meta tag for explicit indexing
  if (!html.includes('meta name="robots"')) {
    html = html.replace(/<\/head>/, `  <meta name="robots" content="index, follow, max-image-preview:large">\n</head>`);
  }

  // Add hreflang for language
  if (!html.includes('rel="alternate" hreflang')) {
    html = html.replace(/<\/head>/, `  <link rel="alternate" hreflang="en" href="${url}">\n</head>`);
  }

  // ---- ADD HIDDEN SEO CONTENT FOR CRAWLERS ----
  // Generate page-specific hidden content with keywords for search engines
  function getHiddenSeoContent(route, meta = {}) {
    const pageDescriptions = {
      '/': `<h1 class="seo-semantic-hidden">Team Synergy: Ultimate PokeMMO Shiny Hunting Community</h1><section class="seo-semantic-hidden"><p>Team Synergy is the premier PokeMMO shiny hunting community hub with 140+ player collections, interactive Pokédex, roaming legendaries tracking, live streamers, trophy achievements, and competitive events.</p></section>`,
      '/shiny-showcase': `<h1 class="seo-semantic-hidden">Shiny Showcase - Team Synergy Collections</h1><section class="seo-semantic-hidden"><p>Browse 140+ Team Synergy member shiny collections ranked by count. Discover top hunters, view statistics, and explore the best Pokemon catches in our comprehensive collection database.</p></section>`,
      '/shotm': `<h1 class="seo-semantic-hidden">Shiny of the Month - Team Synergy</h1><section class="seo-semantic-hidden"><p>SHOTM stands for Shiny of the Month - a monthly feature highlighting exceptional shiny catches by Team Synergy members in PokeMMO. The SHOTM recognition program celebrates outstanding shiny hunting achievements and rare Pokemon catches. Each month, Team Synergy members compete for recognition based on the tier value and rarity of their shiny catches. The SHOTM selection system awards points based on Pokemon rarity, nature quality, and hunting difficulty. Winners receive community recognition, featured showcases, and special team acknowledgment. The Shiny of the Month tradition strengthens community engagement and motivates hunters to pursue rare targets. Team Synergy members view SHOTM as a prestigious award recognizing exceptional dedication to shiny hunting. The monthly recognition encourages sharing of hunt stories, strategies, and achievement updates. SHOTM winners become community role models inspiring other hunters to pursue ambitious shiny targets. The program tracks historical winners and maintains achievement records celebrating past accomplishments. Participate in monthly competitions to earn SHOTM recognition and community prestige within Team Synergy.</p></section>`,
      '/pokedex': `<h1 class="seo-semantic-hidden">PokeMMO Pokédex - Shiny Pokemon Database</h1><section class="seo-semantic-hidden"><p>The Team Synergy Pokédex is a comprehensive PokeMMO database featuring all Generation 1-5 Pokemon with detailed shiny variants and hunting information. Our Pokemon guide includes catch locations, rarity tiers, abilities, base stats, and type matchups for every Pokemon in PokeMMO. Use our advanced Pokédex tracker to filter shiny Pokemon by type, tier, generation, and location. Our shiny hunting guides provide exact spawn rates and encounter locations for each Pokemon. The Pokédex displays both normal and shiny forms of every Pokemon, helping hunters identify their targets. Team Synergy's Pokemon database includes rare find indicators and difficulty ratings for shiny hunting. Our guides explain Pokemon evolution, breeding mechanics, and nature-based advantages in PokeMMO. Discover the best shiny Pokemon to hunt based on difficulty and rarity. Use our Pokédex to plan your shiny hunting strategy and track which rare Pokemon you still need. The database includes expert tips for catching hard-to-find Pokemon and maximizing shiny encounter rates. Filter by tier to find beginner-friendly shiny hunts or challenge yourself with legendary tier Pokemon.</p></section>`,
      '/roaming-legendaries': `<h1 class="seo-semantic-hidden">Roaming Legendaries Calendar - PokeMMO Legendary Pokemon</h1><section class="seo-semantic-hidden"><p>The Team Synergy Roaming Legendaries Calendar tracks monthly spawns of rare legendary Pokemon in PokeMMO including Zapdos, Moltres, Articuno, Entei, Suicune, and Raikou. Our guide provides shiny hunting strategies specifically designed for roaming legendary Pokemon. Learn when and where each legendary spawns to plan your shiny hunting expeditions. The calendar shows availability for all roaming legendaries across monthly rotations, helping you schedule hunts efficiently. Our shiny hunting guides explain the unique challenges of catching roaming legends and advanced strategies for success. Team Synergy tracks legendary Pokemon locations and provides tips for efficient encounters. The roaming legendaries calendar is essential for shiny hunters seeking rare legendary shiny Pokemon. Our guides cover catch rates, recommended Pokemon teams, and optimal battle strategies for each legendary. Discover the best months to hunt specific legendary shiny Pokemon based on spawn schedules. Use our Pokédex data combined with the legendary calendar to plan year-round shiny hunting adventures. The roaming legendaries guide includes detailed location maps and encounter frequency data for all legendary Pokemon.</p></section>`,
      '/random-pokemon-generator': `<h1 class="seo-semantic-hidden">Random Pokemon Generator - Shiny Hunt Challenge</h1><section class="seo-semantic-hidden"><p>The Team Synergy Random Pokemon Generator is a shiny hunting tool that generates random Pokemon targets to break monotony and discover new shiny hunts. Our generator helps shiny hunters find exciting new challenges by randomly selecting Pokemon from specific tiers. Use our tool to create shiny bingo boards in 3x3, 4x4, or 5x5 grids for fun group shiny hunting challenges. The random Pokemon generator supports difficulty filtering to match your shiny hunting skill level. Our guide explains how to use randomization to discover lesser-known shiny Pokemon worth hunting. Team Synergy's generator includes nature randomization and IV weighting options for advanced shiny hunters. Create encounter challenges and compete with friends using our random Pokemon bingo system. The generator helps break the routine of planned hunts by introducing exciting randomness to shiny hunting. Use tier filters to challenge yourself or select beginner-friendly shiny hunts. Our tool includes completion tracking for bingo boards and statistics on your shiny hunting progress. The random Pokemon feature helps hunters expand their shiny collections by encouraging exploration of less popular Pokemon.</p></section>`,
      '/counter-generator': `<h1 class="seo-semantic-hidden">PokeMMO Counter Theme Generator - Encounter Counter Tool</h1><section class="seo-semantic-hidden"><p>The Team Synergy Counter Generator is a powerful tool for creating custom PokeMMO encounter counter themes to track shiny hunting progress. Design custom counter overlays displaying animated shiny Pokemon GIFs to monitor encounter counts during intense shiny hunts. Our guide explains how to customize counter sizing, positioning, and styling for optimal gameplay visibility. The counter theme generator simplifies creating professional-looking encounter counters without technical knowledge. Use our tool to import shiny Pokemon GIFs and arrange them as desired for your custom counter layout. Team Synergy's counter generator exports ready-to-use packages compatible with PokeMMO modding systems. Our guide includes best practices for counter design that maintains gameplay immersion while displaying critical information. The encounter counter tool helps shiny hunters track multiple Pokemon simultaneously during group hunting sessions. Customize colors, fonts, and backgrounds to match your PokeMMO interface preferences. The generator provides templates and presets for common shiny hunts and legendary encounters. Share your custom counter themes with the Team Synergy community and discover designs created by expert hunters.</p></section>`,
      '/events': `<h1 class="seo-semantic-hidden">PokeMMO Events - Shiny Hunting Competitions</h1><section class="seo-semantic-hidden"><p>Team Synergy hosts exciting PokeMMO events including shiny hunting competitions, catching championships, PVP tournaments, and seasonal challenges. Our events guide provides complete rules, prize information, and registration details for upcoming competitions. Participate in shiny hunting events to showcase your skills and compete against elite PokeMMO players. Team Synergy events include monthly shiny wars where hunters race to catch the most valuable shiny Pokemon. Our guide covers event scoring systems, nature bonuses, and tier-based point calculations. Join group hunting events to work together with teammates toward collective goals. Team Synergy offers prizes for event winners including trophies, recognition, and in-game rewards. The events calendar displays upcoming competitions with difficulty ratings and entry requirements. Our guide explains how to register and what to expect during competitive shiny hunting events. Team Synergy's competitive events create community engagement and celebrate exceptional shiny hunting achievements. Discover event-specific rules for valid Pokemon, catch location restrictions, and time-based challenges. The events page provides live leaderboards tracking participant progress during active competitions.</p></section>`,
      '/trophy-board': `<h1 class="seo-semantic-hidden">Team Synergy Trophy Board - Achievements</h1><section class="seo-semantic-hidden"><p>The Team Synergy Trophy Board displays prestigious achievements earned by community members for exceptional accomplishments in PokeMMO shiny hunting. View all available trophies and discover which members have achieved specific milestones. Our trophy guide explains achievement criteria and what it takes to earn each trophy. Team Synergy recognizes outstanding shiny hunters through our comprehensive trophy system covering various hunting styles and specializations. Browse trophy winners and learn their strategies for achieving awards. The trophy board celebrates both competitive achievements and community contributions. Our guide details trophy categories including shiny count records, legendary catches, event victories, and community service recognition. Each trophy page displays all members who earned that specific achievement. Team Synergy trophies motivate hunters to pursue excellence and inspire newer hunters with achievable goals. The trophy board serves as a historical record of Team Synergy's greatest hunters and their legendary catches. View statistics for each trophy including rarity ratings and average earning time. The achievement system encourages participation in shiny hunting events and community challenges.</p></section>`,
      '/streamers': `<h1 class="seo-semantic-hidden">Team Synergy Streamers - PokeMMO Live</h1><section class="seo-semantic-hidden"><p>Team Synergy features talented PokeMMO streamers broadcasting live shiny hunting sessions on Twitch and YouTube. Watch expert hunters perform shiny hunts in real-time and learn advanced strategies through live commentary. Our streamer directory provides links to all Team Synergy content creators and their streaming schedules. Follow Team Synergy streamers for daily PokeMMO content including shiny hunting guides, PVP battles, and community events. Our guide helps you discover top shiny hunters and their favorite Pokemon targets. Join live chat during streams to interact with experienced hunters and ask shiny hunting questions. Team Synergy streamers showcase rare shiny Pokemon catches and explain hunting techniques for different Pokemon tiers. The streamer page displays current live status and upcoming stream schedules. Watch gameplay to improve your own shiny hunting abilities and stay updated on PokeMMO trends. Team Synergy content creators produce entertaining educational content for all skill levels. Subscribe to your favorite Team Synergy streamers for exclusive highlights and offline content. The streaming community brings together shiny hunters from around the world for shared gaming experiences.</p></section>`,
      '/safari-zones': `<h1 class="seo-semantic-hidden">PokeMMO Safari Zones - Catch Rates, Flee Rates & Strategies</h1><section class="seo-semantic-hidden"><p>Team Synergy's complete PokeMMO Safari Zones guide covers both Johto and Sinnoh (Great Marsh) Safari Zones with detailed mechanics and strategies. Learn the unique mechanics of Safari Zones where Pokemon have different catch rates and flee rates compared to normal wild encounters. Our guide explains how catch rate and flee rate work together to impact your success catching Safari Zone Pokemon. Discover which Pokemon are available in each Safari Zone and their specific encounter rates for efficient hunting. Team Synergy provides optimal strategies for catching difficult Safari Zone Pokemon without wasting Safari Balls. Learn how to approach, throw Safari Balls, and use items effectively in Safari Zone encounters. The guide includes detailed information for both Johto Safari Zone and Sinnoh's Great Marsh with Pokemon lists and rates. Plan your Safari Zone visits efficiently with our hunting guides and strategy recommendations. Understand the mechanics of different Pokemon species in Safari Zones to maximize your catch success. Safari Zone hunting is unique compared to regular shiny hunting and requires specific strategies covered in our comprehensive guide. Use Team Synergy's Safari Zone guide to catch rare Pokemon and complete your collection efficiently.</p></section>`,
      '/shiny-war-2025': `<h1 class="seo-semantic-hidden">Shiny Wars 2025 - Team Synergy Competition Results</h1><section class="seo-semantic-hidden"><p>Team Synergy Shiny Wars 2025 results display our team's competitive shiny hunting performance in the official PokeMMO season. View our top placements, total shiny catches, and point accumulations across all competition rounds. Our competition guide explains the shiny wars scoring system and tier-based point calculations. Team Synergy competed at the highest level catching valuable shiny Pokemon and executing expert hunting strategies. Browse individual catch records breaking down results by hunter and shiny rarity tier. The shiny wars showcase highlights remarkable achievements by Team Synergy members in official competitions. Our guide explains how shiny wars scoring works including nature bonuses and legendary multipliers. View championship leaderboards and compare Team Synergy's performance against other competitive organizations. Team Synergy's shiny wars results demonstrate our community's dedication to excellence in PokeMMO. Discover top-performing hunters and their favorite shiny Pokemon targets during competition season. The results page provides detailed statistics including average catch value and tier distribution. Team Synergy continues striving for championship glory in upcoming shiny wars seasons.</p></section>`,
      '/resources': `<h1 class="seo-semantic-hidden">Team Synergy PokeMMO Resources - Guides, Tools & Community Links</h1><section class="seo-semantic-hidden"><p>Team Synergy Resources is your comprehensive hub for PokeMMO guides, hunting tools, community links, and expert strategies. Discover official PokeMMO resources including the wiki, forums, and community databases for shiny hunting information. Access Team Synergy's specialized tools including our Counter Generator for custom encounter overlays, Random Pokemon Generator for hunt challenges, and interactive Pokédex with detailed location data. Learn shiny hunting fundamentals with beginner guides covering encounter mechanics, catch rates, and optimal hunting strategies. Advanced hunters can explore nature optimization, IV training, and PVP battle preparation guides. Connect with the Team Synergy community through our Discord server where members share strategies, event information, and hunting achievements. Find recommended external resources including Pokemon databases, species guides, and breeding calculators for comprehensive game knowledge. Our resources page aggregates tools that help you succeed in PokeMMO whether you're starting your first hunt or competing at championship levels. Explore guides on Safari Zone mechanics, roaming legendary schedules, and event competition rules. Team Synergy's curated resource collection saves you time researching and helps you develop effective hunting strategies. Whether seeking catch calculators, community support, or advanced training techniques, our Resources page connects you to the knowledge and tools needed for PokeMMO success.</p></section>`,
    };
    
    // Check if this is a resource page request
    if (route && route.includes('/resources/')) {
      // Build breadcrumb hierarchy for resource pages
      const segments = route.split('/').filter(Boolean);
      const breadcrumbNav = segments.slice(1).map(segment => {
        return segment
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }).join(' > ');
      
      const hasDescription = meta.ogDescription && meta.ogDescription.length > 20;
      const descriptionText = hasDescription 
        ? meta.ogDescription 
        : 'Explore Team Synergy resources for PokeMMO guides, tools, and community links';
      
      // Generate dynamic resource page content with breadcrumbs
      const h1Title = meta.ogTitle?.split('|')[0]?.trim() || breadcrumbNav;
      return `<h1 class="seo-semantic-hidden">${h1Title}</h1><nav class="seo-semantic-hidden" role="navigation"><p>Breadcrumb: Resources > ${breadcrumbNav}</p></nav><section class="seo-semantic-hidden"><p>${descriptionText}</p></section>`;
    }
    
    return pageDescriptions[route] || '';
  }
  
  const hiddenSeoContent = getHiddenSeoContent(meta.route, meta);
  let h1Title = meta.ogTitle?.split('|')[0]?.trim() || 'Team Synergy';
  
  if (hiddenSeoContent) {
    html = html.replace(/<body[^>]*>/, `<body>\n  ${hiddenSeoContent}`);
  } else {
    // Fallback for pages without specific descriptions
    const h1Html = `<h1 class="seo-semantic-hidden">${h1Title}</h1>`;
    html = html.replace(/<body[^>]*>/, `<body>\n  ${h1Html}`);
  }

  // ---- ADD IMAGE ALT TEXT (via meta tag for crawler reference) ----
  // Primary image alt text
  if (meta.ogImage && !html.includes('meta name="image:alt"')) {
    const imageAlt = h1Title || 'Team Synergy PokeMMO';
    html = html.replace(/<\/head>/, `  <meta property="twitter:image:alt" content="${imageAlt}">\n</head>`);
  }

  // Add structured data based on route type
  let schemaScripts = [];
  let schemaScript = '';
  
  // ---- ORGANIZATION SCHEMA (Homepage only) ----
  if (meta.route === '/') {
    const orgSchema = generateOrganizationSchema();
    schemaScripts.push(`<script type="application/ld+json">\n${JSON.stringify(orgSchema, null, 2)}\n</script>`);
    
    // Add website search schema for enhanced search appearance
    const webSearchSchema = generateWebsiteSearchSchema();
    schemaScripts.push(`<script type="application/ld+json">\n${JSON.stringify(webSearchSchema, null, 2)}\n</script>`);
    
    // Add social media posting schema for homepage
    const socialSchema = generateSocialMediaSchema(
      meta.ogTitle,
      meta.ogDescription,
      meta.ogImage,
      'https://synergymmo.com/'
    );
    schemaScripts.push(`<script type="application/ld+json">\n${JSON.stringify(socialSchema, null, 2)}\n</script>`);
  }
  
  // ---- WEBPAGE SCHEMA (all pages) ----
  const webPageSchema = generateWebPageSchema(meta.route, meta.ogTitle, meta.ogDescription, meta.ogImage);
  schemaScripts.push(`<script type="application/ld+json">\n${JSON.stringify(webPageSchema, null, 2)}\n</script>`);
  
  // ---- COLLECTION PAGE SCHEMA (for Pokédex, Trophy Board, and Shiny Showcase) ----
  if (meta.route === '/pokedex') {
    const collectionSchema = generateCollectionPageSchema(
      meta.route,
      meta.ogTitle,
      meta.ogDescription,
      meta.ogImage,
      1025  // ~1000+ Gen 1-5 Pokemon with variants
    );
    schemaScripts.push(`<script type="application/ld+json">\n${JSON.stringify(collectionSchema, null, 2)}\n</script>`);
  } else if (meta.route === '/trophy-board') {
    const collectionSchema = generateCollectionPageSchema(
      meta.route,
      meta.ogTitle,
      meta.ogDescription,
      meta.ogImage,
      12  // 12 unique trophies
    );
    schemaScripts.push(`<script type="application/ld+json">\n${JSON.stringify(collectionSchema, null, 2)}\n</script>`);
  } else if (meta.route === '/shiny-showcase') {
    const collectionSchema = generateCollectionPageSchema(
      meta.route,
      meta.ogTitle,
      meta.ogDescription,
      meta.ogImage,
      140  // 140+ team members with shiny collections
    );
    schemaScripts.push(`<script type="application/ld+json">\n${JSON.stringify(collectionSchema, null, 2)}\n</script>`);
  }
  
  // ---- SOCIAL MEDIA SCHEMA (all pages) ----
  const socialMediaSchema = generateSocialMediaSchema(
    meta.ogTitle,
    meta.ogDescription,
    meta.ogImage,
    `https://synergymmo.com${meta.route === '/' ? '' : meta.route}/`
  );
  schemaScripts.push(`<script type="application/ld+json">\n${JSON.stringify(socialMediaSchema, null, 2)}\n</script>`);
  
  // ---- PLAYER SCHEMA ----
  if (meta.route?.includes('/player/')) {
    const playerName = meta.route.split('/').pop();
    const personSchema = generatePersonSchema(decodeURIComponent(playerName));
    schemaScript = `<script type="application/ld+json">\n${JSON.stringify(personSchema, null, 2)}\n</script>`;
  } 
  // ---- POKEMON SCHEMA ----
  else if (meta.route?.includes('/pokemon/')) {
    const pokemonName = meta.route.split('/').pop();
    const pokemonSchema = generatePokemonSchema(pokemonName, pokemonName);
    schemaScript = `<script type="application/ld+json">\n${JSON.stringify(pokemonSchema, null, 2)}\n</script>`;
    
    // Add game schema for Pokemon pages
    const gameSchema = generateGameSchema(pokemonName);
    schemaScripts.push(`<script type="application/ld+json">\n${JSON.stringify(gameSchema, null, 2)}\n</script>`);
  }
  // ---- EVENT SCHEMA ----
  else if (meta.route?.includes('/event/')) {
    const eventName = meta.route.split('/').pop();
    const eventSchema = generateEventSchema(meta.ogTitle, meta.ogDescription);
    schemaScript = `<script type="application/ld+json">\n${JSON.stringify(eventSchema, null, 2)}\n</script>`;
  }
  // ---- TROPHY SCHEMA ----
  else if (meta.route?.includes('/trophy/')) {
    const trophyName = meta.route.split('/').pop();
    const trophySchema = generateTrophySchema(trophyName);
    schemaScript = `<script type="application/ld+json">\n${JSON.stringify(trophySchema, null, 2)}\n</script>`;
  }
  // ---- RESOURCE SCHEMA ----
  else if (meta.route?.includes('/resources/')) {
    // Generate resource-specific collection schema if metadata is available
    if (meta.categoryName || meta.ogTitle) {
      const resourceCollectionSchema = generateResourceCollectionSchema(
        meta.route,
        meta.ogTitle?.split('|')[0]?.trim() || 'Resources',
        meta.ogDescription || 'Team Synergy resources'
      );
      schemaScripts.push(`<script type="application/ld+json">\n${JSON.stringify(resourceCollectionSchema, null, 2)}\n</script>`);
    }
  }
  
  if (schemaScript) {
    schemaScripts.push(schemaScript);
  }

  // ---- FAQ SCHEMA (for all pages that have FAQs) ----
  const faqs = getFaqsForRoute(meta.route);
  if (faqs && faqs.length > 0) {
    const faqSchema = generateFaqSchema(faqs);
    if (faqSchema) {
      schemaScripts.push(`<script type="application/ld+json">\n${JSON.stringify(faqSchema, null, 2)}\n</script>`);
    }
  }

  // ---- RESOURCE-SPECIFIC BREADCRUMB SCHEMA ----
  // Use enhanced breadcrumb schema for resource pages instead of generic one
  let breadcrumbScript;
  if (meta.route?.includes('/resources/')) {
    const resourceBreadcrumbSchema = generateResourceBreadcrumbSchema(meta.route, {
      description: meta.ogDescription
    });
    breadcrumbScript = `<script type="application/ld+json">\n${JSON.stringify(resourceBreadcrumbSchema, null, 2)}\n</script>`;
  } else {
    // Standard breadcrumb for other pages
    const routePath = meta.route || '/';
    const routeName = meta.ogTitle?.split('|')[0]?.trim() || 'Page';
    const breadcrumbSchema = generateBreadcrumbSchema(routePath, routeName);
    breadcrumbScript = `<script type="application/ld+json">\n${JSON.stringify(breadcrumbSchema, null, 2)}\n</script>`;
  }
  schemaScripts.push(breadcrumbScript);

  // ---- CREATOR SCHEMA (attribution on all pages) ----
  const creatorSchema = generateCreatorSchema(meta.route);
  schemaScripts.push(`<script type="application/ld+json">\n${JSON.stringify(creatorSchema, null, 2)}\n</script>`);

  // Inject all schema tags before closing body
  const allSchemaScripts = schemaScripts.join('\n  ');
  html = html.replace(/<\/body>/, `  ${allSchemaScripts}\n</body>`);

  // Inject crawler-friendly navigation if provided
  if (meta.crawlerLinks) {
    const navHtml = generateCrawlerNav(meta.crawlerLinks, meta.route || 'Navigation', meta.route);
    html = html.replace(/<\/body>/, `${navHtml}\n</body>`);
  }
  
  // ---- PERFORMANCE: ADD AUTHOR/CREATOR META TAG ----
  // HTML author tag for proper attribution
  if (!html.includes('meta name="author')) {
    html = html.replace(/<\/head>/, `  <meta name="author" content="Team Synergy - PokeMMO Community">
</head>`);
  }

  await mkdir(join(outPath, '..'), { recursive: true });
  await writeFile(outPath, html, 'utf-8');
  console.log(`→ Prerendered ${outPath} (${cleanDescription.length} chars desc${meta.crawlerLinks ? `, ${meta.crawlerLinks.length} crawler links` : ''})`);
}

async function prerender() {
  console.log('Starting prerender...');

  const templateHtml = await readFile(join(DIST, 'index.html'), 'utf-8');

  // PRE-FETCH DYNAMIC DATA FOR CRAWLER LINKS
  console.log('📊 Fetching dynamic data for crawler navigation...');
  const players = await getPlayers();
  const events = await getEvents();
  const trophies = await getTrophies();
  const streamers = await getStreamers();
  const pokemonData = (() => {
    try {
      const pokemonPath = join(__dirname, '../src/data/pokemmo_data/pokemon-data.json');
      const raw = readFileSync(pokemonPath, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.warn('⚠️  Could not load pokemon data for crawler links:', err.message);
      return {};
    }
  })();

  // Pokemon links - deduplicate by base form (e.g., unown, unown-a, unown-b → only unown)
  const pokemonLinkMap = new Map();
  Object.entries(pokemonData).forEach(([key, pokemon]) => {
    const sanitized = sanitizePokemonName(pokemon.displayName || key);
    const baseForm = sanitized.split('-')[0]; // Get base form (before first dash)
    
    // Only add if we haven't seen this base form yet
    if (!pokemonLinkMap.has(baseForm)) {
      pokemonLinkMap.set(baseForm, {
        href: `/pokemon/${sanitized}/`,
        title: pokemon.displayName || key
      });
    }
  });
  const pokemonLinks = Array.from(pokemonLinkMap.values());
  console.log(`📊 Deduped Pokemon: ${Object.keys(pokemonData).length} forms → ${pokemonLinks.length} base forms`);

  const playerLinks = players.map(p => ({
    href: `${p.route}/`,
    title: p.route.split('/').pop()
  }));

  const streamerLinks = streamers.map(s => ({
    href: `${s.route}/`,
    title: s.title
  }));

  const eventLinks = events.map(e => ({
    href: `${e.route}/`,
    title: e.route.split('/').pop()
  }));

  const trophyLinks = trophies.map(t => ({
    href: `${t.route}/`,
    title: t.route.split('/').pop()
  }));

  const roamingLegendariesLinks = [{
    href: '/roaming-legendaries/',
    title: 'Roaming Legendaries Calendar'
  }];

  // Static route OG overrides with CRAWLER LINKS
  const STATIC_META = {
    '/': {
      route: '/',
      ogTitle: 'Team Synergy - PokeMMO Shiny Hunting Community Hub',
      ogDescription: 'Team Synergy is the ultimate PokeMMO shiny hunting community hub. Browse 140+ player shiny collections, explore our detailed Pokédex, watch live Twitch streamers, track roaming legendaries, and join competitions.',
      ogImage: 'https://synergymmo.com/images/openGraph.jpg',
      crawlerLinks: [...playerLinks, ...pokemonLinks, ...streamerLinks],
    },
    '/shiny-showcase': {
      route: '/shiny-showcase',
      ogTitle: 'Shiny Showcase - Team Synergy PokeMMO Member Collections',
      ogDescription: 'Browse Team Synergy\'s 140+ member shiny collections ranked by total count. Discover the best shiny hunters, view collection statistics, and explore spectacular Pokemon catches.',
      ogImage: 'https://synergymmo.com/images/pokemon_gifs/tier_7/reuniclus.gif',
      crawlerLinks: playerLinks,
    },
    '/shotm': {
      route: '/shotm',
      ogTitle: 'Shiny of the Month - Team Synergy - PokeMMO',
      ogDescription: 'Team Synergy Shiny of the Month (SHOTM) showcases outstanding shiny catches and achievements by our community members each month.',
      ogImage: 'https://synergymmo.com/images/pokemon_gifs/tier_7/reuniclus.gif',
      crawlerLinks: [...playerLinks, ...pokemonLinks],
    },
    '/pokedex': {
      route: '/pokedex',
      ogTitle: 'Pokédex Tracker - Shiny & Living Dex | Team Synergy - PokeMMO',
      ogDescription: 'Track Team Synergy\'s complete Pokédex in PokeMMO. Filter by tier, type, location, and abilities. Search shinies, track caught progress, find encounters, and explore all generations with advanced filtering.',
      ogImage: 'https://synergymmo.com/images/pokemon_gifs/tier_7/pikachu.gif',
      crawlerLinks: [...roamingLegendariesLinks, ...pokemonLinks],
    },
    '/roaming-legendaries': {
      route: '/roaming-legendaries',
      ogTitle: 'Roaming Legendaries Calendar - PokeMMO Zapdos, Articuno, Moltres, Entei, Suicune, Raikou Schedule',
      ogDescription: 'PokeMMO Roaming Legendaries Calendar showing monthly availability of Zapdos, Moltres, Articuno, Entei, Suicune, and Raikou. Track which roaming legendaries are available each month and plan your shiny hunts.',
      ogImage: 'https://img.pokemondb.net/sprites/black-white/anim/shiny/suicune.gif',
    },
    '/random-pokemon-generator': {
      route: '/random-pokemon-generator',
      ogTitle: 'Random Pokémon Generator & Shiny Bingo | Team Synergy - PokeMMO',
      ogDescription: 'Generate random Pokémon targets for PokeMMO hunts. Play shiny bingo with 3x3, 4x4, or 5x5 boards, filter by tier, randomize natures and IVs. Track your completion and find new hunt challenges.',
      ogImage: 'https://synergymmo.com/images/pokemon_gifs/tier_0/bulbasaur.gif',
      crawlerLinks: pokemonLinks,
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
      ogImage: 'https://synergymmo.com/images/pokemon_gifs/tier_7/reuniclus.gif',
      crawlerLinks: eventLinks,
    },
    '/trophy-board': {
      route: '/trophy-board',
      ogTitle: 'Team Synergy Trophy Board | Team Synergy - PokeMMO',
      ogDescription: 'Explore trophies and achievements earned by Team Synergy members in PokeMMO. View championship awards, milestone accomplishments, and community recognition. Celebrate team success and member achievements.',
      ogImage: 'https://synergymmo.com/images/pokemon_gifs/tier_7/reuniclus.gif',
      crawlerLinks: trophyLinks,
    },
    '/streamers': {
      route: '/streamers',
      ogTitle: 'Team Synergy Streamers | Team Synergy - PokeMMO',
      ogDescription: 'Watch Team Synergy members stream PokeMMO live on Twitch. Check live status, find active streamers, join the community watching shiny hunts, encounters, and competitive gameplay.',
      ogImage: 'https://synergymmo.com/images/openGraph.jpg',
      crawlerLinks: streamerLinks,
    },
    '/shiny-war-2025': {
      route: '/shiny-war-2025',
      ogTitle: 'Shiny Wars 2025 Results | Team Synergy - PokeMMO',
      ogDescription: 'Team Synergy placed #25 in the Official PokeMMO Shiny Wars 2025 with 1060 points and 111 shinies. View every catch with tier breakdowns and point totals.',
      ogImage: 'https://synergymmo.com/images/pokemon_gifs/tier_1/leafeon.gif',
      crawlerLinks: pokemonLinks,
    },
    '/safari-zones': {
      route: '/safari-zones',
      ogTitle: 'PokeMMO Safari Zone Guide - Catch Rates, Flee Rates & Best Strategies',
      ogDescription: 'Complete PokeMMO Safari Zone guide with catch rates, flee rates, and optimal strategies for Johto and Sinnoh (Great Marsh). Find the best approach for every Safari Zone Pokemon.',
      ogImage: 'https://synergymmo.com/images/pokemon_gifs/tier_1/chansey.gif',
    },
    '/resources': {
      route: '/resources',
      ogTitle: 'PokeMMO Resources - Guides, Tools & Community Links | Team Synergy',
      ogDescription: 'Explore Team Synergy\'s comprehensive PokeMMO resources. Find guides, tools, calculators, community links, and expert tips for shiny hunting, PVP training, and competitive gameplay.',
      ogImage: 'https://synergymmo.com/images/openGraph.jpg',
    },
  };

  // Static routes
  for (const route of STATIC_ROUTES) {
    const outPath = route === '/' ? join(DIST, 'index.html') : join(DIST, route.slice(1), 'index.html');
    await prerenderRoute(templateHtml, outPath, STATIC_META[route]);
  }

  // Player pages (already fetched above for crawler links)
  console.log(`Prerendering ${players.length} player pages...`);
  for (const p of players) {
    const outPath = join(DIST, p.route.slice(1), 'index.html');
    await prerenderRoute(templateHtml, outPath, p);
  }

  // Event pages (already fetched above for crawler links)
  console.log(`Prerendering ${events.length} event pages...`);
  for (const e of events) {
    const outPath = join(DIST, e.route.slice(1), 'index.html');
    await prerenderRoute(templateHtml, outPath, e);
  }

  // Trophy pages (already fetched above for crawler links)
  console.log(`Prerendering ${trophies.length} trophy pages...`);
  for (const t of trophies) {
    const outPath = join(DIST, t.route.slice(1), 'index.html');
    await prerenderRoute(templateHtml, outPath, t);
  }

  // Resource pages
  const resources = getResourceRoutes();
  console.log(`Prerendering ${resources.length} resource pages...`);
  for (const r of resources) {
    const outPath = join(DIST, r.route.slice(1), 'index.html');
    await prerenderRoute(templateHtml, outPath, r);
  }

  // Pokemon pages (already fetched above for crawler links)
  console.log(`Prerendering ${Object.keys(pokemonData).length} Pokemon pages...`);
  try {
    const pokemon = await getPokemon();
    for (const p of pokemon) {
      const outPath = join(DIST, p.route.slice(1), 'index.html');
      await prerenderRoute(templateHtml, outPath, p);
    }
  } catch (err) {
    console.warn('Failed to prerender Pokemon pages:', err.message);
  }

  console.log('✅ Prerender complete!');
}

prerender().catch(err => {
  console.error('Prerender failed:', err);
  process.exit(1);
});