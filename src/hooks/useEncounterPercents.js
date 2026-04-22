import { useQuery } from '@tanstack/react-query'
import { API } from '../api/endpoints'
import encounterPercentsFallback from '../data/encounter_percents.json'

async function fetchEncounterPercents() {
  const response = await fetch(API.encounterPercents)
  if (!response.ok) {
    throw new Error(`Failed to load encounter percents: ${response.status}`)
  }

  return response.json()
}

export function useEncounterPercents() {
  return useQuery({
    queryKey: ['encounter-percents'],
    queryFn: async () => {
      try {
        return await fetchEncounterPercents()
      } catch (error) {
        console.warn(error)
        return encounterPercentsFallback
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}
