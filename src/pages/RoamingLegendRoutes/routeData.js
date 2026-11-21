export const ROUTES = {
  Kanto: [
    'Route 3', 'Route 4', 'Route 5', 'Route 6', 'Route 7', 'Route 11',
    'Route 16', 'Route 17', 'Route 21 (North)', 'Route 24', 'Berry Forest',
    'Bond Bridge', 'Canyon Entrance', 'Cape Brink', 'Five Isle Meadow',
    'Kindle Road', 'Pattern Bush', 'Ruin Valley', 'Sevault Canyon', 'Viridian Forest',
  ],
  Johto: [
    'Route 26', 'Route 28', 'Route 31', 'Route 32', 'Route 34', 'Route 35',
    'Route 36', 'Route 37', 'Route 44', 'Route 45', 'Route 47', 'Route 48',
    'Mt. Silver (Outside)', 'National Park', 'Ruins of Alph (Outside)',
  ],
}

export const ENABLED_REGIONS = ['Johto']
export const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter']
const TIMES = ['morning', 'day', 'night']
const TIME_LABELS = { morning: 'M', day: 'D', night: 'N' }

export function isRareTarget(pokemon) {
  return Number.isInteger(pokemon.shiny_tier) && pokemon.shiny_tier <= 2
}

export function getRouteOverview(entries, getWarnings) {
  const items = new Map()
  const warnings = new Map()
  const addPokemon = (map, key, value, name) => {
    if (!map.has(key)) map.set(key, { ...value, pokemon: [] })
    if (!map.get(key).pokemon.includes(name)) map.get(key).pokemon.push(name)
  }

  entries.forEach(({ pokemon, encounters }) => {
    const name = pokemon.name_translations?.en?.name || pokemon.name
    pokemon.held_items.forEach(item => addPokemon(items, item.item_name, { name: item.item_name }, name))
    getWarnings(pokemon, encounters).forEach(warning =>
      addPokemon(warnings, `${warning.type}:${warning.name}`, warning, name)
    )
  })

  const sorted = map => [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  return { items: sorted(items), warnings: sorted(warnings) }
}

export function getRouteEncounters(pokemonData, region, location) {
  return Object.values(pokemonData).flatMap(pokemon => {
    const encounters = pokemon.location_area_encounters.filter(encounter =>
      encounter.region_name === region && encounter.location_name_full === location &&
      ((encounter.type === 'Grass' && !encounter.is_horde_3x && !encounter.is_horde_5x) ||
        (['Grass', 'Sweet Scent'].includes(encounter.type) &&
          (encounter.is_horde_3x || encounter.is_horde_5x)))
    )
    return encounters.length ? [{ pokemon, encounters }] : []
  })
}

export function formatRate(encounter, time) {
  const times = time === 'all' ? TIMES : [time]
  const available = times.filter(period =>
    encounter[`rarity_${period}`] && encounter[`rarity_${period}`] !== '--'
  )
  if (!available.length) return ''
  const first = encounter[`rarity_${available[0]}`]
  if (time === 'all' && available.length === 3 &&
    available.every(period => encounter[`rarity_${period}`] === first)) {
    return `All ${first}`
  }
  return available.map(period => `${TIME_LABELS[period]} ${encounter[`rarity_${period}`]}`).join(' · ')
}

export function getSeasonRows(entries, season, time, hordes) {
  const rows = []
  entries.forEach(({ pokemon, encounters }) => {
    const groups = new Map()
    encounters.forEach(encounter => {
      const isHorde = encounter.is_horde_3x || encounter.is_horde_5x
      if ((encounter.season !== season && encounter.season !== 'Any') ||
        isHorde !== hordes || !formatRate(encounter, time)) return
      const size = encounter.is_horde_5x ? 5 : encounter.is_horde_3x ? 3 : 1
      const key = `${size}:${encounter.type}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(encounter)
    })
    groups.forEach((matches, key) => rows.push({ pokemon, encounters: matches, key }))
  })
  return rows.sort((a, b) => {
    const tier = pokemon => isRareTarget(pokemon) ? pokemon.shiny_tier : 9
    return tier(a.pokemon) - tier(b.pokemon) ||
      a.pokemon.name.localeCompare(b.pokemon.name) || a.key.localeCompare(b.key)
  })
}
