import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useMemo, useState, useEffect } from 'react'
import { usePokemonDetails } from '../../hooks/usePokemonDetails'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import { useDatabase } from '../../hooks/useDatabase'
import { usePokemonOrder } from '../../hooks/usePokemonOrder'
import { usePokemonSprites } from '../../hooks/usePokemonSprites'
import BackButton from '../../components/BackButton/BackButton'
import styles from './PokemonDetail.module.css'

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

  console.log(result)
  return result
}


export default function PokemonDetail() {
  const { pokemonName } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { data: pokemon, isLoading, error } = usePokemonDetails(pokemonName)
  const { data: databaseData } = useDatabase()
  const { getNextPokemon, getPreviousPokemon } = usePokemonOrder()
  const sprites = usePokemonSprites(pokemonName)
  const [currentSpriteIndex, setCurrentSpriteIndex] = useState(0)
  const [loadedSpriteUrl, setLoadedSpriteUrl] = useState('')
  const [wildLevel, setWildLevel] = useState('')
  const [routeSearch, setRouteSearch] = useState('')
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [showRoutesSuggestions, setShowRoutesSuggestions] = useState(false)
  const [audioRef] = useState(new Audio())
  const spriteAliasMap = useMemo(() => ({
    wormadam: 'wormadam-plant',
    'gastrodon-west': 'gastrodon',
    'shellos-west': 'shellos'
  }), [])
  const spriteName = spriteAliasMap[pokemonName?.toLowerCase()] || pokemonName

  // Reset sprite index when pokemon changes
  useEffect(() => {
    setCurrentSpriteIndex(0)
  }, [pokemonName])
  
  useEffect(() => {
    setLoadedSpriteUrl('')
  }, [pokemonName, currentSpriteIndex])

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

  // Get animated shiny GIF for OG image
  const animatedShinyGif = useMemo(() => {
    if (!spriteName) return 'https://synergymmo.com/favicon.png'
    const name = spriteName.toLowerCase().replace(/\s/g, '-')
    return `https://img.pokemondb.net/sprites/black-white/anim/shiny/${name}.gif`
  }, [spriteName])

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
  
  // Get next/previous pokemon for navigation
  const nextPokemon = getNextPokemon(pokemonName)
  const prevPokemon = getPreviousPokemon(pokemonName)
  const currentSprite = sprites.length > 0
    ? sprites[currentSpriteIndex]
    : { url: pokemon.sprite, label: pokemon.displayName, type: 'png' }
  const currentSpriteUrl = currentSprite?.url
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
              {sprites.length > 0 ? (
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
            </div>
            {sprites.length > 1 && (
              <div className={styles.spriteNavigation}>
                <button
                  className={styles.spriteButton}
                  onClick={() => setCurrentSpriteIndex((prev) => (prev === 0 ? sprites.length - 1 : prev - 1))}
                  title="Previous sprite"
                  aria-label="Previous sprite"
                >
                  ❮
                </button>
                <span className={styles.spriteLabel}>
                  {sprites[currentSpriteIndex].label} ({currentSpriteIndex + 1}/{sprites.length})
                </span>
                <button
                  className={styles.spriteButton}
                  onClick={() => setCurrentSpriteIndex((prev) => (prev === sprites.length - 1 ? 0 : prev + 1))}
                  title="Next sprite"
                  aria-label="Next sprite"
                >
                  ❯
                </button>
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
                    {pokemon.abilities.normal.map(ability => (
                      <li key={ability}>{ability.replace('-', ' ')}</li>
                    ))}
                  </ul>
                </div>
              )}
              {pokemon.abilities.hidden.length > 0 && (
                <div>
                  <h3 className={styles.abilitySubtitle}>Hidden Ability</h3>
                  <ul className={styles.abilityList}>
                    {pokemon.abilities.hidden.map(ability => (
                      <li key={ability} className={styles.hiddenAbility}>
                        {ability.replace('-', ' ')} ✨
                      </li>
                    ))}
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
                    <span className={styles.statLabel}>{stat.label}</span>
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
                    <span className={styles.statValue}>{stat.value}</span>
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
                        {combined.quarterDmg.map(type => (
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
                        {combined.halfDmg.map(type => (
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
              <div className={styles.infoGroup}>
                <span className={styles.label}>Catch Rate</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span className={styles.value}>{pokemon.catchRate}/255</span>
                  <div className={styles.catchBar}>
                    <div 
                      className={styles.catchBarFill}
                      style={{ 
                        width: `${(pokemon.catchRate / 255) * 100}%`,
                        background: pokemon.catchRate > 200 ? '#4ade80' : pokemon.catchRate > 100 ? '#60a5fa' : pokemon.catchRate > 50 ? '#fb923c' : '#ef4444'
                      }}
                    />
                  </div>
                  <span className={styles.catchDifficulty} style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                    {pokemon.catchRate > 200 ? 'Very Easy' : pokemon.catchRate > 100 ? 'Easy' : pokemon.catchRate > 50 ? 'Moderate' : 'Hard to catch'}
                  </span>
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

          {/* Evolution */}
          {pokemon.evolution_chain?.chain?.evolves_to && pokemon.evolution_chain.chain.evolves_to.length > 0 && (
            <div className={styles.infoCard}>
              <h2 className={styles.cardTitle}>Evolves Into</h2>
              <div className={styles.evolutionContainer}>
                {pokemon.evolution_chain.chain.evolves_to.map((evolution, index) => (
                  <div key={index}>
                    {index > 0 && <span className={styles.evolutionOr}> or </span>}
                    <button
                      onClick={() => navigate(`/pokemon/${evolution.species.name}`, { state: { fromPokemon: true } })}
                      className={styles.evolutionLink}
                      title={`View ${evolution.species.name}`}
                    >
                      {evolution.species.name.charAt(0).toUpperCase() + evolution.species.name.slice(1).replace('-', ' ')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
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
                  <div key={index} className={styles.locationCard}>
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
                  </div>
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

      {/* Alternative Forms */}
      {pokemon.varieties && pokemon.varieties.length > 1 && (
        <section className={styles.infoSection}>
          <h2 className={styles.cardTitle}>Forms</h2>
          <div className={styles.formsGrid}>
            {pokemon.varieties.map((form) => (
              <button
                key={form.name}
                onClick={() => navigate(`/pokemon/${form.name}`)}
                className={styles.formButton}
                title={`View ${form.name}`}
              >
                <span className={styles.formName}>{form.name.replace('-', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>
                {form.is_default && <span className={styles.formBadge}>Default</span>}
              </button>
            ))}
          </div>
        </section>
      )}

    </article>
  )
}
