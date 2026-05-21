import { useState } from 'react'
import Autocomplete from './Autocomplete'
import ShinyForm from './ShinyForm'
import BulkAddDialog, { parseBulkAddText } from './BulkAddDialog'
import styles from '../Admin.module.css'

export default function AddPokemonTab({ db, playerNames, allPokemonNames, onAdd, isMutating, onBulkAdd }) {
  const [player, setPlayer] = useState('')
  const [duplicateNotice, setDuplicateNotice] = useState(null)
  const [bulkOpen, setBulkOpen] = useState(false)

  function checkDuplicates(pokemonName) {
    if (!player || !pokemonName || !db[player]) return null
    const shinies = db[player].shinies || {}
    const matches = Object.entries(shinies).filter(
      ([, s]) => s.Pokemon.toLowerCase() === pokemonName.toLowerCase()
    )
    if (matches.length > 0) {
      return `"${pokemonName}" already exists ${matches.length} time(s) for ${player}. Duplicates are valid - this is just a heads-up.`
    }
    return null
  }

  async function handleSubmit(shinyData) {
    if (!player.trim()) return
    const notice = checkDuplicates(shinyData.Pokemon)
    setDuplicateNotice(notice)
    // If date_caught is blank, set it to '' (empty string)
    const fixedData = { ...shinyData, date_caught: shinyData.date_caught === '' ? '' : shinyData.date_caught }
    const result = await onAdd(player, fixedData)
    if (result?.success) {
      setDuplicateNotice(null)
    }
    return result
  }

  async function handleBulkAdd(entries) {
    // Batch all new shinies into a single DB update
    const newDb = JSON.parse(JSON.stringify(db));
    const added = [];
    for (const entry of entries) {
      const { player: entryPlayer, ...shinyData } = entry;
      if (!entryPlayer) continue;
      if (!newDb[entryPlayer]) newDb[entryPlayer] = { shiny_count: 0, shinies: {} };
      const existingIds = Object.keys(newDb[entryPlayer].shinies).map(Number);
      const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
      newDb[entryPlayer].shinies[nextId] = { ...shinyData };
      newDb[entryPlayer].shiny_count = (newDb[entryPlayer].shiny_count || 0) + 1;
      added.push({ player: entryPlayer, id: nextId });
    }
    if (onBulkAdd) {
      await onBulkAdd(newDb, added);
    }
    // Optionally, show a confirmation or error summary here
  }

  return (
    <div>
      <label>Player Name:</label>
      <Autocomplete
        id="addPlayerName"
        value={player}
        onChange={setPlayer}
        getOptions={() => playerNames}
        placeholder="Hyper"
      />

      <button style={{ marginTop: 10, marginBottom: 10 }} onClick={() => setBulkOpen(true)}>
        Bulk Add
      </button>

      <BulkAddDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onBulkAdd={handleBulkAdd}
        playerNames={playerNames}
        allPokemonNames={allPokemonNames}
        db={db}
      />

      {!player.trim() && (
        <p className={styles.hintText}>Select or type a player name to add a shiny.</p>
      )}

      {player.trim() && (
        <>
          {duplicateNotice && (
            <div className={styles.infoNotice}>{duplicateNotice}</div>
          )}
          <ShinyForm
            onSubmit={handleSubmit}
            submitLabel="Add Pokemon"
            allPokemonNames={allPokemonNames}
            isMutating={isMutating}
          />
        </>
      )}
    </div>
  )
}
