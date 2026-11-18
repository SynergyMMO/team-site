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
  const tierPts = tierPoints[tier] || 0

  let basePts
  let hasReplacementScore

  if (shiny.Alpha?.toLowerCase() === 'yes') {
    basePts = TRAIT_POINTS.Alpha
    hasReplacementScore = true
  } else if (shiny.Costumed?.toLowerCase() === 'yes') {
    // If tier points are higher than costume default (40), use tier points
    basePts = tierPts > TRAIT_POINTS.Costumed ? tierPts : TRAIT_POINTS.Costumed
    hasReplacementScore = true
  } else {
    basePts = tierPts
    hasReplacementScore = false
  }

  let total = basePts

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
