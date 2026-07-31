import { useEffect, useMemo, useState } from 'react'
import styles from '../Admin.module.css'

const TAB_LABELS = {
  add: 'Add Pokemon',
  edit: 'Edit Player',
  current_members: 'Current Members',
  streamers: 'Streamers',
  events: 'Events',
  osw: 'OSW Planner',
  bounties: 'Bounties',
  themes: 'Themes',
  log: 'Admin Log',
  json: 'Advanced (JSON)',
  access: 'Access',
}

function toMultiline(users) {
  return Array.isArray(users) ? users.join('\n') : ''
}

function parseUsers(input) {
  return Array.from(
    new Set(
      String(input || '')
        .split(/\r?\n|,/)
        .map((value) => value.trim())
        .filter(Boolean)
    )
  )
}

export default function AccessControlTab({
  config,
  availableUsers,
  allTabs,
  onSave,
  isMutating,
}) {
  const [fullAccessUsersText, setFullAccessUsersText] = useState('')
  const [restrictedTabs, setRestrictedTabs] = useState(['osw'])

  useEffect(() => {
    setFullAccessUsersText(toMultiline(config?.fullAccessUsers))
    setRestrictedTabs(Array.isArray(config?.restrictedTabs) && config.restrictedTabs.length > 0 ? config.restrictedTabs : ['osw'])
  }, [config])

  const sortedAvailableUsers = useMemo(
    () => [...(availableUsers || [])].sort((left, right) => left.localeCompare(right)),
    [availableUsers]
  )

  const editableTabs = useMemo(
    () => (allTabs || []).filter((tabKey) => tabKey !== 'access'),
    [allTabs]
  )

  function handleRestrictedToggle(tabKey) {
    setRestrictedTabs((current) => {
      if (current.includes(tabKey)) {
        const next = current.filter((entry) => entry !== tabKey)
        return next.length > 0 ? next : ['osw']
      }
      return [...current, tabKey]
    })
  }

  async function handleSave() {
    await onSave({
      fullAccessUsers: parseUsers(fullAccessUsersText),
      restrictedTabs,
    })
  }

  return (
    <div>
      <h3>Admin Access</h3>
      <p className={styles.hintText}>Users in the full admin list can see every tab. Authenticated users not in that list only see the selected restricted tabs.</p>

      <label htmlFor="full-admin-users">Full Admin Usernames</label>
      <textarea
        id="full-admin-users"
        className={styles.jsonEditor}
        style={{ minHeight: 180, maxHeight: 260 }}
        value={fullAccessUsersText}
        onChange={(event) => setFullAccessUsersText(event.target.value)}
        disabled={isMutating}
      />

      {sortedAvailableUsers.length > 0 && (
        <div className={styles.infoNotice}>
          {`Known login usernames: ${sortedAvailableUsers.join(', ')}`}
        </div>
      )}

      <label>Restricted User Tabs</label>
      <div>
        {editableTabs.map((tabKey) => (
          <label key={tabKey} className={styles.inputRow}>
            <input
              type="checkbox"
              checked={restrictedTabs.includes(tabKey)}
              onChange={() => handleRestrictedToggle(tabKey)}
              disabled={isMutating}
            />
            <span>{TAB_LABELS[tabKey] || tabKey}</span>
          </label>
        ))}
      </div>

      <button style={{ marginTop: 16 }} onClick={handleSave} disabled={isMutating}>
        Save Access Rules
      </button>
    </div>
  )
}
