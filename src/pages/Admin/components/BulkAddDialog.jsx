import { useState } from 'react'
import BulkAddReview from './BulkAddReview'
import useEnterToSubmit from './useEnterToSubmit'
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

function stripFlags(value) {
  return value.replace(/\([^)]*\)/g, '').trim().toLowerCase()
}

// Splits a line holding several "Player: Pokemon" groups (comma separated,
// colon optional when the Pokemon name is known) into [player, pokemonText] records.
function splitLineIntoRecords(line, knownNames) {
  const records = []
  let current = null
  for (const segment of splitTopLevel(line, [','])) {
    const colon = segment.match(/^([^:|/()]+):\s*(.*)$/)
    if (colon) {
      current = { player: colon[1].trim(), pokes: [colon[2]] }
      records.push(current)
      continue
    }
    const firstPart = splitPokemonParts(segment.replace(/,/g, ''))[0] || ''
    if (current && knownNames.has(stripFlags(firstPart))) {
      current.pokes.push(segment)
      continue
    }
    const words = firstPart.split(/\s+/)
    let started = false
    for (let i = 1; i < words.length && !started; i += 1) {
      if (knownNames.has(stripFlags(words.slice(i).join(' ')))) {
        const player = words.slice(0, i).join(' ')
        const rest = segment.trim().slice(player.length).trim()
        current = { player, pokes: [rest] }
        records.push(current)
        started = true
      }
    }
    if (!started && current) current.pokes.push(segment)
  }
  return records.map(r => ({ player: r.player, right: r.pokes.join(' | ') }))
}

function splitTopLevel(value, separators) {
  const parts = []
  let current = ''
  let depth = 0
  for (const character of value) {
    if (character === '(') depth += 1
    if (character === ')' && depth > 0) depth -= 1
    if (depth === 0 && separators.includes(character)) {
      if (current.trim()) parts.push(current.trim())
      current = ''
    } else {
      current += character
    }
  }
  if (current.trim()) parts.push(current.trim())
  return parts
}

export function parseBulkAddText(text, pokemonNames = []) {
  const knownNames = new Set(pokemonNames.map(n => String(n).trim().toLowerCase()))
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const entries = []
  const records = lines.flatMap(line => splitLineIntoRecords(line, knownNames))
  for (const { player, right } of records) {
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
      const entries =       parseBulkAddText(text, allPokemonNames)
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

  // The review step registers its own Enter handler
  useEnterToSubmit(handleBulkAdd, { enabled: open && !reviewEntries })

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
