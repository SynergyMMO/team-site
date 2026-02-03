import { useQuery } from '@tanstack/react-query'
import { API } from '../api/endpoints'

async function fetchStreamers() {
  const res = await fetch(API.streamers)
  if (!res.ok) throw new Error('Failed to load streamer list')
  const data = await res.json()
  const usernames = Object.values(data).map(s => s.twitch_username)

  const results = await Promise.all(
    usernames.map(username =>
      fetch(`${API.twitchStreamers}?user_login=${username}`)
        .then(r => (r.ok ? r.json() : null))
        .catch(() => null)
    )
  )

  const live = []
  const offline = []
  results.forEach(res => {
    if (!res) return
    if (res.live && res.live.length) live.push(...res.live)
    if (res.offline && res.offline.length) offline.push(...res.offline)
  })

  return { live, offline }
}

export function useStreamers() {
  return useQuery({
    queryKey: ['streamers'],
    queryFn: fetchStreamers,
    staleTime: 2 * 60 * 1000,
  })
}
