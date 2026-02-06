import { useState, useMemo, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useDatabase } from '../../hooks/useDatabase'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import { getAssetUrl } from '../../utils/assets'
import { normalizePokemonName, onGifError } from '../../utils/pokemon'
import { API } from '../../api/endpoints'
import generationData from '../../data/generation.json'
import styles from './Pokedex.module.css'

export default function Pokedex() {
  useDocumentHead({
    title: 'Shiny Dex',
    description: 'Track every shiny Pokemon caught by Team Synergy in PokeMMO. Browse our community Shiny Dex across all generations.',
    canonicalPath: '/pokedex',
  })
  const { data, isLoading } = useDatabase()
  const [mode, setMode] = useState('shiny')
  const [hideComplete, setHideComplete] = useState(false)
  const [hoverInfo, setHoverInfo] = useState(null)
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 })
  const infoBoxRef = useRef(null)
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
            // Skip if we've already processed this pokemon
            if (seenPokemon.has(lowerName)) return false
            seenPokemon.add(lowerName)

            const isComplete = mode === 'shiny' ? speciesCompleteSet.has(lowerName) : globalShinies.has(lowerName)
            if (hideComplete && isComplete) return false
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
