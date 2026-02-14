import { useState, useMemo } from 'react'
import ConfirmDialog from './ConfirmDialog'
import styles from '../Admin.module.css'

const REQUIRED_SHINY_FIELDS = [
  'Pokemon', 'Secret Shiny', 'Egg', 'Alpha',
  'Sold', 'Event', 'Reaction', 'MysteriousBall', 'Safari',
  'Favourite', 'Honey Tree', 'Legendary', 'Reaction Link',
]

function validateDatabaseSchema(data) {
  const errors = []
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    errors.push('Root must be an object with player names as keys.')
    return errors
  }
  for (const [player, playerData] of Object.entries(data)) {
    if (typeof playerData !== 'object' || playerData === null) {
      errors.push(`"${player}": must be an object.`)
      continue
    }
    if (typeof playerData.shiny_count !== 'number') {
      errors.push(`"${player}": missing or invalid "shiny_count" (must be a number).`)
    }
    if (typeof playerData.shinies !== 'object' || playerData.shinies === null) {
      errors.push(`"${player}": missing or invalid "shinies" (must be an object).`)
      continue
    }
    for (const [id, shiny] of Object.entries(playerData.shinies)) {
      if (typeof shiny !== 'object' || shiny === null) {
        errors.push(`"${player}" shiny #${id}: must be an object.`)
        continue
      }
      for (const field of REQUIRED_SHINY_FIELDS) {
        if (!(field in shiny)) {
          errors.push(`"${player}" shiny #${id}: missing field "${field}".`)
        }
      }
    }
  }
  return errors
}

function validateStreamersSchema(data) {
  const errors = []
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    errors.push('Root must be an object with streamer names as keys.')
    return errors
  }
  for (const [name, entry] of Object.entries(data)) {
    if (typeof entry !== 'object' || entry === null) {
      errors.push(`"${name}": must be an object.`)
      continue
    }
    if (typeof entry.twitch_username !== 'string') {
      errors.push(`"${name}": missing or invalid "twitch_username".`)
    }
  }
  return errors
}

// Simple validation for events DB: root must be object
function validateEventsSchema(data) {
  const errors = []
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    errors.push('Root must be an object with event names as keys.')
  }
  return errors
}

// Normalize Pokemon database: fix entry gaps and recalculate shiny_count
function normalizePokemonDatabase(data) {
  const correctedData = JSON.parse(JSON.stringify(data)) // Deep copy
  const corrections = []

  for (const [player, playerData] of Object.entries(correctedData)) {
    if (typeof playerData !== 'object' || playerData === null || !playerData.shinies) {
      continue
    }

    const shinies = playerData.shinies
    const shinyIds = Object.keys(shinies)
      .map(id => parseInt(id, 10))
      .filter(id => !isNaN(id))
      .sort((a, b) => a - b)

    // Check if there are gaps in the numbering
    const hasGaps = shinyIds.some((id, i) => id !== i + 1)

    if (hasGaps || shinyIds.length !== playerData.shiny_count) {
      // Rebuild shinies with sequential IDs starting from 1
      const newShinies = {}
      shinyIds.forEach((oldId, index) => {
        newShinies[index + 1] = shinies[oldId]
      })

      // Calculate shiny_count excluding sold Pokemon
      const newShinyCount = Object.values(newShinies).filter(s => s.Sold !== 'Yes').length

      correctedData[player].shinies = newShinies
      correctedData[player].shiny_count = newShinyCount

      corrections.push(
        `"${player}": Fixed entry gaps and recalculated shiny_count (was ${playerData.shiny_count}, now ${newShinyCount})`
      )
    }
  }

  return { correctedData, corrections }
}

function computeChangeSummary(oldData, newData, mode) {
  const changes = []
  const oldKeys = new Set(Object.keys(oldData))
  const newKeys = new Set(Object.keys(newData))

  for (const k of newKeys) {
    if (!oldKeys.has(k)) changes.push(
      mode === 'pokemon' ? `+ Added player "${k}"` :
      mode === 'streamers' ? `+ Added streamer "${k}"` :
      `+ Added event "${k}"`
    )
  }
  for (const k of oldKeys) {
    if (!newKeys.has(k)) changes.push(
      mode === 'pokemon' ? `- Removed player "${k}"` :
      mode === 'streamers' ? `- Removed streamer "${k}"` :
      `- Removed event "${k}"`
    )
  }

  for (const k of newKeys) {
    if (oldKeys.has(k)) {
      if (mode === 'pokemon') {
        const oldCount = Object.keys(oldData[k]?.shinies || {}).length
        const newCount = Object.keys(newData[k]?.shinies || {}).length
        if (oldCount !== newCount) {
          changes.push(`~ "${k}": shinies ${oldCount} -> ${newCount}`)
        } else if (JSON.stringify(oldData[k]) !== JSON.stringify(newData[k])) {
          changes.push(`~ "${k}": data modified`)
        }
      } else if (JSON.stringify(oldData[k]) !== JSON.stringify(newData[k])) {
        changes.push(`~ "${k}": data modified`)
      }
    }
  }

  return changes
}

export default function AdvancedJsonTab({
  database,
  streamersDB,
  eventsDB,
  onUpdateDatabase,
  onUpdateStreamers,
  onUpdateEvents,
  isMutating,
}) {
  const [mode, setMode] = useState('pokemon')
  const [editingJson, setEditingJson] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [validationErrors, setValidationErrors] = useState([])
  const [changeSummary, setChangeSummary] = useState([])
  const [showConfirm, setShowConfirm] = useState(false)
  const [parsedData, setParsedData] = useState(null)

  const currentData = useMemo(() => {
    if (mode === 'pokemon') return database
    if (mode === 'streamers') return streamersDB
    if (mode === 'events') return eventsDB
    return {}
  }, [mode, database, streamersDB, eventsDB])

  const previewText = useMemo(() => JSON.stringify(currentData, null, 2), [currentData])

  function openEditor() {
    setEditingJson(previewText)
    setIsEditing(true)
    setValidationErrors([])
    setChangeSummary([])
  }

  function handleValidateAndSave() {
    let parsed
    try {
      parsed = JSON.parse(editingJson)
    } catch (err) {
      setValidationErrors([`Invalid JSON: ${err.message}`])
      return
    }

    // Normalize Pokemon database to fix gaps and recalculate counts
    let corrections = []
    if (mode === 'pokemon') {
      const { correctedData, corrections: normalizeCorrections } = normalizePokemonDatabase(parsed)
      parsed = correctedData
      corrections = normalizeCorrections
    }

    const errors =
      mode === 'pokemon' ? validateDatabaseSchema(parsed) :
      mode === 'streamers' ? validateStreamersSchema(parsed) :
      validateEventsSchema(parsed)

    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }

    setValidationErrors([])
    let summary = computeChangeSummary(currentData, parsed, mode)
    
    // Add corrections to summary if any were made
    if (corrections.length > 0) {
      summary = [
        ...corrections.map(c => `AUTO-CORRECTED: ${c}`),
        ...summary
      ]
    }

    setChangeSummary(summary)
    setParsedData(parsed)
    setShowConfirm(true)
  }

  async function handleConfirmSave() {
    if (!parsedData) return
    let result
    if (mode === 'pokemon') {
      result = await onUpdateDatabase(parsedData, `Manual JSON edit (pokemon)`)
    } else if (mode === 'streamers') {
      result = await onUpdateStreamers(parsedData, `Manual JSON edit (streamers)`)
    } else if (mode === 'events') {
      result = await onUpdateEvents(parsedData, `Manual JSON edit (events)`)
    }

    if (result?.success) {
      setIsEditing(false)
      setShowConfirm(false)
      setParsedData(null)
      setChangeSummary([])
    }
    return result
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <label style={{ margin: 0 }}>Data Source:</label>
        <select
          value={mode}
          onChange={e => { setMode(e.target.value); setIsEditing(false) }}
          style={{ width: 'auto' }}
        >
          <option value="pokemon">Pokemon Database</option>
          <option value="streamers">Streamers Database</option>
          <option value="events">Events Database</option>
        </select>
      </div>

      {!isEditing ? (
        <>
          <pre className={styles.preview} onClick={openEditor} style={{ cursor: 'pointer' }}>
            {previewText}
          </pre>
          <p className={styles.hintText}>Click the JSON above to open the editor.</p>
        </>
      ) : (
        <>
          <textarea
            className={styles.jsonEditor}
            value={editingJson}
            onChange={e => { setEditingJson(e.target.value); setValidationErrors([]) }}
            spellCheck={false}
          />

          {validationErrors.length > 0 && (
            <div className={styles.validationErrors}>
              <strong>Validation Errors:</strong>
              <ul>
                {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}

          <div className={styles.modalButtons} style={{ marginTop: 12 }}>
            <button onClick={handleValidateAndSave} disabled={isMutating}>
              {isMutating ? 'Saving...' : 'Validate & Save'}
            </button>
            <button onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        </>
      )}

      {showConfirm && (
        <ConfirmDialog
          title="Confirm JSON Update"
          message={
            changeSummary.length === 0
              ? 'No structural changes detected. Save anyway?'
              : `${changeSummary.length} change(s) detected:\n\n${changeSummary.join('\n')}`
          }
          confirmLabel="Save Changes"
          onConfirm={handleConfirmSave}
          onCancel={() => { setShowConfirm(false); setParsedData(null) }}
        />
      )}
    </div>
  )
}
