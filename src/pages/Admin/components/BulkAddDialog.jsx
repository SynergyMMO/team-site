import { useState } from 'react'
import BulkAddReview from './BulkAddReview'
import styles from '../Admin.module.css'

export function parseBulkAddText(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const entries = []
  for (const line of lines) {
    // Split the right side (after :) by / or |, but keep flags for each
    const match = line.match(/^([^:]+):\s*(.+)$/i)
    if (!match) continue
    const player = match[1].trim()
    const right = match[2].trim()
    // Split on /, |, or , but keep (flags) with each
    const pokeParts = right.split(/\s*[\/|,]\s*/)
    for (const part of pokeParts) {
      // Extract 'Pokemon (flags)' or just 'Pokemon'
      const pokeMatch = part.match(/^([^()]+?)(?:\s*\(([^)]+)\))?$/)
      if (!pokeMatch) continue
      const poke = pokeMatch[1].trim()
      const flags = pokeMatch[2] ? pokeMatch[2].toLowerCase() : ''
      const entry = {
        player,
        Pokemon: poke,
        'Secret Shiny': flags.includes('ss') ? 'Yes' : 'No',
        Egg: flags.includes('egg') ? 'Yes' : 'No',
        Safari: flags.includes('safari') ? 'Yes' : 'No',
        Alpha: flags.includes('shalpha') ? 'Yes' : 'No',
        Event: flags.includes('event') ? 'Yes' : 'No',
        MysteriousBall: flags.includes('mb') ? 'Yes' : 'No',
        'Honey Tree': (flags.includes('ht') || flags.includes('honey') || flags.includes('tree')) ? 'Yes' : 'No',
        Sold: 'No',
        Favourite: 'No',
        Reaction: 'No',
        Legendary: 'No',
        'Reaction Link': '',
        ivs: '',
        nature: '',
        location: '',
        encounter_method: '',
        encounter_count: '',
        nickname: '',
        Month: null,
        Year: null,
        date_caught: null,
      }
      entries.push(entry)
    }
  }
  return entries
}

export default function BulkAddDialog({ open, onClose, onBulkAdd, playerNames = [], allPokemonNames = [], db }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [reviewEntries, setReviewEntries] = useState(null)

  function handleBulkAdd() {
    try {
      const entries = parseBulkAddText(text)
      if (entries.length === 0) throw new Error('No valid entries found.')
      setReviewEntries(entries)
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }

  function handleReviewChange(updated) {
    setReviewEntries(updated)
  }

  async function handleReviewConfirm(finalEntries) {
    await onBulkAdd(finalEntries)
    setText('')
    setReviewEntries(null)
    onClose()
  }

  function handleCancel() {
    setReviewEntries(null)
    onClose()
  }

  if (!open) return null
  return (
    <div className={styles.dialogOverlay}>
      {reviewEntries ? (
        <BulkAddReview
          entries={reviewEntries}
          playerNames={playerNames}
          allPokemonNames={allPokemonNames}
          db={db}
          onChange={handleReviewChange}
          onConfirm={handleReviewConfirm}
          onCancel={handleCancel}
        />
      ) : (
        <div className={styles.dialogBox}>
          <h3>Bulk Add Pokémon</h3>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={8}
            style={{ width: '100%' }}
            placeholder={
              'Faia: Spinarak\nWuHsin: Graveler\nZackTheAce: Bagon\nDesigner: Snorunt/Roselia (Egg)\nEJAYB: Koffing\nMysto: Chudfish (egg)\n...'
            }
          />
          {error && <div className={styles.errorNotice}>{error}</div>}
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <button onClick={handleBulkAdd}>Next: Review</button>
            <button onClick={onClose}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
