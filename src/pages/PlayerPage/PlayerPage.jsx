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

  // --- Find player data from database ---
  const { realKey, playerData } = useMemo(() => {
    if (!data) return {}
    const key = Object.keys(data).find(
      k => k.toLowerCase() === playerName.toLowerCase()
    )
    return { realKey: key, playerData: key ? data[key] : null }
  }, [data, playerName])

  // --- Add page-specific class to body ---
  useEffect(() => {
    document.body.classList.add('player-page-active')
    return () => document.body.classList.remove('player-page-active')
  }, [])

  if (isLoading) return <div className="message">Loading...</div>
  if (!playerData) {
    return (
      <h2 style={{ color: 'white', textAlign: 'center' }}>
        Player "{playerName}" not found
      </h2>
    )
  }

  // --- Separate favourite and normal shinies ---
  const shinies = Object.entries(playerData.shinies)
  const favourites = shinies.filter(([, s]) => s.Favourite?.toLowerCase() === 'yes')
  const normalShinies = shinies.filter(([, s]) => s.Favourite?.toLowerCase() !== 'yes')

  // --- Back button logic ---
  const fromSHOTM = location.state?.from === 'shotm'
  const backTo = fromSHOTM ? '/shotm' : '/'
  const backLabel = fromSHOTM ? '\u2190 Back to SHOTM' : '\u2190 Back to Showcase'

  // --- Determine first GIF for OG image ---
  const firstFavouriteShiny = favourites[0]?.[1]
  const firstNormalShiny = normalShinies[0]?.[1]
  const ogImage =
    (firstFavouriteShiny && getLocalPokemonGif(firstFavouriteShiny.Pokemon)) ||
    (firstNormalShiny && getLocalPokemonGif(firstNormalShiny.Pokemon)) ||
    'https://synergymmo.com/favicon.png'

  // --- Unique player URL for OG / canonical ---
  const ogUrl = `https://synergymmo.com/player/${playerName.toLowerCase()}?v=2`

  // --- Set dynamic document head (OG/Twitter meta tags) ---
  useDocumentHead({
    title: realKey ? `${realKey}'s Shinies` : playerName,
    description: realKey
      ? `Browse ${realKey}'s shiny Pokemon collection in PokeMMO.`
      : `View this player's shiny Pokemon collection in PokeMMO.`,
    ogImage,
    url: ogUrl,
  })

  return (
    <div className={styles.playerPage}>
      <BackButton to={backTo} label={backLabel} />
      <h1>{realKey}'s Shiny Collection &#10024;</h1>
      <p>Total Shinies: {playerData.shiny_count}</p>

      {favourites.length > 0 && (
        <div className={styles.favouriteList}>
          <h2 className={styles.favouritesHeader}>My Favourites</h2>
          <div className={styles.favouriteGrid}>
            {favourites.map(([id, s]) => (
              <div key={id} className={styles.bigShinyWrapper}>
                <ShinyItem shiny={s} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.shinyList}>
        {normalShinies.map(([id, s]) => (
          <ShinyItem key={id} shiny={s} />
        ))}
      </div>

      {trophiesData && (
        <TrophyShelf
          playerName={realKey}
          trophies={trophiesData.trophies}
          trophyAssignments={trophiesData.trophyAssignments}
        />
      )}
    </div>
  )
}
