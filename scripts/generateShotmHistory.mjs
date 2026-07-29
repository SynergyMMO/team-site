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
const pausedMonthsPath = path.join(rootDir, 'src', 'data', 'shotm_paused_months.json')

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function readJsonIfExists(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback
  return readJson(filePath)
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

function getCurrentMonthKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function isCurrentMonth(month, year, now = new Date()) {
  return (
    normalizeMonth(month) === MONTH_NAMES[now.getMonth()] &&
    normalizeYear(year) === String(now.getFullYear())
  )
}

function isPastMonth(month, year, now = new Date()) {
  const monthKey = getMonthKey(month, year)
  const currentMonthKey = getCurrentMonthKey(now)
  return Boolean(monthKey && monthKey < currentMonthKey)
}

function parsePausedMonthEntry(entry, now = new Date()) {
  const value = String(entry || '').trim().toLowerCase()
  if (!value) return null

  const keyMatch = value.match(/^(\d{4})-(\d{2})$/)
  if (keyMatch) {
    const monthNumber = Number(keyMatch[2])
    if (monthNumber >= 1 && monthNumber <= 12) {
      return `${keyMatch[1]}-${keyMatch[2]}`
    }
  }

  const monthYearMatch = value.match(/^([a-z]+)[\s-]+(\d{4})$/)
  if (monthYearMatch) {
    const monthIndex = MONTH_NAMES.indexOf(monthYearMatch[1])
    if (monthIndex !== -1) {
      return `${monthYearMatch[2]}-${String(monthIndex + 1).padStart(2, '0')}`
    }
  }

  const monthOnlyIndex = MONTH_NAMES.indexOf(value)
  if (monthOnlyIndex !== -1) {
    return `${now.getFullYear()}-${String(monthOnlyIndex + 1).padStart(2, '0')}`
  }

  return null
}

function buildPausedMonthKeys(config, now = new Date()) {
  const keys = new Set()
  const invalidEntries = []
  ;(config || []).forEach((entry) => {
    const key = parsePausedMonthEntry(entry, now)
    if (!key) {
      invalidEntries.push(entry)
      return
    }
    keys.add(key)
  })
  return {
    keys,
    invalidEntries,
  }
}

function shouldIncludeMonth(month, year, pausedMonthKeys, now = new Date()) {
  const monthKey = getMonthKey(month, year)
  if (!monthKey) return false
  return isPastMonth(month, year, now) || pausedMonthKeys.has(monthKey)
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

function buildShotmHistory(database, tierPoints, tierLookup, { pausedMonthKeys = new Set(), frozenMonths = {} } = {}) {
  const months = {}
  const frozenMonthKeys = new Set(Object.keys(frozenMonths || {}))

  Object.entries(database || {}).forEach(([player, playerData]) => {
    Object.entries(playerData?.shinies || {}).forEach(([shinyId, shiny]) => {
      if (!shiny?.Month || !shiny?.Year) return
      if (!shouldIncludeMonth(shiny.Month, shiny.Year, pausedMonthKeys)) return

      const month = normalizeMonth(shiny.Month)
      const year = normalizeYear(shiny.Year)
      const monthKey = getMonthKey(month, year)
      if (!monthKey) return
      if (frozenMonthKeys.has(monthKey)) return

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

  Object.entries(frozenMonths || {}).forEach(([monthKey, monthData]) => {
    months[monthKey] = monthData
  })

  return Object.fromEntries(
    Object.entries(months).sort(([a], [b]) => a.localeCompare(b))
  )
}

async function main() {
  const tierPokemon = readJson(tierPokemonPath)
  const tierPoints = readJson(tierPointsPath)
  const tierLookup = buildTierLookup(tierPokemon)
  const pausedMonthConfig = readJsonIfExists(pausedMonthsPath, [])
  const { keys: pausedMonthKeys, invalidEntries } = buildPausedMonthKeys(pausedMonthConfig)
  const existingHistory = readJsonIfExists(outputPath, { months: {} })

  if (invalidEntries.length) {
    console.warn(`Ignoring invalid paused month entries: ${invalidEntries.map(String).join(', ')}`)
  }

  const frozenMonths = {}
  pausedMonthKeys.forEach((monthKey) => {
    if (existingHistory?.months?.[monthKey]) {
      frozenMonths[monthKey] = existingHistory.months[monthKey]
    }
  })

  const response = await fetch(DATABASE_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch database: ${response.status}`)
  }

  const database = await response.json()
  const months = buildShotmHistory(database, tierPoints, tierLookup, {
    pausedMonthKeys,
    frozenMonths,
  })
  const history = {
    generatedAt: new Date().toISOString(),
    source: DATABASE_URL,
    pausedMonths: [...pausedMonthKeys].sort(),
    months,
  }

  fs.writeFileSync(outputPath, `${JSON.stringify(history, null, 2)}\n`)
  console.log(
    `Saved ${Object.keys(months).length} SHOTM month snapshots to ${path.relative(rootDir, outputPath)} ` +
      `(paused: ${pausedMonthKeys.size}, frozen: ${Object.keys(frozenMonths).length})`
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
