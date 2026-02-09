import { useState } from 'react'
import Autocomplete from './Autocomplete'
import EventForm from './EventForm' // We'll create this similar to ShinyForm
import ConfirmDialog from './ConfirmDialog'
import styles from '../Admin.module.css'

export default function EditEventsTab({
  eventsList,       // Array of all events
  onEditEvent,      // Function to save event edits
  onDeleteEvent,    // Function to delete an event
  isMutating,
}) {
  const [selectedEventId, setSelectedEventId] = useState('')
  const [editingData, setEditingData] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const selectedEvent = eventsList.find(e => e.id === selectedEventId)

  function handleEdit() {
    setEditingData({ ...selectedEvent })
  }

  function handleCancelEdit() {
    setEditingData(null)
  }

  async function handleSaveEdit(eventData) {
    const result = await onEditEvent(selectedEventId, eventData)
    if (result?.success) {
      setEditingData(null)
    }
    return result
  }

  async function handleConfirmDelete() {
    const result = await onDeleteEvent(selectedEventId)
    if (result?.success) {
      setSelectedEventId('')
      setConfirmDelete(false)
    }
    return result
  }

  return (
    <div>
      <label>Select Event:</label>
      <Autocomplete
        id="editEventSelect"
        value={selectedEventId}
        onChange={val => {
          setSelectedEventId(val)
          setEditingData(null)
        }}
        getOptions={() => eventsList.map(e => ({ value: e.id, label: e.title }))}
        placeholder="Search event..."
      />

      {!selectedEventId && (
        <p className={styles.hintText}>Select an event to edit its details.</p>
      )}

      {selectedEventId && !selectedEvent && (
        <p className={styles.hintText}>Event not found.</p>
      )}

      {selectedEvent && !editingData && (
        <div style={{ marginTop: 16 }}>
          <h3>{selectedEvent.title}</h3>
          <button
            className={styles.primaryBtn}
            onClick={handleEdit}
          >
            Edit Event
          </button>
          <button
            className={styles.dangerBtn}
            style={{ marginLeft: 10 }}
            onClick={() => setConfirmDelete(true)}
          >
            Delete Event
          </button>
        </div>
      )}

      {editingData && (
        <div className={styles.editSection}>
          <h3>Editing Event: {editingData.title}</h3>
          <EventForm
            initialData={editingData}
            onSubmit={handleSaveEdit}
            submitLabel="Save Changes"
            isMutating={isMutating}
          />
          <button
            onClick={handleCancelEdit}
            style={{ backgroundColor: '#555', marginTop: 10 }}
          >
            Cancel Edit
          </button>
        </div>
      )}

      {confirmDelete && selectedEvent && (
        <ConfirmDialog
          title="Delete Event"
          message={`Are you sure you want to permanently delete "${selectedEvent.title}"? This cannot be undone.`}
          confirmLabel="Delete Event"
          typeToConfirm={selectedEvent.title}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}
