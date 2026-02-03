import { useRef, useEffect } from 'react'
import styles from './InfoBox.module.css'

const TRAIT_CHECKS = ['Alpha', 'Secret Shiny', 'Favourite']

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
      const boxWidth = 220

      let leftPos = span.offsetWidth + 8
      if (spanRect.right + boxWidth + 8 > viewportWidth) {
        leftPos = -boxWidth - 8
      }

      box.style.left = leftPos + 'px'
    }

    span.addEventListener('mouseenter', handleMouseEnter)
    return () => span.removeEventListener('mouseenter', handleMouseEnter)
  }, [])

  const activeTraits = TRAIT_CHECKS.filter(
    t => shiny[t]?.toLowerCase() === 'yes'
  )
  const reactionUrl = shiny['Reaction Link']?.trim()

  return (
    <div className={styles.infoBox} ref={boxRef}>
      <strong>{shiny.Pokemon}</strong>
      {points !== undefined && (
        <div className={styles.detail}>({points} pts)</div>
      )}
      {activeTraits.length > 0 && (
        <div className={styles.detail}>{activeTraits.join(', ')}</div>
      )}
      {reactionUrl && (
        <div className={styles.detail}>
          <a href={reactionUrl} target="_blank" rel="noopener noreferrer" className={styles.reactionLink}>
            Reaction
          </a>
        </div>
      )}
    </div>
  )
}
