import { useState } from 'react'
import Autocomplete from './Autocomplete'
import ShinyTable from './ShinyTable'
import ShinyForm from './ShinyForm'
import ConfirmDialog from './ConfirmDialog'
import styles from '../Admin.module.css'

export default function EditPlayerTab({
  playerNames, getPlayerShinies, allPokemonNames,
  onEditShiny, onDeleteShiny, onDeletePlayer, isMutating, onReorderShinies,
}) {
  const [selectedPlayer, setSelectedPlayer] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingData, setEditingData] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [confirmDeletePlayer, setConfirmDeletePlayer] = useState(false)

  const shinies = selectedPlayer ? getPlayerShinies(selectedPlayer) : {}

  function handleEdit(id, shiny) {
    setEditingId(id)
    setEditingData({ ...shiny })
  }

  function handleCancelEdit() {
    setEditingId(null)
    setEditingData(null)
  }

  async function handleSaveEdit(shinyData) {
    const result = await onEditShiny(selectedPlayer, editingId, shinyData)
    if (result?.success) {
      setEditingId(null)
      setEditingData(null)
    }
    return result
  }

  function handleDeleteClick(id, shiny) {
    setConfirmDelete({ id, pokemon: shiny.Pokemon })
  }

  async function handleConfirmDelete() {
    if (!confirmDelete) return
    const result = await onDeleteShiny(selectedPlayer, confirmDelete.id)
    setConfirmDelete(null)
    return result
  }

  async function handleConfirmDeletePlayer() {
    const result = await onDeletePlayer(selectedPlayer)
    if (result?.success) {
      setSelectedPlayer('')
      setConfirmDeletePlayer(false)
    }
    return result
  }

  async function handleReorderShinies(newOrder) {
    const result = await onReorderShinies(selectedPlayer, newOrder)
    return result
  }

  return (
    <div>
      <label>Select Player:</label>
      <Autocomplete
        id="editPlayerSelect"
        value={selectedPlayer}
        onChange={val => {
          setSelectedPlayer(val)
          setEditingId(null)
          setEditingData(null)
        }}
        getOptions={() => playerNames}
        placeholder="Search player..."
      />

      {!selectedPlayer.trim() && (
        <p className={styles.hintText}>Select a player to view and edit their shinies.</p>
      )}

      {selectedPlayer.trim() && !getPlayerShinies(selectedPlayer) && (
        <p className={styles.hintText}>Player "{selectedPlayer}" not found.</p>
      )}

      {selectedPlayer.trim() && getPlayerShinies(selectedPlayer) && (
        <>
          {editingId ? (
            <div className={styles.editSection}>
              <h3>Editing #{editingId} - {editingData?.Pokemon}</h3>
              <ShinyForm
                initialData={editingData}
                onSubmit={handleSaveEdit}
                submitLabel="Save Changes"
                allPokemonNames={allPokemonNames}
                isMutating={isMutating}
                isEditMode
              />
              <button onClick={handleCancelEdit} style={{ backgroundColor: '#555', marginTop: 10 }}>
                Cancel Edit
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                <h3 style={{ margin: 0 }}>
                  {selectedPlayer}'s Shinies ({Object.keys(shinies).length})
                </h3>
                <button
                  className={styles.dangerBtn}
                  onClick={() => setConfirmDeletePlayer(true)}
                >
                  Delete Entire Player
                </button>
              </div>
              <ShinyTable
                shinies={shinies}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onReorder={handleReorderShinies}
              />
            </>
          )}
        </>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Shiny"
          message={`Are you sure you want to delete ${confirmDelete.pokemon} (#${confirmDelete.id}) from ${selectedPlayer}?`}
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {confirmDeletePlayer && (
        <ConfirmDialog
          title="Delete Entire Player"
          message={`This will permanently delete ALL data for ${selectedPlayer}, including all ${Object.keys(shinies).length} shinies. This cannot be undone without restoring from a backup.`}
          confirmLabel="Delete Player"
          typeToConfirm={selectedPlayer}
          onConfirm={handleConfirmDeletePlayer}
          onCancel={() => setConfirmDeletePlayer(false)}
        />
      )}
    </div>
  )
}
