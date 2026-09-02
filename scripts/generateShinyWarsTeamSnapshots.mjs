// Fetches the live player database and snapshots each Synergy Task Force / Synsational
// member's Shiny Wars 2026 catches into static JSON files, so the data survives
// even if a member later leaves the team or is renamed.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'src', 'data')
const DATABASE_URL = 'https://adminpage.hypersmmo.workers.dev/admin/database'

// Mirrors the SW2026 window used in src/components/ShinyItem/ShinyItem.jsx
const SW2026_START = Date.UTC(2026, 7, 1, 0, 0, 0)
const SW2026_END = Date.UTC(2026, 7, 28, 23, 59, 59)

function wasCaughtDuringWar(shiny) {
  const dateStr = shiny.date_caught
  if (dateStr) {
    const d = new Date(dateStr)
    if (!Number.isNaN(d.getTime())) {
      const caught = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes())
      return caught >= SW2026_START && caught <= SW2026_END
    }
  }
  const month = shiny.Month?.trim()
  const year = String(shiny.Year || '').trim()
  return year === '2026' && month === 'August'
}

async function main() {
  const casualTeams = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'CasualTeams.json'), 'utf8'))

  console.log('Fetching live player database...')
  const res = await fetch(DATABASE_URL)
  if (!res.ok) throw new Error(`Failed to fetch database: ${res.status}`)
  const database = await res.json()

  const databaseKeysByLower = new Map(Object.keys(database).map(k => [k.toLowerCase(), k]))

  const teamFileMap = {
    'Synergy Task Force': 'SynergyTaskForceShinyWars2026.json',
    'Synsational': 'SynsationalShinyWars2026.json',
  }

  for (const [teamName, fileName] of Object.entries(teamFileMap)) {
    const roster = casualTeams[teamName] || []
    const snapshot = {}
    const missing = []

    for (const member of roster) {
      const realKey = databaseKeysByLower.get(member.toLowerCase())
      if (!realKey) {
        missing.push(member)
        continue
      }
      const playerData = database[realKey]
      const allShinies = Object.entries(playerData?.shinies || {})
      const warShinies = allShinies.filter(([, s]) => wasCaughtDuringWar(s))

      if (warShinies.length === 0) continue

      const shinies = {}
      warShinies.forEach(([, s], i) => {
        shinies[String(i + 1)] = s
      })

      snapshot[member] = {
        shiny_count: warShinies.length,
        shinies,
      }
    }

    const outPath = path.join(DATA_DIR, fileName)
    fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + '\n')
    console.log(`Wrote ${outPath} (${Object.keys(snapshot).length} players with war catches)`)
    if (missing.length) {
      console.log(`  Not found in live database (${missing.length}): ${missing.join(', ')}`)
    }
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
