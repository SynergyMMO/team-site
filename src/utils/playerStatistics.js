import tierPokemon from '../data/tier_pokemon.json'

// ============================================
// CONFIGURATION: Blacklisted Players
// ============================================
// Add player names here to exclude them from leaderboards
const BLACKLISTED_PLAYERS = new Set([
  'Silentnovavgc',
  `Dracula`
])

// Create a reverse mapping of pokemon to their tier
const pokemonTierMap = {}
Object.entries(tierPokemon).forEach(([tier, pokemons]) => {
  pokemons.forEach(pokemon => {
    pokemonTierMap[pokemon.toLowerCase()] = tier
  })
})

// Get the tier number for sorting
const getTierNumber = (tier) => {
  if (!tier) return 999
  const match = tier.match(/\d+/)
  return match ? parseInt(match[0]) : 999
}

// Get pokemon tier
export const getPokemonTier = (pokemonName) => {
  if (!pokemonName) return null
  const tier = pokemonTierMap[pokemonName.toLowerCase()]
  return tier
}

// Check if pokemon is a rare (Tier 0, 1, or 2)
export const isRarePokemon = (pokemonName) => {
  const tier = getPokemonTier(pokemonName)
  if (!tier) return false
  const tierNum = getTierNumber(tier)
  return tierNum <= 2
}

// Extract route from location string
const getRouteFromLocation = (location) => {
  if (!location) return null
  // Handle formats like "Route 1", "Unova - Route 1", "Sinnoh - Route 101", etc.
  const routeMatch = location.match(/Route\s*(\d+)/i)
  return routeMatch ? `Route ${routeMatch[1]}` : null
}

// Calculate most shinies caught in a 7-day period
const getMostInWeek = (shinyEntries) => {
  if (shinyEntries.length === 0) return { count: 0, pokemons: [] }

  const datesWithShinies = shinyEntries
    .filter(s => s.date_caught)
    .map(s => ({
      date: new Date(s.date_caught),
      pokemon: s.Pokemon,
    }))
    .sort((a, b) => a.date - b.date)

  if (datesWithShinies.length === 0) return { count: 0, pokemons: [] }

  let maxInWeek = 0
  let maxWeekPokemons = []

  // Check each date as a potential start of a week
  for (let i = 0; i < datesWithShinies.length; i++) {
    const weekStart = datesWithShinies[i].date
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)

    const shiniesInWeek = datesWithShinies.filter(
      s => s.date >= weekStart && s.date <= weekEnd
    )

    if (shiniesInWeek.length > maxInWeek) {
      maxInWeek = shiniesInWeek.length
      maxWeekPokemons = shiniesInWeek.map(s => s.pokemon)
    }
  }

  return { count: maxInWeek, pokemons: maxWeekPokemons }
}

export const calculatePlayerStatistics = (data) => {
  if (!data) return null

  const playerStats = {}

  // Initialize stats for each player
  Object.entries(data).forEach(([playerName, playerData]) => {
    const shinies = playerData.shinies || {}
    const shinyEntries = Object.values(shinies)

    // Count shinies with complete stats (both encounter_count and location)
    const completeStats = shinyEntries.filter(
      s => (s.encounter_count !== null && s.encounter_count !== undefined) &&
           (s.location !== null && s.location !== undefined && s.location !== '')
    )

    // Calculate data completeness percentage
    const totalShinies = shinyEntries.length
    const dataCompleteness = totalShinies > 0 ? (completeStats.length / totalShinies) * 100 : 0

    // Calculate average encounters (excluding nulls)
    const encounterCounts = shinyEntries
      .map(s => s.encounter_count)
      .filter(count => count !== null && count !== undefined)

    const averageEncounter =
      encounterCounts.length > 0
        ? encounterCounts.reduce((a, b) => a + b, 0) / encounterCounts.length
        : 0

    // Find max encounter (dry streak) and associated pokemon
    let maxEncounter = 0
    let maxEncounterPokemon = null
    if (encounterCounts.length > 0) {
      maxEncounter = Math.max(...encounterCounts)
      const maxEntry = shinyEntries.find(s => s.encounter_count === maxEncounter)
      maxEncounterPokemon = maxEntry?.Pokemon || null
    }

    // Find min encounter and associated pokemon
    let minEncounter = 0
    let minEncounterPokemon = null
    if (encounterCounts.length > 0) {
      minEncounter = Math.min(...encounterCounts)
      const minEntry = shinyEntries.find(s => s.encounter_count === minEncounter)
      minEncounterPokemon = minEntry?.Pokemon || null
    }

    // Count rare shinies (Tier 0, 1, 2) and get all rare pokemon
    const rareShinies = shinyEntries.filter(s => isRarePokemon(s.Pokemon))
    const rareCount = rareShinies.length
    const rarePokemons = [...new Set(rareShinies.map(s => s.Pokemon))]

    // Calculate most phases (find route with most shinies caught)
    const routeMap = {}
    shinyEntries.forEach(s => {
      const route = getRouteFromLocation(s.location)
      if (route) {
        if (!routeMap[route]) {
          routeMap[route] = 0
        }
        routeMap[route]++
      }
    })
    
    // Find the route with the most shinies
    let topRoute = null
    let maxShinyInRoute = 0
    Object.entries(routeMap).forEach(([route, count]) => {
      if (count > maxShinyInRoute) {
        maxShinyInRoute = count
        topRoute = route
      }
    })

    // Calculate most shinies in a week
    const weekData = getMostInWeek(shinyEntries)

    playerStats[playerName] = {
      name: playerName,
      shinyCount: playerData.shiny_count || 0,
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
      dataCompleteness,
    }
  })

  return playerStats
}

export const getStatisticsWinners = (data) => {
  const stats = calculatePlayerStatistics(data)
  if (!stats) return null

  // Filter players with at least 75% data completeness and not blacklisted
  const qualifiedPlayers = Object.values(stats).filter(
    player => player.dataCompleteness >= 65 && !BLACKLISTED_PLAYERS.has(player.name)
  )

  if (qualifiedPlayers.length === 0) return null

  // Sort by different metrics
  const byAverageEncounter = [...qualifiedPlayers].sort(
    (a, b) => a.averageEncounter - b.averageEncounter
  )

  const byMaxEncounter = [...qualifiedPlayers].sort((a, b) => b.maxEncounter - a.maxEncounter)

  const byMinEncounter = [...qualifiedPlayers].sort((a, b) => a.minEncounter - b.minEncounter)

  const byRareCount = [...qualifiedPlayers].sort((a, b) => b.rareCount - a.rareCount)

  const byPhases = [...qualifiedPlayers].sort((a, b) => b.phasesCount - a.phasesCount)

  const byWeek = [...qualifiedPlayers].sort((a, b) => b.mostInWeekCount - a.mostInWeekCount)

  return {
    luckiest: byAverageEncounter[0],
    unluckiest: byAverageEncounter[byAverageEncounter.length - 1],
    highestDryStreak: byMaxEncounter[0],
    leastEncounter: byMinEncounter[0],
    mostRares: byRareCount[0],
    mostPhases: byPhases[0],
    mostInWeek: byWeek[0],
  }
}
