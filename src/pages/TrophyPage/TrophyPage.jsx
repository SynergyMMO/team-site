import { useParams, Link } from 'react-router-dom'
import { useTrophies } from '../../hooks/useTrophies'
import { useDatabase } from '../../hooks/useDatabase'
import BackButton from '../../components/BackButton/BackButton'
import styles from './TrophyPage.module.css'

export default function TrophyPage() {
  const { trophyName } = useParams()
  const { data: trophiesData, isLoading: loadingTrophies } = useTrophies()
  const { data: shinyData, isLoading: loadingDB } = useDatabase()

  if (loadingTrophies || loadingDB) return <div className="message">Loading...</div>

  const { trophies, trophyAssignments } = trophiesData

  const trophyKey = Object.keys(trophies).find(
    k => k.toLowerCase() === decodeURIComponent(trophyName).toLowerCase()
  )

  if (!trophyKey) {
    return <h2 style={{ color: 'white', textAlign: 'center' }}>Trophy "{trophyName}" not found</h2>
  }

  const trophyImg = trophies[trophyKey]
  const players = (trophyAssignments[trophyKey] || []).filter(player =>
    Object.keys(shinyData).some(
      dbKey => dbKey.toLowerCase() === player.toLowerCase()
    )
  )

  return (
    <div className={styles.trophyPage}>
      <BackButton to="/trophy-board" label="&larr; Return to Trophy Board" />
      <div className={styles.header}>
        <img src={trophyImg} alt={trophyKey} className={styles.largeTrophy} />
        <h1>{trophyKey}</h1>
      </div>
      <h2 className={styles.playersHeading}>Players who have this trophy:</h2>
      <ul className={styles.playersList}>
        {players.map(player => (
          <li key={player}>
            <Link to={`/player/${player.toLowerCase()}`} className={styles.playerLink}>
              {player}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
