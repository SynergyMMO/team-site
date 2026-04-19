#!/usr/bin/env node

import express from 'express'
import fs from 'fs'
import path from 'path'
import open from 'open'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, '..')
const publicDir = path.join(__dirname, 'public')
const encounterPath = path.join(repoRoot, 'src', 'data', 'encounter_percents.json')
const pokemonDataPath = path.join(repoRoot, 'src', 'data', 'pokemmo_data', 'pokemon-data.json')
const app = express()
const PORT = Number(process.env.ENCOUNTER_EDITOR_PORT || 5177)
const MAX_PORT_ATTEMPTS = 20
const regionNames = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova']

app.use(express.json({ limit: '10mb' }))

function loadEncounters() {
  const data = JSON.parse(fs.readFileSync(encounterPath, 'utf8'))
  for (const region of regionNames) {
    if (!data[region] || typeof data[region] !== 'object' || Array.isArray(data[region])) {
      data[region] = {}
    }
  }
  return data
}

function saveEncounters(data) {
  fs.writeFileSync(encounterPath, `${JSON.stringify(data, null, 2)}\n`)
}

function routeDisplayName(routeKey, entry = {}) {
  return String(entry.route || routeKey || '').trim()
}

function normalizeVariation(value) {
  return String(value || '').trim().toLowerCase()
}

function routeKeyBase(name, variation) {
  const cleanName = String(name || '').trim()
  const cleanVariation = String(variation || '').trim()
  return cleanVariation ? `${cleanName} - ${cleanVariation}` : cleanName
}

function findRouteVariant(regionData, name, variation, ignoreKey = null) {
  const targetName = String(name || '').trim().toLowerCase()
  const targetVariation = normalizeVariation(variation)

  return Object.entries(regionData).find(([key, entry]) => {
    if (key === ignoreKey) return false
    return routeDisplayName(key, entry).toLowerCase() === targetName
      && normalizeVariation(entry?.variation) === targetVariation
  })
}

function uniqueRouteKey(regionData, name, variation, ignoreKey = null) {
  const existingVariant = findRouteVariant(regionData, name, variation, ignoreKey)
  if (existingVariant) {
    throw new Error('A route with that variation already exists')
  }

  const preferredKey = routeKeyBase(name, variation)
  if (!regionData[preferredKey] || preferredKey === ignoreKey) return preferredKey

  let index = 2
  let nextKey = `${preferredKey} (${index})`
  while (regionData[nextKey] && nextKey !== ignoreKey) {
    index += 1
    nextKey = `${preferredKey} (${index})`
  }
  return nextKey
}

function titleCasePokemon(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function loadPokemonNames() {
  try {
    const data = JSON.parse(fs.readFileSync(pokemonDataPath, 'utf8'))
    return Object.keys(data)
      .map(titleCasePokemon)
      .sort((a, b) => a.localeCompare(b))
  } catch (error) {
    console.warn(`Could not load Pokemon names: ${error.message}`)
    return []
  }
}

function normalizePokemonName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function levenshtein(a, b) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  const current = Array.from({ length: b.length + 1 }, () => 0)

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      )
    }
    previous.splice(0, previous.length, ...current)
  }

  return previous[b.length]
}

function findPokemonName(rawName, pokemonNames) {
  const normalizedRaw = normalizePokemonName(rawName)
  if (!normalizedRaw) return null

  const exact = pokemonNames.find((name) => normalizePokemonName(name) === normalizedRaw)
  if (exact) return exact

  let best = null
  for (const name of pokemonNames) {
    const normalizedName = normalizePokemonName(name)
    const distance = levenshtein(normalizedRaw, normalizedName)
    const limit = Math.max(1, Math.floor(normalizedName.length * 0.24))
    if (distance <= limit && (!best || distance < best.distance)) {
      best = { name, distance }
    }
  }

  return best?.name || null
}

function parseEncounterScreenshotText(text, pokemonNames) {
  const rows = []
  const seen = new Set()
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/\bpin\b/gi, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  for (const line of lines) {
    if (/pokemon|species|encounter/i.test(line) && !/\d/.test(line)) continue

    const numberMatch = line.match(/\b\d{1,7}\b/)
    if (!numberMatch) continue

    const encounters = Number(numberMatch[0])
    const namePart = line
      .slice(0, numberMatch.index)
      .replace(/[^A-Za-z0-9.' -]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    const pokemon = findPokemonName(namePart, pokemonNames)
    if (!pokemon || seen.has(pokemon.toLowerCase())) continue

    rows.push({ pokemon, encounters })
    seen.add(pokemon.toLowerCase())
  }

  return rows
}

function getImageSize(buffer) {
  if (buffer.length >= 24 && buffer.toString('ascii', 1, 4) === 'PNG') {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    }
  }

  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) break
      const marker = buffer[offset + 1]
      const length = buffer.readUInt16BE(offset + 2)
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
          0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
        ].includes(marker)
      ) {
        return {
          width: buffer.readUInt16BE(offset + 7),
          height: buffer.readUInt16BE(offset + 5),
        }
      }
      offset += 2 + length
    }
  }

  return null
}

function columnRect(size, left, top, width, height) {
  return {
    left: Math.round(size.width * left),
    top: Math.round(size.height * top),
    width: Math.round(size.width * width),
    height: Math.round(size.height * height),
  }
}

function getBBox(item) {
  const box = item?.bbox
  if (!box) return null

  if (Number.isFinite(box.x0) && Number.isFinite(box.x1)) {
    return {
      x0: box.x0,
      y0: box.y0,
      x1: box.x1,
      y1: box.y1,
    }
  }

  if (Number.isFinite(box.left) && Number.isFinite(box.width)) {
    return {
      x0: box.left,
      y0: box.top,
      x1: box.left + box.width,
      y1: box.top + box.height,
    }
  }

  return null
}

function groupWordsIntoLines(words) {
  const lines = []

  for (const word of words || []) {
    const text = String(word.text || '').trim()
    const bbox = getBBox(word)
    if (!text || !bbox) continue

    const centerY = (bbox.y0 + bbox.y1) / 2
    const line = lines.find((current) => Math.abs(current.centerY - centerY) <= 10)

    if (line) {
      line.words.push({ text, bbox })
      line.centerY = (line.centerY + centerY) / 2
      line.bbox = {
        x0: Math.min(line.bbox.x0, bbox.x0),
        y0: Math.min(line.bbox.y0, bbox.y0),
        x1: Math.max(line.bbox.x1, bbox.x1),
        y1: Math.max(line.bbox.y1, bbox.y1),
      }
    } else {
      lines.push({ centerY, words: [{ text, bbox }], bbox: { ...bbox } })
    }
  }

  return lines
    .map((line) => ({
      ...line,
      text: line.words
        .sort((a, b) => a.bbox.x0 - b.bbox.x0)
        .map((word) => word.text)
        .join(' '),
    }))
    .sort((a, b) => a.centerY - b.centerY)
}

function parsePokemonPositionRows(ocrData, pokemonNames) {
  const seen = new Set()

  return groupWordsIntoLines(ocrData?.words || [])
    .map((line) => {
      if (/pokemon|species|encounter|pin/i.test(line.text)) return null
      const pokemon = findPokemonName(line.text, pokemonNames)
      if (!pokemon || seen.has(pokemon.toLowerCase())) return null
      seen.add(pokemon.toLowerCase())
      return { pokemon, centerY: line.centerY, bbox: line.bbox }
    })
    .filter(Boolean)
}

function parsePokemonColumn(text, pokemonNames) {
  const rows = []
  const seen = new Set()
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/[^A-Za-z0-9.' -]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  for (const line of lines) {
    if (/pokemon|species|encounter|pin/i.test(line)) continue
    const pokemon = findPokemonName(line, pokemonNames)
    if (!pokemon || seen.has(pokemon.toLowerCase())) continue
    rows.push(pokemon)
    seen.add(pokemon.toLowerCase())
  }

  return rows
}

function parseEncounterColumn(text) {
  return String(text || '')
    .split(/\r?\n/)
    .flatMap((line) => line.match(/\d{1,7}/g) || [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
}

function pairColumnRows(pokemonRows, encounterRows) {
  const length = Math.min(pokemonRows.length, encounterRows.length)
  return Array.from({ length }, (_, index) => ({
    pokemon: pokemonRows[index],
    encounters: encounterRows[index],
  }))
}

function rowBand(positionRows, index, imageHeight) {
  const row = positionRows[index]
  const previous = positionRows[index - 1]
  const next = positionRows[index + 1]
  const fallbackHeight = Math.max(28, Math.round(imageHeight * 0.16))
  const estimatedHeight = next
    ? next.centerY - row.centerY
    : previous
      ? row.centerY - previous.centerY
      : fallbackHeight
  const height = Math.max(24, Math.min(fallbackHeight, estimatedHeight + 12))
  const top = Math.max(0, Math.round(row.centerY - height / 2))
  return {
    top,
    height: Math.min(imageHeight - top, Math.round(height)),
  }
}

function cleanEncounterNumber(text) {
  const numbers = String(text || '').match(/\d{1,7}/g) || []
  if (numbers.length === 0) return null
  return Number(numbers.sort((a, b) => b.length - a.length)[0])
}

function imageDataToBuffer(imageData) {
  const match = String(imageData || '').match(/^data:image\/[a-z0-9.+-]+;base64,(.+)$/i)
  if (!match) throw new Error('Image upload is missing or invalid')
  return Buffer.from(match[1], 'base64')
}

function normalizeRoute(body, routeName = '') {
  const data = Array.isArray(body.data)
    ? body.data
        .map((entry) => ({
          pokemon: String(entry.pokemon || '').trim(),
          encounters: Number(entry.encounters) || 0,
        }))
        .filter((entry) => entry.pokemon)
    : []
  const total = data.reduce((sum, entry) => sum + entry.encounters, 0)

  return {
    route: String(body.route || routeName || '').trim(),
    credit: String(body.credit || '').trim(),
    variation: String(body.variation || '').trim(),
    total,
    data,
  }
}

function validateRegion(region) {
  if (!regionNames.includes(region)) {
    throw new Error(`Unknown region: ${region}`)
  }
}

function sortedRoutes(regionData) {
  return Object.keys(regionData).sort((a, b) => {
    const routeCompare = routeDisplayName(a, regionData[a])
      .localeCompare(routeDisplayName(b, regionData[b]), undefined, { numeric: true })
    if (routeCompare !== 0) return routeCompare
    return String(regionData[a]?.variation || '')
      .localeCompare(String(regionData[b]?.variation || ''), undefined, { numeric: true })
  })
}

app.get('/', (req, res) => {
  res.redirect('/encountereditor')
})

app.get('/encountereditor', (req, res) => {
  res.sendFile(path.join(publicDir, 'encounter-editor.html'))
})

app.get('/api/encounter-percents', (req, res) => {
  const data = loadEncounters()
  res.json({
    regions: regionNames,
    routes: Object.fromEntries(regionNames.map((region) => [region, sortedRoutes(data[region])])),
    data,
  })
})

app.get('/api/pokemon-names', (req, res) => {
  res.json(loadPokemonNames())
})

app.post('/api/import-encounter-screenshot', async (req, res) => {
  try {
    const imageBuffer = imageDataToBuffer(req.body.imageData)
    const pokemonNames = loadPokemonNames()
    const { createWorker } = await import('tesseract.js').catch(() => {
      throw new Error('OCR dependency is missing. Run npm install, then restart the encounter editor.')
    })

    const worker = await createWorker('eng')
    try {
      const size = getImageSize(imageBuffer)
      let columnRows = []
      let nameText = ''
      let encounterText = ''
      let positionedRows = []
      let rowNumberText = []

      if (size) {
        await worker.setParameters({
          tessedit_pageseg_mode: '6',
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .-',
        })
        const nameResult = await worker.recognize(imageBuffer, {
          rectangle: columnRect(size, 0.08, 0.04, 0.54, 0.94),
        })
        nameText = nameResult?.data?.text || ''
        positionedRows = parsePokemonPositionRows(nameResult?.data, pokemonNames)

        await worker.setParameters({
          tessedit_pageseg_mode: '6',
          tessedit_char_whitelist: '0123456789',
        })
        const encounterResult = await worker.recognize(imageBuffer, {
          rectangle: columnRect(size, 0.6, 0.04, 0.26, 0.94),
        })
        encounterText = encounterResult?.data?.text || ''

        columnRows = pairColumnRows(
          positionedRows.length
            ? positionedRows.map((row) => row.pokemon)
            : parsePokemonColumn(nameText, pokemonNames),
          parseEncounterColumn(encounterText),
        )

        if (positionedRows.length) {
          const rowRows = []
          await worker.setParameters({
            tessedit_pageseg_mode: '7',
            tessedit_char_whitelist: '0123456789',
          })

          for (let index = 0; index < positionedRows.length; index += 1) {
            const band = rowBand(positionedRows, index, size.height)
            const numberResult = await worker.recognize(imageBuffer, {
              rectangle: {
                left: Math.round(size.width * 0.6),
                top: band.top,
                width: Math.round(size.width * 0.26),
                height: band.height,
              },
            })
            const numberText = numberResult?.data?.text || ''
            rowNumberText.push(numberText)
            const encounters = cleanEncounterNumber(numberText)
            if (encounters !== null) {
              rowRows.push({ pokemon: positionedRows[index].pokemon, encounters })
            }
          }

          if (rowRows.length >= columnRows.length) {
            columnRows = rowRows
          }
        }
      }

      await worker.setParameters({
        tessedit_pageseg_mode: '6',
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .-',
      })
      const result = await worker.recognize(imageBuffer)
      const text = result?.data?.text || ''
      const fallbackRows = parseEncounterScreenshotText(text, pokemonNames)
      const rows = columnRows.length >= fallbackRows.length ? columnRows : fallbackRows
      res.json({
        success: true,
        rows,
        text,
        debug: { nameText, encounterText, rowNumberText, positionedRows, columnRows, fallbackRows },
      })
    } finally {
      await worker.terminate()
    }
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

app.post('/api/regions/:region/routes', (req, res) => {
  try {
    const { region } = req.params
    const name = String(req.body.name || '').trim()
    const variation = String(req.body.variation || '').trim()
    validateRegion(region)
    if (!name) return res.status(400).json({ error: 'Route name is required' })

    const data = loadEncounters()
    const routeKey = uniqueRouteKey(data[region], name, variation)

    data[region][routeKey] = normalizeRoute({
      route: name,
      credit: req.body.credit || '',
      variation,
      total: req.body.total || 0,
      data: req.body.data || [],
    }, name)
    saveEncounters(data)
    res.json({ success: true, route: routeKey, entry: data[region][routeKey] })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

app.put('/api/regions/:region/routes/:route', (req, res) => {
  try {
    const { region, route } = req.params
    validateRegion(region)

    const data = loadEncounters()
    const routeName = decodeURIComponent(route)
    if (!data[region][routeName]) return res.status(404).json({ error: 'Route not found' })

    data[region][routeName] = normalizeRoute(req.body, routeDisplayName(routeName, data[region][routeName]))
    saveEncounters(data)
    res.json({ success: true, route: routeName, entry: data[region][routeName] })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

app.put('/api/regions/:region/routes/:route/rename', (req, res) => {
  try {
    const { region, route } = req.params
    const nextName = String(req.body.name || '').trim()
    const nextVariation = String(req.body.variation ?? '').trim()
    validateRegion(region)
    if (!nextName) return res.status(400).json({ error: 'Route name is required' })

    const data = loadEncounters()
    const routeName = decodeURIComponent(route)
    if (!data[region][routeName]) return res.status(404).json({ error: 'Route not found' })

    const entry = {
      ...data[region][routeName],
      route: nextName,
      variation: nextVariation,
    }
    const nextKey = uniqueRouteKey(data[region], nextName, nextVariation, routeName)
    delete data[region][routeName]
    data[region][nextKey] = entry
    saveEncounters(data)
    res.json({ success: true, route: nextKey, entry })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

app.delete('/api/regions/:region/routes/:route', (req, res) => {
  try {
    const { region, route } = req.params
    validateRegion(region)

    const data = loadEncounters()
    const routeName = decodeURIComponent(route)
    if (!data[region][routeName]) return res.status(404).json({ error: 'Route not found' })

    delete data[region][routeName]
    saveEncounters(data)
    res.json({ success: true })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

function startServer(port, attemptsLeft = MAX_PORT_ATTEMPTS) {
  const server = app.listen(port, () => {
    const url = `http://localhost:${port}/encountereditor`
    console.log(`\nEncounter Percent Editor running at ${url}`)
    console.log(`Editing: ${encounterPath}\n`)

    if (process.env.ENCOUNTER_EDITOR_OPEN === '0') {
      console.log(`Open ${url} in your browser.`)
      return
    }

    open(url).catch(() => {
      console.log(`Open ${url} in your browser.`)
    })
  })

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && attemptsLeft > 0) {
      const nextPort = port + 1
      console.log(`Port ${port} is already in use. Trying ${nextPort}...`)
      startServer(nextPort, attemptsLeft - 1)
      return
    }

    console.error(error)
    process.exitCode = 1
  })
}

startServer(PORT)
