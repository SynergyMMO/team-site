import styles from '../Admin.module.css'

const TABS = [
  { key: 'add', label: 'Add Pokemon', shortLabel: 'Add' },
  { key: 'edit', label: 'Edit Player', shortLabel: 'Edit' },
  { key: 'streamers', label: 'Streamers' },
  { key: 'events', label: 'Events' },
  { key: 'log', label: 'Admin Log', shortLabel: 'Log' },
  { key: 'json', label: 'Advanced (JSON)', shortLabel: 'Advanced' },
]

export default function TabBar({ activeTab, onTabChange }) {
  return (
    <div className={styles.tabBar}>
      {TABS.map(tab => (
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
