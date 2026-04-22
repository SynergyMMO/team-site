import { useMemo, useState } from 'react'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import { useEncounterPercents } from '../../hooks/useEncounterPercents'
import regionMapsData from '../../data/region_maps'
import styles from './RegionMaps.module.css'
import MapFilters from './components/MapFilters'
import RouteDetailsPanel from './components/RouteDetailsPanel'
import InteractiveRegionMap from './components/InteractiveRegionMap'
import {
  areaMatchesFilters,
  getAreaSpawnSummary,
  SHINY_TIER_OPTIONS,
  getSpawnRarities,
  getSpawnTypes,
  toggleValue,
} from './components/mapHelpers'
import { flattenEncounterRoutes } from '../../utils/routeEncounterPercents'

const defaultRegionList = regionMapsData.regions
const allRegionList = regionMapsData.allRegions || regionMapsData.regions

const defaultFilters = {
  showSpawns: true,
  showMarkers: true,
  showPaths: true,
  pokemonSearch: '',
  types: new Set(),
  rarities: new Set(),
  shinyTiers: new Set(),
}

function imageSlug(value) {
  return value
    .toLowerCase()
    .replace(/pok(?:\u00e9|\u00c3\u00a9)mon/g, 'pokemon')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

function normalizeMapImage(region, mapEntry, mainImage) {
  const configuredImage = mapEntry.map?.image
  const shouldUseInteriorImage = mapEntry.id !== `${region.id}-main` && configuredImage === mainImage

  if (!shouldUseInteriorImage) return mapEntry.map

  return {
    ...mapEntry.map,
    image: `images/maps/${region.id}/${imageSlug(mapEntry.name)}.png`,
  }
}

function routeAreasToMaps(mapEntries) {
  const mapIds = new Set(mapEntries.map((mapEntry) => mapEntry.id))
  const areasByMapId = new Map(mapEntries.map((mapEntry) => [mapEntry.id, []]))

  mapEntries.forEach((mapEntry) => {
    const areas = mapEntry.areas || []
    areas.forEach((area) => {
      const targetMapId = mapIds.has(area.mapId) ? area.mapId : mapEntry.id
      areasByMapId.get(targetMapId).push(area)
    })
  })

  return mapEntries.map((mapEntry) => ({
    ...mapEntry,
    areas: areasByMapId.get(mapEntry.id) || [],
  }))
}

function normalizeRegionMaps(region) {
  if (Array.isArray(region.maps) && region.maps.length > 0) {
    const mainImage = region.maps[0].map?.image
    const normalizedMaps = region.maps.map((mapEntry) => ({
      ...mapEntry,
      map: normalizeMapImage(region, mapEntry, mainImage),
      paths: mapEntry.paths || mapEntry.suggestedPaths || [],
      switchTriggers: mapEntry.switchTriggers || [],
    }))

    return routeAreasToMaps(normalizedMaps)
  }

  return [
    {
      id: `${region.id}-main`,
      name: `${region.name} Main`,
      map: region.map,
      areas: region.areas || [],
      markers: region.markers || [],
      paths: region.paths || region.suggestedPaths || [],
      switchTriggers: [],
    },
  ]
}

export default function RegionMaps() {
  const { data: encounterPercents = {} } = useEncounterPercents()
  const [showAllRegions, setShowAllRegions] = useState(false)
  const regionList = showAllRegions ? allRegionList : defaultRegionList
  const [activeRegionId, setActiveRegionId] = useState(defaultRegionList[0].id)
  const [filters, setFilters] = useState(defaultFilters)
  const [selectedAreaId, setSelectedAreaId] = useState(null)
  const [debugMode, setDebugMode] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const encounterRoutes = useMemo(() => flattenEncounterRoutes(encounterPercents), [encounterPercents])

  useDocumentHead({
    title: 'Interactive Region Maps - Pokemon Routes, Spawns, and POIs',
    description: 'Explore interactive Pokemon region maps with pan/zoom overlays, spawn filters, and route details.',
    canonicalPath: '/region-maps/',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Interactive Region Maps', url: '/region-maps/' },
    ],
  })

  const activeRegion = useMemo(
    () => regionList.find((region) => region.id === activeRegionId) || regionList[0],
    [activeRegionId, regionList]
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
      shinyTiers: new Set(),
    }))
  }

  const handleMapChange = (nextMapId, nextAreaId = null) => {
    const nextMap = maps.find((mapEntry) => mapEntry.id === nextMapId)
    if (!nextMap) return

    setActiveMapId(nextMap.id)
    setSelectedAreaId(
      nextAreaId && nextMap.areas.some((area) => area.id === nextAreaId)
        ? nextAreaId
        : null
    )
  }

  const handleFiltersChange = (change) => {
    setFilters((previous) => {
      if (change.typeToggle) {
        return { ...previous, types: toggleValue(previous.types, change.typeToggle) }
      }
      if (change.rarityToggle) {
        return { ...previous, rarities: toggleValue(previous.rarities, change.rarityToggle) }
      }
      if (Number.isFinite(change.shinyTierToggle)) {
        return { ...previous, shinyTiers: toggleValue(previous.shinyTiers, change.shinyTierToggle) }
      }
      return { ...previous, ...change }
    })
  }

  return (
    <div className={`${styles.pageWrap} ${isFullscreen ? styles.pageWrapFullscreen : ''}`}>
      <div className={styles.workInProgress}>
        <button
          type="button"
          className={styles.hiddenWorkButton}
          onClick={() => setShowAllRegions(true)}
          aria-label="Reveal work in progress regions"
        >
          WORK
        </button>
        <span> IN PROGRESS</span>
      </div>
      <h1 className="page-title">Interactive Region Maps</h1>
      <p className={styles.heroDescription}>
        Pan, zoom, and inspect area overlays while this section is being built.
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
            shinyTierOptions={SHINY_TIER_OPTIONS}
            regionName={activeRegion.name}
            debugMode={debugMode}
            onChangeDebugMode={setDebugMode}
          />
          <RouteDetailsPanel
            encounterRoutes={encounterRoutes}
            regionName={activeRegion.name}
            selectedArea={selectedArea}
            filteredSpawns={selectedAreaFilteredSpawns}
            matchingAreas={visibleAreas}
            onSelectArea={setSelectedAreaId}
          />
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
