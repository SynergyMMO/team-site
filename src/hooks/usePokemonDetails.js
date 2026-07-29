import { useState, useEffect } from 'react'
import pokemonData from '../data/pokemmo_data/pokemon-data.json'
import spriteDataMap from '../data/pokemmo_data/pokemon-sprites.json'

const DEFAULT_POKEMON_BY_ID = new Map()

Object.entries(pokemonData).forEach(([key, value]) => {
  if (!value || typeof value !== 'object') return
  if (!Number.isFinite(value.id)) return

  const isDefault = value.is_default !== false
  if (isDefault || !DEFAULT_POKEMON_BY_ID.has(value.id)) {
    DEFAULT_POKEMON_BY_ID.set(value.id, key)
  }
})

function normalizeSpeciesKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[.'’]/g, '')
}

function resolveEvolutionTargetKey(evolution = {}) {
  if (Number.isFinite(evolution.id) && DEFAULT_POKEMON_BY_ID.has(evolution.id)) {
    return DEFAULT_POKEMON_BY_ID.get(evolution.id)
  }

  const normalized = normalizeSpeciesKey(evolution.name)
  if (pokemonData[normalized]) {
    return normalized
  }

  return null
}

function mapEvolutionDetail(evolution = {}) {
  const type = String(evolution.type || '').toUpperCase()
  const value = evolution.val
  const detail = {}

  switch (type) {
    case 'LEVEL':
    case 'LEVEL_FEMALE':
    case 'LEVEL_MALE':
      detail.trigger = { name: 'level-up' }
      if (Number.isFinite(value)) detail.min_level = value
      break
    case 'ITEM':
    case 'ITEM_FEMALE':
    case 'ITEM_MALE':
      detail.trigger = { name: 'use-item' }
      if (evolution.item_name) detail.item = { name: evolution.item_name }
      else if (value) detail.item = { name: String(value) }
      break
    case 'TRADE':
    case 'TRADE_FOR_OPPOSITE':
      detail.trigger = { name: 'trade' }
      break
    case 'TRADE_WITH_ITEM':
      detail.trigger = { name: 'trade' }
      if (evolution.item_name) detail.held_item = { name: evolution.item_name }
      else if (value) detail.held_item = { name: String(value) }
      break
    case 'HAPPINESS':
    case 'HAPPINESS_DAY':
    case 'HAPPINESS_NIGHT':
      detail.trigger = { name: 'level-up' }
      detail.min_happiness = 220
      if (type === 'HAPPINESS_DAY') detail.time_of_day = 'day'
      if (type === 'HAPPINESS_NIGHT') detail.time_of_day = 'night'
      break
    case 'LEVEL_ITEM_DAY':
    case 'LEVEL_ITEM_NIGHT':
      detail.trigger = { name: 'level-up' }
      if (evolution.item_name) detail.held_item = { name: evolution.item_name }
      else if (value) detail.held_item = { name: String(value) }
      if (type === 'LEVEL_ITEM_DAY') detail.time_of_day = 'day'
      if (type === 'LEVEL_ITEM_NIGHT') detail.time_of_day = 'night'
      break
    case 'LEVEL_WITH_MONSTER':
    case 'LEVEL_WITH_SKILL':
      detail.trigger = { name: 'level-up' }
      if (Number.isFinite(value)) detail.min_level = value
      break
    default:
      detail.trigger = { name: type.toLowerCase().replace(/_/g, '-') || 'level-up' }
      if (Number.isFinite(value)) detail.min_level = value
      break
  }

  return detail
}

function buildEvolutionChainFromData(speciesKey) {
  if (!speciesKey || !pokemonData[speciesKey]) {
    return null
  }

  const visitedRoots = new Set()
  let rootKey = speciesKey

  while (pokemonData[rootKey]?.evolves_from_species?.name) {
    if (visitedRoots.has(rootKey)) break
    visitedRoots.add(rootKey)

    const previousKey = normalizeSpeciesKey(pokemonData[rootKey].evolves_from_species.name)
    if (!pokemonData[previousKey]) break
    rootKey = previousKey
  }

  const recursionGuard = new Set()
  const buildNode = (nodeKey, evolutionDetail = null) => {
    if (!pokemonData[nodeKey] || recursionGuard.has(nodeKey)) {
      return null
    }

    recursionGuard.add(nodeKey)
    const nodePokemon = pokemonData[nodeKey]

    const node = {
      species: { name: nodeKey },
      evolution_details: evolutionDetail ? [evolutionDetail] : [],
      evolves_to: []
    }

    const nextEvolutions = Array.isArray(nodePokemon.evolutions) ? nodePokemon.evolutions : []
    node.evolves_to = nextEvolutions
      .map((evolution) => {
        const targetKey = resolveEvolutionTargetKey(evolution)
        if (!targetKey) return null
        return buildNode(targetKey, mapEvolutionDetail(evolution))
      })
      .filter(Boolean)

    recursionGuard.delete(nodeKey)
    return node
  }

  const rootNode = buildNode(rootKey)
  if (!rootNode) return null

  return {
    chain: rootNode
  }
}

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
      
      // Normalize the name for lookup so punctuation variants resolve (e.g. Farfetch'd)
      const normalizedName = normalizeSpeciesKey(pokemonName)
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
      
      // Resolve the base (default) Pokemon entry for inheriting missing fields on forms
      const resolveBasePokemon = () => {
        if (pokemon.is_default !== false) return null
        if (Array.isArray(pokemon.varieties)) {
          const defaultVariety = pokemon.varieties.find(v => v.is_default)
          if (defaultVariety) {
            const baseKey = normalizeSpeciesKey(defaultVariety.name)
            return pokemonData[baseKey] || null
          }
        }
        return null
      }
      const basePokemon = resolveBasePokemon()

      // Extract stats — handles both object format (base) and array format (form)
      const getStatValue = (statName, defaultValue = 50) => {
        if (pokemon.stats) {
          // Base format: { hp: 50, attack: 65, ... }
          if (!Array.isArray(pokemon.stats)) {
            return pokemon.stats[statName] ?? defaultValue
          }
          // Form format: [{ stat_name: "hp", base_stat: 50 }, ...]
          const apiNameMap = {
            hp: 'hp',
            attack: 'attack',
            defense: 'defense',
            sp_attack: 'special-attack',
            sp_defense: 'special-defense',
            speed: 'speed'
          }
          const apiName = apiNameMap[statName] || statName
          const entry = pokemon.stats.find(s => s.stat_name === apiName)
          if (entry) return entry.base_stat
        }
        return defaultValue
      }

      // Extract EV yields, falling back to base Pokemon if form lacks them
      const getEVYields = () => {
        const evMap = {
          ev_hp: 'HP',
          ev_attack: 'ATK',
          ev_defense: 'DEF',
          ev_sp_attack: 'SP.ATK',
          ev_sp_defense: 'SP.DEF',
          ev_speed: 'SPE'
        }

        const evYields = []
        const yieldsSource = pokemon.yields || (basePokemon && basePokemon.yields)

        if (yieldsSource) {
          Object.entries(evMap).forEach(([key, statName]) => {
            const value = yieldsSource[key]
            if (value && value > 0) {
              evYields.push({
                stat: statName,
                value: value
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
        // Detect format: form entries use { ability_name, is_hidden }, base uses { name }
        const isFormFormat = pokemon.abilities.length > 0 && pokemon.abilities[0].ability_name !== undefined

        if (isFormFormat) {
          // Form format: [{ ability_name: "levitate", is_hidden: false, slot: 1 }, ...]
          const seenAbilities = new Set()
          pokemon.abilities.forEach(ability => {
            const name = ability.ability_name || ''
            if (!name || name === '--' || seenAbilities.has(name)) return
            seenAbilities.add(name)
            const formatted = name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
            if (ability.is_hidden) {
              abilities.hidden.push(formatted)
            } else {
              abilities.normal.push(formatted)
            }
          })
        } else {
          // Base format: [{ name: "Chlorophyll" }, ...] — last unique is hidden
          const seenAbilities = new Set()
          const uniqueAbilities = pokemon.abilities.filter(ability => {
            const abilityName = ability.name || ''
            if (!abilityName || abilityName === '--' || seenAbilities.has(abilityName)) return false
            seenAbilities.add(abilityName)
            return true
          })

          if (uniqueAbilities.length > 0) {
            const hiddenAbility = uniqueAbilities[uniqueAbilities.length - 1]
            abilities.hidden.push(hiddenAbility.name)
            uniqueAbilities.slice(0, -1).forEach(ability => {
              abilities.normal.push(ability.name)
            })
          }
        }
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
      // Handles both base format (location_name, rarity_morning/day/night) and
      // form format (location, rarity, time)
      const locations = (pokemon.location_area_encounters || []).map(loc => {
        // Detect form format by checking for 'location' field without 'location_name'
        const isFormFormat = loc.location !== undefined && loc.location_name === undefined

        const locationName = isFormFormat ? loc.location : (loc.location_name || '')
        const locationNameFull = isFormFormat ? loc.location : (loc.location_name_full || loc.location_name || '')

        // Form format uses a single 'rarity' string; map it to all three time slots
        let rarityMorning, rarityDay, rarityNight
        let isHorde3x = false
        let isHorde5x = false

        if (isFormFormat) {
          const rarity = loc.rarity || 'Unknown'
          // Detect horde from rarity string
          if (rarity === 'Horde') {
            isHorde5x = true
            rarityMorning = 'Horde'
            rarityDay = 'Horde'
            rarityNight = 'Horde'
          } else {
            rarityMorning = rarity
            rarityDay = rarity
            rarityNight = rarity
          }
        } else {
          rarityMorning = loc.rarity_morning || 'Unknown'
          rarityDay = loc.rarity_day || 'Unknown'
          rarityNight = loc.rarity_night || 'Unknown'
          isHorde3x = loc.is_horde_3x ?? false
          isHorde5x = loc.is_horde_5x ?? false
        }

        return {
          pokemon: normalizedName,
          pokemon_id: pokedexId,

          type: loc.type || '',
          region_id: loc.region_id ?? null,
          region_name: loc.region_name || '',
          location_name: locationName,
          location_name_full: locationNameFull,

          min_level: loc.min_level ?? 0,
          max_level: loc.max_level ?? 0,

          season: loc.season || 'Any',

          rarity_morning: rarityMorning,
          rarity_day: rarityDay,
          rarity_night: rarityNight,

          is_horde_3x: isHorde3x,
          is_horde_5x: isHorde5x,

          rarity_flags: loc.rarity_flags ?? 0
        }
      })

      
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
      const sprites = spriteData?.sprites
      if (spriteData) {
        // Try animated Gen V sprites first
        sprite = sprites?.versions?.['generation-v']?.['black-white']?.animated?.front_default
          // Fall back to official artwork
          || sprites?.other?.['official-artwork']?.front_default
          // Finally use the basic front_default
          || sprites?.front_default
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
        height: pokemon.height || (basePokemon && basePokemon.height) || 0,
        weight: pokemon.weight || (basePokemon && basePokemon.weight) || 0,
        types: (pokemon.types || []).filter(Boolean),
        abilities: abilities,
        stats: {
          hp: getStatValue('hp'),
          attack: getStatValue('attack'),
          defense: getStatValue('defense'),
          spAtk: getStatValue('sp_attack'),
          spDef: getStatValue('sp_defense'),
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
        genderRate: pokemon.gender_ratio !== undefined
          ? pokemon.gender_ratio
          : pokemon.gender_rate !== undefined
            ? (pokemon.gender_rate === -1 ? 255 : Math.round(pokemon.gender_rate * (254 / 8)))
            : (basePokemon && basePokemon.gender_ratio !== undefined ? basePokemon.gender_ratio : 255),
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
        evolution_chain: pokemon.evolution_chain || buildEvolutionChainFromData(lookupName)
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

