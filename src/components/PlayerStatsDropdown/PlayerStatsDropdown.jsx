import { useState, useRef, useEffect } from 'react'
import styles from './PlayerStatsDropdown.module.css'

export default function PlayerStatsDropdown({ winners, data }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  if (!winners) return null

  useEffect(() => {
    const handleClickAway = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('click', handleClickAway)
      return () => document.removeEventListener('click', handleClickAway)
    }
  }, [isOpen])

  const stats = [
    {
      title: 'The Luckiest Player!',
      subtitle: '(The Player with the least Average per Shiny)',
      player: winners.luckiest,
      value: `${winners.luckiest.averageEncounter.toFixed(0)} avg encounters`,
    },
    {
      title: 'The Unluckiest Player!',
      subtitle: '(The Player with the highest Average Per Shiny)',
      player: winners.unluckiest,
      value: `${winners.unluckiest.averageEncounter.toFixed(0)} avg encounters`,
    },
    {
      title: 'The Highest Dry Streak!',
      subtitle: '(The Player with the highest Encounter Shiny)',
      player: winners.highestDryStreak,
      value: `${winners.highestDryStreak.maxEncounter.toLocaleString()} encounters`,
    },
    {
      title: 'The Least Encounter Pokemon!',
      subtitle: '(The Player with the least encounter shiny)',
      player: winners.leastEncounter,
      value: `${winners.leastEncounter.minEncounter.toLocaleString()} encounters`,
    },
    {
      title: 'Most Rares!',
      subtitle: '(The Player with the most shinies with Tier 2, 1 or 0)',
      player: winners.mostRares,
      value: `${winners.mostRares.rareCount} rare shinies`,
    },
  ]

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        className={styles.button}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Toggle player statistics"
      >
        Player Leaderboards {isOpen ? '▼' : '►'}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {stats.map((stat, index) => (
            <div key={index} className={styles.statItem}>
              <div className={styles.title}>{stat.title}</div>
              <div className={styles.subtitle}>{stat.subtitle}</div>
              <div className={styles.content}>
                <div className={styles.playerName}>{stat.player.name}</div>
                <div className={styles.value}>{stat.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
