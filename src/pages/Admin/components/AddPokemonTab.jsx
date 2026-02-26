import { useState } from 'react'
import Autocomplete from './Autocomplete'
import ShinyForm from './ShinyForm'
import styles from '../Admin.module.css'

export default function AddPokemonTab({ db, playerNames, allPokemonNames, onAdd, isMutating }) {
  const [player, setPlayer] = useState('')
  const [duplicateNotice, setDuplicateNotice] = useState(null)

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
