import { useMemo } from 'react'

export function useTieredShinies(
  shotmData,
  tierLookup,
  {
    onlyCurrentMonth = false,       
    tiersToInclude = ['Tier 3','Tier 2','Tier 1','Tier 0'],
    includeAlpha = true,
    selectedMonth,
    selectedYear,
  } = {}
) {
  return useMemo(() => {
    const tiers = {}

    Object.entries(shotmData || {}).forEach(([player, info]) => {
      if (!info.shinies) return

      const shiniesArray = Array.isArray(info.shinies)
        ? info.shinies
        : Object.entries(info.shinies)

      shiniesArray.forEach(([, s]) => {
        if (!s || !s.Pokemon) return

        if (onlyCurrentMonth) {
          const month = selectedMonth || new Date().toLocaleString('default', { month: 'long' }).toLowerCase()
          const year = selectedYear || new Date().getFullYear()
          if (s.Month?.toLowerCase() !== month || String(s.Year) !== String(year)) return
        }

        const tier = tierLookup[s.Pokemon.toLowerCase()]
        const isTierValid = tier && tiersToInclude.includes(tier)
        const isAlpha = s.Alpha?.toLowerCase() === 'yes'

        if (!isTierValid && !(includeAlpha && isAlpha)) return

        const pokemonName = s.Pokemon.charAt(0).toUpperCase() + s.Pokemon.slice(1).toLowerCase()
        const displayTier = isTierValid ? tier : 'Alpha'

        if (!tiers[displayTier]) tiers[displayTier] = {}
        if (!tiers[displayTier][pokemonName]) tiers[displayTier][pokemonName] = new Set()
        tiers[displayTier][pokemonName].add(player)
      })
    })

    Object.keys(tiers).forEach(t => {
      Object.keys(tiers[t]).forEach(p => {
        tiers[t][p] = [...tiers[t][p]].sort()
      })
    })

    return tiers
  }, [shotmData, tierLookup, onlyCurrentMonth, tiersToInclude.join(','), includeAlpha, selectedMonth, selectedYear])
}
