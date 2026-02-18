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

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How do you obtain the roaming legends in PokeMMO?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Roaming legendaries in PokeMMO appear in different locations each month based on a rotating schedule. Once you encounter a roaming legendary in the wild, you can catch it just like any other wild Pokémon. Each legendary has specific months where it appears."
        }
      },
      {
        "@type": "Question",
        "name": "How do you unlock the roaming legends in PokeMMO?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Roaming legendaries are typically unlocked by progressing through the game and obtaining the necessary badges. Different regions may have different requirements to encounter roaming Pokémon. At higher levels of progression, more roaming legendaries become available to encounter."
        }
      },
      {
        "@type": "Question",
        "name": "Can roaming legends be shiny in PokeMMO?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! Roaming legendaries can be shiny in PokeMMO. Many shiny hunters target these roaming legendaries during their available months as part of their shiny hunting strategy. The shiny rate for roaming legends may differ from standard wild Pokémon encounters."
        }
      }
    ]
  }

  useDocumentHead({
    title: 'Roaming Legendaries Calendar - PokeMMO Zapdos, Articuno, Moltres, Entei, Suicune, Raikou Schedule',
    description: 'PokeMMO Roaming Legendaries Calendar showing monthly availability of Zapdos, Moltres, Articuno, Entei, Suicune, and Raikou. Track which roaming legendaries are available each month and plan your shiny hunts.',
    canonicalPath: '/roaming-legendaries',
    breadcrumbs: breadcrumbs,
    structuredData: faqSchema
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
