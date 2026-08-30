import { useRef, useEffect, useMemo } from 'react'
import styles from './InfoBox.module.css'

const TRAIT_CHECKS = [
  { key: 'Secret Shiny', label: 'Secret', cls: 'tagSecret' },
  { key: 'Alpha', label: 'Alpha', cls: 'tagAlpha' },
  { key: 'Egg', label: 'Egg', cls: 'tagEgg' },
  { key: 'Safari', label: 'Safari', cls: 'tagSafari' },
  { key: 'Honey Tree', label: 'Honey', cls: 'tagHoney' },
  { key: 'Fossil', label: 'Fossil', cls: 'tagFossil' },
  { key: 'Fishing', label: 'Fishing', cls: 'tagFishing' },
  { key: 'Swarm', label: 'Swarm', cls: 'tagSwarm' },
  { key: 'Headbutt', label: 'Headbutt', cls: 'tagHeadbutt' },
  { key: 'Pkid', label: 'Particle: PKid', cls: 'tagEvent' },
  { key: 'Event', label: 'Event', cls: 'tagEvent' },
  { key: 'Favourite', label: 'Favourite', cls: 'tagFav' },
  { key: 'Legendary', label: 'Legend', cls: 'tagLegend' },
  { key: 'MysteriousBall', label: 'Mystery', cls: 'tagMystery' },
  { key: 'Reaction', label: 'Reaction', cls: 'tagReaction' },
] 

const API_FIELDS = [
  { key: 'ivs', label: 'IVs' },
  { key: 'nature', label: 'Nature' },
  { key: 'location', label: 'Location', fallback: 'Location' },
  { key: 'encounter_method', label: 'Method', fallback: 'Encounter Type' },
  { key: 'date_caught', label: 'Caught' },
  { key: 'encounter_count', label: 'Encounters', fallback: 'Encounter Count' },
  { key: 'nickname', label: 'Nickname' },
  { key: 'variant', label: 'Variant' },
]

function getShinyWarsInfo(shiny) {
  if (!shiny) return null

  const dateStr = shiny.date_caught || shiny.Date || shiny['Caught Date'] || shiny.Caught
  if (dateStr) {
    const dateObj = new Date(dateStr)
    if (!isNaN(dateObj.getTime())) {
      const caughtDate = Date.UTC(
        dateObj.getUTCFullYear(),
        dateObj.getUTCMonth(),
        dateObj.getUTCDate()
      )

      const sw2026Start = Date.UTC(2026, 7, 1)   // Aug 1, 2026
      const sw2026End   = Date.UTC(2026, 7, 28)  // Aug 28, 2026

      const sw2025Start = Date.UTC(2025, 6, 11)  // Jul 11, 2025
      const sw2025End   = Date.UTC(2025, 7, 8)   // Aug 8, 2025

      const sw2024Start = Date.UTC(2024, 6, 22)  // Jul 22, 2024
      const sw2024End   = Date.UTC(2024, 8, 22)  // Sep 22, 2024

      if (caughtDate >= sw2026Start && caughtDate <= sw2026End) {
        return { label: 'Shiny Wars 2026', cls: 'tagShinyWars2026' }
      }
      if (caughtDate >= sw2025Start && caughtDate <= sw2025End) {
        return { label: 'Shiny Wars 2025', cls: 'tagShinyWars2025' }
      }
      if (caughtDate >= sw2024Start && caughtDate <= sw2024End) {
        return { label: 'Shiny Wars 2024', cls: 'tagShinyWars2024' }
      }

      // Exit early if date string existed but was out of event bounds
      return null
    }
  }

  // Fallback: only runs when no valid date string exists
  const month = shiny.Month?.trim()
  const year = String(shiny.Year || '').trim()

  if (year === '2026' && month === 'August') {
    return { label: 'Shiny Wars 2026', cls: 'tagShinyWars2026' }
  }
  if (year === '2025' && (month === 'July' || month === 'August')) {
    return { label: 'Shiny Wars 2025', cls: 'tagShinyWars2025' }
  }
  if (year === '2024' && (month === 'July' || month === 'August' || month === 'September')) {
    return { label: 'Shiny Wars 2024', cls: 'tagShinyWars2024' }
  }

  return null
}

// Format date to readable format
function formatDate(dateStr, localize = true) {
  if (!dateStr) return null
  try {
    if (!localize) {
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
      
      const date = new Date(dateStr + 'T00:00:00Z')
      if (!isNaN(date.getTime())) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return `${monthNames[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`
      }
    } else {
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

    if (!showOnMobile) {
      span.addEventListener('mouseenter', handleMouseEnter)
      return () => span.removeEventListener('mouseenter', handleMouseEnter)
    }

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

  const activeTraits = useMemo(() => {
    const traits = TRAIT_CHECKS.filter(
      t => shiny[t.key]?.toLowerCase() === 'yes'
    )
    const shinyWars = getShinyWarsInfo(shiny)
    if (shinyWars) {
      traits.unshift(shinyWars)
    }
    return traits
  }, [shiny])

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