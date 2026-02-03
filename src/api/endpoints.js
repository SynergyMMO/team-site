const WORKER_BASE = 'https://adminpage.hypersmmo.workers.dev/admin'
const TWITCH_API = 'https://twitch-api.hypersmmo.workers.dev/api/streamers'
const POKEMON_SPRITE = 'https://img.pokemondb.net/sprites/black-white/anim'

export const API = {
  database: `${WORKER_BASE}/database`,
  streamers: `${WORKER_BASE}/streamers`,
  adminCheck: `${WORKER_BASE}/check`,
  updateDatabase: `${WORKER_BASE}/update-database`,
  updateStreamers: `${WORKER_BASE}/update-streamers`,
  adminLog: `${WORKER_BASE}/log`,
  twitchStreamers: TWITCH_API,
  pokemonSprite: (name, shiny = true) =>
    `${POKEMON_SPRITE}/${shiny ? 'shiny' : 'normal'}/${name}.gif`,
}
