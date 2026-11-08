const TRAIT_POINTS = {
  Alpha: 100,
  'Secret Shiny': 10,
  Egg: 5,
  Safari: 5,
  Event: 5,
  'Honey Tree': 5,
  Fossil: 5,
  Swarm: 5,
  Fishing: 0,
  Headbutt: 10,
  Costumed: 40,
}

export { TRAIT_POINTS }

export function calculateShinyPoints(shiny, tierPoints, tierLookup) {
  if (shiny.Sold?.toLowerCase() === 'yes' || shiny.Flee?.toLowerCase() === 'yes') {
    return 0
  }

  const tier = tierLookup[shiny.Pokemon.toLowerCase()] || null
  const hasReplacementScore =
    shiny.Alpha?.toLowerCase() === 'yes' ||
    shiny.Costumed?.toLowerCase() === 'yes'

  let total = shiny.Alpha?.toLowerCase() === 'yes'
    ? TRAIT_POINTS.Alpha
    : shiny.Costumed?.toLowerCase() === 'yes'
      ? TRAIT_POINTS.Costumed
      : tierPoints[tier] || 0

  total += Object.entries(TRAIT_POINTS).reduce((acc, [trait, pts]) => {
    if (hasReplacementScore || trait === 'Alpha' || trait === 'Costumed') return acc
    if (trait === 'Egg') {
      if (tier && tierPoints[tier] < tierPoints['Tier 1'] && shiny[trait]?.toLowerCase() === 'yes') {
        return acc + pts
      }
      return acc
    }

    return acc + (shiny[trait]?.toLowerCase() === 'yes' ? pts : 0)
  }, 0)

  return total
}
