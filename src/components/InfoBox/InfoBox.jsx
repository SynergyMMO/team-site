import { useRef, useEffect, useMemo } from 'react'
import styles from './InfoBox.module.css'

const TRAIT_CHECKS = [
  { key: 'Secret Shiny', label: 'Secret', cls: 'tagSecret' },
  { key: 'Alpha', label: 'Alpha', cls: 'tagAlpha' },
  { key: 'Egg', label: 'Egg', cls: 'tagEgg' },
  { key: 'Safari', label: 'Safari', cls: 'tagSafari' },
  { key: 'Honey Tree', label: 'Honey', cls: 'tagHoney' },
  { key: 'Event', label: 'Event', cls: 'tagEvent' },
  { key: 'Favourite', label: 'Favourite', cls: 'tagFav' },
  { key: 'Legendary', label: 'Legend', cls: 'tagLegend' },
  { key: 'MysteriousBall', label: 'Mystery', cls: 'tagMystery' },
  { key: 'Reaction', label: 'Reaction', cls: 'tagReaction' },
]

// API merged fields to display (in order)
const API_FIELDS = [
  { key: 'ivs', label: 'IVs' },
  { key: 'nature', label: 'Nature' },
  { key: 'location', label: 'Location' },
  { key: 'encounter_method', label: 'Method' },
  { key: 'date_caught', label: 'Caught' },
  { key: 'encounter_count', label: 'Encounters', fallback: 'Encounter Count' },
  { key: 'nickname', label: 'Nickname' },
  { key: 'variant', label: 'Variant' },
]

// Format date to readable format
function formatDate(dateStr, localize = true) {
  if (!dateStr) return null
  try {
    if (!localize) {
      // Non-localized: parse directly without timezone conversion
      const parts = dateStr.split('-')
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10)
        const day = parseInt(parts[2], 10)
        
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          const monthName = monthNames[month - 1] || ''
          return `${monthName} ${day}, ${year}`
        }
      }
      
      // Fallback: try parsing as UTC
      const date = new Date(dateStr + 'T00:00:00Z')
      if (!isNaN(date.getTime())) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return `${monthNames[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`
      }
    } else {
      // Localized: convert to user timezone
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    }
    
    return null
  } catch {
    return null
  }
}

// Format encounter count with commas
function formatEncounterCount(count) {
  if (!count && count !== 0) return null
  return Number(count).toLocaleString()
}

export default function InfoBox({ shiny, points, customText, localizeDates = true, showOnMobile = false }) {
  const boxRef = useRef(null)

  useEffect(() => {
    const box = boxRef.current
    if (!box) return

    const span = box.parentElement
    if (!span) return

    const handleMouseEnter = () => {
      const spanRect = span.getBoundingClientRect()
      const viewportWidth = document.documentElement.clientWidth
      const viewportHeight = document.documentElement.clientHeight
      const isMobile = window.innerWidth <= 900
      const boxWidth = isMobile ? 100 : 180
      const boxHeight = box.offsetHeight

      const parentDiv = span.parentElement
      const isFavorite = parentDiv && parentDiv.className && parentDiv.className.includes('bigShiny')

      let left

      if (isFavorite) {
        left = spanRect.right + (isMobile ? 25 : 60)
      } else {
        const fitsRight = spanRect.right + boxWidth + 8 <= viewportWidth
        const fitsLeft = spanRect.left - boxWidth - 8 >= 0

        if (fitsRight) {
          left = spanRect.right + 8
        } else if (fitsLeft) {
          left = spanRect.left - boxWidth - 8
        } else {
          left = spanRect.right + 8
        }
      }

      let top = spanRect.top + spanRect.height / 2 - boxHeight / 2
      top = Math.max(8, Math.min(top, viewportHeight - boxHeight - 8))

      box.style.left = left + 'px'
      box.style.top = top + 'px'
    }

    // Only attach hover listener if not showing on mobile
    if (!showOnMobile) {
      span.addEventListener('mouseenter', handleMouseEnter)
      return () => span.removeEventListener('mouseenter', handleMouseEnter)
    }

    // For mobile, position the box at the center when showOnMobile is true
    if (showOnMobile) {
      const spanRect = span.getBoundingClientRect()
      const viewportWidth = document.documentElement.clientWidth
      const viewportHeight = document.documentElement.clientHeight
      const boxWidth = 180
      const boxHeight = box.offsetHeight

      let left = spanRect.right + 8
      const fitsRight = spanRect.right + boxWidth + 8 <= viewportWidth
      if (!fitsRight) {
        left = Math.max(8, spanRect.left - boxWidth - 8)
      }

      let top = spanRect.top + spanRect.height / 2 - boxHeight / 2
      top = Math.max(8, Math.min(top, viewportHeight - boxHeight - 8))

      box.style.left = left + 'px'
      box.style.top = top + 'px'
    }
  }, [showOnMobile])

  const activeTraits = TRAIT_CHECKS.filter(
    t => shiny[t.key]?.toLowerCase() === 'yes'
  )

  // Get API fields that exist and are not null
  const activeApiFields = useMemo(() => {
    return API_FIELDS.filter(field => {
      const value = shiny[field.key] ?? (field.fallback ? shiny[field.fallback] : undefined)
      if (value === null || value === undefined || value === '') return false
      return true
    }).map(field => {
      const raw = shiny[field.key] ?? (field.fallback ? shiny[field.fallback] : undefined)
      return {
        ...field,
        value: field.key === 'date_caught'
          ? formatDate(raw, localizeDates)
          : field.key === 'encounter_count'
          ? formatEncounterCount(raw)
          : raw
      }
    })
  }, [shiny, localizeDates])

  let reactionUrl = shiny['Reaction Link']?.trim()
  if (reactionUrl && !/^https?:\/\//i.test(reactionUrl)) {
    reactionUrl = 'https://' + reactionUrl
  }

  return (
    <div 
      className={`${styles.infoBox} ${showOnMobile ? styles.showMobile : ''}`} 
      ref={boxRef}
      data-show-mobile={showOnMobile}
    >
      <strong>{customText || shiny.Pokemon}</strong>
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
      {activeApiFields.length > 0 && (
        <div className={styles.apiDetails}>
          {activeApiFields.map(field => (
            <div key={field.key} className={styles.detailRow}>
              <span className={styles.label}>{field.label}:</span>
              <span className={styles.value}>{field.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}