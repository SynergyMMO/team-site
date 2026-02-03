import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useDatabase } from '../../hooks/useDatabase'
import PlayerCard from '../../components/PlayerCard/PlayerCard'
import SearchBar from '../../components/SearchBar/SearchBar'
import styles from './Showcase.module.css'

export default function Showcase() {
  const { data, isLoading, error } = useDatabase()
  const [search, setSearch] = useState('')
  const [streamers, setStreamers] = useState(null)

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

  if (isLoading) return <div className="message">Loading...</div>
  if (error) return <div className="message">Error loading data</div>

  return (
    <div>
      <h1>
        Team Synergy Shiny Showcase
        <Link to="/admin" className="invisible-link">!</Link>
      </h1>

      <img src="/images/pagebreak.png" alt="Page Break" className="pagebreak" />

      <div className={styles.videoContainer}>
        <a href="https://www.youtube.com/watch?v=ngejc1FMWqg" target="_blank" rel="noopener noreferrer">
          <h2>Watch our Shiny Showcase Video!</h2>
          <img src="/images/shinyshowcase.png" alt="Shiny Showcase Video" className={styles.showcaseVideo} />
        </a>
      </div>

      <SearchBar value={search} onChange={setSearch} />

      <div className={styles.showcase}>
        {filteredPlayers.map(([player, playerData], index) => {
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
    </div>
  )
}
