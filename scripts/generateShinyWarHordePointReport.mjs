import fs from 'fs'
import path from 'path'
import puppeteer from 'puppeteer'

const rootDir = process.cwd()

const POKEMON_DATA_FILE = 'src/data/pokemmo_data/pokemon-data.json'
const ENCOUNTER_PERCENTS_FILE = 'src/data/encounter_percents.json'
const REGION_FILES = [
  'src/data/region_maps/kanto.json',
  'src/data/region_maps/johto.json',
  'src/data/region_maps/hoenn.json',
  'src/data/region_maps/sinnoh.json',
  'src/data/region_maps/unova.json',
]
const REPORT_DIR = 'public/reports'
const MARKDOWN_REPORT_FILE = 'public/reports/shiny-war-horde-point-return.md'
const CSV_REPORT_FILE = 'public/reports/shiny-war-horde-point-return.csv'
const HTML_REPORT_FILE = 'public/reports/shiny-war-horde-point-return.html'
const PDF_REPORT_FILE = 'public/reports/shiny-war-horde-point-return.pdf'
const FISHING_REPORT_FILE = 'public/reports/shiny-war-fishing-point-return.pdf'
const FISHING_HTML_REPORT_FILE = 'public/reports/shiny-war-fishing-point-return.html'
const SINGLE_REPORT_FILE = 'public/reports/shiny-war-single-encounter-point-return.pdf'
const SINGLE_HTML_REPORT_FILE = 'public/reports/shiny-war-single-encounter-point-return.html'
const MAX_AUTO_REVIEW_ROUTES = 4
const FEATURED_HORDE_COUNT = 12
const MIN_PRIMARY_TARGET_POINTS = 3
const FISHING_METHODS = new Set(['old rod', 'good rod', 'super rod', 'fishing'])
const SINGLE_METHODS = new Set(['grass', 'water', 'cave', 'dark grass', 'inside', 'shadow', 'dust cloud'])
const RARITY_WEIGHTS = {
  'very common': 0.36,
  common: 0.24,
  uncommon: 0.15,
  rare: 0.06,
  'very rare': 0.025,
  lure: 0.04,
  special: 0.015,
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), 'utf8'))
}

function normalizeSearch(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019']/g, '')
    .replace(/\./g, '')
    .replace(/[é]/g, 'e')
    .replace(/['"]/g, '')
    .replace(/\s+/g, ' ')
}

function normalizePokemonKey(value) {
  return normalizeSearch(value)
    .replace(/[♀]/g, 'f')
    .replace(/[♂]/g, 'm')
    .replace(/\s+/g, '-')
    .replace(/^-|-$/g, '')
}

function normalizeLocationKey(value) {
  return normalizeSearch(value)
    .replace(/\bpokemon\b/g, 'pokemon')
    .replace(/\s+/g, ' ')
}

function titleCase(value) {
  return String(value || '')
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((part) => (/^\s+$|-$/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('')
    .replace(/\bMt\b/g, 'Mt.')
    .replace(/\bPokemon\b/g, 'Pokemon')
}

function formatPokemonName(value) {
  const key = normalizePokemonKey(value)
  const specialNames = {
    farfetchd: "Farfetch'd",
    'mr-mime': 'Mr. Mime',
    'mime-jr': 'Mime Jr.',
    'nidoran-f': 'Nidoran F',
    'nidoran-m': 'Nidoran M',
    'basculin-blue-striped': 'Basculin (Blue)',
    'basculin-red-striped': 'Basculin (Red)',
    'gastrodon-east': 'Gastrodon (East)',
    'gastrodon-west': 'Gastrodon (West)',
    'frillish-f': 'Frillish F',
    'jellicent-f': 'Jellicent F',
    'unfezant-f': 'Unfezant F',
    'porygon-z': 'Porygon-Z',
  }

  return specialNames[key] || key.split('-').map(part => (
    part.charAt(0).toUpperCase() + part.slice(1)
  )).join(' ')
}

function parseTimeTokens(value) {
  if (!value || value === 'ALL') return []
  return String(value)
    .split('/')
    .map(token => token.trim())
    .filter(Boolean)
}

function isTimeCompatible(encounterTime, scenarioTime) {
  if (!encounterTime || encounterTime === 'ALL') return true
  if (!scenarioTime || scenarioTime === 'ALL') return encounterTime === 'ALL'

  const encounterTokens = parseTimeTokens(encounterTime)
  const scenarioTokens = new Set(parseTimeTokens(scenarioTime))
  return encounterTokens.every(token => scenarioTokens.has(token))
}

function getScenarioTimes(entries) {
  const times = [...new Set(entries.map(entry => entry.time || 'ALL').filter(time => time !== 'ALL'))]
  return times.length > 0 ? times : ['ALL']
}

function getMethodCategory(method) {
  return normalizeSearch(method) === 'water' ? 'surfing-horde' : 'horde'
}

function getMethodLabel(method) {
  return normalizeSearch(method) === 'water' ? 'Water Horde' : 'Land Horde'
}

function getScenarioKey({ region, routeName, method, time }) {
  return [
    normalizeSearch(region),
    normalizeLocationKey(routeName),
    normalizeSearch(method),
    normalizeSearch(time || 'ALL'),
  ].join('|')
}

function getRouteMatchKeys(region, routeName) {
  return [
    `${normalizeSearch(region)}|${normalizeLocationKey(routeName)}`,
    `${normalizeSearch(region)}|${normalizeLocationKey(routeName).replace(/^route 0+/, 'route ')}`,
  ]
}

function addScenario(scenarios, scenario) {
  const key = getScenarioKey(scenario)
  const existing = scenarios.get(key) || {
    ...scenario,
    pokemon: new Map(),
    sources: new Set(),
  }

  existing.routeName = existing.routeName || scenario.routeName
  existing.displayRoute = existing.displayRoute || scenario.displayRoute || titleCase(scenario.routeName)
  existing.mapNames = [...new Set([...(existing.mapNames || []), ...(scenario.mapNames || [])].filter(Boolean))]
  existing.sources.add(scenario.source)

  scenario.pokemon.forEach((entry) => {
    const pokemonKey = normalizePokemonKey(entry.name)
    const current = existing.pokemon.get(pokemonKey)
    existing.pokemon.set(pokemonKey, {
      ...current,
      ...entry,
      name: current?.name || entry.name,
      minLevel: Math.min(current?.minLevel ?? entry.minLevel, entry.minLevel),
      maxLevel: Math.max(current?.maxLevel ?? entry.maxLevel, entry.maxLevel),
    })
  })

  scenarios.set(key, existing)
}

function collectRegionMapScenarios(regionData, scenarios) {
  ;(regionData.maps || []).forEach((map) => {
    ;(map.areas || []).forEach((area) => {
      const routeName = area.sourceLocation || area.encounterMatch?.normalizedLocation || area.name
      if (!routeName || !Array.isArray(area.spawns)) return

      const hordeEntries = []
      area.spawns.forEach((spawn) => {
        ;(spawn.encounters || [])
          .filter(encounter => normalizeSearch(encounter.rarity) === 'horde')
          .forEach(encounter => hordeEntries.push({
            name: spawn.name,
            method: encounter.method,
            time: encounter.time || 'ALL',
            minLevel: Number(encounter.minLevel) || 0,
            maxLevel: Number(encounter.maxLevel) || 0,
          }))
      })

      const entriesByMethod = new Map()
      hordeEntries.forEach((entry) => {
        const method = entry.method || 'Unknown'
        entriesByMethod.set(method, [...(entriesByMethod.get(method) || []), entry])
      })

      entriesByMethod.forEach((entries, method) => {
        getScenarioTimes(entries).forEach((time) => {
          addScenario(scenarios, {
            region: regionData.name,
            routeName,
            displayRoute: area.name || titleCase(routeName),
            method,
            methodCategory: getMethodCategory(method),
            methodLabel: getMethodLabel(method),
            time,
            pokemon: entries.filter(entry => isTimeCompatible(entry.time, time)),
            mapNames: [map.name],
            source: 'region_maps',
          })
        })
      })
    })
  })
}

function collectPokemonDataScenarios(pokemonData, scenarios) {
  const rows = []

  Object.entries(pokemonData).forEach(([pokemonKey, pokemon]) => {
    ;(pokemon.location_area_encounters || [])
      .filter(encounter => normalizeSearch(encounter.rarity) === 'horde')
      .forEach(encounter => rows.push({
        name: pokemon.name || pokemonKey,
        region: encounter.region_name,
        routeName: encounter.location,
        method: encounter.type,
        time: encounter.time || 'ALL',
        minLevel: Number(encounter.min_level) || 0,
        maxLevel: Number(encounter.max_level) || 0,
      }))
  })

  const groupedRows = new Map()
  rows.forEach((row) => {
    const key = [
      normalizeSearch(row.region),
      normalizeLocationKey(row.routeName),
      normalizeSearch(row.method),
    ].join('|')
    groupedRows.set(key, [...(groupedRows.get(key) || []), row])
  })

  groupedRows.forEach((entries) => {
    getScenarioTimes(entries).forEach((time) => {
      const first = entries[0]
      addScenario(scenarios, {
        region: first.region,
        routeName: first.routeName,
        displayRoute: titleCase(first.routeName),
        method: first.method,
        methodCategory: getMethodCategory(first.method),
        methodLabel: getMethodLabel(first.method),
        time,
        pokemon: entries.filter(entry => isTimeCompatible(entry.time, time)),
        mapNames: [],
        source: 'pokemon-data',
      })
    })
  })
}

function getVariationEntries(routeData) {
  if (Array.isArray(routeData)) return routeData
  if (Array.isArray(routeData?.variations)) return routeData.variations
  if (routeData?.variations && typeof routeData.variations === 'object') {
    return Object.entries(routeData.variations).map(([variation, data]) => ({
      ...data,
      variation: data?.variation || variation,
    }))
  }
  return [routeData]
}

function getEncounterCategory(variationData) {
  const explicit = normalizeSearch(variationData?.encounterCategory)
  if (explicit === 'horde' || explicit === 'surfing-horde') return explicit

  const variation = normalizeSearch(variationData?.variation)
  if (!variation.includes('horde')) return ''
  return variation.includes('water') || variation.includes('surf') ? 'surfing-horde' : 'horde'
}

function routeFinderTimeMatches(variation, scenarioTime) {
  if (!scenarioTime || scenarioTime === 'ALL') return true

  const variationText = normalizeSearch(variation)
  const hasTimeQualifier = ['day', 'night', 'morning', 'season'].some(token => variationText.includes(token))
  if (!hasTimeQualifier) return true

  return parseTimeTokens(scenarioTime).some(token => variationText.includes(normalizeSearch(token)))
}

function routeFinderCategoryMatches(sampleCategory, scenarioCategory) {
  if (sampleCategory === scenarioCategory) return true
  return sampleCategory === 'horde' && (scenarioCategory === 'horde' || scenarioCategory === 'surfing-horde')
}

function buildRouteFinderSamples(encounterPercents) {
  const samplesByRoute = new Map()

  Object.entries(encounterPercents || {}).forEach(([region, routes]) => {
    Object.entries(routes || {}).forEach(([routeName, routeData]) => {
      getVariationEntries(routeData).forEach((variationData) => {
        const category = getEncounterCategory(variationData)
        if (!category) return

        const displayRoute = variationData.route || routeName
        const sample = {
          region,
          routeName: displayRoute,
          category,
          variation: variationData.variation || '',
          total: Number(variationData.total) || 0,
          pokemon: (variationData.data || []).map(entry => ({
            name: entry.pokemon,
            encounters: Number(entry.encounters) || 0,
          })),
        }

        getRouteMatchKeys(region, displayRoute).forEach((key) => {
          samplesByRoute.set(key, [...(samplesByRoute.get(key) || []), sample])
        })
      })
    })
  })

  return samplesByRoute
}

function findRouteFinderSample(scenario, samplesByRoute) {
  const routeSamples = getRouteMatchKeys(scenario.region, scenario.routeName)
    .flatMap(key => samplesByRoute.get(key) || [])

  const scenarioPokemon = new Set([...scenario.pokemon.keys()])
  const compatible = routeSamples
    .filter(sample => routeFinderCategoryMatches(sample.category, scenario.methodCategory))
    .filter(sample => routeFinderTimeMatches(sample.variation, scenario.time))
    .map(sample => ({
      ...sample,
      matchingPokemon: sample.pokemon.filter(entry => scenarioPokemon.has(normalizePokemonKey(entry.name))).length,
    }))
    .filter(sample => sample.matchingPokemon > 0)

  if (compatible.length === 0) return null

  return compatible.sort((left, right) => {
    if (left.matchingPokemon !== right.matchingPokemon) return right.matchingPokemon - left.matchingPokemon
    return right.total - left.total
  })[0]
}

function getPokemonInfo(pokemonData, name) {
  const key = normalizePokemonKey(name)
  const data = pokemonData[key] || {}

  return {
    key,
    name: formatPokemonName(name),
    points: Number(data.shiny_points) || 0,
    tier: Number.isInteger(data.shiny_tier) ? data.shiny_tier : null,
  }
}

function scoreScenario(scenario, pokemonData, samplesByRoute) {
  const sample = findRouteFinderSample(scenario, samplesByRoute)
  const samplePokemon = sample?.pokemon?.length ? sample.pokemon : null
  const pokemonEntries = samplePokemon
    ? samplePokemon.map(entry => ({ ...getPokemonInfo(pokemonData, entry.name), encounters: entry.encounters }))
    : [...scenario.pokemon.values()].map(entry => ({ ...getPokemonInfo(pokemonData, entry.name), encounters: 1 }))

  const totalWeight = pokemonEntries.reduce((total, entry) => total + entry.encounters, 0)
  const pointReturnAverage = totalWeight
    ? pokemonEntries.reduce((total, entry) => total + (entry.points * entry.encounters), 0) / totalWeight
    : 0

  return {
    ...scenario,
    pokemonEntries,
    splitSource: samplePokemon ? 'weighted Route Finder sample' : 'unweighted spawn split',
    routeFinderTotal: sample?.total || 0,
    routeFinderVariation: sample?.variation || '',
    pointReturnAverage,
  }
}

function getCompositionKey(scoredScenario) {
  const pokemon = scoredScenario.pokemonEntries
    .map(entry => normalizePokemonKey(entry.name))
    .sort()
    .join('+')

  return [
    scoredScenario.methodCategory,
    normalizeSearch(scoredScenario.time || 'ALL'),
    pokemon,
  ].join('|')
}

function groupScenarios(scoredScenarios) {
  const groups = new Map()

  scoredScenarios.forEach((scenario) => {
    if (scenario.pokemonEntries.length === 0) return

    const key = getCompositionKey(scenario)
    const group = groups.get(key) || {
      methodLabel: scenario.methodLabel,
      methodCategory: scenario.methodCategory,
      time: scenario.time,
      pokemonEntries: scenario.pokemonEntries,
      scenarios: [],
    }

    group.scenarios.push(scenario)
    group.pointReturnAverage = group.scenarios.reduce((total, item) => total + item.pointReturnAverage, 0) / group.scenarios.length
    group.hasWeightedSample = group.scenarios.some(item => item.splitSource === 'weighted Route Finder sample')
    groups.set(key, group)
  })

  return [...groups.values()].map(group => {
    const locations = group.scenarios.map(scenario => ({
      region: scenario.region,
      route: scenario.displayRoute || titleCase(scenario.routeName),
      variation: scenario.routeFinderVariation,
      ptra: scenario.pointReturnAverage,
      source: scenario.splitSource,
    }))

    return {
      ...group,
      locations,
      routeCount: locations.length,
      needsManualReview: locations.length > MAX_AUTO_REVIEW_ROUTES,
    }
  })
}

function getPrimaryTargetKeys(group) {
  return group.pokemonEntries
    .filter(entry => entry.points >= MIN_PRIMARY_TARGET_POINTS)
    .map(entry => entry.key)
    .sort()
}

function isSubset(leftValues, rightValues) {
  if (leftValues.length === 0) return false

  const rightSet = new Set(rightValues)
  return leftValues.every(value => rightSet.has(value))
}

function isGroupCoveredByBetterRoute(group, betterGroup) {
  if (group.needsManualReview || betterGroup.needsManualReview) return false
  if (group.methodCategory !== betterGroup.methodCategory) return false
  if (betterGroup.pointReturnAverage < group.pointReturnAverage) return false

  const primaryTargets = getPrimaryTargetKeys(group)
  const betterPrimaryTargets = getPrimaryTargetKeys(betterGroup)

  if (!isSubset(primaryTargets, betterPrimaryTargets)) return false

  const hasStrictlyBetterScore = betterGroup.pointReturnAverage > group.pointReturnAverage
  const hasExtraPrimaryTarget = betterPrimaryTargets.length > primaryTargets.length
  const hasBetterWeighting = betterGroup.hasWeightedSample && !group.hasWeightedSample

  return hasStrictlyBetterScore || hasExtraPrimaryTarget || hasBetterWeighting
}

function removeCoveredGroups(groups) {
  const keptGroups = []

  groups.forEach((group) => {
    const coveredByBetterRoute = keptGroups.some(betterGroup => (
      isGroupCoveredByBetterRoute(group, betterGroup)
    ))

    if (!coveredByBetterRoute) {
      keptGroups.push(group)
    }
  })

  return keptGroups
}

function getRarityWeight(rarity) {
  return RARITY_WEIGHTS[normalizeSearch(rarity)] || 0
}

function isFishingEntry(entry) {
  const method = normalizeSearch(entry.method)
  const rarity = normalizeSearch(entry.rarity)

  if (rarity === 'horde') return false
  return FISHING_METHODS.has(method) || (method === 'water' && rarity === 'lure')
}

function isSingleEntry(entry) {
  const method = normalizeSearch(entry.method)
  const rarity = normalizeSearch(entry.rarity)

  if (rarity === 'horde') return false
  if (FISHING_METHODS.has(method)) return false
  return SINGLE_METHODS.has(method) && (rarity === 'lure' || getRarityWeight(rarity) > 0)
}

function getRouteReportKey({ region, routeName, methodCategory, time }) {
  return [
    normalizeSearch(region),
    normalizeLocationKey(routeName),
    methodCategory,
    normalizeSearch(time || 'ALL'),
  ].join('|')
}

function addRouteReportEntry(routes, route) {
  const key = getRouteReportKey(route)
  const existing = routes.get(key) || {
    ...route,
    pokemon: new Map(),
  }

  route.pokemon.forEach((entry) => {
    const pokemon = existing.pokemon.get(entry.key)
    const nextWeight = entry.weight || getRarityWeight(entry.rarity)
    const currentWeight = pokemon?.weight || 0

    existing.pokemon.set(entry.key, {
      ...pokemon,
      ...entry,
      weight: Math.max(currentWeight, nextWeight),
      rarities: [...new Set([...(pokemon?.rarities || []), entry.rarity].filter(Boolean))],
      methods: [...new Set([...(pokemon?.methods || []), entry.method].filter(Boolean))],
    })
  })

  routes.set(key, existing)
}

function collectRouteReportEntries(regionFiles, pokemonData, mode) {
  const routes = new Map()
  const includeEntry = mode === 'fishing' ? isFishingEntry : isSingleEntry

  regionFiles.forEach((relativeFile) => {
    const regionData = readJson(relativeFile)

    ;(regionData.maps || []).forEach((map) => {
      ;(map.areas || []).forEach((area) => {
        const routeName = area.sourceLocation || area.encounterMatch?.normalizedLocation || area.name
        if (!routeName || !Array.isArray(area.spawns)) return

        const rows = []
        area.spawns.forEach((spawn) => {
          ;(spawn.encounters || []).forEach((encounter) => {
            const row = {
              name: spawn.name,
              method: encounter.method,
              rarity: encounter.rarity,
              time: encounter.time || 'ALL',
              minLevel: Number(encounter.minLevel) || 0,
              maxLevel: Number(encounter.maxLevel) || 0,
            }

            if (!includeEntry(row)) return

            const pokemon = getPokemonInfo(pokemonData, spawn.name)
            rows.push({
              ...pokemon,
              ...row,
              weight: getRarityWeight(encounter.rarity),
            })
          })
        })

        if (rows.length === 0) return

        getScenarioTimes(rows).forEach((time) => {
          addRouteReportEntry(routes, {
            region: regionData.name,
            routeName,
            displayRoute: area.name || titleCase(routeName),
            methodCategory: mode,
            methodLabel: mode === 'fishing' ? 'Fishing' : 'Single Encounter',
            time,
            pokemon: rows.filter(entry => isTimeCompatible(entry.time, time)),
            source: 'region_maps',
          })
        })
      })
    })
  })

  return [...routes.values()]
}

function getSampleCategoryForMode(variationData) {
  const explicit = normalizeSearch(variationData?.encounterCategory)
  if (explicit === 'fish') return 'fishing'
  if (explicit === 'single') return 'single'

  const variation = normalizeSearch(variationData?.variation)
  if (variation.includes('fishing') || variation.includes('rod')) return 'fishing'
  if (variation.includes('lure') || variation.includes('no lure')) return 'single'
  return ''
}

function buildModeRouteFinderSamples(encounterPercents, mode) {
  const samplesByRoute = new Map()

  Object.entries(encounterPercents || {}).forEach(([region, routes]) => {
    Object.entries(routes || {}).forEach(([routeName, routeData]) => {
      getVariationEntries(routeData).forEach((variationData) => {
        if (getSampleCategoryForMode(variationData) !== mode) return

        const displayRoute = variationData.route || routeName
        const sample = {
          region,
          routeName: displayRoute,
          variation: variationData.variation || '',
          total: Number(variationData.total) || 0,
          pokemon: (variationData.data || []).map(entry => ({
            name: entry.pokemon,
            encounters: Number(entry.encounters) || 0,
          })),
        }

        getRouteMatchKeys(region, displayRoute).forEach((key) => {
          samplesByRoute.set(key, [...(samplesByRoute.get(key) || []), sample])
        })
      })
    })
  })

  return samplesByRoute
}

function findRouteReportSample(route, samplesByRoute) {
  const routeSamples = getRouteMatchKeys(route.region, route.routeName)
    .flatMap(key => samplesByRoute.get(key) || [])

  const routePokemon = new Set([...route.pokemon.keys()])
  const compatible = routeSamples
    .filter(sample => routeFinderTimeMatches(sample.variation, route.time))
    .map(sample => ({
      ...sample,
      matchingPokemon: sample.pokemon.filter(entry => routePokemon.has(normalizePokemonKey(entry.name))).length,
    }))
    .filter(sample => sample.matchingPokemon > 0)

  if (compatible.length === 0) return null

  return compatible.sort((left, right) => {
    if (left.matchingPokemon !== right.matchingPokemon) return right.matchingPokemon - left.matchingPokemon
    return right.total - left.total
  })[0]
}

function scoreRouteReport(route, pokemonData, samplesByRoute) {
  const sample = findRouteReportSample(route, samplesByRoute)
  const entries = sample?.pokemon?.length
    ? sample.pokemon.map(entry => ({
      ...getPokemonInfo(pokemonData, entry.name),
      weight: Number(entry.encounters) || 0,
      encounters: Number(entry.encounters) || 0,
      rarities: [],
      methods: [],
    }))
    : [...route.pokemon.values()]

  const totalWeight = entries.reduce((total, entry) => total + (entry.weight || 0), 0)
  const pointReturnAverage = totalWeight
    ? entries.reduce((total, entry) => total + (entry.points * (entry.weight || 0)), 0) / totalWeight
    : 0
  const adjustedScore = sample?.pokemon?.length
    ? pointReturnAverage
    : entries.reduce((total, entry) => total + (entry.points * (entry.weight || 0)), 0)

  return {
    methodLabel: route.methodLabel,
    methodCategory: route.methodCategory,
    time: route.time,
    pokemonEntries: entries,
    locations: [{
      region: route.region,
      route: route.displayRoute || titleCase(route.routeName),
      variation: sample?.variation || '',
      ptra: adjustedScore,
      source: sample?.pokemon?.length ? 'weighted Route Finder sample' : 'rarity adjusted',
    }],
    routeCount: 1,
    pointReturnAverage: adjustedScore,
    hasWeightedSample: Boolean(sample?.pokemon?.length),
    needsManualReview: false,
    routeFinderTotal: sample?.total || 0,
  }
}

function buildRouteReportGroups(mode, pokemonData, encounterPercents) {
  const routeEntries = collectRouteReportEntries(REGION_FILES, pokemonData, mode)
  const samplesByRoute = buildModeRouteFinderSamples(encounterPercents, mode)

  return routeEntries
    .map(route => scoreRouteReport(route, pokemonData, samplesByRoute))
    .sort(compareGroups)
}

function formatNumber(value) {
  return Number(value).toFixed(2)
}

function formatSplit(group) {
  const entries = group.pokemonEntries.slice().sort((left, right) => right.points - left.points || left.name.localeCompare(right.name))
  const totalEncounters = entries.reduce((total, entry) => total + entry.encounters, 0)

  return entries.map((entry) => {
    const percent = totalEncounters ? ` ${(entry.encounters / totalEncounters * 100).toFixed(1)}%` : ''
    const tier = entry.tier === null ? '?' : entry.tier
    const rarityMeta = !group.hasWeightedSample && entry.rarities?.length
      ? `, ${entry.rarities.join('/')}`
      : ''
    return `${entry.name} (${entry.points} pts, T${tier}${group.hasWeightedSample ? `,${percent}` : rarityMeta})`
  }).join('; ')
}

function formatLocations(group) {
  if (group.needsManualReview) {
    return `${group.routeCount} routes - manual review`
  }

  return group.locations
    .sort((left, right) => `${left.region} ${left.route}`.localeCompare(`${right.region} ${right.route}`))
    .map(location => `${location.region} ${location.route}`)
    .join('; ')
}

function csvEscape(value) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatDisplayDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date)
}

function getPokemonChipsHtml(group) {
  const entries = group.pokemonEntries.slice().sort((left, right) => right.points - left.points || left.name.localeCompare(right.name))
  const totalEncounters = entries.reduce((total, entry) => total + entry.encounters, 0)

  return entries.map((entry) => {
    const tier = entry.tier === null ? '?' : entry.tier
    const percent = totalEncounters && group.hasWeightedSample
      ? `<span class="chipPercent">${(entry.encounters / totalEncounters * 100).toFixed(1)}%</span>`
      : ''
    const rarity = !group.hasWeightedSample && entry.rarities?.length
      ? `<span>${escapeHtml(entry.rarities.join('/'))}</span>`
      : ''
    const method = !group.hasWeightedSample && entry.methods?.length
      ? `<span>${escapeHtml(entry.methods.join('/'))}</span>`
      : ''

    return `
      <span class="pokemonChip tier${tier}">
        <strong>${escapeHtml(entry.name)}</strong>
        <span>${entry.points} pts</span>
        <span>T${tier}</span>
        ${rarity}
        ${method}
        ${percent}
      </span>
    `
  }).join('')
}

function getGroupLocationsHtml(group) {
  if (group.needsManualReview) {
    return `<span class="manualBadge">${group.routeCount} routes - manual review</span>`
  }

  return group.locations
    .sort((left, right) => `${left.region} ${left.route}`.localeCompare(`${right.region} ${right.route}`))
    .map(location => `<span>${escapeHtml(location.region)} ${escapeHtml(location.route)}</span>`)
    .join('')
}

function getWeightLabel(group) {
  return group.hasWeightedSample ? 'Weighted sample' : ''
}

function getScoreClass(group) {
  if (group.pointReturnAverage >= 6) return 'score scoreHigh'
  if (group.pointReturnAverage >= 4) return 'score scoreMedium'
  return 'score'
}

function buildMarkdown(groups) {
  const generatedAt = new Date().toISOString()
  const autoGroups = groups.filter(group => !group.needsManualReview)
  const manualGroups = groups.filter(group => group.needsManualReview)
  const rows = groups.map((group, index) => (
    `| ${index + 1} | ${formatNumber(group.pointReturnAverage)} | ${group.methodLabel} | ${group.time || 'ALL'} | ${formatSplit(group)} | ${group.routeCount} | ${formatLocations(group)} | ${group.hasWeightedSample ? 'weighted' : ''} |`
  ))

  return [
    '# Shiny War Horde Point Return Report',
    '',
    `Generated: ${generatedAt}`,
    '',
    `Point Return Average is the expected shiny point value for a horde slot. Route Finder encounter samples are shown as weighted splits when available.`,
    '',
    `Routes with more than ${MAX_AUTO_REVIEW_ROUTES} matching locations are pushed to the bottom for manual review.`,
    '',
    `Auto-ranked hordes: ${autoGroups.length}`,
    `Manual-review hordes: ${manualGroups.length}`,
    '',
    '| Rank | Point Return Average | Method | Time | Split | Routes | Locations | Weighting |',
    '| ---: | ---: | --- | --- | --- | ---: | --- | --- |',
    ...rows,
    '',
  ].join('\n')
}

function buildHtml(groups, options = {}) {
  const {
    title = 'Shiny War Horde Point Return Report',
    subtitle = 'A ranked horde-only planner report sorted by expected shiny point value per horde slot. Route Finder samples are shown when available, and weaker duplicate target routes are removed when a better horde covers the same valuable Pokemon.',
    bestTitle = 'Best Returns',
    bestDescription = 'These are the highest Point Return Average rows after broad multi-route groups are moved to manual review.',
    tableTitle = 'Full Ranked List',
    tableDescription = 'Point Return Average is shown first so the strongest hunts scan quickly. Weighted rows include encounter percentages beside each Pokemon.',
    scoreLabel = 'PRA',
    totalLabel = 'Total groups',
    autoLabel = 'Auto-ranked',
    includeManualSection = true,
  } = options
  const generatedAt = formatDisplayDate()
  const autoGroups = groups.filter(group => !group.needsManualReview)
  const manualGroups = groups.filter(group => group.needsManualReview)
  const weightedGroups = groups.filter(group => group.hasWeightedSample)
  const featuredGroups = autoGroups.slice(0, FEATURED_HORDE_COUNT)

  const featuredCards = featuredGroups.map((group, index) => `
    <article class="featureCard">
      <div class="cardTopline">
        <span class="rank">#${index + 1}</span>
        <span class="${getScoreClass(group)}">${formatNumber(group.pointReturnAverage)}</span>
      </div>
      <h2>${escapeHtml(group.methodLabel)} <span>${escapeHtml(group.time || 'ALL')}</span></h2>
      <div class="chipRow">${getPokemonChipsHtml(group)}</div>
      <div class="locationList">${getGroupLocationsHtml(group)}</div>
      ${group.hasWeightedSample ? `<p>${escapeHtml(getWeightLabel(group))}</p>` : ''}
    </article>
  `).join('')

  const rankedRows = autoGroups.map((group, index) => `
    <tr>
      <td class="rankCell">${index + 1}</td>
      <td><span class="${getScoreClass(group)}">${formatNumber(group.pointReturnAverage)}</span></td>
      <td>
        <strong>${escapeHtml(group.methodLabel)}</strong>
        <span class="muted">${escapeHtml(group.time || 'ALL')}</span>
      </td>
      <td><div class="chipRow compact">${getPokemonChipsHtml(group)}</div></td>
      <td><div class="locationList compact">${getGroupLocationsHtml(group)}</div></td>
      <td>${group.hasWeightedSample ? `<span class="weightBadge weighted">${escapeHtml(getWeightLabel(group))}</span>` : ''}</td>
    </tr>
  `).join('')

  const manualRows = manualGroups.map((group, index) => `
    <tr>
      <td class="rankCell">${autoGroups.length + index + 1}</td>
      <td><span class="${getScoreClass(group)}">${formatNumber(group.pointReturnAverage)}</span></td>
      <td>
        <strong>${escapeHtml(group.methodLabel)}</strong>
        <span class="muted">${escapeHtml(group.time || 'ALL')}</span>
      </td>
      <td><div class="chipRow compact">${getPokemonChipsHtml(group)}</div></td>
      <td>${group.routeCount}</td>
      <td><span class="manualBadge">Manual review</span></td>
    </tr>
  `).join('')

  const manualSection = includeManualSection && manualGroups.length > 0 ? `
    <section class="section">
      <div class="sectionHeader">
        <h2>Manual Review</h2>
        <p>Groups with more than ${MAX_AUTO_REVIEW_ROUTES} routes are intentionally placed at the bottom because location-level context matters.</p>
      </div>
      <table class="manualTable">
        <thead>
          <tr>
            <th>Rank</th>
            <th>${escapeHtml(scoreLabel)}</th>
            <th>Method</th>
            <th>Split</th>
            <th>Routes</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${manualRows}</tbody>
      </table>
    </section>
  ` : ''

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 12mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      color: #18212f;
      background: #f4f6f8;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 10px;
      line-height: 1.4;
    }

    .page {
      padding: 24px;
    }

    .hero {
      min-height: 285px;
      padding: 30px;
      border-radius: 10px;
      color: #ffffff;
      background:
        linear-gradient(135deg, rgba(16, 30, 44, 0.95), rgba(31, 68, 73, 0.88)),
        radial-gradient(circle at 82% 18%, rgba(255, 208, 88, 0.45), transparent 34%),
        linear-gradient(90deg, #0c1824, #1c5b62);
      display: grid;
      grid-template-columns: 1.25fr 1fr;
      gap: 24px;
      align-items: end;
    }

    h1, h2, h3, p {
      margin: 0;
    }

    h1 {
      max-width: 780px;
      font-size: 42px;
      line-height: 0.98;
      letter-spacing: 0;
    }

    .subtitle {
      max-width: 720px;
      margin-top: 16px;
      color: #d6e5e5;
      font-size: 13px;
    }

    .generated {
      margin-top: 22px;
      color: #a9c7c9;
      font-size: 11px;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .stat {
      padding: 16px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.08);
    }

    .stat strong {
      display: block;
      font-size: 26px;
      line-height: 1;
    }

    .stat span {
      display: block;
      margin-top: 6px;
      color: #c8dddd;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .section {
      margin-top: 18px;
      padding: 20px;
      border-radius: 10px;
      background: #ffffff;
      box-shadow: 0 10px 28px rgba(25, 39, 52, 0.08);
      break-inside: avoid;
    }

    .sectionHeader {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      align-items: end;
      margin-bottom: 14px;
    }

    .sectionHeader h2 {
      font-size: 20px;
      color: #18212f;
    }

    .sectionHeader p {
      max-width: 560px;
      color: #667383;
      font-size: 10.5px;
      text-align: right;
    }

    .featureGrid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }

    .featureCard {
      min-height: 160px;
      padding: 14px;
      border: 1px solid #dfe7ec;
      border-radius: 8px;
      background: #fbfcfd;
      break-inside: avoid;
    }

    .cardTopline {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      align-items: center;
      margin-bottom: 10px;
    }

    .rank {
      color: #5b6878;
      font-size: 11px;
      font-weight: 700;
    }

    .score {
      display: inline-flex;
      min-width: 46px;
      justify-content: center;
      padding: 4px 7px;
      border-radius: 999px;
      color: #1f3a4a;
      background: #e8eef2;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }

    .scoreMedium {
      color: #174743;
      background: #dff2ec;
    }

    .scoreHigh {
      color: #4e3511;
      background: #ffe6ad;
    }

    .featureCard h2 {
      margin-bottom: 10px;
      font-size: 14px;
    }

    .featureCard h2 span {
      display: block;
      margin-top: 2px;
      color: #6b7785;
      font-size: 10px;
      font-weight: 600;
    }

    .chipRow {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }

    .pokemonChip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      max-width: 100%;
      padding: 4px 7px;
      border-radius: 999px;
      color: #243041;
      background: #e8eef2;
      font-size: 9px;
      white-space: nowrap;
    }

    .pokemonChip strong {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tier0, .tier1 {
      background: #ffe0e7;
    }

    .tier2, .tier3 {
      background: #fff0bd;
    }

    .tier4, .tier5 {
      background: #dff2ec;
    }

    .chipPercent {
      color: #44515f;
      font-weight: 700;
    }

    .locationList {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 10px;
      color: #3d4b5b;
      font-size: 9.5px;
    }

    .featureCard p {
      margin-top: 10px;
      color: #6b7785;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    th {
      padding: 8px 7px;
      color: #536171;
      background: #eef3f6;
      font-size: 8.5px;
      text-align: left;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    td {
      padding: 8px 7px;
      border-bottom: 1px solid #e6edf1;
      vertical-align: top;
    }

    tr {
      break-inside: avoid;
    }

    .rankCell {
      color: #667383;
      font-weight: 800;
      text-align: right;
    }

    .muted {
      display: block;
      margin-top: 2px;
      color: #7b8794;
      font-size: 9px;
    }

    .compact {
      margin-top: 0;
    }

    .compact .pokemonChip {
      max-width: 160px;
      padding: 3px 6px;
      font-size: 8.5px;
    }

    .weightBadge,
    .manualBadge {
      display: inline-flex;
      padding: 4px 7px;
      border-radius: 999px;
      background: #e8eef2;
      color: #4d5a68;
      font-size: 8.5px;
      font-weight: 800;
      white-space: nowrap;
    }

    .weightBadge.weighted {
      background: #dff2ec;
      color: #174743;
    }

    .manualBadge {
      background: #f7e2d4;
      color: #7a3c1f;
    }

    .rankedTable th:nth-child(1),
    .rankedTable td:nth-child(1) {
      width: 38px;
    }

    .rankedTable th:nth-child(2),
    .rankedTable td:nth-child(2) {
      width: 70px;
    }

    .rankedTable th:nth-child(3),
    .rankedTable td:nth-child(3) {
      width: 110px;
    }

    .rankedTable th:nth-child(5),
    .rankedTable td:nth-child(5) {
      width: 230px;
    }

    .rankedTable th:nth-child(6),
    .rankedTable td:nth-child(6) {
      width: 105px;
    }

    .manualTable th:nth-child(1),
    .manualTable td:nth-child(1) {
      width: 42px;
    }

    .manualTable th:nth-child(2),
    .manualTable td:nth-child(2) {
      width: 72px;
    }

    .manualTable th:nth-child(3),
    .manualTable td:nth-child(3) {
      width: 120px;
    }

    .manualTable th:nth-child(5),
    .manualTable td:nth-child(5) {
      width: 70px;
    }

    .manualTable th:nth-child(6),
    .manualTable td:nth-child(6) {
      width: 110px;
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="hero">
      <div>
        <h1>${escapeHtml(title)}</h1>
        <p class="subtitle">${escapeHtml(subtitle)}</p>
        <p class="generated">Generated ${escapeHtml(generatedAt)}</p>
      </div>
      <div class="stats">
        <div class="stat"><strong>${groups.length}</strong><span>${escapeHtml(totalLabel)}</span></div>
        <div class="stat"><strong>${autoGroups.length}</strong><span>${escapeHtml(autoLabel)}</span></div>
        <div class="stat"><strong>${weightedGroups.length}</strong><span>Weighted splits</span></div>
        <div class="stat"><strong>${manualGroups.length}</strong><span>Manual review</span></div>
      </div>
    </section>

    <section class="section">
      <div class="sectionHeader">
        <h2>${escapeHtml(bestTitle)}</h2>
        <p>${escapeHtml(bestDescription)}</p>
      </div>
      <div class="featureGrid">${featuredCards}</div>
    </section>

    <section class="section">
      <div class="sectionHeader">
        <h2>${escapeHtml(tableTitle)}</h2>
        <p>${escapeHtml(tableDescription)}</p>
      </div>
      <table class="rankedTable">
        <thead>
          <tr>
            <th>Rank</th>
            <th>${escapeHtml(scoreLabel)}</th>
            <th>Method</th>
            <th>Split</th>
            <th>Locations</th>
            <th>Weighting</th>
          </tr>
        </thead>
        <tbody>${rankedRows}</tbody>
      </table>
    </section>
    ${manualSection}
  </main>
</body>
</html>`
}

async function writePdfFromHtml(htmlPath, pdfPath) {
  const browser = await puppeteer.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.goto(`file://${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0' })
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: {
        top: '12mm',
        right: '12mm',
        bottom: '12mm',
        left: '12mm',
      },
    })
  } finally {
    await browser.close()
  }
}

async function writeStyledPdfReport(groups, htmlRelativePath, pdfRelativePath, htmlOptions) {
  fs.writeFileSync(path.join(rootDir, htmlRelativePath), buildHtml(groups, htmlOptions))
  await writePdfFromHtml(
    path.join(rootDir, htmlRelativePath),
    path.join(rootDir, pdfRelativePath)
  )
}

function buildCsv(groups) {
  const header = [
    'rank',
    'point_return_average',
    'method',
    'time',
    'split',
    'route_count',
    'locations',
    'weighting',
    'manual_review',
  ]

  const rows = groups.map((group, index) => [
    index + 1,
    formatNumber(group.pointReturnAverage),
    group.methodLabel,
    group.time || 'ALL',
    formatSplit(group),
    group.routeCount,
    formatLocations(group),
    group.hasWeightedSample ? 'weighted' : '',
    group.needsManualReview ? 'yes' : 'no',
  ])

  return [header, ...rows].map(row => row.map(csvEscape).join(',')).join('\n') + '\n'
}

function compareGroups(left, right) {
  if (left.needsManualReview !== right.needsManualReview) {
    return Number(left.needsManualReview) - Number(right.needsManualReview)
  }

  if (left.pointReturnAverage !== right.pointReturnAverage) {
    return right.pointReturnAverage - left.pointReturnAverage
  }

  if (left.hasWeightedSample !== right.hasWeightedSample) {
    return Number(right.hasWeightedSample) - Number(left.hasWeightedSample)
  }

  return formatSplit(left).localeCompare(formatSplit(right))
}

async function main() {
  const pokemonData = readJson(POKEMON_DATA_FILE)
  const encounterPercents = readJson(ENCOUNTER_PERCENTS_FILE)
  const scenarios = new Map()

  REGION_FILES.forEach((relativeFile) => {
    collectRegionMapScenarios(readJson(relativeFile), scenarios)
  })
  collectPokemonDataScenarios(pokemonData, scenarios)

  const samplesByRoute = buildRouteFinderSamples(encounterPercents)
  const scoredScenarios = [...scenarios.values()].map(scenario => (
    scoreScenario(scenario, pokemonData, samplesByRoute)
  ))
  const groups = groupScenarios(scoredScenarios).sort(compareGroups)
  const filteredGroups = removeCoveredGroups(groups).sort(compareGroups)
  const fishingGroups = removeCoveredGroups(
    buildRouteReportGroups('fishing', pokemonData, encounterPercents)
  ).sort(compareGroups)
  const singleGroups = removeCoveredGroups(
    buildRouteReportGroups('single', pokemonData, encounterPercents)
  ).sort(compareGroups)

  fs.mkdirSync(path.join(rootDir, REPORT_DIR), { recursive: true })
  fs.writeFileSync(path.join(rootDir, MARKDOWN_REPORT_FILE), buildMarkdown(filteredGroups))
  fs.writeFileSync(path.join(rootDir, CSV_REPORT_FILE), buildCsv(filteredGroups))
  await writeStyledPdfReport(filteredGroups, HTML_REPORT_FILE, PDF_REPORT_FILE)
  await writeStyledPdfReport(fishingGroups, FISHING_HTML_REPORT_FILE, FISHING_REPORT_FILE, {
    title: 'Shiny War Fishing Point Return Report',
    subtitle: 'A ranked fishing report covering Old Rod, Good Rod, Super Rod, Fishing samples, and each route water-lure encounter. Route Finder samples are weighted when available; the rest are adjusted by rarity so rare targets do not overstate a route.',
    bestTitle: 'Best Fishing Returns',
    bestDescription: 'These are the strongest fishing routes after weaker duplicate target routes are filtered out.',
    tableTitle: 'Full Fishing Ranked List',
    tableDescription: 'Non-sampled rows show rarity and method chips. Weighted rows show encounter percentages from Route Finder samples.',
    scoreLabel: 'Score',
    totalLabel: 'Fishing routes',
    autoLabel: 'Ranked routes',
    includeManualSection: false,
  })
  await writeStyledPdfReport(singleGroups, SINGLE_HTML_REPORT_FILE, SINGLE_REPORT_FILE, {
    title: 'Shiny War Single Encounter Point Return Report',
    subtitle: 'A ranked single-encounter report covering normal route encounters plus route lures. Rare, Very Rare, and Lure targets are deliberately discounted so the score reflects practical hunting value instead of raw point value alone.',
    bestTitle: 'Best Single Encounter Returns',
    bestDescription: 'These are the strongest normal encounter routes after weaker duplicate target routes are filtered out.',
    tableTitle: 'Full Single Encounter Ranked List',
    tableDescription: 'Non-sampled rows show rarity and method chips. Weighted rows show encounter percentages from Route Finder samples.',
    scoreLabel: 'Score',
    totalLabel: 'Single routes',
    autoLabel: 'Ranked routes',
    includeManualSection: false,
  })

  const manualReviewCount = filteredGroups.filter(group => group.needsManualReview).length
  const weightedCount = filteredGroups.filter(group => group.hasWeightedSample).length
  const coveredCount = groups.length - filteredGroups.length

  console.log(`Wrote ${MARKDOWN_REPORT_FILE}`)
  console.log(`Wrote ${CSV_REPORT_FILE}`)
  console.log(`Wrote ${HTML_REPORT_FILE}`)
  console.log(`Wrote ${PDF_REPORT_FILE}`)
  console.log(`Wrote ${FISHING_HTML_REPORT_FILE}`)
  console.log(`Wrote ${FISHING_REPORT_FILE}`)
  console.log(`Wrote ${SINGLE_HTML_REPORT_FILE}`)
  console.log(`Wrote ${SINGLE_REPORT_FILE}`)
  console.log(`Ranked ${filteredGroups.length} horde groups (${weightedCount} weighted, ${manualReviewCount} manual review, ${coveredCount} covered by better routes).`)
  console.log(`Ranked ${fishingGroups.length} fishing routes.`)
  console.log(`Ranked ${singleGroups.length} single encounter routes.`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
