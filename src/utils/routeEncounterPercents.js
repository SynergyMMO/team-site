import encounterPercents from '../data/encounter_percents.json'

function normalizeSearch(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019']/g, '')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
}

function normalizePokemonKey(value) {
  return normalizeSearch(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function formatPercent(encounters, total) {
  if (!total) return '0%'
  const percent = (encounters / total) * 100
  return `${percent.toFixed(percent >= 10 ? 1 : 2)}%`
}

function getVariationEntries(routeData) {
  if (Array.isArray(routeData)) return routeData

  if (Array.isArray(routeData?.variations)) {
    return routeData.variations
  }

  if (routeData?.variations && typeof routeData.variations === 'object') {
    return Object.entries(routeData.variations).map(([variation, data]) => ({
      ...data,
      variation: data?.variation || variation,
    }))
  }

  return [routeData]
}

function getDisplayName(routeName, variationData) {
  const baseRouteName = String(variationData?.route || routeName || '').trim()
  const variation = String(variationData?.variation || '').trim()

  if (!variation) return baseRouteName

  const variationSuffix = ` - ${variation}`
  if (baseRouteName.endsWith(variationSuffix)) return baseRouteName

  return `${baseRouteName}${variationSuffix}`
}

function getRouteCandidates(area) {
  return Array.from(new Set([
    area?.sourceLocation,
    area?.name,
    area?.encounterMatch?.normalizedLocation,
  ].filter(Boolean).map(normalizeSearch)))
}

function isGenericNumberedRoute(routeName) {
  return /^route \d+[a-z]?$/i.test(routeName)
}

function flattenEncounterRoutes() {
  return Object.entries(encounterPercents).flatMap(([region, routes]) =>
    Object.entries(routes || {}).flatMap(([routeName, routeData]) =>
      getVariationEntries(routeData).map((variationData) => {
        const baseRouteName = String(variationData?.route || routeName || '').trim()
        const variation = String(variationData?.variation || '').trim()
        const total = Number(variationData?.total) || 0
        const pokemonPercents = new Map()
        const pokemonEntries = variationData?.data || []

        pokemonEntries.forEach((entry) => {
          const encounters = Number(entry.encounters) || 0
          const key = normalizePokemonKey(entry.pokemon)
          const percent = total ? (encounters / total) * 100 : 0
          const previous = pokemonPercents.get(key)

          if (!previous || percent > previous.percent) {
            pokemonPercents.set(key, {
              percent,
              label: formatPercent(encounters, total),
            })
          }
        })

        return {
          region,
          regionKey: normalizeSearch(region),
          routeName: baseRouteName,
          routeKey: normalizeSearch(baseRouteName),
          variation,
          variationKey: normalizeSearch(variation),
          displayName: getDisplayName(routeName, variationData),
          pokemonPercents,
        }
      })
    )
  )
}

const encounterRoutes = flattenEncounterRoutes()

export function getRouteEncounterPercentData(regionName, area) {
  const candidates = getRouteCandidates(area)
  if (candidates.length === 0) return null

  const regionKey = normalizeSearch(regionName)
  const exactRegionMatch = encounterRoutes.find((route) =>
    route.regionKey === regionKey && candidates.includes(route.routeKey)
  )
  if (exactRegionMatch) return exactRegionMatch

  if (candidates.some(isGenericNumberedRoute)) return null

  const routeNameMatches = encounterRoutes.filter((route) => candidates.includes(route.routeKey))
  return routeNameMatches.length === 1 ? routeNameMatches[0] : null
}

export function getPokemonEncounterPercentLabel(routePercentData, pokemonName) {
  return routePercentData?.pokemonPercents.get(normalizePokemonKey(pokemonName))?.label || ''
}

export function shouldShowPokemonEncounterPercent(routePercentData, encounterType) {
  if (!routePercentData) return false

  const variation = routePercentData.variationKey || ''
  const isNoLure = variation.includes('no lure')

  if (encounterType === 'Fishing Encounters') {
    return variation.includes('fishing') || variation.includes('rod')
  }

  if (encounterType === 'Horde') {
    return variation.includes('horde')
  }

  if (variation.includes('horde')) {
    return false
  }

  if (variation.includes('fishing') || variation.includes('rod')) {
    return false
  }

  if (!isNoLure && (variation.includes('lure') || variation.includes('lures'))) {
    return encounterType === 'Lure Encounters'
      || encounterType === 'Singles'
      || encounterType === 'Rares'
  }

  return true
}
