import { useQuery } from '@tanstack/react-query'
import trophiesData from '../data/trophies.json'

export function useTrophies() {
  return useQuery({
    queryKey: ['trophies'],
    queryFn: () => trophiesData,
    staleTime: Infinity,
  })
}
