import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useRef,useMemo, useState, useEffect } from 'react'
import { usePokemonDetails } from '../../hooks/usePokemonDetails'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import { useDatabase } from '../../hooks/useDatabase'
import { usePokemonOrder } from '../../hooks/usePokemonOrder'
import { usePokemonSprites } from '../../hooks/usePokemonSprites'
import { usePokemonForms } from '../../hooks/usePokemonForms'
import BackButton from '../../components/BackButton/BackButton'
import styles from './PokemonDetail.module.css'
import abilitiesData from '../../data/pokemmo_data/abilities-data.json'

const TYPE_COLORS = {
  normal: '#A8A878',
  fire: '#F08030',
  water: '#6890F0',
  electric: '#F8D030',
  grass: '#78C850',
  ice: '#98D8D8',
  fighting: '#C03028',
  poison: '#A040A0',
  ground: '#E0C068',
  flying: '#A890F0',
  psychic: '#F85888',
  bug: '#A8B820',
  rock: '#B8A038',
  ghost: '#705898',
  dragon: '#7038F8',
  dark: '#705848',
  steel: '#B8B8D0',
  fairy: '#EE99AC',
}

const TIER_COLORS = {
  0: '#ffd700',
  1: '#c084fc',
  2: '#60a5fa',
  3: '#4ade80',
  4: '#2dd4bf',
  5: '#fb923c',
  6: '#94a3b8',
  7: '#cbd5e1',
}

// Type effectiveness chart - what types are weak to/resistant to
const TYPE_EFFECTIVENESS = {
  normal:   { weak: ['fighting'], resists: [], immune: ['ghost'] },
  fire:     { weak: ['water','ground','rock'], resists: ['fire','grass','ice','bug','steel'], immune: [] },
  water:    { weak: ['electric','grass'], resists: ['steel','fire','water','ice'], immune: [] },
  electric: { weak: ['ground'], resists: ['flying','steel','electric'], immune: [] },
  grass:    { weak: ['fire','ice','poison','flying','bug'], resists: ['ground','water','grass','electric'], immune: [] },
  ice:      { weak: ['fire','fighting','rock','steel'], resists: ['ice'], immune: [] },
  fighting: { weak: ['flying','psychic'], resists: ['bug','rock','dark'], immune: [] },
  poison:   { weak: ['ground','psychic'], resists: ['fighting','poison','bug','grass'], immune: [] },
  ground:   { weak: ['water','grass','ice'], resists: ['poison','rock'], immune: ['electric'] },
  flying:   { weak: ['electric','ice','rock'], resists: ['fighting','bug','grass'], immune: ['ground'] },
  psychic:  { weak: ['bug','ghost','dark'], resists: ['fighting','psychic'], immune: [] },
  bug:      { weak: ['fire','flying','rock'], resists: ['ground','grass','fighting'], immune: [] },
  rock:     { weak: ['water','grass','fighting','ground','steel'], resists: ['normal','flying','poison','fire'], immune: [] },
  ghost:    { weak: ['ghost','dark'], resists: ['poison','bug'], immune: ['normal','fighting'] },
  dragon:   { weak: ['ice','dragon'], resists: ['fire','water','grass','electric'], immune: [] },
  dark:     { weak: ['fighting','bug'], resists: ['ghost','dark'], immune: ['psychic'] },
  steel:    { weak: ['fire','water','ground'], resists: ['normal','flying','rock','bug','steel','grass','psychic','ice','dragon'], immune: ['poison'] },
}


/**
 * Get human-readable label for move learning method
 * @param {string} method - The learning method name (level-up, egg, machine, tutor, etc.)
 * @param {number} level - The level at which the move is learned (for level-up)
 * @returns {string} Human-readable description
 */
function getMoveLearningMethod(method, level) {
  if (!method) return 'Unknown'
  
  const methodMap = {
    'level-up': level ? `Lvl ${level}` : 'Level Up',
    'egg': 'Egg Move',
    'machine': 'TM/HM',
    'tutor': 'Move Tutor',
    'reminder': 'Move Reminder',
    'form-change': 'Form Change',
  }
  
  return methodMap[method] || method.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

/**
 * Get the sort priority for a learning method
 * Lower number = displayed first
 */
function getMethodPriority(method) {
  const priorityMap = {
    'level-up': 1,
    'machine': 2,
    'tutor': 3,
    'egg': 4,
    'reminder': 5,
    'form-change': 6,
  }
  return priorityMap[method] || 999
}

/**
 * Group moves by their learning method and return in priority order
 */
function groupMovesByMethod(moves) {
  const grouped = {
    'level-up': [],
    'machine': [],
    'tutor': [],
    'egg': [],
    'other': [],
  }
  
  moves.forEach(move => {
    const primaryMethod = move.methods?.[0]
    const method = primaryMethod?.method || 'other'
    
    if (grouped[method] !== undefined) {
      grouped[method].push(move)
    } else {
      grouped.other.push(move)
    }
  })
  
  // Sort level-up moves by level
  grouped['level-up'].sort((a, b) => {
    const levelA = a.methods?.[0]?.level || 0
    const levelB = b.methods?.[0]?.level || 0
    return levelA - levelB
  })
  
  return grouped
}

function getStatColor(value) {
  const safeValue = Number.isFinite(value) ? value : 0
  const clamped = Math.max(0, Math.min(200, safeValue))
  const hue = (clamped / 200) * 120
  return `hsl(${hue}, 70%, 45%)`
}

function getEggGroupColor(group) {
  if (!group) return '#ffffff'
  const normalized = group.toLowerCase().replace(/[^a-z0-9]/g, '')
  const groupMap = {
    monster: TYPE_COLORS.dragon,
    plant: TYPE_COLORS.grass,
    grass: TYPE_COLORS.grass,
    bug: TYPE_COLORS.bug,
    water1: TYPE_COLORS.water,
    water2: TYPE_COLORS.water,
    water3: TYPE_COLORS.water,
    water: TYPE_COLORS.water,
    flying: TYPE_COLORS.flying,
    fairy: TYPE_COLORS.fairy,
    dragon: TYPE_COLORS.dragon,
    mineral: TYPE_COLORS.rock,
    amorphous: TYPE_COLORS.ghost,
    field: TYPE_COLORS.normal,
    ditto: TYPE_COLORS.normal,
    humanlike: TYPE_COLORS.psychic,
    humanoid: TYPE_COLORS.psychic,
  }
  if (normalized.startsWith('water')) {
    return TYPE_COLORS.water
  }
  return groupMap[normalized] || TYPE_COLORS[normalized] || '#ffffff'
}

function formatEncounterTime(time) {
  if (!time) return ''
  return time
    .replace(/SEASON0/g, 'Summer')
    .replace(/SEASON1/g, 'Spring')
    .replace(/SEASON2/g, 'Autumn')
    .replace(/SEASON3/g, 'Winter')
}

/**
 * Calculate combined type effectiveness for Pokemon with one or more types
 * Handles stacking weaknesses (2x + 2x = 4x), canceling resistances, and immunities
 * @param {Array<string>} types - Array of Pokemon types (e.g., ['fire', 'flying'])
 * @returns {Object} Organized effectiveness data with weak, resist, and immune arrays
 */
function calculateCombinedTypeEffectiveness(types) {
  if (!types || types.length === 0) {
    return {
      fourxWeak: [],
      twoXWeak: [],
      neutral: [],
      halfDmg: [],
      quarterDmg: [],
      immune: []
    }
  }

  const result = {
    fourxWeak: [],
    twoXWeak: [],
    neutral: [],
    halfDmg: [],
    quarterDmg: [],
    immune: []
  }

  Object.keys(TYPE_EFFECTIVENESS).forEach(attackType => {
    let multiplier = 1

    types.forEach(defenseType => {
      const typeData = TYPE_EFFECTIVENESS[defenseType.toLowerCase()]
      if (!typeData) return

      if (typeData.immune.includes(attackType)) {
        multiplier *= 0
      } else if (typeData.weak.includes(attackType)) {
        multiplier *= 2
      } else if (typeData.resists.includes(attackType)) {
        multiplier *= 0.5
      }
    })

    // Categorize final multiplier
    if (multiplier === 0) {
      result.immune.push(attackType)
    } else if (multiplier === 4) {
      result.fourxWeak.push(attackType)
    } else if (multiplier === 2) {
      result.twoXWeak.push(attackType)
    } else if (multiplier === 0.5) {
      result.halfDmg.push(attackType)
    } else if (multiplier === 0.25) {
      result.quarterDmg.push(attackType)
    } else {
      result.neutral.push(attackType)
    }
  })

  return result
}

/**
 * Get ability data from abilities-data.json
 * Converts ability name to slug format for lookup (e.g., "Flash Fire" -> "flash-fire")
 */
function getAbilityInfo(abilityName) {
  if (!abilityName) return null
  const slugName = abilityName.toLowerCase().replace(/\s+/g, '-')
  return abilitiesData[slugName] || null
}

/**
 * Format evolution details into a readable string
 */
function formatEvolutionDetails(details) {
  if (!details || details.length === 0) return 'Unknown'
  
  const detail = details[0]
  
  // Special case for level-up with location requirement
  if (detail.trigger?.name === 'level-up' && detail.location?.name) {
    return 'Level up near the respective stone'
  }
  
  const parts = []
  
  if (detail.trigger?.name) {
    const triggerMap = {
      'level-up': 'Level Up',
      'use-item': 'Use Item',
      'trade': 'Trade',
      'shedding': 'Shedding',
      'spin': 'Spin',
      'tower-of-darkness': 'Tower of Darkness',
      'tower-of-waters': 'Tower of Waters'
    }
    parts.push(triggerMap[detail.trigger.name] || detail.trigger.name)
  }
  
  if (detail.min_level) {
    parts.push(`at Level ${detail.min_level}`)
  }
  
  if (detail.item?.name) {
    parts.push(`with ${detail.item.name.replace('-', ' ')}`)
  }
  
  if (detail.held_item?.name) {
    parts.push(`holding ${detail.held_item.name.replace('-', ' ')}`)
  }
  
  if (detail.known_move) {
    parts.push(`knows ${detail.known_move}`)
  }
  
  if (detail.min_happiness) {
    parts.push(`with ${detail.min_happiness} happiness`)
  }
  
  if (detail.min_affection) {
    parts.push(`with ${detail.min_affection} affection`)
  }
  
  if (detail.time_of_day && detail.time_of_day.length > 0) {
    parts.push(`at ${detail.time_of_day}`)
  }
  
  return parts.length > 0 ? parts.join(' ') : 'Unknown'
}

/**
 * Recursively render evolution chain
 */
function renderEvolutionChain(chainLink, navigate, hoveredEvolution, setHoveredEvolution, parentSpeciesName = null) {
  if (!chainLink) return null
  
  const { species, evolves_to, evolution_details } = chainLink
  const evolutionId = `${parentSpeciesName || 'root'}-${species?.name}`
  
  return (
    <div key={species?.name} className={styles.chainNode}>
      <button
        onClick={() => navigate(`/pokemon/${species.name}`, { state: { fromPokemon: true } })}
        className={styles.chainPokemon}
        title={`View ${species.name}`}
        onMouseEnter={() => evolution_details && evolution_details.length > 0 && setHoveredEvolution(evolutionId)}
        onMouseLeave={() => setHoveredEvolution(null)}
      >
        <span className={styles.chainPokemonName}>
          {species.name.charAt(0).toUpperCase() + species.name.slice(1).replace('-', ' ')}
        </span>
        {evolution_details && evolution_details.length > 0 && (
          <span className={styles.chainCondition}>{formatEvolutionDetails(evolution_details)}</span>
        )}
        {hoveredEvolution === evolutionId && evolution_details && evolution_details.length > 0 && (
          <div className={styles.evolutionTooltip}>
            {formatEvolutionDetails(evolution_details)}
          </div>
        )}
      </button>
      
      {evolves_to && evolves_to.length > 0 && (
        <div className={styles.chainBranch}>
          <div className={styles.chainArrow}>↓</div>
          <div className={styles.chainChildren}>
            {evolves_to.map((child, index) => (
              <div key={child.species?.name} className={styles.chainChild}>
                {evolves_to.length > 1 && <span className={styles.branchLabel}>{index === 0 ? 'Option A' : 'Option B'}</span>}
                {renderEvolutionChain(child, navigate, hoveredEvolution, setHoveredEvolution, species?.name)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Pokemon with advanced branching evolutions
const BRANCHING_EVOLUTION_POKEMON = ['eevee', 'vaporeon', 'jolteon', 'flareon', 'espeon', 'umbreon', 'leafeon', 'glaceon', 'sylveon', 'tyrogue', 'hitmonlee', 'hitmonchan', 'hitmontop']

/**
 * Check if a Pokemon has branching evolutions
 */
function hasBranchingEvolutions(pokemonName) {
  return BRANCHING_EVOLUTION_POKEMON.includes(pokemonName?.toLowerCase())
}

/**
 * Count the number of evolutions in a linear chain
 */
function countLinearEvolutions(chainLink) {
  const buildChainArray = (link, arr = []) => {
    if (!link) return arr
    arr.push(link)
    if (link.evolves_to && link.evolves_to.length > 0) {
      return buildChainArray(link.evolves_to[0], arr)
    }
    return arr
  }
  return buildChainArray(chainLink).length
}

/**
 * Render simple linear evolution chain with basic branching support
 */
function renderEvolutionChainLinear(chainLink, navigate, currentPokemonName, hoveredEvolution, setHoveredEvolution) {
  if (!chainLink) return null
  
  // Build the chain array
  const buildChainArray = (link, arr = []) => {
    if (!link) return arr
    arr.push(link)
    if (link.evolves_to && link.evolves_to.length > 0) {
      return buildChainArray(link.evolves_to[0], arr)
    }
    return arr
  }
  
  const chainArray = buildChainArray(chainLink)
  
  // Find the index where branching occurs (if any)
  const branchingIndex = chainArray.findIndex(link => link.evolves_to && link.evolves_to.length > 1)
  
  return (
    <>
      {chainArray.map((link, index) => {
        // Stop rendering after we've shown the branching point
        if (branchingIndex !== -1 && index > branchingIndex) {
          return null
        }
        
        const hasSimpleBranch = link.evolves_to && link.evolves_to.length > 1
        const isCurrent = link.species?.name === currentPokemonName?.toLowerCase()
        const evolutionId = `linear-${index}-${link.species?.name}`
        
        return (
          <div key={link.species?.name} className={styles.linearEvolutionRow}>
            <button
              onClick={() => navigate(`/pokemon/${link.species.name}`, { state: { fromPokemon: true } })}
              className={`${styles.chainPokemon} ${isCurrent ? styles.chainPokemonCurrent : ''}`}
              style={{ minWidth: '140px', padding: '0.75rem 1rem', fontSize: '0.9rem' }}
              title={`View ${link.species.name}`}
              onMouseEnter={() => link.evolution_details && link.evolution_details.length > 0 && setHoveredEvolution(evolutionId)}
              onMouseLeave={() => setHoveredEvolution(null)}
            >
              <span className={styles.chainPokemonName}>
                {link.species.name.charAt(0).toUpperCase() + link.species.name.slice(1).replace('-', ' ')}
              </span>
              {link.evolution_details && link.evolution_details.length > 0 && (
                <span className={styles.chainCondition} style={{ maxWidth: '140px', fontSize: '0.7rem' }}>
                  {formatEvolutionDetails(link.evolution_details)}
                </span>
              )}
              {hoveredEvolution === evolutionId && link.evolution_details && link.evolution_details.length > 0 && (
                <div className={styles.evolutionTooltip}>
                  {formatEvolutionDetails(link.evolution_details)}
                </div>
              )}
            </button>
            
            {hasSimpleBranch ? (
              <>
                <span className={styles.evolutionArrow}>→</span>
                <div className={styles.simpleBranchedEvolutions}>
                  {link.evolves_to.map((branch) => {
                    const branchIsCurrent = branch.species?.name === currentPokemonName?.toLowerCase()
                    const branchEvolutionId = `linear-branch-${index}-${branch.species?.name}`
                    return (
                      <button
                        key={branch.species?.name}
                        onClick={() => navigate(`/pokemon/${branch.species.name}`, { state: { fromPokemon: true } })}
                        className={`${styles.chainPokemon} ${branchIsCurrent ? styles.chainPokemonCurrent : ''}`}
                        style={{ minWidth: '140px', padding: '0.75rem 1rem', fontSize: '0.9rem' }}
                        title={`View ${branch.species.name}`}
                        onMouseEnter={() => branch.evolution_details && branch.evolution_details.length > 0 && setHoveredEvolution(branchEvolutionId)}
                        onMouseLeave={() => setHoveredEvolution(null)}
                      >
                        <span className={styles.chainPokemonName}>
                          {branch.species.name.charAt(0).toUpperCase() + branch.species.name.slice(1).replace('-', ' ')}
                        </span>
                        {branch.evolution_details && branch.evolution_details.length > 0 && (
                          <span className={styles.chainCondition} style={{ maxWidth: '140px', fontSize: '0.7rem' }}>
                            {formatEvolutionDetails(branch.evolution_details)}
                          </span>
                        )}
                        {hoveredEvolution === branchEvolutionId && branch.evolution_details && branch.evolution_details.length > 0 && (
                          <div className={styles.evolutionTooltip}>
                            {formatEvolutionDetails(branch.evolution_details)}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </>
            ) : index < branchingIndex || (branchingIndex === -1 && index < chainArray.length - 1) ? (
              <span className={styles.evolutionArrow}>→</span>
            ) : null}
          </div>
        )
      })}
    </>
  )
}

/**
 * Recursively render evolution chain horizontally with branching support
 */
function renderEvolutionChainHorizontal(chainLink, navigate, currentPokemonName, hoveredEvolution, setHoveredEvolution) {
  if (!chainLink) return null
  
  // Build the chain array following the first evolution path
  const buildChainArray = (link, arr = []) => {
    if (!link) return arr
    arr.push(link)
    if (link.evolves_to && link.evolves_to.length > 0) {
      return buildChainArray(link.evolves_to[0], arr)
    }
    return arr
  }
  
  const chainArray = buildChainArray(chainLink)
  
  // Find the index where branching occurs
  const branchingIndex = chainArray.findIndex(link => link.evolves_to && link.evolves_to.length > 1)
  
  return (
    <>
      {chainArray.map((link, index) => {
        // Stop rendering after we've shown the branching point
        if (branchingIndex !== -1 && index > branchingIndex) {
          return null
        }
        
        const isCurrent = link.species?.name === currentPokemonName?.toLowerCase()
        const hasBranches = link.evolves_to && link.evolves_to.length > 1
        const evolutionId = `horizontal-${index}-${link.species?.name}`
        
        return (
          <div key={link.species?.name} style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
            <button
              onClick={() => navigate(`/pokemon/${link.species.name}`, { state: { fromPokemon: true } })}
              className={`${styles.chainPokemon} ${isCurrent ? styles.chainPokemonCurrent : ''}`}
              style={{ minWidth: '140px', padding: '0.75rem 1rem', fontSize: '0.9rem' }}
              title={`View ${link.species.name}`}
              onMouseEnter={() => link.evolution_details && link.evolution_details.length > 0 && setHoveredEvolution(evolutionId)}
              onMouseLeave={() => setHoveredEvolution(null)}
            >
              <span className={styles.chainPokemonName}>
                {link.species.name.charAt(0).toUpperCase() + link.species.name.slice(1).replace('-', ' ')}
              </span>
              {link.evolution_details && link.evolution_details.length > 0 && (
                <span className={styles.chainCondition} style={{ maxWidth: '140px', fontSize: '0.7rem' }}>
                  {formatEvolutionDetails(link.evolution_details)}
                </span>
              )}
              {hoveredEvolution === evolutionId && link.evolution_details && link.evolution_details.length > 0 && (
                <div className={styles.evolutionTooltip}>
                  {formatEvolutionDetails(link.evolution_details)}
                </div>
              )}
            </button>
            
            {hasBranches ? (
              <>
                <span className={styles.evolutionArrow}>→</span>
                <div className={styles.branchedEvolutions}>
                  {link.evolves_to.map((branch) => {
                    const branchIsCurrent = branch.species?.name === currentPokemonName?.toLowerCase()
                    const branchEvolutionId = `horizontal-branch-${index}-${branch.species?.name}`
                    return (
                      <button
                        key={branch.species?.name}
                        onClick={() => navigate(`/pokemon/${branch.species.name}`, { state: { fromPokemon: true } })}
                        className={`${styles.chainPokemon} ${branchIsCurrent ? styles.chainPokemonCurrent : ''}`}
                        style={{ minWidth: '140px', padding: '0.75rem 1rem', fontSize: '0.9rem' }}
                        title={`View ${branch.species.name}`}
                        onMouseEnter={() => branch.evolution_details && branch.evolution_details.length > 0 && setHoveredEvolution(branchEvolutionId)}
                        onMouseLeave={() => setHoveredEvolution(null)}
                      >
                        <span className={styles.chainPokemonName}>
                          {branch.species.name.charAt(0).toUpperCase() + branch.species.name.slice(1).replace('-', ' ')}
                        </span>
                        {branch.evolution_details && branch.evolution_details.length > 0 && (
                          <span className={styles.chainCondition} style={{ maxWidth: '140px', fontSize: '0.7rem' }}>
                            {formatEvolutionDetails(branch.evolution_details)}
                          </span>
                        )}
                        {hoveredEvolution === branchEvolutionId && branch.evolution_details && branch.evolution_details.length > 0 && (
                          <div className={styles.evolutionTooltip}>
                            {formatEvolutionDetails(branch.evolution_details)}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </>
            ) : index < chainArray.length - 1 && branchingIndex === -1 ? (
              <span className={styles.evolutionArrow}>→</span>
            ) : null}
          </div>
        )
      })}
    </>
  )
}

/**
 * Calculate catch rate percentage for a given ball and HP condition
 * Gen 5 Formula: A = ((3 × MaxHP - 2 × CurrentHP) / (3 × MaxHP)) × BallRate × CatchRate × Status
 * @param {number} catchRate - Base catch rate (0-255)
 * @param {number} ballRate - Ball multiplier (e.g., 1.0 for Pokéball, 2.0 for Ultra Ball)
 * @param {number} hpPercent - Current HP as percentage (0-100)
 * @param {number} statusModifier - Status modifier (1.0 for no status, 1.5 for poison/burn/paralysis, 2.0 for sleep/freeze)
 * @returns {number} Catch percentage (0-100)
 */
function calculateCatchChance(catchRate, ballRate, hpPercent, statusModifier = 1.0) {
  // Convert HP percentage to multiplier
  // At 100% HP: (3M - 2M) / 3M = 1/3
  // At 1% HP: (3M - 2×0.01M) / 3M ≈ 0.993
  const hpMultiplier = (300 - (2 * hpPercent)) / 300
  
  // Calculate capture value (capped at 255)
  let captureValue = Math.floor(hpMultiplier * ballRate * catchRate * statusModifier)
  captureValue = Math.min(255, captureValue)
  
  // Convert to percentage
  return (captureValue / 255) * 100
}

/**
 * Calculate the best catch method considering catch rate, turns needed, and ball cost
 * Ball costs relative to Pokéball: Pokéball=1, Great=1.5, Ultra=2, Dusk=2.5
 * Turns needed: 100%HP=0, 1%HP=1, Sleep100%=1, Sleep1%=2
 */
function calculateBestCatchMethod(catchRate) {
  const ballCosts = {
    'Pokéball': 1,
    'Great Ball': 1.5,
    'Ultra Ball': 2,
    'Quick Ball': 2.25,
    'Dusk Ball': 2.5,
  }
  
  const methods = [
    { ball: 'Pokéball', ballRate: 1.0, hp: 100, turns: 0, statusMod: 1.0 },
    { ball: 'Pokéball', ballRate: 1.0, hp: 1, turns: 1, statusMod: 1.0 },
    { ball: 'Pokéball', ballRate: 1.0, hp: 100, turns: 1, statusMod: 2.0 },
    { ball: 'Pokéball', ballRate: 1.0, hp: 1, turns: 2, statusMod: 2.0 },
    
    { ball: 'Great Ball', ballRate: 1.5, hp: 100, turns: 0, statusMod: 1.0 },
    { ball: 'Great Ball', ballRate: 1.5, hp: 1, turns: 1, statusMod: 1.0 },
    { ball: 'Great Ball', ballRate: 1.5, hp: 100, turns: 1, statusMod: 2.0 },
    { ball: 'Great Ball', ballRate: 1.5, hp: 1, turns: 2, statusMod: 2.0 },
    
    { ball: 'Ultra Ball', ballRate: 2.0, hp: 100, turns: 0, statusMod: 1.0 },
    { ball: 'Ultra Ball', ballRate: 2.0, hp: 1, turns: 1, statusMod: 1.0 },
    { ball: 'Ultra Ball', ballRate: 2.0, hp: 100, turns: 1, statusMod: 2.0 },
    { ball: 'Ultra Ball', ballRate: 2.0, hp: 1, turns: 2, statusMod: 2.0 },
    
    { ball: 'Quick Ball', ballRate: 5.0, hp: 100, turns: 0, statusMod: 1.0 },
    { ball: 'Quick Ball', ballRate: 1.0, hp: 1, turns: 1, statusMod: 1.0 },
    { ball: 'Quick Ball', ballRate: 1.0, hp: 100, turns: 1, statusMod: 2.0 },
    { ball: 'Quick Ball', ballRate: 1.0, hp: 1, turns: 2, statusMod: 2.0 },
    
    { ball: 'Dusk Ball', ballRate: 3.5, hp: 100, turns: 0, statusMod: 1.0 },
    { ball: 'Dusk Ball', ballRate: 3.5, hp: 1, turns: 1, statusMod: 1.0 },
    { ball: 'Dusk Ball', ballRate: 3.5, hp: 100, turns: 1, statusMod: 2.0 },
    { ball: 'Dusk Ball', ballRate: 3.5, hp: 1, turns: 2, statusMod: 2.0 },
  ]
  
  let bestMethod = null
  let secondBestMethod = null
  let bestScore = -Infinity
  let secondBestScore = -Infinity
  
  methods.forEach(method => {
    const catchChance = calculateCatchChance(catchRate, method.ballRate, method.hp, method.statusMod)
    const costFactor = ballCosts[method.ball]
    
    // Score: catch rate / (turns + cost factor)
    // Higher catch rate is better, fewer turns is better, lower cost is better
    const score = catchChance / (method.turns + costFactor)
    
    if (score > bestScore) {
      // Shift best to second best
      secondBestScore = bestScore
      secondBestMethod = bestMethod
      
      // New best
      bestScore = score
      bestMethod = {
        ...method,
        catchChance,
        score,
        hpLabel: method.hp === 100 ? '100% HP' : '1% HP',
        statusLabel: method.statusMod === 2.0 ? 'Sleep' : 'Normal'
      }
    } else if (score > secondBestScore) {
      secondBestScore = score
      secondBestMethod = {
        ...method,
        catchChance,
        score,
        hpLabel: method.hp === 100 ? '100% HP' : '1% HP',
        statusLabel: method.statusMod === 2.0 ? 'Sleep' : 'Normal'
      }
    }
  })
  
  return { bestMethod, secondBestMethod }
}

export default function PokemonDetail() {
  const { pokemonName } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { data: pokemon, isLoading, error } = usePokemonDetails(pokemonName)
  const { data: databaseData } = useDatabase()
  const { getNextPokemon, getPreviousPokemon } = usePokemonOrder()
  const spritesByGeneration = usePokemonSprites(pokemonName)
  const availableForms = usePokemonForms(pokemonName)
  const [selectedGeneration, setSelectedGeneration] = useState('generation-v')
  const [currentSpriteIndex, setCurrentSpriteIndex] = useState(0)
  const [selectedForm, setSelectedForm] = useState(null)
  const [selectedGender, setSelectedGender] = useState('male')
  const [loadedSpriteUrl, setLoadedSpriteUrl] = useState('')
  const [showBack, setShowBack] = useState(false)
  const [wildLevel, setWildLevel] = useState('')
  const [routeSearch, setRouteSearch] = useState('')
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [showRoutesSuggestions, setShowRoutesSuggestions] = useState(false)
  const [particleAnimationKey, setParticleAnimationKey] = useState(0)
  const [audioRef] = useState(new Audio())
  const [hoveredAbility, setHoveredAbility] = useState(null)
  const [hoveredEvolution, setHoveredEvolution] = useState(null)
  const [showCatchRateTooltip, setShowCatchRateTooltip] = useState(false)
  const [catchRateTooltipPos, setCatchRateTooltipPos] = useState('top')
  const [maxWildLevel, setMaxWildLevel] = useState(0)
  const [branchCount, setBranchCount] = useState(0)
  const evolutionContainerRef = useRef(null)
  const catchRateContainerRef = useRef(null)
  const spriteAliasMap = useMemo(() => ({
    wormadam: 'wormadam-plant',
    'gastrodon-west': 'gastrodon',
    'shellos-west': 'shellos'
  }), [])
  const spriteName = spriteAliasMap[pokemonName?.toLowerCase()] || pokemonName

  // Calculate best tooltip position based on viewport space
  useEffect(() => {
    if (!showCatchRateTooltip || !catchRateContainerRef.current) return

    const rect = catchRateContainerRef.current.getBoundingClientRect()
    const spaceAbove = rect.top
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceLeft = rect.left
    const spaceRight = window.innerWidth - rect.right
    const tooltipHeight = 400 // approximate max height

    let position = 'top'
    if (spaceAbove < tooltipHeight && spaceBelow > tooltipHeight) {
      position = 'bottom'
    } else if (spaceAbove < tooltipHeight && spaceBelow < tooltipHeight) {
      // Not enough space above or below, try sides
      if (spaceRight > spaceLeft) {
        position = 'right'
      } else {
        position = 'left'
      }
    }
    setCatchRateTooltipPos(position)
  }, [showCatchRateTooltip])

  // Close tooltip when clicking outside
  useEffect(() => {
    if (!showCatchRateTooltip) return

    const handleClickOutside = (e) => {
      if (catchRateContainerRef.current && !catchRateContainerRef.current.contains(e.target)) {
        setShowCatchRateTooltip(false)
      }
    }

    document.addEventListener('click', handleClickOutside, true)
    return () => document.removeEventListener('click', handleClickOutside, true)
  }, [showCatchRateTooltip])

  // Calculate branch count from evolution chain (only for branching Pokemon)
  useEffect(() => {
    if (!hasBranchingEvolutions(pokemon?.name)) {
      setBranchCount(0)
      return
    }
    
    if (!pokemon?.evolution_chain?.chain) {
      setBranchCount(0)
      return
    }
    
    // Find the branching point
    const findBranchingLink = (link) => {
      if (!link) return null
      if (link.evolves_to && link.evolves_to.length > 1) return link
      if (link.evolves_to && link.evolves_to.length > 0) {
        return findBranchingLink(link.evolves_to[0])
      }
      return null
    }
    
    const branchingLink = findBranchingLink(pokemon.evolution_chain.chain)
    const maxBranches = branchingLink?.evolves_to?.length || 0
    setBranchCount(maxBranches)
  }, [pokemon?.evolution_chain, pokemon?.name])

  // Calculate and resize evolution cards to fit in container without overflow (only for branching Pokemon)
  useEffect(() => {
    if (!hasBranchingEvolutions(pokemon?.name) || !evolutionContainerRef.current || branchCount === 0) return
    
    // Skip height calculation on mobile - let content flow naturally
    if (window.innerWidth <= 480) return
    
    const container = evolutionContainerRef.current
    const evolutionSection = container.parentElement
    
    if (!evolutionSection) return
    
    // Get the actual available height by measuring the section minus the title
    const sectionHeight = evolutionSection.clientHeight
    const cardTitleElement = evolutionSection.querySelector(`.${styles.cardTitle}`)
    const cardTitleHeight = cardTitleElement ? cardTitleElement.clientHeight : 50 // fallback to 50px if not found
    
    // Calculate the gap between title and container
    const sectionPadding = 16 // infoCard padding (1rem)
    const titleBottomGap = 12 // gap between title and container
    
    // Available height = section height - title - section padding - gap
    const availableHeight = sectionHeight - cardTitleHeight - sectionPadding * 2 - titleBottomGap
    
    // Gap between evolution cards
    const gapBetweenCards = 6 // 0.375rem gap in CSS = 6px
    
    // Total gap space (gaps = branchCount - 1)
    const totalGapSpace = gapBetweenCards * Math.max(0, branchCount - 1)
    
    // Container internal padding
    const containerPaddingVertical = 12 // 0.75rem = 12px top and bottom
    
    // Height per card
    const cardHeight = Math.floor((availableHeight - containerPaddingVertical * 2 - totalGapSpace) / branchCount)
    
    // Set CSS variable - use max-height to prevent overflow
    container.style.setProperty('--evolution-card-height', `${Math.max(cardHeight, 35)}px`);
  }, [branchCount, pokemon?.evolution_chain]);
  
  // Reset sprite index and form when pokemon changes
  useEffect(() => {
    setCurrentSpriteIndex(0)
    setSelectedForm(pokemonName)
    setSelectedGeneration('generation-v')
    setSelectedGender('male')
    setShowBack(false)
  }, [pokemonName])
  
  // Reset sprite index when generation changes
  useEffect(() => {
    setCurrentSpriteIndex(0)
    setSelectedGender('male')
    setShowBack(false)
  }, [selectedGeneration])
  
  useEffect(() => {
    setLoadedSpriteUrl('')
  }, [pokemonName, currentSpriteIndex])

  // Trigger shiny particle animation twice on page load
  useEffect(() => {
    // Reset to 0 to ensure particle unmounts completely
    setParticleAnimationKey(0)
    
    // Small delay to ensure React processes the unmount
    const resetTimer = setTimeout(() => {
      // First animation plays immediately
      setParticleAnimationKey(1)
      
      // Second animation after first completes (1000ms + 100ms buffer)
      const secondTimer = setTimeout(() => {
        setParticleAnimationKey(2)
      }, 1150)
      
      return () => clearTimeout(secondTimer)
    }, 10)
    
    return () => {
      clearTimeout(resetTimer)
    }
  }, [pokemonName])

  // Calculate max wild level from locations
  useEffect(() => {
    if (!pokemon?.locations || pokemon.locations.length === 0) {
      setMaxWildLevel(0)
      return
    }
    
    const maxLevel = Math.max(...pokemon.locations.map(loc => loc.max_level || 0))
    setMaxWildLevel(maxLevel)
  }, [pokemon?.locations])

  // Get owners of this pokemon from the database
  const owners = useMemo(() => {
    if (!databaseData || !pokemonName) return {}
    
    const ownerMap = {}
    const pokemonLower = pokemonName.toLowerCase()
    
    Object.entries(databaseData).forEach(([playerName, playerData]) => {
      Object.values(playerData.shinies || {}).forEach(shinyEntry => {
        if (shinyEntry.Pokemon.toLowerCase() === pokemonLower) {
          // Don't count sold pokemon
          if (shinyEntry.Sold?.toLowerCase() !== 'yes') {
            if (!ownerMap[playerName]) {
              ownerMap[playerName] = 0
            }
            ownerMap[playerName]++
          }
        }
      })
    })
    
    return ownerMap
  }, [databaseData, pokemonName])

  // Get animated shiny sprite for OG image (from JSON data)
  const animatedShinyGif = useMemo(() => {
    const allGenerations = Object.keys(spritesByGeneration).sort()
    if (allGenerations.length > 0) {
      const firstGen = spritesByGeneration[allGenerations[0]]
      if (firstGen && firstGen.length > 0 && firstGen[0]?.url) {
        return firstGen[0].url
      }
    }
    return 'https://synergymmo.com/favicon.png'
  }, [spritesByGeneration])

// Capitalize first letter helper
const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : "";

// Format types → "Dark / Ghost"
const formatTypes = (types) =>
  types?.map(capitalize).join(" / ") || "Unknown";

// Format egg groups → "Field & Fairy"
const formatEggGroups = (eggs) =>
  eggs?.length ? eggs.map(capitalize).join(" & ") : "Unknown";

// Build EXACT description format requested
const buildDescription = (pokemon) => {
  if (!pokemon) return "Explore Pokémon in the Shiny Dex.";

  const name = capitalize(pokemon.displayName);
  const types = formatTypes(pokemon.types);
  const eggGroups = formatEggGroups(pokemon.eggGroups);

  return `${name} - Type: ${types}, Egg Group: ${eggGroups}`;
};

useDocumentHead({
  title: pokemon
    ? `${capitalize(pokemon.displayName)} - Shiny Dex | Team Synergy - PokeMMO`
    : "Shiny Dex | Team Synergy - PokeMMO",

  description: buildDescription(pokemon),

  canonicalPath: `/pokemon/${pokemonName?.toLowerCase()}`,

  url: `https://synergymmo.com/pokemon/${pokemonName?.toLowerCase()}`,

  ogImage: animatedShinyGif,

  twitterCard: "summary_large_image",

  twitterTitle: pokemon
    ? `${capitalize(pokemon.displayName)} - Shiny Dex | Team Synergy - PokeMMO`
    : "Shiny Dex | Team Synergy - PokeMMO",

  twitterDescription: buildDescription(pokemon),

  twitterImage: animatedShinyGif,
});




  if (isLoading) {
    return (
      <div className={styles.container}>
        <BackButton to={location.state?.fromPokemon ? '/pokedex' : undefined} />
        <div className={styles.loadingMessage}>Loading Pokémon data...</div>
      </div>
    )
  }

  if (error) {
    const errorMessage = error?.message || 'Unable to load Pokémon data'
    
    return (
      <div className={styles.container}>
        <BackButton to={location.state?.fromPokemon ? '/pokedex' : undefined} />
        <div className={styles.errorMessage}>
          <h2>⚠️ Unable to Load Pokémon</h2>
          <p className={styles.errorDescription}>
            {errorMessage}
          </p>
          <div className={styles.suggestions}>
            <p><strong>Troubleshooting tips:</strong></p>
            <ul>
              <li>Check that the Pokémon name is spelled correctly</li>
              <li>Use lowercase names with hyphens (e.g., "mr-mime", "type-null")</li>
              <li>Try searching on our <button onClick={() => navigate('/pokedex')} className={styles.linkButton} style={{ background: 'none', border: 'none', color: '#667eea', cursor: 'pointer', textDecoration: 'underline' }}>Pokédex page</button></li>
              <li>If the issue persists, try again in a few moments (API might be busy)</li>
            </ul>
          </div>
          <button onClick={() => navigate('/pokedex')} className={styles.linkButton}>
            Back to Pokédex
          </button>
        </div>
      </div>
    )
  }

  if (!pokemon) return null

  const primaryType = pokemon.types[0]
  const typeColor = TYPE_COLORS[primaryType] || '#777'
  
  // Get available generations and determine active generation
  const availableGenerations = Object.keys(spritesByGeneration).sort()
  // Use selectedGeneration if available, otherwise prefer generation-v, fallback to first available
  let activeGeneration = selectedGeneration
  if (!availableGenerations.includes(activeGeneration)) {
    activeGeneration = availableGenerations.includes('generation-v') 
      ? 'generation-v'
      : availableGenerations[0]
  }
  
  const currentGenerationSprites = spritesByGeneration[activeGeneration] || []
  
  // Filter sprites by gender
  const filteredSprites = currentGenerationSprites.filter(sprite => {
    if (selectedGender === 'female') {
      return sprite.label.includes('(Female)')
    }
    return !sprite.label.includes('(Female)')
  })
  
  // Check if female variants are available in current generation
  const hasFemaleVariants = currentGenerationSprites.some(sprite => sprite.label.includes('(Female)'))
  
  // Reset sprite index if it's out of bounds after filtering
  const validSpriteIndex = Math.min(currentSpriteIndex, filteredSprites.length - 1) 
  
  // Get next/previous pokemon for navigation
  const nextPokemon = getNextPokemon(pokemonName)
  const prevPokemon = getPreviousPokemon(pokemonName)
  const currentSprite = (filteredSprites.length > 0 && filteredSprites[validSpriteIndex])
    ? filteredSprites[validSpriteIndex]
    : { url: pokemon.sprite, label: pokemon.displayName, type: 'png', backUrl: pokemon.sprite }
  const currentSpriteUrl = showBack ? (currentSprite?.backUrl || currentSprite?.url) : currentSprite?.url
  const isSpriteLoaded = loadedSpriteUrl === currentSpriteUrl
  
  const handlePrevious = () => {
    if (prevPokemon) {
      navigate(`/pokemon/${prevPokemon}`, { state: { fromPokemon: true } })
    }
  }
  
  const handleNext = () => {
    if (nextPokemon) {
      navigate(`/pokemon/${nextPokemon}`, { state: { fromPokemon: true } })
    }
  }

  const playCry = () => {
    if (pokemon.cries && (pokemon.cries.latest || pokemon.cries.legacy)) {
      const cryUrl = pokemon.cries.latest || pokemon.cries.legacy
      audioRef.src = cryUrl
      audioRef.volume = 0.25
      audioRef.play().catch(err => console.error('Error playing cry:', err))
    }
  }

  const wildLevelValue = Number.parseInt(wildLevel, 10)
  const hasWildLevel = Number.isFinite(wildLevelValue) && wildLevelValue > 0

  return (
    <article className={styles.container}>
      <BackButton to={location.state?.fromPokemon ? '/pokedex' : undefined} />

      <header className={styles.header}>
        <button
          className={styles.navArrow}
          onClick={handlePrevious}
          disabled={!prevPokemon}
          title="Previous Pokémon"
          aria-label="Previous Pokémon"
        >
          ❮
        </button>
        <div className={styles.titleContainer}>
          <h1 className={styles.title}>{pokemon.displayName}</h1>
          <span className={styles.pokemonId}>#{String(pokemon.id).padStart(3, '0')}</span>
          {(pokemon.isLegendary || pokemon.isMythical) && !pokemon.obtainable && (
            <div className={styles.unobtainableLabel}>UNOBTAINABLE</div>
          )}
        </div>
        <button
          className={styles.navArrow}
          onClick={handleNext}
          disabled={!nextPokemon}
          title="Next Pokémon"
          aria-label="Next Pokémon"
        >
          ❯
        </button>
      </header>

      {/* Main Content Grid */}
      <div className={styles.contentGrid}>
        {/* Image Section */}
        <section className={styles.imageSection}>
          <div className={styles.imageContainer}>
            <div className={styles.imageWrapper}>
              {filteredSprites.length > 0 ? (
                <picture>
                  {currentSprite.type === 'gif' ? (
                    <source srcSet={currentSpriteUrl} type="image/gif" />
                  ) : (
                    <source srcSet={currentSpriteUrl} type="image/png" />
                  )}
                  <img
                    key={currentSpriteUrl}
                    src={currentSpriteUrl}
                    alt={`${pokemon.displayName} - ${currentSprite.label}`}
                    className={`${styles.pokemonImage} ${isSpriteLoaded ? styles.pokemonImageLoaded : styles.pokemonImageLoading}`}
                    onLoad={() => setLoadedSpriteUrl(currentSpriteUrl)}
                    loading="lazy"
                  />
                </picture>
              ) : (
                <picture>
                  <source srcSet={pokemon.sprite} type="image/png" />
                  <img
                    key={currentSpriteUrl}
                    src={pokemon.sprite}
                    alt={pokemon.displayName}
                    className={`${styles.pokemonImage} ${isSpriteLoaded ? styles.pokemonImageLoaded : styles.pokemonImageLoading}`}
                    onLoad={() => setLoadedSpriteUrl(currentSpriteUrl)}
                    loading="lazy"
                  />
                </picture>
              )}
              {pokemon.cries && (pokemon.cries.latest || pokemon.cries.legacy) && (
                <button
                  onClick={playCry}
                  className={styles.volumeButton}
                  title="Play Pokémon cry"
                  aria-label={`Play ${pokemon.displayName} cry`}
                >
                  🔊
                </button>
              )}
              {currentSprite?.backUrl && currentSprite.backUrl !== currentSprite?.url && (
                <button
                  onClick={() => setShowBack(!showBack)}
                  className={styles.reverseButton}
                  title={showBack ? "Show front sprite" : "Show back sprite"}
                  aria-label={showBack ? "Show front sprite" : "Show back sprite"}
                >
                  🔄
                </button>
              )}
              {particleAnimationKey > 0 && (
                <img
                  key={`particle-${particleAnimationKey}`}
                  src={`/images/shiny_particle.gif?t=${particleAnimationKey}`}
                  alt="Shiny particle effect"
                  className={styles.shinyParticle}
                  aria-hidden="true"
                />
              )}
            </div>
            {availableForms.length > 1 && (
              <div className={styles.formSelector}>
                <label className={styles.formSelectorLabel}>Available Forms:</label>
                <div className={styles.formOptions}>
                  {availableForms.map((form) => (
                    <button
                      key={form.name}
                      className={`${styles.formButton} ${selectedForm === form.name ? styles.formButtonActive : ''}`}
                      onClick={() => {
                        setSelectedForm(form.name)
                        setCurrentSpriteIndex(0)
                        navigate(`/pokemon/${form.name}`, { state: { fromPokemon: true } })
                      }}
                      title={form.label}
                    >
                      {form.displayLabel}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {(availableGenerations.length > 1 || filteredSprites.length > 1) && (
              <div className={styles.spriteNavigationContainer}>
                {availableGenerations.length > 1 && (
                  <div className={styles.generationSelector}>
                    <label className={styles.generationLabel}>Generation:</label>
                    <select 
                      value={activeGeneration} 
                      onChange={(e) => setSelectedGeneration(e.target.value)}
                      className={styles.generationSelect}
                    >
                      {availableGenerations.map((gen) => (
                        <option key={gen} value={gen}>
                          {gen.replace('generation-', 'Gen ').toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {hasFemaleVariants && availableGenerations.includes('generation-v') && (
                  <div className={styles.genderSelector}>
                    <label className={styles.genderLabel}>Gender:</label>
                    <div className={styles.genderButtons}>
                      <button
                        className={`${styles.genderButton} ${selectedGender === 'male' ? styles.genderButtonActive : ''}`}
                        onClick={() => setSelectedGender('male')}
                        title="Male variants"
                      >
                        ♂ Male
                      </button>
                      <button
                        className={`${styles.genderButton} ${selectedGender === 'female' ? styles.genderButtonActive : ''}`}
                        onClick={() => setSelectedGender('female')}
                        title="Female variants"
                      >
                        ♀ Female
                      </button>
                    </div>
                  </div>
                )}
                
                {filteredSprites.length > 1 && (
                  <div className={styles.spriteNavigation}>
                    <button
                      className={styles.spriteButton}
                      onClick={() => setCurrentSpriteIndex((prev) => (prev === 0 ? filteredSprites.length - 1 : prev - 1))}
                      title="Previous sprite"
                      aria-label="Previous sprite"
                    >
                      ❮
                    </button>
                    <span className={styles.spriteLabel}>
                      {filteredSprites[validSpriteIndex]?.label} ({validSpriteIndex + 1}/{filteredSprites.length})
                    </span>
                    <button
                      className={styles.spriteButton}
                      onClick={() => setCurrentSpriteIndex((prev) => (prev === filteredSprites.length - 1 ? 0 : prev + 1))}
                      title="Next sprite"
                      aria-label="Next sprite"
                    >
                      ❯
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Basic Info */}
          <div className={styles.basicInfo}>
            <div className={styles.infoRow}>
              <span className={styles.label}>Height</span>
              <span className={styles.value}>{pokemon.height.toFixed(2)}m</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Weight</span>
              <span className={styles.value}>{pokemon.weight.toFixed(2)}kg</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Generation</span>
              <span className={styles.value}>
                {pokemon.generation.replace('-', ' ').toUpperCase()}
              </span>
            </div>
            {/* Gender Ratio */}
            {pokemon.genderRate !== undefined && (
              <div className={styles.basicInfoGenderSection}>
                <span className={styles.basicInfoGenderLabel}>Gender Ratio</span>
                {pokemon.genderRate === -1 ? (
                  <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.95rem' }}>Genderless</div>
                ) : (
                  <div className={styles.basicInfoGender}>
                    <div className={styles.basicInfoGenderRow}>
                      <span className={styles.basicInfoGenderLabel2}>♂ Male</span>
                      <div className={styles.basicInfoGenderBar}>
                        <div 
                          className={styles.basicInfoGenderFill} 
                          style={{
                            width: `${(8 - pokemon.genderRate) / 8 * 100}%`,
                            backgroundColor: '#667eea'
                          }}
                        />
                      </div>
                      <span className={styles.basicInfoGenderPercent}>{((8 - pokemon.genderRate) / 8 * 100).toFixed(1)}%</span>
                    </div>
                    <div className={styles.basicInfoGenderRow}>
                      <span className={styles.basicInfoGenderLabel2}>♀ Female</span>
                      <div className={styles.basicInfoGenderBar}>
                        <div 
                          className={styles.basicInfoGenderFill} 
                          style={{
                            width: `${pokemon.genderRate / 8 * 100}%`,
                            backgroundColor: '#f085b3'
                          }}
                        />
                      </div>
                      <span className={styles.basicInfoGenderPercent}>{(pokemon.genderRate / 8 * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Evolution Line */}
          {pokemon.evolution_chain?.chain && (
            <div className={`${styles.infoCard} ${styles.evolutionSection}`}>
              <h2 className={styles.cardTitle}>Evolution Line</h2>
              <div 
                className={`${styles.evolutionLineContainerHorizontal} ${hasBranchingEvolutions(pokemon?.name) ? styles.evolutionLineContainerBranching : styles.evolutionLineContainerLinear} ${!hasBranchingEvolutions(pokemon?.name) && countLinearEvolutions(pokemon.evolution_chain.chain) <= 2 ? styles.evolutionSmall : ''}`} 
                ref={hasBranchingEvolutions(pokemon?.name) ? evolutionContainerRef : null}
              >
                {hasBranchingEvolutions(pokemon?.name) 
                  ? renderEvolutionChainHorizontal(pokemon.evolution_chain.chain, navigate, pokemon.name, hoveredEvolution, setHoveredEvolution)
                  : renderEvolutionChainLinear(pokemon.evolution_chain.chain, navigate, pokemon.name, hoveredEvolution, setHoveredEvolution)
                }
              </div>
            </div>
          )}
        </section>

        {/* Details Section */}
        <section className={styles.detailsSection}>
          {/* Types */}
          <div className={styles.infoCard}>
            <h2 className={styles.cardTitle}>Type</h2>
            <div className={styles.typeContainer}>
              {pokemon.types.map(type => (
                <span
                  key={type}
                  className={styles.type}
                  style={{ backgroundColor: TYPE_COLORS[type] }}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </span>
              ))}
            </div>
          </div>

          {/* Abilities */}
          <div className={styles.infoCard}>
            <h2 className={styles.cardTitle}>Abilities</h2>
            <div className={styles.abilityContainer}>
              {pokemon.abilities.normal.length > 0 && (
                <div>
                  <h3 className={styles.abilitySubtitle}>Normal Abilities</h3>
                  <ul className={styles.abilityList}>
                    {pokemon.abilities.normal.map(ability => {
                      const abilityInfo = getAbilityInfo(ability)
                      const displayName = ability.replace('-', ' ')
                      return (
                        <li
                          key={ability}
                          className={styles.abilityItem}
                          onMouseEnter={() => setHoveredAbility(ability)}
                          onMouseLeave={() => setHoveredAbility(null)}
                        >
                          {displayName}
                          {hoveredAbility === ability && abilityInfo && (
                            <div className={styles.abilityTooltip}>
                              {abilityInfo.effect}
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
              {pokemon.abilities.hidden.length > 0 && (
                <div>
                  <h3 className={styles.abilitySubtitle}>Hidden Ability</h3>
                  <ul className={styles.abilityList}>
                    {pokemon.abilities.hidden.map(ability => {
                      const abilityInfo = getAbilityInfo(ability)
                      const displayName = ability.replace('-', ' ')
                      return (
                        <li
                          key={ability}
                          className={`${styles.hiddenAbility} ${styles.abilityItem}`}
                          onMouseEnter={() => setHoveredAbility(ability)}
                          onMouseLeave={() => setHoveredAbility(null)}
                        >
                          {displayName} ✨
                          {hoveredAbility === ability && abilityInfo && (
                            <div className={styles.abilityTooltip}>
                              {abilityInfo.effect}
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className={styles.infoCard}>
            <h2 className={styles.cardTitle}>Base Stats</h2>
            <div className={styles.statsContainer}>
              {[
                { label: 'HP', value: pokemon.stats.hp },
                { label: 'ATK', value: pokemon.stats.attack },
                { label: 'DEF', value: pokemon.stats.defense },
                { label: 'SP.ATK', value: pokemon.stats.spAtk },
                { label: 'SP.DEF', value: pokemon.stats.spDef },
                { label: 'SPD', value: pokemon.stats.speed },
              ].map(stat => {
                const statColor = getStatColor(stat.value)

                return (
                  <div key={stat.label} className={styles.statRow}>
                    <span className={styles.statLabel} style={{ color: statColor }}>{stat.label}</span>
                    <div className={styles.statBarContainer}>
                      <div
                        className={styles.statBar}
                        style={{
                          width: `${(stat.value / 200) * 100}%`,
                          backgroundColor: statColor,
                          color: statColor,
                        }}
                      />
                    </div>
                    <span className={styles.statValue} style={{ color: statColor }}>{stat.value}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Type Effectiveness */}
          <div className={styles.infoCard}>
            <h2 className={styles.cardTitle}>Type Chart</h2>
            {(() => {
              const combined = calculateCombinedTypeEffectiveness(pokemon.types)
              
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {combined.fourxWeak.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '600' }}>4x Weak To:</span>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {combined.fourxWeak.map(type => (
                          <span key={type} style={{ padding: '0.4rem 0.8rem', background: 'rgba(239, 68, 68, 0.3)', border: '2px solid rgba(239, 68, 68, 0.7)', borderRadius: '6px', fontSize: '0.9rem', fontWeight: '600', color: '#fca5a5', textTransform: 'capitalize' }}>
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {combined.twoXWeak.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '600' }}>Weak To:</span>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {combined.twoXWeak.map(type => (
                          <span key={type} style={{ padding: '0.4rem 0.8rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)', borderRadius: '6px', fontSize: '0.9rem', color: '#fca5a5', textTransform: 'capitalize' }}>
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {combined.halfDmg.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '600' }}>Resists: (1/2 Damage)</span>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {combined.halfDmg.map(type => (
                          <span key={type} style={{ padding: '0.4rem 0.8rem', background: 'rgba(74, 222, 128, 0.2)', border: '1px solid rgba(74, 222, 128, 0.5)', borderRadius: '6px', fontSize: '0.9rem', color: '#86efac', textTransform: 'capitalize' }}>
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {combined.quarterDmg.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '600' }}>Resists (1/4 Damage):</span>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {combined.quarterDmg.map(type => (
                          <span key={type} style={{ padding: '0.4rem 0.8rem', background: 'rgba(74, 222, 128, 0.3)', border: '2px solid rgba(74, 222, 128, 0.7)', borderRadius: '6px', fontSize: '0.9rem', fontWeight: '600', color: '#86efac', textTransform: 'capitalize' }}>
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {combined.immune.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '600' }}>Immune To:</span>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {combined.immune.map(type => (
                          <span key={type} style={{ padding: '0.4rem 0.8rem', background: 'rgba(168, 85, 247, 0.2)', border: '1px solid rgba(168, 85, 247, 0.5)', borderRadius: '6px', fontSize: '0.9rem', color: '#d8b4fe', textTransform: 'capitalize' }}>
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>

          {/* Breeding & Catch Info */}
          <div className={styles.infoCard}>
            <h2 className={styles.cardTitle}>Breeding & Catch Information</h2>
            <div className={styles.additionalInfo}>
              <div className={styles.infoGroup}>
                <span className={styles.label}>Egg Groups</span>
                {pokemon.eggGroups.length > 0 ? (
                  <div className={styles.eggGroupList}>
                    {pokemon.eggGroups.map((group) => {
                      const groupColor = getEggGroupColor(group)
                      return (
                        <span
                          key={group}
                          className={styles.eggGroupTag}
                          style={{ '--egg-color': groupColor }}
                        >
                          {group.replace('-', ' ')}
                        </span>
                      )
                    })}
                  </div>
                ) : (
                  <span className={styles.eggGroupNone}>None</span>
                )}
              </div>
              <div 
                className={styles.infoGroup}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setShowCatchRateTooltip(true)}
                onMouseLeave={() => setShowCatchRateTooltip(false)}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowCatchRateTooltip(prev => !prev)
                }}
                onTouchEnd={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowCatchRateTooltip(prev => !prev)
                }}
              >
                <span className={styles.label}>Catch Rate</span>
                <div 
                  ref={catchRateContainerRef}
                  style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}
                  onClick={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                >
                  <span className={styles.value}>{pokemon.catchRate}/255</span>
                  <div className={styles.catchBar}>
                    <div 
                      className={styles.catchBarFill}
                      style={{ 
                        width: `${(pokemon.catchRate / 255) * 100}%`,
                        background: pokemon.catchRate > 200 ? '#4ade80' : pokemon.catchRate > 100 ? '#60a5fa' : pokemon.catchRate > 50 ? '#fb923c' : '#ef4444',
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                  <span className={styles.catchDifficulty} style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                    {pokemon.catchRate > 200 ? 'Very Easy' : pokemon.catchRate > 100 ? 'Easy' : pokemon.catchRate > 50 ? 'Moderate' : 'Hard to catch'}
                  </span>
                  {showCatchRateTooltip && (
                    <div className={`${styles.catchRateTooltip} ${styles[`tooltip${catchRateTooltipPos.charAt(0).toUpperCase() + catchRateTooltipPos.slice(1)}`]}`}>
                      <div className={styles.tooltipTitle}>Catch Rate by Ball & HP</div>
                      {maxWildLevel > 0 && (
                        <div className={styles.tooltipLevelInfo}>
                          Max Wild Level: <strong>{maxWildLevel}</strong>
                        </div>
                      )}
                      <div className={styles.tooltipContent}>
                        <div className={styles.tooltipTable}>
                          <div className={styles.tooltipRow}>
                            <div className={styles.tooltipHeader}>Ball</div>
                            <div className={styles.tooltipHeader}>100% HP</div>
                            <div className={styles.tooltipHeader}>1% HP</div>
                            <div className={styles.tooltipHeader}>Sleep 100% HP</div>
                            <div className={styles.tooltipHeader}>Sleep 1% HP</div>
                          </div>
                          {(() => {
                            const pokeBall100 = calculateCatchChance(pokemon.catchRate, 1.0, 100).toFixed(1)
                            const pokeBall1 = calculateCatchChance(pokemon.catchRate, 1.0, 1).toFixed(1)
                            const pokeBallSleep100 = calculateCatchChance(pokemon.catchRate, 1.0, 100, 2.0).toFixed(1)
                            const pokeBallSleep1 = calculateCatchChance(pokemon.catchRate, 1.0, 1, 2.0).toFixed(1)
                            return (
                              <div className={styles.tooltipRow}>
                                <div>Pokéball</div>
                                <div className={pokeBall100 === "100.0" ? styles.highlightedCell : ""}>{pokeBall100}%</div>
                                <div className={pokeBall1 === "100.0" ? styles.highlightedCell : ""}>{pokeBall1}%</div>
                                <div className={pokeBallSleep100 === "100.0" ? styles.highlightedCell : ""}>{pokeBallSleep100}%</div>
                                <div className={pokeBallSleep1 === "100.0" ? styles.highlightedCell : ""}>{pokeBallSleep1}%</div>
                              </div>
                            )
                          })()}
                          {(() => {
                            const greatBall100 = calculateCatchChance(pokemon.catchRate, 1.5, 100).toFixed(1)
                            const greatBall1 = calculateCatchChance(pokemon.catchRate, 1.5, 1).toFixed(1)
                            const greatBallSleep100 = calculateCatchChance(pokemon.catchRate, 1.5, 100, 2.0).toFixed(1)
                            const greatBallSleep1 = calculateCatchChance(pokemon.catchRate, 1.5, 1, 2.0).toFixed(1)
                            return (
                              <div className={styles.tooltipRow}>
                                <div>Great Ball</div>
                                <div className={greatBall100 === "100.0" ? styles.highlightedCell : ""}>{greatBall100}%</div>
                                <div className={greatBall1 === "100.0" ? styles.highlightedCell : ""}>{greatBall1}%</div>
                                <div className={greatBallSleep100 === "100.0" ? styles.highlightedCell : ""}>{greatBallSleep100}%</div>
                                <div className={greatBallSleep1 === "100.0" ? styles.highlightedCell : ""}>{greatBallSleep1}%</div>
                              </div>
                            )
                          })()}
                          {(() => {
                            const ultraBall100 = calculateCatchChance(pokemon.catchRate, 2.0, 100).toFixed(1)
                            const ultraBall1 = calculateCatchChance(pokemon.catchRate, 2.0, 1).toFixed(1)
                            const ultraBallSleep100 = calculateCatchChance(pokemon.catchRate, 2.0, 100, 2.0).toFixed(1)
                            const ultraBallSleep1 = calculateCatchChance(pokemon.catchRate, 2.0, 1, 2.0).toFixed(1)
                            return (
                              <div className={styles.tooltipRow}>
                                <div>Ultra Ball</div>
                                <div className={ultraBall100 === "100.0" ? styles.highlightedCell : ""}>{ultraBall100}%</div>
                                <div className={ultraBall1 === "100.0" ? styles.highlightedCell : ""}>{ultraBall1}%</div>
                                <div className={ultraBallSleep100 === "100.0" ? styles.highlightedCell : ""}>{ultraBallSleep100}%</div>
                                <div className={ultraBallSleep1 === "100.0" ? styles.highlightedCell : ""}>{ultraBallSleep1}%</div>
                              </div>
                            )
                          })()}
                          {(() => {
                            const quickBall100 = calculateCatchChance(pokemon.catchRate, 5.0, 100).toFixed(1)
                            const quickBall1 = calculateCatchChance(pokemon.catchRate, 1.0, 1).toFixed(1)
                            const quickBallSleep100 = calculateCatchChance(pokemon.catchRate, 1.0, 100, 2.0).toFixed(1)
                            const quickBallSleep1 = calculateCatchChance(pokemon.catchRate, 1.0, 1, 2.0).toFixed(1)
                            return (
                              <div className={styles.tooltipRow}>
                                <div>Quick Ball<span className={styles.tooltipNote}>(Turn 1)</span></div>
                                <div className={quickBall100 === "100.0" ? styles.highlightedCell : ""}>{quickBall100}%</div>
                                <div className={quickBall1 === "100.0" ? styles.highlightedCell : ""}>{quickBall1}%</div>
                                <div className={quickBallSleep100 === "100.0" ? styles.highlightedCell : ""}>{quickBallSleep100}%</div>
                                <div className={quickBallSleep1 === "100.0" ? styles.highlightedCell : ""}>{quickBallSleep1}%</div>
                              </div>
                            )
                          })()}
                          {(() => {
                            const duskBall100 = calculateCatchChance(pokemon.catchRate, 3.5, 100).toFixed(1)
                            const duskBall1 = calculateCatchChance(pokemon.catchRate, 3.5, 1).toFixed(1)
                            const duskBallSleep100 = calculateCatchChance(pokemon.catchRate, 3.5, 100, 2.0).toFixed(1)
                            const duskBallSleep1 = calculateCatchChance(pokemon.catchRate, 3.5, 1, 2.0).toFixed(1)
                            return (
                              <div className={styles.tooltipRow}>
                                <div>Dusk Ball<span className={styles.tooltipNote}>(Night)</span></div>
                                <div className={duskBall100 === "100.0" ? styles.highlightedCell : ""}>{duskBall100}%</div>
                                <div className={duskBall1 === "100.0" ? styles.highlightedCell : ""}>{duskBall1}%</div>
                                <div className={duskBallSleep100 === "100.0" ? styles.highlightedCell : ""}>{duskBallSleep100}%</div>
                                <div className={duskBallSleep1 === "100.0" ? styles.highlightedCell : ""}>{duskBallSleep1}%</div>
                              </div>
                            )
                          })()}
                          {(() => {
                            const timerBall100 = calculateCatchChance(pokemon.catchRate, 4.0, 100).toFixed(1)
                            const timerBall1 = calculateCatchChance(pokemon.catchRate, 4.0, 1).toFixed(1)
                            const timerBallSleep100 = calculateCatchChance(pokemon.catchRate, 4.0, 100, 2.0).toFixed(1)
                            const timerBallSleep1 = calculateCatchChance(pokemon.catchRate, 4.0, 1, 2.0).toFixed(1)
                            return (
                              <div className={styles.tooltipRow}>
                                <div>Timer Ball<span className={styles.tooltipNote}>(Turn 11+)</span></div>
                                <div className={timerBall100 === "100.0" ? styles.highlightedCell : ""}>{timerBall100}%</div>
                                <div className={timerBall1 === "100.0" ? styles.highlightedCell : ""}>{timerBall1}%</div>
                                <div className={timerBallSleep100 === "100.0" ? styles.highlightedCell : ""}>{timerBallSleep100}%</div>
                                <div className={timerBallSleep1 === "100.0" ? styles.highlightedCell : ""}>{timerBallSleep1}%</div>
                              </div>
                            )
                          })()}
                          {(() => {
                            const safariPercent = calculateCatchChance(pokemon.catchRate, 1.5, 100).toFixed(1)
                            const isSafari100 = safariPercent === "100.0"
                            return (
                              <div className={`${styles.tooltipRow} ${isSafari100 ? styles.safariRow : ""}`}>
                                <div>Safari Ball<span className={styles.tooltipNote}>(100% HP Only)</span></div>
                                <div className={isSafari100 ? styles.highlightedCell : ""}>{safariPercent}%</div>
                                <div className={styles.safariPercent}>—</div>
                                <div className={styles.safariPercent}>—</div>
                                <div className={styles.safariPercent}>—</div>
                              </div>
                            )
                          })()}
                          {(() => {
                            const { bestMethod, secondBestMethod } = calculateBestCatchMethod(pokemon.catchRate)
                            return (
                              <>
                                <div className={`${styles.tooltipRow} ${styles.bestMethodRow}`}>
                                  <div><strong>✓ Best</strong></div>
                                  <div><strong>{bestMethod.ball}</strong></div>
                                  <div>
                                    {bestMethod.hp === 100 ? '100% HP' : '1% HP'}
                                    {bestMethod.statusMod === 2.0 ? ' + Sleep' : ''}
                                  </div>
                                  <div><strong>{bestMethod.catchChance.toFixed(1)}%</strong></div>
                                  <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                                    {bestMethod.turns} turn{bestMethod.turns !== 1 ? 's' : ''}
                                  </div>
                                </div>
                                <div className={styles.tooltipRow} style={{ backgroundColor: 'rgba(70, 130, 180, 0.15)', borderLeft: '2px solid rgba(135, 206, 235, 0.5)' }}>
                                  <div>2nd Best</div>
                                  <div><strong>{secondBestMethod.ball}</strong></div>
                                  <div>
                                    {secondBestMethod.hp === 100 ? '100% HP' : '1% HP'}
                                    {secondBestMethod.statusMod === 2.0 ? ' + Sleep' : ''}
                                  </div>
                                  <div><strong>{secondBestMethod.catchChance.toFixed(1)}%</strong></div>
                                  <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                                    {secondBestMethod.turns} turn{secondBestMethod.turns !== 1 ? 's' : ''}
                                  </div>
                                </div>
                              </>
                            )
                          })()}
                        </div>
                        <div className={styles.tooltipNote2}>
                          Formula: A = [(3×MaxHP - 2×CurrentHP) / (3×MaxHP)] × Ball × CatchRate × Status
                        </div>
                        <div className={styles.tooltipNote2} style={{ marginTop: '0.5rem', borderTop: '1px solid rgba(102, 126, 234, 0.2)', paddingTop: '0.5rem' }}>
                          <strong>Best Method:</strong> Selected by balancing catch chance, turns needed (0-2), and ball cost. Prefers cheaper balls when effectiveness is similar.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.infoGroup}>
                <span className={styles.label}>Exp Group</span>
                <span className={styles.value}>{pokemon.growthRate ? pokemon.growthRate.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'Unknown'}</span>
              </div>
              <div className={styles.infoGroup}>
                <span className={styles.label}>Shiny Tier</span>
                <span className={styles.value} style={{ color: TIER_COLORS[pokemon.shinyTier] ?? '#94a3b8' }}>Tier {pokemon.shinyTier}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Owners */}
      {Object.keys(owners).length > 0 && (
        <section className={styles.ownersSection}>
          <h2 className={styles.cardTitle}>Owned By</h2>
          <div className={styles.ownersList}>
            {Object.entries(owners)
              .sort(([, a], [, b]) => b - a) // Sort by count descending
              .map(([playerName, count]) => (
                <button
                  key={playerName}
                  className={styles.ownerCard}
                  onClick={() => navigate(`/player/${playerName.toLowerCase()}`, { state: { from: 'pokemon' } })}
                >
                  <p className={styles.ownerName}>{playerName}</p>
                  <p className={styles.ownerCount}>
                    {count} Caught
                  </p>
                </button>
              ))}
          </div>
        </section>
      )}

      {/* Locations */}
      {pokemon?.locations && pokemon.locations.length > 0 && (() => {
        // Define rarity order
        const rarityOrder = {
          'Horde': 0,
          'Very Common': 1,
          'Common': 2,
          'Uncommon': 3,
          'Fishing': 4,
          'Rare': 5,
          'Very Rare': 6,
          'Lure': 7
        }
        
        // Get encounter icon based on rarity and location type (habitat)
        const getEncounterIcon = (rarity, habitat) => {
          if (rarity === 'Lure') {
            return '/images/lure.png'
          }
          if (rarity === 'Horde') {
            return '/images/horde.png'
          }
          // Check habitat for fishing rods or fishing generic
          if (habitat) {
            if (habitat.includes('Super Rod')) {
              return '/images/super_rod.png'
            }
            if (habitat.includes('Good Rod')) {
              return '/images/good_rod.png'
            }
            if (habitat.includes('Old Rod')) {
              return '/images/old_rod.png'
            }
            if (habitat.includes('Fishing')) {
              return '/images/super_rod.png'
            }
          }
          return null
        }
        
        // Sort locations by rarity
        const sortedLocations = [...pokemon.locations].sort((a, b) => {
          const rarityA = rarityOrder[a.rarity] ?? 999
          const rarityB = rarityOrder[b.rarity] ?? 999
          return rarityA - rarityB
        })
        
        return (
          <section className={styles.infoCard}>
            <h2 className={styles.cardTitle}>Locations</h2>
            <div className={styles.locationsContainer}>
              {sortedLocations.map((location, index) => {
                const encounterIcon = getEncounterIcon(location.rarity, location.type)
                return (
                  <button 
                    key={index} 
                    className={styles.locationCard}
                    onClick={() => navigate('/pokedex', { state: { locationSearch: `${location.location} - ${location.region_name}` } })}
                    title={`Search for Pokémon at ${location.location}`}
                  >
                    <div className={styles.locationHeader}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h3 className={styles.locationName}>{location.location}</h3>
                        {encounterIcon && <img style={{ width: '24px', height: '24px', marginLeft: 'auto' }} src={encounterIcon} alt={location.rarity} title={location.rarity} />}
                      </div>
                      <span className={styles.locationRegion}>{location.region_name}</span>
                    </div>
                    <div className={styles.locationDetails}>
                      <span className={styles.locationDetail}>
                        <strong>Level:</strong> {location.min_level === location.max_level ? location.min_level : `${location.min_level}-${location.max_level}`}
                      </span>
                      <span className={styles.locationDetail}>
                        <strong>Rarity:</strong> {location.rarity}
                      </span>
                      <span className={styles.locationDetail}>
                        <strong>Time:</strong> {formatEncounterTime(location.time)}
                      </span>
                      {location.type && (
                        <span className={styles.locationDetail}>
                          <strong>Habitat:</strong> {location.type}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        )
      })()}

      {/* Moves */}
      <section className={styles.infoCard} key={`moves-${pokemonName}`}>
        <h2 className={styles.cardTitle}>Learnable Moves</h2>
        {pokemon.moves && pokemon.moves.length > 0 ? (
          (() => {
            const groupedMoves = groupMovesByMethod(pokemon.moves)
            const methodLabels = {
              'level-up': 'Level Up Moves',
              'machine': 'TM/HM Moves',
              'tutor': 'Move Tutor Moves',
              'egg': 'Egg Moves',
            }
            
            return (
              <div className={styles.moveSection}>
                {['level-up', 'machine', 'tutor', 'egg'].map(method => {
                  const moves = groupedMoves[method]
                  if (moves.length === 0) return null

                  const highlightedMoveKeys = method === 'level-up' && hasWildLevel
                    ? new Set(
                      moves
                        .map((move, index) => ({
                          move,
                          index,
                          level: move.methods?.[0]?.level
                        }))
                        .filter(({ level }) => Number.isFinite(level) && level <= wildLevelValue)
                        .slice(-4)
                        .map(({ move, index }) => `${move.name}-${move.methods?.[0]?.method || 'unknown'}-${move.methods?.[0]?.level || 0}-${index}`)
                    )
                    : new Set()
                  
                  return (
                    <div key={`${pokemonName}-${method}`} className={styles.moveGroup}>
                      <div className={styles.moveGroupHeader}>
                        <h3 className={styles.moveGroupTitle}>{methodLabels[method]}</h3>
                        {method === 'level-up' && (
                          <label className={styles.levelFilter} htmlFor="wild-level-input">
                            <span className={styles.levelFilterLabel}>Wild Pokemon Level</span>
                            <input
                              id="wild-level-input"
                              className={styles.levelFilterInput}
                              type="number"
                              min="1"
                              inputMode="numeric"
                              placeholder="e.g. 22"
                              value={wildLevel}
                              onChange={(e) => setWildLevel(e.target.value)}
                            />
                          </label>
                        )}
                      </div>
                      <div className={styles.movesGrid}>
                        {moves.map((move, moveIndex) => {
                          const primaryMethod = move.methods?.[0]
                          const methodLabel = getMoveLearningMethod(primaryMethod?.method, primaryMethod?.level)
                          const moveKey = `${move.name}-${primaryMethod?.method || 'unknown'}-${primaryMethod?.level || 0}-${moveIndex}`
                          return (
                            <div
                              key={moveKey}
                              className={`${styles.moveTag} ${highlightedMoveKeys.has(moveKey) ? styles.moveTagHighlight : ''}`}
                              title={methodLabel}
                            >
                              <div>{move.name}</div>
                              <div className={styles.moveMethod}>{methodLabel}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
                {groupedMoves.other.length > 0 && (
                  <div className={styles.moveGroup} key={`${pokemonName}-other`}>
                    <h3 className={styles.moveGroupTitle}>Other Moves</h3>
                    <div className={styles.movesGrid}>
                      {groupedMoves.other.map((move, moveIndex) => {
                        const primaryMethod = move.methods?.[0]
                        const methodLabel = getMoveLearningMethod(primaryMethod?.method, primaryMethod?.level)
                        const moveKey = `${move.name}-${primaryMethod?.method || 'unknown'}-${primaryMethod?.level || 0}-${moveIndex}`
                        return (
                          <div key={moveKey} className={styles.moveTag} title={methodLabel}>
                            <div>{move.name}</div>
                            <div className={styles.moveMethod}>{methodLabel}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })()
        ) : (
          <p className={styles.noMovesMessage}>No moves available</p>
        )}
      </section>

      {/* Name Translations */}
      {pokemon.nameTranslations && Object.keys(pokemon.nameTranslations).length > 0 && (
        <section className={styles.infoSection}>
          <h2 className={styles.cardTitle}>Name Translations</h2>
          <div className={styles.translationsGrid}>
            {Object.entries(pokemon.nameTranslations).map(([code, data]) => {
              const languageNames = {
                'ja-Hrkt': '日本語 (Hiragana)',
                'roomaji': 'Romaji',
                'ko': '한국어',
                'zh-Hant': '繁體中文',
                'fr': 'Français',
                'de': 'Deutsch',
                'es': 'Español',
                'it': 'Italiano',
                'en': 'English',
                'ja': '日本語'
              }
              return (
                <div key={code} className={styles.translationItem}>
                  <span className={styles.translationCode}>{languageNames[code] || code}</span>
                  <span className={styles.translationName}>{data.name}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

    </article>
  )
}
