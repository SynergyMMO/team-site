import styles from '../RegionMaps.module.css'

export default function MapFilters({
  filters,
  onChangeFilters,
  availableTypes,
  availableRarities,
  regionName,
  debugMode,
  onChangeDebugMode,
}) {
  return (
    <section className={styles.panelCard}>
      <h2 className={styles.panelTitle}>Filters</h2>
      <p className={styles.panelSubtle}>Showing data for {regionName}</p>

      <label className={styles.toggleRow}>
        <input
          type="checkbox"
          checked={filters.showSpawns}
          onChange={(event) => onChangeFilters({ showSpawns: event.target.checked })}
        />
        Show Pokemon Spawn Filtering
      </label>

      <label className={styles.toggleRow}>
        <input
          type="checkbox"
          checked={filters.showMarkers}
          onChange={(event) => onChangeFilters({ showMarkers: event.target.checked })}
        />
        Show City / POI Markers
      </label>

      <label className={styles.toggleRow}>
        <input
          type="checkbox"
          checked={filters.showPaths}
          onChange={(event) => onChangeFilters({ showPaths: event.target.checked })}
        />
        Show Suggested Paths
      </label>

      <label className={styles.toggleRow}>
        <input
          type="checkbox"
          checked={debugMode}
          onChange={(event) => onChangeDebugMode(event.target.checked)}
        />
        Debug Mode (Coordinate Selection)
      </label>

      <div className={styles.controlBlock}>
        <label className={styles.controlLabel} htmlFor="pokemon-name-filter">Pokemon Name</label>
        <input
          id="pokemon-name-filter"
          className={styles.textInput}
          placeholder="e.g. Pikachu"
          value={filters.pokemonSearch}
          onChange={(event) => onChangeFilters({ pokemonSearch: event.target.value })}
        />
      </div>

      <div className={styles.controlBlock}>
        <p className={styles.controlLabel}>Types</p>
        <div className={styles.chipGrid}>
          {availableTypes.map((type) => (
            <button
              key={type}
              type="button"
              className={`${styles.chip} ${filters.types.has(type) ? styles.chipActive : ''}`}
              onClick={() => onChangeFilters({ typeToggle: type })}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.controlBlock}>
        <p className={styles.controlLabel}>Rarity</p>
        <div className={styles.chipGrid}>
          {availableRarities.map((rarity) => (
            <button
              key={rarity}
              type="button"
              className={`${styles.chip} ${filters.rarities.has(rarity) ? styles.chipActive : ''}`}
              onClick={() => onChangeFilters({ rarityToggle: rarity })}
            >
              {rarity}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
