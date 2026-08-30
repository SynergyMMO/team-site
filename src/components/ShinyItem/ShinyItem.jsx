import { memo, useMemo, useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import InfoBox from '../InfoBox/InfoBox'
import { getLocalPokemonGif, onGifError, getBasePokemonName } from '../../utils/pokemon'
import styles from './ShinyItem.module.css'

// Mapping of traits to CSS classes
const TRAIT_CLASSES = {
  Alpha: ['alphaPokemon', 'glowAlpha'],
  'Secret Shiny': ['glowPokemon'],
  Favourite: ['favouritePokemon'],
}

// Mapping of icons — use base URL prefix for public asset paths
const BASE = import.meta.env.BASE_URL || '/'
const ICON_MAP = {
  'Secret Shiny': [`${BASE}images/Shiny Showcase/secretshiny.png`, 'secretIcon'],
  'Honey Tree': [`${BASE}images/Shiny Showcase/honey.png`, 'honeyIcon'],
  Egg: [`${BASE}images/Shiny Showcase/egg.png`, 'eggIcon'],
  Safari: [`${BASE}images/Shiny Showcase/safari.png`, 'safariIcon'],
  Fossil: [`${BASE}images/Shiny Showcase/fossil.png`, 'fossilIcon'],
  Fishing: [`${BASE}images/Shiny Showcase/fishing.png`, 'fishingIcon'],
  Swarm: [`${BASE}images/Shiny Showcase/swarm.png`, 'swarmIcon'],
  Headbutt: [`${BASE}images/Shiny Showcase/headbutt.png`, 'headbuttIcon'],
  Pkid: [`${BASE}images/pkid.png`, 'pkidIcon'],
  Event: [`${BASE}images/Shiny Showcase/event.png`, 'eventIcon'],
  MysteriousBall: [`${BASE}images/Shiny Showcase/mysteriousball.gif`, 'mysteriousballGif'],
  Favourite: [`${BASE}images/Shiny Showcase/heart.png`, 'favouriteHeart'],
}

const ICON_TITLES = {
  Pkid: 'Particle: PKid',
}

// Detect if device is mobile
function isMobileDevice() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera
  // Check for common mobile user agents
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())
  // Also check for touch capability
  const hasTouch = () => {
    return (
      ('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0) ||
      (navigator.msMaxTouchPoints > 0)
    )
  }
  return isMobile || hasTouch()
}
function getShinyWarsBanner(shiny) {
  if (!shiny) return null

  // 1. ISO Date check
  const dateStr = shiny.date_caught || shiny.Date || shiny['Caught Date']
  if (dateStr) {
    const caughtDate = new Date(dateStr).getTime()
    if (!isNaN(caughtDate)) {
      const sw2026Start = Date.UTC(2026, 7, 1, 0, 0, 0)
      const sw2026End = Date.UTC(2026, 7, 28, 23, 59, 0)

      const sw2025Start = Date.UTC(2025, 6, 11, 0, 0, 0)
      const sw2025End = Date.UTC(2025, 7, 8, 0, 0, 0)

      const sw2024Start = Date.UTC(2024, 6, 22, 0, 0, 0)
      const sw2024End = Date.UTC(2024, 8, 22, 0, 0, 0)

      if (caughtDate >= sw2026Start && caughtDate <= sw2026End) {
        return { shortText: 'SW26', fullText: 'Shiny Wars 2026', year: '2026' }
      }
      if (caughtDate >= sw2025Start && caughtDate <= sw2025End) {
        return { shortText: 'SW25', fullText: 'Shiny Wars 2025', year: '2025' }
      }
      if (caughtDate >= sw2024Start && caughtDate <= sw2024End) {
        return { shortText: 'SW24', fullText: 'Shiny Wars 2024', year: '2024' }
      }
    }
  }

  // 2. Month/Year fallback check
  const month = shiny.Month?.trim()
  const year = String(shiny.Year || '').trim()

  if (year === '2026' && month === 'August') {
    return { shortText: 'SW26', fullText: 'Shiny Wars 2026', year: '2026' }
  }
  if (year === '2025' && (month === 'July' || month === 'August')) {
    return { shortText: 'SW25', fullText: 'Shiny Wars 2025', year: '2025' }
  }
  if (year === '2024' && (month === 'July' || month === 'August' || month === 'September')) {
    return { shortText: 'SW24', fullText: 'Shiny Wars 2024', year: '2024' }
  }

  return null
}

function ShinyItem({ shiny, points, userName, localizeDates = true }) {
  const navigate = useNavigate()
  const shinyGifPath = useMemo(() => getLocalPokemonGif(shiny.Pokemon), [shiny.Pokemon])
  const [isMobile] = useState(isMobileDevice())
  const [showInfoBoxMobile, setShowInfoBoxMobile] = useState(false)
  const wrapperRef = useRef(null)
  const lastTapTimeRef = useRef(0)
  const tapTimeoutRef = useRef(null)
  const lastScrollTimeRef = useRef(0)
  const lastScrollYRef = useRef(0)

  // Container CSS classes based on traits
  const containerClasses = useMemo(() => {
    const classes = [styles.gifContainer]
    Object.entries(TRAIT_CLASSES).forEach(([key, classNames]) => {
      if (shiny[key]?.toLowerCase() === 'yes') {
        classNames.forEach(c => classes.push(styles[c]))
      }
    })
    return classes.join(' ')
  }, [shiny])

const bannerInfo = useMemo(() => {
  return getShinyWarsBanner(shiny)
}, [shiny])
  const icons = useMemo(() => {
    const iconList = []
    const hasEgg = shiny.Egg?.toLowerCase() === 'yes'

    Object.entries(ICON_MAP).forEach(([key, [src, cls]]) => {
      if (shiny[key]?.toLowerCase() === 'yes') {
        const extraClass = [styles[cls]]
        if (key === 'Pkid' && hasEgg) {
          extraClass.push(styles.pkidWithEgg)
        }
        iconList.push(
          <img
            key={key}
            src={src}
            className={extraClass.join(' ')}
            alt={key}
            title={ICON_TITLES[key] || key}
            width="20"
            height="20"
            loading="lazy"
          />
        )
      }
    })

    let reactionUrl = shiny['Reaction Link']?.trim()
    if (reactionUrl && !/^https?:\/\//i.test(reactionUrl)) {
      reactionUrl = 'https://' + reactionUrl
    }
    if (reactionUrl) {
      iconList.push(
        <img
          key="reaction"
          src={`${BASE}images/Shiny Showcase/reaction.png`}
          className={styles.reactionIcon}
          alt="Reaction"
          width="18"
          height="18"
          loading="lazy"
          onClick={e => {
            e.stopPropagation()
            window.open(reactionUrl, '_blank')
          }}
        />
      )
    }

    return iconList
  }, [shiny])

  const isSold = shiny.Sold?.toLowerCase() === 'yes'

  // Conditional override for InfoBox text
  const infoText = userName === 'Strength' && shiny.Pokemon === 'zorua'
    ? 'Never forget reactive gas...'
    : shiny.infoText

  // Handle gif click for mobile and desktop
  const handleGifClick = (e) => {
    // On mobile, prevent default click behavior to avoid double navigation
    if (isMobile) {
      e.preventDefault()
      return
    }
    // Desktop: navigate immediately
    navigate(`/pokemon/${getBasePokemonName(shiny.Pokemon).toLowerCase()}`)
  }

  // Handle double-tap on mobile
  const handleGifTouchEnd = () => {
    if (!isMobile) return

    // Ignore touch events that happen within 300ms of a scroll event
    const now = Date.now()
    if (now - lastScrollTimeRef.current < 300) {
      return
    }

    const timeSinceLastTap = now - lastTapTimeRef.current

    if (timeSinceLastTap < 500) {
      // Double tap detected - navigate
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current)
      lastTapTimeRef.current = 0
      setShowInfoBoxMobile(false) // Close the InfoBox before navigating
      navigate(`/pokemon/${getBasePokemonName(shiny.Pokemon).toLowerCase()}`)
    } else {
      // First tap - show InfoBox
      lastTapTimeRef.current = now
      setShowInfoBoxMobile(true)
      
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current)
      tapTimeoutRef.current = setTimeout(() => {
        lastTapTimeRef.current = 0
      }, 500)
    }
  }

  // Close InfoBox on outside click/touch for mobile and on scroll
  useEffect(() => {
    if (!isMobile || !showInfoBoxMobile) return

    // Initialize scroll position when info box is shown
    lastScrollYRef.current = window.scrollY || window.pageYOffset

    const handleOutsideClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowInfoBoxMobile(false)
      }
    }

    const handleOutsideTouch = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowInfoBoxMobile(false)
      }
    }

    // Use requestAnimationFrame to continuously check scroll position
    // This captures momentum scrolling on mobile which doesn't fire scroll events
    let rafId = null
    const checkScroll = () => {
      const currentScrollY = window.scrollY || window.pageYOffset
      const scrollChanged = Math.abs(currentScrollY - lastScrollYRef.current) > 2
      
      if (scrollChanged) {
        lastScrollYRef.current = currentScrollY
        lastScrollTimeRef.current = Date.now()
        setShowInfoBoxMobile(false)
        return // Stop monitoring after scroll detected
      }
      
      // Continue checking for scroll
      rafId = requestAnimationFrame(checkScroll)
    }

    // Start the RAF loop
    rafId = requestAnimationFrame(checkScroll)

    // Also attach touch/click listeners for catching outside interactions
    document.addEventListener('click', handleOutsideClick)
    document.addEventListener('touchstart', handleOutsideTouch)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      document.removeEventListener('click', handleOutsideClick)
      document.removeEventListener('touchstart', handleOutsideTouch)
    }
  }, [isMobile, showInfoBoxMobile])

  return (
    <span className={styles.wrapper} ref={wrapperRef} data-mobile={isMobile} data-show-infobox={isMobile && showInfoBoxMobile}>
  <div 
    className={containerClasses} 
    title={bannerInfo ? bannerInfo.fullText : undefined}
  >
    {/* Shortened Badge Text ("SW24"), Full Tooltip on Hover */}
    {bannerInfo && (
      <span 
        className={`${styles.shinyWarsBanner} ${styles[`sw${bannerInfo.year}`]}`}
        title={bannerInfo.fullText}
      >
        {bannerInfo.shortText}
      </span>
    )}

    {icons}
    
    <img
      src={shinyGifPath}
      alt={shiny.Pokemon}
      /* Hovering the GIF displays full banner name */
      title={bannerInfo ? bannerInfo.fullText : shiny.Pokemon}
      className={`${styles.shinyGif} ${isSold ? styles.soldPokemon : ''} ${styles.clickable}`}
      width="80"
      height="80"
      loading="lazy"
      onError={onGifError(shiny.Pokemon)}
      onClick={handleGifClick}
      onTouchEnd={handleGifTouchEnd}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          navigate(`/pokemon/${getBasePokemonName(shiny.Pokemon).toLowerCase()}`)
        }
      }}
    />
  </div>
  <InfoBox shiny={shiny} points={points} customText={infoText} localizeDates={localizeDates} showOnMobile={isMobile && showInfoBoxMobile} />
</span>
  )
}

export default memo(ShinyItem)
