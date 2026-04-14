import styles from '../RegionMaps.module.css'
import { getSpawnRarityValues } from './mapHelpers'

function formatEncounterSummary(spawn) {
  if (!Array.isArray(spawn.encounters) || spawn.encounters.length === 0) {
    return getSpawnRarityValues(spawn).join(', ')
  }

  const methods = Array.from(new Set(spawn.encounters.map((encounter) => encounter.method).filter(Boolean)))
  const levels = spawn.encounters
    .filter((encounter) => Number.isFinite(encounter.minLevel) && Number.isFinite(encounter.maxLevel))
    .map((encounter) => encounter.minLevel === encounter.maxLevel
      ? `${encounter.minLevel}`
      : `${encounter.minLevel}-${encounter.maxLevel}`)

  const levelSummary = levels.length > 0 ? `Lv. ${Array.from(new Set(levels)).join(', ')}` : null
  const methodSummary = methods.length > 0 ? methods.join(', ') : null
  const raritySummary = getSpawnRarityValues(spawn).join(', ')

  return [methodSummary, levelSummary, raritySummary].filter(Boolean).join(' - ')
}

function SpawnRow({ spawn }) {
  return (
    <li className={styles.spawnRow}>
      <span className={styles.spawnName}>{spawn.name}</span>
      <span className={styles.spawnMeta}>
        {(spawn.types || []).join(' / ')} - {formatEncounterSummary(spawn)}
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
