import { useNavigate } from 'react-router-dom'
import styles from './TrophyShelf.module.css'

export default function TrophyShelf({ playerName, trophies, trophyAssignments }) {
  const navigate = useNavigate()
  const normalizedPlayerName = playerName.trim().toLowerCase()

  const playerTrophies = []
  Object.entries(trophies).forEach(([awardName, imgSrc]) => {
    const assignedPlayers = trophyAssignments[awardName] || []
    const normalizedPlayers = assignedPlayers.map(p => p.trim().toLowerCase())
    if (normalizedPlayers.includes(normalizedPlayerName)) {
      playerTrophies.push({ awardName, imgSrc, assignedPlayers })
    }
  })

  if (playerTrophies.length === 0) return null

  return (
    <div className={styles.section}>
      <h2 className={styles.heading}>Trophy Board</h2>
      <div className={styles.shelfContainer}>
        <div className={styles.shelf}>
          {playerTrophies.map(({ awardName, imgSrc, assignedPlayers }) => {
            const MAX_VISIBLE = 5
            const visiblePlayers = assignedPlayers.slice(0, MAX_VISIBLE).join(', ')
            const remainingCount = assignedPlayers.length - MAX_VISIBLE
            const tooltipText = remainingCount > 0
              ? `${visiblePlayers} +${remainingCount} more`
              : assignedPlayers.join(', ')

            return (
              <div key={awardName} className={styles.trophyWrapper}>
                <img
                  src={imgSrc}
                  alt={awardName}
                  className={styles.trophyItem}
                  onClick={() => navigate(`/trophy/${encodeURIComponent(awardName.toLowerCase())}`)}
                />
                <div className={styles.tooltip}>
                  <strong>{awardName}</strong><br />
                  Winners: {tooltipText}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
