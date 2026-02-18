import { Link } from 'react-router-dom'
import roamingLegendariesData from '../../data/roaming_legendaries.json'
import styles from './RoamingLegendaries.module.css'

export default function RoamingLegendaries() {
  const currentMonth = new Date().getMonth()
  const currentMonthName = roamingLegendariesData.months[currentMonth]
  
  // Get legendaries available this month
  const thisMonthLegendaries = roamingLegendariesData.legendaries.filter(legendary => 
    legendary.months.includes(currentMonth)
  )

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.icon}>⭐</span>
          <h2 className={styles.title}>Roaming Legendaries</h2>
        </div>
        
        <div className={styles.monthLabel}>
          <span className={styles.monthText}>Available this month:</span>
        </div>

        <div className={styles.legendariesGrid}>
          {thisMonthLegendaries.map(legendary => (
            <Link 
              key={legendary.id} 
              to={`/pokemon/${legendary.id.toLowerCase()}/`}
              className={styles.legendaryItem}
            >
              <img
                src={`https://img.pokemondb.net/sprites/black-white/anim/shiny/${legendary.id.toLowerCase()}.gif`}
                alt={legendary.name}
                className={styles.legendaryImage}
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

        <Link to="/roaming-legendaries/" className={styles.calendarButton}>
          Calendar
        </Link>
      </div>
    </div>
  )
}
