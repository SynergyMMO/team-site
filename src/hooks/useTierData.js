import { useMemo } from 'react'
import tierPokemon from '../data/tier_pokemon.json'
import tierPoints from '../data/tier_points.json'

export function useTierData() {
  const tierLookup = useMemo(() => {
    const lookup = {}
    Object.entries(tierPokemon).forEach(([tier, names]) => {
      names.forEach(name => { lookup[name.toLowerCase()] = tier })
    })
    return lookup
  }, [])

  return { tierPokemon, tierPoints, tierLookup }
}
