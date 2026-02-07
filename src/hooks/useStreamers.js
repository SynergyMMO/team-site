import { useQuery } from '@tanstack/react-query'
import { API } from '../api/endpoints'

async function fetchStreamers() {

  const res = await fetch(API.twitchStreamers)

  if (!res.ok) {
    throw new Error('Failed to load streamer list')
  }

  const data = await res.json()

  return { live: data.live ?? [], offline: data.offline ?? [] }
}


export function useStreamers() {
  return useQuery({
    queryKey: ['streamers'],
    queryFn: fetchStreamers,
    staleTime: 2 * 60 * 1000, // 2 min
  })
}
