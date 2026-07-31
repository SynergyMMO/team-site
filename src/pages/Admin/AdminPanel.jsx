import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext'
import useAdminDB from './hooks/useAdminDatabase'
import useToast from './hooks/useToast'

import TabBar from './components/TabBar'
import AddPokemonTab from './components/AddPokemonTab'
import EditPlayerTab from './components/EditPlayerTab'
import StreamersTab from './components/StreamersTab'
import CurrentMembers from './components/CurrentMembers'
import EventsTab from './components/EventsTab'
import AdminLogTab from './components/AdminLogTab'
import AdvancedJsonTab from './components/AdvancedJsonTab'
import ThemesTab from './components/ThemesTab'
import Toast from './components/Toast'
import BountiesTab from './components/BountiesTab'
import OswPlannerTab from './components/OswPlannerTab'
import AccessControlTab from './components/AccessControlTab'
import styles from './Admin.module.css'

export default function AdminPanel() {
  const { auth } = useAdmin()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('osw')
  const { toast, show: showToast, dismiss: dismissToast } = useToast()

  const db = useAdminDB(auth)
  const events = db.events || []
  const hasFetched = useRef(false)
  const allowedTabs = auth?.isFullAdmin
    ? ['add', 'edit', 'current_members', 'streamers', 'events', 'osw', 'bounties', 'themes', 'log', 'json', 'access']
    : (Array.isArray(auth?.allowedTabs) && auth.allowedTabs.length > 0 ? auth.allowedTabs : ['osw'])

  useEffect(() => {
    if (!auth) { navigate('/admin'); return }
    if (hasFetched.current) return
    hasFetched.current = true
    db.loadOswPlanner?.().catch(err => showToast('Error loading OSW planner: ' + err.message, 'error'))
    if (auth.isFullAdmin) {
      db.loadDatabase().catch(err => showToast('Error loading database: ' + err.message, 'error'))
      db.loadEvents().catch(err => showToast('Error loading events: ' + err.message, 'error'))
      db.loadThemes().catch(err => showToast('Error loading themes: ' + err.message, 'error'))
      db.loadBounties?.().catch(err => showToast('Error loading bounties: ' + err.message, 'error'))
      db.loadAdminAccessConfig?.().catch(err => showToast('Error loading access config: ' + err.message, 'error'))
    }
  }, [auth])

  useEffect(() => {
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0] || 'osw')
    }
  }, [activeTab, allowedTabs])

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
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} visibleTabs={allowedTabs} />

      {db.isMutating && (
        <div className={styles.loadingOverlay} style={{ padding: '12px 0' }}>
          <div className={styles.spinner} />
          <span>Saving...</span>
        </div>
      )}

      {allowedTabs.includes('add') && activeTab === 'add' && (
        <AddPokemonTab
          db={db.database}
          playerNames={db.playerNames}
          allPokemonNames={db.allPokemonNames}
          onAdd={withToast(db.addShiny, 'Pokemon added!')}
          onBulkAdd={async (newDb, added) => {
            // Compose a detailed log message for the admin log
            let action = 'Bulk add:';
            if (Array.isArray(added) && added.length > 0) {
              action += '\n' + added.map(e => `- ${e.player}: ${newDb[e.player]?.shinies[e.id]?.Pokemon || 'Unknown'}`).join('\n');
            }
            const result = await db.updateFullDatabase(newDb, action);
            if (result?.success) showToast('Bulk add complete!', 'success');
            else showToast(result?.error || 'Bulk add failed', 'error');
            return result;
          }}
          isMutating={db.isMutating}
        />
      )}

      {allowedTabs.includes('edit') && activeTab === 'edit' && (
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

      {allowedTabs.includes('current_members') && activeTab === 'current_members' && <CurrentMembers auth={auth} />}

      {allowedTabs.includes('streamers') && activeTab === 'streamers' && (
        <StreamersTab
          streamersDB={db.streamersDB}
          onAdd={withToast(db.addStreamer, 'Streamer added!')}
          onDelete={withToast(db.deleteStreamer, 'Streamer deleted!')}
          onEdit={withToast(db.editStreamer, 'Streamer updated!')}   // 👈 ADD
          isMutating={db.isMutating}
        />
      )}

      {allowedTabs.includes('events') && activeTab === 'events' && (
        <EventsTab
          eventDB={db.eventDB}           
          onCreate={db.addEvent}    
          onEdit={db.updateEvent}  
          onDelete={db.removeEvent}     
          isMutating={db.isMutating}
        />
      )}

      {allowedTabs.includes('themes') && activeTab === 'themes' && (
        <ThemesTab
          themesDB={db.themesDB}
          onSave={withToast(db.saveTheme, 'Theme saved!')}
          onDelete={withToast(db.deleteTheme, 'Theme deleted!')}
          isMutating={db.isMutating}
        />
      )}

      {allowedTabs.includes('osw') && activeTab === 'osw' && (
        <OswPlannerTab
          oswPlannerData={db.oswPlannerData || {}}
          allPokemonNames={db.allPokemonNames}
          onAdd={withToast(db.addOswPlannerShiny, 'OSW planner shiny added!')}
          onRemove={withToast(db.removeOswPlannerShiny, 'OSW planner shiny removed!')}
          isMutating={db.isMutating}
        />
      )}

      {allowedTabs.includes('bounties') && activeTab === 'bounties' && (
        <BountiesTab
          bounties={db.bounties || []}
          onAdd={withToast(db.addBounty, 'Bounty added!')}
          onEdit={withToast(db.editBounty, 'Bounty updated!')}
          onDelete={withToast(db.deleteBounty, 'Bounty deleted!')}
          isMutating={db.isMutating}
        />
      )}

      {allowedTabs.includes('log') && activeTab === 'log' && <AdminLogTab logData={db.logData} members={db.members} />}

      {allowedTabs.includes('json') && activeTab === 'json' && (
        <AdvancedJsonTab
          database={db.database}
          streamersDB={db.streamersDB}
          eventsDB={db.eventDB}
          onUpdateDatabase={withToast(db.updateFullDatabase, 'Database updated!')}
          onUpdateStreamers={withToast(db.updateFullStreamers, 'Streamers updated!')}
          isMutating={db.isMutating}
        />
      )}

      {allowedTabs.includes('access') && activeTab === 'access' && (
        <AccessControlTab
          config={db.adminAccessConfig}
          availableUsers={db.availableAdminUsers}
          allTabs={db.allAdminTabs}
          onSave={withToast(db.saveAdminAccessConfig, 'Access rules saved!')}
          isMutating={db.isMutating}
        />
      )}

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  )
}
