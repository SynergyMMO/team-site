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
            <section className={`${styles.creditSection} ${styles.termsSection}`}>
        <h2>Terms of Use</h2>
        <p className={styles.termsUpdated}>Last updated September 29, 2026</p>

        <section>
          <h3>1. Ownership</h3>
          <p>The design, layout, text, artwork, graphics, tools, and code of synergymmo.com are owned by SynergyMMO and are protected by copyright. © 2026 SynergyMMO. All rights reserved.</p>
          <p>You may not copy, republish, clone, scrape, or redistribute the site's design, code, content, or data, in whole or in part, or present it as your own, without written permission from SynergyMMO.</p>
          <p>You must not feed SynergyMMO Into Any Automated Systems or AI without explicit permission, this includes web scrapers, bots, and AI models for any reason.</p>
        </section>
        <section>
          <h3>7. Contact</h3>
          <p>For permission requests or to report an unauthorized copy of this site, contact SynergyMMO staff on Discord.</p>
          <p>We may update these terms at any time. Continued use of the site means you accept the current version.</p>
        </section>
      </section>
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
      <Link to="/" className={styles.backLink}>Back to Home</Link>
    </div>
    
  )
}