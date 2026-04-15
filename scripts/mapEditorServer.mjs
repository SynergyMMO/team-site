#!/usr/bin/env node

import express from 'express'
import fs from 'fs'
import path from 'path'
import open from 'open'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, '..')
const regionMapsDir = path.join(repoRoot, 'src', 'data', 'region_maps')
const publicDir = path.join(__dirname, 'public')
const mapImagesDir = path.join(repoRoot, 'public', 'images', 'maps')
const app = express()
const PORT = Number(process.env.MAP_EDITOR_PORT || 5176)
const MAX_PORT_ATTEMPTS = 20
const regionIds = ['kanto', 'johto', 'hoenn', 'sinnoh', 'unova']

app.use(express.json({ limit: '50mb' }))
app.use('/images', express.static(path.join(repoRoot, 'public', 'images')))

function regionPath(regionId) {
  if (!regionIds.includes(regionId)) throw new Error(`Unknown region: ${regionId}`)
  return path.join(regionMapsDir, `${regionId}.json`)
}

function loadRegion(regionId) {
  return JSON.parse(fs.readFileSync(regionPath(regionId), 'utf8'))
}

function saveRegion(regionId, data) {
  fs.writeFileSync(regionPath(regionId), `${JSON.stringify(data, null, 2)}\n`)
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/pok(?:\u00e9|\u00c3\u00a9)mon/g, 'pokemon')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function imageSlug(value) {
  return slugify(value).replace(/-/g, '_')
}

function ensureMaps(region) {
  if (!Array.isArray(region.maps)) region.maps = []
  return region.maps
}

function findMap(region, mapId) {
  return ensureMaps(region).find((map) => map.id === mapId)
}

function ensureCollection(map, collection) {
  if (!Array.isArray(map[collection])) map[collection] = []
  return map[collection]
}

function findArea(region, areaId) {
  for (const map of ensureMaps(region)) {
    const areas = ensureCollection(map, 'areas')
    const index = areas.findIndex((area) => area.id === areaId)
    if (index >= 0) return { map, areas, area: areas[index], index }
  }
  return null
}

function findItem(region, collection, itemId) {
  for (const map of ensureMaps(region)) {
    const items = ensureCollection(map, collection)
    const index = items.findIndex((item) => item.id === itemId)
    if (index >= 0) return { map, items, item: items[index], index }
  }
  return null
}

function defaultPoints(map) {
  const width = map?.map?.width || 768
  const size = width <= 900 ? 24 : 64
  return [[32, 32], [32 + size, 32], [32 + size, 32 + size], [32, 32 + size]]
}

function defaultArea(regionId, map, name = 'New Area') {
  return {
    id: `${regionId}-${slugify(name) || 'new-area'}-${Date.now().toString(36)}`,
    name,
    kind: 'route',
    mapId: map.id,
    points: defaultPoints(map),
    spawns: [],
  }
}

function defaultMarker(map, label = 'New Marker') {
  return {
    id: `${map.id}-marker-${Date.now().toString(36)}`,
    label,
    kind: 'poi',
    x: Math.round((map.map?.width || 768) / 2),
    y: Math.round((map.map?.height || 504) / 2),
  }
}

function defaultPath(map, label = 'New Path') {
  return {
    id: `${map.id}-path-${Date.now().toString(36)}`,
    label,
    points: [[32, 32], [96, 96]],
  }
}

function defaultSwitchTrigger(map, targetMapId = '') {
  return {
    id: `${map.id}-switch-${Date.now().toString(36)}`,
    label: 'New Switch',
    targetMapId,
    points: defaultPoints(map),
  }
}

function createMap(regionId, region, body) {
  const name = body.name || 'New Map'
  const id = body.id || `${regionId}-${slugify(name) || 'map'}`
  if (findMap(region, id)) throw new Error(`Map already exists: ${id}`)
  const map = {
    id,
    name,
    map: {
      image: body.image || `images/maps/${regionId}/${imageSlug(name)}.png`,
      width: Number(body.width) || 768,
      height: Number(body.height) || 504,
    },
    areas: [],
    markers: [],
    paths: [],
    switchTriggers: [],
    returnMapId: body.returnMapId || null,
  }
  ensureMaps(region).push(map)
  return map
}

function deleteMap(region, mapId) {
  const maps = ensureMaps(region)
  const index = maps.findIndex((map) => map.id === mapId)
  if (index < 0) return false
  if (maps.length <= 1) throw new Error('Cannot delete the only map in a region')

  maps.splice(index, 1)
  const fallbackMapId = maps[0]?.id || null

  maps.forEach((map) => {
    map.returnMapId = map.returnMapId === mapId ? null : map.returnMapId
    ensureCollection(map, 'areas')
      .filter((area) => area.mapId === mapId)
      .forEach((area) => {
        area.mapId = fallbackMapId
      })
    ensureCollection(map, 'switchTriggers').forEach((trigger) => {
      if (trigger.targetMapId === mapId) {
        trigger.targetMapId = ''
        delete trigger.targetAreaId
      }
    })
  })

  return true
}

function listImages(regionId) {
  const dir = path.join(mapImagesDir, regionId)
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter((file) => /\.png$/i.test(file))
    .sort((a, b) => a.localeCompare(b))
    .map((file) => `images/maps/${regionId}/${file}`)
}

app.get('/', (req, res) => {
  res.redirect('/mapeditor')
})

app.get('/mapeditor', (req, res) => {
  res.sendFile(path.join(publicDir, 'map-editor.html'))
})

app.get('/api/regions', (req, res) => {
  const regions = regionIds.map((id) => {
    const region = loadRegion(id)
    return {
      id,
      name: region.name,
      game: region.game,
      maps: ensureMaps(region).map((map) => ({
        id: map.id,
        name: map.name,
        image: map.map?.image,
        areas: map.areas?.length || 0,
        markers: map.markers?.length || 0,
        paths: map.paths?.length || 0,
        switchTriggers: map.switchTriggers?.length || 0,
      })),
    }
  })
  res.json(regions)
})

app.get('/api/regions/:regionId', (req, res) => {
  try {
    res.json(loadRegion(req.params.regionId))
  } catch (error) {
    res.status(404).json({ error: error.message })
  }
})

app.get('/api/regions/:regionId/images', (req, res) => {
  try {
    regionPath(req.params.regionId)
    res.json(listImages(req.params.regionId))
  } catch (error) {
    res.status(404).json({ error: error.message })
  }
})

app.post('/api/regions/:regionId/maps', (req, res) => {
  try {
    const region = loadRegion(req.params.regionId)
    const map = createMap(req.params.regionId, region, req.body || {})
    saveRegion(req.params.regionId, region)
    res.json({ success: true, map })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

app.put('/api/regions/:regionId/maps/:mapId', (req, res) => {
  try {
    const region = loadRegion(req.params.regionId)
    const map = findMap(region, req.params.mapId)
    if (!map) return res.status(404).json({ error: 'Map not found' })
    const next = req.body || {}
    map.id = next.id || map.id
    map.name = next.name || map.name
    map.map = {
      image: next.image || map.map?.image,
      width: Number(next.width) || map.map?.width || 768,
      height: Number(next.height) || map.map?.height || 504,
    }
    map.returnMapId = next.returnMapId ?? map.returnMapId ?? null
    saveRegion(req.params.regionId, region)
    res.json({ success: true, map })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

app.delete('/api/regions/:regionId/maps/:mapId', (req, res) => {
  try {
    const region = loadRegion(req.params.regionId)
    if (!deleteMap(region, req.params.mapId)) return res.status(404).json({ error: 'Map not found' })
    saveRegion(req.params.regionId, region)
    res.json({ success: true })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

app.post('/api/regions/:regionId/maps/:mapId/areas', (req, res) => {
  try {
    const region = loadRegion(req.params.regionId)
    const map = findMap(region, req.params.mapId)
    if (!map) return res.status(404).json({ error: 'Map not found' })
    const area = { ...defaultArea(req.params.regionId, map, req.body?.name), ...(req.body || {}) }
    ensureCollection(map, 'areas').push(area)
    saveRegion(req.params.regionId, region)
    res.json({ success: true, area })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

app.put('/api/regions/:regionId/areas/:areaId', (req, res) => {
  try {
    const region = loadRegion(req.params.regionId)
    const found = findArea(region, req.params.areaId)
    if (!found) return res.status(404).json({ error: 'Area not found' })
    found.areas[found.index] = req.body
    saveRegion(req.params.regionId, region)
    res.json({ success: true, area: req.body })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

app.delete('/api/regions/:regionId/areas/:areaId', (req, res) => {
  try {
    const region = loadRegion(req.params.regionId)
    const found = findArea(region, req.params.areaId)
    if (!found) return res.status(404).json({ error: 'Area not found' })
    found.areas.splice(found.index, 1)
    saveRegion(req.params.regionId, region)
    res.json({ success: true })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

app.post('/api/regions/:regionId/maps/:mapId/:collection', (req, res) => {
  try {
    const { regionId, mapId, collection } = req.params
    if (!['markers', 'paths', 'switchTriggers'].includes(collection)) {
      return res.status(400).json({ error: 'Unsupported collection' })
    }
    const region = loadRegion(regionId)
    const map = findMap(region, mapId)
    if (!map) return res.status(404).json({ error: 'Map not found' })
    const factory = {
      markers: () => defaultMarker(map, req.body?.label),
      paths: () => defaultPath(map, req.body?.label),
      switchTriggers: () => defaultSwitchTrigger(map, req.body?.targetMapId),
    }[collection]
    const item = { ...factory(), ...(req.body || {}) }
    ensureCollection(map, collection).push(item)
    saveRegion(regionId, region)
    res.json({ success: true, item })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

app.put('/api/regions/:regionId/:collection/:itemId', (req, res) => {
  try {
    const { regionId, collection, itemId } = req.params
    if (!['markers', 'paths', 'switchTriggers'].includes(collection)) {
      return res.status(400).json({ error: 'Unsupported collection' })
    }
    const region = loadRegion(regionId)
    const found = findItem(region, collection, itemId)
    if (!found) return res.status(404).json({ error: 'Item not found' })

    if (collection === 'switchTriggers' && req.body?.createTargetMap && req.body?.targetMap) {
      const targetMap = req.body.targetMap
      if (!findMap(region, targetMap.id)) {
        createMap(regionId, region, targetMap)
      }
      delete req.body.createTargetMap
      delete req.body.targetMap
    }

    found.items[found.index] = req.body
    saveRegion(regionId, region)
    res.json({ success: true, item: req.body })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

app.delete('/api/regions/:regionId/:collection/:itemId', (req, res) => {
  try {
    const { regionId, collection, itemId } = req.params
    if (!['markers', 'paths', 'switchTriggers'].includes(collection)) {
      return res.status(400).json({ error: 'Unsupported collection' })
    }
    const region = loadRegion(regionId)
    const found = findItem(region, collection, itemId)
    if (!found) return res.status(404).json({ error: 'Item not found' })
    found.items.splice(found.index, 1)
    saveRegion(regionId, region)
    res.json({ success: true })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

function startServer(port, attemptsLeft = MAX_PORT_ATTEMPTS) {
  const server = app.listen(port, () => {
    const url = `http://localhost:${port}/mapeditor`
    console.log(`\nMap Editor UI running at ${url}`)
    console.log(`Editing: ${regionMapsDir}\n`)
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
