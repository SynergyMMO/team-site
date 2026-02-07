import { useQuery } from '@tanstack/react-query'
import { API } from '../api/endpoints'

async function fetchStreamers() {

  const res = await fetch(API.streamers)

  if (!res.ok) {
    throw new Error('Failed to load streamer list')
  }

  const data = await res.json()

  const allStreamers = Object.values(data)
  const live = allStreamers.filter(s => s.live)
  const offline = allStreamers.filter(s => !s.live)


  return { live, offline }
}


export function useStreamers() {
  return useQuery({
    queryKey: ['streamers'],
    queryFn: fetchStreamers,
    staleTime: 2 * 60 * 1000, // 2 min
  })
}
