import { useState, useMemo, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useDatabase } from '../../hooks/useDatabase'
import PlayerCard from '../../components/PlayerCard/PlayerCard'
import SearchBar from '../../components/SearchBar/SearchBar'
import { getAssetUrl } from '../../utils/assets'
import styles from './Showcase.module.css'

export default function Showcase() {
  const { data, isLoading, error } = useDatabase()
  const [search, setSearch] = useState('')
  const [streamers, setStreamers] = useState(null)
  const [visibleCount, setVisibleCount] = useState(10)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const loadMoreRef = useRef(null)
  const timeoutRef = useRef(null)

  // Fetch streamers on first load
  useMemo(() => {
    if (!streamers) {
      fetch('https://adminpage.hypersmmo.workers.dev/admin/streamers')
        .then(r => r.json())
        .then(setStreamers)
        .catch(() => setStreamers({}))
    }
  }, [streamers])

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

  // Infinite scroll observer with debouncing
  useEffect(() => {
    // Don't set up observer if all players are already visible
    if (visibleCount >= filteredPlayers.length) {
      setIsLoadingMore(false)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredPlayers.length && !isLoadingMore) {
          setIsLoadingMore(true)

          // Debounce to prevent rapid loading
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
          }

          timeoutRef.current = setTimeout(() => {
            setVisibleCount(prev => Math.min(prev + 10, filteredPlayers.length))
            setIsLoadingMore(false)
          }, 300)
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current)
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [visibleCount, filteredPlayers.length, isLoadingMore])

  // Reset visible count when search changes
  useEffect(() => {
    setVisibleCount(10)
    setIsLoadingMore(false)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [search])

  if (isLoading) return <div className="message">Loading...</div>
  if (error) return <div className="message">Error loading data</div>

  return (
    <div>
      <h1>
        Team Synergy Shiny Showcase
        <Link to="/admin" className="invisible-link">!</Link>
      </h1>

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

      <div className={styles.showcase}>
        {filteredPlayers.slice(0, visibleCount).map(([player, playerData], index) => {
          const originalIndex = sortedPlayers.findIndex(([p]) => p === player)
          return (
            <PlayerCard
              key={player}
              player={player}
              data={playerData}
              rank={originalIndex}
              streamers={streamers}
            />
          )
        })}
      </div>

      {visibleCount < filteredPlayers.length && (
        <div ref={loadMoreRef} style={{ textAlign: 'center', margin: '30px 0', padding: '20px' }}>
          <p style={{ color: '#aaa', fontSize: '0.9rem' }}>
            Loading more players...
          </p>
        </div>
      )}
    </div>
  )
}
