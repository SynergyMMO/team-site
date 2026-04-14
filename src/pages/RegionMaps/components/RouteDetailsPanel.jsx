import styles from '../RegionMaps.module.css'

function SpawnRow({ spawn }) {
  return (
    <li className={styles.spawnRow}>
      <span className={styles.spawnName}>{spawn.name}</span>
      <span className={styles.spawnMeta}>
        {(spawn.types || []).join(' / ')} - {spawn.rarity}
      </span>
    </li>
  )
}

export default function RouteDetailsPanel({ selectedArea, filteredSpawns }) {
  if (!selectedArea) {
    return (
      <section className={styles.panelCard}>
        <h2 className={styles.panelTitle}>Route Details</h2>
        <p className={styles.panelSubtle}>Select an area on the map to inspect encounters, notes, and metadata.</p>
      </section>
    )
  }

  return (
    <section className={styles.panelCard}>
      <h2 className={styles.panelTitle}>{selectedArea.name}</h2>
      <p className={styles.areaKind}>{selectedArea.kind}</p>
      <p className={styles.panelSubtle}>{selectedArea.notes}</p>

      <h3 className={styles.sectionHeading}>Pokemon Spawns</h3>
      {filteredSpawns.length > 0 ? (
        <ul className={styles.spawnList}>
          {filteredSpawns.map((spawn) => <SpawnRow key={`${selectedArea.id}-${spawn.name}`} spawn={spawn} />)}
        </ul>
      ) : (
        <p className={styles.panelSubtle}>No spawns match the current filters.</p>
      )}

      <h3 className={styles.sectionHeading}>Items</h3>
      <p className={styles.panelSubtle}>
        {(selectedArea.items || []).length > 0 ? selectedArea.items.join(', ') : 'No item data yet.'}
      </p>

      <h3 className={styles.sectionHeading}>Trainers</h3>
      <p className={styles.panelSubtle}>
        {(selectedArea.trainers || []).length > 0 ? selectedArea.trainers.join(', ') : 'No trainer data yet.'}
      </p>
    </section>
  )
}
