import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import { useInGameClock } from '../../hooks/useInGameClock'
import { getAssetUrl } from '../../utils/assets'
import { getLocalPokemonGif, normalizePokemonName, onGifError } from '../../utils/pokemon'
import pokemonData from '../../data/pokemmo_data/pokemon-data.json'
import styles from './RouteFinder.module.css'
const routePlannerContributors = [
  { name: 'SheepieNei', contributions: 24, percent: '15.4%' },
  { name: 'BaldBabyBat', contributions: 9, percent: '5.77%' },
  { name: 'Hyper', contributions: 9, percent: '5.77%' },
  { name: 'Proza', contributions: 7, percent: '4.49%' },
  { name: 'Faia', contributions: 7, percent: '4.49%' },
  { name: 'Pinguh', contributions: 6, percent: '3.85%' },
  { name: 'FlareBlitzz', contributions: 6, percent: '3.85%' },
  { name: 'KaiDono', contributions: 6, percent: '3.85%' },
  { name: 'Rizz', contributions: 5, percent: '3.21%' },
  { name: 'Mysto', contributions: 5, percent: '3.21%' },
  { name: 'pupsil', contributions: 5, percent: '3.21%' },
  { name: 'ZackTheAce', contributions: 3, percent: '1.92%' },
  { name: 'tunacore', contributions: 3, percent: '1.92%' },
  { name: 'Dellwina', contributions: 3, percent: '1.92%' },
  { name: 'TFastest', contributions: 3, percent: '1.92%' },
  { name: 'Garrett', contributions: 3, percent: '1.92%' },
  { name: 'Uwazii', contributions: 3, percent: '1.92%' },
  { name: 'ImmortalFlame', contributions: 3, percent: '1.92%' },
  { name: 'Dammers', contributions: 3, percent: '1.92%' },
  { name: 'Jaap', contributions: 2, percent: '1.28%' },
  { name: 'cwerr', contributions: 2, percent: '1.28%' },
  { name: 'CSixtyThree', contributions: 2, percent: '1.28%' },
  { name: 'DexHunterZoro', contributions: 2, percent: '1.28%' },
  { name: 'FlappinShad', contributions: 2, percent: '1.28%' },
  { name: 'Riolllu', contributions: 2, percent: '1.28%' },
  { name: 'ApparentlyAustin', contributions: 2, percent: '1.28%' },
  { name: 'Colifloriano', contributions: 1, percent: '0.64%' },
  { name: 'Shlaxs', contributions: 1, percent: '0.64%' },
  { name: 'woken', contributions: 1, percent: '0.64%' },
  { name: 'locobounty', contributions: 1, percent: '0.64%' },
  { name: 'Autistic', contributions: 1, percent: '0.64%' },
  { name: 'Izay', contributions: 1, percent: '0.64%' },
  { name: 'Stinky', contributions: 1, percent: '0.64%' },
  { name: 'chip', contributions: 1, percent: '0.64%' },
  { name: 'Inori russoto', contributions: 1, percent: '0.64%' },
  { name: 'Mitchell', contributions: 1, percent: '0.64%' },
  { name: 'rKingo', contributions: 1, percent: '0.64%' },
  { name: 'CapitanLoremz', contributions: 1, percent: '0.64%' },
  { name: 'MrBlueStacks', contributions: 1, percent: '0.64%' },
  { name: 'ElTryhard', contributions: 1, percent: '0.64%' },
  { name: 'England', contributions: 1, percent: '0.64%' },
  { name: 'Zempex', contributions: 1, percent: '0.64%' },
  { name: 'DrHyperion', contributions: 1, percent: '0.64%' },
  { name: 'Shamandarah', contributions: 1, percent: '0.64%' },
  { name: 'TomHoznier', contributions: 1, percent: '0.64%' },
  { name: 'Ezra', contributions: 1, percent: '0.64%' },
  { name: 'Haribo', contributions: 1, percent: '0.64%' },
  { name: 'shunting', contributions: 1, percent: '0.64%' },
  { name: 'russoto', contributions: 1, percent: '0.64%' },
  { name: 'Russoto', contributions: 1, percent: '0.64%' },
  { name: 'ProfBoop', contributions: 1, percent: '0.64%' },
  { name: 'Raveninha', contributions: 1, percent: '0.64%' },
  { name: 'Boopy', contributions: 1, percent: '0.64%' },
  { name: 'qDoll', contributions: 1, percent: '0.64%' },
  { name: 'DanOn', contributions: 1, percent: '0.64%' },
];
const PERIODS = [
  { id: 'day', label: 'Day', weight: 1.0 },
  { id: 'night', label: 'Night', weight: 0.9 },
  { id: 'morning', label: 'Morning', weight: 0.75 },
]
const PERIOD_WEIGHT_BY_LABEL = PERIODS.reduce((lookup, period) => {
  lookup[period.label] = period.weight
  return lookup
}, {})

const RARITY_PERCENT_MAP = {
  'very common': 35,
  common: 25,
  uncommon: 15,
  rare: 8,
  'very rare': 3,
  lure: 4,
  special: 2,
  horde: 100,
}

const HORDE_WEIGHT = {
  none: 1,
  '3x': 1.35,
  '5x': 1.7,
}

const SEASON_OPTIONS = ['All', 'Spring', 'Summer', 'Autumn', 'Winter']
const TIME_OPTIONS = ['All', 'Day', 'Night', 'Morning']

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
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function formatPokemonName(name) {
  return String(name || '')
    .split('-')
    .map(part => part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : part)
    .join('-')
}

function normalizeSeason(value) {
  const season = String(value || '').trim().toLowerCase()
  if (season === 'spring') return 'Spring'
  if (season === 'summer') return 'Summer'
  if (season === 'autumn' || season === 'fall') return 'Autumn'
  if (season === 'winter') return 'Winter'
  if (season === 'any') return 'Any'
  return 'Any'
}

function getHordeType(encounter) {
  if (encounter?.is_horde_5x) return '5x'
  if (encounter?.is_horde_3x) return '3x'
  return 'none'
}

function getHordeRank(hordeType) {
  if (hordeType === '5x') return 2
  if (hordeType === '3x') return 1
  return 0
}

function pickDominantHordeType(left, right) {
  const leftRank = getHordeRank(left)
  const rightRank = getHordeRank(right)
  return rightRank > leftRank ? right : left
}

function parseRarityPercent(value, encounter) {
  const rarityText = String(value || '').trim()
  if (!rarityText) return 0

  const percentMatch = rarityText.match(/^(\d+(?:\.\d+)?)%$/)
  if (percentMatch) {
    let percent = Number(percentMatch[1])
    if (!Number.isFinite(percent)) return 0

    // Horde percentages are often stored in a 5% pool.
    if ((encounter?.is_horde_3x || encounter?.is_horde_5x) && percent <= 5) {
      percent = (percent / 5) * 100
    }
    return percent
  }

  return RARITY_PERCENT_MAP[rarityText.toLowerCase()] || 0
}

function buildPokemonIndex() {
  const byKey = new Map()
  const bySearch = new Map()

  Object.entries(pokemonData || {}).forEach(([key, entry]) => {
    const normalizedKey = normalizePokemonKey(key)
    if (!normalizedKey || !entry) return

    const canonicalName = String(entry.name || key)
    const displayName = formatPokemonName(canonicalName)
    byKey.set(normalizedKey, {
      key: normalizedKey,
      name: canonicalName,
      displayName,
      data: entry,
    })

    const searchKeys = new Set([
      normalizeSearch(canonicalName),
      normalizeSearch(displayName),
      normalizePokemonKey(canonicalName),
      normalizedKey,
    ])

    searchKeys.forEach((searchKey) => {
      if (searchKey) {
        bySearch.set(searchKey, normalizedKey)
      }
    })
  })

  const options = [...byKey.values()]
    .map(entry => entry.displayName)
    .sort((a, b) => a.localeCompare(b))

  return { byKey, bySearch, options }
}

function collectEvolutionKeys(startKey, pokemonByKey) {
  const visited = new Set()
  const queue = [startKey]

  while (queue.length > 0) {
    const currentKey = queue.shift()
    if (!currentKey || visited.has(currentKey)) continue
    visited.add(currentKey)

    const current = pokemonByKey.get(currentKey)
    const evolutions = Array.isArray(current?.data?.evolutions) ? current.data.evolutions : []
    evolutions.forEach((evolution) => {
      const nextKey = normalizePokemonKey(evolution?.name)
      if (nextKey && pokemonByKey.has(nextKey) && !visited.has(nextKey)) {
        queue.push(nextKey)
      }
    })
  }

  return visited
}

function resolvePokemonKey(searchValue, pokemonIndex) {
  const normalized = normalizeSearch(searchValue)
  if (!normalized) return ''

  if (pokemonIndex.bySearch.has(normalized)) {
    return pokemonIndex.bySearch.get(normalized)
  }

  const normalizedKey = normalizePokemonKey(searchValue)
  if (pokemonIndex.byKey.has(normalizedKey)) {
    return normalizedKey
  }

  const fuzzyMatch = [...pokemonIndex.byKey.keys()].find(key => key.includes(normalizedKey))
  return fuzzyMatch || ''
}

function seasonMatchesFilter(season, selectedSeason) {
  if (selectedSeason === 'All') return true
  if (season === 'Any') return true
  return season === selectedSeason
}

function getEncounterBaseChanceByPeriod(encounter) {
  return {
    Morning: parseRarityPercent(encounter?.rarity_morning, encounter),
    Day: parseRarityPercent(encounter?.rarity_day, encounter),
    Night: parseRarityPercent(encounter?.rarity_night, encounter),
  }
}
function getOtherPokemonForWindow(
  routeLocationId,
  routeRegion,
  routeSeason,
  periodSet,
  methodSet,
  requiredHordeType,
  pokemonIndex,
  includedTargetKeys
) {
  const periods = new Set(
    [...periodSet]
      .map(period => String(period).trim())
      .filter(Boolean)
  )

  const methods = new Set(
    [...methodSet]
      .map(method => normalizeSearch(method))
      .filter(Boolean)
  )

  const locationId = String(
    routeLocationId || ''
  ).trim()

  const normalizedRegion =
    normalizeSearch(routeRegion)

  const matches = []

  pokemonIndex.byKey.forEach((entry, key) => {
    if (includedTargetKeys.has(key)) return

    const encounters = Array.isArray(
      entry.data?.location_area_encounters
    )
      ? entry.data.location_area_encounters
      : []

    let chanceWeightedSum = 0
    let chanceWeight = 0

    encounters.forEach((encounter) => {
      /*
       * LOCATION
       *
       * This is the important part:
       * identify the route using location_id.
       */
      const encounterLocationId = String(
        encounter.location_id || ''
      ).trim()

      if (
        !locationId ||
        !encounterLocationId ||
        encounterLocationId !== locationId
      ) {
        return
      }

      /*
       * REGION
       */
      const encounterRegion =
        normalizeSearch(encounter.region_name)

      if (
        encounterRegion !== normalizedRegion
      ) {
        return
      }

      /*
       * SEASON
       */
      const encounterSeason =
        normalizeSeason(encounter.season)

      if (
        encounterSeason !== routeSeason &&
        encounterSeason !== 'Any' &&
        routeSeason !== 'Any'
      ) {
        return
      }

      /*
       * METHOD
       */
      const encounterMethod =
        normalizeSearch(encounter.type)

      if (
        methods.size > 0 &&
        !methods.has(encounterMethod)
      ) {
        return
      }

      /*
       * HORDE TYPE
       */
      const encounterHordeType =
        getHordeType(encounter)

      if (
        encounterHordeType !==
        requiredHordeType
      ) {
        return
      }

      /*
       * PHASES
       *
       * Check each phase individually.
       *
       * This allows a Pokemon to be found if it appears
       * during ANY of the phases represented by the route.
       */
      const byPeriod =
        getEncounterBaseChanceByPeriod(encounter)

      periods.forEach((period) => {
        const chance =
          byPeriod[period] || 0

        if (chance <= 0) return

        const periodWeight =
          PERIOD_WEIGHT_BY_LABEL[period] || 1

        chanceWeightedSum +=
          chance * periodWeight

        chanceWeight +=
          periodWeight
      })
    })

    /*
     * Average the Pokemon's spawn chance across
     * all matching phases.
     */
    const averagedChance =
      chanceWeight > 0
        ? chanceWeightedSum / chanceWeight
        : 0

    if (averagedChance > 0) {
      matches.push({
        name: entry.displayName,
        chance: averagedChance,
      })
    }
  })

  return matches
    .sort((a, b) => {
      if (b.chance !== a.chance) {
        return b.chance - a.chance
      }

      return a.name.localeCompare(b.name)
    })
    .slice(0, 24)
}
function buildHuntResults(
  targetKeys,
  pokemonIndex,
  seasonFilter,
  timeFilter
) {
  const windowAggregate = new Map()

  const maxPeriodWeight =
    timeFilter === 'All'
      ? PERIODS.reduce((sum, period) => sum + period.weight, 0)
      : (PERIOD_WEIGHT_BY_LABEL[timeFilter] || 1)

  targetKeys.forEach((targetKey) => {
    const targetPokemon = pokemonIndex.byKey.get(targetKey)
    if (!targetPokemon) return

    const encounters = Array.isArray(
      targetPokemon.data?.location_area_encounters
    )
      ? targetPokemon.data.location_area_encounters
      : []

    encounters.forEach((encounter) => {
      const season = normalizeSeason(encounter.season)

      if (!seasonMatchesFilter(season, seasonFilter)) return

      const region = String(
        encounter.region_name || 'Unknown Region'
      )

      // location_id is the unique identifier.
      const locationId = String(
        encounter.location_id || ''
      ).trim()

      // location_name_full is only used for display.
      const location = String(
        encounter.location_name_full ||
        encounter.location_name ||
        ''
      ).trim()

      if (!locationId || !location) return

      const method = String(
        encounter.type || 'Unknown'
      )

      const hordeType = getHordeType(encounter)

      PERIODS.forEach((period) => {
        if (
          timeFilter !== 'All' &&
          period.label !== timeFilter
        ) {
          return
        }

        const rarityField =
          encounter[`rarity_${period.id}`]

        const baseChance = parseRarityPercent(
          rarityField,
          encounter
        )

        if (baseChance <= 0) return

        const weightedChance =
          baseChance *
          period.weight *
          HORDE_WEIGHT[hordeType]

        // Use location_id instead of location name.
        const spotKey = [
          region,
          locationId,
          season,
          period.label,
          method,
          hordeType,
        ].join('|')

        const current =
          windowAggregate.get(spotKey) || {
            id: spotKey,
            region: region,
            locationId: locationId,
            location: location,
            season: season,
            period: period.label,
            periodWeight: period.weight,
            method: method,
            hordeType: hordeType,
            hordeRank: getHordeRank(hordeType),
            weightedChance: 0,
            baseChance: 0,
            species: new Map(),
            minLevel: Number.POSITIVE_INFINITY,
            maxLevel: Number.NEGATIVE_INFINITY,
          }

        current.baseChance += baseChance
        current.weightedChance += weightedChance

        current.species.set(
          targetPokemon.displayName,
          (
            current.species.get(
              targetPokemon.displayName
            ) || 0
          ) + baseChance
        )

        const minLevel = Number(
          encounter.min_level
        )

        const maxLevel = Number(
          encounter.max_level
        )

        if (Number.isFinite(minLevel)) {
          current.minLevel = Math.min(
            current.minLevel,
            minLevel
          )
        }

        if (Number.isFinite(maxLevel)) {
          current.maxLevel = Math.max(
            current.maxLevel,
            maxLevel
          )
        }

        windowAggregate.set(
          spotKey,
          current
        )
      })
    })
  })

  const routeAggregate = new Map()

  ;[...windowAggregate.values()].forEach(
    (windowEntry) => {
      // location_id identifies the actual location.
      const routeKey = [
        windowEntry.region,
        windowEntry.locationId,
        windowEntry.season,
        windowEntry.method,
        windowEntry.hordeType,
      ].join('|')

      const current =
        routeAggregate.get(routeKey) || {
          id: routeKey,
          region: windowEntry.region,
          locationId: windowEntry.locationId,
          location: windowEntry.location,
          season: windowEntry.season,
          method: windowEntry.method,
          hordeType: windowEntry.hordeType,
          hordeRank: windowEntry.hordeRank,
          weightedChance: 0,
          baseChance: 0,
          weightedScoreSum: 0,
          baseChanceWeightedSum: 0,
          availabilityWeight: 0,
          species: new Map(),
          minLevel: Number.POSITIVE_INFINITY,
          maxLevel: Number.NEGATIVE_INFINITY,
          availablePeriods: new Set(),
          periodWeights: new Map(),
        }

      current.hordeType = pickDominantHordeType(
        current.hordeType,
        windowEntry.hordeType
      )

      current.hordeRank = getHordeRank(
        current.hordeType
      )

      current.weightedScoreSum +=
        windowEntry.weightedChance

      current.baseChanceWeightedSum +=
        windowEntry.baseChance *
        windowEntry.periodWeight

      current.availabilityWeight +=
        windowEntry.periodWeight

      current.availablePeriods.add(
        windowEntry.period
      )

      current.periodWeights.set(
        windowEntry.period,
        windowEntry.periodWeight
      )

      current.minLevel = Math.min(
        current.minLevel,
        windowEntry.minLevel
      )

      current.maxLevel = Math.max(
        current.maxLevel,
        windowEntry.maxLevel
      )

      windowEntry.species.forEach(
        (chance, speciesName) => {
          current.species.set(
            speciesName,
            (
              current.species.get(
                speciesName
              ) || 0
            ) + chance
          )
        }
      )

      routeAggregate.set(
        routeKey,
        current
      )
    }
  )

  return [...routeAggregate.values()]
    .map((entry) => {
      const baseChance =
        entry.availabilityWeight > 0
          ? entry.baseChanceWeightedSum /
            entry.availabilityWeight
          : 0

      const weightedChance =
        maxPeriodWeight > 0
          ? entry.weightedScoreSum /
            maxPeriodWeight
          : 0

      return {
        ...entry,
        baseChance,
        weightedChance,

      periodLabel: [...entry.availablePeriods]
        .sort((a, b) => {
          const order = {
            Morning: 0,
            Day: 1,
            Night: 2,
          }

          return (order[a] ?? 9) - (order[b] ?? 9)
        })
        .join(' / '),

        speciesList: [
          ...entry.species.entries(),
        ]
          .sort((a, b) => b[1] - a[1])
          .map(([name]) => name),

        levelText:
          Number.isFinite(entry.minLevel) &&
          Number.isFinite(entry.maxLevel)
            ? entry.minLevel === entry.maxLevel
              ? `Lv. ${entry.minLevel}`
              : `Lv. ${entry.minLevel}-${entry.maxLevel}`
            : 'Lv. ?',
      }
    })
    .sort((a, b) => {
      if (a.hordeRank !== b.hordeRank) {
        return b.hordeRank - a.hordeRank
      }

      if (a.weightedChance !== b.weightedChance) {
        return b.weightedChance - a.weightedChance
      }

      if (a.baseChance !== b.baseChance) {
        return b.baseChance - a.baseChance
      }

      return `${a.region} ${a.location}`.localeCompare(
        `${b.region} ${b.location}`
      )
    })
}

function SpeciesBadge({ name }) {
  return (
    <Link to={`/pokemon/${normalizePokemonName(name)}/`} className={styles.speciesBadge}>
      <img
        src={getLocalPokemonGif(name)}
        alt={name}
        onError={onGifError(name)}
        loading="lazy"
      />
      <span>{name}</span>
    </Link>
  )
}

function formatPercentValue(value) {
  if (!Number.isFinite(value)) return '0%'
  return `${value.toFixed(value >= 10 ? 1 : 2)}%`
}

function formatMethodLabel(method) {
  const value = String(method || '').trim()
  if (!value) return 'Unknown'
  return value
    .split(/[\s-]+/)
    .map(part => part ? `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}` : part)
    .join(' ')
}

export default function RouteFinder() {
  const [pokemonSearch, setPokemonSearch] = useState('')
  const [seasonFilter, setSeasonFilter] = useState('All')
  const [timeFilter, setTimeFilter] = useState('All')
  const [openResultId, setOpenResultId] = useState('')
  const inGameClock = useInGameClock()

  useDocumentHead({
    title: 'Hunt Planner',
    description: 'Find the best places to hunt Pokemon and their evolutions based on horde size, spawn rates, season, and time of day.',
    canonicalPath: '/hunt-planner/',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Hunt Planner', url: '/hunt-planner' },
    ],
  })

  const pokemonIndex = useMemo(() => buildPokemonIndex(), [])
  const selectedPokemonKey = useMemo(() => resolvePokemonKey(pokemonSearch, pokemonIndex), [pokemonSearch, pokemonIndex])
  const evolutionKeys = useMemo(() => {
    if (!selectedPokemonKey) return new Set()
    return collectEvolutionKeys(selectedPokemonKey, pokemonIndex.byKey)
  }, [selectedPokemonKey, pokemonIndex.byKey])

  const selectedPokemon = selectedPokemonKey ? pokemonIndex.byKey.get(selectedPokemonKey) : null
  const evolutionNames = [...evolutionKeys]
    .map(key => pokemonIndex.byKey.get(key)?.displayName)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))

  const huntResults = useMemo(() => {
    if (!selectedPokemonKey) return []
    return buildHuntResults(evolutionKeys, pokemonIndex, seasonFilter, timeFilter)
  }, [selectedPokemonKey, evolutionKeys, pokemonIndex, seasonFilter, timeFilter])

  const selectedResultDetails = useMemo(() => {
    if (!openResultId || !selectedPokemonKey) return []

    const selectedResult = huntResults.find(result => result.id === openResultId)
    if (!selectedResult) return []

    const periods = new Set((selectedResult.periodLabel || '')
      .split('/')
      .map(token => token.trim())
      .filter(Boolean))

    const methods = new Set([selectedResult.method])

    return getOtherPokemonForWindow(
      selectedResult.locationId,
      selectedResult.region,
      selectedResult.season,
      periods,
      methods,
      selectedResult.hordeType,
      pokemonIndex,
      evolutionKeys
    )
  }, [openResultId, selectedPokemonKey, huntResults, pokemonIndex, evolutionKeys])

  return (
    <div className={styles.page}>
        <div className={styles.memoryTooltip}>
            <div className={styles.memoryIcon}>?</div>

            <div className={styles.memoryPopup}>
                <h3>Thanks to the Route Finder Soldiers!</h3>

                <p>
                Thanks to everyone who helped with the previous Route Finder project. Helping when they were needed most
                </p>

                <ul className={styles.memoryList}>
                {routePlannerContributors.map((person, index) => (
                    <li key={person.name}>
                    <span>#{index + 1} {person.name}</span>
                    <span>{person.contributions} {person.percent}</span>
                    </li>
                ))}
                </ul>
            </div>
            </div>
      <h1 className="page-title">Hunt Planner</h1>
      <img src={getAssetUrl('images/pagebreak.png')} alt="" className="pagebreak" />

      <section className={styles.introCard}>
        <p>
          Search a Pokemon to rank the best hunting spots using the newest PokeDex encounter data. Rankings include that Pokemon and all of its evolutions.
        </p>
        <p>
          Priority order is always <strong>5x Horde &gt; 3x Horde &gt; Non-horde</strong>, then weighted by spawn chance and time availability.
        </p>
        <p>
          Current in-game state: <strong>{inGameClock.day}</strong>, <strong>{inGameClock.period}</strong>, <strong>{inGameClock.season}</strong>.
        </p>
      </section>

      <section className={styles.filters} aria-label="Hunt Planner filters">
        <label>
          <span>Pokemon</span>
          <input
            type="search"
            value={pokemonSearch}
            onChange={(event) => setPokemonSearch(event.target.value)}
            placeholder="Search Pokemon..."
            list="hunt-planner-pokemon"
          />
        </label>

        <label>
          <span>Season</span>
          <select value={seasonFilter} onChange={(event) => setSeasonFilter(event.target.value)}>
            {SEASON_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>

        <label>
          <span>Time of day</span>
          <select value={timeFilter} onChange={(event) => setTimeFilter(event.target.value)}>
            {TIME_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>

        <datalist id="hunt-planner-pokemon">
          {pokemonIndex.options.map(name => <option value={name} key={name} />)}
        </datalist>
      </section>

      {!pokemonSearch.trim() && (
        <p className={styles.emptyState}>Start by searching a Pokemon to generate ranked hunt locations.</p>
      )}

      {pokemonSearch.trim() && !selectedPokemon && (
        <p className={styles.emptyState}>No Pokemon matched that search.</p>
      )}

      {selectedPokemon && (
        <>
          <section className={styles.selectionSummary}>
            <p>
              Target: <strong>{selectedPokemon.displayName}</strong>
            </p>
            <p>
              Included evolutions: <strong>{evolutionNames.join(', ')}</strong>
            </p>
          </section>

          <p className={styles.resultCount}>
            {huntResults.length.toLocaleString()} ranked hunt {huntResults.length === 1 ? 'spot' : 'spots'}
          </p>

          {huntResults.length === 0 ? (
            <p className={styles.emptyState}>No encounters found for the selected filters.</p>
          ) : (
            <div className={styles.resultsGrid}>
              {huntResults.slice(0, 60).map((result, index) => (
                <article key={result.id} className={styles.resultCard}>
                  <header className={styles.resultHeader}>
                    <span className={styles.rank}>#{index + 1}</span>
                    <div>
                      <h2>{result.location}</h2>
                      <p>{result.region}</p>
                    </div>
                  </header>

                  <div className={styles.badges}>
                    <span className={styles.badge}>{formatMethodLabel(result.method)}</span>
                    <span className={styles.badge}>{result.season}</span>
                    <span className={`${styles.badge} ${styles.hordeBadge}`}>
                      {result.hordeType === 'none' ? 'No Horde' : `${result.hordeType} Horde`}
                    </span>
                    <span className={styles.badge}>{result.periodLabel}</span>
                    <span className={styles.badge}>{result.levelText}</span>
                  </div>

                  <div className={styles.statLine}>
                    <span>Spawn chance: <strong>{formatPercentValue(result.baseChance)}</strong></span>
                    <span>Weighted score: <strong>{formatPercentValue(result.weightedChance)}</strong></span>
                  </div>

                  <div className={styles.speciesList}>
                    {result.speciesList.map(name => <SpeciesBadge key={`${result.id}-${name}`} name={name} />)}
                  </div>

                  <button
                    type="button"
                    className={styles.detailsButton}
                    onClick={() => setOpenResultId(current => current === result.id ? '' : result.id)}
                  >
                    {openResultId === result.id ? 'Hide other Pokemon on this route' : 'Show other Pokemon on this route'}
                  </button>

                  {openResultId === result.id && (
                    <div className={styles.routeDetails}>
                      {selectedResultDetails.length === 0 ? (
                        <p className={styles.routeDetailsEmpty}>No additional Pokemon were found for this exact route window.</p>
                      ) : (
                        <>
                          <p className={styles.routeDetailsTitle}>Other Pokemon for this route / season / time:</p>
                          <div className={styles.routeDetailsList}>
                            {selectedResultDetails.map((pokemon) => (
                              <Link
                                key={`${result.id}-other-${pokemon.name}`}
                                to={`/pokemon/${normalizePokemonName(pokemon.name)}/`}
                                className={styles.routeDetailsItem}
                              >
                                <img
                                  src={getLocalPokemonGif(pokemon.name)}
                                  alt={pokemon.name}
                                  onError={onGifError(pokemon.name)}
                                  loading="lazy"
                                />
                                <span>{pokemon.name}</span>
                                <strong>{formatPercentValue(pokemon.chance)}</strong>
                              </Link>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
