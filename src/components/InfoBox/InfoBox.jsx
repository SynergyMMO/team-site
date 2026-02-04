import { useRef, useEffect } from 'react'
import styles from './InfoBox.module.css'

const TRAIT_CHECKS = [
  { key: 'Secret Shiny', label: 'Secret', cls: 'tagSecret' },
  { key: 'Alpha', label: 'Alpha', cls: 'tagAlpha' },
  { key: 'Egg', label: 'Egg', cls: 'tagEgg' },
  { key: 'Safari', label: 'Safari', cls: 'tagSafari' },
  { key: 'Honey Tree', label: 'Honey', cls: 'tagHoney' },
  { key: 'Sold', label: 'Sold', cls: 'tagSold' },
  { key: 'Event', label: 'Event', cls: 'tagEvent' },
  { key: 'Favourite', label: 'Favourite', cls: 'tagFav' },
  { key: 'Legendary', label: 'Legend', cls: 'tagLegend' },
  { key: 'MysteriousBall', label: 'Mystery', cls: 'tagMystery' },
  { key: 'Reaction', label: 'Reaction', cls: 'tagReaction' },
]

export default function InfoBox({ shiny, points }) {
  const boxRef = useRef(null)

  useEffect(() => {
    const box = boxRef.current
    if (!box) return

    const span = box.parentElement
    if (!span) return

    const handleMouseEnter = () => {
      const spanRect = span.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const isMobile = window.innerWidth <= 900
      const boxWidth = isMobile ? 100 : 180

      const parentDiv = span.parentElement
      const isFavorite = parentDiv && parentDiv.className && parentDiv.className.includes('bigShiny')

      let leftPos

      if (isFavorite) {
        leftPos = isMobile ? span.offsetWidth + 25 : span.offsetWidth + 60
      } else {
        leftPos = span.offsetWidth + 8
        if (spanRect.right + boxWidth + 8 > viewportWidth) {
          leftPos = -boxWidth - 8
        }
      }

      box.style.left = leftPos + 'px'
    }

    span.addEventListener('mouseenter', handleMouseEnter)
    return () => span.removeEventListener('mouseenter', handleMouseEnter)
  }, [])

  const activeTraits = TRAIT_CHECKS.filter(
    t => shiny[t.key]?.toLowerCase() === 'yes'
  )
  const reactionUrl = shiny['Reaction Link']?.trim()

  return (
    <div className={styles.infoBox} ref={boxRef}>
      <strong>{shiny.Pokemon}</strong>
      {points !== undefined && (
        <div className={styles.detail}>({points} pts)</div>
      )}
      {activeTraits.length > 0 && (
        <div className={styles.tags}>
          {activeTraits.map(t => {
            if (t.key === 'Reaction' && reactionUrl) {
              return (
                <a
                  key={t.label}
                  href={reactionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.tag} ${styles[t.cls]}`}
                >
                  {t.label}
                </a>
              )
            }
            return (
              <span key={t.label} className={`${styles.tag} ${styles[t.cls]}`}>
                {t.label}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
