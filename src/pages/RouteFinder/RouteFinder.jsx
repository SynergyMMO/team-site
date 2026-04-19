import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import { getAssetUrl } from '../../utils/assets'
import { getLocalPokemonGif, normalizePokemonName, onGifError } from '../../utils/pokemon'
import encounterPercents from '../../data/encounter_percents.json'
import pokemonData from '../../data/pokemmo_data/pokemon-data.json'
import styles from './RouteFinder.module.css'

const TARGET_TIERS = new Set([0, 1, 2, 3])

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

function flattenRoutes() {
  return Object.entries(encounterPercents).flatMap(([region, routes]) =>
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

      return {
        id: `${region}-${routeName}-${variation || variationIndex}`,
        region,
        routeName: baseRouteName,
        displayName,
        variation,
        credit: variationData?.credit || '',
        total,
        pokemon,
        routeSearch: normalizeSearch(`${region} ${routeName} ${displayName} ${variation}`),
      }
    }))
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

function RouteCard({ route, pokemonFilter }) {
  const pokemonNeedle = normalizePokemonKey(pokemonFilter)
  const targetPokemon = route.pokemon.filter(mon => {
    const isSearchedPokemon = pokemonNeedle && normalizePokemonKey(mon.name).includes(pokemonNeedle)
    return isSearchedPokemon || TARGET_TIERS.has(mon.tier)
  })
  const targetNames = new Set(targetPokemon.map(mon => normalizePokemonKey(mon.name)))
  const phasePokemon = route.pokemon.filter(mon => !targetNames.has(normalizePokemonKey(mon.name)))

  return (
    <article className={styles.routeCard}>
      <header className={styles.routeHeader}>
        <div>
          <p className={styles.regionLabel}>{route.region}</p>
          <h2>{route.displayName}</h2>
        </div>
        <div className={styles.routeMeta}>
          <span>Total Encounters Tracked: {route.total.toLocaleString()}</span>
          {route.credit && <span>Credit: {route.credit}</span>}
        </div>
      </header>

      {targetPokemon.length > 0 && (
        <section className={styles.monSection}>
          <h3>Target Mons</h3>
          <div className={styles.monGrid}>
            {targetPokemon.map(mon => <PokemonPill key={mon.name} mon={mon} role="target" />)}
          </div>
        </section>
      )}

      <section className={styles.monSection}>
        <h3>{targetPokemon.length > 0 ? 'Phases' : 'Pokemon Percentages'}</h3>
        <div className={styles.monGrid}>
          {phasePokemon.map(mon => <PokemonPill key={mon.name} mon={mon} role="phase" />)}
        </div>
      </section>
    </article>
  )
}

export default function RouteFinder() {
  const [pokemonFilter, setPokemonFilter] = useState('')
  const [routeFilter, setRouteFilter] = useState('')

  useDocumentHead({
    title: 'Route Finder',
    description: 'Search tracked PokeMMO route encounter percentages by Pokemon or route.',
    canonicalPath: '/route-finder/',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Route Finder', url: '/route-finder' },
    ],
  })

  const routes = useMemo(() => flattenRoutes(), [])
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

  const pokemonHasData = !pokemonNeedle || routes.some(route =>
    route.pokemon.some(mon => normalizePokemonKey(mon.name).includes(pokemonNeedle))
  )
  const routeHasData = !routeNeedle || routes.some(route => route.routeSearch.includes(routeNeedle))

  const filteredRoutes = routes
    .filter(route => {
      const routeMatches = !routeNeedle || route.routeSearch.includes(routeNeedle)
      const pokemonMatches = !pokemonNeedle || route.pokemon.some(mon => normalizePokemonKey(mon.name).includes(pokemonNeedle))
      return routeMatches && pokemonMatches
    })
    .sort((a, b) => {
      if (!pokemonNeedle) return a.displayName.localeCompare(b.displayName)
      const targetDiff = getRouteTargetPercent(b, pokemonNeedle) - getRouteTargetPercent(a, pokemonNeedle)
      if (targetDiff !== 0) return targetDiff
      return a.displayName.localeCompare(b.displayName)
    })

  let emptyText = ''
  if (pokemonNeedle && !pokemonHasData) {
    emptyText = `Unfortunately ${pokemonFilter.trim()} has no tracked data currently, if you would like to help and track this data for the website, please contact Hyper on discord! ohypers`
  } else if (routeNeedle && !routeHasData) {
    emptyText = `Unfortunately ${routeFilter.trim()} has no tracked data currently, if you would like to help and track this data for the website, please contact Hyper on discord! ohypers`
  } else if ((pokemonNeedle || routeNeedle) && filteredRoutes.length === 0) {
    emptyText = 'No tracked route currently matches both filters.'
  }

  return (
    <div className={styles.page}>
      <h1 className="page-title">Route Finder</h1>
      <img src={getAssetUrl('images/pagebreak.png')} alt="" className="pagebreak" />


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
      </p>

      {emptyText ? (
        <p className={styles.emptyState}>{emptyText}</p>
      ) : (
        <div className={styles.routeList}>
          {filteredRoutes.map(route => (
            <RouteCard key={route.id} route={route} pokemonFilter={pokemonFilter} />
          ))}
        </div>
      )}
    </div>
  )
}
