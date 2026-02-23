import { useState } from 'react'
import ConfirmDialog from './ConfirmDialog'
import styles from '../Admin.module.css'

export default function StreamersTab({ streamersDB, onAdd, onDelete, isMutating, onEdit }) {
  const [pokeName, setPokeName] = useState('')
  const [twitchName, setTwitchName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [editing, setEditing] = useState(null) // { oldName, pokeName, twitchName }
  function startEdit(name, data) {
    setEditing({ oldName: name, pokeName: name, twitchName: data.twitch_username || '' })
  }

  function cancelEdit() {
    setEditing(null)
  }

  async function handleEditSave() {
    if (!editing.pokeName.trim() || !editing.twitchName.trim()) return
    if (onEdit) {
      const result = await onEdit(editing.oldName, editing.pokeName, editing.twitchName)
      if (result?.success) setEditing(null)
      return result
    }
  }

  async function handleAdd() {
    if (!pokeName.trim() || !twitchName.trim()) return
    const result = await onAdd(pokeName, twitchName)
    if (result?.success) {
      setPokeName('')
      setTwitchName('')
    }
    return result
  }

  async function handleConfirmDelete() {
    if (!confirmDelete) return
    const result = await onDelete(confirmDelete)
    setConfirmDelete(null)
    return result
  }

  const streamerEntries = Object.entries(streamersDB).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div>
      <h3>Add Streamer</h3>
      <label>PokeMMO Name:</label>
      <input
        type="text"
        value={pokeName}
        onChange={e => setPokeName(e.target.value)}
        placeholder="MiroMMO"
      />
      <label>Twitch Name:</label>
      <input
        type="text"
        value={twitchName}
        onChange={e => setTwitchName(e.target.value)}
        placeholder="MiroMMO"
      />
      <button onClick={handleAdd} disabled={isMutating || !pokeName.trim() || !twitchName.trim()}>
        {isMutating ? 'Saving...' : 'Add Streamer'}
      </button>

      <h3>Current Streamers ({streamerEntries.length})</h3>
      {streamerEntries.length === 0 ? (
        <p className={styles.hintText}>No streamers in the database.</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.shinyTable}>
            <thead>
              <tr>
                <th>PokeMMO Name</th>
                <th>Twitch Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {streamerEntries.map(([name, data]) => (
                editing && editing.oldName === name ? (
                  <tr key={name}>
                    <td>
                      <input
                        type="text"
                        value={editing.pokeName}
                        onChange={e => setEditing({ ...editing, pokeName: e.target.value })}
                        disabled={isMutating}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={editing.twitchName}
                        onChange={e => setEditing({ ...editing, twitchName: e.target.value })}
                        disabled={isMutating}
                      />
                    </td>
                    <td>
                      <button onClick={handleEditSave} disabled={isMutating || !editing.pokeName.trim() || !editing.twitchName.trim()}>
                        Save
                      </button>
                      <button onClick={cancelEdit} disabled={isMutating}>
                        Cancel
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>{data.twitch_username}</td>
                    <td>
                      <button className={styles.editBtn} onClick={() => startEdit(name, data)} disabled={isMutating}>
                        Edit
                      </button>
                      <button className={styles.deleteBtn} onClick={() => setConfirmDelete(name)} disabled={isMutating}>
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Streamer"
          message={`Are you sure you want to delete streamer "${confirmDelete}"?`}
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
