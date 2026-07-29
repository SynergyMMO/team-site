import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const sourceConfigPath = path.join(rootDir, 'src/data/region_maps.json')
const monstersDataPath = path.join(rootDir, 'src/data/pokemmo_data/new_data/monsters.json')
const outputDir = path.join(rootDir, 'src/data/region_maps')

const regionIds = ['kanto', 'johto', 'hoenn', 'sinnoh', 'unova']
const regionNameById = {
  kanto: 'Kanto',
  johto: 'Johto',
  hoenn: 'Hoenn',
  sinnoh: 'Sinnoh',
  unova: 'Unova',
}

const suffixPattern = /\b(entrance|interior|area|floor|[0-9]+f|b[0-9]+f)\b/gi

function titleCaseName(value) {
  return value
    .replace(/-/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\bMt\b/g, 'Mt.')
    .replace(/\bPokemon\b/g, 'Pokemon')
}

function normalizeLocation(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/é/gi, 'e')
    .replace(/\./g, '')
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/gi, ' ')
    .replace(suffixPattern, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function normalizeRegion(region) {
  const maps = Array.isArray(region.maps) && region.maps.length > 0
    ? region.maps
    : [{
        id: `${region.id}-main`,
        name: `${region.name} Main`,
        map: region.map,
        areas: region.areas || [],
        markers: region.markers || [],
        paths: region.paths || [],
        switchTriggers: [],
      }]

  return {
    id: region.id,
    name: region.name,
    game: region.game,
    maps: maps.map((mapEntry, index) => ({
      id: mapEntry.id || `${region.id}-${index === 0 ? 'main' : `map-${index + 1}`}`,
      name: mapEntry.name || `${region.name} ${index === 0 ? 'Main' : `Map ${index + 1}`}`,
      map: mapEntry.map || region.map,
      areas: mapEntry.areas || [],
      markers: mapEntry.markers || [],
      paths: mapEntry.paths || [],
      switchTriggers: mapEntry.switchTriggers || [],
      returnMapId: mapEntry.returnMapId || (index === 0 ? null : maps[0]?.id || `${region.id}-main`),
    })),
  }
}

const SEASON_MAP = {
  Spring: 'SEASON0',
  Summer: 'SEASON1',
  Autumn: 'SEASON2',
  Winter: 'SEASON3',
}

function rarityPercentToLabel(rarityStr) {
  if (!rarityStr || rarityStr === '--') return null
  if (rarityStr === 'Lure') return 'Lure'
  if (rarityStr === 'Special') return 'Special'

  const pct = parseFloat(rarityStr)
  if (Number.isNaN(pct)) return rarityStr

  if (pct >= 20) return 'Very Common'
  if (pct >= 10) return 'Common'
  if (pct >= 5) return 'Uncommon'
  if (pct >= 2) return 'Rare'
  return 'Very Rare'
}

function buildTimeString(times, seasonCode) {
  let base
  if (times.length === 3) {
    base = 'ALL'
  } else {
    base = times.join('/')
  }
  return seasonCode ? `${base}/${seasonCode}` : base
}

function buildEncounterEntries(encounter) {
  const method = encounter.is_horde_3x
    ? 'Horde (3x)'
    : encounter.is_horde_5x
      ? 'Horde (5x)'
      : encounter.type

  const isHorde = encounter.is_horde_3x || encounter.is_horde_5x
  const seasonCode = SEASON_MAP[encounter.season] || null

  const morningRarity = rarityPercentToLabel(encounter.rarity_morning)
  const dayRarity = rarityPercentToLabel(encounter.rarity_day)
  const nightRarity = rarityPercentToLabel(encounter.rarity_night)

  const timeRarityMap = {}
  if (morningRarity) timeRarityMap.Morning = morningRarity
  if (dayRarity) timeRarityMap.Day = dayRarity
  if (nightRarity) timeRarityMap.Night = nightRarity

  const times = Object.keys(timeRarityMap)
  if (times.length === 0) return []

  // Group times by their rarity label
  const byRarity = new Map()
  for (const [time, rarity] of Object.entries(timeRarityMap)) {
    if (!byRarity.has(rarity)) byRarity.set(rarity, [])
    byRarity.get(rarity).push(time)
  }

  const entries = []
  for (const [rarity, groupTimes] of byRarity) {
    const finalRarity = isHorde ? 'Horde' : rarity
    entries.push({
      method,
      minLevel: encounter.min_level,
      maxLevel: encounter.max_level,
      rarity: finalRarity,
      time: buildTimeString(groupTimes, seasonCode),
    })
  }

  return entries
}

function getEncounterBuckets(monstersData) {
  const buckets = new Map()
  const allByRegion = new Map()

  for (const pokemon of monstersData) {
    const types = [...new Set((pokemon.types || []).map((t) => t.toLowerCase()))]
    const name = pokemon.name

    for (const encounter of pokemon.locations || []) {
      const rawRegion = encounter.region_name
      if (!rawRegion) continue

      // Strip brackets: "[ Kanto ]" → "Kanto"
      const regionName = rawRegion.replace(/^\[\s*|\s*\]$/g, '').trim()
      const locationName = encounter.location_name
      const normalized = normalizeLocation(locationName)
      if (!normalized) continue

      const entries = buildEncounterEntries(encounter)
      if (entries.length === 0) continue

      const allRarities = [...new Set(entries.map((e) => e.rarity))]
      const allMethods = [...new Set(entries.map((e) => e.method))]

      const spawn = {
        id: pokemon.id,
        name,
        types,
        rarities: allRarities,
        methods: allMethods,
        encounters: entries,
      }

      const regionKey = regionName.toLowerCase()
      const bucketKey = `${regionKey}::${normalized}`
      if (!buckets.has(bucketKey)) buckets.set(bucketKey, new Map())
      mergeSpawn(buckets.get(bucketKey), spawn)

      if (!allByRegion.has(regionKey)) allByRegion.set(regionKey, new Map())
      if (!allByRegion.get(regionKey).has(normalized)) {
        allByRegion.get(regionKey).set(normalized, {
          name: locationName,
          sourceLocation: locationName,
          normalizedLocation: normalized,
          spawns: new Map(),
        })
      }
      mergeSpawn(allByRegion.get(regionKey).get(normalized).spawns, spawn)
    }
  }

  return { buckets, allByRegion }
}

function mergeSpawn(spawnMap, spawn) {
  const key = `${spawn.id ?? 'unknown'}::${spawn.name}`
  if (!spawnMap.has(key)) {
    spawnMap.set(key, { ...spawn, encounters: [...spawn.encounters] })
    return
  }

  const existing = spawnMap.get(key)
  for (const encounter of spawn.encounters) {
    const encounterKey = JSON.stringify(encounter)
    if (!existing.encounters.some((current) => JSON.stringify(current) === encounterKey)) {
      existing.encounters.push(encounter)
    }
  }
  for (const rarity of spawn.rarities || []) {
    if (!existing.rarities.includes(rarity)) existing.rarities.push(rarity)
  }
  for (const method of spawn.methods || []) {
    if (!existing.methods.includes(method)) existing.methods.push(method)
  }
}

function sortSpawns(spawnMap) {
  return Array.from(spawnMap.values()).sort((a, b) => a.name.localeCompare(b.name))
}

function enrichRegion(region, encounterBuckets) {
  const regionKey = region.name.toLowerCase()
  const matchedLocations = new Set()

  const maps = region.maps.map((mapEntry) => ({
    ...mapEntry,
    areas: (mapEntry.areas || []).map((area) => {
      const candidates = [
        area.name,
        ...(area.encounterAliases || []),
        area.name?.replace(/\bEntrance\b/gi, ''),
        area.name?.replace(/\b[0-9]+F\b/gi, ''),
        area.name?.replace(/\bB[0-9]+F\b/gi, ''),
      ]

      let spawnMap = null
      let matchedLocation = null
      for (const candidate of candidates) {
        const normalized = normalizeLocation(candidate)
        const key = `${regionKey}::${normalized}`
        if (encounterBuckets.buckets.has(key)) {
          spawnMap = encounterBuckets.buckets.get(key)
          matchedLocation = normalized
          break
        }
      }

      if (!spawnMap) {
        return {
          ...area,
          spawns: [],
          encounterMatch: {
            status: 'unmatched',
            searchedNames: candidates.filter(Boolean),
          },
        }
      }

      matchedLocations.add(matchedLocation)
      return {
        ...area,
        spawns: sortSpawns(spawnMap),
        encounterMatch: {
          status: 'matched',
          normalizedLocation: matchedLocation,
        },
      }
    }),
  }))

  const regionLocations = encounterBuckets.allByRegion.get(regionKey) || new Map()
  const unmatchedEncounterLocations = Array.from(regionLocations.values())
    .filter((location) => !matchedLocations.has(location.normalizedLocation))
    .map((location) => ({
      name: location.name,
      sourceLocation: location.sourceLocation,
      normalizedLocation: location.normalizedLocation,
      spawns: sortSpawns(location.spawns),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return {
    ...region,
    maps,
    unmatchedEncounterLocations,
  }
}

function readSourceConfig() {
  const splitRegions = regionIds
    .map((regionId) => path.join(outputDir, `${regionId}.json`))
    .filter((regionPath) => fs.existsSync(regionPath))

  if (splitRegions.length === regionIds.length) {
    return {
      regions: regionIds.map((regionId) =>
        JSON.parse(fs.readFileSync(path.join(outputDir, `${regionId}.json`), 'utf8'))
      ),
    }
  }

  return JSON.parse(fs.readFileSync(sourceConfigPath, 'utf8'))
}

const sourceConfig = readSourceConfig()
const monstersData = JSON.parse(fs.readFileSync(monstersDataPath, 'utf8'))
const encounterBuckets = getEncounterBuckets(monstersData)

fs.mkdirSync(outputDir, { recursive: true })

for (const regionId of regionIds) {
  const sourceRegion = sourceConfig.regions.find((region) => region.id === regionId)
  if (!sourceRegion) {
    throw new Error(`Missing ${regionId} in ${sourceConfigPath}`)
  }

  const normalized = normalizeRegion(sourceRegion)
  const enriched = enrichRegion(normalized, encounterBuckets)
  const outputPath = path.join(outputDir, `${regionId}.json`)
  fs.writeFileSync(outputPath, `${JSON.stringify(enriched, null, 2)}\n`)
  console.log(`${regionNameById[regionId]}: wrote ${path.relative(rootDir, outputPath)}`)
}
