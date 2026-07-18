import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import { useInGameClock } from '../../hooks/useInGameClock'
import { getLocalPokemonGif, normalizePokemonName, onGifError } from '../../utils/pokemon'
import pokemonData from '../../data/pokemmo_data/pokemon-data.json'
import generationData from '../../data/generation.json'
import safariData from '../../data/safari_zones.json'
import catchCalculatorConfig from '../../data/catching_calculator_config.json'
import { getCatchRateByName } from '../../hooks/useCatchCalcs'
import styles from './CatchingCalculator.module.css'

const MODE_ROUTE = 'route'
const MODE_POKEMON = 'pokemon'
const MODE_EGG = 'egg'
const MODE_SPECIFIC = 'specific'

const METHOD_NORMAL = 'normal'
const METHOD_FISHING = 'fishing'
const METHOD_SURFING = 'surfing'

const PRIORITY_OVERALL = 'overall'
const PRIORITY_CHEAPEST = 'cheapest'
const PRIORITY_FASTEST = 'fastest'
const PRIORITY_HIGHEST = 'highestCatch'

const GENDER_MALE = 'male'
const GENDER_FEMALE = 'female'
const GENDER_IGNORE = 'ignore'

const BALLS = Array.isArray(catchCalculatorConfig?.balls)
  ? catchCalculatorConfig.balls.filter((ball) => ball?.enabled !== false)
  : []
const MIN_CHEAPEST_CHANCE = Number(catchCalculatorConfig?.thresholds?.minCheapestChance) || 75
const SIMILAR_CATCH_GAP_PERCENT = Number(catchCalculatorConfig?.thresholds?.similarCatchGapPercent) || 3
const DUSK_BALL_INDOOR_KEYWORDS = Array.isArray(catchCalculatorConfig?.duskBall?.indoorKeywords)
  ? catchCalculatorConfig.duskBall.indoorKeywords
  : []
const DUSK_BALL_INDOOR_LOCATIONS = new Set(
  (Array.isArray(catchCalculatorConfig?.duskBall?.indoorLocations)
    ? catchCalculatorConfig.duskBall.indoorLocations
    : [])
    .map((name) => normalizeKey(name))
)

const APRICORN_BALL_IDS = BALLS.filter((ball) => ball.apricorn).map((ball) => ball.id)
const ROUTE_SUGGESTION_MIN_CHARS = Number(catchCalculatorConfig?.search?.routeSuggestionMinChars) || 2
const POKEMON_SUGGESTION_MIN_CHARS = Number(catchCalculatorConfig?.search?.pokemonSuggestionMinChars) || 2
const MAX_SUGGESTIONS = Number(catchCalculatorConfig?.search?.maxSuggestions) || 15

const POKEMON_VALUES = Object.values(pokemonData)
const POKEMON_NAME_BY_SLUG = POKEMON_VALUES.reduce((acc, pokemon) => {
  acc[normalizePokemonName(pokemon.name)] = pokemon.name
  return acc
}, {})
const SAFARI_CATCH_DATA_BY_SLUG = Object.values(safariData || {}).reduce((acc, region) => {
  const catchEntries = Object.entries(region?.catchData || {})
  catchEntries.forEach(([name, data]) => {
    const slug = normalizePokemonName(name)
    if (slug && data && typeof data === 'object') {
      acc[slug] = data
    }
  })
  return acc
}, {})
const EGG_GROUP_EXCLUDED_ROUTE_KEYWORDS = ['altering cave']

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[\u2018\u2019']/g, '')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
}

function titleCase(value) {
  return String(value || '')
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatPokemonDisplayName(value) {
  return String(value || '').replace(/(^|[\s-])([a-z])/g, (match, prefix, char) => `${prefix}${char.toUpperCase()}`)
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '0.0%'
  return `${value.toFixed(1)}%`
}

function formatMoney(value) {
  if (!Number.isFinite(value)) return 'N/A'
  return Math.round(value).toLocaleString()
}

function formatTurns(value) {
  if (!Number.isFinite(value)) return '0'
  return value.toFixed(1)
}

function formatTurnSummary(value) {
  if (!Number.isFinite(value)) return '0'
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

function getTurnSetupLabel(methodLabel) {
  switch (methodLabel) {
    case '1% HP':
      return '1hp'
    case '100% HP + Sleep':
      return 'full hp, sleep'
    case '1% HP + Sleep':
      return '1hp, sleep'
    case '100% HP (Turn 1)':
      return 'turn 1'
    default:
      return ''
  }
}

function formatRecommendationTurns(turns, methodLabel) {
  const base = formatTurnSummary(turns)
  if (!Number.isFinite(turns) || turns <= 1) return base
  const setupLabel = getTurnSetupLabel(methodLabel)
  return setupLabel ? `${base} (${setupLabel})` : base
}

function formatExpectedTurns(turns) {
  return formatTurnSummary(turns)
}

function getPriorityLabel(priority) {
  switch (priority) {
    case PRIORITY_CHEAPEST:
      return 'Cheapest'
    case PRIORITY_FASTEST:
      return 'Fastest'
    case PRIORITY_HIGHEST:
      return 'Highest Catch Chance'
    default:
      return 'Best Overall'
  }
}

function getCanonicalPokemonName(value) {
  const normalized = normalizeKey(value)
  if (!normalized) return null
  return POKEMON_VALUES.find((pokemon) => normalizeKey(pokemon.name) === normalized)?.name || null
}

function getPokemonSearchTargets(value) {
  const normalizedTarget = normalizeKey(value)
  if (!normalizedTarget) return new Set()

  const targets = new Set([normalizedTarget])
  const evolutionGroups = Object.values(generationData || {})

  evolutionGroups.forEach((group) => {
    if (!Array.isArray(group)) return

    group.forEach((chain) => {
      if (!Array.isArray(chain)) return

      const normalizedChain = chain.map((name) => normalizeKey(name))
      const targetIndex = normalizedChain.indexOf(normalizedTarget)
      if (targetIndex === -1) return

      normalizedChain.slice(targetIndex).forEach((name) => {
        if (name) targets.add(name)
      })
    })
  })

  return targets
}

function getSafariCatchData(pokemonName) {
  return SAFARI_CATCH_DATA_BY_SLUG[normalizePokemonName(pokemonName)] || null
}

function buildSafariBallCandidate(ball, safariCatchData) {
  const chance = Number(safariCatchData?.bestOdds)
  const catchRate = Number(safariCatchData?.catchRate)
  if (!Number.isFinite(chance) || chance <= 0 || !Number.isFinite(catchRate)) {
    return createUnavailableCandidate(ball, 'Safari catch data is unavailable for this Pokemon.')
  }

  const strategyLabel = {
    balls: 'Balls only',
    ballsOnly: 'Balls only',
    bait: '1 bait then balls',
    oneBait: '1 bait then balls',
    mud: '1 mud then balls',
    oneMud: '1 mud then balls',
  }[String(safariCatchData?.bestStrategy || '')] || 'Safari strategy data loaded.'

  const expectedThrows = 100 / chance

  return {
    ballId: ball.id,
    ball: ball.name,
    available: true,
    availabilityNote: `${strategyLabel}. Best safari odds: ${formatPercent(chance)}.`,
    multiplier: 1,
    chance,
    expectedThrows,
    expectedCost: Number.POSITIVE_INFINITY,
    turns: expectedThrows,
    expectedTurnsToSuccess: expectedThrows,
    efficiency: chance,
    catchValue: catchRate,
    rawCatchValue: catchRate,
    hpMultiplier: 1,
    hpPercent: 100,
    statusMod: 1,
    methodLabel: strategyLabel,
    catchRate,
    price: null,
  }
}

function createApricornSelection(enabled) {
  return new Set(enabled)
}

const MIN_QUICK_BALL_CHANCE = Number(catchCalculatorConfig?.thresholds?.minQuickBallChance) || 90
const TIMER_TARGET_TURN = Number(catchCalculatorConfig?.assumptions?.timerTargetTurn) || 11
const METHOD_PROFILES = [
  { id: 'normal100', hpPercent: 100, statusMod: 1, turns: 0, label: '100% HP' },
  { id: 'normal1', hpPercent: 1, statusMod: 1, turns: 1, label: '1% HP' },
  { id: 'sleep100', hpPercent: 100, statusMod: 2, turns: 1, label: '100% HP + Sleep' },
  { id: 'sleep1', hpPercent: 1, statusMod: 2, turns: 2, label: '1% HP + Sleep' },
]
const POKEDEX_BALL_COST_FACTORS = {
  'poke-ball': 1,
  'great-ball': 1.5,
  'ultra-ball': 2,
  'quick-ball': 2.25,
  'dusk-ball': 2.5,
}
const POKEDEX_METHODS = [
  { ballId: 'poke-ball', ballRate: 1, hpPercent: 100, turns: 0, statusMod: 1, methodLabel: '100% HP' },
  { ballId: 'poke-ball', ballRate: 1, hpPercent: 1, turns: 1, statusMod: 1, methodLabel: '1% HP' },
  { ballId: 'poke-ball', ballRate: 1, hpPercent: 100, turns: 1, statusMod: 2, methodLabel: '100% HP + Sleep' },
  { ballId: 'poke-ball', ballRate: 1, hpPercent: 1, turns: 2, statusMod: 2, methodLabel: '1% HP + Sleep' },
  { ballId: 'great-ball', ballRate: 1.5, hpPercent: 100, turns: 0, statusMod: 1, methodLabel: '100% HP' },
  { ballId: 'great-ball', ballRate: 1.5, hpPercent: 1, turns: 1, statusMod: 1, methodLabel: '1% HP' },
  { ballId: 'great-ball', ballRate: 1.5, hpPercent: 100, turns: 1, statusMod: 2, methodLabel: '100% HP + Sleep' },
  { ballId: 'great-ball', ballRate: 1.5, hpPercent: 1, turns: 2, statusMod: 2, methodLabel: '1% HP + Sleep' },
  { ballId: 'ultra-ball', ballRate: 2, hpPercent: 100, turns: 0, statusMod: 1, methodLabel: '100% HP' },
  { ballId: 'ultra-ball', ballRate: 2, hpPercent: 1, turns: 1, statusMod: 1, methodLabel: '1% HP' },
  { ballId: 'ultra-ball', ballRate: 2, hpPercent: 100, turns: 1, statusMod: 2, methodLabel: '100% HP + Sleep' },
  { ballId: 'ultra-ball', ballRate: 2, hpPercent: 1, turns: 2, statusMod: 2, methodLabel: '1% HP + Sleep' },
  { ballId: 'quick-ball', ballRate: 5, hpPercent: 100, turns: 0, statusMod: 1, methodLabel: '100% HP (Turn 1)' },
  { ballId: 'quick-ball', ballRate: 1, hpPercent: 1, turns: 1, statusMod: 1, methodLabel: '1% HP' },
  { ballId: 'quick-ball', ballRate: 1, hpPercent: 100, turns: 1, statusMod: 2, methodLabel: '100% HP + Sleep' },
  { ballId: 'quick-ball', ballRate: 1, hpPercent: 1, turns: 2, statusMod: 2, methodLabel: '1% HP + Sleep' },
  { ballId: 'dusk-ball', ballRate: 2.5, hpPercent: 100, turns: 0, statusMod: 1, methodLabel: '100% HP' },
  { ballId: 'dusk-ball', ballRate: 2.5, hpPercent: 1, turns: 1, statusMod: 1, methodLabel: '1% HP' },
  { ballId: 'dusk-ball', ballRate: 2.5, hpPercent: 100, turns: 1, statusMod: 2, methodLabel: '100% HP + Sleep' },
  { ballId: 'dusk-ball', ballRate: 2.5, hpPercent: 1, turns: 2, statusMod: 2, methodLabel: '1% HP + Sleep' },
]

function toStarLabel(scoreOutOf100) {
  const stars = Math.max(1, Math.min(5, Math.round(scoreOutOf100 / 20)))
  return `${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}`
}

function getSpeedStat(pokemon) {
  const stats = Array.isArray(pokemon?.stats) ? pokemon.stats : []
  const speed = stats.find((entry) => String(entry?.stat_name).toLowerCase() === 'speed')
  return Number(speed?.base_stat) || 0
}

function getWeightKg(pokemon) {
  const rawValue = Number(pokemon?.weight ?? pokemon?.weightKg ?? pokemon?.weight_kg)
  if (Number.isFinite(rawValue) && rawValue > 0) {
    return rawValue > 200 ? rawValue / 10 : rawValue
  }
  return 5
}

function getGenderRatios(pokemon) {
  const rawRate = Number(pokemon?.gender_rate)
  if (!Number.isFinite(rawRate) || rawRate < 0) {
    return { male: 0.5, female: 0.5, genderless: true }
  }

  const female = Math.max(0, Math.min(1, rawRate / 8))
  const male = 1 - female
  return { male, female, genderless: false }
}

function traverseEvolutionChain(node, visit) {
  if (!node || typeof node !== 'object') return
  visit(node)
  const evolvesTo = Array.isArray(node.evolves_to) ? node.evolves_to : []
  evolvesTo.forEach((next) => traverseEvolutionChain(next, visit))
}

function hasMoonStoneEvolution(pokemon) {
  const chainRoot = pokemon?.evolution_chain?.chain
  let found = false

  traverseEvolutionChain(chainRoot, (node) => {
    const details = Array.isArray(node?.evolution_details) ? node.evolution_details : []
    details.forEach((detail) => {
      const itemName = detail?.item?.name
      if (String(itemName || '').toLowerCase() === 'moon-stone') {
        found = true
      }
    })
  })

  return found
}

function hasFriendshipEvolution(pokemon) {
  const chainRoot = pokemon?.evolution_chain?.chain
  let found = false

  traverseEvolutionChain(chainRoot, (node) => {
    const details = Array.isArray(node?.evolution_details) ? node.evolution_details : []
    details.forEach((detail) => {
      if (Number(detail?.min_happiness) > 0) {
        found = true
      }
    })
  })

  return found
}

function isWaterMethod(encounterType) {
  const value = String(encounterType || '').toLowerCase()
  return value.includes('fish') || value.includes('rod') || value.includes('surf') || value.includes('water')
}

function isSafariRoute(routeName) {
  const normalizedRouteName = normalizeKey(routeName)
  return normalizedRouteName.includes('safari') || normalizedRouteName.includes('great marsh')
}

function getEncounterMethodFromType(encounterType) {
  const value = normalizeKey(encounterType)
  if (value.includes('rod') || value.includes('fishing') || value.includes('fish')) return METHOD_FISHING
  if (value === 'water' || value.includes('surf')) return METHOD_SURFING
  return METHOD_NORMAL
}

function isSpecialEncounterType(encounterType) {
  const value = normalizeKey(encounterType)
  return value.includes('shadow')
    || value.includes('dust cloud')
    || value.includes('fossil')
    || value.includes('honey tree')
}

function isBuildingRoute(routeName) {
  const key = normalizeKey(routeName)
  if (DUSK_BALL_INDOOR_LOCATIONS.has(key)) return true
  return DUSK_BALL_INDOOR_KEYWORDS.some((keyword) => key.includes(normalizeKey(keyword)))
}

function getVariationCategory(routeEntry) {
  const variation = normalizeKey(routeEntry?.variation)
  const category = normalizeKey(routeEntry?.encounterCategory)

  if (variation.includes('horde') || category.includes('horde')) return 'horde'
  if (variation.includes('fish') || variation.includes('rod') || category.includes('fish')) return 'fishing'
  if (variation.includes('lure') || category.includes('lure')) return 'lure'
  if (variation.includes('surf') || category.includes('water')) return 'water'
  return 'single'
}

function getRouteMatchKey(regionName, routeName) {
  return `${normalizeKey(regionName)}::${normalizeKey(routeName)}`
}

function isEggGroupExcludedRoute(routeEntry) {
  const routeText = normalizeKey(`${routeEntry?.region || ''} ${routeEntry?.routeName || ''} ${routeEntry?.displayName || ''}`)
  return EGG_GROUP_EXCLUDED_ROUTE_KEYWORDS.some((keyword) => routeText.includes(normalizeKey(keyword)))
}

function buildRouteEncounterIndex() {
  const routeIndex = new Map()

  Object.values(pokemonData).forEach((pokemon) => {
    const pokemonName = String(pokemon?.name || '')
    if (!pokemonName) return

    const encounters = Array.isArray(pokemon?.location_area_encounters) ? pokemon.location_area_encounters : []
    encounters.forEach((encounter) => {
      const regionName = titleCase(String(encounter?.region_name || ''))
      const routeName = titleCase(String(encounter?.location || ''))
      if (!regionName || !routeName) return

      const key = getRouteMatchKey(regionName, routeName)
      if (!routeIndex.has(key)) {
        routeIndex.set(key, new Map())
      }

      const pokemonMap = routeIndex.get(key)
      const current = pokemonMap.get(pokemonName) || {
        pokemonName,
        levels: [],
        encounterTypes: new Set(),
        rarityTypes: new Set(),
        times: new Set(),
      }

      const minLevel = Number(encounter?.min_level)
      const maxLevel = Number(encounter?.max_level)
      if (Number.isFinite(minLevel)) current.levels.push(minLevel)
      if (Number.isFinite(maxLevel)) current.levels.push(maxLevel)

      current.encounterTypes.add(String(encounter?.type || ''))
      current.rarityTypes.add(String(encounter?.rarity || ''))
      current.times.add(String(encounter?.time || 'ALL'))

      pokemonMap.set(pokemonName, current)
    })
  })

  return routeIndex
}

function buildAllRouteUniverse(encounterMethod) {
  const routeMap = new Map()

  POKEMON_VALUES.forEach((pokemon) => {
    const encounters = Array.isArray(pokemon?.location_area_encounters) ? pokemon.location_area_encounters : []
    encounters.forEach((encounter) => {
      const pokemonSlug = normalizePokemonName(pokemon.name)
      const encounterType = String(encounter?.type || '')
      const method = getEncounterMethodFromType(encounterType)
      if (method !== encounterMethod) return
      if (isSpecialEncounterType(encounterType) && pokemonSlug !== 'feebas') return

      const region = titleCase(String(encounter?.region_name || '').trim())
      const routeName = titleCase(String(encounter?.location || '').trim())
      if (!region || !routeName) return

      const key = `${region}::${routeName}`
      if (!routeMap.has(key)) {
        routeMap.set(key, {
          key,
          id: `all|${region}|${routeName}`,
          region,
          routeName,
          displayName: routeName,
          variation: 'All Encounters',
          encounterCategory: method,
          pokemonPercents: new Map(),
        })
      }

      const route = routeMap.get(key)
      const slug = pokemonSlug
      const prev = route.pokemonPercents.get(slug)
      const defaultPercent = 1
      route.pokemonPercents.set(slug, {
        percent: prev ? prev.percent : defaultPercent,
        label: prev ? prev.label : `${defaultPercent.toFixed(1)}%`,
      })
    })
  })

  return Array.from(routeMap.values()).sort((a, b) => {
    const regionCmp = a.region.localeCompare(b.region)
    if (regionCmp !== 0) return regionCmp
    return a.displayName.localeCompare(b.displayName)
  })
}

function estimateEncounterLevel(entry) {
  const levels = Array.isArray(entry?.levels) ? entry.levels.filter(Number.isFinite) : []
  if (!levels.length) return 30
  const total = levels.reduce((sum, value) => sum + value, 0)
  return Math.max(1, Math.round(total / levels.length))
}

function getEncounterContext(routeEntry, pokemonName, routeEncounterIndex) {
  const key = getRouteMatchKey(routeEntry.region, routeEntry.routeName)
  const pokemonMap = routeEncounterIndex.get(key)
  const encounter = pokemonMap?.get(pokemonName)
  const variationCategory = getVariationCategory(routeEntry)

  const encounterTypes = Array.from(encounter?.encounterTypes || [])
  const rarityTypes = Array.from(encounter?.rarityTypes || [])
  const times = Array.from(encounter?.times || [])

  return {
    level: estimateEncounterLevel(encounter),
    encounterTypes,
    rarityTypes,
    times,
    variationCategory,
  }
}

function getSpecificRouteLevel(routeEntry, pokemonName, routeEncounterIndex) {
  if (!routeEntry) return 30

  const normalizedPokemonName = normalizePokemonName(pokemonName)
  if (!normalizedPokemonName || !routeEntry.pokemonPercents.has(normalizedPokemonName)) {
    return 30
  }

  return getEncounterContext(routeEntry, pokemonName, routeEncounterIndex).level
}

function calculateCatchChance(catchRate, ballRate, hpPercent, statusModifier = 1) {
  const hpMultiplier = (300 - (2 * hpPercent)) / 300
  const value = Math.min(255, Math.floor(hpMultiplier * ballRate * catchRate * statusModifier))
  return (value / 255) * 100
}

function calculateCatchChanceDetails(catchRate, ballRate, hpPercent, statusModifier = 1) {
  const hpMultiplier = (300 - (2 * hpPercent)) / 300
  const rawValue = hpMultiplier * ballRate * catchRate * statusModifier
  const value = Math.min(255, Math.floor(rawValue))
  return {
    rawValue,
    value,
    chance: (value / 255) * 100,
    hpMultiplier,
  }
}

function getNestMultiplier(level) {
  if (level <= 16) return 4
  if (level >= 30) return 1.2
  return Math.max(1.2, 4 - ((level - 16) * 0.2))
}

function getRepeatMultiplier(streak) {
  return Math.min(4, 1 + (Math.max(0, streak) * 0.1))
}

function getTimerMultiplier(throwTurn) {
  const turn = Math.max(1, Number(throwTurn) || 1)
  return Math.min(4, 1 + (Math.max(0, turn - 1) * 0.3))
}

function getHeavyMultiplier(weightKg) {
  if (!Number.isFinite(weightKg)) return null
  if (weightKg >= 300) return 4
  if (weightKg >= 200) return 3
  if (weightKg >= 100) return 2
  return 1
}

function createUnavailableCandidate(ball, reason) {
  return {
    ballId: ball.id,
    ball: ball.name,
    available: false,
    availabilityNote: reason,
    multiplier: 1,
    chance: 0,
    catchValue: 0,
    rawCatchValue: 0,
    hpMultiplier: 0,
    statusMod: 0,
    catchRate: 0,
    expectedThrows: Number.POSITIVE_INFINITY,
    expectedCost: Number.POSITIVE_INFINITY,
    turns: 0,
    expectedTurnsToSuccess: Number.POSITIVE_INFINITY,
    efficiency: -Infinity,
    price: ball.price,
  }
}

function getGenderLabel(genderRatios) {
  if (genderRatios.genderless) return 'genderless'
  if (genderRatios.female === 1) return 'female-only'
  if (genderRatios.male === 1) return 'male-only'
  return 'mixed'
}

function getBestOverallDexStyle(candidates, catchRate) {
  if (!Array.isArray(candidates) || !candidates.length || !Number.isFinite(catchRate)) return null

  const availableByBallId = new Map(candidates.map((candidate) => [candidate.ballId, candidate]))

  let best = null
  let bestScore = -Infinity

  POKEDEX_METHODS.forEach((method) => {
    const baseCandidate = availableByBallId.get(method.ballId)
    if (!baseCandidate || !baseCandidate.available) return

    const costFactor = POKEDEX_BALL_COST_FACTORS[method.ballId]
    if (!Number.isFinite(costFactor)) return

    const details = calculateCatchChanceDetails(catchRate, method.ballRate, method.hpPercent, method.statusMod)
    const chance = details.chance
    if (!Number.isFinite(chance) || chance <= 0) return

    const score = chance / (method.turns + costFactor)
    if (score <= bestScore) return

    const expectedThrows = 100 / chance
    const ballPrice = Number.isFinite(baseCandidate.price) ? baseCandidate.price : 500
    bestScore = score
    best = {
      ...baseCandidate,
      multiplier: method.ballRate,
      chance,
      turns: method.turns,
      expectedThrows,
      expectedCost: expectedThrows * ballPrice,
      expectedTurnsToSuccess: expectedThrows * method.turns,
      catchValue: details.value,
      rawCatchValue: details.rawValue,
      hpMultiplier: details.hpMultiplier,
      hpPercent: method.hpPercent,
      statusMod: method.statusMod,
      methodLabel: method.methodLabel,
      dexScore: score,
    }
  })

  return best
}

function getBallCandidate(ball, context) {
  const {
    types,
    level,
    isNight,
    isBuilding,
    isWater,
    speed,
    hasMoon,
    hasFriendship,
    weightKg,
    apricornEnabled,
    ironmanMode,
    timerTargetTurn,
    targetGenderLabel,
  } = context

  if (ball.apricorn && !apricornEnabled.has(ball.id)) {
    return createUnavailableCandidate(ball, 'This Apricorn Ball is disabled.')
  }

  const lowerTypes = types.map((type) => String(type).toLowerCase())
  const timerTurn = Math.max(1, Number(timerTargetTurn) || 11)

  let multiplier = 1
  let available = true
  let availabilityNote = 'Available'

  if (context.isSafari && ball.id !== 'safari-ball') {
    return createUnavailableCandidate(ball, 'Only Safari Balls are usable in Safari Zone and Great Marsh.')
  }

  if (context.isSafari && ball.id === 'safari-ball') {
    return buildSafariBallCandidate(ball, context.safariCatchData)
  }

  switch (ball.id) {
    case 'great-ball':
      multiplier = 1.5
      break
    case 'ultra-ball':
      multiplier = 2
      break
    case 'safari-ball':
      if (!context.isSafari) {
        available = false
        availabilityNote = 'Only usable in Safari Zones.'
      } else {
        multiplier = 2.5
      }
      break
    case 'net-ball':
      multiplier = lowerTypes.includes('water') || lowerTypes.includes('bug') ? 3.5 : 1
      availabilityNote = multiplier > 1 ? 'Type bonus active.' : 'No type bonus on this Pokemon.'
      break
    case 'nest-ball':
      multiplier = getNestMultiplier(level)
      availabilityNote = `Level-based bonus (${multiplier.toFixed(1)}x).`
      break
    case 'dive-ball':
      if (!isWater) {
        available = false
        availabilityNote = 'Only usable for fishing/surf encounters.'
      } else {
        multiplier = 3.5
      }
      break
    case 'repeat-ball':
      multiplier = getRepeatMultiplier(context.repeatStreak || 0)
      availabilityNote = context.repeatStreak > 0
        ? `Repeat streak bonus (${multiplier.toFixed(1)}x).`
        : 'No streak bonus on first catch.'
      break
    case 'timer-ball':
      multiplier = getTimerMultiplier(timerTurn)
      availabilityNote = `Turn-based bonus (${multiplier.toFixed(1)}x at throw turn ${timerTurn}).`
      break
    case 'quick-ball':
      multiplier = 5
      availabilityNote = 'Assumes opening throw with Turn 1 bonus active.'
      break
    case 'dusk-ball':
      if (!isNight) {
        available = false
        availabilityNote = 'Requires in-game night or Force Night Time.'
      } else {
        multiplier = 2.5
      }
      break
    case 'luxury-ball':
      multiplier = hasFriendship ? 2 : 1
      availabilityNote = hasFriendship ? 'Friendship evolution bonus active.' : 'No friendship evolution bonus.'
      break
    case 'level-ball':
      multiplier = level === 30 ? 4 : 1
      availabilityNote = level === 30 ? 'Wild level matches level 30 catcher.' : 'No level match bonus.'
      break
    case 'lure-ball':
      if (!isWater) {
        available = false
        availabilityNote = 'Only boosted for fishing encounters.'
      } else {
        multiplier = 4
      }
      break
    case 'moon-ball':
      multiplier = hasMoon ? 3.5 : 1
      availabilityNote = hasMoon ? 'Moon-stone evolution line bonus active.' : 'No moon-stone evolution bonus.'
      break
    case 'friend-ball':
      multiplier = hasFriendship ? 2.5 : 1
      availabilityNote = hasFriendship ? 'Friendship evolution line bonus active.' : 'No friendship evolution bonus.'
      break
    case 'heavy-ball': {
      const heavyMultiplier = getHeavyMultiplier(weightKg)
      if (heavyMultiplier == null) {
        available = false
        availabilityNote = 'Weight data is unavailable for this Pokemon.'
      } else {
        multiplier = heavyMultiplier
        availabilityNote = `Weight bonus active (${multiplier.toFixed(1)}x).`
      }
      break
    }
    case 'fast-ball':
      multiplier = speed >= 100 ? 4 : 1
      availabilityNote = speed >= 100 ? 'Speed bonus active (100+ base speed).' : 'No speed bonus below 100 base speed.'
      break
    case 'love-ball':
      if (targetGenderLabel === 'genderless') {
        available = false
        availabilityNote = 'Love Ball does not work on genderless Pokemon.'
      } else if (targetGenderLabel === 'male-only' || targetGenderLabel === 'female-only') {
        available = false
        availabilityNote = 'Opposite-gender same-species setup is impossible for single-gender Pokemon.'
      } else {
        multiplier = 8
        availabilityNote = '8.0x active with same-species opposite-gender lead (high prep strategy).'
      }
      break
    default:
      multiplier = 1
  }

  if (!available) {
    return createUnavailableCandidate(ball, availabilityNote)
  }

  const quickTurnOneDetails = calculateCatchChanceDetails(context.catchRate, multiplier, 100, 1)
  if (ball.id === 'quick-ball' && quickTurnOneDetails.chance < MIN_QUICK_BALL_CHANCE) {
    return createUnavailableCandidate(ball, `Quick Ball requires at least ${MIN_QUICK_BALL_CHANCE}% catch chance (currently ${formatPercent(quickTurnOneDetails.chance)}).`)
  }

  const price = ball.price == null ? NaN : ball.price
  const effectivePrice = Number.isFinite(price) ? price : 500

  const profileScores = METHOD_PROFILES.map((profile) => {
    const profileMultiplier = (ball.id === 'quick-ball' && profile.id !== 'normal100') ? 1 : multiplier
    const details = calculateCatchChanceDetails(context.catchRate, profileMultiplier, profile.hpPercent, profile.statusMod)
    const chance = details.chance
    const expectedThrows = chance > 0 ? 100 / chance : Number.POSITIVE_INFINITY
    let turns = ball.id === 'timer-ball' ? timerTurn : profile.turns
    if (ball.id === 'love-ball') {
      turns += 2
    }
    const expectedTurnsToSuccess = Number.isFinite(expectedThrows) ? expectedThrows * turns : Number.POSITIVE_INFINITY
    const expectedCost = Number.isFinite(expectedThrows) ? expectedThrows * effectivePrice : Number.POSITIVE_INFINITY
    const costFactor = Math.max(1, effectivePrice / 200)
    const score = chance / (turns + costFactor)

    return {
      profile,
      details,
      chance,
      expectedThrows,
      expectedTurnsToSuccess,
      expectedCost,
      turns,
      score,
      statusMod: profile.statusMod,
      hpPercent: profile.hpPercent,
      multiplier: profileMultiplier,
    }
  })

  const bestProfile = profileScores.sort((a, b) => b.score - a.score)[0]
  const catchDetails = bestProfile.details
  const chance = bestProfile.chance
  const expectedThrows = bestProfile.expectedThrows
  const expectedCost = bestProfile.expectedCost
  const turns = bestProfile.turns
  const expectedTurnsToSuccess = bestProfile.expectedTurnsToSuccess

  let conveniencePenalty = ball.id === 'timer-ball' ? 0.55 : 0
  if (ball.id === 'love-ball') conveniencePenalty += 1.15
  const reliabilityWeight = Math.pow(Math.max(0, chance) / 100, 1.3)
  const lowChancePenalty = chance < 50 ? Math.pow(Math.max(0, chance) / 50, 2.2) : 1
  const denominator = Number.isFinite(expectedCost) && Number.isFinite(expectedTurnsToSuccess)
    ? expectedCost + (expectedTurnsToSuccess * (ironmanMode ? 90 : 140))
    : Number.POSITIVE_INFINITY
  const efficiency = Number.isFinite(expectedCost)
    ? ((reliabilityWeight * lowChancePenalty * 100000) / denominator) - conveniencePenalty
    : -Infinity

  return {
    ballId: ball.id,
    ball: ball.name,
    available,
    availabilityNote,
    multiplier,
    chance,
    expectedThrows,
    expectedCost,
    turns,
    expectedTurnsToSuccess,
    efficiency,
    catchValue: catchDetails.value,
    rawCatchValue: catchDetails.rawValue,
    hpMultiplier: catchDetails.hpMultiplier,
    hpPercent: bestProfile.hpPercent,
    statusMod: bestProfile.statusMod,
    methodLabel: bestProfile.profile.label,
    catchRate: context.catchRate,
    price: Number.isFinite(price) ? price : null,
  }
}

function pickBestLongTermRepeat(candidates) {
  const repeat = candidates.find((candidate) => candidate.ballId === 'repeat-ball')
  if (!repeat) return null

  return repeat
}

function getRepeatThreshold(context, baselineBestEfficiency) {
  for (let streak = 1; streak <= 30; streak += 1) {
    const repeatCandidate = getBallCandidate(
      BALLS.find((ball) => ball.id === 'repeat-ball'),
      { ...context, repeatStreak: streak }
    )
    if (!repeatCandidate || !repeatCandidate.available) continue
    if (repeatCandidate.efficiency >= baselineBestEfficiency) {
      return streak
    }
  }
  return null
}

function buildPokemonRecommendation(pokemonName, routeEntry, options, routeEncounterIndex, period) {
  const pokemon = pokemonData[pokemonName]
  if (!pokemon) return null

  const isSafari = options.forceSafari || isSafariRoute(routeEntry.routeName)
  const safariCatchData = isSafari ? getSafariCatchData(pokemonName) : null
  const catchRate = isSafari
    ? Number(safariCatchData?.catchRate)
    : (options.alphaMode ? 10 : getCatchRateByName(pokemonName))
  if (!Number.isFinite(catchRate)) return null

  const encounterContext = getEncounterContext(routeEntry, pokemonName, routeEncounterIndex)
  const level = Number.isFinite(options.customLevel) ? options.customLevel : encounterContext.level
  const types = Array.isArray(pokemon.types) ? pokemon.types : []
  const speed = getSpeedStat(pokemon)
  const weightKg = getWeightKg(pokemon)
  const hasMoon = hasMoonStoneEvolution(pokemon)
  const hasFriendship = hasFriendshipEvolution(pokemon)
  const genderRatios = getGenderRatios(pokemon)
  const isNight = options.forceNight || period === 'Night'
  const isWater = encounterContext.variationCategory === 'fishing'
    || encounterContext.variationCategory === 'water'
    || encounterContext.encounterTypes.some((entry) => isWaterMethod(entry))
  const isBuilding = options.forceIndoor || isBuildingRoute(routeEntry.routeName)
  const finalIsWater = options.forceWater || isWater

  const calcContext = {
    catchRate,
    level,
    types,
    speed,
    weightKg,
    hasMoon,
    hasFriendship,
    isNight,
    isBuilding,
    isWater: finalIsWater,
    isSafari,
    safariCatchData,
    apricornEnabled: options.ironmanMode ? new Set() : options.apricornEnabled,
    repeatStreak: 0,
    ironmanMode: options.ironmanMode,
    timerTargetTurn: TIMER_TARGET_TURN,
    targetGenderLabel: getGenderLabel(genderRatios),
  }

  const candidates = BALLS.map((ball) => getBallCandidate(ball, calcContext))

  const available = candidates.filter((candidate) => candidate.available)
  if (!available.length) {
    return {
      pokemonName,
      routeName: routeEntry.displayName,
      level,
      encounterPercent: routeEntry.pokemonPercents.get(normalizePokemonName(pokemonName))?.percent || 0,
      bestOverall: null,
      cheapest: null,
      fastest: null,
      highestCatch: null,
      selected: null,
      longTerm: null,
      repeatThreshold: null,
      analysis: candidates,
      avgCost: Number.POSITIVE_INFINITY,
      avgTurns: 0,
      avgChance: 0,
      explanation: 'No available balls with current filter settings.',
      genderRatios,
      eggGroups: pokemon.egg_groups || [],
      catchRate,
    }
  }

  const cheapestPool = available.filter((candidate) => candidate.chance >= MIN_CHEAPEST_CHANCE)
  const nonTimerCheapestPool = cheapestPool.filter((candidate) => candidate.ballId !== 'timer-ball')
  const timerCheapestPool = cheapestPool.filter((candidate) => candidate.ballId === 'timer-ball')
  const cheapest = [...(nonTimerCheapestPool.length ? nonTimerCheapestPool : timerCheapestPool)]
    .sort((a, b) => a.expectedCost - b.expectedCost)[0] || null
  const fastest = [...available].sort((a, b) => a.expectedTurnsToSuccess - b.expectedTurnsToSuccess || b.chance - a.chance)[0]
  const highestCatch = [...available].sort((a, b) => b.chance - a.chance || a.expectedCost - b.expectedCost)[0]

  const bestOverall = getBestOverallDexStyle(available, catchRate) || highestCatch

  let selected = bestOverall
  if (options.priority === PRIORITY_CHEAPEST && cheapest) selected = cheapest
  if (options.priority === PRIORITY_FASTEST) selected = fastest
  if (options.priority === PRIORITY_HIGHEST) selected = highestCatch

  const repeatBall = pickBestLongTermRepeat(available)
  const repeatThreshold = getRepeatThreshold(calcContext, bestOverall.efficiency)

  const explanation = selected === bestOverall
    ? `${selected.ball} is the best overall value for this setup.`
    : `${selected.ball} is selected because your priority is ${getPriorityLabel(options.priority)}.`

  return {
    pokemonName,
    routeName: routeEntry.displayName,
    level,
    encounterPercent: routeEntry.pokemonPercents.get(normalizePokemonName(pokemonName))?.percent || 0,
    bestOverall,
    cheapest,
    fastest,
    highestCatch,
    selected,
    longTerm: repeatBall,
    repeatThreshold,
    analysis: candidates.sort((a, b) => b.chance - a.chance || a.expectedCost - b.expectedCost),
    avgCost: selected.expectedCost,
    avgTurns: selected.expectedTurnsToSuccess,
    avgChance: selected.chance,
    explanation,
    genderRatios,
    eggGroups: pokemon.egg_groups || [],
    catchRate,
  }
}

function routeScore(parts) {
  const chanceScore = Math.min(100, parts.avgChance)
  const turnsScore = Math.max(0, 100 - (parts.avgTurns - 1) * 22)
  const costScore = Math.max(0, 100 - (parts.avgCost / 25))
  const encounterScore = Math.min(100, parts.avgEncounterPercent * 2.5)

  return (
    (costScore * 0.34)
    + (chanceScore * 0.28)
    + (turnsScore * 0.2)
    + (encounterScore * 0.18)
  )
}

function getGenderWeight(genderRatios, genderPriority) {
  if (genderPriority === GENDER_IGNORE || genderRatios.genderless) return 1
  if (genderPriority === GENDER_FEMALE) return 0.5 + genderRatios.female
  return 0.5 + genderRatios.male
}

function buildRouteRanking({
  routes,
  options,
  routeEncounterIndex,
  period,
  mode,
  pokemonTarget,
  eggGroupTarget,
}) {
  const pokemonTargets = getPokemonSearchTargets(pokemonTarget)
  const normalizedEggGroupTarget = normalizeKey(eggGroupTarget)

  const ranked = routes.map((routeEntry) => {
    if (mode === MODE_EGG && isEggGroupExcludedRoute(routeEntry)) {
      return {
        routeEntry,
        recommendations: [],
        score: -1,
        summary: null,
      }
    }

    const routePokemonNames = Array.from(routeEntry.pokemonPercents.keys())
      .map((key) => POKEMON_NAME_BY_SLUG[key])
      .filter(Boolean)

    const recommendations = routePokemonNames
      .map((pokemonName) => buildPokemonRecommendation(pokemonName, routeEntry, options, routeEncounterIndex, period))
      .filter(Boolean)
      .filter((result) => {
        if (mode === MODE_POKEMON) {
          return pokemonTargets.has(normalizeKey(result.pokemonName))
        }
        if (mode === MODE_EGG) {
          return (result.eggGroups || []).some((group) => normalizeKey(group) === normalizedEggGroupTarget)
        }
        return true
      })

    if (!recommendations.length) {
      return {
        routeEntry,
        recommendations: [],
        score: -1,
        summary: null,
      }
    }

    const totalWeight = recommendations.reduce((sum, rec) => sum + Math.max(0.01, rec.encounterPercent), 0)
    const weighted = recommendations.reduce((acc, rec) => {
      const w = Math.max(0.01, rec.encounterPercent) / totalWeight
      const genderWeight = mode === MODE_EGG ? getGenderWeight(rec.genderRatios, options.genderPriority) : 1
      acc.avgCost += rec.avgCost * w
      acc.avgTurns += rec.avgTurns * w
      acc.avgChance += rec.avgChance * w
      acc.avgEncounterPercent += rec.encounterPercent * w
      acc.genderWeight += genderWeight * w
      return acc
    }, {
      avgCost: 0,
      avgTurns: 0,
      avgChance: 0,
      avgEncounterPercent: 0,
      genderWeight: 1,
    })

    let score = routeScore(weighted)
    if (mode === MODE_EGG) {
      score *= weighted.genderWeight
      score = Math.min(100, score)
    }

    return {
      routeEntry,
      recommendations,
      score,
      summary: weighted,
    }
  })

  return ranked
    .filter((entry) => entry.recommendations.length > 0)
    .sort((a, b) => {
      if (mode === MODE_EGG) {
        const chanceGap = Math.abs((b.summary?.avgChance || 0) - (a.summary?.avgChance || 0))
        if (chanceGap <= SIMILAR_CATCH_GAP_PERCENT) {
          const recommendationGap = b.recommendations.length - a.recommendations.length
          if (recommendationGap !== 0) return recommendationGap
        }
      }

      if (b.score !== a.score) return b.score - a.score

      const avgChanceGap = (b.summary?.avgChance || 0) - (a.summary?.avgChance || 0)
      if (avgChanceGap !== 0) return avgChanceGap

      return b.recommendations.length - a.recommendations.length
    })
}

function buildSpecificPokemonSelection({
  routes,
  pokemonName,
  selectedRouteId,
  options,
  routeEncounterIndex,
  period,
  customLevel,
  alphaMode,
}) {
  const routePool = selectedRouteId
    ? routes.filter((route) => route.id === selectedRouteId)
    : routes.filter((route) => route.pokemonPercents.has(normalizePokemonName(pokemonName)))

  if (!routePool.length) return null

  const rankedRoutes = routePool
    .map((routeEntry) => {
      const syntheticRoute = {
        ...routeEntry,
        id: `custom-single-analysis-${routeEntry.id}`,
        pokemonPercents: new Map([[normalizePokemonName(pokemonName), { percent: 100 }]]),
      }

      const recommendation = buildPokemonRecommendation(pokemonName, syntheticRoute, {
        ...options,
        customLevel,
        alphaMode,
      }, routeEncounterIndex, period)

      if (!recommendation?.selected) return null

      return {
        routeEntry,
        result: recommendation,
        score: routeScore({
          avgCost: recommendation.avgCost,
          avgTurns: recommendation.avgTurns,
          avgChance: recommendation.avgChance,
          avgEncounterPercent: 100,
        }),
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || b.result.avgChance - a.result.avgChance)

  if (!rankedRoutes.length) return null

  return {
    ...rankedRoutes[0],
    routeWasAutoSelected: !selectedRouteId,
  }
}

function getDisplayPercentLabel(routeEntry, pokemonName) {
  const slug = normalizePokemonName(pokemonName)
  const info = routeEntry.pokemonPercents.get(slug)
  if (!info) return '0.0%'
  return formatPercent(info.percent)
}

function buildComparisonRows(result, priority) {
  return [
    { key: PRIORITY_OVERALL, label: 'Best Overall', value: result.bestOverall ? `${result.bestOverall.ball} (${formatPercent(result.bestOverall.chance)})` : 'N/A' },
    { key: PRIORITY_CHEAPEST, label: 'Cheapest', value: result.cheapest ? `${result.cheapest.ball} (${formatMoney(result.cheapest.expectedCost)})` : 'N/A' },
    { key: PRIORITY_FASTEST, label: 'Fastest', value: result.fastest ? `${result.fastest.ball} (${formatExpectedTurns(result.fastest.expectedTurnsToSuccess)})` : 'N/A' },
    { key: PRIORITY_HIGHEST, label: 'Highest Catch Chance', value: result.highestCatch ? `${result.highestCatch.ball} (${formatPercent(result.highestCatch.chance)})` : 'N/A' },
  ].filter((entry) => entry.key !== priority)
}

export default function CatchingCalculator() {
  const { period } = useInGameClock()

  const [mode, setMode] = useState(MODE_ROUTE)
  const [selectedRoute, setSelectedRoute] = useState('')
  const [routeEncounterMethod, setRouteEncounterMethod] = useState(METHOD_NORMAL)
  const [routeSearch, setRouteSearch] = useState('')
  const [pokemonSearch, setPokemonSearch] = useState('')
  const [eggGroupSearch, setEggGroupSearch] = useState('')
  const [specificPokemonSearch, setSpecificPokemonSearch] = useState('')
  const [specificRouteSearch, setSpecificRouteSearch] = useState('')
  const [specificRouteId, setSpecificRouteId] = useState('')
  const [specificLevel, setSpecificLevel] = useState(30)
  const [specificAlpha, setSpecificAlpha] = useState(false)
  const [activeBreakdownKey, setActiveBreakdownKey] = useState('')
  const [showMoreCount, setShowMoreCount] = useState(1)

  const [apricornEnabled, setApricornEnabled] = useState(() => new Set())
  const [ironmanMode, setIronmanMode] = useState(false)
  const [forceNight, setForceNight] = useState(false)
  const [priority, setPriority] = useState(PRIORITY_OVERALL)
  const [genderPriority, setGenderPriority] = useState(GENDER_MALE)

  const enableAllApricornBalls = () => setApricornEnabled(createApricornSelection(APRICORN_BALL_IDS))
  const disableAllApricornBalls = () => setApricornEnabled(createApricornSelection([]))

  useDocumentHead({
    title: 'Catching Calculator - Team Synergy',
    description: 'Plan the fastest and most cost-efficient catch strategy by route, Pokemon, or egg group in PokeMMO.',
    canonicalPath: '/catching-calculator/',
  })

  const routeEncounterIndex = useMemo(() => buildRouteEncounterIndex(), [])

  const allRoutes = useMemo(() => buildAllRouteUniverse(routeEncounterMethod), [routeEncounterMethod])

  const pokemonNames = useMemo(
    () => POKEMON_VALUES
      .map((pokemon) => formatPokemonDisplayName(pokemon.name))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b)),
    []
  )

  const eggGroups = useMemo(() => {
    const set = new Set()
    POKEMON_VALUES.forEach((pokemon) => {
      const groups = Array.isArray(pokemon.egg_groups) ? pokemon.egg_groups : []
      groups.forEach((group) => set.add(titleCase(group)))
    })

    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [])

  const options = useMemo(() => ({
    apricornEnabled,
    priority,
    genderPriority,
    ironmanMode,
    forceNight,
  }), [
    apricornEnabled,
    priority,
    genderPriority,
    ironmanMode,
    forceNight,
  ])

  useEffect(() => {
    if (specificAlpha && priority !== PRIORITY_HIGHEST) {
      setPriority(PRIORITY_HIGHEST)
    }
  }, [specificAlpha, priority])

  useEffect(() => {
    if (!specificRouteId) return

    const selectedSpecificRoute = allRoutes.find((route) => route.id === specificRouteId)
    const canonicalName = getCanonicalPokemonName(specificPokemonSearch)

    setSpecificLevel(getSpecificRouteLevel(selectedSpecificRoute, canonicalName, routeEncounterIndex))
  }, [specificRouteId, specificPokemonSearch, allRoutes, routeEncounterIndex])

  const customPokemonSelection = useMemo(() => {
    const canonicalName = getCanonicalPokemonName(specificPokemonSearch)
    if (!canonicalName) return null

    return buildSpecificPokemonSelection({
      routes: allRoutes,
      pokemonName: canonicalName,
      selectedRouteId: specificRouteId,
      options,
      routeEncounterIndex,
      period,
      customLevel: Math.max(1, Number(specificLevel) || 1),
      alphaMode: specificAlpha,
    })
  }, [specificPokemonSearch, specificRouteId, specificLevel, specificAlpha, allRoutes, options, routeEncounterIndex, period])

  const customPokemonResult = customPokemonSelection?.result || null
  const customPokemonRouteEntry = customPokemonSelection?.routeEntry || null

  const selectedRouteEntry = useMemo(
    () => allRoutes.find((route) => route.id === selectedRoute) || null,
    [allRoutes, selectedRoute]
  )

  const routeOptions = useMemo(
    () => allRoutes
      .map((route) => ({
        id: route.id,
        label: `${route.region} - ${route.displayName}`,
        routeName: route.displayName,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [allRoutes]
  )

  const filteredRouteOptions = useMemo(() => {
    const query = normalizeKey(routeSearch)
    if (query.length < ROUTE_SUGGESTION_MIN_CHARS) return []
    return routeOptions
      .filter((option) => normalizeKey(option.label).includes(query))
      .slice(0, MAX_SUGGESTIONS)
  }, [routeOptions, routeSearch])

  const filteredSpecificRouteOptions = useMemo(() => {
    const query = normalizeKey(specificRouteSearch)
    if (query.length < ROUTE_SUGGESTION_MIN_CHARS) return []
    return routeOptions
      .filter((option) => normalizeKey(option.label).includes(query))
      .slice(0, MAX_SUGGESTIONS)
  }, [routeOptions, specificRouteSearch])

  const filteredPokemonOptions = useMemo(() => {
    const query = normalizeKey(pokemonSearch)
    if (query.length < POKEMON_SUGGESTION_MIN_CHARS) return []
    return pokemonNames
      .filter((name) => normalizeKey(name).includes(query))
      .slice(0, MAX_SUGGESTIONS)
  }, [pokemonNames, pokemonSearch])

  const filteredSpecificPokemonOptions = useMemo(() => {
    const query = normalizeKey(specificPokemonSearch)
    if (query.length < POKEMON_SUGGESTION_MIN_CHARS) return []
    return pokemonNames
      .filter((name) => normalizeKey(name).includes(query))
      .slice(0, MAX_SUGGESTIONS)
  }, [pokemonNames, specificPokemonSearch])

  const specificRouteEntry = useMemo(
    () => allRoutes.find((route) => route.id === specificRouteId) || null,
    [allRoutes, specificRouteId]
  )

  useEffect(() => {
    if (!selectedRouteEntry) return
    const label = `${selectedRouteEntry.region} - ${selectedRouteEntry.displayName}`
    setRouteSearch(label)
  }, [selectedRouteEntry?.id])

  function handleRoutePick(value) {
    setRouteSearch(value)
    const exact = routeOptions.find((option) => normalizeKey(option.label) === normalizeKey(value))
    if (exact) {
      setSelectedRoute(exact.id)
    } else {
      setSelectedRoute('')
    }
  }

  function handleSpecificRoutePick(value) {
    setSpecificRouteSearch(value)
    const exact = routeOptions.find((option) => normalizeKey(option.label) === normalizeKey(value))
    if (exact) {
      setSpecificRouteId(exact.id)
    } else {
      setSpecificRouteId('')
    }
  }

  const routeRecommendations = useMemo(() => {
    if (!selectedRouteEntry) return []

    const pokemonList = Array.from(selectedRouteEntry.pokemonPercents.keys())
      .map((slug) => POKEMON_NAME_BY_SLUG[slug])
      .filter(Boolean)
      .map((pokemonName) => buildPokemonRecommendation(pokemonName, selectedRouteEntry, options, routeEncounterIndex, period))
      .filter(Boolean)
      .sort((a, b) => b.encounterPercent - a.encounterPercent)

    return pokemonList
  }, [selectedRouteEntry, options, routeEncounterIndex, period])

  const rankedRoutes = useMemo(() => {
    if (mode === MODE_ROUTE || mode === MODE_SPECIFIC) return []
    if (mode === MODE_POKEMON && !pokemonSearch.trim()) return []
    if (mode === MODE_EGG && !eggGroupSearch.trim()) return []

    const ranked = buildRouteRanking({
      routes: allRoutes,
      options,
      routeEncounterIndex,
      period,
      mode,
      pokemonTarget: pokemonSearch,
      eggGroupTarget: eggGroupSearch,
    })

    return ranked
  }, [mode, pokemonSearch, eggGroupSearch, allRoutes, options, routeEncounterIndex, period])

  const visibleRankedRoutes = rankedRoutes.slice(0, showMoreCount)
  const activeRouteBreakdown = useMemo(() => {
    if (!activeBreakdownKey) return null
    return routeRecommendations.find((entry) => `${selectedRouteEntry?.id || ''}|${entry.pokemonName}` === activeBreakdownKey) || null
  }, [activeBreakdownKey, routeRecommendations, selectedRouteEntry?.id])
  const activeRankedRouteBreakdown = useMemo(() => {
    if (!activeBreakdownKey) return null

    for (const entry of rankedRoutes) {
      const match = entry.recommendations.find((result) => `${entry.routeEntry.id}|${result.pokemonName}` === activeBreakdownKey)
      if (match) {
        return {
          ...match,
          routeEntry: entry.routeEntry,
        }
      }
    }

    return null
  }, [activeBreakdownKey, rankedRoutes])
  const selectedPriorityLabel = getPriorityLabel(priority)

  return (
    <div className={styles.page}>
      <h1 className="page-title">Catching Calculator</h1>

      <section className={styles.controlsCard}>
        <div className={styles.modeTabs} role="tablist" aria-label="Search mode">
          <button
            type="button"
            className={`${styles.modeTab} ${mode === MODE_ROUTE ? styles.modeTabActive : ''}`}
            onClick={() => {
              setMode(MODE_ROUTE)
              setShowMoreCount(1)
            }}
          >
            Route Search
          </button>
          <button
            type="button"
            className={`${styles.modeTab} ${mode === MODE_POKEMON ? styles.modeTabActive : ''}`}
            onClick={() => {
              setMode(MODE_POKEMON)
              setShowMoreCount(1)
            }}
          >
            Pokemon Search
          </button>
          <button
            type="button"
            className={`${styles.modeTab} ${mode === MODE_EGG ? styles.modeTabActive : ''}`}
            onClick={() => {
              setMode(MODE_EGG)
              setShowMoreCount(1)
            }}
          >
            Egg Group Search
          </button>
          <button
            type="button"
            className={`${styles.modeTab} ${mode === MODE_SPECIFIC ? styles.modeTabActive : ''}`}
            onClick={() => {
              setMode(MODE_SPECIFIC)
              setShowMoreCount(1)
            }}
          >
            Specific Mon Search
          </button>
        </div>

        <div className={styles.controlGrid}>
          {mode === MODE_ROUTE && (
            <label className={styles.controlField}>
              <span>Route</span>
              <input
                type="text"
                list="catch-calc-route-list"
                value={routeSearch}
                onChange={(event) => handleRoutePick(event.target.value)}
                placeholder="Search route (e.g. Route 24, Viridian Forest)"
              />
              <datalist id="catch-calc-route-list">
                {filteredRouteOptions.map((route) => (
                  <option key={route.id} value={route.label} />
                ))}
              </datalist>
              <span className={styles.selectionHint}>
                Select one of the suggested routes to load calculations.
              </span>
            </label>
          )}

          {mode === MODE_ROUTE && (
            <label className={styles.controlField}>
              <span>Encounter Method</span>
              <select value={routeEncounterMethod} onChange={(event) => setRouteEncounterMethod(event.target.value)}>
                <option value={METHOD_NORMAL}>Normal Encounters</option>
                <option value={METHOD_FISHING}>Fishing</option>
                <option value={METHOD_SURFING}>Surfing</option>
              </select>
            </label>
          )}

          {mode === MODE_POKEMON && (
            <label className={styles.controlField}>
              <span>Pokemon</span>
              <input
                type="text"
                list="catch-calc-pokemon-list-main"
                value={pokemonSearch}
                onChange={(event) => {
                  setPokemonSearch(event.target.value)
                  setShowMoreCount(1)
                }}
                placeholder="Search a Pokemon"
              />
              <datalist id="catch-calc-pokemon-list-main">
                {filteredPokemonOptions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </label>
          )}

          {mode === MODE_EGG && (
            <label className={styles.controlField}>
              <span>Egg Group</span>
              <select
                value={eggGroupSearch}
                onChange={(event) => {
                  setEggGroupSearch(event.target.value)
                  setShowMoreCount(1)
                }}
              >
                <option value="">Select egg group</option>
                {eggGroups.map((group) => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </label>
          )}

          {mode === MODE_SPECIFIC && (
            <>
              <label className={styles.controlField}>
                <span>Pokemon</span>
                <input
                  type="text"
                  list="catch-calc-pokemon-list-specific"
                  value={specificPokemonSearch}
                  onChange={(event) => setSpecificPokemonSearch(event.target.value)}
                  placeholder="Type exact Pokemon name"
                />
                <datalist id="catch-calc-pokemon-list-specific">
                  {filteredSpecificPokemonOptions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </label>

              <label className={styles.controlField}>
                <span>Route Location</span>
                <input
                  type="text"
                  list="catch-calc-specific-route-list"
                  value={specificRouteSearch}
                  onChange={(event) => handleSpecificRoutePick(event.target.value)}
                  placeholder="Optional: type and select route"
                />
                <datalist id="catch-calc-specific-route-list">
                  {filteredSpecificRouteOptions.map((route) => (
                    <option key={`specific-${route.id}`} value={route.label} />
                  ))}
                </datalist>
                <span className={styles.selectionHint}>
                  Leave blank to auto-pick the best route for this Pokemon.
                </span>
              </label>

              <label className={styles.controlField}>
                <span>Pokemon Level</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={specificLevel}
                  onChange={(event) => setSpecificLevel(Number(event.target.value) || 1)}
                />
              </label>

              <label className={styles.controlField}>
                <span>Variant</span>
                <select value={specificAlpha ? 'alpha' : 'normal'} onChange={(event) => setSpecificAlpha(event.target.value === 'alpha')}>
                  <option value="normal">Normal</option>
                  <option value="alpha">Alpha (catch rate 10)</option>
                </select>
              </label>
            </>
          )}

          {mode === MODE_EGG && (
            <label className={styles.controlField}>
              <span>Gender Priority</span>
              <select
                value={genderPriority}
                onChange={(event) => {
                  setGenderPriority(event.target.value)
                  setShowMoreCount(1)
                }}
              >
                <option value={GENDER_MALE}>Male Priority</option>
                <option value={GENDER_FEMALE}>Female Priority</option>
                <option value={GENDER_IGNORE}>Ignore Gender</option>
              </select>
            </label>
          )}

          <label className={styles.controlField}>
            <span>Recommendation Priority</span>
            <select value={priority} onChange={(event) => setPriority(event.target.value)}>
              <option value={PRIORITY_OVERALL}>Best Overall</option>
              <option value={PRIORITY_CHEAPEST}>Cheapest</option>
              <option value={PRIORITY_FASTEST}>Fastest</option>
              <option value={PRIORITY_HIGHEST}>Highest Catch Chance</option>
            </select>
          </label>
        </div>

        <div className={styles.toggleGrid}>
          <label><input type="checkbox" checked={ironmanMode} onChange={(e) => setIronmanMode(e.target.checked)} /> Ironman Mode (cost-first, apricorn disabled)</label>
          <label><input type="checkbox" checked={forceNight} onChange={(e) => setForceNight(e.target.checked)} /> Force Night Time (Dusk Ball override)</label>
          <details className={styles.apricornDropdown}>
            <summary className={styles.apricornDropdownSummary}>
              Apricorn Balls
              <span className={styles.apricornDropdownCount}>
                {apricornEnabled.size}/{APRICORN_BALL_IDS.length} enabled
              </span>
            </summary>
            <div className={styles.apricornDropdownPanel}>
              <div className={styles.apricornDropdownHeader}>
                <p className={styles.apricornDropdownHint}>
                  Choose which Apricorn Balls can be considered by the calculator.
                </p>
                <div className={styles.apricornButtonRow}>
                  <button type="button" onClick={enableAllApricornBalls} disabled={ironmanMode} className={styles.apricornActionButton}>
                    Enable All
                  </button>
                  <button type="button" onClick={disableAllApricornBalls} disabled={ironmanMode} className={styles.apricornActionButton}>
                    Disable All
                  </button>
                </div>
              </div>
              <div className={styles.apricornBallList}>
                {APRICORN_BALL_IDS.map((ballId) => {
                  const ballMeta = BALLS.find((ball) => ball.id === ballId)
                  const checked = apricornEnabled.has(ballId)
                  return (
                    <label key={ballId} className={styles.apricornBallItem}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={ironmanMode}
                        onChange={(e) => {
                          const next = new Set(apricornEnabled)
                          if (e.target.checked) next.add(ballId)
                          else next.delete(ballId)
                          setApricornEnabled(next)
                        }}
                      />
                      <span>Enable {ballMeta?.name}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </details>
        </div>

        <p className={styles.helperText}>
          Current in-game period: <strong>{period}</strong>.  Quick Ball is only considered at 90%+ turn-1 chance, Timer Balls are the last resort, Dusk Balls only considered if currently night or if forced.
        </p>
      </section>

      {mode === MODE_ROUTE && selectedRouteEntry && (
        <section className={styles.resultsSection}>
          <h2>{selectedRouteEntry.region} - {selectedRouteEntry.displayName}</h2>
          <p className={styles.routeMeta}>Recommendations are weighted for expected cost per successful catch, expected time-to-success, and catch chance.</p>

          {activeRouteBreakdown && (
            <article className={styles.breakdownOverlay}>
              <div className={styles.breakdownOverlayHeader}>
                <h3>{formatPokemonDisplayName(activeRouteBreakdown.pokemonName)} Ball Breakdown</h3>
                <button type="button" className={styles.closeBreakdownButton} onClick={() => setActiveBreakdownKey('')}>Close</button>
              </div>
              <p className={styles.routeMeta}>
                Catch Formula: chance% = (min(255, floor(((300 - 2 x HP%) / 300) x BallMultiplier x CatchRate x StatusMod)) / 255) x 100
              </p>
              <p className={styles.routeMeta}>
                Each ball is scored across 4 setups (100% HP, 1% HP, 100% HP + sleep, 1% HP + sleep). The best setup per ball is used for recommendations. {formatPokemonDisplayName(activeRouteBreakdown.pokemonName)} catch rate = {activeRouteBreakdown.catchRate}.
              </p>

              <div className={styles.largeTableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Ball</th>
                      <th>Modifier</th>
                      <th>Catch Value</th>
                      <th>Catch %</th>
                      <th>HP%</th>
                      <th>Status</th>
                      <th>Expected Throws</th>
                      <th>Expected Turns</th>
                      <th>Price</th>
                      <th>Expected Cost</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeRouteBreakdown.analysis.map((entry) => (
                      <tr key={`overlay-${activeRouteBreakdown.pokemonName}-${entry.ballId}`} className={!entry.available ? styles.unavailableRow : ''}>
                        <td>{entry.ball}</td>
                        <td>{entry.multiplier.toFixed(1)}x</td>
                        <td>{entry.catchValue}</td>
                        <td>{formatPercent(entry.chance)}</td>
                        <td>{entry.hpPercent}</td>
                        <td>{entry.statusMod.toFixed(1)}x</td>
                        <td>{formatTurns(entry.expectedThrows)}</td>
                        <td>{formatTurns(entry.expectedTurnsToSuccess)}</td>
                        <td>{entry.price == null ? 'N/A' : formatMoney(entry.price)}</td>
                        <td>{formatMoney(entry.expectedCost)}</td>
                        <td>{entry.available ? entry.availabilityNote : `Not viable - ${entry.availabilityNote}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          )}

          <div className={styles.pokemonGrid}>
            {routeRecommendations.map((result) => (
              <article key={`${selectedRouteEntry.id}-${result.pokemonName}`} className={styles.pokemonCard}>
                <Link to={`/pokemon/${normalizePokemonName(result.pokemonName)}/`} className={styles.pokemonHeader}>
                  <img
                    src={getLocalPokemonGif(result.pokemonName)}
                    alt={formatPokemonDisplayName(result.pokemonName)}
                    onError={onGifError(result.pokemonName, false)}
                    loading="lazy"
                  />
                  <div>
                    <h3>{formatPokemonDisplayName(result.pokemonName)}</h3>
                    <p>Encounter: {getDisplayPercentLabel(selectedRouteEntry, result.pokemonName)}</p>
                    <p>Estimated level: {result.level}</p>
                    <p>Catch rate: {result.catchRate}</p>
                  </div>
                </Link>

                {result.selected ? (
                  <>
                    <section className={styles.featuredRecommendation}>
                      <div className={styles.featuredRecommendationHeader}>
                        <span className={styles.featuredRecommendationLabel}>{selectedPriorityLabel}:</span>
                        <strong className={styles.featuredRecommendationChoice}>{result.selected.ball} <span>{formatPercent(result.selected.chance)}</span></strong>
                      </div>
                      <div className={styles.featuredRecommendationStats}>
                        <div>
                          <span>Expected Cost</span>
                          <strong>{formatMoney(result.selected.expectedCost)}</strong>
                        </div>
                        <div>
                          <span>Expected Turns</span>
                          <strong>{formatExpectedTurns(result.selected.expectedTurnsToSuccess)}</strong>
                        </div>
                      </div>
                    </section>
                    {buildComparisonRows(result, priority).map((entry) => (
                      <div key={`${result.pokemonName}-${entry.key}`} className={styles.recommendationLine}>
                        <span>{entry.label}</span>
                        <strong>{entry.value}</strong>
                      </div>
                    ))}
                    <p className={styles.explanation}>{result.explanation}</p>
                    {result.longTerm && (
                      <p className={styles.longTerm}>
                        Long-term option: {result.longTerm.ball}
                        {result.repeatThreshold ? ` (becomes top value after ${result.repeatThreshold} same-species catches).` : '.'}
                      </p>
                    )}
                    <button
                      type="button"
                      className={styles.showBreakdownButton}
                      onClick={() => setActiveBreakdownKey(`${selectedRouteEntry.id}|${result.pokemonName}`)}
                    >
                      Open Full Ball Breakdown
                    </button>
                  </>
                ) : (
                  <p className={styles.explanation}>No strategy could be evaluated with the current filters.</p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {mode === MODE_ROUTE && !selectedRouteEntry && (
        <section className={styles.resultsSection}>
          <h2>Route Search</h2>
          <p className={styles.routeMeta}>Type a route and click a suggested entry to view recommendations. Current method: {routeEncounterMethod}.</p>
        </section>
      )}

      {(mode === MODE_POKEMON || mode === MODE_EGG) && (
        <section className={styles.resultsSection}>
          <h2>{mode === MODE_POKEMON ? 'Best Routes' : 'Egg Group Route Rankings'}</h2>

          {activeRankedRouteBreakdown && (
            <article className={styles.breakdownOverlay}>
              <div className={styles.breakdownOverlayHeader}>
                <h3>{formatPokemonDisplayName(activeRankedRouteBreakdown.pokemonName)} Ball Breakdown</h3>
                <button type="button" className={styles.closeBreakdownButton} onClick={() => setActiveBreakdownKey('')}>Close</button>
              </div>
              <p className={styles.routeMeta}>
                Route: {activeRankedRouteBreakdown.routeEntry.region} - {activeRankedRouteBreakdown.routeEntry.displayName}
              </p>
              <p className={styles.routeMeta}>
                Catch Formula: chance% = (min(255, floor(((300 - 2 x HP%) / 300) x BallMultiplier x CatchRate x StatusMod)) / 255) x 100
              </p>
              <p className={styles.routeMeta}>
                Each ball is scored across 4 setups (100% HP, 1% HP, 100% HP + sleep, 1% HP + sleep). The best setup per ball is used for recommendations. {formatPokemonDisplayName(activeRankedRouteBreakdown.pokemonName)} catch rate = {activeRankedRouteBreakdown.catchRate}.
              </p>

              <div className={styles.largeTableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Ball</th>
                      <th>Modifier</th>
                      <th>Catch Value</th>
                      <th>Catch %</th>
                      <th>HP%</th>
                      <th>Status</th>
                      <th>Expected Throws</th>
                      <th>Expected Turns</th>
                      <th>Price</th>
                      <th>Expected Cost</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeRankedRouteBreakdown.analysis.map((entry) => (
                      <tr key={`overlay-${activeRankedRouteBreakdown.routeEntry.id}-${activeRankedRouteBreakdown.pokemonName}-${entry.ballId}`} className={!entry.available ? styles.unavailableRow : ''}>
                        <td>{entry.ball}</td>
                        <td>{entry.multiplier.toFixed(1)}x</td>
                        <td>{entry.catchValue}</td>
                        <td>{formatPercent(entry.chance)}</td>
                        <td>{entry.hpPercent}</td>
                        <td>{entry.statusMod.toFixed(1)}x</td>
                        <td>{formatTurns(entry.expectedThrows)}</td>
                        <td>{formatTurns(entry.expectedTurnsToSuccess)}</td>
                        <td>{entry.price == null ? 'N/A' : formatMoney(entry.price)}</td>
                        <td>{formatMoney(entry.expectedCost)}</td>
                        <td>{entry.available ? entry.availabilityNote : `Not viable - ${entry.availabilityNote}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          )}

          {rankedRoutes.length === 0 ? (
            <p className={styles.routeMeta}>No routes found for the current search.</p>
          ) : (
            <div className={styles.routeRankList}>
              {visibleRankedRoutes.map((entry, index) => {
                const topRec = entry.recommendations[0]
                return (
                  <article key={entry.routeEntry.id} className={styles.routeRankCard}>
                    <div className={styles.routeRankHeader}>
                      <h3>{index + 1}. {entry.routeEntry.region} - {entry.routeEntry.displayName}</h3>
                      <span>{toStarLabel(entry.score)}</span>
                    </div>
                    <div className={styles.routeSummaryGrid}>
                      <p>Efficiency: <strong>{entry.score.toFixed(1)}/100</strong></p>
                      <p>Expected Cost: <strong>{formatMoney(entry.summary?.avgCost || 0)}</strong></p>
                      <p>Average Turns: <strong>{formatTurns(entry.summary?.avgTurns || 0)}</strong></p>
                      <p>Average Catch: <strong>{formatPercent(entry.summary?.avgChance || 0)}</strong></p>
                    </div>

                    {topRec?.selected && (
                      <p className={styles.routeMeta}>
                        Top strategy sample: {formatPokemonDisplayName(topRec.pokemonName)} with {topRec.selected.ball} ({formatPercent(topRec.selected.chance)}).
                      </p>
                    )}

                    <details className={styles.breakdown}>
                      <summary>Show analyzed Pokemon on this route</summary>
                      <ul className={styles.inlineList}>
                        {entry.recommendations.map((result) => (
                          <li key={`${entry.routeEntry.id}-${result.pokemonName}`}>
                            {formatPokemonDisplayName(result.pokemonName)}: {result.selected?.ball || 'No recommendation'} - {formatMoney(result.selected?.expectedCost || 0)} - {formatExpectedTurns(result.selected?.expectedTurnsToSuccess || 0)}
                            {result.analysis?.length > 0 && (
                              <button
                                type="button"
                                className={styles.showBreakdownButton}
                                onClick={() => setActiveBreakdownKey(`${entry.routeEntry.id}|${result.pokemonName}`)}
                              >
                                Open Full Ball Breakdown
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </article>
                )
              })}

              {showMoreCount < rankedRoutes.length && (
                <button type="button" className={styles.showMoreButton} onClick={() => setShowMoreCount((count) => count + 5)}>
                  Show More Routes
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {mode === MODE_SPECIFIC && (
        <section className={styles.resultsSection}>
          <h2>Specific Mon Search</h2>
          <p className={styles.routeMeta}>Pick a species, optional route, level, and alpha flag to run a direct recommendation. Alpha mode forces catch rate to 10.</p>

          {customPokemonResult?.selected ? (
            <article className={styles.pokemonCard}>
              <div className={styles.pokemonHeader}>
                <img
                  src={getLocalPokemonGif(customPokemonResult.pokemonName)}
                  alt={formatPokemonDisplayName(customPokemonResult.pokemonName)}
                  onError={onGifError(customPokemonResult.pokemonName, false)}
                  loading="lazy"
                />
                <div>
                  <h3>{formatPokemonDisplayName(customPokemonResult.pokemonName)}</h3>
                  <p>Route: {customPokemonRouteEntry ? `${customPokemonRouteEntry.region} - ${customPokemonRouteEntry.displayName}` : 'N/A'}</p>
                  {customPokemonSelection?.routeWasAutoSelected && (
                    <p>Location left blank, so this route was auto-selected as the best match.</p>
                  )}
                  <p>{selectedPriorityLabel}: {customPokemonResult.selected.ball} ({formatPercent(customPokemonResult.selected.chance)})</p>
                  <p>Catch Chance: {formatPercent(customPokemonResult.selected.chance)}</p>
                  <p>Catch Rate: {customPokemonResult.catchRate}</p>
                </div>
              </div>

              <section className={styles.featuredRecommendation}>
                <div className={styles.featuredRecommendationHeader}>
                  <span className={styles.featuredRecommendationLabel}>{selectedPriorityLabel}:</span>
                  <strong className={styles.featuredRecommendationChoice}>{customPokemonResult.selected.ball} <span>{formatPercent(customPokemonResult.selected.chance)}</span></strong>
                </div>
                <div className={styles.featuredRecommendationStats}>
                  <div>
                    <span>Expected Cost</span>
                    <strong>{formatMoney(customPokemonResult.selected.expectedCost)}</strong>
                  </div>
                  <div>
                    <span>Expected Turns</span>
                    <strong>{formatExpectedTurns(customPokemonResult.selected.expectedTurnsToSuccess)}</strong>
                  </div>
                </div>
              </section>
              {buildComparisonRows(customPokemonResult, priority).map((entry) => (
                <div key={`specific-${entry.key}`} className={styles.recommendationLine}>
                  <span>{entry.label}</span>
                  <strong>{entry.value}</strong>
                </div>
              ))}

              <details className={styles.breakdown}>
                <summary>Show ball breakdown</summary>
                <p className={styles.routeMeta}>
                  Catch Formula: chance% = (min(255, floor(((300 - 2 x HP%) / 300) x BallMultiplier x CatchRate x StatusMod)) / 255) x 100
                </p>
                <div className={styles.tableWrap}>
                  <table>
                    <thead>
                      <tr>
                        <th>Ball</th>
                        <th>Modifier</th>
                        <th>Catch Value</th>
                        <th>Catch</th>
                        <th>Turns</th>
                        <th>Price</th>
                        <th>Expected Cost</th>
                        <th>Formula Inputs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customPokemonResult.analysis.map((entry) => (
                        <tr key={`custom-${customPokemonResult.pokemonName}-${entry.ballId}`} className={!entry.available ? styles.unavailableRow : ''}>
                          <td>{entry.ball}</td>
                          <td>{entry.multiplier.toFixed(1)}x</td>
                          <td>{entry.catchValue}</td>
                          <td>{formatPercent(entry.chance)}</td>
                          <td>{formatTurns(entry.turns)}</td>
                          <td>{entry.price == null ? 'N/A' : formatMoney(entry.price)}</td>
                          <td>{formatMoney(entry.expectedCost)}</td>
                          <td>{entry.available ? `HP%: ${entry.hpPercent} | CatchRate: ${entry.catchRate} | StatusMod: ${entry.statusMod}` : `Not viable - ${entry.availabilityNote}`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </article>
          ) : (
            <p className={styles.routeMeta}>Select a valid Pokemon to run specific analysis. Route is optional.</p>
          )}
        </section>
      )}
    </div>
  )
}
