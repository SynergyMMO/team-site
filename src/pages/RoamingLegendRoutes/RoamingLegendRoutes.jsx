import { useEffect, useMemo, useRef, useState } from 'react'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import { getLocalPokemonGif } from '../../utils/pokemon'
import { getDangerousPokemonWarnings } from '../../utils/dangerousPokemonWarnings'
import pokemonData from '../../data/pokemmo_data/pokemon-data.json'
import { ENABLED_REGIONS, formatRate, getRouteEncounters, getRouteOverview, getSeasonRows, isRareTarget, ROUTES, SEASONS } from './routeData'
import styles from './RoamingLegendRoutes.module.css'

const SEASON_SYMBOLS = { Spring: '✳', Summer: '☀', Autumn: '✦', Winter: '❄' }

function formatItem(item) {
  const special = { twistedspoon: 'TwistedSpoon', silverpowder: 'SilverPowder' }
  return special[item] || item.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ')
}

function EncounterCard({ row, time }) {
  const { pokemon, encounters } = row
  const name = pokemon.name_translations?.en?.name || pokemon.name
  const target = isRareTarget(pokemon)
  const first = encounters[0]
  const size = first.is_horde_5x ? 5 : first.is_horde_3x ? 3 : 1
  const method = first.type === 'Sweet Scent' ? 'SCENT' : 'GRASS'
  const descriptions = [...new Set(encounters.map(encounter => {
    const level = encounter.min_level === encounter.max_level
      ? encounter.min_level : `${encounter.min_level}–${encounter.max_level}`
    return `Lv ${level} · ${formatRate(encounter, time)}`
  }))]
  const warnings = getDangerousPokemonWarnings(pokemon, encounters)

  return (
    <article
      className={`${styles.mon} ${target ? styles.target : ''}`}
      tabIndex={0}
      title={[
        name,
        ...descriptions,
        pokemon.held_items.length ? `Items: ${pokemon.held_items.map(item => formatItem(item.item_name)).join(', ')}` : '',
        ...warnings.map(warning => `${warning.name}: ${warning.message}`),
      ].filter(Boolean).join('\n')}
    >
      <div className={styles.sprite}>
        <span hidden aria-label={`${name} GIF unavailable`}>?</span>
        <img
          src={getLocalPokemonGif(pokemon.name)}
          alt=""
          loading="lazy"
          onError={event => {
            event.currentTarget.hidden = true
            event.currentTarget.previousElementSibling.hidden = false
          }}
        />
      </div>
      <div className={styles.monInfo}>
        <div className={styles.monTitle}>
          <strong>{name}</strong>
          {size > 1 ? <span className={styles.hordeBadge}>{size}× {method}</span>
            : target && <span className={styles.targetBadge}>T{pokemon.shiny_tier}</span>}
        </div>
        <div className={styles.rates}>{descriptions.join(' / ')}</div>
        {pokemon.held_items.length > 0 && (
          <div className={styles.items}><span>ITEM</span> {pokemon.held_items.map(item => formatItem(item.item_name)).join(' · ')}</div>
        )}
        {warnings.length > 0 && (
          <div className={styles.warnings}>
            {warnings.map(warning => (
              <span key={`${warning.type}:${warning.name}`} className={styles.warning} tabIndex={0} title={warning.message} aria-label={`${warning.name}: ${warning.message}`}>
                ! {warning.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}

function SeasonPanel({ season, entries, time, encounterMode }) {
  const singles = getSeasonRows(entries, season, time, false)
  const hordes = getSeasonRows(entries, season, time, true)
  const rares = singles.filter(row => isRareTarget(row.pokemon))
  const otherSingles = singles.filter(row => !isRareTarget(row.pokemon))
  const showSingles = encounterMode !== 'hordes'
  const showHordes = encounterMode !== 'singles'

  function group(label, rows, empty) {
    return (
      <div className={styles.group}>
        <div className={styles.sectionLabel}><span>{label}</span><b>{rows.length}</b></div>
        <div className={styles.monList}>
          {rows.length ? rows.map(row => <EncounterCard key={`${row.pokemon.name}:${row.key}`} row={row} time={time} />)
            : <p className={styles.empty}>{empty}</p>}
        </div>
      </div>
    )
  }

  return (
    <section className={`${styles.season} ${styles[season.toLowerCase()]}`}>
      <header className={styles.seasonHeader}>
        <div><span className={styles.seasonIndex}>SEASON / {String(SEASONS.indexOf(season) + 1).padStart(2, '0')}</span><h2>{season}</h2></div>
        <span className={styles.seasonSymbol} aria-hidden="true">{SEASON_SYMBOLS[season]}</span>
      </header>
      <div className={styles.seasonContent}>
        {showSingles && <>
          {group('RARE TARGETS · TIER 0–2', rares, 'No rare targets at this time.')}
          {group('OTHER GRASS SINGLES', otherSingles, 'No other singles at this time.')}
        </>}
        {showHordes && group('HORDES', hordes, 'No hordes recorded for this time.')}
      </div>
    </section>
  )
}

function OverviewList({ label, entries, formatName }) {
  return (
    <details className={styles.overviewList}>
      <summary>
        <span>{label}</span>
        <span className={styles.overviewPreview}>{entries.length ? entries.map(formatName).join(' · ') : 'None recorded'}</span>
        <b>{entries.length} ▾</b>
      </summary>
      <div className={styles.overviewPopover}>
        <strong>{label} · all seasons and times</strong>
        {entries.length ? entries.map(entry => (
          <div className={styles.overviewEntry} key={`${entry.type || 'item'}:${entry.name}`}>
            <span>{formatName(entry)}</span>
            <small>{entry.pokemon.join(', ')}{entry.message ? ` — ${entry.message}` : ''}</small>
          </div>
        )) : <p>None recorded.</p>}
      </div>
    </details>
  )
}

export default function RoamingLegendRoutes() {
  const [region, setRegion] = useState(ENABLED_REGIONS[0])
  const [route, setRoute] = useState(ROUTES[ENABLED_REGIONS[0]][0])
  const [season, setSeason] = useState('all')
  const [time, setTime] = useState('all')
  const [encounterMode, setEncounterMode] = useState('all')
  const [fullscreenError, setFullscreenError] = useState('')
  const studioRef = useRef(null)
  const entries = useMemo(() => getRouteEncounters(pokemonData, region, route), [region, route])
  const overview = useMemo(() => getRouteOverview(entries, getDangerousPokemonWarnings), [entries])
  const routeIndex = ROUTES[region].indexOf(route)
  const visibleSeasons = season === 'all' ? SEASONS : [season]

  useEffect(() => {
    document.body.classList.add('roaming-legend-routes-page')
    return () => document.body.classList.remove('roaming-legend-routes-page')
  }, [])

  useDocumentHead({
    title: 'Roaming Legend Routes | Team Synergy - PokeMMO',
    description: `Compare seasonal ${ENABLED_REGIONS.join(' and ')} roaming legendary routes, grass encounters, hordes, held items, and dangerous moves in PokeMMO.`,
    canonicalPath: '/roaming-legend-routes/',
  })

  function changeRegion(event) {
    const nextRegion = event.target.value
    setRegion(nextRegion)
    setRoute(ROUTES[nextRegion][0])
  }

  function changeRoute(offset) {
    const routes = ROUTES[region]
    setRoute(routes[(routeIndex + offset + routes.length) % routes.length])
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await studioRef.current.requestFullscreen()
      setFullscreenError('')
    } catch (error) {
      setFullscreenError(`Could not change fullscreen mode: ${error.message}`)
    }
  }

  return (
    <div ref={studioRef} className={styles.studio}>
      <div className={styles.topbar}>
        <div className={styles.brand}><span className={styles.brandMark}>S</span><div><span className={styles.eyebrow}>TEAM SYNERGY / HUNTING GUIDE</span><strong>ROAMING LEGEND <em>ROUTES</em></strong></div></div>
        <span className={styles.live}>SINGLE ENCOUNTER FIELD GUIDE</span>
      </div>
      <div className={styles.hero}>
        <div><p className={`${styles.eyebrow} ${styles.accent}`}>{ENABLED_REGIONS.join(' & ').toUpperCase()} / ROUTE BREAKDOWN</p><h1>{route}</h1><p className={styles.subtitle}>{region} / Grass singles and recorded grass or Sweet Scent hordes · No Surf hordes</p></div>
        <div className={styles.heroSide} key={`${region}:${route}`}>
          <OverviewList label="HELD ITEMS" entries={overview.items} formatName={entry => formatItem(entry.name)} />
          <OverviewList label="CATCH RISKS" entries={overview.warnings} formatName={entry => entry.name} />
          <small>All seasons &amp; times · select for Pokémon and details</small>
        </div>
      </div>
      <div className={styles.controls} aria-label="Route controls">
        <label>REGION<select value={region} onChange={changeRegion}>{ENABLED_REGIONS.map(value => <option key={value}>{value}</option>)}</select></label>
        <label className={styles.routeControl}>LOCATION<select value={route} onChange={event => setRoute(event.target.value)}>{ROUTES[region].map(value => <option key={value}>{value}</option>)}</select></label>
        <label>VIEW<select value={season} onChange={event => setSeason(event.target.value)}><option value="all">All seasons</option>{SEASONS.map(value => <option key={value}>{value}</option>)}</select></label>
        <label>TIME<select value={time} onChange={event => setTime(event.target.value)}><option value="all">All times</option><option value="morning">Morning</option><option value="day">Day</option><option value="night">Night</option></select></label>
        <label>ENCOUNTERS<select value={encounterMode} onChange={event => setEncounterMode(event.target.value)}><option value="all">Singles + hordes</option><option value="singles">Singles only</option><option value="hordes">Hordes only</option></select></label>
        <button type="button" onClick={() => changeRoute(-1)} aria-label="Previous route">←</button>
        <button type="button" onClick={() => changeRoute(1)} aria-label="Next route">→</button>
        <button className={styles.fullscreen} type="button" onClick={toggleFullscreen}>FULLSCREEN</button>
      </div>
      {fullscreenError && <p className={styles.error} role="alert">{fullscreenError}</p>}
      <div className={styles.legend}><span>● TIER 0–2 TARGET</span><span>! CATCH RISK</span><span>LURE = LURE REQUIRED</span><span className={styles.legendNote}>M / D / N = morning / day / night · Hover or focus a Pokémon for full details</span></div>
      {!entries.length ? <p className={styles.error} role="alert">No encounter data found for {route} in {region}.</p> : (
        <div className={`${styles.seasons} ${visibleSeasons.length === 1 ? styles.singleView : ''}`}>
          {visibleSeasons.map(value => <SeasonPanel key={`${region}:${route}:${value}`} season={value} entries={entries} time={time} encounterMode={encounterMode} />)}
        </div>
      )}
      <div className={styles.footer}><span><strong>YOU CAN NOT SWEET SCENT LEGENDARIES</strong> · Move warnings are estimates from level-up data; verify in-game.</span><span>{String(routeIndex + 1).padStart(2, '0')} / {ROUTES[region].length}</span></div>
    </div>
  )
}
