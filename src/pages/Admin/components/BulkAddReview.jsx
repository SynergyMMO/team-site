import { useState } from 'react'
import Autocomplete from './Autocomplete'
import styles from '../Admin.module.css'

const FLAG_FIELDS = [
  { key: 'Egg', label: 'Egg' },
  { key: 'Favourite', label: 'Favourite' },
  { key: 'Secret Shiny', label: 'Secret Shiny' },
  { key: 'Alpha', label: 'Alpha' },
  { key: 'Sold', label: 'Sold' },
  { key: 'Event', label: 'Event' },
  { key: 'MysteriousBall', label: 'Mystery Ball' },
  { key: 'Safari', label: 'Safari' },
  { key: 'Honey Tree', label: 'Honey Tree' },
  { key: 'Fossil', label: 'Fossil' },
  { key: 'Swarm', label: 'Swarm' },
  { key: 'Fishing', label: 'Fishing' },
  { key: 'Headbutt', label: 'Headbutt' },
  { key: 'Altering Cave', label: 'Altering Cave' },
  { key: 'Pkid', label: 'Pkid' },
  { key: 'Legendary', label: 'Legendary' },
]
export default function BulkAddReview({ entries, playerNames, allPokemonNames, onChange, onConfirm, onCancel, db }) {
    // Helper to check if a shiny already exists for this player and Pokémon
    function isDuplicate(entry) {
      if (!db || !entry.player || !entry.Pokemon) return false;
      const playerData = db[entry.player];
      if (!playerData || !playerData.shinies) return false;
      return Object.values(playerData.shinies).some(
        s => s.Pokemon && s.Pokemon.toLowerCase() === entry.Pokemon.toLowerCase()
      );
    }
  // entries: [{ player, Pokemon, ...flags }]
  const [pending, setPending] = useState(entries)
  const [useCurrentMonth, setUseCurrentMonth] = useState(false)

  function handleFieldChange(idx, field, value) {
    const updated = pending.map((entry, i) => {
      if (i !== idx) return entry
      const changed = { ...entry, [field]: value }
      if (field === 'Reaction Link') changed.Reaction = value.trim() ? 'Yes' : 'No'
      return changed
    })
    setPending(updated)
    onChange && onChange(updated)
  }

  function handleFlagChange(idx, flag, value) {
    handleFieldChange(idx, flag, value ? 'Yes' : 'No')
  }

  function handleDateCaughtChange(idx, value) {
    const updated = pending.map((entry, i) => {
      if (i !== idx) return entry
      if (!value) return { ...entry, date_caught: null, Month: null, Year: null }
      const [year, month] = value.split('-')
      const monthName = new Date(Number(year), Number(month) - 1).toLocaleString('en', { month: 'long' })
      return { ...entry, date_caught: value, Month: monthName, Year: year }
    })
    setPending(updated)
    onChange && onChange(updated)
  }

  function handleRemove(idx) {
    const updated = pending.filter((_, i) => i !== idx)
    setPending(updated)
    onChange && onChange(updated)
  }

  function handleConfirm() {
    let result = pending
    if (useCurrentMonth) {
      const now = new Date()
      const monthNames = [
        'January','February','March','April','May','June','July','August','September','October','November','December'
      ]
      const year = String(now.getFullYear())
      const month = monthNames[now.getMonth()]
      result = result.map(e => ({ ...e, Year: year, Month: month }))
    }
    result = result
      .filter(e => e.player && e.Pokemon)
      .map(entry => ({
        ...entry,
        Reaction: entry['Reaction Link']?.trim() ? 'Yes' : 'No',
        Month: entry.Month || null,
        Year: entry.Year || null,
        date_caught: entry.date_caught || null,
      }))
    onConfirm(result)
  }

  return (
    <div className={styles.dialogOverlay}>
      <div className={styles.dialogBox + ' ' + styles.bulkReviewFullWidth}>
        <h3>Confirm Bulk Add</h3>
        <div className={styles.bulkReviewHeader}>
          Review and fill in details for each Pokémon
          <label className={styles.bulkCurrentMonth}>
            <input
              type="checkbox"
              checked={useCurrentMonth}
              onChange={e => setUseCurrentMonth(e.target.checked)}
            />
            Current Month
          </label>
        </div>
        <div className={styles.bulkReviewList}>
          {pending.map((entry, idx) => (
            <article key={idx} className={styles.bulkReviewCard}>
              <div className={styles.bulkReviewIdentity}>
                <div className={styles.bulkReviewField}>
                  <label htmlFor={`bulk-player-${idx}`}>Player</label>
                  <Autocomplete
                    id={`bulk-player-${idx}`}
                    value={entry.player}
                    onChange={val => handleFieldChange(idx, 'player', val)}
                    getOptions={() => playerNames}
                    placeholder="Player"
                  />
                </div>
                <div className={styles.bulkReviewField}>
                  <label htmlFor={`bulk-pokemon-${idx}`}>Pokémon</label>
                  <Autocomplete
                    id={`bulk-pokemon-${idx}`}
                    value={entry.Pokemon}
                    onChange={val => handleFieldChange(idx, 'Pokemon', val)}
                    getOptions={() => allPokemonNames}
                    placeholder="Pokémon"
                  />
                </div>
                <button
                  type="button"
                  className={styles.bulkRemoveButton}
                  onClick={() => handleRemove(idx)}
                  title="Remove this entry"
                >
                  Remove
                </button>
              </div>
              {isDuplicate(entry) && <p className={styles.bulkDuplicateNotice}>This player already has this Pokémon.</p>}
              <div className={styles.bulkReviewDetails}>
                <div className={styles.bulkReviewField}>
                  <label htmlFor={`bulk-month-${idx}`}>Month</label>
                  <input id={`bulk-month-${idx}`} value={entry.Month || ''} onChange={e => handleFieldChange(idx, 'Month', e.target.value)} placeholder="Optional" />
                </div>
                <div className={styles.bulkReviewField}>
                  <label htmlFor={`bulk-year-${idx}`}>Year</label>
                  <input id={`bulk-year-${idx}`} value={entry.Year || ''} onChange={e => handleFieldChange(idx, 'Year', e.target.value)} placeholder="Optional" />
                </div>
                <div className={styles.bulkReviewField}>
                  <label htmlFor={`bulk-date-${idx}`}>Date Caught</label>
                  <input id={`bulk-date-${idx}`} type="date" value={entry.date_caught || ''} onChange={e => handleDateCaughtChange(idx, e.target.value)} />
                </div>
                <div className={styles.bulkReviewField}>
                  <label htmlFor={`bulk-reaction-link-${idx}`}>Reaction Link</label>
                  <input id={`bulk-reaction-link-${idx}`} value={entry['Reaction Link'] || ''} onChange={e => handleFieldChange(idx, 'Reaction Link', e.target.value)} placeholder="Optional URL" />
                  <span className={styles.fieldHint}>A link automatically marks the reaction as present.</span>
                </div>
              </div>
              <div className={styles.bulkReviewFlags} aria-label="Pokémon tags and status">
                {FLAG_FIELDS.map(f => (
                  <label key={f.key} className={styles.shinyFlag}>
                    <input
                      type="checkbox"
                      checked={entry[f.key] === 'Yes'}
                      onChange={e => handleFlagChange(idx, f.key, e.target.checked)}
                    />
                    {f.label}
                  </label>
                ))}
              </div>
            </article>
          ))}
        </div>
        <div className={styles.bulkReviewActions}>
          <button onClick={handleConfirm}>Confirm & Add</button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
