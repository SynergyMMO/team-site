import { useState } from 'react'
import Autocomplete from './Autocomplete'
import styles from '../Admin.module.css'

const FLAG_FIELDS = [
  { key: 'Egg', label: 'Egg' },
  { key: 'Secret Shiny', label: 'Secret Shiny' },
  { key: 'Safari', label: 'Safari' },
  { key: 'Alpha', label: 'Alpha' },
  { key: 'Event', label: 'Event' },
  { key: 'MysteriousBall', label: 'Mystery Ball' },
  { key: 'Honey Tree', label: 'Honey Tree' },
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
    function handleRemove(idx) {
      const updated = pending.filter((_, i) => i !== idx);
      setPending(updated);
      onChange && onChange(updated);
    }
  // entries: [{ player, Pokemon, ...flags }]
  const [pending, setPending] = useState(entries)
  const [useCurrentMonth, setUseCurrentMonth] = useState(false)

  function handleFieldChange(idx, field, value) {
    const updated = pending.map((e, i) => i === idx ? { ...e, [field]: value } : e)
    setPending(updated)
    onChange && onChange(updated)
  }

  function handleFlagChange(idx, flag, value) {
    // Store as 'Yes'/'No' for compatibility
    handleFieldChange(idx, flag, value ? 'Yes' : 'No')
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
    // Only add entries with both player and Pokemon
    result = result.filter(e => e.player && e.Pokemon)
    onConfirm(result)
  }

  return (
    <div className={styles.dialogOverlay}>
      <div className={styles.dialogBox + ' ' + styles.bulkReviewFullWidth} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <h3>Confirm Bulk Add</h3>
        <div className={styles.bulkReviewHeader}>
          Player / Pokémon / Flags
          <label style={{ float: 'right', fontWeight: 'normal', fontSize: 14 }}>
            <input
              type="checkbox"
              checked={useCurrentMonth}
              onChange={e => setUseCurrentMonth(e.target.checked)}
              style={{ marginRight: 4 }}
            />
            Current Month
          </label>
        </div>
        <div className={styles.bulkReviewList}>
          {pending.map((entry, idx) => (
            <div key={idx} className={styles.bulkReviewGridRow}>
              <div>
                <Autocomplete
                  id={`player-${idx}`}
                  value={entry.player}
                  onChange={val => handleFieldChange(idx, 'player', val)}
                  getOptions={() => playerNames}
                  placeholder="Player"
                />
              </div>
              <div>
                <Autocomplete
                  id={`poke-${idx}`}
                  value={entry.Pokemon}
                  onChange={val => handleFieldChange(idx, 'Pokemon', val)}
                  getOptions={() => allPokemonNames}
                  placeholder="Pokemon"
                />
              </div>
              {FLAG_FIELDS.map(f => (
                <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, justifyContent: 'center', whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={entry[f.key] === 'Yes'}
                    onChange={e => handleFlagChange(idx, f.key, e.target.checked)}
                  />
                  {f.label}
                </label>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button
                  type="button"
                  style={{
                    marginLeft: 0,
                    color: 'red',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: '#a259c4',
                    border: 'none',
                    borderRadius: '16px',
                    padding: '4px 18px',
                  }}
                  onClick={() => handleRemove(idx)}
                  title="Remove this entry"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={handleConfirm}>Confirm & Add</button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
