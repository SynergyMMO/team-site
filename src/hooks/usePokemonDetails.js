import { useState, useEffect } from 'react'
import pokemonData from '../data/pokemmo_data/pokemon-data.json'
import spriteDataMap from '../data/pokemmo_data/pokemon-sprites.json'

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
        darmanitan: 'darmanitan-standard',
        wormadam: 'wormadam-plant',
        'gastrodon-west': 'gastrodon',
        'shellos-west': 'shellos',
        meloetta: 'meloetta-aria',
        keldeo: 'keldeo-ordinary',
        tornadus: 'tornadus-incarnate',
        thundurus: 'thundurus-incarnate',
        landorus: 'landorus-incarnate',
        deoxys: 'deoxys-normal',
        shaymin: 'shaymin-land'
      }
      let lookupName = aliasMap[normalizedName] || normalizedName

      const displayNameMap = {
        shellos: 'Shellos-West',
        'shellos-west': 'Shellos-West',
        wormadam: 'Wormadam-Plant',
        'wormadam-plant': 'Wormadam-Plant',
        unown: 'Unown A',
        'unown-a': 'Unown A',
        'unown-b': 'Unown B',
        'unown-c': 'Unown C',
        'unown-d': 'Unown D',
        'unown-e': 'Unown E',
        'unown-f': 'Unown F',
        'unown-g': 'Unown G',
        'unown-h': 'Unown H',
        'unown-i': 'Unown I',
        'unown-j': 'Unown J',
        'unown-k': 'Unown K',
        'unown-l': 'Unown L',
        'unown-m': 'Unown M',
        'unown-n': 'Unown N',
        'unown-o': 'Unown O',
        'unown-p': 'Unown P',
        'unown-q': 'Unown Q',
        'unown-r': 'Unown R',
        'unown-s': 'Unown S',
        'unown-t': 'Unown T',
        'unown-u': 'Unown U',
        'unown-v': 'Unown V',
        'unown-w': 'Unown W',
        'unown-x': 'Unown X',
        'unown-y': 'Unown Y',
        'unown-z': 'Unown Z',
        'unown-exclamation': 'Unown !',
        'unown-question': 'Unown ?'
      }
      
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

      // Extract EV yields from stats
      const getEVYields = () => {
        const evMap = {
          'hp': 'HP',
          'attack': 'ATK',
          'defense': 'DEF',
          'special-attack': 'SP.ATK',
          'special-defense': 'SP.DEF',
          'speed': 'SPD'
        }
        
        const evYields = []
        if (Array.isArray(pokemon.stats)) {
          pokemon.stats.forEach(stat => {
            if (stat.effort && stat.effort > 0) {
              evYields.push({
                stat: evMap[stat.stat_name] || stat.stat_name,
                value: stat.effort
              })
            }
          })
        }
        return evYields
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
      
      // Get the correct ID for this Pokemon
      // For forms, use the ID from the default variety (base pokemon)
      let pokedexId = pokemon.id
      if (pokemon.varieties && Array.isArray(pokemon.varieties)) {
        const defaultVariety = pokemon.varieties.find(v => v.is_default)
        if (defaultVariety && defaultVariety.id) {
          pokedexId = defaultVariety.id
        }
      }
      
      // Format location data from pokemon's location_area_encounters
      const locations = (pokemon.location_area_encounters || []).map(loc => ({
        pokemon: normalizedName,
        pokemon_id: pokedexId,
        type: loc.type || '',
        region_id: loc.region_id,
        region_name: loc.region_name || '',
        location: loc.location || '',
        min_level: loc.min_level || 0,
        max_level: loc.max_level || 0,
        rarity: loc.rarity || 'Unknown',
        time: loc.time || 'ALL'
      }))
      
      // Get generation based on Pokemon ID, with special handling for Rotom
      const getGeneration = (id, name) => {
        // Rotom and all its forms (rotom-heat, rotom-wash, etc.) are from Generation IV
        if (name && name.toLowerCase().includes('rotom')) {
          return 'Generation IV'
        }
        
        if (id <= 151) return 'Generation I'
        if (id <= 251) return 'Generation II'
        if (id <= 386) return 'Generation III'
        if (id <= 493) return 'Generation IV'
        if (id <= 649) return 'Generation V'
        return 'Generation V'
      }
      
      // Get sprite from new JSON structure with animated sprites as priority
      let sprite = null
      const spriteData = spriteDataMap[lookupName]
      if (spriteData) {
        // Try animated Gen V sprites first
        sprite = spriteData.versions?.['generation-v']?.['black-white']?.animated?.front_default
          // Fall back to official artwork
          || spriteData.other?.['official-artwork']?.front_default
          // Finally use the basic front_default
          || spriteData.front_default
      }
      
      // Last resort fallback
      if (!sprite) {
        sprite = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokedexId}.png`
      }
      
      // Format the data for component use
      const formattedData = {
        id: pokedexId,
        name: pokemon.name,
        displayName: displayNameMap[normalizedName] || pokemonName,
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
        evYields: getEVYields(),
        moves: formattedMoves,
        sprite: sprite,
        generation: getGeneration(pokedexId, normalizedName),
        description: `Pokémon ID: ${pokedexId}. Base happiness: ${pokemon.base_happiness}. ${pokemon.is_legendary ? 'Legendary Pokémon.' : ''} ${pokemon.is_mythical ? 'Mythical Pokémon.' : ''}`,
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
        shinyPoints: pokemon.shiny_points || 0,
        obtainable: pokemon.obtainable !== false,
        cries: pokemon.cries || { latest: '', legacy: '' },
        nameTranslations: pokemon.name_translations || {},
        varieties: pokemon.varieties || [],
        evolution_chain: pokemon.evolution_chain || null
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

