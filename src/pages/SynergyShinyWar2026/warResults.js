import { calculateShinyPoints } from '../../utils/points.js'

const START = Date.UTC(2026, 11, 25)
const END = Date.UTC(2027, 0, 9)
const SHOWCASE_TIME_OFFSET = 8 * 60 * 60 * 1000

export function buildTeamRoster(team, hits = null) {
  const captain = team.captain.trim().toLowerCase()
  const members = new Map()
  for (const name of [team.captain, ...team.players]) {
    const trimmed = name.trim()
    const key = trimmed.toLowerCase()
    if (key && !members.has(key)) {
      members.set(key, { name: trimmed, captain: key === captain, points: hits ? 0 : null })
    }
  }
  if (hits) {
    for (const hit of hits) {
      const member = members.get(hit.player.trim().toLowerCase())
      if (hit.team === team.id && member) member.points += hit.points
    }
  }
  return [...members.values()].sort((a, b) => b.points - a.points)
}

export function buildWarResults(database, teams, tierPoints, tierLookup, exampleHits = []) {
  const players = new Map(
    Object.entries(database).map(([name, data]) => [name.trim().toLowerCase(), { name, data }])
  )
  const hits = exampleHits.map((hit, index) => ({
    ...hit,
    id: `example-${index}`,
    example: true,
  }))

  for (const team of teams) {
    const members = new Set(
      [...team.players, team.captain].map(name => name.trim().toLowerCase()).filter(Boolean)
    )
    for (const member of members) {
      const player = players.get(member)
      if (!player) continue

      for (const [id, shiny] of Object.entries(player.data.shinies || {})) {
        const date = shiny.date_caught || shiny.Date || shiny['Caught Date'] || shiny.Caught
        if (!date || !shiny.Pokemon) continue
        // Showcase timestamps store PST wall-clock time with a UTC suffix.
        const caught = new Date(date).getTime() + SHOWCASE_TIME_OFFSET
        if (!(caught >= START && caught < END)) continue
        hits.push({
          id: `${team.id}-${member}-${id}`,
          team: team.id,
          player: player.name,
          pokemon: shiny.Pokemon,
          points: calculateShinyPoints(shiny, tierPoints, tierLookup),
        })
      }
    }
  }

  hits.sort((a, b) => b.points - a.points)
  return {
    hits,
    teams: teams.map(team => ({
      ...team,
      points: hits.filter(hit => hit.team === team.id).reduce((total, hit) => total + hit.points, 0),
      roster: buildTeamRoster(team, hits),
    })),
  }
}
