import { useEffect, useMemo } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { useDatabase } from '../../hooks/useDatabase'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import { useTrophies } from '../../hooks/useTrophies'
import ShinyItem from '../../components/ShinyItem/ShinyItem'
import TrophyShelf from '../../components/TrophyShelf/TrophyShelf'
import BackButton from '../../components/BackButton/BackButton'
import styles from './PlayerPage.module.css'
import { getLocalPokemonGif } from '../../utils/pokemon'

export default function PlayerPage() {
  const { playerName } = useParams()
  const location = useLocation()
  const { data, isLoading } = useDatabase()
  const { data: trophiesData } = useTrophies()

  // --- Find player data safely ---
  const { realKey, playerData } = useMemo(() => {
    if (!data) return { realKey: null, playerData: null }
    const key = Object.keys(data).find(
      k => k.toLowerCase() === playerName.toLowerCase()
    )
    return { realKey: key || null, playerData: key ? data[key] : null }
  }, [data, playerName])

  // --- Page-specific body class ---
  useEffect(() => {
    document.body.classList.add('player-page-active')
    return () => document.body.classList.remove('player-page-active')
  }, [])

  // --- Safe default values for hooks ---
  const safeRealKey = realKey || playerName
  const safeShinies = Object.entries(playerData?.shinies || {})
  const safeFavourites = safeShinies.filter(
    ([, s]) => s.Favourite?.toLowerCase() === 'yes'
  )
  const safeNormalShinies = safeShinies.filter(
    ([, s]) => s.Favourite?.toLowerCase() !== 'yes'
  )
  const firstFavouriteShiny = safeFavourites[0]?.[1]
  const firstNormalShiny = safeNormalShinies[0]?.[1]
  const ogImage =
    (firstFavouriteShiny && getLocalPokemonGif(firstFavouriteShiny.Pokemon)) ||
    (firstNormalShiny && getLocalPokemonGif(firstNormalShiny.Pokemon)) ||
    'https://synergymmo.com/favicon.png'
  const ogUrl = `https://synergymmo.com/player/${playerName.toLowerCase()}?v=2`

  // --- Call hook unconditionally ---
  useDocumentHead({
    title: `${safeRealKey}'s Shinies`,
    description: `Browse ${safeRealKey}'s shiny Pokemon collection in PokeMMO.`,
    ogImage,
    url: ogUrl,
  })

  // --- Back button logic ---
  const fromSHOTM = location.state?.from === 'shotm'
  const backTo = fromSHOTM ? '/shotm' : '/'
  const backLabel = fromSHOTM ? '\u2190 Back to SHOTM' : '\u2190 Back to Showcase'

  // --- Render loading or missing player states ---
  if (isLoading) return <div className="message">Loading...</div>
  if (!playerData) {
    return (
      <h2 style={{ color: 'white', textAlign: 'center' }}>
        Player "{playerName}" not found
      </h2>
    )
  }

  // --- Render main player page ---
  return (
    <div className={styles.playerPage}>
      <BackButton to={backTo} label={backLabel} />

      <h1>{safeRealKey}'s Shiny Collection &#10024;</h1>
      <p>Total Shinies: {playerData.shiny_count ?? 0}</p>

      {safeFavourites.length > 0 && (
        <div className={styles.favouriteList}>
          <h2 className={styles.favouritesHeader}>My Favourites</h2>
          <div className={styles.favouriteGrid}>
            {safeFavourites.map(([id, s]) => (
              <div key={id} className={styles.bigShinyWrapper}>
                <ShinyItem shiny={s} />
              </div>
            ))}
          </div>
        </div>
      )}

      {safeNormalShinies.length > 0 && (
        <div className={styles.shinyList}>
          {safeNormalShinies.map(([id, s]) => (
            <ShinyItem key={id} shiny={s} />
          ))}
        </div>
      )}

      {trophiesData && (
        <TrophyShelf
          playerName={safeRealKey}
          trophies={trophiesData.trophies}
          trophyAssignments={trophiesData.trophyAssignments}
        />
      )}
    </div>
  )
}
