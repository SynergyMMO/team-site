import { useMemo, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import { useDatabase } from '../../hooks/useDatabase'
import { getLocalPokemonGif, onGifError } from '../../utils/pokemon'
import { getAssetUrl } from '../../utils/assets'
import warData from '../../data/shinywar2025.json'
import styles from './ShinyWar2025.module.css'

const TIER_POINTS = { 0: 30, 1: 25, 2: 15, 3: 10, 4: 6, 5: 3, 6: 2 }

function getPoints(c) {
  const base = TIER_POINTS[c.t] ?? 0
  if (c.f === 'h') return Math.max(20, base)
  if (c.f === 's') return base + 10
  return base
}

const TIER_COLORS = {
  0: '#ffd700',
  1: '#c084fc',
  2: '#60a5fa',
  3: '#4ade80',
  4: '#2dd4bf',
  5: '#fb923c',
  6: '#94a3b8',
  7: '#cbd5e1',
}

const BASE = import.meta.env.BASE_URL || '/'

export default function ShinyWar2025() {
  useDocumentHead({
    title: 'Shiny War 2025',
    description: 'Team Synergy\'s Shiny War 2025 results. See every shiny Pokemon caught during the war with tier breakdowns and point totals.',
    canonicalPath: '/shiny-war-2025',
  })

  const { data: dbData } = useDatabase()

  const teamMembers = useMemo(() => {
    if (!dbData) return new Set()
    return new Set(Object.keys(dbData).map(n => n.toLowerCase()))
  }, [dbData])

  const players = useMemo(() => {
    const grouped = {}
    for (const c of warData.catches) {
      if (!grouped[c.ot]) grouped[c.ot] = []
      grouped[c.ot].push(c)
    }
    return Object.entries(grouped)
      .map(([name, catches]) => ({
        name,
        catches,
        totalPoints: catches.reduce((sum, c) => sum + getPoints(c), 0),
        count: catches.length,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
  }, [])

  const location = useLocation()

  useEffect(() => {
    const hash = decodeURIComponent(location.hash.replace('#', ''))
    if (!hash) return
    // Delay to let DOM render and scroll complete
    const delay = setTimeout(() => {
      const el = document.getElementById(`war-player-${hash.toLowerCase()}`)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Add highlight after scroll has time to finish
      setTimeout(() => {
        el.classList.add(styles.highlight)
        setTimeout(() => el.classList.remove(styles.highlight), 3000)
      }, 500)
    }, 100)
    return () => clearTimeout(delay)
  }, [location.hash, players])

  return (
    <div>
      <h1>Shiny War 2025</h1>
      <img src={getAssetUrl('images/pagebreak.png')} alt="" className="pagebreak" />

      <div className={styles.teamHeader}>
        <h2>
          <a href="https://pokemmo.com/en/shiny_wars/teams/1789472954870489088/" target="_blank" rel="noopener noreferrer" className={styles.teamLink}>
            #25 Team {warData.team}
          </a>
        </h2>
        <div className={styles.teamStatsStack}>
          <span className={styles.teamPoints}>{warData.points} Points</span>
          <span className={styles.teamCount}>{warData.catches.length} Shinies</span>
        </div>
      </div>

      <div className={styles.playerList}>
        {players.map((player, index) => {
          const isOnTeam = teamMembers.has(player.name.toLowerCase())
          const playerClass = index < 5 ? styles.topPlayer : index < 20 ? styles.highPlayer : ''
          const medal = index === 0 ? '\uD83E\uDD47' : index === 1 ? '\uD83E\uDD48' : index === 2 ? '\uD83E\uDD49' : null
          return (
          <div key={player.name} id={`war-player-${player.name.toLowerCase()}`} className={styles.playerCard}>
            <div className={styles.nameContainer}>
              {isOnTeam ? (
                <Link
                  to={`/player/${player.name.toLowerCase()}`}
                  state={{ from: 'shiny-war' }}
                  className={`${styles.playerName} ${playerClass}`}
                >
                  #{index + 1} {player.name} ({player.count})
                </Link>
              ) : (
                <span className={`${styles.playerName} ${playerClass}`}>
                  #{index + 1} {player.name} ({player.count})
                </span>
              )}
              {medal && <span className={styles.medal}>{medal}</span>}
              {!medal && <span className={styles.sparkle}>&#10024;</span>}
            </div>
            <div className={styles.playerStats}>{player.totalPoints} pts</div>
            <div className={styles.pokemonGrid}>
              {player.catches.map((c, i) => (
                <div
                  key={`${c.p}-${i}`}
                  className={`${styles.pokemonCard} ${c.f === 's' ? styles.secretGlow : ''}`}
                  style={{ '--tier-color': TIER_COLORS[c.t] ?? '#94a3b8' }}
                >
                  <span className={styles.tierBadge}>T{c.t}</span>
                  {c.f === 'h' && (
                    <img
                      src={`${BASE}images/Shiny Showcase/egg.png`}
                      className={styles.eggIcon}
                      alt="Hatched"
                      width="20"
                      height="20"
                    />
                  )}
                  {c.f === 's' && (
                    <img
                      src={`${BASE}images/Shiny Showcase/secretshiny.png`}
                      className={styles.secretIcon}
                      alt="Secret Shiny"
                      width="20"
                      height="20"
                    />
                  )}
                  <img
                    src={getLocalPokemonGif(c.p)}
                    alt={c.p}
                    className={styles.pokemonGif}
                    width="80"
                    height="80"
                    loading="lazy"
                    onError={onGifError(c.p)}
                  />
                  <div className={styles.pokemonInfo}>
                    <span className={styles.pokemonName}>{c.p}</span>
                    <span className={styles.pointsBadge}>{getPoints(c)} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )
        })}
      </div>
    </div>
  )
}
