import styles from '../RegionMaps.module.css'
import { getLocalPokemonGif, onGifError } from '../../../utils/pokemon'
import { getSpawnRarityValues } from './mapHelpers'

const SPAWN_CATEGORIES = [
  {
    key: 'hordes',
    label: 'Hordes',
    matches: ({ encounterTypes }) => encounterTypes.has('horde'),
  },
  {
    key: 'lure',
    label: 'Lure',
    matches: ({ encounterTypes }) => encounterTypes.has('lure'),
  },
  {
    key: 'headbutt',
    label: 'Headbutt',
    matches: ({ methods }) => methods.has('headbutt'),
  },
  {
    key: 'single',
    label: 'Single',
    matches: ({ encounterTypes, methods }) =>
      ['very common', 'common', 'uncommon', 'rare', 'very rare'].some((type) => encounterTypes.has(type))
        && !['fishing', 'old rod', 'good rod', 'super rod'].some((method) => methods.has(method)),
  },
  {
    key: 'fishing',
    label: 'Fishing',
    matches: ({ encounterTypes, methods }) =>
      encounterTypes.has('fishing')
        || ['fishing', 'old rod', 'good rod', 'super rod'].some((method) => methods.has(method)),
  },
  {
    key: 'special',
    label: 'Special',
    matches: ({ encounterTypes }) => encounterTypes.has('special'),
  },
]

function normalizeEncounterValue(value) {
  return String(value || '').trim().toLowerCase()
}

function getSpawnCategory(spawn) {
  const encounterTypes = new Set(getSpawnRarityValues(spawn).map(normalizeEncounterValue))
  const methods = new Set((spawn.encounters || []).map((encounter) => normalizeEncounterValue(encounter.method)))
  const matchContext = { encounterTypes, methods }

  return SPAWN_CATEGORIES.find((category) => category.matches(matchContext))?.key || 'other'
}

function groupSpawnsByCategory(spawns) {
  const groups = new Map(SPAWN_CATEGORIES.map((category) => [category.key, []]))
  groups.set('other', [])

  spawns.forEach((spawn) => {
    groups.get(getSpawnCategory(spawn)).push(spawn)
  })

  return [
    ...SPAWN_CATEGORIES.map((category) => ({ ...category, spawns: groups.get(category.key) })),
    { key: 'other', label: 'Other', spawns: groups.get('other') },
  ].filter((category) => category.spawns.length > 0)
}

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
      <span className={styles.spawnSpriteWrap} title={spawn.name}>
        <img
          className={styles.spawnSprite}
          src={getLocalPokemonGif(spawn.name)}
          alt={spawn.name}
          loading="lazy"
          onError={onGifError(spawn.name)}
        />
      </span>
      <span className={styles.spawnMeta}>
        {(spawn.types || []).join(' / ')} - {formatEncounterSummary(spawn)}
      </span>
    </li>
  )
}

function MatchingRouteList({ matchingAreas, selectedAreaId, onSelectArea }) {
  const routeLabel = matchingAreas.length === 1 ? 'route' : 'routes'

  return (
    <section className={styles.matchingRoutesSection}>
      <h3 className={styles.sectionHeading}>Total routes selected</h3>
      <p className={styles.panelSubtle}>{matchingAreas.length} {routeLabel} match the current filters.</p>
      {matchingAreas.length > 0 ? (
        <div className={styles.routeChipGrid}>
          {matchingAreas.map((area) => (
            <button
              key={area.id}
              type="button"
              className={`${styles.routeChip} ${selectedAreaId === area.id ? styles.routeChipActive : ''}`}
              onClick={() => onSelectArea(area.id)}
            >
              {area.name}
            </button>
          ))}
        </div>
      ) : (
        <p className={styles.panelSubtle}>No routes match the current filters.</p>
      )}
    </section>
  )
}

export default function RouteDetailsPanel({
  selectedArea,
  filteredSpawns,
  matchingAreas = [],
  onSelectArea,
}) {
  if (!selectedArea) {
    return (
      <section className={styles.panelCard}>
        <h2 className={styles.panelTitle}>Route Details</h2>
        <p className={styles.panelSubtle}>Select an area on the map to inspect encounters, notes, and metadata.</p>
        <MatchingRouteList
          matchingAreas={matchingAreas}
          selectedAreaId={selectedArea?.id}
          onSelectArea={onSelectArea}
        />
      </section>
    )
  }

  const spawnCategories = groupSpawnsByCategory(filteredSpawns)

  return (
    <section className={styles.panelCard}>
      <h2 className={styles.panelTitle}>{selectedArea.name}</h2>
      <p className={styles.areaKind}>{selectedArea.kind}</p>
      <p className={styles.panelSubtle}>{selectedArea.notes}</p>

      <h3 className={styles.sectionHeading}>Pokemon Spawns</h3>
      {filteredSpawns.length > 0 ? (
        <div className={styles.spawnCategoryList}>
          {spawnCategories.map((category) => (
            <section key={category.key} className={styles.spawnCategory}>
              <h4 className={styles.spawnCategoryTitle}>{category.label}</h4>
              <ul className={styles.spawnList}>
                {category.spawns.map((spawn) => (
                  <SpawnRow key={`${selectedArea.id}-${category.key}-${spawn.name}`} spawn={spawn} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p className={styles.panelSubtle}>No spawns match the current filters.</p>
      )}

      <MatchingRouteList
        matchingAreas={matchingAreas}
        selectedAreaId={selectedArea.id}
        onSelectArea={onSelectArea}
      />
    </section>
  )
}
