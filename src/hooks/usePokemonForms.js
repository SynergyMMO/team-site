import { useMemo } from 'react'
import spritesData from '../data/pokemmo_data/pokemon-sprites.json'

function getFormDisplayLabel(formName) {
  const displayNameMap = {
    meloetta: 'Aria',
    'meloetta-aria': 'Aria',
    'meloetta-pirouette': 'Pirouette',
    'keldeo-ordinary': 'Ordinary',
    'keldeo-resolute': 'Resolute',
    'tornadus-incarnate': 'Incarnate',
    'tornadus-therian': 'Therian',
    'thundurus-incarnate': 'Incarnate',
    'thundurus-therian': 'Therian',
    'landorus-incarnate': 'Incarnate',
    'landorus-therian': 'Therian',
    'wormadam-plant': 'Plant',
    'wormadam-sandy': 'Sandy',
    'wormadam-trash': 'Trash',
    'deoxys-normal': 'Normal',
    'deoxys-attack': 'Attack',
    'deoxys-defense': 'Defense',
    'deoxys-speed': 'Speed',
    'shaymin-land': 'Land',
    'shaymin-sky': 'Sky',
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

  return formName.charAt(0).toUpperCase() + formName.slice(1)
}

export function usePokemonForms(pokemonName) {
  return useMemo(() => {
    if (!pokemonName) return []

    const pokemonLower = pokemonName.toLowerCase()

    const specialStandardForms = {
      'meloetta-aria': 'meloetta',
      'meloetta-pirouette': 'meloetta',
      'keldeo-ordinary': 'keldeo',
      'keldeo-resolute': 'keldeo',
      'tornadus-incarnate': 'tornadus',
      'tornadus-therian': 'tornadus',
      'thundurus-incarnate': 'thundurus',
      'thundurus-therian': 'thundurus',
      'landorus-incarnate': 'landorus',
      'landorus-therian': 'landorus',
      'wormadam-plant': 'wormadam',
      'wormadam-sandy': 'wormadam',
      'wormadam-trash': 'wormadam',
      'deoxys-normal': 'deoxys',
      'deoxys-attack': 'deoxys',
      'deoxys-defense': 'deoxys',
      'deoxys-speed': 'deoxys',
      'shaymin-land': 'shaymin',
      'shaymin-sky': 'shaymin'
    }

    let baseName = pokemonLower

    if (specialStandardForms[pokemonLower]) {
      baseName = specialStandardForms[pokemonLower]
    }

    else if (spritesData[pokemonLower]) {

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
    } else {

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

    const variants = []

    if (spritesData[baseName]) {
      variants.push({
        name: baseName,
        label: getFormDisplayLabel(baseName) + ' (Male)',
        type: 'gender',
        displayLabel: getFormDisplayLabel(baseName)
      })
    }

    Object.keys(spritesData).forEach(key => {
      const keyLower = key.toLowerCase()

      if (keyLower === baseName) return

      if (keyLower.startsWith(baseName + '-')) {
        const suffix = keyLower.substring(baseName.length + 1)

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

    variants.sort((a, b) => {

      if (a.name === baseName) return -1
      if (b.name === baseName) return 1

      const aIsSpecial = a.name === 'unown-exclamation' || a.name === 'unown-question'
      const bIsSpecial = b.name === 'unown-exclamation' || b.name === 'unown-question'
      if (aIsSpecial && !bIsSpecial) return 1
      if (!aIsSpecial && bIsSpecial) return -1

      if (aIsSpecial && bIsSpecial) {
        if (a.name === 'unown-exclamation') return -1
        if (b.name === 'unown-exclamation') return 1
      }

      if (a.type !== b.type) return a.type === 'form' ? -1 : 1

      return a.displayLabel.localeCompare(b.displayLabel)
    })

    return variants
  }, [pokemonName])
}

