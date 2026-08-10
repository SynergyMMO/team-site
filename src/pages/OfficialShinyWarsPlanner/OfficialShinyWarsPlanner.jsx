import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { API } from '../../api/endpoints'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import generationData from '../../data/generation.json'
import pokemonData from '../../data/pokemmo_data/pokemon-data.json'
import oswCaughtData from '../../data/osw-caught.json'
import oswEncounterMethods from '../../data/osw-encounter-methods.json'
import oswEncounterTiers from '../../data/osw-encounter-tiers.json'
import tierPointsData from '../../data/tier_points.json'
import { getLocalPokemonGif, normalizePokemonName, onGifError } from '../../utils/pokemon'
import styles from './OfficialShinyWarsPlanner.module.css'


const methodJsonUsed = false
const TIER_ORDER = [7, 6, 5, 4, 3, 2, 1, 0]
const VIEW_TABS = [
  { id: 'grid', label: 'Tier Grid' },
  { id: 'caught', label: 'Caught Shinies' },
]
const GRID_FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: '5x Horde', label: '5x Horde' },
  { id: '3x Horde', label: '3x Horde' },
  { id: 'Fishing', label: 'Fishing' },
  { id: 'Single Encounter', label: 'Single Encounters' },
  { id: 'Fossils', label: 'Fossils' },
]
const OSW_METHOD_KEYS = {
  five_x_horde: '5x Horde',
  three_x_horde: '3x Horde',
  single_encounter_only: 'Single Encounter',
  fishing: 'Fishing',
  fossils: 'Fossils',
}
const OSW_REMOTE_QUERY_KEY = ['osw-planner-data']

function getTierPoints(tier) {
  return Number(tierPointsData[`Tier ${Number(tier)}`]) || 0
}

function isValidOswCaughtData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false

  return Object.values(data).some(team => {
    if (!team || typeof team !== 'object') return false
    return TIER_ORDER.some(tier => Array.isArray(team[`Tier ${tier}`]))
  })
}

function normalizeOswCaughtPayload(payload) {
  if (isValidOswCaughtData(payload)) return payload
  if (isValidOswCaughtData(payload?.data)) return payload.data
  return null
}

function buildOswMethodLookup() {
  const lookup = new Map()

  Object.entries(oswEncounterMethods.methods || {}).forEach(([methodKey, methodData]) => {
    const method = OSW_METHOD_KEYS[methodKey]
    if (!method) return

    Object.values(methodData.tiers || {}).forEach(pokemonNames => {
      pokemonNames.forEach(name => {
        const id = normalizePokemonName(name)
        if (!id) return

        const methods = lookup.get(id) || new Set()
        methods.add(method)
        lookup.set(id, methods)
      })
    })
  })

  return lookup
}

const OSW_METHODS_BY_POKEMON = buildOswMethodLookup()

function formatPokemonName(name) {
  if (!name) return ''

  const specialNames = {
    farfetchd: "Farfetch'd",
    'mr-mime': 'Mr. Mime',
    'mime-jr': 'Mime Jr.',
    'nidoran-f': 'Nidoran F',
    'nidoran-m': 'Nidoran M',
    'basculin-blue-striped': 'Basculin (Blue)',
    'basculin-red-striped': 'Basculin (Red)',
    'gastrodon-east': 'Gastrodon (East)',
    'gastrodon-west': 'Gastrodon (West)',
    'frillish-f': 'Frillish F',
    'jellicent-f': 'Jellicent F',
    'unfezant-f': 'Unfezant F',
    'porygon-z': 'Porygon-Z',
  }

  const normalized = normalizePokemonName(name)
  if (specialNames[normalized]) return specialNames[normalized]

  return normalized
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getBasePokemonNames() {
  const seen = new Set()
  const baseNames = []

  Object.values(generationData).forEach(generationLines => {
    generationLines.forEach(line => {
      if (!Array.isArray(line) || line.length === 0) return

      const baseName = normalizePokemonName(String(line[0]))
      if (!baseName || seen.has(baseName)) return

      seen.add(baseName)
      baseNames.push(baseName)
    })
  })

  return baseNames
}
function buildEvolutionFamilyLookup() {
  const lookup = new Map()

  Object.values(generationData).forEach(generationLines => {
    generationLines.forEach(line => {
      if (!Array.isArray(line) || line.length === 0) return

      const evolutionFamily = line
        .map(name => normalizePokemonName(String(name)))
        .filter(Boolean)

      evolutionFamily.forEach(pokemonName => {
        lookup.set(pokemonName, evolutionFamily)
      })
    })
  })

  return lookup
}

const EVOLUTION_FAMILY_BY_POKEMON = buildEvolutionFamilyLookup()

function buildOfficialTierLookup() {
  const lookup = new Map()

  Object.entries(oswEncounterTiers || {}).forEach(([tierKey, tierData]) => {
    const tierMatch = tierKey.match(/^tier_(\d+)$/i)
    if (!tierMatch) return

    const tier = Number(tierMatch[1])
    ;(tierData?.pokemon || []).forEach(name => {
      const id = normalizePokemonName(String(name || ''))
      if (id) lookup.set(id, tier)
    })
  })

  return lookup
}

const OFFICIAL_TIER_BY_POKEMON = buildOfficialTierLookup()

function getOfficialTier(pokemonId) {
  const directTier = OFFICIAL_TIER_BY_POKEMON.get(pokemonId)
  if (directTier !== undefined) return directTier

  const evolutionFamily = EVOLUTION_FAMILY_BY_POKEMON.get(pokemonId) || []
  for (const familyMember of evolutionFamily) {
    const familyTier = OFFICIAL_TIER_BY_POKEMON.get(familyMember)
    if (familyTier !== undefined) return familyTier
  }

  return null
}

function isOfficialTier(pokemon) {
  const tier = Number(pokemon?.shiny_tier)
  return TIER_ORDER.includes(tier)
}

function getDisplayPokemon(name, points = null, tier = null) {
  const pokemon = pokemonData[name]

  return {
    id: name,
    name: formatPokemonName(name),
    points: points !== null
      ? Number(points)
      : Number(pokemon?.shiny_points) || 0,
    tier: tier !== null
      ? Number(tier)
      : Number(pokemon?.shiny_tier),
  }
}
function buildTierColumnsFromTierJson() {
  const columns = TIER_ORDER.reduce((tiers, tier) => {
    tiers[tier] = []
    return tiers
  }, {})

  TIER_ORDER.forEach(tier => {
    const tierData = oswEncounterTiers[`tier_${tier}`]

    if (!tierData) return

    const points = getTierPoints(tier) || Number(tierData.points) || 0

    columns[tier] = (tierData.pokemon || [])
      .map(name => {
        const id = normalizePokemonName(String(name))
        if (!id) return null

        return getDisplayPokemon(id, points, tier)
      })
      .filter(Boolean)
  })

  return columns
}
function buildTierColumnsFromPokemonData() {
  const columns = TIER_ORDER.reduce((tiers, tier) => {
    tiers[tier] = []
    return tiers
  }, {})

  getBasePokemonNames().forEach(name => {
    const pokemon = pokemonData[name]
    const tier = Number(pokemon?.shiny_tier)

    if (!TIER_ORDER.includes(tier)) return

    columns[tier].push(getDisplayPokemon(name))
  })

  TIER_ORDER.forEach(tier => {
    columns[tier].sort((a, b) => a.name.localeCompare(b.name))
  })

  return columns
}

function buildTierColumns() {
  if (!methodJsonUsed) {
    return buildTierColumnsFromTierJson()
  }

  return buildTierColumnsFromPokemonData()
}

function filterTierColumnsByMethod(tierColumns, activeMethod) {
  if (!methodJsonUsed) {
    return tierColumns
  }

  if (activeMethod === 'all') return tierColumns

  return TIER_ORDER.reduce((columns, tier) => {
    columns[tier] = tierColumns[tier].filter(
      pokemon => OSW_METHODS_BY_POKEMON.get(pokemon.id)?.has(activeMethod)
    )

    return columns
  }, {})
}

function getCaughtEntry(entry, tier) {
  if (typeof entry === 'string') {
    const id = normalizePokemonName(entry)
    return id ? { id, player: '', tier } : null
  }

  if (Array.isArray(entry)) {
    const [player, pokemonName] = entry
    const id = normalizePokemonName(String(pokemonName || ''))
    return id ? { id, player: String(player || ''), tier } : null
  }

  if (entry && typeof entry === 'object') {
    const pokemonName = entry.pokemon || entry.Pokemon || entry.name || entry.Name
    const player = entry.player || entry.Player || entry.trainer || entry.Trainer || ''
    const id = normalizePokemonName(String(pokemonName || ''))
    return id ? { id, player: String(player), tier } : null
  }

  return null
}

function getCaughtEntries(teamData) {
  return TIER_ORDER.flatMap(tier => {
    const entries = teamData?.[`Tier ${tier}`] || []
    return entries
      .map(entry => getCaughtEntry(entry, tier))
      .filter(Boolean)
  })
}

function getCaughtPokemon(teamData) {
  const caughtPokemon = getCaughtEntries(teamData).map(entry => {
    // Caught data is stored in tier buckets and may contain legacy misclassifications.
    // The official encounter tiers are the source of truth for display and scoring.
    const tier = getOfficialTier(entry.id) ?? entry.tier
    const points = getTierPoints(tier)

    return {
      ...getDisplayPokemon(entry.id, points, tier),
      player: entry.player.trim(),
      tier,
    }
  })

  const playerTotals = caughtPokemon.reduce((totals, pokemon) => {
    if (!pokemon.player) return totals
    totals.set(pokemon.player, (totals.get(pokemon.player) || 0) + pokemon.points)
    return totals
  }, new Map())

  return caughtPokemon.sort((a, b) => {
    const aHasPlayer = Boolean(a.player)
    const bHasPlayer = Boolean(b.player)

    if (aHasPlayer !== bHasPlayer) return aHasPlayer ? -1 : 1

    const scoreDiff = (playerTotals.get(b.player) || 0) - (playerTotals.get(a.player) || 0)
    if (scoreDiff !== 0) return scoreDiff

    const playerNameDiff = a.player.localeCompare(b.player)
    if (playerNameDiff !== 0) return playerNameDiff

    const pointsDiff = b.points - a.points
    if (pointsDiff !== 0) return pointsDiff

    return a.name.localeCompare(b.name)
  })
}

function getCaughtPokemonByPlayer(caughtPokemon) {
  const groupsByPlayer = new Map()

  caughtPokemon.forEach(pokemon => {
    const playerName = pokemon.player || 'Unassigned'
    const existing = groupsByPlayer.get(playerName)

    if (existing) {
      existing.pokemon.push(pokemon)
      existing.totalPoints += pokemon.points
      return
    }

    groupsByPlayer.set(playerName, {
      player: playerName,
      totalPoints: pokemon.points,
      pokemon: [pokemon],
    })
  })

  return Array.from(groupsByPlayer.values())
}

function getCaughtSet(teamData) {
  const caught = new Set()

  getCaughtEntries(teamData).forEach(entry => {
    const evolutionFamily = EVOLUTION_FAMILY_BY_POKEMON.get(entry.id)

    if (evolutionFamily) {
      evolutionFamily.forEach(pokemonId => {
        caught.add(pokemonId)
      })
    } else {
      caught.add(entry.id)
    }
  })

  return caught
}

function getTeamSummary(tierColumns, caughtSet) {
  return TIER_ORDER.reduce((summary, tier) => {
    tierColumns[tier].forEach(pokemon => {
      summary.totalPokemon += 1
      summary.totalPoints += pokemon.points
      if (caughtSet.has(pokemon.id)) {
        summary.caughtPokemon += 1
        summary.caughtPoints += pokemon.points
      }
    })
    return summary
  }, {
    totalPokemon: 0,
    caughtPokemon: 0,
    totalPoints: 0,
    caughtPoints: 0,
  })
}

export default function OfficialShinyWarsPlanner() {
  const [activeTeamId, setActiveTeamId] = useState('')
  const [activeView, setActiveView] = useState('grid')
  const [activeGridFilter, setActiveGridFilter] = useState('all')

  const {
    data: oswRemotePayload,
    isLoading: isOswRemoteLoading,
    isError: isOswRemoteError,
    error: oswRemoteError,
  } = useQuery({
    queryKey: OSW_REMOTE_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch(API.oswPlannerData)
      if (!response.ok) throw new Error(`Failed to fetch remote planner data: ${response.status}`)
      return response.json()
    },
    staleTime: 60 * 1000,
    retry: 1,
  })

  const remoteCaughtData = useMemo(
    () => normalizeOswCaughtPayload(oswRemotePayload),
    [oswRemotePayload]
  )
  const plannerData = remoteCaughtData || oswCaughtData
  const teams = useMemo(() => (
    Object.entries(plannerData).map(([id, team]) => ({
      id,
      label: team.name || id,
      data: team,
    }))
  ), [plannerData])

  useEffect(() => {
    if (!teams.length) return

    const teamExists = teams.some(team => team.id === activeTeamId)
    if (!teamExists) {
      setActiveTeamId(teams[0].id)
    }
  }, [teams, activeTeamId])

  useDocumentHead({
    title: 'Official Shiny Wars Planner - Team Synergy',
    description: 'Track Official Shiny Wars shiny catches for Team Synergy Tryhard and Casual teams by shiny tier.',
    canonicalPath: '/official-shiny-wars-planner/',
  })

  const tierColumns = useMemo(() => buildTierColumns(), [])
  const filteredTierColumns = useMemo(
    () => filterTierColumnsByMethod(tierColumns, activeGridFilter),
    [tierColumns, activeGridFilter]
  )
  const activeTeam = teams.find(team => team.id === activeTeamId) || teams[0] || { label: 'Team', data: {} }
  const caughtSet = useMemo(() => getCaughtSet(activeTeam?.data), [activeTeam])
  const summary = useMemo(() => getTeamSummary(tierColumns, caughtSet), [tierColumns, caughtSet])
  const caughtPokemon = useMemo(() => getCaughtPokemon(activeTeam?.data), [activeTeam])
  const caughtPokemonByPlayer = useMemo(() => getCaughtPokemonByPlayer(caughtPokemon), [caughtPokemon])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Official Shiny Wars Planner</h1>
        <div className={styles.tabs} role="tablist" aria-label="Official Shiny Wars teams">
          {teams.map(team => (
            <button
              key={team.id}
              type="button"
              className={`${styles.tab} ${team.id === activeTeam?.id ? styles.activeTab : ''}`}
              onClick={() => setActiveTeamId(team.id)}
              role="tab"
              aria-selected={team.id === activeTeam?.id}
            >
              {team.label}
            </button>
          ))}
        </div>
        <div className={styles.summary} aria-label={`${activeTeam.label} progress`}>
          <span>{summary.caughtPokemon} / {summary.totalPokemon} Pokemon</span>
          <span>{summary.caughtPoints} / {summary.totalPoints} Raw Points</span>
        </div>
        <div className={styles.viewTabs} role="tablist" aria-label={`${activeTeam.label} planner views`}>
          {VIEW_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`${styles.viewTab} ${activeView === tab.id ? styles.activeViewTab : ''}`}
              onClick={() => setActiveView(tab.id)}
              role="tab"
              aria-selected={activeView === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>
      
      {activeView === 'grid' && methodJsonUsed && (
        <div
          className={styles.gridFilters}
          role="tablist"
          aria-label="Official Shiny Wars encounter method filters"
        >
          {GRID_FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`${styles.viewTab} ${activeGridFilter === tab.id ? styles.activeViewTab : ''}`}
              onClick={() => setActiveGridFilter(tab.id)}
              role="tab"
              aria-selected={activeGridFilter === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeView === 'grid' && <section className={styles.grid} aria-label={`${activeTeam.label} shiny wars tier planner`}>
        {TIER_ORDER.map(tier => {
          const tierPokemon = filteredTierColumns[tier]
          const tierCaught = tierPokemon.filter(pokemon => caughtSet.has(pokemon.id)).length
          const points = tierColumns[tier][0]?.points || 0

          return (
            <article key={tier} className={styles.tierColumn}>
              <div className={styles.tierHeader}>
                <span>Tier {tier}</span>
                <span>{points} Points</span>
              </div>
              <div className={styles.tierProgress}>{tierCaught} / {tierPokemon.length}</div>
              <div className={styles.pokemonList}>
                {tierPokemon.map(pokemon => {
                  const isCaught = caughtSet.has(pokemon.id)

                  return (
                    <Link
                      key={pokemon.id}
                      to={`/pokemon/${pokemon.id}/`}
                      className={`${styles.pokemonTile} ${isCaught ? styles.caught : ''}`}
                      aria-label={`${pokemon.name}${isCaught ? ' caught' : ''}`}
                    >
                      <img
                        src={getLocalPokemonGif(pokemon.id)}
                        alt=""
                        className={styles.pokemonSprite}
                        width="42"
                        height="42"
                        loading="lazy"
                        onError={onGifError(pokemon.id)}
                      />
                      <span className={styles.pokemonName}>{pokemon.name}</span>
                    </Link>
                  )
                })}
                {tierPokemon.length === 0 && (
                  <div className={styles.emptyTier}>No Pokemon in this filter</div>
                )}
              </div>
            </article>
          )
        })}
      </section>}

      {activeView === 'caught' && (
        <section className={styles.caughtSection} aria-label={`${activeTeam.label} caught shinies`}>
          <div className={styles.spotsHeader}>
            <h2>Caught Shinies</h2>
            <p>{caughtPokemon.length === 0 ? 'No caught shinies have been entered for this team yet.' : `${caughtPokemon.length} caught shinies entered for ${activeTeam.label}.`}</p>
          </div>
          <div className={styles.playerGroups}>
            {caughtPokemonByPlayer.map(group => (
              <section key={group.player} className={styles.playerGroup} aria-label={`${group.player} caught shinies`}>
                <div className={styles.playerHeader}>
                  <h3>{group.player}:</h3>
                  <small>{group.totalPoints} raw pts</small>
                </div>
                <div className={styles.caughtGrid}>
                  {group.pokemon.map((pokemon, index) => (
                    <Link key={`${pokemon.tier}-${pokemon.id}-${pokemon.player || index}`} to={`/pokemon/${pokemon.id}/`} className={styles.caughtCard}>
                      <img
                        src={getLocalPokemonGif(pokemon.id)}
                        alt=""
                        className={styles.caughtSprite}
                        width="54"
                        height="54"
                        loading="lazy"
                        onError={onGifError(pokemon.id)}
                      />
                      <span>{pokemon.name}</span>
                      <small>Tier {pokemon.tier} - {pokemon.points} raw pts</small>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
