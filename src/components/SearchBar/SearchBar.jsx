import styles from './SearchBar.module.css'

export default function SearchBar({ value, onChange }) {
  return (
    <div className={styles.searchBar}>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete="off"
        placeholder="Search for a player..."
      />
    </div>
  )
}
