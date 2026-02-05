const TRAIT_POINTS = {
  Alpha: 50,
  'Secret Shiny': 10,
  Egg: 5,
  Safari: 5,
  Event: 5,
  'Honey Tree': 5,
}

export { TRAIT_POINTS }

export function calculateShinyPoints(shiny, tierPoints, tierLookup) {
  if (shiny.Sold?.toLowerCase() === 'yes' || shiny.Flee?.toLowerCase() === 'yes') {
    return 0
  }

  const tier = tierLookup[shiny.Pokemon.toLowerCase()] || null

  // Start with Alpha special case
  let total = shiny.Alpha?.toLowerCase() === 'yes' ? TRAIT_POINTS.Alpha : (tierPoints[tier] || 0)

  total += Object.entries(TRAIT_POINTS).reduce((acc, [trait, pts]) => {
    if (trait === 'Alpha') return acc
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
