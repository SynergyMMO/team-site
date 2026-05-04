import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { calculateShinyPoints } from '../src/utils/points.js'

const DATABASE_URL = 'https://adminpage.hypersmmo.workers.dev/admin/database'
const MONTH_NAMES = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const outputPath = path.join(rootDir, 'src', 'data', 'shotm_history.json')
const tierPokemonPath = path.join(rootDir, 'src', 'data', 'tier_pokemon.json')
const tierPointsPath = path.join(rootDir, 'src', 'data', 'tier_points.json')

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function normalizeMonth(month) {
  return String(month || '').trim().toLowerCase()
}

function normalizeYear(year) {
  return String(year || '').trim()
}

function getMonthKey(month, year) {
  const monthIndex = MONTH_NAMES.indexOf(normalizeMonth(month))
  if (monthIndex === -1 || !normalizeYear(year)) return null
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`
}

function isCurrentMonth(month, year, now = new Date()) {
  return (
    normalizeMonth(month) === MONTH_NAMES[now.getMonth()] &&
    normalizeYear(year) === String(now.getFullYear())
  )
}

function isPastMonth(month, year, now = new Date()) {
  const monthKey = getMonthKey(month, year)
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return Boolean(monthKey && monthKey < currentMonthKey)
}

function buildTierLookup(tierPokemon) {
  const lookup = {}
  Object.entries(tierPokemon).forEach(([tier, names]) => {
    names.forEach((name) => {
      lookup[String(name).toLowerCase()] = tier
    })
  })
  return lookup
}

function buildShotmHistory(database, tierPoints, tierLookup) {
  const months = {}

  Object.entries(database || {}).forEach(([player, playerData]) => {
    Object.entries(playerData?.shinies || {}).forEach(([shinyId, shiny]) => {
      if (!shiny?.Month || !shiny?.Year) return
      if (!isPastMonth(shiny.Month, shiny.Year)) return

      const month = normalizeMonth(shiny.Month)
      const year = normalizeYear(shiny.Year)
      const monthKey = getMonthKey(month, year)
      if (!monthKey) return

      if (!months[monthKey]) {
        months[monthKey] = {
          month,
          year: Number(year),
          players: {},
        }
      }

      if (!months[monthKey].players[player]) {
        months[monthKey].players[player] = {
          points: 0,
          shinies: {},
        }
      }

      const points = calculateShinyPoints(shiny, tierPoints, tierLookup)
      months[monthKey].players[player].points += points
      months[monthKey].players[player].shinies[shinyId] = shiny
    })
  })

  Object.values(months).forEach((monthData) => {
    monthData.rankings = Object.entries(monthData.players)
      .sort((a, b) => b[1].points - a[1].points)
      .map(([player, info]) => ({
        player,
        points: info.points,
        shinyIds: Object.keys(info.shinies),
      }))
  })

  return Object.fromEntries(
    Object.entries(months).sort(([a], [b]) => a.localeCompare(b))
  )
}

async function main() {
  const tierPokemon = readJson(tierPokemonPath)
  const tierPoints = readJson(tierPointsPath)
  const tierLookup = buildTierLookup(tierPokemon)

  const response = await fetch(DATABASE_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch database: ${response.status}`)
  }

  const database = await response.json()
  const months = buildShotmHistory(database, tierPoints, tierLookup)
  const history = {
    generatedAt: new Date().toISOString(),
    source: DATABASE_URL,
    months,
  }

  fs.writeFileSync(outputPath, `${JSON.stringify(history, null, 2)}\n`)
  console.log(`Saved ${Object.keys(months).length} SHOTM month snapshots to ${path.relative(rootDir, outputPath)}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
