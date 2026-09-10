import { Link } from 'react-router-dom'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import encounterPercents from '../../data/encounter_percents.json'
import styles from './Credits.module.css'

const SITE_CREATORS = ['Hyper', 'Mitchell']
const SITE_MODERATORS = [
  'Hyper', 'Zempex', 'ItsTurn', 'BaldBabyBat', 'Kaidono', 'Mitchell',
  'Strength', 'Ezra', 'Sheepie', 'Stratahgy', 'Bloom', 'Russoto',
  'ApparentlyAustin', 'Fastest', 'MiroMMO', 'MrBluestacks'
]

function getRouteFinderCredits(data) {
  const credits = []
  const seen = new Set()

  const visit = (value) => {
    if (!value || typeof value !== 'object') return

    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }

    if (typeof value.credit === 'string') {
      value.credit.split(',').map(name => name.trim()).filter(Boolean).forEach(name => {
        const key = name.toLowerCase()
        if (!seen.has(key)) {
          seen.add(key)
          credits.push(name)
        }
      })
    }

    Object.values(value).forEach(visit)
  }

  visit(data)
  return credits
}

const ROUTE_FINDER_CREDITS = getRouteFinderCredits(encounterPercents)

function CreditList({ names }) {
  return (
    <ul className={styles.nameList}>
      {names.map(name => <li key={name}>{name}</li>)}
    </ul>
  )
}

export default function Credits() {
  useDocumentHead({
    title: 'Credits',
    description: 'Meet the creators, Route Finder contributors, and moderators behind Team Synergy.',
    canonicalPath: '/credits/',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Credits', url: '/credits/' }
    ]
  })

  return (
    <div className={styles.container}>
      <Link to="/" className={styles.backLink}>Back to Home</Link>
      <h1>Credits</h1>

      <section className={styles.creditSection}>
        <h2>Site Creators</h2>
        <CreditList names={SITE_CREATORS} />
      </section>

            <section className={styles.creditSection}>
        <h2>Site Moderators</h2>
        <CreditList names={SITE_MODERATORS} />
      </section>

      <section className={styles.creditSection}>
        <h2>Route Finder Project</h2>
        <CreditList names={ROUTE_FINDER_CREDITS} />
      </section>
    </div>
  )
}