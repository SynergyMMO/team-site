import { useState, useCallback, useRef, useMemo } from 'react'
import { API } from '../../../api/endpoints'
import generationData from '../../../data/generation.json'

function recalcShinyCount(playerObj) {
  const shinies = playerObj?.shinies
  if (!shinies) return 0
  return Object.values(shinies).filter(s => s.Sold !== 'Yes').length
}

function reindexShinies(shiniesObj) {
  const reindexed = {}
  Object.keys(shiniesObj)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .forEach((key, index) => { reindexed[index + 1] = shiniesObj[key] })
  return reindexed
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

export default function useAdminDatabase(auth) {
  const [database, setDatabase] = useState({})
  const [streamersDB, setStreamersDB] = useState({})
  const [logData, setLogData] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isMutating, setIsMutating] = useState(false)
  const [eventDB, setEventDB] = useState([])

  const snapshotRef = useRef(null)

  const postData = useCallback(async (endpoint, payload) => {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return res.json()
  }, [])

  // ------------------ Load Database ------------------
  const loadDatabase = useCallback(async () => {
    setIsLoading(true)
    try {
      const [dbRes, streamersRes, logRes] = await Promise.all([
        fetch(API.database),
        fetch(API.streamers),
        fetch(API.adminLog),
      ])
      const db = await dbRes.json()
      const str = await streamersRes.json()
      const log = await logRes.json()

      Object.keys(db).forEach(p => {
        db[p].shiny_count = recalcShinyCount(db[p])
      })

      const rawStreamers = {}
      Object.entries(str).forEach(([key, val]) => {
        if (key !== 'live' && key !== 'offline') rawStreamers[key] = val
      })
      ;[...(str.live || []), ...(str.offline || [])].forEach(s => {
        if (s.twitch_username) rawStreamers[s.twitch_username] = s
      })

      setDatabase(db)
      setStreamersDB(rawStreamers)
      setLogData(log.log || [])
      return { db, str, log: log.log || [] }
    } finally {
      setIsLoading(false)
    }
  }, [])

  // ------------------ Snapshot / Undo ------------------
  const saveSnapshot = useCallback(() => {
    snapshotRef.current = {
      database: deepClone(database),
      streamersDB: deepClone(streamersDB),
      eventDB: deepClone(eventDB),
    }
  }, [database, streamersDB, eventDB])

  const undo = useCallback(async () => {
    if (!snapshotRef.current || !auth) return false
    setIsMutating(true)
    try {
      const { database: prevDb, streamersDB: prevStr, eventDB: prevEvents } = snapshotRef.current
      const [dbResult, strResult, eventsResult] = await Promise.all([
        postData(API.updateDatabase, {
          username: auth.name, password: auth.password,
          data: prevDb, action: 'Undo last action',
        }),
        postData(API.updateStreamers, {
          username: auth.name, password: auth.password,
          data: prevStr, action: 'Undo last action (streamers)',
        }),
        postData(API.events, {
          username: auth.name, password: auth.password,
          data: prevEvents, action: 'Undo last action (events)',
        }),
      ])
      if (dbResult.success && strResult.success && eventsResult.success) {
        setDatabase(prevDb)
        setStreamersDB(prevStr)
        setEventDB(prevEvents)
        snapshotRef.current = null
        return true
      }
      return false
    } finally {
      setIsMutating(false)
    }
  }, [auth, postData])

  // ------------------ Player Management ------------------
  const addShiny = useCallback(async (playerName, shinyData) => {
    if (!auth) return { success: false, error: 'Unauthorized' }
    saveSnapshot()
    setIsMutating(true)
    try {
      const db = deepClone(database)
      if (!db[playerName]) db[playerName] = { shiny_count: 0, shinies: {} }
      const nextId = Object.keys(db[playerName].shinies).length + 1
      db[playerName].shinies[nextId] = shinyData
      db[playerName].shiny_count = recalcShinyCount(db[playerName])

      const result = await postData(API.updateDatabase, {
        username: auth.name, password: auth.password,
        data: db,
        action: `Added ${shinyData.Pokemon} for ${playerName}`,
      })
      if (result.success) {
        setDatabase(db)
        return { success: true }
      }
      return { success: false, error: 'Server rejected update' }
    } finally {
      setIsMutating(false)
    }
  }, [auth, database, postData, saveSnapshot])

  const editShiny = useCallback(async (playerName, shinyId, shinyData) => {
    if (!auth) return { success: false, error: 'Unauthorized' }
    saveSnapshot()
    setIsMutating(true)
    try {
      const db = deepClone(database)
      if (!db[playerName]?.shinies?.[shinyId]) return { success: false, error: 'Entry not found' }
      db[playerName].shinies[shinyId] = shinyData
      db[playerName].shiny_count = recalcShinyCount(db[playerName])

      const result = await postData(API.updateDatabase, {
        username: auth.name, password: auth.password,
        data: db,
        action: `Edited shiny #${shinyId} (${shinyData.Pokemon}) for ${playerName}`,
      })
      if (result.success) {
        setDatabase(db)
        return { success: true }
      }
      return { success: false, error: 'Server rejected update' }
    } finally {
      setIsMutating(false)
    }
  }, [auth, database, postData, saveSnapshot])

  const deleteShiny = useCallback(async (playerName, shinyId) => {
    if (!auth) return { success: false, error: 'Unauthorized' }
    saveSnapshot()
    setIsMutating(true)
    try {
      const db = deepClone(database)
      if (!db[playerName]?.shinies?.[shinyId]) return { success: false, error: 'Entry not found' }
      const pokemonName = db[playerName].shinies[shinyId].Pokemon
      delete db[playerName].shinies[shinyId]
      db[playerName].shinies = reindexShinies(db[playerName].shinies)
      db[playerName].shiny_count = recalcShinyCount(db[playerName])

      const result = await postData(API.updateDatabase, {
        username: auth.name, password: auth.password,
        data: db,
        action: `Deleted ${pokemonName} (ID ${shinyId}) for ${playerName}`,
      })
      if (result.success) {
        setDatabase(db)
        return { success: true }
      }
      return { success: false, error: 'Server rejected update' }
    } finally {
      setIsMutating(false)
    }
  }, [auth, database, postData, saveSnapshot])

  const deletePlayer = useCallback(async (playerName) => {
    if (!auth) return { success: false, error: 'Unauthorized' }
    saveSnapshot()
    setIsMutating(true)
    try {
      const db = deepClone(database)
      if (!db[playerName]) return { success: false, error: 'Player not found' }
      delete db[playerName]

      const result = await postData(API.updateDatabase, {
        username: auth.name, password: auth.password,
        data: db,
        action: `Deleted all data for player ${playerName}`,
      })
      if (result.success) {
        setDatabase(db)
        return { success: true }
      }
      return { success: false, error: 'Server rejected update' }
    } finally {
      setIsMutating(false)
    }
  }, [auth, database, postData, saveSnapshot])

  // ------------------ Streamer Management ------------------
  const addStreamer = useCallback(async (pokeName, twitchName) => {
    if (!auth) return { success: false, error: 'Unauthorized' }
    saveSnapshot()
    setIsMutating(true)
    try {
      const str = deepClone(streamersDB)
      str[pokeName] = { twitch_username: twitchName, profile_image_url: '', last_stream_title: null, last_viewer_count: 0, live: false }
      const result = await postData(API.updateStreamers, {
        username: auth.name, password: auth.password, data: str, action: `Added streamer ${pokeName}`,
      })
      if (result.success) {
        setStreamersDB(str)
        return { success: true }
      }
      return { success: false, error: 'Server rejected update' }
    } finally { setIsMutating(false) }
  }, [auth, streamersDB, postData, saveSnapshot])

  const deleteStreamer = useCallback(async (pokeName) => {
    if (!auth) return { success: false, error: 'Unauthorized' }
    saveSnapshot()
    setIsMutating(true)
    try {
      const str = deepClone(streamersDB)
      if (!str[pokeName]) return { success: false, error: 'Streamer not found' }
      delete str[pokeName]
      const result = await postData(API.updateStreamers, {
        username: auth.name, password: auth.password, data: str, action: `Deleted streamer ${pokeName}`,
      })
      if (result.success) {
        setStreamersDB(str)
        return { success: true }
      }
      return { success: false, error: 'Server rejected update' }
    } finally { setIsMutating(false) }
  }, [auth, streamersDB, postData, saveSnapshot])

  // ------------------ Advanced JSON ------------------
  const updateFullDatabase = useCallback(async (data, action) => {
    if (!auth) return { success: false, error: 'Unauthorized' }
    saveSnapshot()
    setIsMutating(true)
    try {
      const result = await postData(API.updateDatabase, { username: auth.name, password: auth.password, data, action: action || 'Manual JSON edit (pokemon)' })
      if (result.success) {
        setDatabase(data)
        return { success: true }
      }
      return { success: false, error: 'Server rejected update' }
    } finally { setIsMutating(false) }
  }, [auth, postData, saveSnapshot])

  const updateFullStreamers = useCallback(async (data, action) => {
    if (!auth) return { success: false, error: 'Unauthorized' }
    saveSnapshot()
    setIsMutating(true)
    try {
      const result = await postData(API.updateStreamers, { username: auth.name, password: auth.password, data, action: action || 'Manual JSON edit (streamers)' })
      if (result.success) {
        setStreamersDB(data)
        return { success: true }
      }
      return { success: false, error: 'Server rejected update' }
    } finally { setIsMutating(false) }
  }, [auth, postData, saveSnapshot])

  // ------------------ Event Management ------------------
  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch(API.events)
      const events = await res.json()
      setEventDB(events)
      return events
    } catch (err) {
      console.error("Failed to load events:", err)
      return []
    }
  }, [])

  const addEvent = useCallback(async (eventData) => {
    if (!auth) return { success: false, error: "Unauthorized" }
    saveSnapshot()
    setIsMutating(true)
    try {
      const payload = { username: auth.name, password: auth.password, ...eventData }
      const res = await fetch(API.events, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const newEvent = await res.json()
      if (!res.ok) return { success: false, error: newEvent.error || "Failed" }

      setEventDB(prev => [...prev, newEvent])
      return { success: true }
    } finally { setIsMutating(false) }
  }, [auth, eventDB, saveSnapshot])

  const updateEvent = useCallback(async (id, eventData) => {
    if (!auth) return { success: false, error: "Unauthorized" }
    saveSnapshot()
    setIsMutating(true)
    try {
      const payload = { username: auth.name, password: auth.password, id, ...eventData }
      const res = await fetch(`${API.events}/update`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const updated = await res.json()
      if (!res.ok) return { success: false, error: updated.error || "Failed" }

      setEventDB(prev => prev.map(e => e.id === id ? updated : e))
      return { success: true }
    } finally { setIsMutating(false) }
  }, [auth, eventDB, saveSnapshot])

  const removeEvent = useCallback(async (id) => {
    if (!auth) return { success: false, error: "Unauthorized" }
    saveSnapshot()
    setIsMutating(true)
    try {
      const payload = { username: auth.name, password: auth.password, id }
      const res = await fetch(`${API.events}/delete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const deleted = await res.json()
      if (!res.ok) return { success: false, error: deleted.error || "Failed" }

      setEventDB(prev => prev.filter(e => e.id !== id))
      return { success: true }
    } finally { setIsMutating(false) }
  }, [auth, eventDB, saveSnapshot])

  // ------------------ Helpers ------------------
  const playerNames = useMemo(() => Object.keys(database).sort(), [database])
  const getPlayerShinies = useCallback((name) => database[name]?.shinies || {}, [database])
  const allPokemonNames = useMemo(() => {
    const names = new Map()
    Object.values(generationData).flat(2).forEach(name => names.set(name.toLowerCase(), name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()))
    Object.values(database).flatMap(p => Object.values(p.shinies || {}).map(s => s.Pokemon)).forEach(name => {
      if (!names.has(name.toLowerCase())) names.set(name.toLowerCase(), name.charAt(0).toUpperCase() + name.slice(1).toLowerCase())
    })
    return [...names.values()].sort()
  }, [database])

  const hasSnapshot = !!snapshotRef.current

  return {
    database, streamersDB, logData, isLoading, isMutating, hasSnapshot,
    loadDatabase, addShiny, editShiny, deleteShiny, deletePlayer,
    addStreamer, deleteStreamer, updateFullDatabase, updateFullStreamers, undo,
    playerNames, getPlayerShinies, allPokemonNames,
    eventDB, loadEvents, addEvent, updateEvent, removeEvent,
  }
}
