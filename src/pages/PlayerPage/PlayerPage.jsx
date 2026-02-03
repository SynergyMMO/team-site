import { useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useDatabase } from '../../hooks/useDatabase'
import { useTrophies } from '../../hooks/useTrophies'
import ShinyItem from '../../components/ShinyItem/ShinyItem'
import TrophyShelf from '../../components/TrophyShelf/TrophyShelf'
import BackButton from '../../components/BackButton/BackButton'
import styles from './PlayerPage.module.css'

export default function PlayerPage() {
  const { playerName } = useParams()
  const { data, isLoading } = useDatabase()
  const { data: trophiesData } = useTrophies()

  useEffect(() => {
    document.body.classList.add('player-page-active')
    return () => document.body.classList.remove('player-page-active')
  }, [])

  const { realKey, playerData } = useMemo(() => {
    if (!data) return {}
    const key = Object.keys(data).find(
      k => k.toLowerCase() === playerName.toLowerCase()
    )
    return { realKey: key, playerData: key ? data[key] : null }
  }, [data, playerName])

  if (isLoading) return <div className="message">Loading...</div>
  if (!playerData) {
    return <h2 style={{ color: 'white', textAlign: 'center' }}>Player "{playerName}" not found</h2>
  }

  const shinies = Object.values(playerData.shinies)
  const favourites = shinies.filter(s => s.Favourite?.toLowerCase() === 'yes')
  const normalShinies = shinies.filter(s => s.Favourite?.toLowerCase() !== 'yes')

  return (
    <div className={styles.playerPage}>
      <BackButton to="/" label="&larr; Back to Showcase" />
      <h1>{realKey}'s Shiny Collection &#10024;</h1>
      <p>Total Shinies: {playerData.shiny_count}</p>

      {favourites.length > 0 && (
        <div className={styles.favouriteList}>
          <h2 className={styles.favouritesHeader}>My Follower</h2>
          {favourites.map((s, i) => (
            <span key={i} className={styles.bigShinyWrapper}>
              <ShinyItem shiny={s} />
            </span>
          ))}
        </div>
      )}

      <div className={styles.shinyList}>
        {normalShinies.map((s, i) => (
          <ShinyItem key={i} shiny={s} />
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
