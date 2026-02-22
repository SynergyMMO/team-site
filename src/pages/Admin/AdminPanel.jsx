import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext'
import useAdminDatabase from './hooks/useAdminDatabase'
import useToast from './hooks/useToast'

import TabBar from './components/TabBar'
import AddPokemonTab from './components/AddPokemonTab'
import EditPlayerTab from './components/EditPlayerTab'
import StreamersTab from './components/StreamersTab'
import EventsTab from './components/EventsTab'
import AdminLogTab from './components/AdminLogTab'
import AdvancedJsonTab from './components/AdvancedJsonTab'
import Toast from './components/Toast'
import CurrentMembers from './CurrentMembers'
import styles from './Admin.module.css'

export default function AdminPanel() {
  const { auth } = useAdmin()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('add')
  const { toast, show: showToast, dismiss: dismissToast } = useToast()

  const db = useAdminDatabase(auth)
  const events = db.events || []

  useEffect(() => {
    if (!auth) navigate('/admin')
    else {
      db.loadDatabase().catch(err => showToast('Error loading database: ' + err.message, 'error'))
      db.loadEvents().catch(err => showToast('Error loading events: ' + err.message, 'error'))
    }
  }, [auth])

  function withToast(fn, successMsg) {
    return async (...args) => {
      const result = await fn(...args)
      if (result?.success || result?.id) {
        showToast(successMsg || 'Done!', 'success', db.hasSnapshot ? () => handleUndo() : null)
      } else if (result?.error) {
        showToast(result.error, 'error')
      }
      return result
    }
  }

  async function handleUndo() {
    const ok = await db.undo()
    if (ok) showToast('Undo successful!', 'success')
    else showToast('Undo failed.', 'error')
  }

  if (db.isLoading) {
    return (
      <div className={styles.panel}>
        <h1>Admin Panel</h1>
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
          <span>Loading database...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.panel}>
      <h1>Admin Panel</h1>
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {db.isMutating && (
        <div className={styles.loadingOverlay} style={{ padding: '12px 0' }}>
          <div className={styles.spinner} />
          <span>Saving...</span>
        </div>
      )}

      {activeTab === 'add' && (
        <AddPokemonTab
          db={db.database}
          playerNames={db.playerNames}
          allPokemonNames={db.allPokemonNames}
          onAdd={withToast(db.addShiny, 'Pokemon added!')}
          isMutating={db.isMutating}
        />
      )}

      {activeTab === 'edit' && (
        <EditPlayerTab
          playerNames={db.playerNames}
          getPlayerShinies={db.getPlayerShinies}
          allPokemonNames={db.allPokemonNames}
          onEditShiny={withToast(db.editShiny, 'Shiny updated!')}
          onDeleteShiny={withToast(db.deleteShiny, 'Shiny deleted!')}
          onDeletePlayer={withToast(db.deletePlayer, 'Player deleted!')}
          onReorderShinies={withToast(db.reorderShinies, 'Shinies reordered!')}
          isMutating={db.isMutating}
        />
      )}

      {activeTab === 'current_members' && <CurrentMembers />}

      {activeTab === 'streamers' && (
        <StreamersTab
          streamersDB={db.streamersDB}
          onAdd={withToast(db.addStreamer, 'Streamer added!')}
          onDelete={withToast(db.deleteStreamer, 'Streamer deleted!')}
          isMutating={db.isMutating}
        />
      )}

      {activeTab === 'events' && (
        <EventsTab
          eventDB={db.eventDB}           
          onCreate={db.addEvent}    
          onEdit={db.updateEvent}  
          onDelete={db.removeEvent}     
          isMutating={db.isMutating}
        />
      )}

      {activeTab === 'log' && <AdminLogTab logData={db.logData} />}

      {activeTab === 'json' && (
        <AdvancedJsonTab
          database={db.database}
          streamersDB={db.streamersDB}
          eventsDB={db.eventDB}
          onUpdateDatabase={withToast(db.updateFullDatabase, 'Database updated!')}
          onUpdateStreamers={withToast(db.updateFullStreamers, 'Streamers updated!')}
          isMutating={db.isMutating}
        />
      )}

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  )
}
