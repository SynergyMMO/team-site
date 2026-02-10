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
  const [isRarityOpen, setIsRarityOpen] = useState(false)
  const [isTierOpen, setIsTierOpen] = useState(false)
  const [hoverInfo, setHoverInfo] = useState(null)
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 })
  const infoBoxRef = useRef(null)
  const rarityMenuRef = useRef(null)
  const tierMenuRef = useRef(null)
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
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search Pokemon,location or region..."
      />

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
            // Skip if we've already processed this pokemon
            if (seenPokemon.has(lowerName)) return false
            seenPokemon.add(lowerName)

            const isComplete = mode === 'shiny' ? speciesCompleteSet.has(lowerName) : globalShinies.has(lowerName)
            if (hideComplete && isComplete) return false
            if (searchTerm) {
              const matchesSearch =
                lowerName.includes(searchTerm)
                || normalized.includes(searchTerm)
                || locationEntry.locationText.includes(searchTerm)
              if (!matchesSearch) return false
            }
            if (selectedRarities.length > 0) {
              const matchesRarity = selectedRarities.some(value => locationEntry.raritySet.has(value))
              if (!matchesRarity) return false
            }
            if (selectedTiers.length > 0 && !selectedTiers.includes(pokemonTier)) return false
            return true
          })

          if (visiblePokemon.length === 0) return null

          return (
          <div key={gen}>
          <h2 style={{ textAlign: 'center' }}>{gen}</h2>
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
                      isComplete ? styles.complete : styles.incomplete
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
