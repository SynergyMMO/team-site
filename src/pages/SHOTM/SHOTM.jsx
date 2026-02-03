import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDatabase } from '../../hooks/useDatabase'
import { useTierData } from '../../hooks/useTierData'
import ShinyItem from '../../components/ShinyItem/ShinyItem'
import { getAssetUrl } from '../../utils/assets'
import styles from './SHOTM.module.css'

const TRAIT_POINTS = {
  Alpha: 50,
  'Secret Shiny': 10,
  Egg: 5,
  Safari: 5,
  Event: 5,
  'Honey Tree': 5,
}

function shiftMonth(month, year, delta) {
  const date = new Date(`${month} 1, ${year}`)
  date.setMonth(date.getMonth() + delta)
  return {
    month: date.toLocaleString('default', { month: 'long' }).toLowerCase(),
    year: date.getFullYear(),
  }
}

function isCurrentMonth(month, year) {
  const now = new Date()
  return (
    now.toLocaleString('default', { month: 'long' }).toLowerCase() === month &&
    String(now.getFullYear()) === String(year)
  )
}

export default function SHOTM() {
  const now = new Date()
  const [currentMonth, setCurrentMonth] = useState(
    now.toLocaleString('default', { month: 'long' }).toLowerCase()
  )
  const [currentYear, setCurrentYear] = useState(now.getFullYear())
  const [showAllTime, setShowAllTime] = useState(false)
  const [showPoints, setShowPoints] = useState(false)
  const [showTiers, setShowTiers] = useState(false)
  const [closingAllTime, setClosingAllTime] = useState(false)
  const [closingPoints, setClosingPoints] = useState(false)
  const [closingTiers, setClosingTiers] = useState(false)

  const { data, isLoading } = useDatabase()
  const { tierPoints, tierLookup } = useTierData()

  const calculateShinyPoints = (shiny) => {
    if (shiny.Sold?.toLowerCase() === 'yes' || shiny.Flee?.toLowerCase() === 'yes')
      return 0
    let total = tierPoints[tierLookup[shiny.Pokemon.toLowerCase()]] || 0
    total += Object.entries(TRAIT_POINTS).reduce(
      (acc, [trait, pts]) => acc + (shiny[trait]?.toLowerCase() === 'yes' ? pts : 0),
      0
    )
    return total
  }

  const shotmData = useMemo(() => {
    if (!data) return {}
    const result = {}
    Object.entries(data).forEach(([player, playerData]) => {
      const monthShinies = Object.values(playerData.shinies).filter(s => {
        const m = s.Month?.toLowerCase()?.trim()
        const y = String(s.Year || '').trim()
        return m === currentMonth && y === String(currentYear)
      })
      if (!monthShinies.length) return
      const totalPoints = monthShinies.reduce((acc, s) => acc + calculateShinyPoints(s), 0)
      result[player] = { shinies: monthShinies, points: totalPoints }
    })
    return result
  }, [data, currentMonth, currentYear, tierPoints, tierLookup])

  const rankings = useMemo(
    () =>
      Object.entries(shotmData)
        .sort((a, b) => b[1].points - a[1].points),
    [shotmData]
  )

  const allTimeLeaderboard = useMemo(() => {
    if (!data) return []
    const allTime = {}
    Object.entries(data).forEach(([player, playerData]) => {
      allTime[player] = Object.values(playerData.shinies).reduce(
        (acc, s) => acc + calculateShinyPoints(s),
        0
      )
    })
    return Object.entries(allTime)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([player, points], i) => ({ rank: i + 1, player, points }))
  }, [data, tierPoints, tierLookup])

  const tieredHighlights = useMemo(() => {
    const tiers = {}
    Object.entries(shotmData).forEach(([player, info]) => {
      info.shinies.forEach(s => {
        if (s.Sold?.toLowerCase() === 'yes' || s.Flee?.toLowerCase() === 'yes') return
        const tier = tierLookup[s.Pokemon.toLowerCase()]
        if (!tier || !['Tier 3', 'Tier 2', 'Tier 1', 'Tier 0'].includes(tier)) return
        const pokemonName = s.Pokemon.charAt(0).toUpperCase() + s.Pokemon.slice(1).toLowerCase()
        if (!tiers[tier]) tiers[tier] = {}
        if (!tiers[tier][pokemonName]) tiers[tier][pokemonName] = new Set()
        tiers[tier][pokemonName].add(player)
      })
    })
    Object.keys(tiers).forEach(t => {
      Object.keys(tiers[t]).forEach(p => {
        tiers[t][p] = [...tiers[t][p]].sort()
      })
    })
    return tiers
  }, [shotmData, tierLookup])

  const hasMonthData = (m, y) => {
    if (!data) return false
    return Object.values(data).some(player =>
      Object.values(player.shinies || {}).some(
        s => s.Month?.toLowerCase()?.trim() === m && String(s.Year || '').trim() === String(y)
      )
    )
  }

  // Previous ranks from localStorage
  const [previousRanks, setPreviousRanks] = useState({})
  useEffect(() => {
    const key = `shotm-ranks-${currentMonth}-${currentYear}`
    const saved = localStorage.getItem(key)
    if (saved) {
      try { setPreviousRanks(JSON.parse(saved)) } catch { setPreviousRanks({}) }
    } else {
      setPreviousRanks({})
    }
  }, [currentMonth, currentYear])

  useEffect(() => {
    if (rankings.length === 0) return
    const currentRanks = {}
    rankings.forEach(([player], i) => { currentRanks[player] = i + 1 })
    localStorage.setItem(
      `shotm-ranks-${currentMonth}-${currentYear}`,
      JSON.stringify(currentRanks)
    )
  }, [rankings, currentMonth, currentYear])

  const goPrev = () => {
    const p = shiftMonth(currentMonth, currentYear, -1)
    setCurrentMonth(p.month)
    setCurrentYear(p.year)
  }
  const goNext = () => {
    const n = shiftMonth(currentMonth, currentYear, 1)
    setCurrentMonth(n.month)
    setCurrentYear(n.year)
  }

  const prev = shiftMonth(currentMonth, currentYear, -1)
  const hasPrevData = hasMonthData(prev.month, prev.year)
  const isCurrent = isCurrentMonth(currentMonth, currentYear)
  const hasTierData = Object.keys(tieredHighlights).length > 0

  if (isLoading) return <div className="message">Loading...</div>

  return (
    <div>
      <h1>
        Team Synergy SHOTM
        <Link to="/admin" className="invisible-link">!</Link>
      </h1>
      <img src={getAssetUrl('images/pagebreak.png')} alt="Page Break" className="pagebreak" />

      {/* Collapsible sections */}
      <div className={styles.alltimeContainer}>
        <button className={styles.toggleBtn} onClick={() => {
          if (showAllTime) {
            setClosingAllTime(true)
            setTimeout(() => {
              setShowAllTime(false)
              setClosingAllTime(false)
            }, 300)
          } else {
            setShowAllTime(true)
          }
        }}>
          All-Time Leaderboard {showAllTime ? '\u25B2' : '\u25BC'}
        </button>
        {(showAllTime || closingAllTime) && (
          <div className={`${styles.alltimeList} ${closingAllTime ? styles.slideUp : ''}`}>
            {allTimeLeaderboard.map(e => {
              const medal = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'][e.rank - 1] || ''
              return (
                <div key={e.player}>
                  {medal && <span className={styles.medal}>{medal}</span>}
                  <span>#{e.rank}</span>
                  <Link to={`/player/${e.player.toLowerCase()}`} className={styles.playerLink}>
                    {e.player}
                  </Link>
                  <span>({e.points} pts)</span>
                </div>
              )
            })}
          </div>
        )}

        <button className={styles.toggleBtn} onClick={() => {
          if (showPoints) {
            setClosingPoints(true)
            setTimeout(() => {
              setShowPoints(false)
              setClosingPoints(false)
            }, 300)
          } else {
            setShowPoints(true)
          }
        }}>
          How Points are Calculated {showPoints ? '\u25B2' : '\u25BC'}
        </button>
        {(showPoints || closingPoints) && (
          <div className={`${styles.pointsContent} ${closingPoints ? styles.slideUp : ''}`}>
            {Object.entries(tierPoints).map(([tier, pts]) => (
              <div key={tier}>{tier}: {pts}</div>
            ))}
            {Object.entries(TRAIT_POINTS).map(([trait, pts]) => (
              <div key={trait}>{trait}: {pts}</div>
            ))}
          </div>
        )}

        {hasTierData && (
          <>
            <button className={styles.tierToggleBtn} onClick={() => {
              if (showTiers) {
                setClosingTiers(true)
                setTimeout(() => {
                  setShowTiers(false)
                  setClosingTiers(false)
                }, 300)
              } else {
                setShowTiers(true)
              }
            }}>
              ✨ Tier 3+ Shiny Highlights ✨ {showTiers ? '\u25B2' : '\u25BC'}
            </button>
            {(showTiers || closingTiers) && (
              <div className={`${styles.tierColumns} ${closingTiers ? styles.slideUp : ''}`}>
                {['Tier 3', 'Tier 2', 'Tier 1', 'Tier 0']
                  .filter(t => tieredHighlights[t])
                  .map(tier => (
                    <div key={tier} className={styles.tierColumn}>
                      <h3>{tier}</h3>
                      {Object.entries(tieredHighlights[tier])
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([pokemon, players]) => (
                          <div key={pokemon} className={styles.tierPokemon}>
                            <div className={styles.pokemonName}>{pokemon}</div>
                            <div className={styles.pokemonHunters}>
                              {players.map(p => (
                                <Link key={p} to={`/player/${p.toLowerCase()}`} className={styles.playerLink}>
                                  {p}
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Month navigation */}
      <div className={styles.shotmPage}>
        <h1>Shiny Hunters of the Month</h1>
        <div className={styles.monthNav}>
          <h2 className={styles.monthTitle}>
            {currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1)} {currentYear}
          </h2>
          <div className={styles.monthButtons}>
            {hasPrevData && (
              <button onClick={goPrev} className={styles.monthBtn}>&#9664; Previous</button>
            )}
            {!isCurrent && (
              <button onClick={goNext} className={styles.monthBtn}>Next &#9654;</button>
            )}
          </div>
        </div>

        {/* Rankings */}
        <div className={styles.shotmList}>
          {rankings.map(([player, info], index) => {
            const trophy = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'][index] || ''
            const prevRank = previousRanks[player]
            const currentRank = index + 1
            let arrow = null
            if (prevRank !== undefined && prevRank !== currentRank) {
              const isUp = currentRank < prevRank
              arrow = (
                <img
                  src={isUp ? getAssetUrl('images/up_arrow.png') : getAssetUrl('images/down_arrow.png')}
                  alt={isUp ? 'Moved Up' : 'Moved Down'}
                  className={`${styles.rankArrow} ${isUp ? styles.rankArrowUp : styles.rankArrowDown}`}
                />
              )
            }

            return (
              <div key={player} className={styles.playerCard}>
                <h2 className={styles.playerName}>
                  {trophy}{' '}
                  <Link to={`/player/${player.toLowerCase()}`} className={styles.playerLink}>
                    {player}
                  </Link>{' '}
                  ({info.points} pts) {arrow}
                </h2>
                <div className={styles.shinyList}>
                  {info.shinies.map((s, i) => {
                    const pts = calculateShinyPoints(s)
                    return pts > 0 ? <ShinyItem key={i} shiny={s} points={pts} /> : null
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
