import { useEffect, useMemo } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { useDatabase } from '../../hooks/useDatabase'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import { useTrophies } from '../../hooks/useTrophies'
import { grabShinyData } from '../../hooks/useShinyData' 
import ShinyItem from '../../components/ShinyItem/ShinyItem'
import TrophyShelf from '../../components/TrophyShelf/TrophyShelf'
import BackButton from '../../components/BackButton/BackButton'
import styles from './PlayerPage.module.css'

export default function PlayerPage() {

  
  const { playerName } = useParams()
  const location = useLocation()
  const { data, isLoading } = useDatabase()
  const { data: trophiesData } = useTrophies()

  const { realKey, playerData } = useMemo(() => {
    if (!data) return {}
    const key = Object.keys(data).find(
      k => k.toLowerCase() === playerName.toLowerCase()
    )
    return { realKey: key, playerData: key ? data[key] : null }
  }, [data, playerName])

  useDocumentHead({
    title: realKey ? `${realKey}'s Shinies` : playerName,
    description: realKey
      ? `Browse ${realKey}'s shiny Pokemon collection in PokeMMO.`
      : `View this player's shiny Pokemon collection in PokeMMO.`,
    canonicalPath: `/player/${playerName.toLowerCase()}`,
    ogImage: favoriteImage || 'https://synergymmo.com/default-preview.png', // fallback
  })


  useEffect(() => {
    document.body.classList.add('player-page-active')
    return () => document.body.classList.remove('player-page-active')
  }, [])


  if (isLoading) return <div className="message">Loading...</div>
  if (!playerData) {
    return <h2 style={{ color: 'white', textAlign: 'center' }}>Player "{playerName}" not found</h2>
  }

  const shinies = Object.entries(playerData.shinies)
  const favourites = shinies.filter(([, s]) => s.Favourite?.toLowerCase() === 'yes')
  const normalShinies = shinies.filter(([, s]) => s.Favourite?.toLowerCase() !== 'yes')

  const fromSHOTM = location.state?.from === 'shotm'
  const backTo = fromSHOTM ? '/shotm' : '/'
  const backLabel = fromSHOTM ? '\u2190 Back to SHOTM' : '\u2190 Back to Showcase'

  return (
    <div className={styles.playerPage}>
      <BackButton to={backTo} label={backLabel} />
      <h1>{realKey}'s Shiny Collection &#10024;</h1>
      <p>Total Shinies: {playerData.shiny_count}</p>

      {favourites.length > 0 && (
        <div className={styles.favouriteList}>
          <h2 className={styles.favouritesHeader}>My Followers</h2>
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
