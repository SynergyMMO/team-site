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
    if (!pokemonName) return 'https://synergymmo.com/favicon.png'
    const name = pokemonName.toLowerCase().replace(/\s/g, '-')
    return `https://img.pokemondb.net/sprites/black-white/anim/shiny/${name}.gif`
  }, [pokemonName])

// Capitalize first letter helper
const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : "";

// Convert types array to "Title Case / Title Case"
const formatTypes = (types) =>
  types.map(type => capitalize(type)).join(" / ");

// Convert egg groups array to readable string: "Egg1 & Egg2"
const formatEggGroups = (eggs) =>
  eggs?.length ? eggs.map(capitalize).join(" & ") : "Unknown Egg Group";

// Build description text using types and egg groups
const buildDescription = (pokemon) => {
  if (!pokemon) return "Explore Pokémon shiny forms, stats, moves, and egg groups in our Shiny Dex.";

  const name = capitalize(pokemon.displayName);
  const types = formatTypes(pokemon.types);
  const eggGroups = formatEggGroups(pokemon.eggGroups);

  return `${name} is a ${types}-type Pokémon from the ${eggGroups}. Explore its shiny forms, stats, and moves in our Shiny Dex.`;
};

useDocumentHead({
  title: pokemon
    ? `${capitalize(pokemon.displayName)} | ${formatEggGroups(pokemon.eggGroups)} | Shiny Dex`
    : "Pokémon Shiny Dex",

  description: buildDescription(pokemon),

  canonicalPath: `/pokemon/${pokemonName?.toLowerCase()}`,

  url: `https://synergymmo.com/pokemon/${pokemonName?.toLowerCase()}`,

  ogImage: animatedShinyGif,

  twitterCard: "summary_large_image",

  twitterTitle: pokemon
    ? `${capitalize(pokemon.displayName)} | ${formatEggGroups(pokemon.eggGroups)} | Shiny Dex`
    : "Pokémon Shiny Dex",

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
                <span className={styles.value}>{pokemon.catchRate}</span>
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
      {pokemon?.locations && pokemon.locations.length > 0 && (
        <section className={styles.infoCard}>
          <h2 className={styles.cardTitle}>Locations</h2>
          <div className={styles.locationsContainer}>
            {pokemon.locations.map((location, index) => (
              <div key={index} className={styles.locationCard}>
                <div className={styles.locationHeader}>
                  <h3 className={styles.locationName}>{location.location}</h3>
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
                    <strong>Time:</strong> {location.time}
                  </span>
                  {location.type && (
                    <span className={styles.locationDetail}>
                      <strong>Habitat:</strong> {location.type}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

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
                  
                  return (
                    <div key={`${pokemonName}-${method}`} className={styles.moveGroup}>
                      <h3 className={styles.moveGroupTitle}>{methodLabels[method]}</h3>
                      <div className={styles.movesGrid}>
                        {moves.map((move, moveIndex) => {
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


    </article>
  )
}
