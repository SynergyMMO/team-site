import { useMemo } from 'react'
import spritesData from '../data/pokemmo_data/pokemon-sprites.json'

/**
 * Hook to get available sprites for a Pokemon organized by generation
 * Returns an object with generations as keys and arrays of sprites as values
 * { "generation-i": [...], "generation-ii": [...], ... }
 */
export function usePokemonSprites(pokemonName) {
  return useMemo(() => {
    if (!pokemonName) return {}

    const pokemonLower = pokemonName.toLowerCase()
    const aliasMap = {
      wormadam: 'wormadam-plant',
      'gastrodon-west': 'gastrodon',
      'shellos-west': 'shellos'
    }
    const lookupName = aliasMap[pokemonLower] || pokemonLower

    const spriteData = spritesData[lookupName]

    if (!spriteData) {
      console.warn(`No sprite data found for: ${lookupName}`)
      return {}
    }

    const generationSprites = {}
    const generations = ['generation-i', 'generation-ii', 'generation-iii', 'generation-iv', 'generation-v']
    
    try {
      // Iterate through each generation
      for (const gen of generations) {
        const genData = spriteData.sprites?.versions?.[gen]
        if (!genData) continue

        const genSprites = []
        const versions = Object.keys(genData)

        // For each version in the generation (e.g., 'red-blue', 'yellow', 'gold', etc.)
        for (const version of versions) {
          const versionData = genData[version]
          if (!versionData) continue

          // Use transparent sprites for Generation I and II
          const isGenIOrII = gen === 'generation-i' || gen === 'generation-ii'

          // Handle animated versions (generation-v has animated sprites)
          if (versionData.animated) {
            const animatedData = versionData.animated
            if (animatedData.front_shiny) {
              genSprites.push({
                url: animatedData.front_shiny,
                backUrl: animatedData.back_shiny || animatedData.front_shiny,
                label: `${version.replace('-', ' ').toUpperCase()} - Animated Shiny`,
                type: 'gif'
              })
            }
            if (animatedData.front_default) {
              genSprites.push({
                url: animatedData.front_default,
                backUrl: animatedData.back_default || animatedData.front_default,
                label: `${version.replace('-', ' ').toUpperCase()} - Animated`,
                type: 'gif'
              })
            }
            // Add female variants if they exist
            if (animatedData.front_shiny_female) {
              genSprites.push({
                url: animatedData.front_shiny_female,
                backUrl: animatedData.back_shiny_female || animatedData.front_shiny_female,
                label: `${version.replace('-', ' ').toUpperCase()} - Animated Shiny (Female)`,
                type: 'gif'
              })
            }
            if (animatedData.front_female) {
              genSprites.push({
                url: animatedData.front_female,
                backUrl: animatedData.back_female || animatedData.front_female,
                label: `${version.replace('-', ' ').toUpperCase()} - Animated (Female)`,
                type: 'gif'
              })
            }
          } else {
            // Static sprites
            if (isGenIOrII) {
              // For Generation I and II, use transparent variants
              if (versionData.front_shiny_transparent) {
                genSprites.push({
                  url: versionData.front_shiny_transparent,
                  backUrl: versionData.back_shiny_transparent || versionData.front_shiny_transparent,
                  label: `${version.replace('-', ' ').toUpperCase()} - Shiny`,
                  type: 'png'
                })
              }
              if (versionData.front_transparent) {
                genSprites.push({
                  url: versionData.front_transparent,
                  backUrl: versionData.back_transparent || versionData.front_transparent,
                  label: `${version.replace('-', ' ').toUpperCase()} - Normal`,
                  type: 'png'
                })
              }
              // Add female variants if they exist
              if (versionData.front_shiny_transparent_female) {
                genSprites.push({
                  url: versionData.front_shiny_transparent_female,
                  backUrl: versionData.back_shiny_transparent_female || versionData.front_shiny_transparent_female,
                  label: `${version.replace('-', ' ').toUpperCase()} - Shiny (Female)`,
                  type: 'png'
                })
              }
              if (versionData.front_transparent_female) {
                genSprites.push({
                  url: versionData.front_transparent_female,
                  backUrl: versionData.back_transparent_female || versionData.front_transparent_female,
                  label: `${version.replace('-', ' ').toUpperCase()} - Normal (Female)`,
                  type: 'png'
                })
              }
            } else {
              // For other generations, use regular sprites
              if (versionData.front_shiny) {
                genSprites.push({
                  url: versionData.front_shiny,
                  backUrl: versionData.back_shiny || versionData.front_shiny,
                  label: `${version.replace('-', ' ').toUpperCase()} - Shiny`,
                  type: 'png'
                })
              }
              if (versionData.front_default) {
                genSprites.push({
                  url: versionData.front_default,
                  backUrl: versionData.back_default || versionData.front_default,
                  label: `${version.replace('-', ' ').toUpperCase()} - Normal`,
                  type: 'png'
                })
              }
              // Add female variants if they exist
              if (versionData.front_shiny_female) {
                genSprites.push({
                  url: versionData.front_shiny_female,
                  backUrl: versionData.back_shiny_female || versionData.front_shiny_female,
                  label: `${version.replace('-', ' ').toUpperCase()} - Shiny (Female)`,
                  type: 'png'
                })
              }
              if (versionData.front_female) {
                genSprites.push({
                  url: versionData.front_female,
                  backUrl: versionData.back_female || versionData.front_female,
                  label: `${version.replace('-', ' ').toUpperCase()} - Normal (Female)`,
                  type: 'png'
                })
              }
            }
          }
        }

        if (spriteData.sprites?.other?.['official-artwork']) {
          const official = spriteData.sprites.other['official-artwork']
          if (gen === 'generation-v') { 
            if (official.front_shiny) {
              genSprites.push({
                url: official.front_shiny,
                backUrl: official.front_shiny, // Artwork doesn't have back variants
                label: 'Official Artwork - Shiny',
                type: 'png'
              })
            }
            if (official.front_default) {
              genSprites.push({
                url: official.front_default,
                backUrl: official.front_default, // Artwork doesn't have back variants
                label: 'Official Artwork - Normal',
                type: 'png'
              })
            }
            // Add female variants if they exist
            if (official.front_shiny_female) {
              genSprites.push({
                url: official.front_shiny_female,
                backUrl: official.front_shiny_female, // Artwork doesn't have back variants
                label: 'Official Artwork - Shiny (Female)',
                type: 'png'
              })
            }
            if (official.front_female) {
              genSprites.push({
                url: official.front_female,
                backUrl: official.front_female, // Artwork doesn't have back variants
                label: 'Official Artwork - Normal (Female)',
                type: 'png'
              })
            }
          }
        }

        if (genSprites.length > 0) {
          generationSprites[gen] = genSprites
        }
      }

      if (Object.keys(generationSprites).length === 0) {
        console.warn(`No sprites found for ${lookupName}`)
      }
    } catch (error) {
      console.error(`Error processing sprites for ${lookupName}:`, error)
    }

    return generationSprites
  }, [pokemonName])
}
