import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useDatabase } from '../../hooks/useDatabase'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import PlayerCard from '../../components/PlayerCard/PlayerCard'
import SearchBar from '../../components/SearchBar/SearchBar'
import PlayerStatsDropdown from '../../components/PlayerStatsDropdown/PlayerStatsDropdown'
import { getAssetUrl } from '../../utils/assets'
import { getStatisticsWinners } from '../../utils/playerStatistics'
import { API } from '../../api/endpoints'
import styles from './Showcase.module.css'

const INITIAL_COUNT = 5
const BATCH_SIZE = 5

export default function Showcase() {
  useDocumentHead({
    title: 'Team Synergy - PokeMMO Shiny Hunting Team & Community',
    description: 'Team Synergy is the ultimate PokeMMO shiny hunting community. Browse 140+ player shiny collections, track completion with our Pokédex, watch live Twitch streamers, and join competitions.',
    canonicalPath: '/',
  })
  const { data, isLoading, error } = useDatabase()
  const [search, setSearch] = useState('')
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT)
  const sentinelRef = useRef(null)
  const { data: streamers } = useQuery({
    queryKey: ['streamersList'],
    queryFn: () => fetch(API.streamers).then(r => r.json()),
  })

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

  // Reset visible count when search changes
  useEffect(() => {
    setVisibleCount(INITIAL_COUNT)
  }, [search])

  // Create rank map for O(1) lookup instead of O(n) findIndex on every render
  const rankMap = useMemo(() => {
    const map = new Map()
    sortedPlayers.forEach(([player], index) => {
      map.set(player, index)
    })
    return map
  }, [sortedPlayers])

  // Calculate statistics winners
  const winners = useMemo(() => {
    return getStatisticsWinners(data)
  }, [data])

  const loadMore = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + BATCH_SIZE, filteredPlayers.length))
  }, [filteredPlayers.length])

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

  const playersToShow = filteredPlayers.slice(0, visibleCount)
  const hasMore = visibleCount < filteredPlayers.length

  return (
    <div>
      <h1 class="seo-optimized">
        Team Synergy: PokeMMO Shiny Hunting Community
      </h1>
      <p class="seo-intro">
        Track shinies, join competitions, and explore our {filteredPlayers.length} member collections
      </p>

      <img src={getAssetUrl('images/pagebreak.png')} alt="Page Break" className="pagebreak" />

      <div className={styles.videoContainer}>
        <h2>
          <a href="https://www.youtube.com/watch?v=ngejc1FMWqg" target="_blank" rel="noopener noreferrer">
            Watch our Shiny Showcase Video!
          </a>
        </h2>
        <a href="https://www.youtube.com/watch?v=ngejc1FMWqg" target="_blank" rel="noopener noreferrer">
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

      <PlayerStatsDropdown winners={winners} data={data} />

      <div className={styles.showcase}>
        {playersToShow.map(([player, playerData]) => (
          <PlayerCard
            key={player}
            player={player}
            data={playerData}
            rank={rankMap.get(player)}
            streamers={streamers}
            mobileInteractive={true}
          />
        ))}
      </div>

      {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
    </div>
  )
}
