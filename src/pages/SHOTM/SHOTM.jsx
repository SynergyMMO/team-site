import { useState, useMemo, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useDatabase } from '../../hooks/useDatabase'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import { useTierData } from '../../hooks/useTierData'
import { useTieredShinies } from '../../hooks/useTieredShinies'
import { useStreamers } from '../../hooks/useStreamers'
import PlayerCard from '../../components/PlayerCard/PlayerCard'
import { getAssetUrl } from '../../utils/assets'
import { TRAIT_POINTS, calculateShinyPoints } from '../../utils/points'
import shotmHistory from '../../data/shotm_history.json'
import styles from './SHOTM.module.css'

const ENGLISH_MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]

function getMonthIndex(month) {
  return ENGLISH_MONTHS.indexOf(String(month || '').toLowerCase())
}

function shiftMonth(month, year, delta) {
  const monthIndex = getMonthIndex(month)
  if (monthIndex < 0) {
    return {
      month,
      year,
    }
  }
  const date = new Date(year, monthIndex, 1)
  date.setMonth(date.getMonth() + delta)
  return {
    month: ENGLISH_MONTHS[date.getMonth()],
    year: date.getFullYear(),
  }
}

function isCurrentMonth(month, year) {
  const now = new Date()
  const monthIndex = getMonthIndex(month)
  return (
    monthIndex === now.getMonth() &&
    String(now.getFullYear()) === String(year)
  )
}

function getMonthKey(month, year) {
  const monthIndex = getMonthIndex(month)
  if (monthIndex < 0) return null
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`
}

function monthKeyToSelection(monthKey) {
  const [year, monthNumber] = monthKey.split('-').map(Number)
  const monthIndex = monthNumber - 1
  return {
    month: ENGLISH_MONTHS[monthIndex],
    year,
  }
}

function normalizeShiniesForCard(shinies) {
  if (!shinies) return {}
  return Array.isArray(shinies) ? Object.fromEntries(shinies) : shinies
}

export default function SHOTM() {
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Shiny Hunters of the Month', url: '/shotm' }
  ];

  useDocumentHead({
    title: 'Shiny Hunters of the Month - PokeMMO Rankings | Team Synergy',
    description: 'Monthly rankings of top shiny hunters in PokeMMO. Track highest catches, tier points, and all-time stats for Team Synergy members. Competitive shiny hunting leaderboard.',
    canonicalPath: '/shotm/',
    breadcrumbs: breadcrumbs
  })

  const now = new Date()
  const [currentMonth, setCurrentMonth] = useState(
    ENGLISH_MONTHS[now.getMonth()]
  )
  const [currentYear, setCurrentYear] = useState(now.getFullYear())
  const [showPoints, setShowPoints] = useState(false)
  const [showTiers, setShowTiers] = useState(false)
  const [closingPoints, setClosingPoints] = useState(false)
  const [closingTiers, setClosingTiers] = useState(false)

  const { data: streamersData } = useStreamers()
  const { data, isLoading } = useDatabase()
  const { tierPoints, tierLookup } = useTierData()
  const selectedMonthKey = getMonthKey(currentMonth, currentYear)
  const currentMonthDisplay = useMemo(
    () => new Date(currentYear, getMonthIndex(currentMonth), 1).toLocaleString(undefined, { month: 'long' }),
    [currentMonth, currentYear]
  )
  const pausedMonthKeys = useMemo(
    () => new Set(shotmHistory.pausedMonths || []),
    []
  )
  const selectedIsCurrent = isCurrentMonth(currentMonth, currentYear)
  const selectedIsPaused = pausedMonthKeys.has(selectedMonthKey)
  const selectedHistory = (!selectedIsCurrent || selectedIsPaused)
    ? shotmHistory.months?.[selectedMonthKey]
    : null
  // Only include months from January 2026 onward
  const MIN_MONTH_KEY = '2026-01';
  const historyMonthKeys = useMemo(
    () =>
      Object.keys(shotmHistory.months || {})
        .filter((key) => key >= MIN_MONTH_KEY)
        .sort(),
    []
  )
  // Prevent navigating before January 2026
  const previousMonthKey = useMemo(
    () => {
      const prev = historyMonthKeys.filter((key) => key < selectedMonthKey).at(-1) || null;
      if (prev && prev < MIN_MONTH_KEY) return null;
      return prev;
    },
    [historyMonthKeys, selectedMonthKey]
  )
  const nextMonthKey = useMemo(
    () => historyMonthKeys.find((key) => key > selectedMonthKey) || null,
    [historyMonthKeys, selectedMonthKey]
  )
  const currentShowcasePlayers = useMemo(
    () => new Set(Object.keys(data || {}).map((player) => player.toLowerCase())),
    [data]
  )

    // Helper to get streamer info by player name
  // Filter SHOTM data for current month
  const shotmData = useMemo(() => {
    if (selectedHistory) return selectedHistory.players || {}
    if (!selectedIsCurrent || selectedIsPaused) return {}
    if (!data) return {}
    const result = {}
    Object.entries(data).forEach(([player, playerData]) => {
      const monthShinies = Object.entries(playerData.shinies).filter(([, s]) => {
        const m = s.Month?.toLowerCase()?.trim()
        const y = String(s.Year || '').trim()
        return m === currentMonth && y === String(currentYear)
      })
      if (!monthShinies.length) return
      const totalPoints = monthShinies.reduce(
        (acc, [, s]) => acc + calculateShinyPoints(s, tierPoints, tierLookup),
        0
      )
      result[player] = { shinies: monthShinies, points: totalPoints }
    })
    return result
  }, [data, currentMonth, currentYear, tierPoints, tierLookup, selectedHistory, selectedIsCurrent, selectedIsPaused])

  const rankings = useMemo(
    () => {
      if (selectedHistory?.rankings) {
        return selectedHistory.rankings
          .map(({ player }) => [player, shotmData[player]])
          .filter(([, info]) => info)
      }

      return Object.entries(shotmData).sort((a, b) => b[1].points - a[1].points)
    },
    [shotmData, selectedHistory]
  )

  const tieredHighlights = useTieredShinies(shotmData, tierLookup, {
  onlyCurrentMonth: true, 
  tiersToInclude: ['Tier 3', 'Tier 2', 'Tier 1', 'Tier 0'],
  includeAlpha: true,
  selectedMonth: currentMonth,
  selectedYear: currentYear,
})

  // Previous ranks from localStorage
  const previousRanksRef = useRef({})
  useEffect(() => {
    const monthKey = `shotm-ranks-${currentMonth}-${currentYear}`
    const saved = localStorage.getItem(monthKey)
    if (saved) {
      try { previousRanksRef.current = JSON.parse(saved) } catch { previousRanksRef.current = {} }
    } else {
      previousRanksRef.current = {}
    }
  }, [currentMonth, currentYear])

  useEffect(() => {
    if (!rankings.length) return
    const currentRanks = {}
    rankings.forEach(([player], i) => { currentRanks[player] = i + 1 })
    localStorage.setItem(`shotm-ranks-${currentMonth}-${currentYear}`, JSON.stringify(currentRanks))
  }, [rankings, currentMonth, currentYear])

  const previousRanks = previousRanksRef.current

  const goPrev = () => {
    if (!previousMonthKey) return;
    // Prevent navigation before January 2026
    if (previousMonthKey < MIN_MONTH_KEY) return;
    const p = monthKeyToSelection(previousMonthKey);
    setCurrentMonth(p.month);
    setCurrentYear(p.year);
  }
  const goNext = () => {
    const n = nextMonthKey ? monthKeyToSelection(nextMonthKey) : shiftMonth(currentMonth, currentYear, 1)
    setCurrentMonth(n.month)
    setCurrentYear(n.year)
  }

  const hasPrevData = Boolean(previousMonthKey)

  // If current selection is before January 2026, show nothing
  if (getMonthKey(currentMonth, currentYear) < MIN_MONTH_KEY) {
    return <div className="message">No data available before January 2026.</div>;
  }
  if (selectedIsCurrent && !selectedIsPaused && isLoading) return <div className="message">Loading...</div>

  return (
    <div>
      <h1>Team Synergy SHOTM <Link to="/admin" className="invisible-link">!</Link></h1>
      <img src={getAssetUrl('images/pagebreak.png')} alt="Page Break" className="pagebreak" />

      {/* Collapsible sections */}
      <div className={styles.alltimeContainer}>
        {/* Points Info */}
        <button className={styles.toggleBtn} onClick={() => {
          if (showPoints) { setClosingPoints(true); setTimeout(() => { setShowPoints(false); setClosingPoints(false) }, 300) }
          else { setShowPoints(true) }
        }}>
          How Points are Calculated {showPoints ? '\u25B2' : '\u25BC'}
        </button>
        {(showPoints || closingPoints) && (
          <div className={`${styles.pointsContent} ${closingPoints ? styles.slideUp : ''}`}>
            {Object.entries(tierPoints).map(([tier, pts]) => <div key={tier}>{tier}: {pts}</div>)}
            {Object.entries(TRAIT_POINTS).map(([trait, pts]) => <div key={trait}>{trait}: {pts}</div>)}
          </div>
        )}

        {/* Tier Highlights - button always visible */}
        <>
          <button
            className={styles.tierToggleBtn}
            onClick={() => {
              if (showTiers) {
                setClosingTiers(true)
                setTimeout(() => { setShowTiers(false); setClosingTiers(false) }, 300)
              } else {
                setShowTiers(true)
              }
            }}
          >
            ✨ Tier 3+ Shiny Highlights ✨ {showTiers ? '\u25B2' : '\u25BC'}
          </button>


          {(showTiers || closingTiers) && Object.keys(tieredHighlights).length > 0 && (
            <div className={`${styles.tierColumns} ${closingTiers ? styles.slideUp : ''}`}>
              {['Tier 3', 'Tier 2', 'Tier 1', 'Tier 0', 'Alpha']
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
                            {players.map(p => {
                              const canonical = Object.keys(data || {}).find(k => k.toLowerCase() === p.toLowerCase()) || p;
                              return (
                                <Link key={canonical} to={`/player/${canonical}/`} className={styles.playerLink} data-player={canonical}>
                                  {canonical}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                  </div>
                ))}
            </div>
          )}
        </>
      </div>

      {/* Month navigation and rankings */}
      <div className={styles.shotmPage}>
        <h1>Shiny Hunters of the Month</h1>
        <div className={styles.monthNav}>
          <h2 className={styles.monthTitle}>
            {currentMonthDisplay} {currentYear}
          </h2>
          <div className={styles.monthButtons}>
            {hasPrevData && <button onClick={goPrev} className={styles.monthBtn}>&#9664; Previous</button>}
            {!selectedIsCurrent && <button onClick={goNext} className={styles.monthBtn}>Next &#9654;</button>}
          </div>
        </div>

        <div className={styles.shotmList}>
          {rankings.map(([player, info], index) => {
            const isInactivePlayer = Boolean(
              selectedHistory &&
              data &&
              !currentShowcasePlayers.has(player.toLowerCase())
            )
            const playerData = {
              ...info,
              points: info.points, // ensure points is present
              shinies: normalizeShiniesForCard(info.shinies),
            }
            return (
              <PlayerCard
                key={player}
                player={player}
                data={playerData}
                rank={index}
                streamers={streamersData && {
                  ...Object.fromEntries([
                    ...streamersData.live.map(s => [s.pokeName?.toLowerCase(), s]),
                    ...streamersData.offline.map(s => [s.pokeName?.toLowerCase(), s]),
                  ])
                }}
                mobileInteractive={true}
                linkState={{ from: 'shotm' }}
                showPoints
                isInactivePlayer={isInactivePlayer}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

