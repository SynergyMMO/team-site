import { useMemo } from 'react'
import spritesData from '../data/pokemmo_data/pokemon-sprites.json'

/**
 * Get display label for a pokemon form, handling special cases like Unown
 */
function getFormDisplayLabel(formName) {
  const displayNameMap = {
    meloetta: 'Aria',
    'meloetta-aria': 'Aria',
    'meloetta-pirouette': 'Pirouette',
    'keldeo-ordinary': 'Ordinary',
    'keldeo-resolute': 'Resolute',
    unown: 'A',
    'unown-a': 'A',
    'unown-b': 'B',
    'unown-c': 'C',
    'unown-d': 'D',
    'unown-e': 'E',
    'unown-f': 'F',
    'unown-g': 'G',
    'unown-h': 'H',
    'unown-i': 'I',
    'unown-j': 'J',
    'unown-k': 'K',
    'unown-l': 'L',
    'unown-m': 'M',
    'unown-n': 'N',
    'unown-o': 'O',
    'unown-p': 'P',
    'unown-q': 'Q',
    'unown-r': 'R',
    'unown-s': 'S',
    'unown-t': 'T',
    'unown-u': 'U',
    'unown-v': 'V',
    'unown-w': 'W',
    'unown-x': 'X',
    'unown-y': 'Y',
    'unown-z': 'Z',
    'unown-exclamation': '!',
    'unown-question': '?'
  }
  
  const mapped = displayNameMap[formName.toLowerCase()]
  if (mapped) return mapped
  
  // Default formatting
  return formName.charAt(0).toUpperCase() + formName.slice(1)
}

/**
 * Hook to get available forms (including gender variants) for a Pokemon
 * Returns array of form objects with name, label, and type (form or gender)
 * Works from any variant - e.g., rotom-fan will still show all rotom forms
 */
export function usePokemonForms(pokemonName) {
  return useMemo(() => {
    if (!pokemonName) return []

    const pokemonLower = pokemonName.toLowerCase()
    
    // Special cases where the standard form has a hyphen in its name
    const specialStandardForms = {
      'meloetta-aria': 'meloetta',
      'meloetta-pirouette': 'meloetta',
      'keldeo-ordinary': 'keldeo',
      'keldeo-resolute': 'keldeo'
    }
    
    // Extract base name by finding all variants and determining the common base
    // This ensures rotom-fan shows all rotom forms, frillish-f shows all frillish variants, etc.
    let baseName = pokemonLower
    
    // Check for special cases where standard form has a hyphen (e.g., meloetta-aria)
    if (specialStandardForms[pokemonLower]) {
      baseName = specialStandardForms[pokemonLower]
    }
    // Check if current name is a known variant in sprites data
    else if (spritesData[pokemonLower]) {
      // It exists in sprites, use it or find its base
      // Try to find the base by checking if removing a suffix gives us another variant
      const parts = pokemonLower.split('-')
      if (parts.length > 1) {
        // Try progressively removing suffixes to find base form
        for (let i = parts.length - 1; i > 0; i--) {
          const potentialBase = parts.slice(0, i).join('-')
          if (spritesData[potentialBase]) {
            baseName = potentialBase
            break
          }
        }
      }
    } else {
      // Not in sprites, try to find base by removing suffixes
      const parts = pokemonLower.split('-')
      if (parts.length > 1) {
        for (let i = parts.length - 1; i > 0; i--) {
          const potentialBase = parts.slice(0, i).join('-')
          if (spritesData[potentialBase]) {
            baseName = potentialBase
            break
          }
        }
      }
    }

    // Collect all variants for this base Pokemon
    const variants = []
    
    // Add the base form first (only if it exists in sprites data)
    if (spritesData[baseName]) {
      variants.push({
        name: baseName,
        label: getFormDisplayLabel(baseName) + ' (Male)',
        type: 'gender',
        displayLabel: getFormDisplayLabel(baseName)
      })
    }

    // Scan all sprites for variants of this base name
    Object.keys(spritesData).forEach(key => {
      const keyLower = key.toLowerCase()
      
      // Skip the base form (already added)
      if (keyLower === baseName) return
      
      // Check for form variants (e.g., rotom-heat for rotom)
      if (keyLower.startsWith(baseName + '-')) {
        const suffix = keyLower.substring(baseName.length + 1)
        // Skip gender-only suffixes (we handle those separately)
        if (suffix !== 'f' && suffix !== 'm' && !suffix.endsWith('-f') && !suffix.endsWith('-m')) {
          const existing = variants.find(v => v.name === keyLower)
          if (!existing) {
            variants.push({
              name: keyLower,
              label: getFormDisplayLabel(keyLower),
              type: 'form',
              displayLabel: getFormDisplayLabel(keyLower)
            })
          }
        }
      }
    })
    // Sort: base first, then forms alphabetically, then female, special chars (! ?) at end
    variants.sort((a, b) => {
      // Base form first
      if (a.name === baseName) return -1
      if (b.name === baseName) return 1
      
      // Special Unown forms (! ?) go to the end
      const aIsSpecial = a.name === 'unown-exclamation' || a.name === 'unown-question'
      const bIsSpecial = b.name === 'unown-exclamation' || b.name === 'unown-question'
      if (aIsSpecial && !bIsSpecial) return 1
      if (!aIsSpecial && bIsSpecial) return -1
      
      // Between special chars, ! comes before ?
      if (aIsSpecial && bIsSpecial) {
        if (a.name === 'unown-exclamation') return -1
        if (b.name === 'unown-exclamation') return 1
      }
      
      // Regular forms: forms before genders
      if (a.type !== b.type) return a.type === 'form' ? -1 : 1
      
      // Alphabetically
      return a.displayLabel.localeCompare(b.displayLabel)
    })

    return variants
  }, [pokemonName])
}
