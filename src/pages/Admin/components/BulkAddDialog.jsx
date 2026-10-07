import { useState } from 'react'
import BulkAddReview from './BulkAddReview'
import styles from '../Admin.module.css'

function splitPokemonParts(value) {
  const parts = []
  let current = ''
  let depth = 0
  for (const character of value) {
    if (character === '(') depth += 1
    if (character === ')' && depth > 0) depth -= 1
    if (depth === 0 && ['/', '|', ','].includes(character)) {
      if (current.trim()) parts.push(current.trim())
      current = ''
    } else {
      current += character
    }
  }
  if (current.trim()) parts.push(current.trim())
  return parts
}

export function parseBulkAddText(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const entries = []
  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.+)$/i)
    if (!match) continue
    const player = match[1].trim()
    const right = match[2].trim()
    const pokeParts = splitPokemonParts(right)
    for (const part of pokeParts) {
      const pokeMatch = part.match(/^([^()]+?)(?:\s*\(([^)]+)\))?$/)
      if (!pokeMatch) continue
      const poke = pokeMatch[1].trim()
      const flags = pokeMatch[2] ? pokeMatch[2].toLowerCase() : ''
      const flagTokens = flags.match(/[a-z0-9]+/g) || []
      const hasFlag = (...aliases) => aliases.some(alias => alias.includes(' ')
        ? flags.includes(alias)
        : flagTokens.includes(alias))
      const entry = {
        player,
        Pokemon: poke,
        'Secret Shiny': hasFlag('ss', 'secret shiny') ? 'Yes' : 'No',
        Egg: hasFlag('egg') ? 'Yes' : 'No',
        Safari: hasFlag('safari') ? 'Yes' : 'No',
        Fossil: hasFlag('fossil') ? 'Yes' : 'No',
        Fishing: hasFlag('fishing', 'fish') ? 'Yes' : 'No',
        Swarm: hasFlag('swarm') ? 'Yes' : 'No',
        Headbutt: hasFlag('headbutt') ? 'Yes' : 'No',
        Pkid: hasFlag('pkid') ? 'Yes' : 'No',
        Alpha: hasFlag('shalpha', 'alpha') ? 'Yes' : 'No',
        Event: hasFlag('event') ? 'Yes' : 'No',
        MysteriousBall: hasFlag('mb', 'mysterious ball') ? 'Yes' : 'No',
        'Honey Tree': hasFlag('ht', 'honey tree', 'honey', 'tree') ? 'Yes' : 'No',
        'Altering Cave': hasFlag('altering cave', 'ac') ? 'Yes' : 'No',
        Sold: hasFlag('sold') ? 'Yes' : 'No',
        Favourite: hasFlag('favourite', 'favorite') ? 'Yes' : 'No',
        Reaction: 'No',
        Legendary: hasFlag('legendary') ? 'Yes' : 'No',
        'Reaction Link': '',
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
