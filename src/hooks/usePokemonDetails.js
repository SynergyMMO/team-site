import { useState, useEffect } from 'react'
import pokemonData from '../data/pokemmo_data/pokemon-data.json'

/**
 * Hook to fetch detailed Pokémon information from local JSON files
 * Includes stats, abilities, moves, type, egg groups, locations, etc.
 * 
 * @param {string} pokemonName - The Pokémon name to fetch
 * @returns {object} { data, isLoading, error }
 */
export function usePokemonDetails(pokemonName) {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!pokemonName) {
      setIsLoading(false)
      setError(new Error('No Pokémon name provided'))
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      // Normalize the name for lookup
      const normalizedName = pokemonName.toLowerCase().trim()
      const aliasMap = {
        darmanitan: 'darmanitan-standard'
      }
      let lookupName = aliasMap[normalizedName] || normalizedName
      
      // Handle gendered suffixes that are not separate entries in the data
      if (!pokemonData[lookupName] && /-(f|m)$/.test(lookupName)) {
        lookupName = lookupName.slice(0, -2)
      }
      
      // Get pokemon from local data
      const pokemon = pokemonData[lookupName]
      
      if (!pokemon) {
        throw new Error(`Pokémon "${pokemonName}" not found in database.`)
      }
      
      // Validate required data exists
      if (!pokemon.id) {
        throw new Error('Invalid Pokémon data: missing ID')
      }
      
      /**
       * Extract move type and map to learning method
       * @param {string} moveType - The type value from pokemon-data.json
       * @returns {string} The mapped learning method
       */
      function mapMoveType(moveType) {
        if (!moveType) return 'unknown'
        
        const lowerType = moveType.toLowerCase().trim()
        
        if (lowerType === 'level') return 'level-up'
        if (lowerType === 'egg') return 'egg'
        if (lowerType === 'tutor') return 'tutor'
        if (lowerType.includes('tm')) return 'machine'
        if (lowerType.includes('hm')) return 'machine'
        if (lowerType === 'machine') return 'machine'
        if (lowerType === 'reminder') return 'reminder'
        if (lowerType === 'form-change') return 'form-change'
        
        return 'unknown'
      }
      
      // Extract stats with fallback values
      const getStatValue = (statName, defaultValue = 50) => {
        try {
          const stat = pokemon.stats?.find(s => s.stat_name === statName)
          return stat?.base_stat || defaultValue
        } catch (e) {
          return defaultValue
        }
      }
      
      // Format moves with learning methods
      const formattedMoves = (pokemon.moves || [])
        .map(move => ({
          name: move.name || '',
          methods: [{
            level: move.level || 0,
            method: mapMoveType(move.type)
          }]
        }))
        .filter(m => m.name)
        .map(m => ({
          name: m.name
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join('-'),
          methods: m.methods
        }))
      
      // Extract abilities with normal and hidden separation
      const abilities = {
        normal: [],
        hidden: []
      }
      
      if (Array.isArray(pokemon.abilities)) {
        pokemon.abilities.forEach(ability => {
          const abilityName = ability.ability_name
          if (ability.is_hidden) {
            abilities.hidden.push(abilityName)
          } else {
            abilities.normal.push(abilityName)
          }
        })
      }
      
      // Format location data from pokemon's location_area_encounters
      const locations = (pokemon.location_area_encounters || []).map(loc => ({
        pokemon: normalizedName,
        pokemon_id: pokemon.id,
        type: loc.type || '',
        region_id: loc.region_id,
        region_name: loc.region_name || '',
        location: loc.location || '',
        min_level: loc.min_level || 0,
        max_level: loc.max_level || 0,
        rarity: loc.rarity || 'Unknown',
        time: loc.time || 'ALL'
      }))
      
      // Get generation based on Pokemon ID
      const getGeneration = (id) => {
        if (id <= 151) return 'Generation I'
        if (id <= 251) return 'Generation II'
        if (id <= 386) return 'Generation III'
        if (id <= 493) return 'Generation IV'
        if (id <= 649) return 'Generation V'
        if (id <= 721) return 'Generation VI'
        if (id <= 809) return 'Generation VII'
        if (id <= 898) return 'Generation VIII'
        return 'Generation IX'
      }
      
      const femaleSpriteOverrides = {
        'frillish-f': 'https://img.pokemondb.net/sprites/home/normal/frillish-f.png',
        'jellicent-f': 'https://img.pokemondb.net/sprites/home/normal/jellicent-f.png'
      }

      // Get sprite from sprites
      const sprite = femaleSpriteOverrides[normalizedName]
        || pokemon.sprites?.front_default 
        || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`
      
      // Format the data for component use
      const formattedData = {
        id: pokemon.id,
        name: pokemon.name,
        displayName: pokemonName,
        height: 0.7, // Default fallback - height not in data
        weight: 5, // Default fallback - weight not in data
        types: (pokemon.types || []).filter(Boolean),
        abilities: abilities,
        stats: {
          hp: getStatValue('hp'),
          attack: getStatValue('attack'),
          defense: getStatValue('defense'),
          spAtk: getStatValue('special-attack'),
          spDef: getStatValue('special-defense'),
          speed: getStatValue('speed'),
        },
        moves: formattedMoves,
        sprite: sprite,
        generation: getGeneration(pokemon.id),
        description: `Pokémon ID: ${pokemon.id}. Base happiness: ${pokemon.base_happiness}. ${pokemon.is_legendary ? 'Legendary Pokémon.' : ''} ${pokemon.is_mythical ? 'Mythical Pokémon.' : ''}`,
        color: 'unknown',
        baseExperience: pokemon.base_experience || 0,
        eggGroups: (pokemon.egg_groups || []).filter(Boolean),
        catchRate: pokemon.capture_rate || 0,
        hatchCounter: pokemon.hatch_counter || 0,
        genderRate: pokemon.gender_rate !== undefined ? pokemon.gender_rate : 1,
        isLegendary: pokemon.is_legendary || false,
        isMythical: pokemon.is_mythical || false,
        growthRate: pokemon.growth_rate || 'medium',
        locations: locations,
        shinyTier: pokemon.shiny_tier || 0,
        shinyPoints: pokemon.shiny_points || 0
      }
      
      setData(formattedData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      const newError = new Error(errorMessage)
      setError(newError)
      console.error('Error fetching Pokémon details:', {
        pokemonName,
        message: errorMessage,
        originalError: err
      })
    } finally {
      setIsLoading(false)
    }
  }, [pokemonName])

  return { data, isLoading, error }
}

/**
 * Extract English flavor text from species data
 * @param {array} flavorTextEntries - Array of flavor text entries from PokeAPI
 * @returns {string} English flavor text
 */
function getFlavorText(flavorTextEntries) {
  if (!flavorTextEntries || flavorTextEntries.length === 0) {
    return 'No description available.'
  }
  
  // Find English text entries
  const englishEntry = flavorTextEntries.find(
    entry => entry.language.name === 'en'
  )
  
  if (!englishEntry) {
    return flavorTextEntries[0]?.flavor_text || 'No description available.'
  }
  
  // Clean up line breaks
  return englishEntry.flavor_text.replace(/\f/g, ' ').trim()
}
