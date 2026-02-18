import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import { getAssetUrl } from '../../utils/assets'
import { getLocalPokemonGif, onGifError, getRemoteFallbackUrl, normalizePokemonName } from '../../utils/pokemon'
import safariData from '../../data/safari_zones.json'
import styles from './SafariZones.module.css'

const REGIONS = ['kanto', 'johto', 'hoenn', 'sinnoh']
const REGION_LABELS = { kanto: 'Kanto', johto: 'Johto', hoenn: 'Hoenn', sinnoh: 'Sinnoh' }

const ROTATION_COLORS = {
  Carnivine: styles.rotationCarnivine,
  Skorupi: styles.rotationSkorupi,
  Croagunk: styles.rotationCroagunk,
}

// --- In-game time calculator ---
// PokeMMO: 1 in-game day = 6 real hours, so 1 real minute = 4 in-game minutes
// At UTC 00:00, in-game time = 04:00 (morning start)
// Morning: 04:00–11:00, Day: 11:00–21:00, Night: 21:00–04:00
const IN_GAME_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_OFFSET = 5 // calibration: maps raw epoch-based day index to correct in-game day

function getInGameState() {
  const now = Date.now()
  const utcMinutes = now / 60000

  // In-game time of day: 1 real minute = 4 in-game minutes, no epoch offset
  const utcMidnight = Math.floor(utcMinutes / 1440) * 1440
  const minsSinceMidnight = utcMinutes - utcMidnight
  const inGameTotalMins = (minsSinceMidnight * 4) % 1440
  const hours = Math.floor(inGameTotalMins / 60)
  const mins = Math.floor(inGameTotalMins % 60)

  // Time period
  let period = 'Night'
  if (hours >= 4 && hours < 11) period = 'Morning'
  else if (hours >= 11 && hours < 21) period = 'Day'

  // Minutes until next period change
  let nextBoundary
  if (hours >= 4 && hours < 11) nextBoundary = 11 * 60
  else if (hours >= 11 && hours < 21) nextBoundary = 21 * 60
  else nextBoundary = hours >= 21 ? 28 * 60 : 4 * 60 // 28*60 = 4:00 next day
  const inGameMinsLeft = nextBoundary - inGameTotalMins
  const realMinsLeft = Math.ceil(inGameMinsLeft / 4)

  // In-game day of week
  const inGameDay = Math.floor(utcMinutes / 360)
  const dayIndex = (inGameDay + DAY_OFFSET) % 7

  return {
    hours, mins, period,
    day: IN_GAME_DAYS[dayIndex],
    realMinsLeft,
  }
}

// Sinnoh rotation lookup: given in-game day, return which area has which pokemon
const SINNOH_ROTATION = {
  Wednesday: { 1: 'Carnivine', 2: 'Croagunk', 3: 'Croagunk', 4: 'Skorupi', 5: 'Skorupi', 6: 'Croagunk' },
  Thursday:  { 1: 'Croagunk',  2: 'Carnivine', 3: 'Croagunk', 4: 'Croagunk', 5: 'Skorupi',   6: 'Skorupi' },
  Friday:    { 1: 'Skorupi',   2: 'Croagunk',  3: 'Carnivine', 4: 'Croagunk', 5: 'Croagunk', 6: 'Skorupi' },
  Saturday:  { 1: 'Skorupi',   2: 'Skorupi',   3: 'Croagunk',  4: 'Carnivine', 5: 'Croagunk', 6: 'Croagunk' },
  Sunday:    { 1: 'Skorupi',   2: 'Skorupi',   3: 'Croagunk',  4: 'Carnivine', 5: 'Croagunk', 6: 'Croagunk' },
  Monday:    { 1: 'Croagunk',  2: 'Skorupi',   3: 'Skorupi',   4: 'Croagunk',  5: 'Carnivine', 6: 'Croagunk' },
  Tuesday:   { 1: 'Croagunk',  2: 'Croagunk',  3: 'Skorupi',   4: 'Skorupi',   5: 'Croagunk',  6: 'Carnivine' },
}

function InGameClock({ region }) {
  const [state, setState] = useState(getInGameState)

  useEffect(() => {
    const interval = setInterval(() => setState(getInGameState()), 1000)
    return () => clearInterval(interval)
  }, [])

  const timeStr = `${String(state.hours).padStart(2, '0')}:${String(state.mins).padStart(2, '0')}`
  const realMins = state.realMinsLeft
  const countdownStr = realMins >= 60
    ? `${Math.floor(realMins / 60)}h ${realMins % 60}m`
    : `${realMins}m`

  return (
    <div className={styles.clockContainer}>
      <div className={styles.clockMain}>
        <div className={styles.clockTime}>{timeStr}</div>
        <div className={styles.clockDetails}>
          <span className={styles.clockDay}>{state.day}</span>
          <span className={`${styles.clockPeriod} ${styles[`period${state.period}`]}`}>{state.period}</span>
          <span className={styles.clockCountdown}>{countdownStr} until next period</span>
        </div>
      </div>
    </div>
  )
}

function getOddsClass(odds) {
  if (odds >= 50) return styles.oddsHigh
  if (odds >= 20) return styles.oddsMedium
  return styles.oddsLow
}

const ENCOUNTER_LABELS = {
  standard: 'Always',
  day: 'Day',
  night: 'Night',
  rotation: 'Rotation',
  water: 'Water',
  grass: 'Grass',
  lure: 'Lure',
}

const STRATEGY_LABELS = {
  ballsOnly: 'Balls Only',
  oneBait: 'One Bait',
  oneMud: 'One Mud',
}

function normalizeStrategy(strategy) {
  return STRATEGY_LABELS[strategy] || strategy
}

function getEncounterClass(type) {
  if (!type) return styles.encounterStandard;
  const t = String(type).toLowerCase();
  if (t === 'day') return styles.encounterDay;
  if (t === 'night') return styles.encounterNight;
  if (t === 'rotation') return styles.encounterRotation;
  if (t === 'water') return styles.encounterWater;
  if (t === 'lure') return styles.encounterLure;
  return styles.encounterStandard;
}

function PokemonCard({ name, encounterType, catchData, boosted }) {
  const data = catchData?.[name];
  const showStrategy = data && (data.bestStrategy === 'oneBait' || data.bestStrategy === 'oneMud');

  function getStrategyClass(strategy) {
    if (strategy === 'oneMud') return styles.strategyOneMud;
    if (strategy === 'oneBait') return styles.strategyOneBait;
    return '';
  }

  // Add extra class for Rotational/Rotation (case-insensitive)
  function isRotationType(type) {
    if (!type) return false;
    const t = String(type).toLowerCase();
    return t === 'rotation' || t === 'rotational';
  }
  const isRotational = isRotationType(encounterType);
  let cardClass = styles.pokemonCard;
  if (isRotational) {
    if (styles.rotationalImportantCard) {
      cardClass += ' ' + styles.rotationalImportantCard;
    }
    cardClass += ' ' + styles.rotationMon;
  }
  if (boosted) {
    cardClass += ' ' + styles.boostedMon;
  }

  return (
    <Link to={`/pokemon/${normalizePokemonName(name)}`} className={cardClass}>
      <img
        src={getLocalPokemonGif(name)}
        alt={name}
        className={styles.pokemonGif}
        onError={onGifError(name, false)}
        loading="lazy"
      />
      <span className={styles.pokemonName} title={name}>{name}</span>
      {showStrategy && (
        <span className={`${styles.strategyBadge} ${getStrategyClass(data.bestStrategy)}`}>{normalizeStrategy(data.bestStrategy)}</span>
      )}
      {data && (
        <span className={`${styles.pokemonOdds} ${getOddsClass(data.bestOdds)}`}>
          {data.bestOdds}%
        </span>
      )}
      <span className={`${styles.encounterBadge} ${getEncounterClass(encounterType)}`}>{ENCOUNTER_LABELS[encounterType] || encounterType}{boosted ? ' (Boosted)' : ''}</span>

      </Link>
    );
}


function CatchDataTable({ catchData }) {
  const [sortKey, setSortKey] = useState('bestOdds')
  const [sortDir, setSortDir] = useState('desc')
  const [search, setSearch] = useState('')

  const sorted = useMemo(() => {
    const entries = Object.entries(catchData).map(([name, d]) => ({ name, ...d }))
    const filtered = search
      ? entries.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
      : entries
    filtered.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortDir === 'asc' ? av - bv : bv - av
    })
    return filtered
  }, [catchData, sortKey, sortDir, search])

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir(key === 'name' ? 'asc' : 'desc') }
  }

  function sortIcon(key) {
    if (sortKey !== key) return ''
    return sortDir === 'asc' ? ' ▲' : ' ▼'
  }

  return (
    <div className={styles.tableSection}>
      <h3>Full Catch Data</h3>
      <input
        type="text"
        placeholder="Search Pokemon..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className={styles.searchInput}
      />
      <div className={styles.tableWrapper}>
        <table className={styles.catchTable}>
          <thead>
            <tr>
              <th onClick={() => handleSort('name')}>Pokemon<span className={styles.sortIcon}>{sortIcon('name')}</span></th>
              <th onClick={() => handleSort('catchRate')}>Catch Rate<span className={styles.sortIcon}>{sortIcon('catchRate')}</span></th>
              <th onClick={() => handleSort('fleeRate')}>Flee Rate<span className={styles.sortIcon}>{sortIcon('fleeRate')}</span></th>
              <th onClick={() => handleSort('ballsOnly')}>Balls Only<span className={styles.sortIcon}>{sortIcon('ballsOnly')}</span></th>
              <th onClick={() => handleSort('oneBait')}>One Bait<span className={styles.sortIcon}>{sortIcon('oneBait')}</span></th>
              <th onClick={() => handleSort('oneMud')}>One Mud<span className={styles.sortIcon}>{sortIcon('oneMud')}</span></th>
              <th onClick={() => handleSort('bestOdds')}>Best Odds<span className={styles.sortIcon}>{sortIcon('bestOdds')}</span></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(p => (
              <tr key={p.name}>
                <td>
                  <Link to={`/pokemon/${normalizePokemonName(p.name)}`} className={styles.pokemonCell}>
                    <img
                      src={getLocalPokemonGif(p.name)}
                      alt={p.name}
                      className={styles.tableGif}
                      onError={onGifError(p.name, false)}
                      loading="lazy"
                    />
                    {p.name}
                  </Link>
                </td>
                <td>{p.catchRate}</td>
                <td>{p.fleeRate}</td>
                <td>{p.ballsOnly}%</td>
                <td>{p.oneBait}%</td>
                <td>{p.oneMud}%</td>
                <td className={getOddsClass(p.bestOdds)}>{p.bestOdds}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RotationSchedule({ schedule, currentDay }) {
  const todayData = schedule.days.find(d => d.day === currentDay)

  return (
    <div className={styles.rotationSection}>
      <h3>Today's Rotation</h3>
      <div className={styles.rotationCards}>
        {schedule.pokemon.map(name => {
          const areas = todayData?.areas[name] || []
          return (
            <div key={name} className={`${styles.rotationCard} ${ROTATION_COLORS[name] || ''}`}>
              <img
                src={getRemoteFallbackUrl(name, true)}
                alt={`Shiny ${name}`}
                className={styles.rotationGif}
              />
              <span className={styles.rotationPokeName}>{name}</span>
              {areas.length > 0 ? (
                <div className={styles.rotationAreas}>
                  {areas.map(a => (
                    <span key={a} className={styles.rotationAreaPill}>Area {a}</span>
                  ))}
                </div>
              ) : (
                <span className={styles.rotationNone}>Not available today</span>
              )}
            </div>
          )
        })}
      </div>
      <p className={styles.rotationNote}>Rotates every in-game day (~6 real hours). Schedule repeats weekly.</p>
    </div>
  )
}

function RegionContent({ region }) {
  const data = safariData[region]
  const [selectedArea, setSelectedArea] = useState(0)

  if (!data) {
    return (
      <div className={styles.comingSoon}>
        <h2>{REGION_LABELS[region]} Safari Zone</h2>
        <p>Coming Soon — check back later!</p>
      </div>
    )
  }

  let area = data.areas[selectedArea];
  let pokemonList = [];
  if (region === 'sinnoh' && data.universalPokemon) {
    // Always start from a fresh universalPokemon array to avoid duplication
    const boostedNames = (area.pokemon || []).map(p => p.name);
    const currentDay = getInGameState().day;
    const areaNumber = selectedArea + 1;
    const activeRotationMon = SINNOH_ROTATION[currentDay]?.[areaNumber];
    pokemonList = data.universalPokemon
      .filter(mon => {
        // Only show the rotation pokemon that's active in this area today
        if (isRotationType(mon.encounterType)) {
          return mon.name === activeRotationMon;
        }
        return true;
      })
      .map(mon => {
        const boosted = boostedNames.includes(mon.name);
        return { ...mon, boosted };
      });
  } else {
    pokemonList = Array.isArray(area.pokemon) ? [...area.pokemon] : [];
  }

  // Move rotation/rotational Pokemon to the top (case-insensitive), then boosted
  function isRotationType(type) {
    if (!type) return false;
    const t = String(type).toLowerCase();
    return t === 'rotation' || t === 'rotational';
  }
  function encounterSortValue(type, boosted) {
    if (isRotationType(type)) return 0;
    if (boosted) return 1;
    if (String(type).toLowerCase() === 'water') return 3;
    return 4;
  }
  const sortedPokemon = [...pokemonList].sort((a, b) => {
    return encounterSortValue(a.encounterType, a.boosted) - encounterSortValue(b.encounterType, b.boosted);
  });


  return (
    <div className={styles.regionContent}>
      <p className={styles.regionGame}>{data.game}</p>
      <p className={styles.regionDescription}>{data.description}</p>

      <InGameClock region={region} />

      {/* Show Hoenn area map image only for Hoenn region */}
      {region === 'hoenn' && (
        <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
          <img
            src={getAssetUrl('images/hoennareas.png')}
            alt="Hoenn Safari Zone Areas Map"
            style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
          />
        </div>
      )}

      {/* Show Sinnoh area map image only for Sinnoh region */}
      {region === 'sinnoh' && (
        <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
          <img
            src={getAssetUrl('images/sinnohareas.png')}
            alt="Sinnoh Safari Zone Areas Map"
            style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
          />
        </div>
      )}

      <div className={styles.areaSelector}>
        {data.areas.map((a, i) => (
          <button
            key={a.name}
            className={`${styles.areaPill} ${i === selectedArea ? styles.areaPillActive : ''}`}
            onClick={() => setSelectedArea(i)}
          >
            {a.name}
          </button>
        ))}
      </div>

      <div className={styles.infoBox}>
        <p><strong>Encounters:</strong> <span className={styles.encounterDay} style={{fontSize:'0.8rem',padding:'1px 5px',borderRadius:'4px'}}>Day</span> = 4:00–21:00, <span className={styles.encounterNight} style={{fontSize:'0.8rem',padding:'1px 5px',borderRadius:'4px'}}>Night</span> = 21:00–4:00, <span className={styles.encounterRotation} style={{fontSize:'0.8rem',padding:'1px 5px',borderRadius:'4px'}}>Rotation</span> = changes every in-game day (~6 hrs, rotates at 21:59), <span className={styles.encounterWater} style={{fontSize:'0.8rem',padding:'1px 5px',borderRadius:'4px'}}>Water</span> = surfing/fishing.</p>
        <p><strong>Shiny Hunting:</strong> Lure boosts encounter rate by 10→15%. Abilities like Illuminate, Swarm, and Arena Trap also increase encounters.</p>
      </div>

      {data.rotationSchedule && <RotationSchedule schedule={data.rotationSchedule} currentDay={getInGameState().day} />}

      <div className={styles.pokemonGrid}>
        {sortedPokemon.map(p => (
          <PokemonCard
            key={p.name}
            name={p.name}
            encounterType={p.encounterType}
            catchData={data.catchData}
            boosted={p.boosted}
          />
        ))}
      </div>

      <h3 className={styles.thanks}>Thanks to Immo for helping with the spawn pools</h3>

      <CatchDataTable catchData={data.catchData} />
    </div>
  )
}

export default function SafariZones() {
  const [activeRegion, setActiveRegion] = useState('johto')

  useDocumentHead({
    title: 'PokeMMO Safari Zone Guide - Catch Rates, Flee Rates & Best Strategies',
    description: 'Complete PokeMMO Safari Zone guide with catch rates, flee rates, and optimal strategies for Johto and Sinnoh (Great Marsh). Find the best approach for every Safari Zone Pokemon.',
    canonicalPath: '/safari-zones',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Safari Zone Guide', url: '/safari-zones' }
    ]
  })

  return (
    <>
      <h1 className="page-title">Safari Zone Guide</h1>
      <img src={getAssetUrl('images/pagebreak.png')} alt="" className="pagebreak" />

      <div className={styles.regionTabs}>
        {REGIONS.map(r => {
          const isDisabled = !safariData[r]
          return (
            <button
              key={r}
              className={`${styles.regionTab} ${activeRegion === r ? styles.regionTabActive : ''} ${isDisabled ? styles.regionTabDisabled : ''}`}
              onClick={() => setActiveRegion(r)}
              disabled={isDisabled}
            >
              {REGION_LABELS[r]}
              {isDisabled && ' (Soon)'}
            </button>
          )
        })}
      </div>

      <RegionContent key={activeRegion} region={activeRegion} />
    </>
  )
}
