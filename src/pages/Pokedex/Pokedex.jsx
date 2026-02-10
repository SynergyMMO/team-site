import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDatabase } from '../../hooks/useDatabase'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import { useTierData } from '../../hooks/useTierData'
import SearchBar from '../../components/SearchBar/SearchBar'
import { getAssetUrl } from '../../utils/assets'
import { normalizePokemonName, onGifError } from '../../utils/pokemon'
import { API } from '../../api/endpoints'
import generationData from '../../data/generation.json'
import pokemonData from '../../data/pokemmo_data/pokemon-data.json'
import styles from './Pokedex.module.css'

export default function Pokedex() {
  useDocumentHead({
    title: 'Shiny Dex',
    description: 'Track every shiny Pokemon caught by Team Synergy in PokeMMO. Browse our community Shiny Dex across all generations.',
    canonicalPath: '/pokedex',
  })
  const navigate = useNavigate()
  const { data, isLoading } = useDatabase()
  const { tierPokemon, tierLookup } = useTierData()
  const [mode, setMode] = useState('shiny')
  const [hideComplete, setHideComplete] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedRarities, setSelectedRarities] = useState([])
  const [selectedTiers, setSelectedTiers] = useState([])
  const [selectedEggGroups, setSelectedEggGroups] = useState([])
  const [selectedTypes, setSelectedTypes] = useState([])
  const [movesToFilterBy, setMovesToFilterBy] = useState(['', '', '', ''])
  const [abilitySearch, setAbilitySearch] = useState('')
  const [locationSearch, setLocationSearch] = useState('')
  const [statMinimums, setStatMinimums] = useState({
    hp: '',
    attack: '',
    defense: '',
    spAtk: '',
    spDef: '',
    speed: ''
  })
  const [statSearchMode, setStatSearchMode] = useState('form') // 'form' or 'typing'
  const [statSearchInput, setStatSearchInput] = useState('')
  const [isRarityOpen, setIsRarityOpen] = useState(false)
  const [isTierOpen, setIsTierOpen] = useState(false)
  const [isEggGroupOpen, setIsEggGroupOpen] = useState(false)
  const [isTypesOpen, setIsTypesOpen] = useState(false)
  const [isMovesOpen, setIsMovesOpen] = useState(false)
  const [isAbilitiesOpen, setIsAbilitiesOpen] = useState(false)
  const [isStatSearchOpen, setIsStatSearchOpen] = useState(false)
  const [synergyDataToggle, setSynergyDataToggle] = useState(false)
  const [hoverInfo, setHoverInfo] = useState(null)
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 })
  const infoBoxRef = useRef(null)
  const rarityMenuRef = useRef(null)
  const tierMenuRef = useRef(null)
  const eggGroupMenuRef = useRef(null)
  const typesMenuRef = useRef(null)
  const movesMenuRef = useRef(null)
  const abilitiesMenuRef = useRef(null)
  const statSearchMenuRef = useRef(null)
  const searchTerm = search.trim().toLowerCase()
  const formatRarityKey = (value) => value.toLowerCase().trim().replace(/\s+/g, '_')
  const formatRarityLabel = (value) => {
    if (value === 'all') return 'All Encounter Types'
    if (value === 'fishing') return 'Fishing'
    return value
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
  const nameAliasMap = {
    darmanitan: 'darmanitan-standard'
  }
  const locationIndex = useMemo(() => {
    const index = new Map()
    Object.entries(pokemonData).forEach(([key, details]) => {
      const encounters = details.location_area_encounters || []
      const locationText = encounters
        .map(loc => [loc.location, loc.region_name, loc.type].filter(Boolean).join(' '))
        .join(' ')
        .toLowerCase()
      const raritySet = new Set()
      encounters.forEach(encounter => {
        const rawType = (encounter.type || '').toLowerCase()
        const rawRarity = encounter.rarity || ''
        if (rawRarity) raritySet.add(formatRarityKey(rawRarity))
        if (rawType.includes('rod')) raritySet.add('fishing')
        if(rawType.includes(`fossil`)) raritySet.add('Fossil')
        if(rawType.includes(`headbutt`)) raritySet.add('Headbutt')
      })
      if (locationText || raritySet.size) {
        index.set(key, {
          locationText,
          raritySet
        })
      }
    })
    return index
  }, [])
  const rarityOptions = useMemo(() => {
    const options = new Set()
    locationIndex.forEach(entry => {
      if (!entry) return
      entry.raritySet.forEach(value => options.add(value))
    })
    const sorted = Array.from(options).sort((a, b) => {
      if (a === 'fishing') return 1
      if (b === 'fishing') return -1
      return a.localeCompare(b)
    })
    return ['all', ...sorted]
  }, [locationIndex])
  const tierOptions = useMemo(() => {
    const tiers = Object.keys(tierPokemon || {})
    const sorted = tiers.sort((a, b) => {
      const aNum = parseInt(a.replace(/\D/g, ''), 10)
      const bNum = parseInt(b.replace(/\D/g, ''), 10)
      return aNum - bNum
    })
    return ['all', ...sorted]
  }, [tierPokemon])
  
  const eggGroupIndex = useMemo(() => {
    const index = new Map()
    Object.entries(pokemonData).forEach(([key, details]) => {
      // Skip legendary and mythical when Synergy data is ON
      if (synergyDataToggle && (details.is_legendary || details.is_mythical)) {
        return
      }
      const eggGroups = details.egg_groups || []
      if (eggGroups.length > 0) {
        index.set(key, eggGroups)
      }
    })
    return index
  }, [synergyDataToggle])
  
  const eggGroupOptions = useMemo(() => {
    const options = new Set()
    eggGroupIndex.forEach(groups => {
      groups.forEach(group => options.add(group))
    })
    const sorted = Array.from(options).sort()
    return ['all', ...sorted]
  }, [eggGroupIndex])
  
  const typeIndex = useMemo(() => {
    const index = new Map()
    Object.entries(pokemonData).forEach(([key, details]) => {
      const types = details.types || []
      if (types.length > 0) {
        index.set(key, types)
      }
    })
    return index
  }, [])
  
  const typeOptions = useMemo(() => {
    const options = new Set()
    typeIndex.forEach(types => {
      types.forEach(type => options.add(type))
    })
    const sorted = Array.from(options).sort()
    return ['all', ...sorted]
  }, [typeIndex])
  
  const abilityIndex = useMemo(() => {
    const index = new Map()
    Object.entries(pokemonData).forEach(([key, details]) => {
      const abilities = details.abilities || []
      if (abilities.length > 0) {
        const abilityNames = abilities.map(a => a.ability_name).filter(Boolean)
        if (abilityNames.length > 0) {
          index.set(key, abilityNames)
        }
      }
    })
    return index
  }, [])
  
  const abilityOptions = useMemo(() => {
    const options = new Set()
    abilityIndex.forEach(abilities => {
      abilities.forEach(ability => options.add(ability))
    })
    const sorted = Array.from(options).sort()
    return ['all', ...sorted]
  }, [abilityIndex])
  
  const searchSuggestions = useMemo(() => {
    const suggestions = new Set()
    
    // Add all unique Pokemon names
    Object.entries(generationData).forEach(([_, speciesGroups]) => {
      speciesGroups.forEach(group => {
        group.forEach(pokemon => {
          suggestions.add(pokemon)
        })
      })
    })
    
    // Add egg groups
    eggGroupOptions.forEach(group => {
      if (group !== 'all') suggestions.add(group)
    })
    
    return Array.from(suggestions).sort()
  }, [eggGroupOptions])
  
  const { globalShinies, ownerMap } = useMemo(() => {
    if (!data) return { globalShinies: new Set(), ownerMap: new Map() }
    const gs = new Set()
    const om = new Map()
    Object.entries(data).forEach(([player, playerData]) => {
      Object.values(playerData.shinies).forEach(entry => {
        const name = entry.Pokemon.toLowerCase()
        if (!entry.Sold || entry.Sold.toLowerCase() !== 'yes') {
          gs.add(name)
          if (!om.has(name)) om.set(name, [])
          om.get(name).push(player)
        }
      })
    })
    return { globalShinies: gs, ownerMap: om }
  }, [data])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (rarityMenuRef.current && !rarityMenuRef.current.contains(event.target)) {
        setIsRarityOpen(false)
      }
      if (tierMenuRef.current && !tierMenuRef.current.contains(event.target)) {
        setIsTierOpen(false)
      }
      if (eggGroupMenuRef.current && !eggGroupMenuRef.current.contains(event.target)) {
        setIsEggGroupOpen(false)
      }
      if (typesMenuRef.current && !typesMenuRef.current.contains(event.target)) {
        setIsTypesOpen(false)
      }
      if (movesMenuRef.current && !movesMenuRef.current.contains(event.target)) {
        setIsMovesOpen(false)
      }
      if (abilitiesMenuRef.current && !abilitiesMenuRef.current.contains(event.target)) {
        setIsAbilitiesOpen(false)
      }
      if (statSearchMenuRef.current && !statSearchMenuRef.current.contains(event.target)) {
        setIsStatSearchOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchend', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchend', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (!synergyDataToggle) {
      setHideComplete(false)
    } else {
      // Clear egg group filters when enabling Synergy data, as "legendary" egg group is now hidden
      setSelectedEggGroups([])
    }
  }, [synergyDataToggle])

  const formatSelectionSummary = (selected, options, labelFn, emptyLabel) => {
    if (selected.length === 0) return emptyLabel
    const ordered = options.filter(option => selected.includes(option))
    const labels = ordered.map(labelFn)
    if (labels.length <= 2) return labels.join(', ')
    return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`
  }

    const handleMouseOver = useCallback((e) => {
      const target = e.target
      if (target.tagName !== 'IMG' || !target.classList.contains(styles.complete)) return

      const pokemonName = target.alt.toLowerCase()
      const owners = ownerMap.get(pokemonName) || []

      const counts = owners.reduce((acc, name) => {
        acc[name] = (acc[name] || 0) + 1
        return acc
      }, {})

      const formattedOwners = Object.entries(counts).map(([name, count]) =>
        count > 1 ? `${name}\u00A0(${count})` : name
      )

      const text = formattedOwners.length
        ? `Owned by: ${formattedOwners.join(', ')}`
        : ''

      setHoverInfo(text)

      const rect = target.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const infoBoxWidth = 250

      let xPos = rect.right + 8
      if (xPos + infoBoxWidth > viewportWidth) {
        xPos = rect.left - infoBoxWidth - 8
      }

      xPos = Math.max(8, Math.min(xPos, viewportWidth - infoBoxWidth - 8))

      let yPos = rect.top

      requestAnimationFrame(() => {
        if (!infoBoxRef.current) return

        const realHeight = infoBoxRef.current.offsetHeight

        const clampedY = Math.max(
          8,
          Math.min(yPos, viewportHeight - realHeight - 8)
        )

        setHoverPos({ x: xPos, y: clampedY })
      })

      setHoverPos({ x: xPos, y: yPos })
    }, [ownerMap])



  const handleMouseOut = useCallback((e) => {
    if (e.target.tagName === 'IMG') setHoverInfo(null)
  }, [])

  const matchesStatSearch = (pokemonDetails) => {
    // Hide unobtainable pokemon
    if (pokemonDetails.obtainable === false) return false
    
    // Handle stats as array (from raw pokemonData)
    const statsArray = pokemonDetails.stats || []
    const statsMap = {}
    
    // Convert array format to map using stat_name
    statsArray.forEach(stat => {
      statsMap[stat.stat_name] = stat.base_stat
    })
    
    // Map our internal keys to pokemon data stat_name values
    const statNameMap = {
      'hp': 'hp',
      'attack': 'attack',
      'defense': 'defense',
      'spAtk': 'special-attack',
      'spDef': 'special-defense',
      'speed': 'speed'
    }
    
    // Check each stat - if a minimum is set (non-empty and > 0), verify the pokemon meets it
    for (const [statKey, minValue] of Object.entries(statMinimums)) {
      if (minValue === '' || minValue === '0') continue // Skip empty or zero values
      
      const minimum = parseInt(minValue, 10)
      if (!Number.isFinite(minimum)) continue
      
      const pokemonStat = statsMap[statNameMap[statKey]] || 0
      if (pokemonStat < minimum) return false
    }
    
    return true
  }

  const sliderIndex = mode === 'shiny' ? 0 : 1

  if (isLoading) return <div className="message">Loading...</div>

  return (
    <div>
      <h1>
        Team Synergy PokeDex
        <Link to="/admin" className="invisible-link">!</Link>
      </h1>
      <img src={getAssetUrl('images/pagebreak.png')} alt="Page Break" className="pagebreak" />

      <div className={styles.filterRow}>
        <div className={styles.dropdown} ref={rarityMenuRef}>
          <button
            type="button"
            className={styles.dropdownButton}
            onClick={() => {
              setIsRarityOpen((prev) => !prev)
              setIsTierOpen(false)
              setIsEggGroupOpen(false)
              setIsTypesOpen(false)
              setIsStatSearchOpen(false)
            }}
            aria-expanded={isRarityOpen}
            aria-haspopup="listbox"
          >
            <span className={styles.dropdownLabel}>Encounter Types</span>
            <span className={styles.dropdownValue}>
              {formatSelectionSummary(selectedRarities, rarityOptions, formatRarityLabel, 'All Encounter Types')}
            </span>
            <span className={styles.dropdownCaret}>▾</span>
          </button>
          {isRarityOpen && (
            <div className={styles.dropdownMenu} role="listbox" aria-multiselectable="true">
              <label className={styles.dropdownOption}>
                <input
                  type="checkbox"
                  checked={selectedRarities.length === 0}
                  onChange={() => setSelectedRarities([])}
                />
                <span>All Encounter Types</span>
              </label>
              {rarityOptions.filter(option => option !== 'all').map(option => (
                <label key={option} className={styles.dropdownOption}>
                  <input
                    type="checkbox"
                    checked={selectedRarities.includes(option)}
                    onChange={(e) => {
                      setSelectedRarities(prev => (
                        e.target.checked
                          ? [...prev, option]
                          : prev.filter(value => value !== option)
                      ))
                    }}
                  />
                  <span>{formatRarityLabel(option)}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className={styles.dropdown} ref={tierMenuRef}>
          <button
            type="button"
            className={styles.dropdownButton}
            onClick={() => {
              setIsTierOpen((prev) => !prev)
              setIsRarityOpen(false)
              setIsEggGroupOpen(false)
              setIsTypesOpen(false)
              setIsStatSearchOpen(false)
            }}
            aria-expanded={isTierOpen}
            aria-haspopup="listbox"
          >
            <span className={styles.dropdownLabel}>Tiers</span>
            <span className={styles.dropdownValue}>
              {formatSelectionSummary(selectedTiers, tierOptions, (value) => value, 'All Tiers')}
            </span>
            <span className={styles.dropdownCaret}>▾</span>
          </button>
          {isTierOpen && (
            <div className={styles.dropdownMenu} role="listbox" aria-multiselectable="true">
              <label className={styles.dropdownOption}>
                <input
                  type="checkbox"
                  checked={selectedTiers.length === 0}
                  onChange={() => setSelectedTiers([])}
                />
                <span>All Tiers</span>
              </label>
              {tierOptions.filter(option => option !== 'all').map(option => (
                <label key={option} className={styles.dropdownOption}>
                  <input
                    type="checkbox"
                    checked={selectedTiers.includes(option)}
                    onChange={(e) => {
                      setSelectedTiers(prev => (
                        e.target.checked
                          ? [...prev, option]
                          : prev.filter(value => value !== option)
                      ))
                    }}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className={styles.dropdown} ref={eggGroupMenuRef}>
          <button
            type="button"
            className={styles.dropdownButton}
            onClick={() => {
              setIsEggGroupOpen((prev) => !prev)
              setIsRarityOpen(false)
              setIsTierOpen(false)
              setIsTypesOpen(false)
              setIsStatSearchOpen(false)
            }}
            aria-expanded={isEggGroupOpen}
            aria-haspopup="listbox"
          >
            <span className={styles.dropdownLabel}>Egg Groups</span>
            <span className={styles.dropdownValue}>
              {formatSelectionSummary(selectedEggGroups, eggGroupOptions, (value) => value, 'All Egg Groups')}
            </span>
            <span className={styles.dropdownCaret}>▾</span>
          </button>
          {isEggGroupOpen && (
            <div className={styles.dropdownMenu} role="listbox" aria-multiselectable="true">
              <label className={styles.dropdownOption}>
                <input
                  type="checkbox"
                  checked={selectedEggGroups.length === 0}
                  onChange={() => setSelectedEggGroups([])}
                />
                <span>All Egg Groups</span>
              </label>
              {eggGroupOptions.filter(option => option !== 'all').map(option => (
                <label key={option} className={styles.dropdownOption}>
                  <input
                    type="checkbox"
                    checked={selectedEggGroups.includes(option)}
                    onChange={(e) => {
                      setSelectedEggGroups(prev => (
                        e.target.checked
                          ? [...prev, option]
                          : prev.filter(value => value !== option)
                      ))
                    }}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className={styles.dropdown} ref={typesMenuRef}>
          <button
            type="button"
            className={styles.dropdownButton}
            onClick={() => {
              setIsTypesOpen((prev) => !prev)
              setIsRarityOpen(false)
              setIsTierOpen(false)
              setIsEggGroupOpen(false)
              setIsStatSearchOpen(false)
            }}
            aria-expanded={isTypesOpen}
            aria-haspopup="listbox"
          >
            <span className={styles.dropdownLabel}>Types</span>
            <span className={styles.dropdownValue}>
              {formatSelectionSummary(selectedTypes, typeOptions, (value) => value.charAt(0).toUpperCase() + value.slice(1), 'All Types')}
            </span>
            <span className={styles.dropdownCaret}>▾</span>
          </button>
          {isTypesOpen && (
            <div className={styles.dropdownMenu} role="listbox" aria-multiselectable="true">
              <label className={styles.dropdownOption}>
                <input
                  type="checkbox"
                  checked={selectedTypes.length === 0}
                  onChange={() => setSelectedTypes([])}
                />
                <span>All Types</span>
              </label>
              {typeOptions.filter(option => option !== 'all').map(option => (
                <label key={option} className={styles.dropdownOption}>
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(option)}
                    onChange={(e) => {
                      setSelectedTypes(prev => (
                        e.target.checked
                          ? [...prev, option]
                          : prev.filter(value => value !== option)
                      ))
                    }}
                  />
                  <span>{option.charAt(0).toUpperCase() + option.slice(1)}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className={styles.dropdown} ref={movesMenuRef}>
          <button
            type="button"
            className={styles.dropdownButton}
            onClick={() => {
              setIsMovesOpen((prev) => !prev)
              setIsRarityOpen(false)
              setIsTierOpen(false)
              setIsEggGroupOpen(false)
              setIsTypesOpen(false)
              setIsStatSearchOpen(false)
            }}
            aria-expanded={isMovesOpen}
            aria-haspopup="listbox"
          >
            <span className={styles.dropdownLabel}>Moves</span>
            <span className={styles.dropdownValue}>
              {movesToFilterBy.filter(m => m.trim()).length === 0 ? 'All Moves' : `${movesToFilterBy.filter(m => m.trim()).length} Moves`}
            </span>
            <span className={styles.dropdownCaret}>▾</span>
          </button>
          {isMovesOpen && (
            <div className={styles.dropdownMenu} role="listbox" aria-multiselectable="true" style={{ minWidth: '340px', columnCount: 1 }}>
              <div style={{ padding: '12px' }}>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '12px' }}>
                  Type up to 4 move names (leave blank for no filter):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginBottom: '12px' }}>
                  {[0, 1, 2, 3].map((index) => (
                    <input
                      key={index}
                      type="text"
                      placeholder={`Move ${index + 1}`}
                      value={movesToFilterBy[index]}
                      onChange={(e) => {
                        const newMoves = [...movesToFilterBy]
                        newMoves[index] = e.target.value
                        setMovesToFilterBy(newMoves)
                      }}
                      style={{
                        padding: '6px 8px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(102, 126, 234, 0.5)',
                        borderRadius: '4px',
                        color: 'white',
                        fontSize: '0.9rem'
                      }}
                    />
                  ))}
                </div>
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <button
                    onClick={() => setMovesToFilterBy(['', '', '', ''])}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      background: 'rgba(102, 126, 234, 0.2)',
                      border: '1px solid rgba(102, 126, 234, 0.5)',
                      borderRadius: '4px',
                      color: '#667eea',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(102, 126, 234, 0.3)'
                      e.target.style.borderColor = 'rgba(102, 126, 234, 0.7)'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'rgba(102, 126, 234, 0.2)'
                      e.target.style.borderColor = 'rgba(102, 126, 234, 0.5)'
                    }}
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className={styles.dropdown} ref={abilitiesMenuRef}>
          <button
            type="button"
            className={styles.dropdownButton}
            onClick={() => {
              setIsAbilitiesOpen((prev) => !prev)
              setIsRarityOpen(false)
              setIsTierOpen(false)
              setIsEggGroupOpen(false)
              setIsTypesOpen(false)
              setIsMovesOpen(false)
              setIsStatSearchOpen(false)
            }}
            aria-expanded={isAbilitiesOpen}
            aria-haspopup="listbox"
          >
            <span className={styles.dropdownLabel}>Abilities</span>
            <span className={styles.dropdownValue}>
              {abilitySearch.trim() ? abilitySearch : 'All Abilities'}
            </span>
            <span className={styles.dropdownCaret}>▾</span>
          </button>
          {isAbilitiesOpen && (
            <div className={styles.dropdownMenu} role="listbox" aria-multiselectable="true" style={{ minWidth: '340px', columnCount: 1 }}>
              <div style={{ padding: '12px' }}>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '12px' }}>
                  Search for an ability (leave blank for no filter):
                </div>
                <input
                  type="text"
                  placeholder="Type ability name..."
                  value={abilitySearch}
                  onChange={(e) => setAbilitySearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(102, 126, 234, 0.5)',
                    borderRadius: '4px',
                    color: 'white',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                  autoFocus
                />
                {abilitySearch.trim() && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <button
                      onClick={() => setAbilitySearch('')}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        background: 'rgba(102, 126, 234, 0.2)',
                        border: '1px solid rgba(102, 126, 234, 0.5)',
                        borderRadius: '4px',
                        color: '#667eea',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(102, 126, 234, 0.3)'
                        e.target.style.borderColor = 'rgba(102, 126, 234, 0.7)'
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(102, 126, 234, 0.2)'
                        e.target.style.borderColor = 'rgba(102, 126, 234, 0.5)'
                      }}
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Location Search */}
        <div className={styles.dropdown} style={{ flex: '0.5' }}>
          <label style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.8)', fontWeight: '500', whiteSpace: 'nowrap', marginBottom: '8px', display: 'block' }}>
            Location:
          </label>
          <input
            type="text"
            placeholder="Search location..."
            value={locationSearch}
            onChange={(e) => setLocationSearch(e.target.value)}
            className={styles.locationSearchInput}
          />
          {locationSearch && (
            <button
              onClick={() => setLocationSearch('')}
              className={styles.locationSearchClear}
            >
              Clear
            </button>
          )}
        </div>
        
        <div className={styles.dropdown} ref={statSearchMenuRef}>
          <button
            type="button"
            className={styles.dropdownButton}
            onClick={() => {
              setIsStatSearchOpen((prev) => !prev)
              setIsRarityOpen(false)
              setIsTierOpen(false)
              setIsEggGroupOpen(false)
              setIsTypesOpen(false)
              setIsMovesOpen(false)
              setIsAbilitiesOpen(false)
            }}
            aria-expanded={isStatSearchOpen}
            aria-haspopup="listbox"
          >
            <span className={styles.dropdownLabel}>Stat Searcher</span>
            <span className={styles.dropdownValue}>
              {Object.values(statMinimums).some(v => v && v !== '0') ? 'Active' : 'Inactive'}
            </span>
            <span className={styles.dropdownCaret}>▾</span>
          </button>
          {isStatSearchOpen && (
            <div className={styles.dropdownMenu} role="listbox" aria-multiselectable="true" style={{ minWidth: '340px', columnCount: 1 }}>
              <div style={{ padding: '12px' }}>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '12px' }}>
                  Enter minimum base stat values (leave empty for no filter):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px 16px', marginBottom: '8px' }}>
                  {[
                    { label: 'HP', key: 'hp' },
                    { label: 'Attack', key: 'attack' },
                    { label: 'Defense', key: 'defense' },
                    { label: 'Sp. Atk', key: 'spAtk' },
                    { label: 'Sp. Def', key: 'spDef' },
                    { label: 'Speed', key: 'speed' }
                  ].map(({ label, key }) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ width: '62px', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.8)', textAlign: 'right' }}>
                        {label}:
                      </label>
                      <input
                        type="number"
                        value={statMinimums[key]}
                        onChange={(e) => setStatMinimums(prev => ({
                          ...prev,
                          [key]: e.target.value
                        }))}
                        placeholder="0"
                        min="0"
                        max="999"
                        style={{
                          width: '60px',
                          padding: '6px 8px',
                          background: 'rgba(0, 0, 0, 0.3)',
                          border: '1px solid rgba(102, 126, 234, 0.5)',
                          borderRadius: '4px',
                          color: 'white',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <button
                    onClick={() => setStatMinimums({
                      hp: '',
                      attack: '',
                      defense: '',
                      spAtk: '',
                      spDef: '',
                      speed: ''
                    })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      background: 'rgba(102, 126, 234, 0.2)',
                      border: '1px solid rgba(102, 126, 234, 0.5)',
                      borderRadius: '4px',
                      color: '#667eea',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(102, 126, 234, 0.3)'
                      e.target.style.borderColor = 'rgba(102, 126, 234, 0.7)'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'rgba(102, 126, 234, 0.2)'
                      e.target.style.borderColor = 'rgba(102, 126, 234, 0.5)'
                    }}
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search Pokemon, location, region, or moves..."
        suggestions={searchSuggestions}
      />

      <div style={{ textAlign: 'center', margin: '20px 0' }}>
        <button
          className={`${styles.toggleCompleteBtn} ${synergyDataToggle ? styles.active : ''}`}
          onClick={() => setSynergyDataToggle(!synergyDataToggle)}
          style={{
            backgroundColor: synergyDataToggle ? '#4a90e2' : '#666',
            transition: 'background-color 0.3s ease'
          }}
        >
          {synergyDataToggle ? 'Synergy PokeDex Data: ON' : 'Synergy PokeDex Data: OFF'}
        </button>
      </div>

      {synergyDataToggle && (
        <>
          <div className={styles.toggleContainer}>
            <div className={styles.toggle}>
              <span
                className={`${styles.option} ${mode === 'shiny' ? styles.active : ''}`}
                onClick={() => setMode('shiny')}
              >
                Shiny Dex
              </span>
              <span
                className={`${styles.option} ${mode === 'living' ? styles.active : ''}`}
                onClick={() => setMode('living')}
              >
                Living Dex
              </span>
              <div
                className={styles.slider}
                style={{ transform: `translateX(${sliderIndex * 100}%)` }}
              />
            </div>
          </div>

          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <button
              className={styles.toggleCompleteBtn}
              onClick={() => setHideComplete(!hideComplete)}
            >
              {hideComplete ? 'Show Complete' : 'Hide Complete'}
            </button>
          </div>
        </>
      )}

      {synergyDataToggle && (() => {
        // Calculate progress stats
        let totalPokemon = 0
        let completedPokemon = 0
        
        Object.entries(generationData).forEach(([_, speciesGroups]) => {
          const speciesCompleteSet = new Set()
          if (mode === 'shiny') {
            speciesGroups.forEach(group => {
              if (group.some(p => globalShinies.has(p.toLowerCase()))) {
                group.forEach(p => speciesCompleteSet.add(p.toLowerCase()))
              }
            })
          }
          
          const flatPokemon = speciesGroups.flat()
          const seenPokemon = new Set()
          flatPokemon.forEach(pokemon => {
            const lowerName = pokemon.toLowerCase()
            const normalized = normalizePokemonName(pokemon)
            const lookupName = nameAliasMap[normalized] || normalized
            const locationEntry = locationIndex.get(lookupName) || { locationText: '', raritySet: new Set() }
            const pokemonTier = tierLookup[normalized] || ''
            const pokemonEggGroups = eggGroupIndex.get(lookupName) || []
            const pokemonDetails = pokemonData[lookupName] || {}
            
            const movesArray = pokemonDetails.moves || []
            const movesList = movesArray
              .map(m => {
                if (typeof m === 'string') return m.toLowerCase()
                if (m.move && typeof m.move === 'string') return m.move.toLowerCase()
                if (m.name && typeof m.name === 'string') return m.name.toLowerCase()
                return ''
              })
              .filter(m => m)
              .join(' ')
            
            if (seenPokemon.has(lowerName)) return
            seenPokemon.add(lowerName)
            
            // Hide Legendary and Mythical Pokemon when Synergy Data is ON
            if (synergyDataToggle) {
              const isLegendaryOrMythical = pokemonDetails.is_legendary || pokemonDetails.is_mythical
              if (isLegendaryOrMythical) return
            }
            
            const isComplete = mode === 'shiny' ? speciesCompleteSet.has(lowerName) : globalShinies.has(lowerName)
            
            if (searchTerm) {
              const matchesSearch =
                lowerName.includes(searchTerm)
                || normalized.includes(searchTerm)
              if (!matchesSearch) return
            }
            if (locationSearch.trim()) {
              const locationText = locationEntry?.locationText || ''
              if (!locationText.includes(locationSearch.toLowerCase())) return
            }
            if (selectedRarities.length > 0) {
              const matchesRarity = selectedRarities.some(value => locationEntry.raritySet.has(value))
              if (!matchesRarity) return
            }
            if (selectedTiers.length > 0 && !selectedTiers.includes(pokemonTier)) return
            if (selectedEggGroups.length > 0) {
              const matchesEggGroup = selectedEggGroups.some(group => pokemonEggGroups.includes(group))
              if (!matchesEggGroup) return
            }
            if (selectedTypes.length > 0) {
              const pokemonTypes = pokemonDetails.types || []
              const matchesType = selectedTypes.every(type => pokemonTypes.includes(type))
              if (!matchesType) return
            }
            const filledMoves = movesToFilterBy.filter(m => m.trim())
            if (filledMoves.length > 0) {
              const pokemonMovesRaw = pokemonDetails.moves || []
              const pokemonMoveNames = pokemonMovesRaw.map(m => typeof m === 'string' ? m : m.name).filter(Boolean)
              const matchesMove = filledMoves.every(moveFilter => 
                pokemonMoveNames.some(pokemonMove => 
                  pokemonMove.toLowerCase().includes(moveFilter.toLowerCase())
                )
              )
              if (!matchesMove) return
            }
            if (abilitySearch.trim()) {
              const pokemonAbilitiesRaw = pokemonDetails.abilities || []
              const pokemonAbilityNames = pokemonAbilitiesRaw.map(a => a.ability_name).filter(Boolean)
              const searchNormalized = abilitySearch.toLowerCase().replace(/[\s-]/g, '')
              const matchesAbility = pokemonAbilityNames.some(pokemonAbility => {
                const abilityNormalized = pokemonAbility.toLowerCase().replace(/[\s-]/g, '')
                return abilityNormalized.includes(searchNormalized)
              })
              if (!matchesAbility) return
            }
            if (!matchesStatSearch(pokemonDetails)) return
            
            totalPokemon++
            if (isComplete) completedPokemon++
          })
        })
        
        const percentage = totalPokemon > 0 ? Math.round((completedPokemon / totalPokemon) * 100) : 0
        const remaining = totalPokemon - completedPokemon
        
        return (
          <div style={{ 
            textAlign: 'center', 
            margin: '30px auto 20px',
            padding: '24px',
            maxWidth: '600px',
            backgroundColor: 'linear-gradient(135deg, rgba(20,20,30,0.9) 0%, rgba(30,25,45,0.9) 100%)',
            background: 'linear-gradient(135deg, rgba(20,20,30,0.9) 0%, rgba(30,25,45,0.9) 100%)',
            borderRadius: '16px',
            border: '2px solid',
            borderImage: 'linear-gradient(135deg, #4a90e2, #7f5fff) 1',
            boxShadow: '0 8px 32px rgba(74,144,226,0.2), inset 0 1px 0 rgba(255,255,255,0.08)'
          }}>
            <div style={{ marginBottom: '14px', fontSize: '0.85rem', color: '#aaa', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              {mode === 'shiny' ? '✨ Shiny Dex' : '🧬 Living Dex'} Progress
            </div>
            <div style={{
              width: '100%',
              height: '32px',
              backgroundColor: 'rgba(50, 50, 70, 0.6)',
              borderRadius: '16px',
              overflow: 'hidden',
              margin: '0 auto 16px',
              border: '1px solid rgba(74,144,226,0.3)',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)'
            }}>
              <div style={{
                width: `${percentage}%`,
                height: '100%',
                background: percentage === 100 
                  ? 'linear-gradient(90deg, #4CAF50 0%, #66BB6A 100%)'
                  : 'linear-gradient(90deg, #4a90e2 0%, #7f5fff 100%)',
                transition: 'width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '13px',
                fontWeight: 'bold',
                boxShadow: percentage > 0 ? '0 0 12px rgba(74,144,226,0.6)' : 'none'
              }}>
                {percentage > 12 && `${percentage}%`}
              </div>
            </div>
            <div style={{ fontSize: '0.95rem', color: '#e0e0e0', fontWeight: '500' }}>
              <span style={{ color: '#4a90e2' }}>{completedPokemon}</span> / <span style={{ color: '#aaa' }}>{totalPokemon}</span>
              <span style={{ color: '#888', marginLeft: '12px' }}>•</span>
              <span style={{ color: remaining > 0 ? '#ff9999' : '#4CAF50', marginLeft: '12px' }}>
                {remaining} remaining
              </span>
            </div>
          </div>
        )
      })()}

      <div
        className={styles.showcase}
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}
      >
        {Object.entries(generationData).map(([gen, speciesGroups]) => {
          const speciesCompleteSet = new Set()
          if (mode === 'shiny') {
            speciesGroups.forEach(group => {
              if (group.some(p => globalShinies.has(p.toLowerCase()))) {
                group.forEach(p => speciesCompleteSet.add(p.toLowerCase()))
              }
            })
          }

          const flatPokemon = speciesGroups.flat()
          const seenPokemon = new Set()
          const visiblePokemon = flatPokemon.filter(pokemon => {
            const lowerName = pokemon.toLowerCase()
            const normalized = normalizePokemonName(pokemon)
            const lookupName = nameAliasMap[normalized] || normalized
            const locationEntry = locationIndex.get(lookupName) || { locationText: '', raritySet: new Set() }
            const pokemonTier = tierLookup[normalized] || ''
            const pokemonEggGroups = eggGroupIndex.get(lookupName) || []
            const pokemonDetails = pokemonData[lookupName] || {}
            
            // Extract moves - handle multiple possible formats
            const movesArray = pokemonDetails.moves || []
            const movesList = movesArray
              .map(m => {
                if (typeof m === 'string') return m.toLowerCase()
                if (m.move && typeof m.move === 'string') return m.move.toLowerCase()
                if (m.name && typeof m.name === 'string') return m.name.toLowerCase()
                return ''
              })
              .filter(m => m)
              .join(' ')
            
            // Skip if we've already processed this pokemon
            if (seenPokemon.has(lowerName)) return false
            seenPokemon.add(lowerName)

            // Hide Legendary and Mythical Pokemon when Synergy Data is ON
            if (synergyDataToggle) {
              const isLegendaryOrMythical = pokemonDetails.is_legendary || pokemonDetails.is_mythical
              if (isLegendaryOrMythical) return false
            }

            const isComplete = mode === 'shiny' ? speciesCompleteSet.has(lowerName) : globalShinies.has(lowerName)
            if (hideComplete && isComplete) return false
            if (searchTerm) {
              const matchesSearch =
                lowerName.includes(searchTerm)
                || normalized.includes(searchTerm)
              if (!matchesSearch) return false
            }
            if (locationSearch.trim()) {
              const locationText = locationEntry?.locationText || ''
              if (!locationText.includes(locationSearch.toLowerCase())) return false
            }
            if (selectedRarities.length > 0) {
              const matchesRarity = selectedRarities.some(value => locationEntry.raritySet.has(value))
              if (!matchesRarity) return false
            }
            if (selectedTiers.length > 0 && !selectedTiers.includes(pokemonTier)) return false
            if (selectedEggGroups.length > 0) {
              const matchesEggGroup = selectedEggGroups.some(group => pokemonEggGroups.includes(group))
              if (!matchesEggGroup) return false
            }
            if (selectedTypes.length > 0) {
              const pokemonTypes = pokemonDetails.types || []
              const matchesType = selectedTypes.every(type => pokemonTypes.includes(type))
              if (!matchesType) return false
            }
            const filledMoves = movesToFilterBy.filter(m => m.trim())
            if (filledMoves.length > 0) {
              const pokemonMovesRaw = pokemonDetails.moves || []
              const pokemonMoveNames = pokemonMovesRaw.map(m => typeof m === 'string' ? m : m.name).filter(Boolean)
              const matchesMove = filledMoves.every(moveFilter => 
                pokemonMoveNames.some(pokemonMove => 
                  pokemonMove.toLowerCase().includes(moveFilter.toLowerCase())
                )
              )
              if (!matchesMove) return false
            }
            if (abilitySearch.trim()) {
              const pokemonAbilitiesRaw = pokemonDetails.abilities || []
              const pokemonAbilityNames = pokemonAbilitiesRaw.map(a => a.ability_name).filter(Boolean)
              const searchLower = abilitySearch.toLowerCase()
              const matchesAbility = pokemonAbilityNames.some(pokemonAbility => 
                pokemonAbility.toLowerCase().includes(searchLower)
              )
              if (!matchesAbility) return false
            }
            if (!matchesStatSearch(pokemonDetails)) return false
            return true
          })

          if (visiblePokemon.length === 0) return null

          return (
          <div key={gen} className={styles.generationSection}>
          <h2 className={styles.generationTitle}>{gen}</h2>
          <div className={styles.grid}>
              {visiblePokemon.map((pokemon, idx) => {
                const normalized = normalizePokemonName(pokemon)
                const lowerName = pokemon.toLowerCase()

                const isComplete =
                  mode === 'shiny'
                    ? speciesCompleteSet.has(lowerName)
                    : globalShinies.has(lowerName)

                return (
                  <img
                    key={`${gen}-${pokemon}-${idx}`}
                    src={API.pokemonSprite(normalized)}
                    alt={pokemon}
                    className={`${styles.pokemon} ${
                      synergyDataToggle
                        ? (isComplete ? styles.complete : styles.incomplete)
                        : styles.complete
                    }`}
                    width="50"
                    height="50"
                    loading="lazy"
                    onError={onGifError(normalized)}
                    onClick={() => navigate(`/pokemon/${pokemon.toLowerCase()}`)}
                    style={{ cursor: 'pointer' }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        navigate(`/pokemon/${pokemon.toLowerCase()}`)
                      }
                    }}
                  />
                )
              })}
          </div>
        </div>
          )
        })}
      </div>

      {hoverInfo && (
        <div
          ref={infoBoxRef}
          className={styles.infoBox}
          style={{ left: hoverPos.x, top: hoverPos.y }}
        >
          {hoverInfo}
        </div>
      )}
    </div>
  )
}
