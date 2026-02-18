import { memo } from 'react'
import { Link } from 'react-router-dom'
import ShinyItem from '../ShinyItem/ShinyItem'
import { getAssetUrl } from '../../utils/assets'
import styles from './PlayerCard.module.css'

function PlayerCard({ player, data, rank, streamers, mobileInteractive = false }) {
  const playerClass =
    rank < 5
      ? styles.topPlayer
      : rank < 20
        ? styles.highPlayer
        : ''

  const medal =
    rank === 0 ? '\uD83E\uDD47' : // 🥇 gold
    rank === 1 ? '\uD83E\uDD48' : // 🥈 silver
    rank === 2 ? '\uD83E\uDD49' : // 🥉 bronze
    null

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
            <img
              src={getAssetUrl('images/twitch.png')}
              alt="Twitch"
              className={styles.twitchIcon}
              width="24"
              height="24"
            />
          </a>
        )}
        <Link
          to={`/player/${player.toLowerCase()}/`}
          className={`${styles.playerName} ${playerClass}`}
          data-player={player.toLowerCase()}
        >
          #{rank + 1} {player} ({data.shiny_count})
        </Link>
        {medal && <span className={styles.medal}>{medal}</span>}
        {sparkle && <span className={styles.sparkle}>&#10024;</span>}
      </div>
      <div className={styles.shinyList}>
        {Object.entries(data.shinies).map(([id, s]) => (
          <ShinyItem key={id} shiny={s} userName={player} localizeDates={false} mobileInteractive={mobileInteractive} />
        ))}
      </div>
    </div>
  )
}

export default memo(PlayerCard)
