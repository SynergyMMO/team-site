import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { API } from '../../api/endpoints'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import { useEncounterPercents } from '../../hooks/useEncounterPercents'
import { getAssetUrl } from '../../utils/assets'
import { getLocalPokemonGif, normalizePokemonName, onGifError } from '../../utils/pokemon'
import generationData from '../../data/generation.json'
import pokemonData from '../../data/pokemmo_data/pokemon-data.json'
import styles from './RouteFinder.module.css'

const TARGET_TIERS = new Set([0, 1, 2, 3])
const BEST_ROUTE_TIERS = new Set([0, 1, 2])
const REGION_ORDER = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova']
const SUBMISSION_COOLDOWN_MS = 10 * 60 * 1000
const SUBMISSION_COOLDOWN_KEY = 'routeFinderSubmitCooldownUntil'
const MAX_SCREENSHOT_FILES = 3
const MAX_TOTAL_SCREENSHOT_BYTES = 5 * 1024 * 1024
const MAX_TOTAL_SCREENSHOT_MB = 5
const SHORT_WINDOW_SUBMISSION_LIMIT = 1
const SHORT_WINDOW_SUBMISSION_MINUTES = 10
const DAILY_SUBMISSION_LIMIT = 5
const TURNSTILE_SCRIPT_ID = 'cloudflare-turnstile-script'
const TURNSTILE_CONTAINER_ID = 'route-finder-turnstile'
const TURNSTILE_ACTION = 'route_finder_submit'
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAADBIYe2ydf-7nLPt'

function getRegionOrder(region) {
  const index = REGION_ORDER.indexOf(region)
  return index === -1 ? REGION_ORDER.length : index
}

function normalizeSearch(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019']/g, '')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
}

function normalizePokemonKey(value) {
  return normalizeSearch(value)
    .replace(/[♀]/g, 'f')
    .replace(/[♂]/g, 'm')
    .replace(/\s+/g, '-')
}

function formatPercent(encounters, total) {
  if (!total) return '0%'
  const percent = (encounters / total) * 100
  return `${percent.toFixed(percent >= 10 ? 1 : 2)}%`
}

function formatPercentValue(percent) {
  return `${percent.toFixed(percent >= 10 ? 1 : 2)}%`
}

function getTier(pokemon) {
  const key = normalizePokemonKey(pokemon)
  const data = pokemonData[key]
  return Number.isInteger(data?.shiny_tier) ? data.shiny_tier : null
}

function getRouteTargetPercent(route, pokemonNeedle) {
  if (!pokemonNeedle) return 0
  return route.pokemon.reduce((highest, mon) => {
    if (!normalizePokemonKey(mon.name).includes(pokemonNeedle)) return highest
    return Math.max(highest, mon.percent)
  }, 0)
}

function getRouteBestPercentTotal(route) {
  return route.pokemon.reduce((total, mon) => (
    BEST_ROUTE_TIERS.has(mon.tier) ? total + mon.percent : total
  ), 0)
}

function hasBestRouteTierPokemon(route) {
  return route.pokemon.some(mon => BEST_ROUTE_TIERS.has(mon.tier))
}

function getVariationEntries(routeData) {
  if (Array.isArray(routeData)) return routeData

  if (Array.isArray(routeData?.variations)) {
    return routeData.variations
  }

  if (routeData?.variations && typeof routeData.variations === 'object') {
    return Object.entries(routeData.variations).map(([variation, data]) => ({
      ...data,
      variation: data?.variation || variation,
    }))
  }

  return [routeData]
}

function getDisplayName(routeName, variationData) {
  const baseRouteName = String(variationData?.route || routeName || '').trim()
  const variation = String(variationData?.variation || '').trim()

  if (!variation) return baseRouteName

  const variationSuffix = ` - ${variation}`
  if (baseRouteName.endsWith(variationSuffix)) return baseRouteName

  return `${baseRouteName}${variationSuffix}`
}

function buildEvolutionFamilyLookup() {
  const lookup = new Map()

  Object.values(generationData).forEach((generationFamilies) => {
    generationFamilies.forEach((family) => {
      const normalizedFamily = family.map(member => normalizePokemonKey(member))
      normalizedFamily.forEach((member) => {
        lookup.set(member, normalizedFamily)
      })
    })
  })

  return lookup
}

function sortRoutesByRegionThenName(a, b) {
  const regionDiff = getRegionOrder(a.region) - getRegionOrder(b.region)
  if (regionDiff !== 0) return regionDiff
  return a.displayName.localeCompare(b.displayName)
}

function getInitialCooldownRemaining() {
  if (typeof window === 'undefined') return 0

  const storedValue = Number(window.localStorage.getItem(SUBMISSION_COOLDOWN_KEY) || 0)
  if (!storedValue) return 0

  return Math.max(0, storedValue - Date.now())
}

function formatCooldown(msRemaining) {
  const totalSeconds = Math.ceil(msRemaining / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function getTotalFileBytes(files) {
  return files.reduce((total, file) => total + (file?.size || 0), 0)
}

function mergeScreenshotFiles(existingFiles, nextFiles) {
  const seen = new Set()

  return [...existingFiles, ...nextFiles].filter((file) => {
    const key = `${file.name}-${file.lastModified}-${file.size}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function flattenRoutes(encounterPercents = {}) {
  return Object.entries(encounterPercents || {}).flatMap(([region, routes]) =>
    Object.entries(routes || {}).flatMap(([routeName, routeData]) => getVariationEntries(routeData).map((variationData, variationIndex) => {
      const variation = String(variationData?.variation || '').trim()
      const baseRouteName = String(variationData?.route || routeName || '').trim()
      const displayName = getDisplayName(routeName, variationData)
      const total = Number(variationData?.total) || 0
      const pokemon = (variationData?.data || [])
        .map(entry => {
          const encounters = Number(entry.encounters) || 0
          const tier = getTier(entry.pokemon)
          return {
            name: entry.pokemon,
            encounters,
            percent: total ? (encounters / total) * 100 : 0,
            percentLabel: formatPercent(encounters, total),
            tier,
          }
        })
        .sort((a, b) => b.encounters - a.encounters)
      const rarePercent = pokemon.reduce((totalRarePercent, mon) => (
        BEST_ROUTE_TIERS.has(mon.tier) ? totalRarePercent + mon.percent : totalRarePercent
      ), 0)

      return {
        id: `${region}-${routeName}-${variation || variationIndex}`,
        region,
        routeName: baseRouteName,
        displayName,
        variation,
        credit: variationData?.credit || '',
        total,
        rarePercent,
        rarePercentLabel: formatPercentValue(rarePercent),
        pokemon,
        routeSearch: normalizeSearch(`${region} ${routeName} ${displayName} ${variation}`),
      }
    }))
  )
}

function getTopContributors(routes) {
  const contributors = new Map()

  routes.forEach((route) => {
    const names = String(route.credit || '')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)

    names.forEach((name) => {
      const previous = contributors.get(name) || { name, routes: 0, encounters: 0 }
      contributors.set(name, {
        ...previous,
        routes: previous.routes + 1,
        encounters: previous.encounters + route.total,
      })
    })
  })

  return Array.from(contributors.values())
    .sort((a, b) => b.routes - a.routes || b.encounters - a.encounters || a.name.localeCompare(b.name))
}

function TopContributorsDropdown({ contributors }) {
  const totalRoutes = contributors.reduce((sum, contributor) => sum + contributor.routes, 0)

  return (
    <details className={styles.topContributors}>
      <summary className={styles.topContributorsSummary}>
        <span>Top Contributors</span>
        <small>{totalRoutes.toLocaleString()} route credits</small>
      </summary>
      <ol className={styles.topContributorsList}>
        {contributors.map((contributor, index) => (
          <li key={contributor.name} className={styles.topContributorRow}>
            <span className={styles.contributorRank}>#{index + 1}</span>
            <span className={styles.contributorName}>{contributor.name}</span>
            <span className={styles.contributorStats}>
              {contributor.routes.toLocaleString()} {contributor.routes === 1 ? 'route' : 'routes'}
            </span>
          </li>
        ))}
      </ol>
    </details>
  )
}

function PokemonPill({ mon, role }) {
  const tierLabel = mon.tier !== null ? `Tier ${mon.tier}` : null

  return (
    <Link to={`/pokemon/${normalizePokemonName(mon.name)}/`} className={`${styles.monPill} ${role === 'target' ? styles.targetPill : styles.phasePill}`}>
      <img
        src={getLocalPokemonGif(mon.name)}
        alt={mon.name}
        className={styles.monSprite}
        onError={onGifError(mon.name)}
        loading="lazy"
      />
      <span className={styles.monName}>{mon.name}</span>
      <span className={styles.monPercent}>{mon.percentLabel}</span>
      <span className={styles.monEncounters}>{mon.encounters.toLocaleString()} encounters</span>
      {tierLabel && <span className={styles.tierBadge}>{tierLabel}</span>}
    </Link>
  )
}

function RouteCard({ route, pokemonFilter, pokemonFamilyKeys, sortMode }) {
  const pokemonNeedle = normalizePokemonKey(pokemonFilter)
  const displayTargetTiers = (sortMode === 'best' || sortMode === 'worst') ? BEST_ROUTE_TIERS : TARGET_TIERS
  const targetPokemon = route.pokemon.filter(mon => {
    const monKey = normalizePokemonKey(mon.name)
    const isSearchedPokemon = pokemonNeedle && (
      monKey.includes(pokemonNeedle)
      || pokemonFamilyKeys.has(monKey)
    )
    return isSearchedPokemon || displayTargetTiers.has(mon.tier)
  })
  const targetNames = new Set(targetPokemon.map(mon => normalizePokemonKey(mon.name)))
  const phasePokemon = route.pokemon.filter(mon => !targetNames.has(normalizePokemonKey(mon.name)))
  const targetHeading = (sortMode === 'best' || sortMode === 'worst') ? 'Tier 0-2 Targets' : 'Target Mons'

  return (
    <article className={styles.routeCard}>
      <header className={styles.routeHeader}>
        <div>
          <p className={styles.regionLabel}>{route.region}</p>
          <h2>{route.displayName}</h2>
        </div>
        <div className={styles.routeMeta}>
          <span>Total Encounters Tracked: {route.total.toLocaleString()}</span>
          <span>Total Rare %: {route.rarePercentLabel}</span>
          {route.credit && <span>Credit: {route.credit}</span>}
        </div>
      </header>

      {targetPokemon.length > 0 && (
        <section className={styles.monSection}>
          <h3>{targetHeading}</h3>
          <div className={styles.monGrid}>
            {targetPokemon.map((mon, index) => (
              <PokemonPill key={`${route.id}-target-${mon.name}-${index}`} mon={mon} role="target" />
            ))}
          </div>
        </section>
      )}

      <section className={styles.monSection}>
        <h3>{targetPokemon.length > 0 ? 'Phases' : 'Pokemon Percentages'}</h3>
        <div className={styles.monGrid}>
          {phasePokemon.map((mon, index) => (
            <PokemonPill key={`${route.id}-phase-${mon.name}-${index}`} mon={mon} role="phase" />
          ))}
        </div>
      </section>
    </article>
  )
}

export default function RouteFinder() {
  const { data: encounterPercents = {} } = useEncounterPercents()
  const [pokemonFilter, setPokemonFilter] = useState('')
  const [routeFilter, setRouteFilter] = useState('')
  const [sortMode, setSortMode] = useState('default')
  const [isSubmitFormOpen, setIsSubmitFormOpen] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [screenshotFiles, setScreenshotFiles] = useState([])
  const [cooldownRemaining, setCooldownRemaining] = useState(() => getInitialCooldownRemaining())
  const [isTurnstileReady, setIsTurnstileReady] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileError, setTurnstileError] = useState('')
  const [turnstileWidgetId, setTurnstileWidgetId] = useState(null)
  const screenshotInputRef = useRef(null)
  const [submitForm, setSubmitForm] = useState({
    region: REGION_ORDER[0],
    route: '',
    variation: '',
    credit: '',
    discord: '',
    encounterData: '',
    notes: '',
  })

  useDocumentHead({
    title: 'Route Finder',
    description: 'Search tracked PokeMMO route encounter percentages by Pokemon or route.',
    canonicalPath: '/route-finder/',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Route Finder', url: '/route-finder' },
    ],
  })

  const routes = useMemo(() => flattenRoutes(encounterPercents), [encounterPercents])
  const evolutionFamilyLookup = useMemo(() => buildEvolutionFamilyLookup(), [])
  const topContributors = useMemo(() => getTopContributors(routes), [routes])
  const pokemonOptions = useMemo(() => {
    const names = new Set()
    routes.forEach(route => route.pokemon.forEach(mon => names.add(mon.name)))
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [routes])
  const routeOptions = useMemo(() => (
    [...new Set(routes.flatMap(route => [route.routeName, route.displayName]))].sort((a, b) => a.localeCompare(b))
  ), [routes])

  const pokemonNeedle = normalizePokemonKey(pokemonFilter)
  const routeNeedle = normalizeSearch(routeFilter)
  const shouldGroupByRegion = !pokemonNeedle && sortMode === 'default'
  const pokemonFamilyKeys = useMemo(() => {
    if (!pokemonNeedle) return new Set()

    const directFamily = evolutionFamilyLookup.get(pokemonNeedle)
    if (directFamily) return new Set(directFamily)

    const matchedFamilies = new Set()
    evolutionFamilyLookup.forEach((family, member) => {
      if (member.includes(pokemonNeedle)) {
        family.forEach(relative => matchedFamilies.add(relative))
      }
    })

    return matchedFamilies
  }, [evolutionFamilyLookup, pokemonNeedle])

  const pokemonHasData = !pokemonNeedle || routes.some(route =>
    route.pokemon.some(mon => {
      const monKey = normalizePokemonKey(mon.name)
      return monKey.includes(pokemonNeedle) || pokemonFamilyKeys.has(monKey)
    })
  )
  const routeHasData = !routeNeedle || routes.some(route => route.routeSearch.includes(routeNeedle))

  useEffect(() => {
    if (!cooldownRemaining) return undefined

    const intervalId = window.setInterval(() => {
      const remaining = getInitialCooldownRemaining()
      setCooldownRemaining(remaining)

      if (!remaining) {
        window.localStorage.removeItem(SUBMISSION_COOLDOWN_KEY)
      }
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [cooldownRemaining])

  useEffect(() => {
    if (typeof window === 'undefined' || !TURNSTILE_SITE_KEY) return undefined

    if (window.turnstile) {
      setIsTurnstileReady(true)
      return undefined
    }

    const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID)
    if (existingScript) {
      const handleLoad = () => setIsTurnstileReady(true)
      existingScript.addEventListener('load', handleLoad)
      return () => existingScript.removeEventListener('load', handleLoad)
    }

    const script = document.createElement('script')
    script.id = TURNSTILE_SCRIPT_ID
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.onload = () => setIsTurnstileReady(true)
    document.head.appendChild(script)

    return undefined
  }, [])

  useEffect(() => {
    if (!isSubmitFormOpen) {
      if (window.turnstile && turnstileWidgetId !== null) {
        window.turnstile.remove(turnstileWidgetId)
      }
      setTurnstileWidgetId(null)
      setTurnstileToken('')
      setTurnstileError('')
      return
    }

    if (!TURNSTILE_SITE_KEY) {
      setTurnstileError('Captcha is not configured yet. Please try again later.')
      return
    }

    if (!isTurnstileReady || turnstileWidgetId !== null || !window.turnstile) return

    const container = document.getElementById(TURNSTILE_CONTAINER_ID)
    if (!container) return

    const widgetId = window.turnstile.render(`#${TURNSTILE_CONTAINER_ID}`, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: 'auto',
      size: 'flexible',
      action: TURNSTILE_ACTION,
      callback: (token) => {
        setTurnstileToken(token)
        setTurnstileError('')
      },
      'error-callback': () => {
        setTurnstileToken('')
        setTurnstileError('Captcha verification failed. Please try again.')
      },
      'expired-callback': () => {
        setTurnstileToken('')
        setTurnstileError('Captcha expired. Please complete it again.')
      },
      'timeout-callback': () => {
        setTurnstileToken('')
        setTurnstileError('Captcha timed out. Please complete it again.')
      },
    })

    setTurnstileWidgetId(widgetId)
  }, [isSubmitFormOpen, isTurnstileReady, turnstileWidgetId])

  const filteredRoutes = routes
    .filter(route => {
      const routeMatches = !routeNeedle || route.routeSearch.includes(routeNeedle)
      const pokemonMatches = !pokemonNeedle || route.pokemon.some(mon => {
        const monKey = normalizePokemonKey(mon.name)
        return monKey.includes(pokemonNeedle) || pokemonFamilyKeys.has(monKey)
      })
      const sortMatches = (sortMode !== 'best' && sortMode !== 'worst') || hasBestRouteTierPokemon(route)
      return routeMatches && pokemonMatches && sortMatches
    })
    .sort((a, b) => {
      if (sortMode === 'best') {
        const bestDiff = getRouteBestPercentTotal(b) - getRouteBestPercentTotal(a)
        if (bestDiff !== 0) return bestDiff
        return sortRoutesByRegionThenName(a, b)
      }

      if (sortMode === 'worst') {
        const worstDiff = getRouteBestPercentTotal(a) - getRouteBestPercentTotal(b)
        if (worstDiff !== 0) return worstDiff
        return sortRoutesByRegionThenName(a, b)
      }

      if (sortMode === 'encounters-desc') {
        const encounterDiff = b.total - a.total
        if (encounterDiff !== 0) return encounterDiff
        return sortRoutesByRegionThenName(a, b)
      }

      if (sortMode === 'encounters-asc') {
        const encounterDiff = a.total - b.total
        if (encounterDiff !== 0) return encounterDiff
        return sortRoutesByRegionThenName(a, b)
      }

      if (!pokemonNeedle) return sortRoutesByRegionThenName(a, b)

      const targetDiff = getRouteTargetPercent(b, pokemonNeedle) - getRouteTargetPercent(a, pokemonNeedle)
      if (targetDiff !== 0) return targetDiff
      return sortRoutesByRegionThenName(a, b)
    })
  const filteredTotalEncounters = filteredRoutes.reduce((sum, route) => sum + route.total, 0)
  const routesByRegion = useMemo(() => {
    if (!shouldGroupByRegion) return []

    const groupedRoutes = new Map()
    filteredRoutes.forEach((route) => {
      const existingRoutes = groupedRoutes.get(route.region) || []
      existingRoutes.push(route)
      groupedRoutes.set(route.region, existingRoutes)
    })

    return [...groupedRoutes.entries()]
      .sort(([regionA], [regionB]) => getRegionOrder(regionA) - getRegionOrder(regionB))
  }, [filteredRoutes, shouldGroupByRegion])

  let emptyText = ''
  if (pokemonNeedle && !pokemonHasData) {
    emptyText = `Unfortunately ${pokemonFilter.trim()} has no tracked data currently, if you would like to help and track this data for the website, please contact Hyper on discord! ohypers`
  } else if (routeNeedle && !routeHasData) {
    emptyText = `Unfortunately ${routeFilter.trim()} has no tracked data currently, if you would like to help and track this data for the website, please contact Hyper on discord! ohypers`
  } else if ((pokemonNeedle || routeNeedle) && filteredRoutes.length === 0) {
    emptyText = 'No tracked route currently matches both filters.'
  }

  const handleSubmitFormChange = (field) => (event) => {
    setSubmitForm((current) => ({
      ...current,
      [field]: event.target.value,
    }))
  }

  const clearScreenshotInput = () => {
    if (screenshotInputRef.current) {
      screenshotInputRef.current.value = ''
    }
  }

  const closeSubmitForm = () => {
    setIsSubmitFormOpen(false)
    setSubmitError('')
    setSubmitSuccess('')
    setIsSubmitting(false)
    setScreenshotFiles([])
    clearScreenshotInput()
  }

  const openSubmitForm = () => {
    setIsSubmitFormOpen(true)
    setSubmitError('')
    setSubmitSuccess('')
    setScreenshotFiles([])
    clearScreenshotInput()
  }

  const handleScreenshotChange = (event) => {
    const selectedFiles = Array.from(event.target.files || [])
    const mergedFiles = mergeScreenshotFiles(screenshotFiles, selectedFiles)

    if (mergedFiles.length > MAX_SCREENSHOT_FILES) {
      setSubmitError(`You can upload up to ${MAX_SCREENSHOT_FILES} screenshots per submission.`)
      clearScreenshotInput()
      return
    }

    if (getTotalFileBytes(mergedFiles) > MAX_TOTAL_SCREENSHOT_BYTES) {
      setSubmitError(`The total screenshot upload size must be ${MAX_TOTAL_SCREENSHOT_MB} MB or less.`)
      clearScreenshotInput()
      return
    }

    setScreenshotFiles(mergedFiles)
    setSubmitError('')
    clearScreenshotInput()
  }

  const resetTurnstile = () => {
    if (window.turnstile && turnstileWidgetId !== null) {
      window.turnstile.reset(turnstileWidgetId)
    }
    setTurnstileToken('')
    setTurnstileError('')
  }

  const handleSubmitData = async (event) => {
    event.preventDefault()

    if (cooldownRemaining > 0) {
      setSubmitError(`Please wait ${formatCooldown(cooldownRemaining)} before sending another submission.`)
      return
    }

    const trimmedRoute = submitForm.route.trim()
    const trimmedCredit = submitForm.credit.trim()
    if (!trimmedRoute || !trimmedCredit) {
      setSubmitError('Please add at least a route and credit before submitting.')
      return
    }

    if (!TURNSTILE_SITE_KEY) {
      setSubmitError('Captcha is not configured yet. Please try again later.')
      return
    }

    if (!turnstileToken) {
      setSubmitError(turnstileError || 'Please complete the captcha verification before sending.')
      return
    }

    if (screenshotFiles.length === 0) {
      setSubmitError('Please attach at least one screenshot before sending.')
      return
    }

    if (screenshotFiles.length > MAX_SCREENSHOT_FILES) {
      setSubmitError(`You can upload up to ${MAX_SCREENSHOT_FILES} screenshots per submission.`)
      return
    }

    if (getTotalFileBytes(screenshotFiles) > MAX_TOTAL_SCREENSHOT_BYTES) {
      setSubmitError(`The total screenshot upload size must be ${MAX_TOTAL_SCREENSHOT_MB} MB or less.`)
      return
    }

    setIsSubmitting(true)
    setSubmitError('')
    setSubmitSuccess('')

    const payload = new FormData()
    payload.append('region', submitForm.region)
    payload.append('route', trimmedRoute)
    payload.append('variation', submitForm.variation.trim())
    payload.append('credit', trimmedCredit)
    payload.append('discord', submitForm.discord.trim())
    payload.append('encounter_data', submitForm.encounterData.trim())
    payload.append('notes', submitForm.notes.trim())
    payload.append('cf-turnstile-response', turnstileToken)

    screenshotFiles.forEach((file) => {
      payload.append('attachment', file)
    })

    try {
      const response = await fetch(API.routeFinderSubmission, {
        method: 'POST',
        body: payload,
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'The form could not be sent right now.')
      }

      const nextCooldownUntil = Date.now() + SUBMISSION_COOLDOWN_MS
      window.localStorage.setItem(SUBMISSION_COOLDOWN_KEY, String(nextCooldownUntil))
      setCooldownRemaining(SUBMISSION_COOLDOWN_MS)
      setSubmitSuccess(`Submission sent successfully. Please wait ${formatCooldown(SUBMISSION_COOLDOWN_MS)} before sending another one.`)
      setSubmitForm({
        region: REGION_ORDER[0],
        route: '',
        variation: '',
        credit: '',
        discord: '',
        encounterData: '',
        notes: '',
      })
      setScreenshotFiles([])
      clearScreenshotInput()
      resetTurnstile()
    } catch (error) {
      setSubmitError(error.message || 'The form could not be sent right now.')
      resetTurnstile()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <h1 className="page-title">Route Finder</h1>
      <img src={getAssetUrl('images/pagebreak.png')} alt="" className="pagebreak" />

      <div className={styles.topControls}>
        <TopContributorsDropdown contributors={topContributors} />
        <button type="button" className={styles.submitButton} onClick={openSubmitForm}>
          Submit your own data!
        </button>
      </div>

      <details className={styles.infoDropdown} open>
        <summary>Page Information / Learn More!</summary>
        <p>
          This page is a WORK IN PROGRESS, and there is not much data currently, but the goal is to have as many routes tracked as possible, with as many encounters at that route as possible! If you plan on sitting at a route for a long period of time, consider starting a trip and tracking your encounters!  
        </p>
        <p>
          This is a page designed to help you pick the best route for your favourite shiny! All this information has been hand tracked by volunteers and is not official data, some information may be inaccurate, as routes may change based on seasons or time of day, I'd advise using these numbers as examples, but some numbers is better than no numbers!
        </p>
        <p>
          If you wish to help with this project please contact ohypers on discord.
        </p>
      </details>

      <section className={styles.searchPanel} aria-label="Route Finder filters">
        <label>
          <span>Pokemon</span>
          <input
            type="search"
            value={pokemonFilter}
            onChange={event => setPokemonFilter(event.target.value)}
            placeholder="Search Pokemon..."
            list="route-finder-pokemon"
          />
        </label>
        <label>
          <span>Routes</span>
          <input
            type="search"
            value={routeFilter}
            onChange={event => setRouteFilter(event.target.value)}
            placeholder="Search routes..."
            list="route-finder-routes"
          />
        </label>
        <label>
          <span>Order</span>
          <select value={sortMode} onChange={event => setSortMode(event.target.value)}>
            <option value="default">{pokemonNeedle ? 'Best match for Pokemon' : 'Region order'}</option>
            <option value="best">Best Routes (Tier 0-2 %)</option>
            <option value="worst">Worst Routes (Tier 0-2 %)</option>
            <option value="encounters-desc">Most Encounters Tracked</option>
            <option value="encounters-asc">Least Encounters Tracked</option>
          </select>
        </label>
        <datalist id="route-finder-pokemon">
          {pokemonOptions.map(name => <option value={name} key={name} />)}
        </datalist>
        <datalist id="route-finder-routes">
          {routeOptions.map(name => <option value={name} key={name} />)}
        </datalist>
      </section>

      {pokemonNeedle && pokemonHasData && (
        <section className={styles.activeTarget}>
          <span>Target Mon</span>
          <strong>{pokemonFilter.trim()}</strong>
        </section>
      )}

      <p className={styles.resultCount}>
        {filteredRoutes.length.toLocaleString()} tracked {filteredRoutes.length === 1 ? 'route' : 'routes'}
        <span>{filteredTotalEncounters.toLocaleString()} Total Encounters</span>
      </p>

      {emptyText ? (
        <p className={styles.emptyState}>{emptyText}</p>
      ) : (
        <div className={styles.routeList}>
          {!shouldGroupByRegion ? (
            filteredRoutes.map(route => (
              <RouteCard
                key={route.id}
                route={route}
                pokemonFilter={pokemonFilter}
                pokemonFamilyKeys={pokemonFamilyKeys}
                sortMode={sortMode}
              />
            ))
          ) : (
            routesByRegion.map(([region, regionRoutes]) => (
              <section key={region} aria-label={`${region} routes`}>
                <h2>{region}</h2>
                {regionRoutes.map(route => (
                  <RouteCard
                    key={route.id}
                    route={route}
                    pokemonFilter={pokemonFilter}
                    pokemonFamilyKeys={pokemonFamilyKeys}
                    sortMode={sortMode}
                  />
                ))}
              </section>
            ))
          )}
        </div>
      )}

      {isSubmitFormOpen && (
        <div className={styles.submitModalBackdrop} role="presentation" onClick={closeSubmitForm}>
          <section
            className={styles.submitModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="route-finder-submit-title"
            onClick={event => event.stopPropagation()}
          >
            <div className={styles.submitModalHeader}>
              <div>
                <p className={styles.submitEyebrow}>Community submissions</p>
                <h2 id="route-finder-submit-title">Send route data for review</h2>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={closeSubmitForm}
                aria-label="Close submission form"
              >
                x
              </button>
            </div>

            <p className={styles.submitDescription}>
              Fill out the form if you wish to submit your encounter data to the site, the data will be reviewed to ensure it remains accurate and will be added to the site if confirmed. We appreciate anyone who wishes to help with this project! If you have access to a discord account, we would rather you DM oHypers personally to ensure your data is accurate and you understand the criteria, although if you do not wish to do that, this form is good too!
            </p>

            <form className={styles.submitForm} onSubmit={handleSubmitData}>
              <label>
                <span>Region</span>
                <select value={submitForm.region} onChange={handleSubmitFormChange('region')}>
                  {REGION_ORDER.map(region => <option key={region} value={region}>{region}</option>)}
                </select>
              </label>

              <label>
                <span>Route</span>
                <input
                  type="text"
                  value={submitForm.route}
                  onChange={handleSubmitFormChange('route')}
                  placeholder="Route 1"
                  required
                />
              </label>

              <label>
                <span>Variation</span>
                <input
                  type="text"
                  value={submitForm.variation}
                  onChange={handleSubmitFormChange('variation')}
                  placeholder="Lures, Hordes, Time of Day etc"
                />
              </label>

              <label>
                <span>Credit</span>
                <input
                  type="text"
                  value={submitForm.credit}
                  onChange={handleSubmitFormChange('credit')}
                  placeholder="Your name / IGN"
                  required
                />
              </label>

              <label>
                <span>Your Discord</span>
                <input
                  type="text"
                  value={submitForm.discord}
                  onChange={handleSubmitFormChange('discord')}
                  placeholder="if you are happy with being contacted"
                />
              </label>

              <label className={styles.fullWidthField}>
                <span>Encounter data</span>
                <textarea
                  value={submitForm.encounterData}
                  onChange={handleSubmitFormChange('encounterData')}
                  placeholder={`Pikachu - 120\nPidgey - 80\nRattata - 40`}
                  rows={7}
                />
              </label>

              <label className={styles.fullWidthField}>
                <span>Screenshot upload</span>
                <input
                  ref={screenshotInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={handleScreenshotChange}
                />
                <small className={styles.fieldHint}>
                  Please attach between 1 and {MAX_SCREENSHOT_FILES} screenshots of your encounter counter trip, with {MAX_TOTAL_SCREENSHOT_MB} MB total across all files.
                </small>
                {screenshotFiles.length > 0 && (
                  <div className={styles.fileList}>
                    {screenshotFiles.map(file => (
                      <span key={`${file.name}-${file.lastModified}`} className={styles.fileName}>{file.name}</span>
                    ))}
                  </div>
                )}
              </label>

              <label className={styles.fullWidthField}>
                <span>Extra notes</span>
                <textarea
                  value={submitForm.notes}
                  onChange={handleSubmitFormChange('notes')}
                  placeholder="Mention here if you think this data might be inaccurate, or if there is something Hyper should know when reviewing the data. For example if this route has very different spawns during a certain time of day, or if there was an event that might have skewed the data such as swarms or alphas etc."
                  rows={4}
                />
              </label>

              <div className={styles.fullWidthField}>
            <div className={styles.submitLimits} aria-label="Submission limits">
              <strong>Submission limits</strong>
              <p>Upload up to {MAX_SCREENSHOT_FILES} screenshots per submission, with {MAX_TOTAL_SCREENSHOT_MB} MB total across all files.</p>
              <p>You can send {SHORT_WINDOW_SUBMISSION_LIMIT} submission every {SHORT_WINDOW_SUBMISSION_MINUTES} minutes, and up to {DAILY_SUBMISSION_LIMIT} submissions per day. This is to prevent spam, if you would like to submit more please contact ohypers on discord</p>
            </div>
            </div>

              <div className={styles.fullWidthField}>
                <span className={styles.turnstileLabel}>Captcha verification</span>
                <div id={TURNSTILE_CONTAINER_ID} className={styles.turnstileWrap} />
              </div>

              

              {submitError && <p className={styles.submitError}>{submitError}</p>}
              {submitSuccess && <p className={styles.submitSuccess}>{submitSuccess}</p>}
              {turnstileError && <p className={styles.submitError}>{turnstileError}</p>}
              {cooldownRemaining > 0 && (
                <p className={styles.submitCooldown}>
                  Submission cooldown active: {formatCooldown(cooldownRemaining)} remaining.
                </p>
              )}
              

              <div className={styles.submitActions}>
                <button type="button" className={styles.secondaryButton} onClick={closeSubmitForm}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
                  {isSubmitting ? 'Sending...' : cooldownRemaining > 0 ? `Wait ${formatCooldown(cooldownRemaining)}` : 'Send Data'}
                </button>
              </div>
              
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
