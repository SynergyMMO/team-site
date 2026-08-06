import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDatabase } from '../../hooks/useDatabase'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import { useStreamers } from '../../hooks/useStreamers'
import PlayerCard from '../../components/PlayerCard/PlayerCard'
import SearchBar from '../../components/SearchBar/SearchBar'
import { getAssetUrl } from '../../utils/assets'
import { API } from '../../api/endpoints'
import styles from './ShinyShowcase.module.css'

const INITIAL_COUNT = 5
const BATCH_SIZE = 5
const SHINY_FILTERS = [
  { label: 'Eggs', key: 'Egg' },
  { label: 'Alphas', key: 'Alpha' },
  { label: 'Safari', key: 'Safari' },
  { label: 'Fossils', key: 'Fossil' },
  { label: 'Swarm', key: 'Swarm' },
  { label: 'Fishing', key: 'Fishing' },
  { label: `Headbutt`, key: 'Headbutt' },
  { label: 'Pkid', key: 'Pkid' },
  { label: 'Reaction', key: 'Reaction' },
  { label: 'Mysterious Ball', key: 'MysteriousBall' },
  { label: 'Honey Tree', key: 'Honey Tree' },
  { label: 'Secret Shiny', key: 'Secret Shiny' },
  { label: 'Event', key: 'Event' },
]

function isTruthyFlag(value) {
  if (value == null) return false
  const normalized = String(value).trim().toLowerCase()
  return normalized === 'yes' || normalized === 'yws' || normalized === 'y' || normalized === 'true' || normalized === '1'
}

function hasReaction(shiny) {
  if (!shiny) return false
  return isTruthyFlag(shiny.Reaction) && Boolean(String(shiny['Reaction Link'] || '').trim())
}

export default function ShinyShowcase() {
  useDocumentHead({
    title: 'Shiny Showcase - Team Synergy PokeMMO Community',
    description: 'Browse Team Synergy\'s 140+ member shiny collections. Track completion with our Pokédex, watch live Twitch streamers, and join competitions.',
    canonicalPath: '/shiny-showcase/',
    robots: 'index, follow, max-image-preview:large',
  })
  const { data, isLoading, error } = useDatabase()
  const [search, setSearch] = useState('')
  const [activeShinyFilters, setActiveShinyFilters] = useState([])
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT)
  const sentinelRef = useRef(null)
  const { data: streamers } = useQuery({
    queryKey: ['streamersList'],
    queryFn: () => fetch(API.streamers).then(r => {
      if (!r.ok) throw new Error(`Failed to load streamers: ${r.status}`)
      return r.json()
    }),
  })
  const { data: twitchData } = useStreamers()

  const combinedStreamers = useMemo(() => {
    // Lowercase all keys for case-insensitive comparison
    const result = {}
    if (streamers) {
      Object.entries(streamers).forEach(([key, value]) => {
        result[key.toLowerCase()] = value
      })
    }
    if (twitchData) {
      for (const s of [...twitchData.live, ...twitchData.offline]) {
        const key = s.twitch_username?.toLowerCase()
        if (key && !result[key]) {
          result[key] = s
        }
      }
    }
    return result
  }, [streamers, twitchData])

  const sortedPlayers = useMemo(() => {
    if (!data) return []
    return Object.entries(data)
      .sort((a, b) => b[1].shiny_count - a[1].shiny_count)
  }, [data])

  const filteredPlayers = useMemo(() => {
    if (!search) return sortedPlayers
    const lower = search.toLowerCase()
    return sortedPlayers.filter(([name]) => name.toLowerCase().includes(lower))
  }, [sortedPlayers, search])

  const playersWithFilteredShinies = useMemo(() => {
    if (!activeShinyFilters.length) return filteredPlayers

    return filteredPlayers.map(([player, playerData]) => {
      const shinies = Object.entries(playerData?.shinies || {})
      const filteredShinies = Object.fromEntries(
        shinies.filter(([, shiny]) => {
          return activeShinyFilters.some(filterKey => {
            if (filterKey === 'Reaction') return hasReaction(shiny)
            return isTruthyFlag(shiny?.[filterKey])
          })
        })
      )
      const matchingShinyCount = Object.keys(filteredShinies).length

      if (!matchingShinyCount) return null

      return [
        player,
        {
          ...playerData,
          shinies: filteredShinies,
          shiny_count: matchingShinyCount,
        },
      ]
    }).filter(Boolean)
  }, [filteredPlayers, activeShinyFilters])

  const toggleShinyFilter = useCallback((filterKey) => {
    setActiveShinyFilters((prev) => (
      prev.includes(filterKey)
        ? prev.filter((key) => key !== filterKey)
        : [...prev, filterKey]
    ))
  }, [])

  // Reset visible count when search changes
  useEffect(() => {
    setVisibleCount(INITIAL_COUNT)
  }, [search, activeShinyFilters])

  // Create rank map for O(1) lookup instead of O(n) findIndex on every render
  const rankMap = useMemo(() => {
    const map = new Map()
    sortedPlayers.forEach(([player], index) => {
      map.set(player, index)
    })
    return map
  }, [sortedPlayers])

  const loadMore = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + BATCH_SIZE, playersWithFilteredShinies.length))
  }, [playersWithFilteredShinies.length])

  // IntersectionObserver to load more as user scrolls
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore()
      },
      { rootMargin: '400px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

  if (isLoading) return <div className="message">Loading...</div>
  if (error) return <div className="message">Error loading data</div>

  const playersToShow = playersWithFilteredShinies.slice(0, visibleCount)
  const hasMore = visibleCount < playersWithFilteredShinies.length

  return (
    <div>
      <h1 className="seo-optimized">
        Shiny Showcase - Team Synergy PokeMMO Collections
      </h1>
      <p className="seo-intro">
        Browse {playersWithFilteredShinies.length} Team Synergy member shiny collections. Track completion with our Pokédex, explore shiny hunting locations, and discover our community's best shinies.
      </p>

      <img src={getAssetUrl('images/pagebreak.png')} alt="Page Break" className="pagebreak" />

      <div className={styles.videoContainer}>
        <h2>
          <a href="https://www.youtube.com/watch?v=G5zh-xZs-eg" target="_blank" rel="noopener noreferrer">
            Watch our Shiny Showcase Video!
          </a>
        </h2>
        <a href="https://www.youtube.com/watch?v=G5zh-xZs-eg" target="_blank" rel="noopener noreferrer">
          <img
            src={getAssetUrl('images/shinyshowcase.png')}
            alt="Shiny Showcase Video"
            className={styles.showcaseVideo}
            width="300"
            height="169"
            loading="eager"
            decoding="async"
          />
        </a>
      </div>

      <SearchBar value={search} onChange={setSearch} />
      <div className={styles.shinyFilters}>
        {SHINY_FILTERS.map((filter) => {
          const isActive = activeShinyFilters.includes(filter.key)
          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => toggleShinyFilter(filter.key)}
              className={`${styles.filterChip} ${isActive ? styles.filterChipActive : ''}`}
            >
              {filter.label}
            </button>
          )
        })}
      </div>

      <div className={styles.showcase}>
        {playersToShow.map(([player, playerData]) => (
          <PlayerCard
            key={player}
            player={player}
            data={playerData}
            rank={rankMap.get(player)}
            streamers={combinedStreamers}
            mobileInteractive={true}
          />
        ))}
      </div>

      {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
    </div>
  )
}
