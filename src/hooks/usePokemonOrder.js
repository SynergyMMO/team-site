import { useMemo } from 'react'
import spriteData from '../data/pokemmo_data/pokemon-sprites.json'

/**
 * Creates an ordered list of all Pokemon by Pokedex number (ID)
 * Only includes base Pokemon (no forms) for navigation
 * Returns object with all pokemon names and helper functions for navigation
 */
export function usePokemonOrder() {
  return useMemo(() => {
    // Define forms that are actually the standard/base form for navigation purposes
    const standardFormExceptions = {
      'meloetta-aria': true,
      'keldeo-ordinary': true
    }

    // Create array of base pokemon only (exclude forms - those with hyphens)
    // Sort by Pokedex ID
    const allPokemon = Object.entries(spriteData)
      .filter(([name]) => !name.includes('-') || standardFormExceptions[name]) // Include base forms and exceptions
      .map(([name, data]) => ({
        name,
        id: data.id
      }))
      .sort((a, b) => a.id - b.id) // Sort by Pokedex number
      .map(p => p.name) // Extract just the names

    // Get base form name (strip off form suffixes)
    const getBasePokemonName = (pokemonName) => {
      const lower = pokemonName.toLowerCase()
      // Special cases for forms that map to a specific standard form
      if (lower === 'meloetta-pirouette') return 'meloetta-aria'
      if (lower === 'keldeo-resolute') return 'keldeo-ordinary'
      
      // If it's a form (contains hyphen), try to find the base form
      if (lower.includes('-')) {
        // Check if base exists by progressively removing suffixes
        const parts = lower.split('-')
        for (let i = parts.length - 1; i > 0; i--) {
          const potentialBase = parts.slice(0, i).join('-')
          if (allPokemon.find(p => p.toLowerCase() === potentialBase)) {
            return potentialBase
          }
        }
      }
      return lower
    }

    // Find index of a pokemon (maps forms to their base for navigation)
    const getPokemonIndex = (pokemonName) => {
      const baseName = getBasePokemonName(pokemonName)
      return allPokemon.findIndex(p => p.toLowerCase() === baseName)
    }

    // Get next pokemon in order
    const getNextPokemon = (pokemonName) => {
      const currentIndex = getPokemonIndex(pokemonName)
      if (currentIndex === -1 || currentIndex === allPokemon.length - 1) return null
      return allPokemon[currentIndex + 1]
    }

    // Get previous pokemon in order
    const getPreviousPokemon = (pokemonName) => {
      const currentIndex = getPokemonIndex(pokemonName)
      if (currentIndex <= 0) return null
      return allPokemon[currentIndex - 1]
    }

    return {
      allPokemon,
      getPokemonIndex,
      getNextPokemon,
      getPreviousPokemon,
    }
  }, [])
}
