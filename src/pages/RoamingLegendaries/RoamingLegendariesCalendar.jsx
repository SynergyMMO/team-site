import { Link } from 'react-router-dom'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import roamingLegendariesData from '../../data/roaming_legendaries.json'
import styles from './RoamingLegendariesCalendar.module.css'

export default function RoamingLegendariesCalendar() {
  const currentMonth = new Date().getMonth()
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'PokeMMO Pokédex', url: '/pokedex' },
    { name: 'Roaming Legendaries Calendar', url: '/roaming-legendaries' }
  ]


  useDocumentHead({
    title: 'Roaming Legendaries Calendar - PokeMMO Zapdos, Articuno, Moltres, Entei, Suicune, Raikou Schedule',
    description: 'PokeMMO Roaming Legendaries Calendar showing monthly availability of Zapdos, Moltres, Articuno, Entei, Suicune, and Raikou. Track which roaming legendaries are available each month and plan your shiny hunts.',
    canonicalPath: '/roaming-legendaries/',
    breadcrumbs: breadcrumbs
  })

  const getLegenariesForMonth = (monthIndex) => {
    return roamingLegendariesData.legendaries.filter(legendary => 
      legendary.months.includes(monthIndex)
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Roaming Legendaries Calendar</h1>
        <p className={styles.subtitle}>
          Check which Roaming Legendaries are available each month in PokeMMO.
        </p>
      </div>

      <div className={styles.backLinkWrapper}>
        <Link to="/" className={styles.backLink}>
          ← Back to Home
        </Link>
      </div>

      <div className={styles.calendarGrid}>
        {roamingLegendariesData.months.map((month, monthIndex) => {
          const legendaries = getLegenariesForMonth(monthIndex)
          const isCurrentMonth = monthIndex === currentMonth
          
          return (
            <div 
              key={month} 
              className={`${styles.monthCard} ${isCurrentMonth ? styles.currentMonth : ''}`}
            >
              <h2 className={styles.monthTitle}>{month}</h2>
              
              <div className={styles.legendariesContainer}>
                {legendaries.map(legendary => (
                  <Link
                    key={legendary.id}
                    to={`/pokemon/${legendary.id.toLowerCase()}/`}
                    className={styles.legendaryEntry}
                  >
                    <img
                      src={`https://img.pokemondb.net/sprites/black-white/anim/shiny/${legendary.id.toLowerCase()}.gif`}
                      alt={legendary.name}
                      className={styles.legendaryGif}
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                    <div className={styles.legendaryNameContainer}>
                      <img
                        src={`/images/pokemon_gifs/tier_7/${legendary.id}.gif`}
                        alt={legendary.name}
                        className={styles.legendaryNameGif}
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                      <span>{legendary.name}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
