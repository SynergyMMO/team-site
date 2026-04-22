import { getLocalPokemonGif } from '../utils/pokemon'

const WORKER_BASE = 'https://adminpage.hypersmmo.workers.dev/admin'
const TWITCH_API = 'https://twitch-api.hypersmmo.workers.dev/api/streamers'
const OFFICIAL_EVENTS = 'https://official-events-worker.hypersmmo.workers.dev/events'
const ROUTE_FINDER_WORKER = 'https://route-finder-submission.hypersmmo.workers.dev'

export const API = {
  database: `${WORKER_BASE}/database`,
  themes: `${WORKER_BASE}/themes`,
  theme: `${WORKER_BASE}/theme`,
  streamers: `${WORKER_BASE}/streamers`,
  events: `${WORKER_BASE}/events`,
  adminCheck: `${WORKER_BASE}/check`,
  updateDatabase: `${WORKER_BASE}/update-database`,
  updateStreamers: `${WORKER_BASE}/update-streamers`,
  bounties: `${WORKER_BASE}/bounties`,       
  updateBounties: `${WORKER_BASE}/update-bounties`,
  adminLog: `${WORKER_BASE}/log`,
  twitchStreamers: TWITCH_API,
  pokemonSprite: (name) => getLocalPokemonGif(name),
  currentMembers: `${WORKER_BASE}/current-members`,
  updateCurrentMembers: `${WORKER_BASE}/update-current-members`,
  officialEvents: OFFICIAL_EVENTS,
  routeFinderSubmission: ROUTE_FINDER_WORKER,
  encounterPercents: `${ROUTE_FINDER_WORKER}/encounter-percents`,
};
