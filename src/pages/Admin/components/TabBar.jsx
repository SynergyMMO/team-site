import styles from '../Admin.module.css'

const TABS = [
  { key: 'add', label: 'Add Pokemon', shortLabel: 'Add' },
  { key: 'edit', label: 'Edit Player', shortLabel: 'Edit' },
  { key: 'current_members', label: 'Current Members', shortLabel: 'Members' },
  { key: 'streamers', label: 'Streamers' },
  { key: 'events', label: 'Events' },
  { key: 'osw', label: 'OSW Planner', shortLabel: 'OSW' },
  { key: 'bounties', label: 'Bounties', shortLabel: 'Bounties' },
  { key: 'themes', label: 'Themes', shortLabel: 'Themes' },
  { key: 'log', label: 'Admin Log', shortLabel: 'Log' },
  { key: 'json', label: 'Advanced (JSON)', shortLabel: 'Advanced' },
  { key: 'access', label: 'Access', shortLabel: 'Access' },
]

export default function TabBar({ activeTab, onTabChange, visibleTabs = null }) {
  const filteredTabs = Array.isArray(visibleTabs)
    ? TABS.filter(tab => visibleTabs.includes(tab.key))
    : TABS

  return (
    <div className={styles.tabBar}>
      {filteredTabs.map(tab => (
        <button
          key={tab.key}
          className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
          onClick={() => onTabChange(tab.key)}
        >
          <span className={styles.tabLabelFull}>{tab.label}</span>
          <span className={styles.tabLabelShort}>{tab.shortLabel || tab.label}</span>
        </button>
      ))}
    </div>
  )
}
