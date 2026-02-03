import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext'
import { API } from '../../api/endpoints'
import styles from './Admin.module.css'

function Autocomplete({ id, value, onChange, getOptions, placeholder }) {
  const [suggestions, setSuggestions] = useState([])
  const [show, setShow] = useState(false)
  const [focusIdx, setFocusIdx] = useState(-1)
  const ref = useRef(null)

  function handleInput(val) {
    onChange(val)
    const lower = val.toLowerCase()
    if (!lower) { setSuggestions([]); setShow(false); return }
    const opts = getOptions().filter(o => o.toLowerCase().includes(lower))
    setSuggestions(opts)
    setShow(opts.length > 0)
    setFocusIdx(-1)
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') { setFocusIdx(i => Math.min(i + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { setFocusIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Tab' && focusIdx >= 0) {
      e.preventDefault()
      onChange(suggestions[focusIdx])
      setShow(false)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        id={id}
        type="text"
        value={value}
        onChange={e => handleInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length && setShow(true)}
        onBlur={() => setTimeout(() => setShow(false), 100)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {show && (
        <div className={styles.suggestions}>
          {suggestions.map((s, i) => (
            <div
              key={s}
              className={`${styles.suggestion} ${i === focusIdx ? styles.suggestionActive : ''}`}
              onMouseDown={() => { onChange(s); setShow(false) }}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminPanel() {
  const { auth } = useAdmin()
  const navigate = useNavigate()

  const [mode, setMode] = useState('pokemon')
  const [database, setDatabase] = useState({})
  const [streamersDB, setStreamersDB] = useState({})
  const [logData, setLogData] = useState([])
  const [message, setMessage] = useState('')
  const [msgClass, setMsgClass] = useState('')
  const [updateMessage, setUpdateMessage] = useState('')
  const [deleteMessage, setDeleteMessage] = useState('')

  // Pokemon form
  const [player, setPlayer] = useState('')
  const [pokemon, setPokemon] = useState('')
  const [month, setMonth] = useState('February')
  const [year, setYear] = useState('2026')
  const [egg, setEgg] = useState('No')
  const [favourite, setFavourite] = useState('No')
  const [secretShiny, setSecretShiny] = useState('No')
  const [alpha, setAlpha] = useState('No')
  const [sold, setSold] = useState('No')
  const [event, setEvent] = useState('No')
  const [reaction, setReaction] = useState('No')
  const [mysteriousBall, setMysteriousBall] = useState('No')
  const [safari, setSafari] = useState('No')
  const [honeyTree, setHoneyTree] = useState('No')
  const [legendary, setLegendary] = useState('No')
  const [reactionLink, setReactionLink] = useState('')
  const [overrideDuplicate, setOverrideDuplicate] = useState(false)
  const [showOverride, setShowOverride] = useState(false)

  // Streamer form
  const [pokeName, setPokeName] = useState('')
  const [twitchName, setTwitchName] = useState('')

  // Delete form
  const [deletePlayer, setDeletePlayer] = useState('')
  const [deleteId, setDeleteId] = useState('')

  // Preview
  const [previewText, setPreviewText] = useState('')

  useEffect(() => {
    if (!auth) navigate('/admin')
    else loadDatabase()
  }, [auth])

  const postData = useCallback(async (endpoint, payload) => {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      return await res.json()
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [])

  async function loadDatabase() {
    try {
      const [dbRes, streamersRes, logRes] = await Promise.all([
        fetch(API.database),
        fetch(API.streamers),
        fetch(API.adminLog),
      ])
      const db = await dbRes.json()
      const str = await streamersRes.json()
      const log = await logRes.json()

      // Update shiny counts
      Object.keys(db).forEach(p => {
        const shinies = db[p]?.shinies
        if (shinies) {
          db[p].shiny_count = Object.values(shinies).filter(s => s.Sold !== 'Yes').length
        }
      })

      setDatabase(db)
      setStreamersDB(str)
      setLogData(log.log || [])
      setPreviewText(JSON.stringify(mode === 'pokemon' ? db : str, null, 2))
    } catch (err) {
      setMessage('Error loading database: ' + err.message)
      setMsgClass('error')
    }
  }

  useEffect(() => {
    setPreviewText(JSON.stringify(mode === 'pokemon' ? database : streamersDB, null, 2))
  }, [mode, database, streamersDB])

  async function handleAdd() {
    if (!auth) return
    const endpoint = mode === 'pokemon' ? API.updateDatabase : API.updateStreamers

    if (mode === 'pokemon') {
      if (!player.trim() || !pokemon.trim()) {
        setMessage('Player and Pokemon are required.')
        setMsgClass('error')
        return
      }

      const db = { ...database }
      if (!db[player]) db[player] = { shiny_count: 0, shinies: {} }
      const playerShinies = db[player].shinies

      const last5Ids = Object.keys(playerShinies).map(Number).sort((a, b) => b - a).slice(0, 5)
      const duplicate = last5Ids.some(id => playerShinies[id].Pokemon.toLowerCase() === pokemon.toLowerCase())

      if (duplicate && !overrideDuplicate) {
        setShowOverride(true)
        setMessage('Duplicate Pokemon Detected! Check "Override Duplicate" to force add.')
        setMsgClass('error')
        return
      }

      const nextId = Object.keys(playerShinies).length + 1
      db[player].shinies[nextId] = {
        Pokemon: pokemon, Month: month, Year: year,
        'Secret Shiny': secretShiny, Egg: egg, Alpha: alpha,
        Sold: sold, Event: event, Reaction: reaction,
        MysteriousBall: mysteriousBall, Safari: safari,
        Favourite: favourite, 'Honey Tree': honeyTree,
        Legendary: legendary, 'Reaction Link': reactionLink,
      }
      db[player].shiny_count = Object.values(db[player].shinies).filter(s => s.Sold !== 'Yes').length

      const result = await postData(endpoint, {
        username: auth.name, password: auth.password, data: db,
        action: `Added ${pokemon} for ${player}${duplicate && overrideDuplicate ? ' (Override)' : ''}`,
      })

      if (result.success) {
        setMessage('Pokemon added successfully!')
        setMsgClass('success')
        setOverrideDuplicate(false)
        setShowOverride(false)
        setDatabase(db)
        await loadDatabase()
      } else {
        setMessage('Failed to add Pokemon.')
        setMsgClass('error')
      }
    } else {
      if (!pokeName.trim() || !twitchName.trim()) {
        setMessage('Both PokeMMO Name and Twitch Name are required.')
        setMsgClass('error')
        return
      }
      const str = { ...streamersDB }
      str[pokeName] = { twitch_username: twitchName }
      const result = await postData(endpoint, {
        username: auth.name, password: auth.password, data: str,
        action: `Added streamer ${pokeName}`,
      })
      if (result.success) {
        setMessage('Streamer added successfully!')
        setMsgClass('success')
        setStreamersDB(str)
        await loadDatabase()
      } else {
        setMessage('Failed to add streamer.')
        setMsgClass('error')
      }
    }
  }

  async function handleUpdate() {
    if (!auth) return
    let updatedData
    try {
      updatedData = JSON.parse(previewText)
    } catch (err) {
      setUpdateMessage('Invalid JSON: ' + err.message)
      return
    }
    const endpoint = mode === 'pokemon' ? API.updateDatabase : API.updateStreamers
    const result = await postData(endpoint, {
      username: auth.name, password: auth.password, data: updatedData,
      action: `Manual JSON edit (${mode})`,
    })
    if (result.success) {
      if (mode === 'pokemon') setDatabase(updatedData)
      else setStreamersDB(updatedData)
      setUpdateMessage('Database successfully updated!')
      await loadDatabase()
    } else {
      setUpdateMessage('Failed to update.')
    }
  }

  async function handleDelete() {
    if (!auth) { setDeleteMessage('Unauthorized'); return }
    if (!deletePlayer.trim()) { setDeleteMessage('Player is required.'); return }
    if (!database[deletePlayer]) { setDeleteMessage(`No data found for player ${deletePlayer}.`); return }

    const db = { ...database }
    if (!deleteId) {
      delete db[deletePlayer]
      const result = await postData(API.updateDatabase, {
        username: auth.name, password: auth.password, data: db,
        action: `Deleted all data for player ${deletePlayer}`,
      })
      if (result.success) {
        setDeleteMessage(`All data for ${deletePlayer} deleted!`)
        setDatabase(db)
        await loadDatabase()
      } else setDeleteMessage('Failed to delete player.')
    } else {
      if (!db[deletePlayer].shinies[deleteId]) {
        setDeleteMessage(`No Pokemon found with ID ${deleteId} for ${deletePlayer}.`)
        return
      }
      delete db[deletePlayer].shinies[deleteId]
      const newShinies = {}
      Object.keys(db[deletePlayer].shinies)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .forEach((key, index) => { newShinies[index + 1] = db[deletePlayer].shinies[key] })
      db[deletePlayer].shinies = newShinies
      db[deletePlayer].shiny_count = Object.values(newShinies).filter(s => s.Sold !== 'Yes').length

      const result = await postData(API.updateDatabase, {
        username: auth.name, password: auth.password, data: db,
        action: `Deleted Pokemon ID ${deleteId} for ${deletePlayer}`,
      })
      if (result.success) {
        setDeleteMessage(`Pokemon ID ${deleteId} deleted!`)
        setDatabase(db)
        await loadDatabase()
      } else setDeleteMessage('Failed to delete Pokemon.')
    }
  }

  const sortedLog = [...logData].sort((a, b) => new Date(b.time) - new Date(a.time))

  const SelectField = ({ label, id, value, onChange }) => (
    <>
      <label htmlFor={id}>{label}:</label>
      <select id={id} value={value} onChange={e => onChange(e.target.value)}>
        <option value="Yes">Yes</option>
        <option value="No">No</option>
      </select>
    </>
  )

  return (
    <div className={styles.panel}>
      <h1>Admin Panel</h1>

      <label htmlFor="mode">Select Mode:</label>
      <select id="mode" value={mode} onChange={e => setMode(e.target.value)}>
        <option value="pokemon">Add Pokemon</option>
        <option value="streamer">Add Streamer</option>
      </select>

      {mode === 'pokemon' && (
        <div>
          <label>Player Name:</label>
          <Autocomplete
            id="player"
            value={player}
            onChange={setPlayer}
            getOptions={() => Object.keys(database)}
            placeholder="hyper"
          />

          <label>Pokemon Name:</label>
          <Autocomplete
            id="pokemon"
            value={pokemon}
            onChange={setPokemon}
            getOptions={() => {
              const all = Object.values(database).flatMap(p =>
                Object.values(p.shinies || {}).map(s => s.Pokemon)
              )
              return [...new Map(all.map(p => [p.toLowerCase(), p])).values()]
                .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
            }}
            placeholder="mew"
          />

          <label>Month:</label>
          <input type="text" value={month} onChange={e => setMonth(e.target.value)} placeholder="January" />

          <label>Year:</label>
          <input type="text" value={year} onChange={e => setYear(e.target.value)} placeholder="2026" />

          <SelectField label="Egg" id="egg" value={egg} onChange={setEgg} />
          <SelectField label="Favourite" id="favourite" value={favourite} onChange={setFavourite} />
          <SelectField label="Secret Shiny" id="secretShiny" value={secretShiny} onChange={setSecretShiny} />
          <SelectField label="Alpha" id="alpha" value={alpha} onChange={setAlpha} />
          <SelectField label="Sold" id="sold" value={sold} onChange={setSold} />
          <SelectField label="Event" id="event" value={event} onChange={setEvent} />
          <SelectField label="Reaction" id="reaction" value={reaction} onChange={setReaction} />
          <SelectField label="Mysterious Ball" id="mysteriousBall" value={mysteriousBall} onChange={setMysteriousBall} />
          <SelectField label="Safari" id="safari" value={safari} onChange={setSafari} />
          <SelectField label="Honey Tree" id="honeyTree" value={honeyTree} onChange={setHoneyTree} />
          <SelectField label="Legendary" id="legendary" value={legendary} onChange={setLegendary} />

          <label>Reaction Link:</label>
          <input type="text" value={reactionLink} onChange={e => setReactionLink(e.target.value)} placeholder="Optional URL" />
        </div>
      )}

      {mode === 'streamer' && (
        <div>
          <label>PokeMMO Name:</label>
          <input type="text" value={pokeName} onChange={e => setPokeName(e.target.value)} placeholder="MiroMMO" />
          <label>Twitch Name:</label>
          <input type="text" value={twitchName} onChange={e => setTwitchName(e.target.value)} placeholder="MiroMMO" />
        </div>
      )}

      <button onClick={handleAdd}>Add</button>
      {message && <div className={`${styles.msg} ${styles[msgClass]}`}>{message}</div>}

      {showOverride && (
        <div style={{ marginTop: '10px' }}>
          <label>
            <input type="checkbox" checked={overrideDuplicate} onChange={e => setOverrideDuplicate(e.target.checked)} />
            Override Duplicate
          </label>
        </div>
      )}

      <div className={styles.deleteSection}>
        <h3>Delete Data</h3>
        <label>Player:</label>
        <Autocomplete
          id="deletePlayer"
          value={deletePlayer}
          onChange={setDeletePlayer}
          getOptions={() => Object.keys(database)}
          placeholder="Enter player name"
        />
        <label>Pokemon ID:</label>
        <input type="number" value={deleteId} onChange={e => setDeleteId(e.target.value)} placeholder="Enter Pokemon ID (Optional)" />
        <button onClick={handleDelete}>Delete Pokemon</button>
        {deleteMessage && <p>{deleteMessage}</p>}
      </div>

      <h3>Preview JSON:</h3>
      <pre
        className={styles.preview}
        contentEditable
        suppressContentEditableWarning
        onBlur={e => setPreviewText(e.currentTarget.textContent)}
      >
        {previewText}
      </pre>
      <button onClick={handleUpdate}>Update JSON</button>
      {updateMessage && <div className={styles.msg}>{updateMessage}</div>}

      <h3>Admin Log:</h3>
      <pre className={styles.logPreview}>
        {sortedLog.map(entry => {
          const date = new Date(entry.time)
          const formattedTime = date.toLocaleString(undefined, {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
          })
          return `Admin: ${entry.admin}\nAction:\n${entry.action}\nTime: ${formattedTime}\n-------------------------\n`
        }).join('')}
      </pre>
    </div>
  )
}
