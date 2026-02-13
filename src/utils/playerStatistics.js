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

    // Find max encounter (dry streak)
    const maxEncounter = encounterCounts.length > 0 ? Math.max(...encounterCounts) : 0

    // Find min encounter
    const minEncounter = encounterCounts.length > 0 ? Math.min(...encounterCounts) : 0

    // Count rare shinies (Tier 0, 1, 2)
    const rareCount = shinyEntries.filter(s => isRarePokemon(s.Pokemon)).length

    playerStats[playerName] = {
      name: playerName,
      shinyCount: playerData.shiny_count || 0,
      averageEncounter,
      maxEncounter,
      minEncounter,
      rareCount,
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

  return {
    luckiest: byAverageEncounter[0],
    unluckiest: byAverageEncounter[byAverageEncounter.length - 1],
    highestDryStreak: byMaxEncounter[0],
    leastEncounter: byMinEncounter[0],
    mostRares: byRareCount[0],
  }
}
