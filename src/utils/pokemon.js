import tierPokemon from '../data/tier_pokemon.json'

const VERSION = 1

// Strip apostrophes, dots, and other punctuation from pokemon names
// e.g. "farfetch'd" -> "farfetchd", "mime-jr." -> "mime-jr", "Mr. Mime" -> "mr-mime"
function sanitize(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019']/g, '')  // all apostrophe variants
    .replace(/\./g, '')               // periods
    .replace(/\s+/g, '-')             // spaces -> hyphens
    .replace(/[♀]/g, 'f')
    .replace(/[♂]/g, 'm')
}

// Build tier lookup once at module level (sanitized keys)
const tierLookup = {}
Object.entries(tierPokemon).forEach(([tier, names]) => {
  names.forEach(name => {
    tierLookup[sanitize(name)] = tier
  })
})

// Pokemon with local gifs whose folder doesn't match tier_pokemon.json
// (baby pokemon, extra evolutions, or duplicates across tiers)
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
}

// Legendary and Mythical Pokemon - skip local folder lookup and use remote source
const LEGENDARY_MYTHICAL = new Set([
  'articuno',
  'zapdos',
  'moltres',
  'mewtwo',
  'mew',
  'raikou',
  'entei',
  'suicune',
  'lugia',
  'ho-oh',
  'celebi',
  'regirock',
  'regice',
  'registeel',
  'latias',
  'latios',
  'kyogre',
  'groudon',
  'rayquaza',
  'jirachi',
  'deoxys',
  'deoxys-attack',
  'deoxys-defense',
  'deoxys-speed',
  'uxie',
  'mesprit',
  'azelf',
  'dialga',
  'palkia',
  'heatran',
  'regigigas',
  'giratina',
  'giratina-altered',
  'giratina-origin',
  'cresselia',
  'phione',
  'manaphy',
  'darkrai',
  'shaymin',
  'shaymin-sky',
  'arceus',
  'victini',
  'cobalion',
  'terrakion',
  'virizion',
  'tornadus',
  'thundurus',
  'reshiram',
  'zekrom',
  'landorus',
  'kyurem',
  'kyurem-black',
  'kyurem-white',
  'keldeo',
  'meowstic',
  'genesect',
  'diancie',
  'hoopa',
  'volcanion',
  'type-null',
  'silvally',
  'tapu-koko',
  'tapu-lele',
  'tapu-bulu',
  'tapu-fini',
  'cosmog',
  'cosmoem',
  'solgaleo',
  'lunala',
  'magearna',
  'marshadow',
  'zeraora',
  'meltan',
  'melmetal',
  'zacian',
  'zamazenta',
  'eternatus',
  'kubfu',
  'urshifu',
  'urshifu-rapid-strike',
  'zarude',
  'glastrier',
  'spectrier',
  'calyrex',
  'calyrex-ice',
  'calyrex-shadow',
  'enamorus',
  'wo-chien',
  'chienpao',
  'ting-lu',
  'chi-yu',
  'koraidon',
  'miraidon',
  'pecharunt',
])

export function getLocalPokemonGif(name) {
  const sanitized = sanitize(name)
  
  // Skip local folder lookup for legendary/mythical pokemon and use remote source directly
  if (LEGENDARY_MYTHICAL.has(sanitized)) {
    return getRemoteFallbackUrl(name)
  }
  
  if (GIF_FOLDER_OVERRIDES[sanitized]) {
    return `/images/pokemon_gifs/${GIF_FOLDER_OVERRIDES[sanitized]}/${sanitized}.gif?v=${VERSION}`
  }
  const tier = tierLookup[sanitized]
  const folder = tier ? `tier_${tier.replace(/\D/g, '')}` : 'tier_0'
  return `/images/pokemon_gifs/${folder}/${sanitized}.gif?v=${VERSION}`
}

export function getRemoteFallbackUrl(name, shiny = true) {
  const urlName = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[.']/g, '')
    .replace(/[♀]/g, 'f')
    .replace(/[♂]/g, 'm')
    .replace(/\[.*\]/, '')
  return `https://img.pokemondb.net/sprites/black-white/anim/${shiny ? 'shiny' : 'normal'}/${urlName}.gif`
}

export function onGifError(name, shiny = true) {
  return (e) => {
    const fallback = getRemoteFallbackUrl(name, shiny)
    if (e.target.src !== fallback) {
      e.target.src = fallback
    }
  }
}

export function normalizePokemonName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[.'']/g, '')
    .replace(/\s+/g, '-')
}

export function getPokemonImageUrl(name, shiny = true) {
  return getLocalPokemonGif(name)
}

export function formatPokemonName(name) {
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : name
}
// Extract base Pokemon name, stripping form variants (e.g., "frillish-f" -> "frillish")
// This is used for navigation to ensure form variants go to the main Pokemon page
export function getBasePokemonName(name) {
  if (!name || typeof name !== 'string') return name
  
  const lowerName = name.toLowerCase()
  
  // Known form variant suffixes that should be stripped
  const formVariantSuffixes = [
    'f', 'm', 'h', 'a',
    'alola', 'galar', 'hisui', 'paldea', 'unbound',
    'east', 'west',
    'attack', 'defense', 'speed',
    'rapid', 'single',
    'origin', 'altered',
    'sky', 'land', 'therian', 'incarnate', 'resolute', 'active', 'pendant', 'dusk', 'dawn'
  ]
  
  // Check if name has a hyphen
  if (!lowerName.includes('-')) return name
  
  // Split on the last hyphen
  const lastHyphenIndex = lowerName.lastIndexOf('-')
  const potentialSuffix = lowerName.substring(lastHyphenIndex + 1)
  const baseName = name.substring(0, lastHyphenIndex)
  
  // If the suffix is a known form variant, return the base name
  if (formVariantSuffixes.includes(potentialSuffix)) {
    return baseName
  }
  
  // Also handle multi-word suffixes like "rapid-strike"
  const potentialMultiSuffix = lowerName.substring(lowerName.indexOf('-') + 1)
  if (potentialMultiSuffix === 'rapid-strike' || potentialMultiSuffix === 'single-strike') {
    return lowerName.substring(0, lowerName.indexOf('-'))
  }
  
  // Otherwise return the original name (it might be a base Pokemon with hyphens like "tapu-koko")
  return name
}