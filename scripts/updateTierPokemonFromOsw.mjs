/**
 * Regenerates src/data/tier_pokemon.json from src/data/osw-encounter-tiers.json
 * (the encounter tier list, which only lists base/encounterable species) by
 * expanding every listed Pokemon into its full evolution line using
 * src/data/generation.json.
 *
 * Also reconciles public/images/pokemon_gifs/tier_N folders so every gif lives
 * in the folder matching its species' new tier.
 *
 * Usage:
 *   node scripts/updateTierPokemonFromOsw.mjs          # dry-run, prints plan
 *   node scripts/updateTierPokemonFromOsw.mjs --apply  # writes file + moves gifs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')

const oswPath = path.join(rootDir, 'src', 'data', 'osw-encounter-tiers.json')
const genPath = path.join(rootDir, 'src', 'data', 'generation.json')
const tierPokemonPath = path.join(rootDir, 'src', 'data', 'tier_pokemon.json')
const gifsDir = path.join(rootDir, 'public', 'images', 'pokemon_gifs')

const APPLY = process.argv.includes('--apply')

const osw = JSON.parse(fs.readFileSync(oswPath, 'utf8'))
const generations = JSON.parse(fs.readFileSync(genPath, 'utf8'))

// Same normalization as the app (src/utils/pokemon.js sanitize / SynergyShinyWars2026 normalizeSpecies)
function normalize(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019']/g, '')
    .replace(/\./g, '')
    .replace(/\s+/g, '-')
}

// Build member -> evolution lines lookup from generation.json
const linesByMember = new Map()
Object.values(generations).forEach((lines) => {
  if (!Array.isArray(lines)) return
  lines.forEach((line) => {
    if (!Array.isArray(line) || !line.length) return
    line.forEach((member) => {
      const key = normalize(member)
      if (!linesByMember.has(key)) linesByMember.set(key, [])
      linesByMember.get(key).push(line)
    })
  })
})

function findLines(name) {
  const exact = linesByMember.get(name)
  if (exact) return exact
  // Form-suffix match: e.g. osw lists "Basculin" while the line is
  // ["basculin-blue-striped","basculin-red-striped"]
  const matches = []
  for (const [member, lines] of linesByMember) {
    if (member.startsWith(`${name}-`)) matches.push(...lines)
  }
  return matches.length ? matches : null
}

// ---- 1. Generate new tier_pokemon.json -------------------------------------
const tierOrder = ['tier_7', 'tier_6', 'tier_5', 'tier_4', 'tier_3', 'tier_2', 'tier_1', 'tier_0']
const newData = {}
const speciesTier = new Map() // normalized species -> tier number (string)
const unmatchedOswNames = []

for (const tierKey of tierOrder) {
  const tier = osw[tierKey]
  if (!tier) continue
  const tierNum = tierKey.replace('tier_', '')
  const list = []
  const seen = new Set()

  for (const entry of tier.pokemon || []) {
    const name = normalize(typeof entry === 'string' ? entry : entry?.name || '')
    if (!name) continue
    const lines = findLines(name)
    if (!lines) {
      unmatchedOswNames.push(`${name} (${tierKey})`)
      if (!seen.has(name)) {
        seen.add(name)
        list.push(name)
      }
      continue
    }
    // Keep the listed species itself even when the matched line only contains
    // form variants (e.g. "basculin" vs ["basculin-blue-striped", ...]) so
    // consumers looking up plain "Basculin" keep working.
    const isLineMember = lines.some((line) => line.some((member) => normalize(member) === name))
    if (!isLineMember && !seen.has(name)) {
      seen.add(name)
      list.push(name)
    }
    for (const line of lines) {
      for (const member of line) {
        const m = normalize(member)
        if (!seen.has(m)) {
          seen.add(m)
          list.push(m)
        }
      }
    }
  }

  newData[`Tier ${tierNum}`] = list
  list.forEach((m) => {
    if (speciesTier.has(m) && speciesTier.get(m) !== tierNum) {
      console.warn(`WARNING: ${m} assigned to both tier ${speciesTier.get(m)} and tier ${tierNum}`)
    }
    speciesTier.set(m, tierNum)
  })
}

// ---- 2. Diff against current tier_pokemon.json ------------------------------
const current = JSON.parse(fs.readFileSync(tierPokemonPath, 'utf8'))
const currentTierOf = new Map()
Object.entries(current).forEach(([tier, names]) => {
  names.forEach((n) => currentTierOf.set(normalize(n), tier.replace(/\D/g, '')))
})

const changes = []
for (const [species, tierNum] of speciesTier) {
  const prev = currentTierOf.get(species)
  if (prev == null) changes.push(`NEW: ${species} -> Tier ${tierNum}`)
  else if (prev !== tierNum) changes.push(`MOVED: ${species}: Tier ${prev} -> Tier ${tierNum}`)
}
for (const [species, tierNum] of currentTierOf) {
  if (!speciesTier.has(species)) changes.push(`REMOVED: ${species} (was Tier ${tierNum})`)
}

console.log('=== tier_pokemon.json changes ===')
console.log(changes.length ? changes.join('\n') : '(no species assignment changes)')
const formattingOnly =
  changes.length === 0 && JSON.stringify(current, null, 2) !== JSON.stringify(newData, null, 2)
if (formattingOnly) console.log('(formatting/casing differences only - will rewrite file)')

if (unmatchedOswNames.length) {
  console.log('\n=== osw entries with no evolution line in generation.json (kept as-is) ===')
  console.log(unmatchedOswNames.join('\n'))
}

// ---- 3. Compute gif moves ----------------------------------------------------
// Resolve a gif's species to a tier: exact match, then progressively strip
// hyphen suffixes (handles frillish-f, basculin-red-striped, gastrodon-east...),
// then default to tier_0 (same default as getLocalPokemonGif).
function tierForGif(speciesSlug) {
  let s = speciesSlug
  for (;;) {
    const t = speciesTier.get(s)
    if (t != null) return { tier: t, resolved: s }
    const idx = s.lastIndexOf('-')
    if (idx === -1) break
    s = s.slice(0, idx)
  }
  return { tier: '0', resolved: null }
}

const gifPlan = [] // { file, from, to }
const seenGif = new Map() // filename -> folder already planned to keep

const tierFolders = fs
  .readdirSync(gifsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^tier_\d+$/.test(d.name))
  .map((d) => d.name)

for (const folder of tierFolders) {
  const currentTier = folder.replace('tier_', '')
  for (const file of fs.readdirSync(path.join(gifsDir, folder))) {
    if (!file.endsWith('.gif')) continue
    const slug = file.replace(/\.gif$/, '')
    const { tier, resolved } = tierForGif(slug)
    if (resolved == null) {
      console.log(`NOTE: ${folder}/${file} has no tier data; default folder is tier_0`)
    }
    if (seenGif.has(file)) {
      // Duplicate gif in multiple folders: keep the correctly-tiered copy
      const keptFolder = seenGif.get(file)
      const duplicateFolder = folder
      const wrongFolder = keptFolder === `tier_${tier}` ? duplicateFolder : keptFolder
      gifPlan.push({ file, from: wrongFolder, to: null })
      if (keptFolder !== `tier_${tier}`) {
        seenGif.set(file, `tier_${tier}`)
        gifPlan.push({ file, from: duplicateFolder, to: `tier_${tier}` })
      }
      continue
    }
    seenGif.set(file, folder)
    if (currentTier !== tier) {
      gifPlan.push({ file, from: folder, to: `tier_${tier}` })
    }
  }
}

console.log('\n=== gif moves ===')
console.log(
  gifPlan.length
    ? gifPlan.map((m) => (m.to ? `${m.from}/${m.file} -> ${m.to}/` : `DELETE duplicate ${m.from}/${m.file}`)).join('\n')
    : '(no gif moves needed)'
)

// ---- 4. Apply ----------------------------------------------------------------
if (!APPLY) {
  console.log('\nDry run. Re-run with --apply to write tier_pokemon.json and move gifs.')
  process.exit(0)
}

fs.writeFileSync(tierPokemonPath, `${JSON.stringify(newData, null, 2)}\n`)
console.log(`\nWrote ${tierPokemonPath}`)

for (const move of gifPlan) {
  const src = path.join(gifsDir, move.from, move.file)
  if (!fs.existsSync(src)) {
    console.warn(`SKIP (missing): ${move.from}/${move.file}`)
    continue
  }
  if (move.to == null) {
    fs.rmSync(src)
    console.log(`Deleted duplicate ${move.from}/${move.file}`)
    continue
  }
  const destDir = path.join(gifsDir, move.to)
  fs.mkdirSync(destDir, { recursive: true })
  const dest = path.join(destDir, move.file)
  if (fs.existsSync(dest)) {
    fs.rmSync(src)
    console.log(`Deleted duplicate ${move.from}/${move.file} (already in ${move.to}/)`)
  } else {
    fs.renameSync(src, dest)
    console.log(`Moved ${move.from}/${move.file} -> ${move.to}/`)
  }
}
console.log('Done.')
