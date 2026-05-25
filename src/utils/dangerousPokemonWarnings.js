import dangerousWarnings from '../data/dangerous_pokemon_warnings.json'
import pokemonData from '../data/pokemmo_data/pokemon-data.json'

function normalizeWarningKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function buildWarningMap(entries) {
  const map = new Map()
  ;(entries || []).forEach((entry) => {
    ;[entry.name, ...(entry.aliases || [])].forEach((name) => {
      const key = normalizeWarningKey(name)
      if (key) map.set(key, entry)
    })
  })
  return map
}

const dangerousMoveMap = buildWarningMap(dangerousWarnings.moves)
const dangerousItemMap = buildWarningMap(dangerousWarnings.items)

function getMoveName(move) {
  if (typeof move === 'string') return move
  return move?.name || move?.move || move?.move_name || ''
}

function getMoveLevel(move) {
  const level = Number(move?.level ?? move?.level_learned_at ?? move?.learned_at)
  return Number.isFinite(level) ? level : null
}

function isLevelUpMove(move) {
  const type = String(move?.type || move?.learn_method || move?.move_learn_method || '').toLowerCase()
  return !type || type === 'level' || type.includes('level')
}

function getHeldItemName(item) {
  if (typeof item === 'string') return item
  return item?.item_name || item?.name || item?.item || ''
}

function getEvolutionNode(chainNode, speciesName) {
  if (!chainNode) return null
  if (normalizeWarningKey(chainNode.species?.name) === normalizeWarningKey(speciesName)) return chainNode

  for (const child of chainNode.evolves_to || []) {
    const match = getEvolutionNode(child, speciesName)
    if (match) return match
  }

  return null
}

function getEvolutionDetailsForSpecies(pokemonDetails = {}) {
  const speciesName = pokemonDetails.name
  const previousSpeciesName = pokemonDetails.evolves_from_species?.name

  if (!speciesName || !previousSpeciesName) return null

  const previousDetails = pokemonData[previousSpeciesName]
  const previousNode = getEvolutionNode(previousDetails?.evolution_chain?.chain, previousSpeciesName)
  const currentNode = (previousNode?.evolves_to || [])
    .find(node => normalizeWarningKey(node.species?.name) === normalizeWarningKey(speciesName))

  return currentNode?.evolution_details?.[0] || null
}

function getWildMoveSourceDetails(pokemonDetails = {}) {
  const evolutionDetails = getEvolutionDetailsForSpecies(pokemonDetails)
  const triggerName = String(evolutionDetails?.trigger?.name || '').toLowerCase()
  const previousSpeciesName = pokemonDetails.evolves_from_species?.name

  if (previousSpeciesName && triggerName === 'use-item') {
    return pokemonData[previousSpeciesName] || pokemonDetails
  }

  return pokemonDetails
}

function getEncounterLevels(encounter) {
  const minLevel = Number(encounter?.min_level ?? encounter?.level)
  const maxLevel = Number(encounter?.max_level ?? encounter?.level ?? encounter?.min_level)

  if (!Number.isFinite(minLevel) && !Number.isFinite(maxLevel)) return []

  const start = Number.isFinite(minLevel) ? minLevel : maxLevel
  const end = Number.isFinite(maxLevel) ? maxLevel : start
  const levels = []

  for (let level = Math.min(start, end); level <= Math.max(start, end); level += 1) {
    levels.push(level)
  }

  return levels
}

function getPossibleWildLevelUpMoves(moves = [], encounters = []) {
  const levelUpMoves = moves
    .map((move, index) => ({
      move,
      index,
      level: getMoveLevel(move),
      key: normalizeWarningKey(getMoveName(move)),
    }))
    .filter(({ move, level, key }) => isLevelUpMove(move) && level !== null && key)
    .sort((a, b) => a.level - b.level || a.index - b.index)

  const possibleMovesByKey = new Map()

  ;(encounters || []).forEach((encounter) => {
    getEncounterLevels(encounter).forEach((wildLevel) => {
      levelUpMoves
        .filter(({ level }) => level <= wildLevel)
        .slice(-4)
        .forEach((entry) => {
          if (!possibleMovesByKey.has(entry.key)) {
            possibleMovesByKey.set(entry.key, entry)
          }
        })
    })
  })

  return Array.from(possibleMovesByKey.values())
}

function shouldApplyMoveWarning(warning, pokemonDetails) {
  if (normalizeWarningKey(warning?.name) !== 'curse') return true

  return (pokemonDetails.types || [])
    .map(type => String(type || '').toLowerCase())
    .includes('ghost')
}

export function getDangerousPokemonWarnings(pokemonDetails = {}, encounters = []) {
  const warningsByKey = new Map()
  const wildMoveSourceDetails = getWildMoveSourceDetails(pokemonDetails)
  const possibleWildMoves = getPossibleWildLevelUpMoves(wildMoveSourceDetails.moves || [], encounters)

  possibleWildMoves.forEach(({ move }) => {
    const warning = dangerousMoveMap.get(normalizeWarningKey(getMoveName(move)))
    if (!warning) return
    if (!shouldApplyMoveWarning(warning, pokemonDetails)) return

    warningsByKey.set(`move:${normalizeWarningKey(warning.name)}`, {
      type: 'move',
      name: warning.name,
      message: warning.message,
    })
  })

  ;(pokemonDetails.held_items || []).forEach((item) => {
    const warning = dangerousItemMap.get(normalizeWarningKey(getHeldItemName(item)))
    if (!warning) return

    warningsByKey.set(`item:${normalizeWarningKey(warning.name)}`, {
      type: 'item',
      name: warning.name,
      message: warning.message,
    })
  })

  return Array.from(warningsByKey.values())
}

export function formatDangerousPokemonWarningTitle(warnings = []) {
  return warnings.map((warning) => `${warning.name}: ${warning.message}`).join('\n')
}
