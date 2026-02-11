import { useMemo } from 'react'
import spritesData from '../data/pokemmo_data/pokemon-sprites.json'

/**
 * Hook to get available sprites for a Pokemon
 * Returns animated shiny sprite as default, then other variants
 */
export function usePokemonSprites(pokemonName) {
  return useMemo(() => {
    if (!pokemonName) return []

    const pokemonLower = pokemonName.toLowerCase()
    const aliasMap = {
      wormadam: 'wormadam-plant',
      'gastrodon-west': 'gastrodon',
      'shellos-west': 'shellos'
    }
    const lookupName = aliasMap[pokemonLower] || pokemonLower
    const femaleOverrides = {
      'frillish-f': {
        animated: {
          shiny: 'https://img.pokemondb.net/sprites/black-white/anim/shiny/frillish-f.gif',
          normal: 'https://img.pokemondb.net/sprites/black-white/anim/normal/frillish-f.gif',
        },
        official: {
          shiny: 'https://img.pokemondb.net/sprites/home/shiny/frillish-f.png',
          normal: 'https://img.pokemondb.net/sprites/home/normal/frillish-f.png',
        },
      },
      'jellicent-f': {
        animated: {
          shiny: 'https://img.pokemondb.net/sprites/black-white/anim/shiny/jellicent-f.gif',
          normal: 'https://img.pokemondb.net/sprites/black-white/anim/normal/jellicent-f.gif',
        },
        official: {
          shiny: 'https://img.pokemondb.net/sprites/home/shiny/jellicent-f.png',
          normal: 'https://img.pokemondb.net/sprites/home/normal/jellicent-f.png',
        },
      },
      'unfezant-f': {
        animated: {
          shiny: 'https://img.pokemondb.net/sprites/black-white/anim/shiny/unfezant-f.gif',
          normal: 'https://img.pokemondb.net/sprites/black-white/anim/normal/unfezant-f.gif',
        },
        official: {
          shiny: 'https://img.pokemondb.net/sprites/home/shiny/unfezant-f.png',
          normal: 'https://img.pokemondb.net/sprites/home/normal/unfezant-f.png',
        },
      },
    }
    const femaleOverride = femaleOverrides[lookupName]
    if (femaleOverride) {
      const sprites = []

      if (femaleOverride.animated?.shiny) {
        sprites.push({
          url: femaleOverride.animated.shiny,
          label: 'Animated Shiny',
          type: 'gif'
        })
      }

      if (femaleOverride.animated?.normal) {
        sprites.push({
          url: femaleOverride.animated.normal,
          label: 'Animated',
          type: 'gif'
        })
      }

      if (femaleOverride.official?.shiny) {
        sprites.push({
          url: femaleOverride.official.shiny,
          label: 'Official Artwork Shiny',
          type: 'image'
        })
      }

      if (femaleOverride.official?.normal) {
        sprites.push({
          url: femaleOverride.official.normal,
          label: 'Official Artwork',
          type: 'image'
        })
      }

      return sprites
    }
    const spriteData = spritesData[lookupName]

    if (!spriteData) return []

    const sprites = []
    
    // Extract sprite URLs from new JSON structure
    // Animated sprites from Generation V (Black-White) with animations
    const animatedGen5 = spriteData.versions?.['generation-v']?.['black-white']?.animated
    const otherSprites = spriteData.other
    
    // Animated Shiny (DEFAULT - comes first)
    if (animatedGen5?.front_shiny) {
      sprites.push({
        url: animatedGen5.front_shiny,
        label: 'Animated Shiny',
        type: 'gif'
      })
    }

    // Animated Normal
    if (animatedGen5?.front_default) {
      sprites.push({
        url: animatedGen5.front_default,
        label: 'Animated',
        type: 'gif'
      })
    }

    // Official Artwork Shiny
    if (otherSprites?.['official-artwork']?.front_shiny) {
      sprites.push({
        url: otherSprites['official-artwork'].front_shiny,
        label: 'Official Artwork Shiny',
        type: 'image'
      })
    }

    // Official Artwork Normal
    if (otherSprites?.['official-artwork']?.front_default) {
      sprites.push({
        url: otherSprites['official-artwork'].front_default,
        label: 'Official Artwork',
        type: 'image'
      })
    }

    // Home (newer official artwork) Shiny
    if (otherSprites?.home?.front_shiny) {
      sprites.push({
        url: otherSprites.home.front_shiny,
        label: 'Home Shiny',
        type: 'image'
      })
    }

    // Home (newer official artwork) Normal
    if (otherSprites?.home?.front_default) {
      sprites.push({
        url: otherSprites.home.front_default,
        label: 'Home Artwork',
        type: 'image'
      })
    }

    return sprites
  }, [pokemonName])
}
