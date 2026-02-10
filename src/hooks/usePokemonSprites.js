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
    const femaleOverride = femaleOverrides[pokemonLower]
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
    const spriteData = spritesData[pokemonLower]

    if (!spriteData || !spriteData.sprites) return []

    const sprites = []
    const { animated, official } = spriteData.sprites

    // Animated Shiny (DEFAULT - comes first)
    if (animated?.shiny) {
      sprites.push({
        url: animated.shiny,
        label: 'Animated Shiny',
        type: 'gif'
      })
    }

    // Animated Normal
    if (animated?.normal) {
      sprites.push({
        url: animated.normal,
        label: 'Animated',
        type: 'gif'
      })
    }

    // Official Artwork Shiny
    if (official?.shiny) {
      sprites.push({
        url: official.shiny,
        label: 'Official Artwork Shiny',
        type: 'image'
      })
    }

    // Official Artwork Normal
    if (official?.normal) {
      sprites.push({
        url: official.normal,
        label: 'Official Artwork',
        type: 'image'
      })
    }

    return sprites
  }, [pokemonName])
}
