import { useState, useCallback, useRef, useMemo } from 'react';
import { API } from '../../../api/endpoints';
import generationData from '../../../data/generation.json';

// ---------------- HELPERS ----------------
function recalcShinyCount(player) {
  const shinies = player?.shinies;
  if (!shinies) return 0;
  return Object.values(shinies).filter(s => s.Sold !== 'Yes').length;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ---------------- HOOK ----------------
export default function useAdminDB(auth) {
  // --- Database / Streamers / Events / Log ---
  const [database, setDatabase] = useState({});
  const [streamersDB, setStreamersDB] = useState({});
  const [eventDB, setEventDB] = useState([]);
  const [logData, setLogData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  const snapshotRef = useRef(null);

  // --- Current Members ---
  const [members, setMembers] = useState([]);
  const [isMembersLoading, setIsMembersLoading] = useState(false);

  // ---------------- POST HELPER ----------------
  const postData = useCallback(async (endpoint, payload) => {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`POST ${endpoint} failed: ${res.status}`);
    const text = await res.text();
    try { return JSON.parse(text); } catch { return text; }
  }, []);

  // ---------------- LOGGING ----------------
  const logAdminAction = useCallback(async (action) => {
    if (!auth) return;
    const optimisticEntry = { admin: auth.name || auth.username, action, time: new Date().toISOString() };
    setLogData(prev => [optimisticEntry, ...(prev || [])]);
    try {
      await fetch(API.adminLog, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: auth.name || auth.username, password: auth.password, action }),
      });
    } catch (err) {
      console.warn("Failed to log admin action:", err);
    }
  }, [auth]);

  // ---------------- LOAD DATABASE ----------------
  const loadDatabase = useCallback(async () => {
    setIsLoading(true);
    try {
      const [dbRes, streamersRes, logRes] = await Promise.all([
        fetch(API.database),
        fetch(API.streamers),
        fetch(API.adminLog),
      ]);
      if (!dbRes.ok) throw new Error(`Failed to fetch database: ${dbRes.status}`);
      if (!streamersRes.ok) throw new Error(`Failed to fetch streamers: ${streamersRes.status}`);
      if (!logRes.ok) throw new Error(`Failed to fetch admin log: ${logRes.status}`);

      const db = await dbRes.json();
      const str = await streamersRes.json();
      const log = await logRes.json();

      Object.keys(db).forEach(p => { db[p].shiny_count = recalcShinyCount(db[p]); });

      const rawStreamers = {};
      Object.entries(str).forEach(([key, val]) => {
        if (key !== 'live' && key !== 'offline') rawStreamers[key] = val;
      });
      [...(str.live || []), ...(str.offline || [])].forEach(s => {
        if (s.twitch_username) rawStreamers[s.twitch_username] = s;
      });

      setDatabase(db);
      setStreamersDB(rawStreamers);
      setLogData(log.log || []);
      return { db, str, log: log.log || [] };
    } finally { setIsLoading(false); }
  }, []);

  // ---------------- SNAPSHOT / UNDO ----------------
  const saveSnapshot = useCallback(() => {
    snapshotRef.current = {
      database: deepClone(database),
      streamersDB: deepClone(streamersDB),
      eventDB: deepClone(eventDB),
      members: deepClone(members),
    };
  }, [database, streamersDB, eventDB, members]);

  const undo = useCallback(async () => {
    if (!snapshotRef.current || !auth) return false;
    setIsMutating(true);
    try {
      const { database: prevDb, streamersDB: prevStr, eventDB: prevEvents, members: prevMembers } = snapshotRef.current;

      const [dbResult, strResult, eventsResult] = await Promise.all([
        postData(API.updateDatabase, { username: auth.name || auth.username, password: auth.password, data: prevDb, action: 'Undo last action' }),
        postData(API.updateStreamers, { username: auth.name || auth.username, password: auth.password, data: prevStr, action: 'Undo last action (streamers)' }),
        postData(API.events, { username: auth.name || auth.username, password: auth.password, data: prevEvents, action: 'Undo last action (events)' }),
      ]);

      setDatabase(prevDb);
      setStreamersDB(prevStr);
      setEventDB(prevEvents);
      setMembers(prevMembers);
      snapshotRef.current = null;

      return dbResult.success && strResult.success && eventsResult.success;
    } finally { setIsMutating(false); }
  }, [auth, postData]);

  // ---------------- PLAYER MANAGEMENT ----------------
  const addShiny = useCallback(async (playerName, shinyData) => {
    if (!auth) return { success: false, error: 'Unauthorized' };
    saveSnapshot(); setIsMutating(true);
    try {
      const db = deepClone(database);
      if (!db[playerName]) db[playerName] = { shiny_count: 0, shinies: {} };
      const nextId = Object.keys(db[playerName].shinies).length + 1;
      db[playerName].shinies[nextId] = shinyData;
      db[playerName].shiny_count = recalcShinyCount(db[playerName]);

      const result = await postData(API.updateDatabase, { username: auth.name || auth.username, password: auth.password, data: db, action: `Added ${shinyData.Pokemon} for ${playerName}` });
      if (result.success) {
        setDatabase(db);
        await logAdminAction(`Added ${shinyData.Pokemon} for ${playerName}`);
        return { success: true };
      }
      return { success: false, error: 'Server rejected update' };
    } finally { setIsMutating(false); }
  }, [auth, database, postData, saveSnapshot, logAdminAction]);

  // ---------------- STREAMER MANAGEMENT ----------------
  const addStreamer = useCallback(async (pokeName, twitchName) => {
    if (!auth) return { success: false, error: 'Unauthorized' };
    saveSnapshot(); setIsMutating(true);
    try {
      const str = deepClone(streamersDB);
      str[pokeName] = { twitch_username: twitchName, profile_image_url: '', last_stream_title: null, last_viewer_count: 0, live: false };
      const result = await postData(API.updateStreamers, { username: auth.name, password: auth.password, data: str, action: `Added streamer ${pokeName}` });
      if (result.success) {
        setStreamersDB(str);
        await logAdminAction(`Added streamer ${pokeName}`);
        return { success: true };
      }
      return { success: false, error: 'Server rejected update' };
    } finally { setIsMutating(false); }
  }, [auth, streamersDB, postData, saveSnapshot]);

  const deleteStreamer = useCallback(async (pokeName) => {
    if (!auth) return { success: false, error: 'Unauthorized' };
    saveSnapshot(); setIsMutating(true);
    try {
      const str = deepClone(streamersDB);
      if (!str[pokeName]) return { success: false, error: 'Streamer not found' };
      delete str[pokeName];
      const result = await postData(API.updateStreamers, { username: auth.name, password: auth.password, data: str, action: `Deleted streamer ${pokeName}` });
      if (result.success) {
        setStreamersDB(str);
        await logAdminAction(`Deleted streamer ${pokeName}`);
        return { success: true };
      }
      return { success: false, error: 'Server rejected update' };
    } finally { setIsMutating(false); }
  }, [auth, streamersDB, postData, saveSnapshot]);

  // ---------------- EVENT MANAGEMENT ----------------
  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch(API.events);
      if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`);
      const events = await res.json();
      setEventDB(events);
      return events;
    } catch (err) {
      console.error("Failed to load events:", err);
      return [];
    }
  }, []);

  const addEvent = useCallback(async (eventData) => {
    if (!auth) return { success: false, error: "Unauthorized" };
    saveSnapshot(); setIsMutating(true);
    try {
      const payload = { username: auth.name, password: auth.password, ...eventData };
      const res = await fetch(API.events, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const newEvent = await res.json();
      if (!res.ok) return { success: false, error: newEvent.error || "Failed" };
      setEventDB(prev => [...prev, newEvent]);
      await logAdminAction(`Added Event Name: ${newEvent.title || newEvent.name || "Unnamed Event"}`);
      return { success: true };
    } finally { setIsMutating(false); }
  }, [auth, saveSnapshot, logAdminAction]);

  const updateEvent = useCallback(async (id, eventData) => {
    if (!auth) return { success: false, error: "Unauthorized" };
    saveSnapshot(); setIsMutating(true);
    try {
      const payload = { username: auth.name, password: auth.password, ...eventData, id };
      const res = await fetch(`${API.events}/update`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (!res.ok) return { success: false, error: result.error || "Failed" };
      const updatedEvent = result.event;
      setEventDB(prev => prev.map(e => e.id === id ? updatedEvent : e));
      await logAdminAction(`Updated Event Name: ${updatedEvent.title || updatedEvent.name || "Unnamed Event"} (Change made)`);
      return { success: true };
    } finally { setIsMutating(false); }
  }, [auth, saveSnapshot, logAdminAction]);

  const removeEvent = useCallback(async (id) => {
    if (!auth) return { success: false, error: "Unauthorized" };
    saveSnapshot(); setIsMutating(true);
    try {
      const payload = { username: auth.name, password: auth.password, id };
      const res = await fetch(`${API.events}/delete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const deleted = await res.json();
      if (!res.ok) return { success: false, error: deleted.error || "Failed" };
      setEventDB(prev => prev.filter(e => e.id !== id));
      await logAdminAction(`Deleted Event Name: ${deleted.event?.title || deleted.event?.name || id}`);
      return { success: true };
    } finally { setIsMutating(false); }
  }, [auth, saveSnapshot, logAdminAction]);

  // ---------------- MEMBERS MANAGEMENT ----------------
  const loadMembers = useCallback(async () => {
    setIsMembersLoading(true);
    try {
      const response = await fetch(API.currentMembers);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setMembers(data.map((name, index) => ({ id: index.toString(), name })));
    } catch (err) {
      console.error("Failed to load members:", err);
      setMembers([]);
    }
    setIsMembersLoading(false);
  }, []);

const saveMembers = useCallback(async (newMembers, actionDescription) => {
  if (!auth?.username && !auth?.name) return false;

  const namesArray = newMembers.map(m => m.name);
  try {
    const response = await fetch(API.updateCurrentMembers, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: auth.username || auth.name,
        password: auth.password,
        data: namesArray,
        action: actionDescription || "Updated current members",
      }),
    });

    const text = await response.text();
    const result = text ? JSON.parse(text) : {};

    if (result.success) {
      setMembers(namesArray.map((name, index) => ({ id: index.toString(), name })));
      return true;
    } else {
      console.error("Failed to save members:", result.error || "Unknown error");
      return false;
    }
  } catch (err) {
    console.error("Error saving members:", err);
    return false;
  }
}, [auth]);





  const addMember = useCallback(async (player) => {
    const newList = [...members, { ...player, id: Date.now().toString() }];
    const success = await saveMembers(newList, `Added member: ${player.name}`);
    return success;
  }, [members, saveMembers]);


  const updateMember = useCallback(async (updatedPlayer) => {
    const newList = members.map(p => (p.id === updatedPlayer.id ? updatedPlayer : p));
    await saveMembers(newList, `Updated member: ${updatedPlayer.name}`);
  }, [members, saveMembers]);

  const deleteMember = useCallback(async (playerId) => {
    const newList = members.filter(p => p.id !== playerId);
    await saveMembers(newList, `Deleted member ID: ${playerId}`);
  }, [members, saveMembers]);

  // ---------------- HELPERS ----------------
  const playerNames = useMemo(() => Object.keys(database).sort(), [database]);
  const getPlayerShinies = useCallback((name) => database[name]?.shinies || {}, [database]);

  const allPokemonNames = useMemo(() => {
    const names = new Map();
    Object.values(generationData).flat(2).forEach(name => {
      names.set(name.toLowerCase(), name.charAt(0).toUpperCase() + name.slice(1).toLowerCase());
    });
    Object.values(database).flatMap(p => Object.values(p.shinies || {}).map(s => s.Pokemon))
      .forEach(name => {
        if (!names.has(name.toLowerCase())) names.set(name.toLowerCase(), name.charAt(0).toUpperCase() + name.slice(1).toLowerCase());
      });
    return [...names.values()].sort();
  }, [database]);

  const hasSnapshot = !!snapshotRef.current;

  // ---------------- RETURN ----------------
  return {
    // Database / Streamers / Events
    database, streamersDB, logData, eventDB,
    isLoading, isMutating, hasSnapshot,
    loadDatabase, addShiny, undo,
    addStreamer, deleteStreamer,
    playerNames, getPlayerShinies, allPokemonNames,
    loadEvents, addEvent, updateEvent, removeEvent,

    // Members
    members, isMembersLoading,
    loadMembers, addMember, updateMember, deleteMember,
  };
}
