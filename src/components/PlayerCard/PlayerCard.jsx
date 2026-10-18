import { memo } from 'react'
import { Link } from 'react-router-dom'
import ShinyItem from '../ShinyItem/ShinyItem'
import { getAssetUrl } from '../../utils/assets'
import { getPlayerRole, getRoleStyle } from '../../config/playerRoles'
import styles from './PlayerCard.module.css'

function PlayerCard({ player, data, rank, streamers, mobileInteractive = false, linkState, showPoints = false, isInactivePlayer = false }) {
  const playerClass =
    rank < 5
      ? styles.topPlayer
      : rank < 20
        ? styles.highPlayer
        : ''
  const inactiveClass = isInactivePlayer ? styles.inactivePlayer : ''

  const medal =
    rank === 0 ? '\uD83E\uDD47' : // 🥇 gold
    rank === 1 ? '\uD83E\uDD48' : // 🥈 silver
    rank === 2 ? '\uD83E\uDD49' : // 🥉 bronze
    null

  const sparkle = rank >= 3
  const role = getPlayerRole(player)

  return (
    <div
      className={`${styles.card} ${role ? styles.roleBorder : ''}`}
      style={getRoleStyle(role)}
      data-role={role?.name}
    >
      {role?.banner && <div className={styles.roleBanner}>{role.banner}</div>}
      <div className={styles.nameContainer}>
        <Link
          to={`/player/${player}/`}
          className={`${styles.playerName} ${playerClass} ${inactiveClass}`}
          data-player={player}
          state={linkState}
          title={isInactivePlayer ? 'No longer in the team shiny showcase database' : undefined}
        >
          #{rank + 1} {player} ({showPoints && typeof data.points === 'number' ? `${data.points} pts` : data.shiny_count})
        </Link>
        {role && (
          <span className={styles.roleBadge} style={getRoleStyle(role)} aria-label={`Role: ${role.name}`} tabIndex={0}>
            {role.icon}
            <span className={styles.roleTooltip} role="tooltip">{role.name}</span>
          </span>
        )}
        {medal && <span className={styles.medal}>{medal}</span>}
        {sparkle && <span className={styles.sparkle}>&#10024;</span>}
      </div>
      <div className={styles.shinyList}>
        {Object.entries(data.shinies).map(([id, s]) => (
          <ShinyItem
            key={id}
            shiny={s}
            userName={player}
            localizeDates={false}
            mobileInteractive={mobileInteractive}
            highlightPreviousMonth={role?.name === 'Shiny Hunter of the Month!'}
          />
        ))}
      </div>
    </div>
  )
}

export default memo(PlayerCard)
