import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { API } from '../../api/endpoints'
import { useDatabase } from '../../hooks/useDatabase'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import { useTierData } from '../../hooks/useTierData'
import { getAssetUrl } from '../../utils/assets'
import { calculateShinyPoints } from '../../utils/points'
import {
  getStatisticsLeaderboards,
  getMostCommonPokemon,
  MINIMUM_STATS_REQUIREMENTS,
} from '../../utils/playerStatistics'
import styles from './TeamStatistics.module.css'

function formatPlayerName(name, data) {
  return Object.keys(data || {}).find((k) => k.toLowerCase() === String(name).toLowerCase()) || name
}

function formatPokemonName(name) {
  if (!name) return 'N/A'

  return String(name)
    .split(' ')
    .map((word) =>
      word
        .split('-')
        .map((part) => (part ? `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}` : part))
        .join('-')
    )
    .join(' ')
}

const PLAYER_LEADERBOARD_SECTIONS = [
  {
    key: 'luckiest',
    title: 'Luckiest Players',
    subtitle: 'Get a lottery ticket (don`t sell it!)',
    value: (entry) => `${entry.averageEncounter.toFixed(0)} avg encounters`,
  },
  {
    key: 'unluckiest',
    title: 'Unluckiest Players',
    subtitle: 'Alright one of you is lying. (↓)',
    value: (entry) => `${entry.averageEncounter.toFixed(0)} avg encounters`,
  },
  {
    key: 'mostEncounters',
    title: 'Most Encounters',
    subtitle: 'Are you ok?',
    value: (entry) => `${entry.totalEncounters.toLocaleString()} encounters`,
  },
  {
    key: 'highestDryStreak',
    title: 'Highest Dry Streaks',
    subtitle: 'The amount of hours wasted on this Pokemon...',
    value: (entry) => `${entry.maxEncounter.toLocaleString()} encounters`,
    extra: (entry) => `Pokemon: ${formatPokemonName(entry.maxEncounterPokemon)}`,
  },
  {
    key: 'leastEncounter',
    title: 'Lowest Encounter Shinies',
    subtitle: 'Silver Spoon',
    value: (entry) => `${entry.minEncounter.toLocaleString()} encounters`,
    extra: (entry) => `Pokemon: ${formatPokemonName(entry.minEncounterPokemon)}`,
  },
  {
    key: 'mostRares',
    title: 'Most Rare Shinies',
    subtitle: 'Most Tier 2/1/0 (and Alpha) shinies',
    value: (entry) => `${entry.rareCount} rare shinies`,
    extra: (entry) => entry.rarePokemons?.length ? `Pokemon: ${entry.rarePokemons.map(formatPokemonName).join(', ')}` : null,
  },
  {
    key: 'mostPhases',
    title: 'Most Phases',
    subtitle: 'You know you can leave, right?',
    value: (entry) => `${entry.phasesCount} shinies`,
    extra: (entry) => `${entry.topRoute || 'N/A'}`,
  },
  {
    key: 'mostInWeek',
    title: 'Most Shinies in a Week',
    subtitle: 'Mega Spooners',
    value: (entry) => `${entry.mostInWeekCount} shinies`,
    extra: (entry) => entry.mostInWeekPokemons?.length ? `Pokemon: ${entry.mostInWeekPokemons.map(formatPokemonName).join(', ')}` : null,
  },
  {
    key: 'mostSingleEncounters',
    title: 'Most Singled Encounters',
    subtitle: 'Left, Right, Left, Right',
    value: (entry) => `${entry.singleEncounterCount} singles`,
  },
  {
    key: 'most5xHordes',
    title: 'Most 5x Hordes',
    subtitle: 'Sweet Scent Salies',
    value: (entry) => `${entry.horde5xCount} shinies`,
  },
  {
    key: 'mostFishingShinies',
    title: 'Most Fishing Shinies',
    subtitle: 'I`m Chumming!',
    value: (entry) => `${entry.fishingCount} shinies`,
  },
  {
    key: 'mostSafariCatches',
    title: 'Most Safari Catches',
    subtitle: 'It was meant to be!',
    value: (entry) => `${entry.safariCatchCount} catches`,
  },
  {
    key: 'mostSafariFlees',
    title: 'Most Safari Flees',
    subtitle: 'It wasnt meant to be...',
    value: (entry) => `${entry.safariFleeCount} safari flees`,
  },
  {
    key: 'mostBountiesClaimed',
    title: 'Most Bounties Claimed',
    subtitle: 'Bring me my money!',
    value: (entry) => `${entry.bountyClaimCount} claimed`,
  },
  {
    key: 'contributors',
    title: 'Contributors',
    subtitle: 'Most events + bounties hosted, does not include Flash events or events/bounties not listed on the website.',
    value: (entry) => `${entry.contributorCount} hosted`,
  },
  {
    key: 'mostTeamDexEntrys',
    title: 'Most Team Dex Entrys',
    subtitle: 'Most species-line entries only that player owns',
    value: (entry) => `${entry.teamDexEntryCount} dex entries`,
    extra: (entry) => entry.teamDexPokemon?.length
      ? `Pokemon: ${entry.teamDexPokemon.map(formatPokemonName).join(', ')}`
      : null,
  },
  {
    key: 'newLivingDexEntry',
    title: 'New Living Dex Entry',
    subtitle: 'Most unique shiny species owned by only one player.',
    value: (entry) => `${entry.newLivingDexEntryCount} entries`,
    extra: (entry) => entry.newLivingDexEntries?.length
      ? `Pokemon: ${entry.newLivingDexEntries.map(formatPokemonName).join(', ')}`
      : null,
  },
  {
    key: 'highestWildIvShiny',
    title: 'Highest Wild IV Shiny',
    subtitle: 'Highest total IV shiny from wild encounters (egg method excluded).',
    value: (entry) => `IVs: ${entry.highestWildIvTotal}`,
    extra: (entry) => entry.highestWildIvPokemon
      ? `Pokemon: ${formatPokemonName(entry.highestWildIvPokemon)}${entry.highestWildIvSpread ? ` (${entry.highestWildIvSpread})` : ''}`
      : null,
  },
]

const ALL_TIME_TAB = {
  key: 'allTimePoints',
  title: 'All-Time Point Leaderboards',
  subtitle: 'All players ranked by total points',
}

const MOST_COMMON_POKEMON_TAB = {
  key: 'mostCommonPokemon',
  title: 'Most Common Pokemon',
  subtitle: 'Top 25 most commonly caught shiny Pokemon',
}

export default function TeamStatistics() {
  const [activeIndexTab, setActiveIndexTab] = useState(ALL_TIME_TAB.key)
  const [searchQuery, setSearchQuery] = useState('')

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Team Statistics', url: '/team-statistics' }
  ]

  useDocumentHead({
    title: 'Team Statistics - PokeMMO Leaderboards | Team Synergy',
    description: 'View Team Synergy player statistics, top 3 leaderboard categories, a full searchable statistics index, and top common shiny Pokemon.',
    canonicalPath: '/team-statistics/',
    breadcrumbs,
  })

  const { data, isLoading, error } = useDatabase()
  const { tierPoints, tierLookup } = useTierData()

  const { data: bountiesData = [] } = useQuery({
    queryKey: ['bounties'],
    queryFn: async () => {
      try {
        const res = await fetch(API.bounties)
        if (!res.ok) return []
        return res.json()
      } catch {
        return []
      }
    },
    staleTime: 10 * 60 * 1000,
  })

  const { data: eventsData = [] } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      try {
        const res = await fetch(API.events)
        if (!res.ok) return []
        return res.json()
      } catch {
        return []
      }
    },
    staleTime: 10 * 60 * 1000,
  })

  const externalStatsData = useMemo(
    () => ({ bounties: bountiesData, events: eventsData }),
    [bountiesData, eventsData]
  )

  const playerLeaderboards = useMemo(
    () => getStatisticsLeaderboards(data, 3, externalStatsData),
    [data, externalStatsData]
  )


  const indexedLeaderboards = useMemo(() => {
    const totalPlayers = Object.keys(data || {}).length
    if (!totalPlayers) return null
    return getStatisticsLeaderboards(data, totalPlayers, externalStatsData)
  }, [data, externalStatsData])

  const commonPokemon = useMemo(
    () => getMostCommonPokemon(data, 25),
    [data]
  )

  const allTimeLeaderboard = useMemo(() => {
    if (!data) return []

    const allTime = {}
    Object.entries(data).forEach(([player, playerData]) => {

      allTime[player] = Object.values(playerData.shinies || {}).reduce(
        (acc, shiny) => acc + calculateShinyPoints(shiny, tierPoints, tierLookup),
        0
      )
    })

    return Object.entries(allTime)
      .sort((a, b) => b[1] - a[1])
      .filter(([, points]) => points > 0)
      .map(([player, points], index) => ({
        rank: index + 1,
        name: player,
        value: `${points.toLocaleString()} pts`,
        extra: null,
        isPlayer: true,
      }))
  }, [data, tierPoints, tierLookup])

  const indexTabs = useMemo(
    () => [ALL_TIME_TAB, ...PLAYER_LEADERBOARD_SECTIONS, MOST_COMMON_POKEMON_TAB],
    []
  )

  const activeCategory = useMemo(
    () => indexTabs.find((tab) => tab.key === activeIndexTab) || indexTabs[0],
    [activeIndexTab, indexTabs]
  )

  const activeIndexEntries = useMemo(() => {
    if (activeCategory.key === ALL_TIME_TAB.key) {
      return allTimeLeaderboard
    }

    if (activeCategory.key === MOST_COMMON_POKEMON_TAB.key) {
      return commonPokemon.map((entry, index) => ({
        rank: index + 1,
        name: formatPokemonName(entry.pokemon),
        value: `${entry.count.toLocaleString()} catches`,
        extra: null,
        isPlayer: false,
      }))
    }

    const entries = indexedLeaderboards?.[activeCategory.key] || []
    return entries.map((entry, index) => ({
      rank: index + 1,
      name: entry.name,
      value: activeCategory.value(entry),
      extra: activeCategory.extra?.(entry) || null,
      isPlayer: true,
    }))
  }, [activeCategory, allTimeLeaderboard, commonPokemon, indexedLeaderboards])

  const filteredIndexEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return activeIndexEntries
      .map((entry) => ({
        ...entry,
        canonical: entry.isPlayer ? formatPlayerName(entry.name, data) : entry.name,
      }))
      .filter((entry) => !query || entry.canonical.toLowerCase().includes(query))
  }, [activeIndexEntries, data, searchQuery])

  const searchPlaceholder = activeCategory.key === MOST_COMMON_POKEMON_TAB.key
    ? 'Search pokemon...'
    : 'Search username...'

  if (isLoading) return <div className="message">Loading...</div>
  if (error) return <div className="message">Error loading team statistics</div>

  return (
    <div className={styles.page}>
      <h1>Team Statistics</h1>
      <img src={getAssetUrl('images/pagebreak.png')} alt="Page Break" className="pagebreak" />

      <section className={styles.section}>
        <h2>Player Leaderboards (Top 3)</h2>
        <p className={styles.requirements}>
          For tabs that require encounter data, It is only showing Players with at least {MINIMUM_STATS_REQUIREMENTS.totalEncounters.toLocaleString()} total encounters,
          {' '}{MINIMUM_STATS_REQUIREMENTS.dataCompleteness}% data completeness, and {MINIMUM_STATS_REQUIREMENTS.shinyCount}+ shinies. if you meet these requirements and do not see yourself here, you will need to update your statistics on ShinyBoard.net. DM Hyper for more information
        </p>
        <div className={styles.grid}>
          {PLAYER_LEADERBOARD_SECTIONS.map((section) => (
            <article key={section.key} className={styles.card}>
              <h3>{section.title}</h3>
              <p className={styles.subtitle}>{section.subtitle}</p>
              <ol className={styles.list}>
                {(playerLeaderboards?.[section.key] || []).map((entry, index) => {
                  const canonical = formatPlayerName(entry.name, data)
                  return (
                    <li key={`${section.key}-${canonical}`}>
                      <div className={styles.rowTop}>
                        <span className={styles.rank}>#{index + 1}</span>
                        <Link to={`/player/${canonical}/`} className={styles.playerLink}>
                          {canonical}
                        </Link>
                        <span className={styles.value}>{section.value(entry)}</span>
                      </div>
                      {section.extra?.(entry) && (
                        <div className={styles.extra}>{section.extra(entry)}</div>
                      )}
                    </li>
                  )
                })}
              </ol>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2>Statistics Index</h2>
        <div className={styles.tabs} role="tablist" aria-label="All statistics index categories">
          {indexTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeIndexTab === tab.key}
              className={`${styles.tabButton} ${activeIndexTab === tab.key ? styles.tabButtonActive : ''}`}
              onClick={() => setActiveIndexTab(tab.key)}
            >
              {tab.title}
            </button>
          ))}
        </div>
        <div className={styles.searchRow}>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className={styles.searchInput}
            aria-label={searchPlaceholder}
          />
        </div>
        <article className={styles.card}>
          <h3>{activeCategory.title}</h3>
          <p className={styles.subtitle}>{activeCategory.subtitle}</p>
          <ol className={styles.list}>
            {filteredIndexEntries.map((entry) => (
              <li key={`${activeCategory.key}-${entry.canonical}`}>
                <div className={styles.rowTop}>
                  <span className={styles.rank}>#{entry.rank}</span>
                  {entry.isPlayer ? (
                    <Link to={`/player/${entry.canonical}/`} className={styles.playerLink}>
                      {entry.canonical}
                    </Link>
                  ) : (
                    <span>{entry.canonical}</span>
                  )}
                  <span className={styles.value}>{entry.value}</span>
                </div>
                {entry.extra && <div className={styles.extra}>{entry.extra}</div>}
              </li>
            ))}
          </ol>
          {!filteredIndexEntries.length && (
            <p className={styles.empty}>No entries match that search.</p>
          )}
        </article>
      </section>
    </div>
  )
}

