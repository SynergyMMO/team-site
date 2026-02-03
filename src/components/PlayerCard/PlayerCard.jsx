import { memo } from 'react'
import { Link } from 'react-router-dom'
import ShinyItem from '../ShinyItem/ShinyItem'
import styles from './PlayerCard.module.css'

function PlayerCard({ player, data, rank, streamers }) {
  const playerClass =
    rank < 5
      ? styles.topPlayer
      : rank < 20
        ? styles.highPlayer
        : ''

  const trophyImg =
    rank === 0
      ? '/images/Shiny Showcase/gold.png'
      : rank === 1
        ? '/images/Shiny Showcase/silver.png'
        : rank === 2
          ? '/images/Shiny Showcase/bronze.png'
          : null

  const sparkle = rank >= 3

  const twitchUser = streamers?.[player]?.twitch_username

  return (
    <div className={styles.card}>
      <div className={styles.nameContainer}>
        {twitchUser && (
          <a
            href={`https://www.twitch.tv/${twitchUser}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.twitchLink}
          >
            <img src="/images/twitch.png" alt="Twitch" className={styles.twitchIcon} />
          </a>
        )}
        <Link
          to={`/player/${player.toLowerCase()}`}
          className={`${styles.playerName} ${playerClass}`}
          data-player={player.toLowerCase()}
        >
          #{rank + 1} {player} ({data.shiny_count})
          {sparkle && <span className={styles.sparkle}>&#10024;</span>}
        </Link>
        {trophyImg && (
          <img src={trophyImg} alt="trophy" className={styles.playerTrophy} />
        )}
      </div>
      <div className={styles.shinyList}>
        {Object.values(data.shinies).map((s, i) => (
          <ShinyItem key={i} shiny={s} />
        ))}
      </div>
    </div>
  )
}

export default memo(PlayerCard)
