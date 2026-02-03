import { useQuery } from '@tanstack/react-query'
import { API } from '../api/endpoints'

export function useDatabase() {
  return useQuery({
    queryKey: ['database'],
    queryFn: () => fetch(API.database).then(r => r.json()),
    staleTime: 2 * 60 * 1000,
  })
}
