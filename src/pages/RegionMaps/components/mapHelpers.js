export const RARITY_ORDER = [
  'very common',
  'common',
  'uncommon',
  'rare',
  'very rare',
  'special',
  'lure',
  'horde',
]

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function getSpawnTypes(areas) {
  return Array.from(
    new Set(
      areas.flatMap((area) =>
        (area.spawns || []).flatMap((spawn) => spawn.types || [])
      )
    )
  ).sort()
}

export function getSpawnRarities(areas) {
  const seen = new Set(
    areas.flatMap((area) =>
      (area.spawns || []).flatMap((spawn) =>
        getSpawnRarityValues(spawn)
      )
    )
  )
  return Array.from(seen).sort((a, b) => {
    const ai = RARITY_ORDER.indexOf(a.toLowerCase())
    const bi = RARITY_ORDER.indexOf(b.toLowerCase())
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

export function getSpawnRarityValues(spawn) {
  if (Array.isArray(spawn.rarities) && spawn.rarities.length > 0) {
    return spawn.rarities
  }
  if (Array.isArray(spawn.encounters) && spawn.encounters.length > 0) {
    return Array.from(new Set(spawn.encounters.map((encounter) => encounter.rarity || 'Common')))
  }
  return [spawn.rarity || 'Common']
}

export function areaMatchesFilters(area, filters) {
  const spawns = area.spawns || []

  if (!filters.showSpawns) {
    return true
  }

  return spawns.some((spawn) => {
    const nameMatch = !filters.pokemonSearch
      || spawn.name.toLowerCase().includes(filters.pokemonSearch.toLowerCase())
    const typeMatch = filters.types.size === 0
      || (spawn.types || []).some((type) => filters.types.has(type))
    const rarityMatch = filters.rarities.size === 0
      || getSpawnRarityValues(spawn).some((rarity) => filters.rarities.has(rarity))
    return nameMatch && typeMatch && rarityMatch
  })
}

export function getAreaSpawnSummary(area, filters) {
  if (!filters.showSpawns) {
    return area.spawns || []
  }

  return (area.spawns || []).filter((spawn) => {
    const nameMatch = !filters.pokemonSearch
      || spawn.name.toLowerCase().includes(filters.pokemonSearch.toLowerCase())
    const typeMatch = filters.types.size === 0
      || (spawn.types || []).some((type) => filters.types.has(type))
    const rarityMatch = filters.rarities.size === 0
      || getSpawnRarityValues(spawn).some((rarity) => filters.rarities.has(rarity))
    return nameMatch && typeMatch && rarityMatch
  })
}

export function toggleValue(currentSet, value) {
  const next = new Set(currentSet)
  if (next.has(value)) {
    next.delete(value)
  } else {
    next.add(value)
  }
  return next
}
