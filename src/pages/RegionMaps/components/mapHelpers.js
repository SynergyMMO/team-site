export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'very rare']

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
    areas.flatMap((area) => (area.spawns || []).map((spawn) => spawn.rarity || 'common'))
  )
  return Array.from(seen).sort((a, b) => {
    const ai = RARITY_ORDER.indexOf(a)
    const bi = RARITY_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
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
      || filters.rarities.has(spawn.rarity || 'common')
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
      || filters.rarities.has(spawn.rarity || 'common')
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
