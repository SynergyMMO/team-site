import { useQuery } from '@tanstack/react-query'
import { getAssetUrl } from '../utils/assets'
import trophiesData from '../data/trophies.json'

export function useTrophies() {
  return useQuery({
    queryKey: ['trophies'],
    queryFn: () => {
      // Transform trophy image paths to include base URL
      const transformedTrophies = {}
      for (const [key, value] of Object.entries(trophiesData.trophies)) {
        transformedTrophies[key] = getAssetUrl(value.replace(/^\//, ''))
      }
      return {
        trophies: transformedTrophies,
        trophyAssignments: trophiesData.trophyAssignments
      }
    },
    staleTime: Infinity,
  })
}
