import { useMemo } from 'react'
import pokemonData from '../data/pokemmo_data/pokemon-data.json'

/**
 * Hook to get location data for a specific Pokemon from local JSON
 * Returns all locations where the Pokemon can be found
 */
export function usePokemonLocations(pokemonName) {
  return useMemo(() => {
    if (!pokemonName) return []

    const pokemonLower = pokemonName.toLowerCase()
    const aliasMap = {
      darmanitan: 'darmanitan-standard'
    }
    const lookupName = aliasMap[pokemonLower] || pokemonLower
    const pokemon = pokemonData[lookupName]

    if (!pokemon) return []

    // Get locations from the pokemon's location_area_encounters
    const locations = (pokemon.location_area_encounters || [])
      .map(location => ({
        pokemon: pokemonLower,
        pokemon_id: pokemon.id,
        type: location.type || '',
        region_id: location.region_id,
        region_name: location.region_name || '',
        location: location.location || '',
        min_level: location.min_level || 0,
        max_level: location.max_level || 0,
        rarity: location.rarity || 'Unknown',
        time: location.time || 'ALL'
      }))

    // Sort by region name, then location name
    locations.sort((a, b) => {
      if (a.region_name !== b.region_name) {
        return a.region_name.localeCompare(b.region_name)
      }
      return a.location.localeCompare(b.location)
    })

    return locations
  }, [pokemonName])
}
