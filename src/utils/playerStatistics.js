import tierPokemon from '../data/tier_pokemon.json'
import generationData from '../data/generation.json'

const BLACKLISTED_PLAYERS = new Set([
])

export const MINIMUM_STATS_REQUIREMENTS = {
  totalEncounters: 60000,
  dataCompleteness: 40,
  shinyCount: 5,
}

const pokemonTierMap = {}
Object.entries(tierPokemon).forEach(([tier, pokemons]) => {
  pokemons.forEach((pokemon) => {
    pokemonTierMap[pokemon.toLowerCase()] = tier
  })
})

const getTierNumber = (tier) => {
  if (!tier) return 999
  const match = tier.match(/\d+/)
  return match ? parseInt(match[0], 10) : 999
}

export const getPokemonTier = (pokemonName) => {
  if (!pokemonName) return null
  return pokemonTierMap[pokemonName.toLowerCase()]
}

export const isRarePokemon = (pokemonName) => {
  if (!pokemonName) return false

  if (pokemonName.toLowerCase().includes('alpha')) return true

  const tier = getPokemonTier(pokemonName)
  if (!tier) return false

  return getTierNumber(tier) <= 2
}

const isTruthyFlag = (value) => {
  if (value == null) return false
  const normalized = String(value).trim().toLowerCase()
  return normalized === 'yes' || normalized === 'yws' || normalized === 'y' || normalized === 'true' || normalized === '1'
}

const normalizePokemonForDex = (value) => {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[.'\u2019]/g, '')
    .replace(/[\u2640]/g, 'f')
    .replace(/[\u2642]/g, 'm')
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-')
    .replace(/\s+/g, '-')
    .trim()
    .toLowerCase()
}

const buildSpeciesToLineMap = () => {
  const map = new Map()
  let lineId = 0

  Object.values(generationData || {}).forEach((generationLines) => {
    if (!Array.isArray(generationLines)) return

    generationLines.forEach((line) => {
      if (!Array.isArray(line) || line.length === 0) return

      const currentLineId = `line-${lineId++}`
      line.forEach((species) => {
        const key = normalizePokemonForDex(species)
        if (!key) return
        map.set(key, currentLineId)
      })
    })
  })

  return map
}

const TEAM_DEX_SPECIES_TO_LINE = buildSpeciesToLineMap()

const getPokemonLineKey = (pokemonName) => {
  const key = normalizePokemonForDex(pokemonName)
  if (!key) return null

  if (TEAM_DEX_SPECIES_TO_LINE.has(key)) {
    return TEAM_DEX_SPECIES_TO_LINE.get(key)
  }

  const hyphenIndex = key.indexOf('-')
  if (hyphenIndex === -1) return null

  const baseKey = key.slice(0, hyphenIndex)
  return TEAM_DEX_SPECIES_TO_LINE.get(baseKey) || null
}

const getPlayerTeamDexLineSet = (playerData) => {
  const uniqueLines = new Set()
  const shinies = Object.values(playerData?.shinies || {})

  shinies.forEach((shiny) => {
    const lineKey = getPokemonLineKey(shiny?.Pokemon)
    if (lineKey) uniqueLines.add(lineKey)
  })

  return uniqueLines
}

const getTeamDexUniqueEntryCounts = (data) => {
  const playerLineSets = {}
  const playerLineToPokemon = {}
  const lineOwners = new Map()

  Object.entries(data || {}).forEach(([playerName, playerData]) => {
    const playerLines = getPlayerTeamDexLineSet(playerData)
    playerLineSets[playerName] = playerLines

    const lineToPokemon = new Map()
    Object.values(playerData?.shinies || {}).forEach((shiny) => {
      const lineKey = getPokemonLineKey(shiny?.Pokemon)
      if (lineKey && !lineToPokemon.has(lineKey)) {
        lineToPokemon.set(lineKey, shiny.Pokemon)
      }
    })
    playerLineToPokemon[playerName] = lineToPokemon

    playerLines.forEach((lineKey) => {
      if (!lineOwners.has(lineKey)) {
        lineOwners.set(lineKey, new Set())
      }
      lineOwners.get(lineKey).add(playerName)
    })
  })

  const counts = {}
  const pokemonLists = {}
  Object.entries(playerLineSets).forEach(([playerName, playerLines]) => {
    let uniqueCount = 0
    const uniquePokemon = []

    playerLines.forEach((lineKey) => {
      const owners = lineOwners.get(lineKey)
      if (owners && owners.size === 1 && owners.has(playerName)) {
        uniqueCount++
        const pokemonName = playerLineToPokemon[playerName]?.get(lineKey)
        if (pokemonName) uniquePokemon.push(pokemonName)
      }
    })

    counts[playerName] = uniqueCount
    pokemonLists[playerName] = uniquePokemon
  })

  return { counts, pokemonLists }
}

const getSpeciesDisplayName = (shiny) => {
  const raw = shiny?.Pokemon
  if (!raw) return null
  return String(raw).trim()
}

const getNewLivingDexStats = (data) => {
  const playerSpeciesMaps = {}
  const speciesOwners = new Map()

  Object.entries(data || {}).forEach(([playerName, playerData]) => {
    const speciesMap = new Map()

    Object.values(playerData?.shinies || {}).forEach((shiny) => {
    if (isTruthyFlag(shiny?.Sold)) return  

    const key = normalizePokemonForDex(shiny?.Pokemon)
    const displayName = getSpeciesDisplayName(shiny)
    if (!key || !displayName) return

    if (!speciesMap.has(key)) {
      speciesMap.set(key, displayName)
    }
  })


    playerSpeciesMaps[playerName] = speciesMap

    speciesMap.forEach((_, speciesKey) => {
      if (!speciesOwners.has(speciesKey)) {
        speciesOwners.set(speciesKey, new Set())
      }
      speciesOwners.get(speciesKey).add(playerName)
    })
  })

  const result = {}
  Object.entries(playerSpeciesMaps).forEach(([playerName, speciesMap]) => {
    const uniqueSpecies = []

    speciesMap.forEach((displayName, speciesKey) => {
      const owners = speciesOwners.get(speciesKey)
      if (owners && owners.size === 1 && owners.has(playerName)) {
        uniqueSpecies.push(displayName)
      }
    })

    uniqueSpecies.sort((a, b) => a.localeCompare(b))

    result[playerName] = {
      newLivingDexEntryCount: uniqueSpecies.length,
      newLivingDexEntries: uniqueSpecies,
    }
  })

  return result
}

const parseIvTotal = (ivsValue) => {
  if (ivsValue == null) return null

  if (Array.isArray(ivsValue)) {
    const nums = ivsValue
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value))
      .slice(0, 6)
    if (!nums.length) return null
    return nums.reduce((sum, value) => sum + value, 0)
  }

  if (typeof ivsValue === 'object') {
    const nums = Object.values(ivsValue)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value))
      .slice(0, 6)
    if (!nums.length) return null
    return nums.reduce((sum, value) => sum + value, 0)
  }

  const matches = String(ivsValue).match(/\d+/g)
  if (!matches?.length) return null

  const nums = matches
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .slice(0, 6)
  if (!nums.length) return null

  return nums.reduce((sum, value) => sum + value, 0)
}

const getHighestWildIvStats = (data) => {
  const result = {}

  Object.entries(data || {}).forEach(([playerName, playerData]) => {
    let bestIvTotal = 0
    let bestPokemon = null
    let bestIvText = null

    Object.values(playerData?.shinies || {}).forEach((shiny) => {
      if (getEncounterMethod(shiny) === 'egg') return

      if (getEncounterMethod(shiny) === 'gift') return


      const ivsRaw = shiny?.ivs ?? shiny?.IVs ?? shiny?.Iv ?? shiny?.IV ?? null
      const ivTotal = parseIvTotal(ivsRaw)
      if (!Number.isFinite(ivTotal)) return

      if (ivTotal > bestIvTotal) {
        bestIvTotal = ivTotal
        bestPokemon = shiny?.Pokemon || null
        bestIvText = ivsRaw != null ? String(ivsRaw) : null
      }
    })

    result[playerName] = {
      highestWildIvTotal: bestIvTotal,
      highestWildIvPokemon: bestPokemon,
      highestWildIvSpread: bestIvText,
    }
  })

  return result
}

const getEncounterMethod = (shiny) => {
  return String(shiny?.encounter_method ?? shiny?.method ?? shiny?.Method ?? '').trim().toLowerCase()
}


const normalizePersonKey = (value) => {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

const incrementNameCounter = (counter, name) => {
  const key = normalizePersonKey(name)
  if (!key) return
  counter[key] = (counter[key] || 0) + 1
}

const flattenBountiesPayload = (bountiesData) => {
  if (!bountiesData) return []
  if (typeof bountiesData !== 'object') return []

  const flattened = []
  const seenObjects = new Set()
  const queue = [bountiesData]

  while (queue.length) {
    const current = queue.shift()
    if (!current) continue

    if (Array.isArray(current)) {
      current.forEach((item) => queue.push(item))
      continue
    }

    if (typeof current !== 'object') continue
    if (seenObjects.has(current)) continue
    seenObjects.add(current)

    const looksLikeBounty =
      Object.prototype.hasOwnProperty.call(current, 'host') ||
      Object.prototype.hasOwnProperty.call(current, 'pokemon') ||
      Object.prototype.hasOwnProperty.call(current, 'title') ||
      Object.prototype.hasOwnProperty.call(current, 'claimed') ||
      Object.prototype.hasOwnProperty.call(current, 'id')

    if (looksLikeBounty) {
      flattened.push(current)
    }

    Object.values(current).forEach((value) => queue.push(value))
  }

  return flattened
}

const getBountyHosts = (bounty) => {
  const hostValue = bounty?.host
  if (!hostValue) return []

  if (Array.isArray(hostValue)) {
    return hostValue
      .map((host) => {
        if (host && typeof host === 'object') {
          return normalizePersonKey(host.name || host.username || host.displayName || '')
        }
        return normalizePersonKey(host)
      })
      .filter(Boolean)
  }

  if (hostValue && typeof hostValue === 'object') {
    const objectHost = normalizePersonKey(
      hostValue.name || hostValue.username || hostValue.displayName || hostValue.host || ''
    )
    return objectHost ? [objectHost] : []
  }

  const normalizedText = String(hostValue).replace(/\s*(?:,|&|\/| and )\s*/gi, '|')
  return normalizedText
    .split('|')
    .map((host) => normalizePersonKey(host))
    .filter(Boolean)
}

const getEventHosts = (event) => {
  const hosts = []

  ;['host', 'hostedBy', 'hoster', 'organizer', 'createdBy'].forEach((field) => {
    if (event?.[field]) hosts.push(event[field])
  })

  if (Array.isArray(event?.hosts)) {
    hosts.push(...event.hosts)
  }

  if (Array.isArray(event?.participatingStaff)) {
    hosts.push(...event.participatingStaff)
  }

  if (Array.isArray(event?.hideAndSeekRounds)) {
    event.hideAndSeekRounds.forEach((round) => {
      if (round?.host) hosts.push(round.host)
    })
  }

  const uniqueHosts = new Set()
  hosts.forEach((host) => {
    const key = normalizePersonKey(host)
    if (key) uniqueHosts.add(key)
  })

  return [...uniqueHosts]
}

const buildExternalStatsCounters = (externalData = {}) => {
  const bountyClaimsByName = {}
  const contributorByName = {}

  const allBounties = flattenBountiesPayload(externalData?.bounties)
  allBounties.forEach((bounty) => {
    if (typeof bounty?.claimed === 'string' && bounty.claimed.trim()) {
      incrementNameCounter(bountyClaimsByName, bounty.claimed)
    }

    getBountyHosts(bounty).forEach((hostKey) => {
      contributorByName[hostKey] = (contributorByName[hostKey] || 0) + 1
    })
  })

  const events = Array.isArray(externalData?.events) ? externalData.events : []
  events.forEach((event) => {
    getEventHosts(event).forEach((hostKey) => {
      contributorByName[hostKey] = (contributorByName[hostKey] || 0) + 1
    })
  })

  return { bountyClaimsByName, contributorByName }
}

const normalizeLocationLabel = (location) => {
  if (!location) return null

  const raw = String(location)
    .trim()
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-')

  if (!raw) return null

  const routeMatch = raw.match(/\broute\s*(\d+)\b/i)
  if (routeMatch) {
    return `Route ${routeMatch[1]}`
  }

  const normalized = raw
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s*-\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!normalized) return null

  return normalized.replace(/\b\w/g, (c) => c.toUpperCase())
}

const getLocationComparisonKey = (locationLabel) => {
  if (!locationLabel) return null

  return String(locationLabel)
    .toLowerCase()
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const getMostInWeek = (shinyEntries) => {
  if (shinyEntries.length === 0) return { count: 0, pokemons: [] }

  const datesWithShinies = shinyEntries
    .filter((s) => s.date_caught)
    .map((s) => ({
      date: new Date(s.date_caught),
      pokemon: s.Pokemon,
    }))
    .sort((a, b) => a.date - b.date)

  if (datesWithShinies.length === 0) return { count: 0, pokemons: [] }

  let maxInWeek = 0
  let maxWeekPokemons = []

  for (let i = 0; i < datesWithShinies.length; i++) {
    const weekStart = datesWithShinies[i].date
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)

    const shiniesInWeek = datesWithShinies.filter(
      (s) => s.date >= weekStart && s.date <= weekEnd
    )

    if (shiniesInWeek.length > maxInWeek) {
      maxInWeek = shiniesInWeek.length
      maxWeekPokemons = shiniesInWeek.map((s) => s.pokemon)
    }
  }

  return { count: maxInWeek, pokemons: maxWeekPokemons }
}

export const getPlayerRanks = (data, playerName, externalData = {}) => {
  const stats = calculatePlayerStatistics(data)
  if (!stats || !playerName) return null

  const normalizedTarget = normalizePersonKey(playerName)

  const {
    bountyClaimsByName,
    contributorByName,
  } = buildExternalStatsCounters(externalData)

  const newLivingDexStats = getNewLivingDexStats(data)
  const highestWildIvStats = getHighestWildIvStats(data)
  const teamDexData = getTeamDexUniqueEntryCounts(data)

  // ---------- NORMALIZE ALL PLAYERS ----------
  const allPlayers = Object.values(stats).map((player) => {
    const name = player.name

    const normalized = normalizePersonKey(name)

    return {
      ...player,

      // ensure numeric safety everywhere
      averageEncounter: Number(player.averageEncounter) || 0,
      totalEncounters: Number(player.totalEncounters) || 0,
      maxEncounter: Number(player.maxEncounter) || 0,
      minEncounter: Number(player.minEncounter) || Infinity,

      rareCount: Number(player.rareCount) || 0,
      phasesCount: Number(player.phasesCount) || 0,
      mostInWeekCount: Number(player.mostInWeekCount) || 0,
      singleEncounterCount: Number(player.singleEncounterCount) || 0,
      horde5xCount: Number(player.horde5xCount) || 0,
      fishingCount: Number(player.fishingCount) || 0,
      safariCatchCount: Number(player.safariCatchCount) || 0,
      safariFleeCount: Number(player.safariFleeCount) || 0,

      // external stats (FIXED mapping)
      bountyClaimCount: bountyClaimsByName[normalized] || 0,
      contributorCount: contributorByName[normalized] || 0,

      newLivingDexEntryCount:
        newLivingDexStats[name]?.newLivingDexEntryCount || 0,

      highestWildIvTotal:
        highestWildIvStats[name]?.highestWildIvTotal || 0,

      teamDexEntryCount:
        teamDexData.counts[name] || 0,
    }
  })

  const isValid = (p, key) => {
    const v = p[key]
    return typeof v === "number" && !isNaN(v) && v > 0
  }

  const getRank = (players, sortFn, eligibilityFn = null) => {
    const filtered = eligibilityFn
      ? players.filter(eligibilityFn)
      : players

    const sorted = [...filtered].sort(sortFn)

    const index = sorted.findIndex(
      (p) => normalizePersonKey(p.name) === normalizedTarget
    )

    return index === -1 ? null : index + 1
  }

  // ---------- QUALIFIED GROUPS ----------
  const qualifiedEncounter = allPlayers.filter((p) =>
    isValid(p, "totalEncounters")
  )

  const qualifiedPhases = allPlayers.filter((p) =>
    isValid(p, "phasesCount")
  )

  const qualifiedFishing = allPlayers.filter((p) =>
    isValid(p, "fishingCount")
  )

  const qualifiedAll = allPlayers // for stats that should include everyone

  // ---------- RANKS ----------
  return {
    luckiest: getRank(
      qualifiedEncounter,
      (a, b) => a.averageEncounter - b.averageEncounter
    ),

    unluckiest: getRank(
      qualifiedEncounter,
      (a, b) => b.averageEncounter - a.averageEncounter
    ),

    mostEncounters: getRank(
      qualifiedEncounter,
      (a, b) => b.totalEncounters - a.totalEncounters
    ),

    highestDryStreak: getRank(
      qualifiedEncounter,
      (a, b) => b.maxEncounter - a.maxEncounter
    ),

    lowestEncounter: getRank(
      qualifiedEncounter,
      (a, b) => a.minEncounter - b.minEncounter
    ),

    mostRares: getRank(
      qualifiedAll,
      (a, b) => b.rareCount - a.rareCount,
      (p) => p.rareCount > 0
    ),

    mostPhases: getRank(
      qualifiedPhases,
      (a, b) => b.phasesCount - a.phasesCount
    ),

    mostInWeek: getRank(
      qualifiedAll,
      (a, b) => b.mostInWeekCount - a.mostInWeekCount,
      (p) => p.mostInWeekCount > 0
    ),

    mostSingleEncounters: getRank(
      qualifiedAll,
      (a, b) => b.singleEncounterCount - a.singleEncounterCount,
      (p) => p.singleEncounterCount > 0
    ),

    most5xHordes: getRank(
      qualifiedAll,
      (a, b) => b.horde5xCount - a.horde5xCount,
      (p) => p.horde5xCount > 0
    ),

    mostFishing: getRank(
      qualifiedFishing,
      (a, b) => b.fishingCount - a.fishingCount
    ),

    mostSafariCatches: getRank(
      qualifiedAll,
      (a, b) => b.safariCatchCount - a.safariCatchCount,
      (p) => p.safariCatchCount > 0
    ),

    mostSafariFlees: getRank(
      qualifiedAll,
      (a, b) => b.safariFleeCount - a.safariFleeCount,
      (p) => p.safariFleeCount > 0
    ),

    mostBountiesClaimed: getRank(
      qualifiedAll,
      (a, b) => b.bountyClaimCount - a.bountyClaimCount,
      (p) => p.bountyClaimCount > 0
    ),

    contributors: getRank(
      qualifiedAll,
      (a, b) => b.contributorCount - a.contributorCount,
      (p) => p.contributorCount > 0
    ),

    mostTeamDexEntries: getRank(
      qualifiedAll,
      (a, b) => b.teamDexEntryCount - a.teamDexEntryCount,
      (p) => p.teamDexEntryCount > 0
    ),

    newLivingDexEntries: getRank(
      qualifiedAll,
      (a, b) => b.newLivingDexEntryCount - a.newLivingDexEntryCount,
      (p) => p.newLivingDexEntryCount > 0
    ),

    highestWildIvShiny: getRank(
      qualifiedAll,
      (a, b) => b.highestWildIvTotal - a.highestWildIvTotal,
      (p) => p.highestWildIvTotal > 0
    ),
  }
}



export const calculatePlayerStatistics = (data) => {
  if (!data) return null

  const playerStats = {}

  Object.entries(data).forEach(([playerName, playerData]) => {
    const shinies = playerData.shinies || {}
    const shinyEntries = Object.values(shinies)

    const completeStats = shinyEntries.filter(
      (s) => (s.encounter_count !== null && s.encounter_count !== undefined) &&
             (s.location !== null && s.location !== undefined && s.location !== '')
    )

    const totalShinies = shinyEntries.length
    const dataCompleteness = totalShinies > 0 ? (completeStats.length / totalShinies) * 100 : 0

    const encounterCounts = shinyEntries
      .map((s) => Number(s.encounter_count))
      .filter((count) => Number.isFinite(count))

    const averageEncounter =
      encounterCounts.length > 0
        ? encounterCounts.reduce((a, b) => a + b, 0) / encounterCounts.length
        : 0

    const totalEncounters = encounterCounts.reduce((sum, count) => sum + count, 0)

    let maxEncounter = 0
    let maxEncounterPokemon = null
    if (encounterCounts.length > 0) {
      maxEncounter = Math.max(...encounterCounts)
      const maxEntry = shinyEntries.find((s) => Number(s.encounter_count) === maxEncounter)
      maxEncounterPokemon = maxEntry?.Pokemon || null
    }

    let minEncounter = 0
    let minEncounterPokemon = null
    if (encounterCounts.length > 0) {
      minEncounter = Math.min(...encounterCounts)
      const minEntry = shinyEntries.find((s) => Number(s.encounter_count) === minEncounter)
      minEncounterPokemon = minEntry?.Pokemon || null
    }

    const rareShinies = shinyEntries.filter((s) => isRarePokemon(s.Pokemon))
    const rareCount = rareShinies.length
    const rarePokemons = [...new Set(rareShinies.map((s) => s.Pokemon))]

    const routeMap = {}
    shinyEntries.forEach((s) => {
      const normalizedLocation = normalizeLocationLabel(s.location)
      const locationKey = getLocationComparisonKey(normalizedLocation)
      if (!locationKey) return

      if (!routeMap[locationKey]) {
        routeMap[locationKey] = { label: normalizedLocation, count: 0 }
      }
      routeMap[locationKey].count++
    })

    let topRoute = null
    let maxShinyInRoute = 0
    Object.values(routeMap).forEach(({ label, count }) => {
      if (count > maxShinyInRoute) {
        maxShinyInRoute = count
        topRoute = label
      }
    })

    const weekData = getMostInWeek(shinyEntries)

    const singleEncounterCount = shinyEntries.filter((s) => getEncounterMethod(s) === 'single').length
    const horde5xCount = shinyEntries.filter((s) => getEncounterMethod(s) === '5x horde').length
    const fishingCount = shinyEntries.filter((s) => getEncounterMethod(s) === 'fishing').length

    const safariFleeCount = shinyEntries.filter((s) => isTruthyFlag(s.Safari) && isTruthyFlag(s.Sold)).length
    const safariCatchCount = shinyEntries.filter((s) => isTruthyFlag(s.Safari) && !isTruthyFlag(s.Sold)).length

    playerStats[playerName] = {
      name: playerName,
      shinyCount: totalShinies,
      totalEncounters,
      averageEncounter,
      maxEncounter,
      maxEncounterPokemon,
      minEncounter,
      minEncounterPokemon,
      rareCount,
      rarePokemons,
      phasesCount: maxShinyInRoute,
      topRoute,
      mostInWeekCount: weekData.count,
      mostInWeekPokemons: weekData.pokemons,
      singleEncounterCount,
      horde5xCount,
      fishingCount,
      safariFleeCount,
      safariCatchCount,
      dataCompleteness,
    }
  })

  return playerStats
}

function meetsMinimumRequirements(player) {
  if (!player) return false

  return (
    player.totalEncounters >= MINIMUM_STATS_REQUIREMENTS.totalEncounters &&
    player.dataCompleteness >= MINIMUM_STATS_REQUIREMENTS.dataCompleteness &&
    player.shinyCount >= MINIMUM_STATS_REQUIREMENTS.shinyCount &&
    !BLACKLISTED_PLAYERS.has(player.name)
  )
}

function isNonBlacklistedPlayer(player) {
  return Boolean(player) && !BLACKLISTED_PLAYERS.has(player.name)
}

export const getStatisticsWinners = (data, externalData = {}) => {
  const stats = calculatePlayerStatistics(data)
  if (!stats) return null

  const { bountyClaimsByName, contributorByName } = buildExternalStatsCounters(externalData)

  const allEligiblePlayers = Object.values(stats).filter(isNonBlacklistedPlayer).map((player) => {
    const nameKey = normalizePersonKey(player.name)
    return {
      ...player,
      bountyClaimCount: bountyClaimsByName[nameKey] || 0,
      contributorCount: contributorByName[nameKey] || 0,
    }
  })

  const qualifiedPlayers = allEligiblePlayers.filter((player) => meetsMinimumRequirements(player))

  if (allEligiblePlayers.length === 0) return null

  const byAverageEncounter = [...qualifiedPlayers].sort((a, b) => a.averageEncounter - b.averageEncounter)
  const byMaxEncounter = [...qualifiedPlayers].sort((a, b) => b.maxEncounter - a.maxEncounter)
  const byMinEncounter = [...qualifiedPlayers].sort((a, b) => a.minEncounter - b.minEncounter)
  const byRareCount = [...allEligiblePlayers].sort((a, b) => b.rareCount - a.rareCount)
  const byPhases = [...qualifiedPlayers].sort((a, b) => b.phasesCount - a.phasesCount)
  const byWeek = [...allEligiblePlayers].sort((a, b) => b.mostInWeekCount - a.mostInWeekCount)
  const byMostEncounters = [...qualifiedPlayers].sort((a, b) => b.totalEncounters - a.totalEncounters)
  const bySingleEncounters = [...allEligiblePlayers].sort((a, b) => b.singleEncounterCount - a.singleEncounterCount)
  const byHorde5x = [...allEligiblePlayers].sort((a, b) => b.horde5xCount - a.horde5xCount)
  const byFishing = [...qualifiedPlayers].sort((a, b) => b.fishingCount - a.fishingCount)
  const bySafariFlees = [...allEligiblePlayers].sort((a, b) => b.safariFleeCount - a.safariFleeCount)
  const bySafariCatches = [...allEligiblePlayers].sort((a, b) => b.safariCatchCount - a.safariCatchCount)
  const byBountyClaims = [...allEligiblePlayers].sort((a, b) => b.bountyClaimCount - a.bountyClaimCount)
  const byContributors = [...allEligiblePlayers].sort((a, b) => b.contributorCount - a.contributorCount)

  return {
    luckiest: byAverageEncounter[0],
    unluckiest: byAverageEncounter[byAverageEncounter.length - 1],
    mostEncounters: byMostEncounters[0],
    highestDryStreak: byMaxEncounter[0],
    leastEncounter: byMinEncounter[0],
    mostRares: byRareCount[0],
    mostPhases: byPhases[0],
    mostInWeek: byWeek[0],
    mostSingleEncounters: bySingleEncounters[0],
    most5xHordes: byHorde5x[0],
    mostFishingShinies: byFishing[0],
    mostSafariFlees: bySafariFlees[0],
    mostSafariCatches: bySafariCatches[0],
    mostBountiesClaimed: byBountyClaims[0],
    contributors: byContributors[0],
  }
}

function getQualifiedPlayers(stats) {
  return Object.values(stats).filter((player) => meetsMinimumRequirements(player))
}

function getAllEligiblePlayers(stats) {
  return Object.values(stats).filter((player) => isNonBlacklistedPlayer(player))
}

export const getQualifiedPlayerNames = (data) => {
  const stats = calculatePlayerStatistics(data)
  if (!stats) return new Set()

  return new Set(getQualifiedPlayers(stats).map((player) => player.name))
}

function getTopEntries(players, sortFn, limit = 3, valueFn = () => 1) {
  return [...players]
    .filter((player) => Number(valueFn(player)) > 0)
    .sort(sortFn)
    .slice(0, limit)
}

export const getStatisticsLeaderboards = (data, limit = 3, externalData = {}) => {
  const stats = calculatePlayerStatistics(data)
  if (!stats) return null

  const { bountyClaimsByName, contributorByName } = buildExternalStatsCounters(externalData)
  const newLivingDexStats = getNewLivingDexStats(data)
  const highestWildIvStats = getHighestWildIvStats(data)

  const allEligiblePlayers = getAllEligiblePlayers(stats).map((player) => {
    const nameKey = normalizePersonKey(player.name)
    const newLivingEntry = newLivingDexStats[player.name] || {}
    const highestWildIvEntry = highestWildIvStats[player.name] || {}

    return {
      ...player,
      bountyClaimCount: bountyClaimsByName[nameKey] || 0,
      contributorCount: contributorByName[nameKey] || 0,
      newLivingDexEntryCount: newLivingEntry.newLivingDexEntryCount || 0,
      newLivingDexEntries: newLivingEntry.newLivingDexEntries || [],
      highestWildIvTotal: highestWildIvEntry.highestWildIvTotal || 0,
      highestWildIvPokemon: highestWildIvEntry.highestWildIvPokemon || null,
      highestWildIvSpread: highestWildIvEntry.highestWildIvSpread || null,
    }
  })

  if (!allEligiblePlayers.length) return null

  const qualifiedPlayers = allEligiblePlayers.filter((player) => meetsMinimumRequirements(player))
  const teamDexData = getTeamDexUniqueEntryCounts(data)
  const allPlayersWithTeamDex = Object.entries(data || {}).map(([name]) => {
    return {
      ...(stats[name] || { name }),
      teamDexEntryCount: teamDexData.counts[name] || 0,
      teamDexPokemon: teamDexData.pokemonLists[name] || [],
    }
  })

  return {
    luckiest: getTopEntries(qualifiedPlayers, (a, b) => a.averageEncounter - b.averageEncounter, limit, (p) => p.averageEncounter),
    unluckiest: getTopEntries(qualifiedPlayers, (a, b) => b.averageEncounter - a.averageEncounter, limit, (p) => p.averageEncounter),
    mostEncounters: getTopEntries(qualifiedPlayers, (a, b) => b.totalEncounters - a.totalEncounters, limit, (p) => p.totalEncounters),
    highestDryStreak: getTopEntries(qualifiedPlayers, (a, b) => b.maxEncounter - a.maxEncounter, limit, (p) => p.maxEncounter),
    leastEncounter: getTopEntries(qualifiedPlayers, (a, b) => a.minEncounter - b.minEncounter, limit, (p) => p.minEncounter),
    mostRares: getTopEntries(allEligiblePlayers, (a, b) => b.rareCount - a.rareCount, limit, (p) => p.rareCount),
    mostPhases: getTopEntries(qualifiedPlayers, (a, b) => b.phasesCount - a.phasesCount, limit, (p) => p.phasesCount),
    mostInWeek: getTopEntries(allEligiblePlayers, (a, b) => b.mostInWeekCount - a.mostInWeekCount, limit, (p) => p.mostInWeekCount),
    mostSingleEncounters: getTopEntries(allEligiblePlayers, (a, b) => b.singleEncounterCount - a.singleEncounterCount, limit, (p) => p.singleEncounterCount),
    most5xHordes: getTopEntries(allEligiblePlayers, (a, b) => b.horde5xCount - a.horde5xCount, limit, (p) => p.horde5xCount),
    mostFishingShinies: getTopEntries(qualifiedPlayers, (a, b) => b.fishingCount - a.fishingCount, limit, (p) => p.fishingCount),
    mostSafariCatches: getTopEntries(allEligiblePlayers, (a, b) => b.safariCatchCount - a.safariCatchCount, limit, (p) => p.safariCatchCount),
    mostSafariFlees: getTopEntries(allEligiblePlayers, (a, b) => b.safariFleeCount - a.safariFleeCount, limit, (p) => p.safariFleeCount),
    mostBountiesClaimed: getTopEntries(allEligiblePlayers, (a, b) => b.bountyClaimCount - a.bountyClaimCount, limit, (p) => p.bountyClaimCount),
    contributors: getTopEntries(allEligiblePlayers, (a, b) => b.contributorCount - a.contributorCount, limit, (p) => p.contributorCount),
    newLivingDexEntry: getTopEntries(allEligiblePlayers, (a, b) => b.newLivingDexEntryCount - a.newLivingDexEntryCount, limit, (p) => p.newLivingDexEntryCount),
    highestWildIvShiny: getTopEntries(allEligiblePlayers, (a, b) => b.highestWildIvTotal - a.highestWildIvTotal, limit, (p) => p.highestWildIvTotal),
    mostTeamDexEntrys: getTopEntries(
      allPlayersWithTeamDex,
      (a, b) => b.teamDexEntryCount - a.teamDexEntryCount,
      limit,
      (p) => p.teamDexEntryCount
    ),
  }
}

export const getMostCommonPokemon = (data, limit = 5) => {
  if (!data) return []

  const normalizePokemonKey = (value) => {
    return String(value || '')
      .normalize('NFKC')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
  }

  const counts = {}
  Object.values(data).forEach((playerData) => {
    Object.values(playerData?.shinies || {}).forEach((shiny) => {
      const pokemon = normalizePokemonKey(shiny?.Pokemon)
      if (!pokemon) return
      counts[pokemon] = (counts[pokemon] || 0) + 1
    })
  })

  return Object.entries(counts)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]
      return a[0].localeCompare(b[0])
    })
    .slice(0, limit)
    .map(([pokemon, count]) => ({ pokemon, count }))
}

