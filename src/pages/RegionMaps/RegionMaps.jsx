import { useMemo, useState } from 'react'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import regionMapsData from '../../data/region_maps.json'
import styles from './RegionMaps.module.css'
import MapFilters from './components/MapFilters'
import RouteDetailsPanel from './components/RouteDetailsPanel'
import InteractiveRegionMap from './components/InteractiveRegionMap'
import {
  areaMatchesFilters,
  getAreaSpawnSummary,
  getSpawnRarities,
  getSpawnTypes,
  toggleValue,
} from './components/mapHelpers'

const regionList = regionMapsData.regions

const defaultFilters = {
  showSpawns: true,
  showMarkers: true,
  showPaths: true,
  pokemonSearch: '',
  types: new Set(),
  rarities: new Set(),
}

function normalizeRegionMaps(region) {
  if (Array.isArray(region.maps) && region.maps.length > 0) {
    return region.maps
  }

  return [
    {
      id: `${region.id}-main`,
      name: `${region.name} Main`,
      map: region.map,
      areas: region.areas || [],
      markers: region.markers || [],
      paths: region.paths || [],
      switchTriggers: [],
    },
  ]
}

export default function RegionMaps() {
  const [activeRegionId, setActiveRegionId] = useState(regionList[0].id)
  const [filters, setFilters] = useState(defaultFilters)
  const [selectedAreaId, setSelectedAreaId] = useState(null)
  const [debugMode, setDebugMode] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useDocumentHead({
    title: 'Interactive Region Maps - Pokemon Routes, Spawns, and POIs',
    description: 'Explore interactive Pokemon region maps for Kanto, Johto, Hoenn, Sinnoh, and Unova with pan/zoom overlays, spawn filters, and route details.',
    canonicalPath: '/region-maps/',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Interactive Region Maps', url: '/region-maps/' },
    ],
  })

  const activeRegion = useMemo(
    () => regionList.find((region) => region.id === activeRegionId) || regionList[0],
    [activeRegionId]
  )

  const maps = useMemo(() => normalizeRegionMaps(activeRegion), [activeRegion])
  const [activeMapId, setActiveMapId] = useState(maps[0].id)

  const activeMap = useMemo(
    () => maps.find((mapEntry) => mapEntry.id === activeMapId) || maps[0],
    [activeMapId, maps]
  )

  const availableTypes = useMemo(
    () => getSpawnTypes(activeMap.areas || []),
    [activeMap.areas]
  )

  const availableRarities = useMemo(
    () => getSpawnRarities(activeMap.areas || []),
    [activeMap.areas]
  )

  const visibleAreas = useMemo(
    () => activeMap.areas.filter((area) => areaMatchesFilters(area, filters)),
    [activeMap.areas, filters]
  )

  const visibleAreaIds = useMemo(
    () => new Set(visibleAreas.map((area) => area.id)),
    [visibleAreas]
  )

  const selectedArea = useMemo(() => {
    if (!selectedAreaId) return null
    return activeMap.areas.find((area) => area.id === selectedAreaId) || null
  }, [activeMap.areas, selectedAreaId])

  const selectedAreaFilteredSpawns = useMemo(
    () => (selectedArea ? getAreaSpawnSummary(selectedArea, filters) : []),
    [selectedArea, filters]
  )

  const handleRegionChange = (regionId) => {
    const nextRegion = regionList.find((region) => region.id === regionId) || regionList[0]
    const nextMaps = normalizeRegionMaps(nextRegion)
    setActiveRegionId(regionId)
    setActiveMapId(nextMaps[0].id)
    setSelectedAreaId(null)
    setFilters((previous) => ({
      ...previous,
      pokemonSearch: '',
      types: new Set(),
      rarities: new Set(),
    }))
  }

  const handleMapChange = (nextMapId) => {
    setActiveMapId(nextMapId)
    setSelectedAreaId(null)
  }

  const handleFiltersChange = (change) => {
    setFilters((previous) => {
      if (change.typeToggle) {
        return { ...previous, types: toggleValue(previous.types, change.typeToggle) }
      }
      if (change.rarityToggle) {
        return { ...previous, rarities: toggleValue(previous.rarities, change.rarityToggle) }
      }
      return { ...previous, ...change }
    })
  }

  return (
    <div className={`${styles.pageWrap} ${isFullscreen ? styles.pageWrapFullscreen : ''}`}>
      <h1 className="page-title">Interactive Region Maps</h1>
      <p className={styles.heroDescription}>
        Pan, zoom, and inspect area overlays for Kanto, Johto, Hoenn, Sinnoh, and Unova.
        Use filters to surface specific spawn pools and toggle annotation layers.
      </p>

      <div className={`${styles.regionSelector} ${isFullscreen ? styles.hiddenInFullscreen : ''}`}>
        {regionList.map((region) => (
          <button
            key={region.id}
            type="button"
            className={`${styles.regionButton} ${activeRegionId === region.id ? styles.regionButtonActive : ''}`}
            onClick={() => handleRegionChange(region.id)}
          >
            <span>{region.name}</span>
            <small>{region.game}</small>
          </button>
        ))}
      </div>

      <div className={`${styles.layoutGrid} ${isFullscreen ? styles.layoutGridFullscreen : ''}`}>
        <aside className={`${styles.sidebar} ${isFullscreen ? styles.sidebarFullscreenHidden : ''}`}>
          <MapFilters
            filters={filters}
            onChangeFilters={handleFiltersChange}
            availableTypes={availableTypes}
            availableRarities={availableRarities}
            regionName={activeRegion.name}
            debugMode={debugMode}
            onChangeDebugMode={setDebugMode}
          />
          <RouteDetailsPanel selectedArea={selectedArea} filteredSpawns={selectedAreaFilteredSpawns} />
        </aside>

        <div className={`${styles.mapColumn} ${isFullscreen ? styles.mapColumnFullscreen : ''}`}>
          <InteractiveRegionMap
            region={activeRegion}
            mapConfig={activeMap}
            mapConfigs={maps}
            activeMapId={activeMapId}
            onChangeMap={handleMapChange}
            visibleAreaIds={visibleAreaIds}
            selectedAreaId={selectedAreaId}
            onSelectArea={setSelectedAreaId}
            showMarkers={filters.showMarkers}
            showPaths={filters.showPaths}
            debugMode={debugMode}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen((current) => !current)}
          />
          <p className={styles.mapLegend}>
            <span className={styles.legendSwatch} />
            Highlighted polygons represent areas matching your current filters.
          </p>
        </div>
      </div>
    </div>
  )
}
