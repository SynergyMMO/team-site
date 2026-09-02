import { useMemo, useState, useCallback } from 'react'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import { getLocalPokemonGif, onGifError } from '../../utils/pokemon'
import { isRarePokemon } from '../../utils/playerStatistics'
import synemaData from '../../data/AbsoluteSynema.json'
import taskForceData from '../../data/SynergyTaskForceShinyWars2026.json'
import synsationalData from '../../data/SynsationalShinyWars2026.json'
import oswEncounterTiers from '../../data/osw-encounter-tiers.json'
import generationData from '../../data/generation.json'
import ShinyItem from '../../components/ShinyItem/ShinyItem'
import styles from './SynergyShinyWars2026.module.css'

function normalizeSpecies(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019']/g, '')
    .replace(/\./g, '')
    .replace(/\s+/g, '-')
}

// osw-encounter-tiers.json only lists pre-evolutions, so map every species in a line to its base form
const BASE_SPECIES_BY_MEMBER = new Map()
Object.values(generationData || {}).forEach((lines) => {
  if (!Array.isArray(lines)) return
  lines.forEach((line) => {
    if (!Array.isArray(line) || !line.length) return
    const base = normalizeSpecies(line[0])
    line.forEach((member) => {
      BASE_SPECIES_BY_MEMBER.set(normalizeSpecies(member), base)
    })
  })
})

const POINTS_BY_SPECIES = new Map()

Object.values(oswEncounterTiers || {}).forEach((tier) => {
  if (!tier || tier.points == null) return

  ;(tier.pokemon || []).forEach((pokemon) => {
    const name =
      typeof pokemon === 'string'
        ? pokemon
        : pokemon?.name || pokemon?.species || pokemon?.pokemon

    if (!name) return

    const normalized = normalizeSpecies(name)

    // Direct species lookup
    POINTS_BY_SPECIES.set(normalized, tier.points)

    // Also give every member of its evolutionary line the same points
    const base = BASE_SPECIES_BY_MEMBER.get(normalized)

    if (base) {
      POINTS_BY_SPECIES.set(base, tier.points)

      Object.entries(
        Object.fromEntries(BASE_SPECIES_BY_MEMBER)
      ).forEach(([member, memberBase]) => {
        if (memberBase === base) {
          POINTS_BY_SPECIES.set(member, tier.points)
        }
      })
    }
  })
})

function getSpeciesPoints(name) {
  const normalized = normalizeSpecies(name)

  // Try the exact species first
  const direct = POINTS_BY_SPECIES.get(normalized)
  if (direct != null) return direct

  // Then try its evolutionary-line base
  const base = BASE_SPECIES_BY_MEMBER.get(normalized)
  if (base) {
    return POINTS_BY_SPECIES.get(base) ?? null
  }

  return null
}

const TABS = [
  { key: 'synema', label: 'Absolute Synema' },
  { key: 'synsational', label: 'Synsational' },
  { key: 'taskforce', label: 'Synergy Task Force' },
]

const POKEMON_SEEN_INITIAL = 50
const POKEMON_SEEN_BATCH = 50
const SHINY_CAUGHT_INITIAL = 30
const SHINY_CAUGHT_BATCH = 30

// Entries can record fled/died encounters — only `caught !== false` entries count as actual catches
function isCaught(h) {
  return h?.caught !== false
}

function sumIvs(ivString) {
  if (!ivString || typeof ivString !== 'string') return 0
  return ivString.split('/').reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0)
}

function formatNumber(n) {
  if (n == null || Number.isNaN(n)) return 'N/A'
  return n.toLocaleString()
}

function formatPlaytime(hours) {
  if (hours == null || Number.isNaN(hours) || hours <= 0) return 'N/A'
  return `${hours.toLocaleString()} hrs`
}

function formatDate(entry) {
  if (!entry) return 'N/A'
  const source = entry.date_readable || entry.date
  const d = new Date(source)
  if (Number.isNaN(d.getTime())) return 'N/A'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// Build the flat list of players once from the raw data
function usePlayers() {
  return useMemo(() => {
    return Object.entries(synemaData).map(([name, p]) => ({
      name,
      playtime: p.playtime || 0,
      totalEncounter: p.total_encounter || 0,
      data: p.data || [],
      history: p.history || [],
    }))
  }, [])
}

function formatDayLabel(dayKey) {
  if (!dayKey) return 'N/A'
  const d = new Date(`${dayKey}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return dayKey
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

// Tracks the best value(s) seen so far, keeping every entry tied for the lead
function createTieTracker(isBetter) {
  let value = null
  let entries = []
  return {
    consider(candidateValue, entry) {
      if (value === null || isBetter(candidateValue, value)) {
        value = candidateValue
        entries = [entry]
      } else if (candidateValue === value) {
        entries.push(entry)
      }
    },
    get value() { return value },
    get entries() { return entries },
  }
}

function formatPlayerStat(tracker, valueFormatter) {
  if (!tracker.entries.length) return null
  const names = tracker.entries.map((e) => e.player).join(' & ')
  return `${names} (${valueFormatter(tracker.value, tracker.entries)})`
}

function formatCatchStat(tracker, valueFormatter) {
  if (!tracker.entries.length) return null
  const names = tracker.entries.map((e) => `${e.player} - ${e.pokemon}`).join(' & ')
  return `${names} (${valueFormatter(tracker.value)})`
}

function formatDayStat(tracker) {
  if (!tracker.entries.length) return null
  const names = tracker.entries.map((e) => `${e.player} (${formatDayLabel(e.day)})`).join(' & ')
  return `${names} - ${formatNumber(tracker.value)} shinies`
}

function useTeamTotals(players) {
  return useMemo(() => {
    if (!players.length) return null

    const totalPlayers = players.length
    let totalPlaytime = 0
    let totalEncounters = 0
    let totalShinies = 0

    // Map to track aggregate team catches per calendar date
    const teamDayCounts = new Map()

    players.forEach((player) => {
      totalPlaytime += player.playtime || 0
      totalEncounters += player.totalEncounter || 0
      
      const caughtHistory = player.history.filter(isCaught)
      totalShinies += caughtHistory.length

      caughtHistory.forEach((h) => {
        const dayKey = (h.date_readable || '').slice(0, 10)
        if (dayKey) {
          teamDayCounts.set(dayKey, (teamDayCounts.get(dayKey) || 0) + 1)
        }
      })
    })

    let maxTeamInOneDay = 0
    let maxTeamDayKey = null
    teamDayCounts.forEach((count, day) => {
      if (count > maxTeamInOneDay) {
        maxTeamInOneDay = count
        maxTeamDayKey = day
      }
    })

    const shinyEncAverage = totalShinies > 0 ? Math.round(totalEncounters / totalShinies) : 0
    const mostInOneDayDisplay = maxTeamInOneDay > 0 
      ? `${formatNumber(maxTeamInOneDay)} (${formatDayLabel(maxTeamDayKey)})`
      : 'N/A'

    return [
      { label: 'Total Playtime', display: formatPlaytime(totalPlaytime) },
      { label: 'Average Playtime', display: formatPlaytime(Math.round(totalPlaytime / totalPlayers)) },
      { label: 'Total Encounters', display: formatNumber(totalEncounters) },
      { label: 'Average Encounters', display: formatNumber(Math.round(totalEncounters / totalPlayers)) },
      { label: 'Total Shinies', display: formatNumber(totalShinies) },
      { label: 'Team Shiny Average', display: (totalShinies / totalPlayers).toFixed(1) },
      { label: 'Shiny Enc Average', display: `1 in ${formatNumber(shinyEncAverage)}` },
      { label: 'Most Pokémon Caught In 1 Day', display: mostInOneDayDisplay },
    ]
  }, [players])
}

function useTeamOverview(players) {
  return useMemo(() => {
    if (!players.length) return null

    const mostShinies = createTieTracker((a, b) => a > b)
    const leastEncounterShiny = createTieTracker((a, b) => a < b)
    const mostHours = createTieTracker((a, b) => a > b)
    const mostDry = createTieTracker((a, b) => a > b)
    const worstOdds = createTieTracker((a, b) => a > b)
    const mostMickey = createTieTracker((a, b) => a < b)
    const highestIv = createTieTracker((a, b) => a > b)
    const lowestIv = createTieTracker((a, b) => a < b)
    const mostRares = createTieTracker((a, b) => a > b)
    const mostInOneDay = createTieTracker((a, b) => a > b)
    const mostEfficient = createTieTracker((a, b) => a > b)
    const warMvp = createTieTracker((a, b) => a > b)

    // First pass to gather metrics and max values for MVP normalization
    let maxHours = 0
    let maxEncounters = 0
    let maxPoints = 0

    const playerMetrics = players.map((player) => {
      const caughtHistory = player.history.filter(isCaught)
      const points = caughtHistory.reduce((sum, h) => sum + (getSpeciesPoints(h.name) || 0), 0)
      const hours = player.playtime || 0
      const encounters = player.totalEncounter || 0

      if (hours > maxHours) maxHours = hours
      if (encounters > maxEncounters) maxEncounters = encounters
      if (points > maxPoints) maxPoints = points

      return {
        player,
        caughtHistory,
        hours,
        encounters,
        points,
      }
    })

    playerMetrics.forEach(({ player, caughtHistory, hours, encounters, points }) => {
      const shinyCount = caughtHistory.length

      mostShinies.consider(shinyCount, { player: player.name })

      if (hours > 0) {
        mostHours.consider(hours, { player: player.name })
        
        // "Most Efficient" = Total Encounters / Total Hours
        const efficiency = encounters / hours
        mostEfficient.consider(efficiency, { player: player.name })
      }

      // "War MVP" = Normalized Score combining Hours, Encounters, and Points
      const normHours = maxHours > 0 ? hours / maxHours : 0
      const normEncounters = maxEncounters > 0 ? encounters / maxEncounters : 0
      const normPoints = maxPoints > 0 ? points / maxPoints : 0
      const mvpScore = normHours + normEncounters + normPoints

      warMvp.consider(mvpScore, {
        player: player.name,
        details: `${formatNumber(points)} pts · ${formatNumber(encounters)} enc · ${formatPlaytime(hours)}`,
      })

      if (shinyCount > 0) {
        const odds = encounters / shinyCount
        worstOdds.consider(odds, { player: player.name })
        mostMickey.consider(odds, { player: player.name })
      }

      let rareCount = 0
      const dayCounts = new Map()
      caughtHistory.forEach((h) => {
        mostDry.consider(h.global_encounter, { player: player.name, pokemon: h.name })

        if (h.global_encounter != null) {
          leastEncounterShiny.consider(h.global_encounter, { player: player.name, pokemon: h.name })
        }

        const ivTotal = sumIvs(h.ivs)
        highestIv.consider(ivTotal, { player: player.name, pokemon: h.name })
        lowestIv.consider(ivTotal, { player: player.name, pokemon: h.name })
        if (h.alpha || isRarePokemon(h.name)) rareCount += 1

        const dayKey = (h.date_readable || '').slice(0, 10)
        if (dayKey) dayCounts.set(dayKey, (dayCounts.get(dayKey) || 0) + 1)
      })
      mostRares.consider(rareCount, { player: player.name })

      let bestDayCount = 0
      let bestDayKey = null
      dayCounts.forEach((count, day) => {
        if (count > bestDayCount) {
          bestDayCount = count
          bestDayKey = day
        }
      })
      if (bestDayCount > 0) {
        mostInOneDay.consider(bestDayCount, { player: player.name, day: bestDayKey })
      }
    })

    return [
      { label: 'War MVP', display: formatPlayerStat(warMvp, (_, entries) => entries[0]?.details || '') },
      { label: 'Highest Enc/Hr Avg', display: formatPlayerStat(mostEfficient, (v) => `${formatNumber(Math.round(v))} enc/hr`) },
      { label: 'Most Shinies Caught In One Day', display: formatDayStat(mostInOneDay) },
      { label: 'Most Mickey', display: formatPlayerStat(mostMickey, (v) => `1 in ${formatNumber(Math.round(v))} avg`) },
      { label: 'Most Shinies Caught', display: formatPlayerStat(mostShinies, (v) => formatNumber(v)) },
      { label: 'Least Encounter Shiny', display: formatCatchStat(leastEncounterShiny, (v) => `${formatNumber(v)} encounters`) },
      { label: 'Most Hours', display: formatPlayerStat(mostHours, (v) => formatPlaytime(v)) },
      { label: 'Most Dry', display: formatCatchStat(mostDry, (v) => `${formatNumber(v)} encounters`) },
      { label: 'Worst Odds', display: formatPlayerStat(worstOdds, (v) => `1 in ${formatNumber(Math.round(v))} avg`) },
      { label: 'Highest IV Shiny', display: formatCatchStat(highestIv, (v) => `${v}/186`) },
      { label: 'Lowest IV Shiny', display: formatCatchStat(lowestIv, (v) => `${v}/186`) },
      { label: 'Most Rares', display: formatPlayerStat(mostRares, (v) => formatNumber(v)) },
    ]
  }, [players])
}

function usePokemonSeen(players) {
  return useMemo(() => {
    const totals = new Map()
    players.forEach((player) => {
      player.data.forEach((entry) => {
        const count = entry.encounter ?? entry.total_encounter ?? 0
        if (!count) return
        const existing = totals.get(entry.name) || 0
        totals.set(entry.name, existing + count)
      })
    })
    return Array.from(totals.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
  }, [players])
}

function useShinyCaught(players) {
  return useMemo(() => {
    const totals = new Map()
    players.forEach((player) => {
      player.history.filter(isCaught).forEach((h) => {
        const existing = totals.get(h.name) || 0
        totals.set(h.name, existing + 1)
      })
    })
    return Array.from(totals.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
  }, [players])
}

function useTimeline(players) {
  return useMemo(() => {
    const entries = []
    players.forEach((player) => {
      player.history.filter(isCaught).forEach((h) => {
        entries.push({ ...h, player: player.name })
      })
    })
    return entries.sort((a, b) => a.date - b.date)
  }, [players])
}

function SectionHeader({ index, title, subtitle }) {
  return (
    <div className={styles.sectionHeader}>
      <span className={styles.sectionIndex}>{index}</span>
      <div className={styles.sectionHeaderText}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {subtitle && <p className={styles.sectionSubtitle}>{subtitle}</p>}
      </div>
    </div>
  )
}

function SubHeading({ children }) {
  return (
    <h3 className={styles.subheading}>
      <span className={styles.subheadingBar} />
      {children}
    </h3>
  )
}

function OverviewGrid({ overview }) {
  if (!overview) return null
  return (
    <div className={styles.overviewGrid}>
      {overview.map((item) => (
        <div key={item.label} className={styles.overviewCard}>
          <span className={styles.overviewLabel}>{item.label}</span>
          <span className={styles.overviewValue}>{item.display || 'N/A'}</span>
        </div>
      ))}
    </div>
  )
}

function TotalTeamPerformance({ totals }) {
  return (
    <div className={styles.totalTeamContainer}>
      <div className={styles.achievementCardsRow}>
        <div className={`${styles.achievementCard} ${styles.achievementCardPoints}`}>
          <span className={styles.achievementLabelPoints}>Total Points</span>
          <span className={styles.achievementValue}>8,932</span>
        </div>

        <div className={`${styles.achievementCard} ${styles.achievementCardPosition}`}>
          <span className={styles.achievementLabelPosition}>Final Position</span>
          <span className={styles.achievementValue}>9th</span>
        </div>
      </div>

      <p className={styles.teamQuote}>"Do not underestimate your enemy"</p>

      <OverviewGrid overview={totals} />
    </div>
  )
}

function PokemonGifTile({ name, subtitle }) {
  return (
    <div className={styles.gifTile}>
      <img
        src={getLocalPokemonGif(name)}
        onError={onGifError(name)}
        alt={name}
        loading="lazy"
        className={styles.gifImage}
      />
      <span className={styles.gifName}>{name}</span>
      {subtitle && <span className={styles.gifSubtitle}>{subtitle}</span>}
    </div>
  )
}

function RevealList({ items, visibleCount, batchSize, onReveal, renderItem, gridClassName }) {
  const hasMore = visibleCount < items.length
  return (
    <>
      <div className={gridClassName}>
        {items.slice(0, visibleCount).map(renderItem)}
      </div>
      {hasMore && (
        <div className={styles.seeMoreWrap}>
          <button className={styles.seeMoreButton} onClick={onReveal}>
            See More ({items.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </>
  )
}

function DetailedShinyCard({ entry }) {
  const ivTotal = sumIvs(entry.ivs)
  const caught = isCaught(entry)
  const points = getSpeciesPoints(entry.name)
  return (
    <div className={`${styles.detailedCard} ${!caught ? styles.detailedCardDied : ''}`}>
      <img
        src={getLocalPokemonGif(entry.name)}
        onError={onGifError(entry.name)}
        alt={entry.name}
        loading="lazy"
        className={`${styles.detailedGif} ${!caught ? styles.diedGif : ''}`}
      />
      <div className={styles.detailedInfo}>
        <span className={styles.detailedName}>
          {entry.name}
          {points != null && <span className={styles.pointsTag}>{points} pts</span>}
          {entry.alpha && <span className={styles.alphaTag}>Alpha</span>}
          {!caught && <span className={styles.diedTag}>Died/Fled</span>}
        </span>
        <span className={styles.detailedStat}>Encounters: {formatNumber(entry.global_encounter)}</span>
        <span className={styles.detailedStat}>IVs: {entry.ivs} ({ivTotal}/186)</span>
        <span className={styles.detailedStat}>{caught ? 'Caught' : 'Lost'}: {formatDate(entry)}</span>
      </div>
    </div>
  )
}

function PlayerPerformanceSection({ players, overview }) {
  const [sortMode, setSortMode] = useState('points')
  const [expanded, setExpanded] = useState(() => new Set())

  const playersWithStats = useMemo(() => {
    return players.map((player) => {
      const caughtHistory = player.history.filter(isCaught)
      const totalPoints = caughtHistory.reduce((sum, h) => sum + (getSpeciesPoints(h.name) || 0), 0)
      return { ...player, caughtCount: caughtHistory.length, totalPoints }
    })
  }, [players])

  const sortedPlayers = useMemo(() => {
    const copy = [...playersWithStats]
    if (sortMode === 'shinies') {
      copy.sort((a, b) => b.caughtCount - a.caughtCount)
    } else if (sortMode === 'points') {
      copy.sort((a, b) => b.totalPoints - a.totalPoints)
    } else {
      copy.sort((a, b) => b.totalEncounter - a.totalEncounter)
    }
    return copy
  }, [playersWithStats, sortMode])

  const toggleExpanded = useCallback((name) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }, [])

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeaderRow}>
        <SectionHeader index="02" title="Player Performance" subtitle="Individual standings and full catch records" />
      </div>

      <SubHeading>Team Highlights</SubHeading>
      <OverviewGrid overview={overview} />
        <div className={styles.sortToggle}>
          <button
            className={`${styles.sortButton} ${sortMode === 'points' ? styles.sortButtonActive : ''}`}
            onClick={() => setSortMode('points')}
          >
            Sort by Total Points
          </button>
          <button
            className={`${styles.sortButton} ${sortMode === 'encounters' ? styles.sortButtonActive : ''}`}
            onClick={() => setSortMode('encounters')}
          >
            Sort by Encounters
          </button>
          <button
            className={`${styles.sortButton} ${sortMode === 'shinies' ? styles.sortButtonActive : ''}`}
            onClick={() => setSortMode('shinies')}
          >
            Sort by Shinies
          </button>
        </div>
      <div className={styles.playerStatList}>
        {sortedPlayers.map((player, index) => {
          const isExpanded = expanded.has(player.name)
          const odds = player.caughtCount ? Math.round(player.totalEncounter / player.caughtCount) : null
          return (
            <div key={player.name} className={`${styles.playerStatRow} ${isExpanded ? styles.playerStatRowOpen : ''}`}>
              <button className={styles.playerStatHeader} onClick={() => toggleExpanded(player.name)}>
                <span className={styles.playerStatRank}>#{index + 1}</span>
                <span className={styles.playerStatName}>{player.name}</span>
                <span className={styles.playerStatMeta}>
                  {formatNumber(player.caughtCount)} shinies · {formatNumber(player.totalEncounter)} encounters
                  {player.playtime > 0 && ` · ${formatPlaytime(player.playtime)}`}
                  {odds && ` · 1 in ${formatNumber(odds)} avg`}
                  {` · ${formatNumber(player.totalPoints)} pts`}
                </span>
                <span className={styles.expandArrow}>{isExpanded ? '\u25B2' : '\u25BC'}</span>
              </button>
              {isExpanded && (
                <div className={styles.detailedGrid}>
                  {player.history.length === 0 && <p className={styles.emptyNote}>No shinies recorded.</p>}
                  {[...player.history]
                    .sort((a, b) => a.date - b.date)
                    .map((entry, i) => (
                      <DetailedShinyCard key={`${entry.date}-${i}`} entry={entry} />
                    ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function AbsoluteSynemaTab() {
  const players = usePlayers()
  const teamTotals = useTeamTotals(players)
  const overview = useTeamOverview(players)
  const pokemonSeen = usePokemonSeen(players)
  const shinyCaught = useShinyCaught(players)
  const timeline = useTimeline(players)

  const [seenVisible, setSeenVisible] = useState(POKEMON_SEEN_INITIAL)
  const [caughtVisible, setCaughtVisible] = useState(SHINY_CAUGHT_INITIAL)

  return (
    <div className={styles.reportPanel}>
      <section className={styles.section}>
        <SectionHeader index="01" title="Team Performance" subtitle="Aggregate totals across every hunter on the roster" />
        <TotalTeamPerformance totals={teamTotals} />

        <SubHeading>Pokémon Seen</SubHeading>
        <RevealList
          items={pokemonSeen}
          visibleCount={seenVisible}
          batchSize={POKEMON_SEEN_BATCH}
          onReveal={() => setSeenVisible((v) => Math.min(v + POKEMON_SEEN_BATCH, pokemonSeen.length))}
          gridClassName={styles.gifGrid}
          renderItem={(item) => (
            <PokemonGifTile key={item.name} name={item.name} subtitle={`${formatNumber(item.total)} seen`} />
          )}
        />

        <SubHeading>Shiny Pokémon Caught</SubHeading>
        <RevealList
          items={shinyCaught}
          visibleCount={caughtVisible}
          batchSize={SHINY_CAUGHT_BATCH}
          onReveal={() => setCaughtVisible((v) => Math.min(v + SHINY_CAUGHT_BATCH, shinyCaught.length))}
          gridClassName={styles.gifGrid}
          renderItem={(item) => (
            <PokemonGifTile key={item.name} name={item.name} subtitle={`${formatNumber(item.total)} caught`} />
          )}
        />

        <SubHeading>Timeline</SubHeading>
        <div className={styles.timeline}>
          {timeline.map((entry, i) => (
            <div key={`${entry.date}-${i}`} className={styles.timelineItem}>
              <span className={styles.timelineDot} />
              <span className={styles.timelineIndex}>#{i + 1}</span>
              <img
                src={getLocalPokemonGif(entry.name)}
                onError={onGifError(entry.name)}
                alt={entry.name}
                loading="lazy"
                className={styles.timelineGif}
              />
              <div className={styles.timelineInfo}>
                <span className={styles.timelineName}>{entry.name}</span>
                <span className={styles.timelinePlayer}>{entry.player}</span>
                <span className={styles.timelineDate}>{formatDate(entry)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.sectionDivider} />

      <PlayerPerformanceSection players={players} overview={overview} />
    </div>
  )
}

// Renders a team roster ordered by total war points, each expandable to show every shiny caught
function RosterWarTab({ teamData, label, position, points }) {
  const [expanded, setExpanded] = useState(() => new Set())

  const players = useMemo(() => {
    return Object.entries(teamData)
      .map(([name, p]) => {
        const shinies = Object.values(p.shinies || {})
        const totalPoints = shinies.reduce((sum, s) => sum + (getSpeciesPoints(s.Pokemon) || 0), 0)
        return { name, shinies, caughtCount: shinies.length, totalPoints }
      })
      .sort((a, b) => b.totalPoints - a.totalPoints || b.caughtCount - a.caughtCount)
  }, [teamData])

  const toggleExpanded = useCallback((name) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }, [])

  return (
    <div className={styles.reportPanel}>
      <section className={styles.section}>
        <SectionHeader index="01" title={label} subtitle="Members ranked by total Shiny Wars points" />
        <div className={styles.achievementCardsRow}>
          <div className={`${styles.achievementCard} ${styles.achievementCardPoints}`}>
            <span className={styles.achievementLabelPoints}>Total Points</span>
            <span className={styles.achievementValue}>{formatNumber(points)}</span>
          </div>
          <div className={`${styles.achievementCard} ${styles.achievementCardPosition}`}>
            <span className={styles.achievementLabelPosition}>Final Position</span>
            <span className={styles.achievementValue}>{position}</span>
          </div>
        </div>
        <div className={styles.playerStatList}>
          {players.map((player, index) => {
            const isExpanded = expanded.has(player.name)
            return (
              <div key={player.name} className={`${styles.playerStatRow} ${isExpanded ? styles.playerStatRowOpen : ''}`}>
                <button className={styles.playerStatHeader} onClick={() => toggleExpanded(player.name)}>
                  <span className={styles.playerStatRank}>#{index + 1}</span>
                  <span className={styles.playerStatName}>{player.name}</span>
                  <span className={styles.playerStatMeta}>
                    {formatNumber(player.caughtCount)} shinies · {formatNumber(player.totalPoints)} pts
                  </span>
                  <span className={styles.expandArrow}>{isExpanded ? '\u25B2' : '\u25BC'}</span>
                </button>
                {isExpanded && (
                  <div className={styles.detailedGrid}>
                    {player.shinies.length === 0 && <p className={styles.emptyNote}>No shinies recorded.</p>}
                    {player.shinies.map((shiny, i) => (
                      <ShinyItem key={i} shiny={shiny} points={getSpeciesPoints(shiny.Pokemon)} userName={player.name} localizeDates />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default function SynergyShinyWars2026() {
  const [activeTab, setActiveTab] = useState('synema')

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Synergy 2026 Shiny Wars', url: '/synergy-2026-shiny-wars' },
  ]

  useDocumentHead({
    title: 'Synergy 2026 Shiny Wars - Team Synergy',
    description: 'Team Synergy 2026 Shiny Wars statistics: team and player performance, shiny catch timelines, and leaderboards for Absolute Synema, Synsational, and Synergy Task Force.',
    canonicalPath: '/synergy-2026-shiny-wars/',
    breadcrumbs,
  })

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroEyebrow}>Team Synergy · 2026 Season Report</span>
        <h1 className={styles.heroTitle}>Synergy 2026 Shiny Wars</h1>
        <p className={styles.heroSubtitle}>
          A full statistical breakdown of the team's shiny hunting campaign — encounters, catches, and standings.
        </p>
      </header>

      <nav className={styles.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`${styles.tabButton} ${activeTab === tab.key ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className={styles.reportBody}>
        {activeTab === 'synema' && <AbsoluteSynemaTab />}
        {activeTab === 'synsational' && <RosterWarTab teamData={synsationalData} label="Synsational" points={2680} position={85} />}
        {activeTab === 'taskforce' && <RosterWarTab teamData={taskForceData} label="Synergy Task Force" position={79} points={2817} />}
      </div>
    </div>
  )
}