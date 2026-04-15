import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getAssetUrl } from '../../../utils/assets'
import { getLocalPokemonGif, onGifError } from '../../../utils/pokemon'
import styles from '../RegionMaps.module.css'
import { clamp } from './mapHelpers'

const ZOOM_STEP = 1.12
const PAN_THRESHOLD_PX = 5
const DEBUG_POINT_THRESHOLD = 4

function stopMapEvent(event) {
  event.preventDefault()
  event.stopPropagation()
}

function containMapEvent(event) {
  event.stopPropagation()
}

function computeFitTransform(containerRect, mapConfig, scaleOverride = null) {
  const fitScale = Math.min(
    containerRect.width / mapConfig.map.width,
    containerRect.height / mapConfig.map.height
  )
  const scale = scaleOverride ?? fitScale
  const x = (containerRect.width - mapConfig.map.width * scale) / 2
  const y = (containerRect.height - mapConfig.map.height * scale) / 2
  return { fitScale, scale, x, y }
}

function getBoxFromPoints(start, end) {
  const minX = Math.min(start.x, end.x)
  const minY = Math.min(start.y, end.y)
  const maxX = Math.max(start.x, end.x)
  const maxY = Math.max(start.y, end.y)
  return {
    topLeft: { x: Math.round(minX), y: Math.round(minY) },
    bottomRight: { x: Math.round(maxX), y: Math.round(maxY) },
    points: [
      [Math.round(minX), Math.round(minY)],
      [Math.round(maxX), Math.round(minY)],
      [Math.round(maxX), Math.round(maxY)],
      [Math.round(minX), Math.round(maxY)],
    ],
    width: Math.round(maxX - minX),
    height: Math.round(maxY - minY),
  }
}

function intersects(a, b) {
  return !(a.x + a.width < b.x || b.x + b.width < a.x || a.y + a.height < b.y || b.y + b.height < a.y)
}

function getMarkerVisualScale(mapWidth) {
  if (mapWidth <= 900) return { fontSize: 11, radius: 5, offset: 8 }
  if (mapWidth <= 1400) return { fontSize: 13, radius: 6, offset: 10 }
  return { fontSize: 15, radius: 7, offset: 12 }
}

function getSwitchLabelVisualScale(mapWidth) {
  if (mapWidth <= 900) return { fontSize: 12, strokeWidth: 2.4 }
  if (mapWidth <= 1400) return { fontSize: 17, strokeWidth: 3.2 }
  return { fontSize: 36, strokeWidth: 6 }
}

function getSwitchSpriteVisualScale(mapWidth) {
  if (mapWidth <= 900) return { size: 34 }
  if (mapWidth <= 1400) return { size: 48 }
  return { size: 84 }
}

function normalizePokemonLabel(label) {
  return label.trim().toLowerCase()
}

function getRouteLabelVisualScale(mapWidth) {
  if (mapWidth <= 900) return { fontSize: 10, strokeWidth: 2.2 }
  if (mapWidth <= 1400) return { fontSize: 13, strokeWidth: 2.8 }
  return { fontSize: 22, strokeWidth: 4.5 }
}

function getTextBox(label, x, y, fontSize, anchor = 'middle') {
  const width = Math.max(fontSize * 2.4, String(label || '').length * fontSize * 0.62)
  const height = fontSize + 7
  return {
    x: anchor === 'middle' ? x - width / 2 : x,
    y: y - height / 2,
    width,
    height,
  }
}

function placeTextBox(baseBox, placed, mapWidth, mapHeight) {
  const step = Math.max(6, baseBox.height * 0.92)
  const offsets = [0]
  for (let index = 1; index <= 18; index += 1) offsets.push(-step * index)
  for (let index = 1; index <= 8; index += 1) offsets.push(step * index)

  for (const offset of offsets) {
    const box = {
      ...baseBox,
      x: clamp(baseBox.x, 2, Math.max(2, mapWidth - baseBox.width - 2)),
      y: clamp(baseBox.y + offset, 2, Math.max(2, mapHeight - baseBox.height - 2)),
    }
    if (!placed.some((existing) => intersects(existing, box))) return box
  }

  return {
    ...baseBox,
    x: clamp(baseBox.x, 2, Math.max(2, mapWidth - baseBox.width - 2)),
    y: clamp(baseBox.y - step * 18, 2, Math.max(2, mapHeight - baseBox.height - 2)),
  }
}

function centerOfPoints(points = []) {
  if (!points.length) return { x: 0, y: 0 }
  return {
    x: points.reduce((sum, point) => sum + point[0], 0) / points.length,
    y: points.reduce((sum, point) => sum + point[1], 0) / points.length,
  }
}

function midpointOfPath(points = []) {
  if (points.length === 0) return { x: 0, y: 0 }
  if (points.length === 1) return { x: points[0][0], y: points[0][1] }

  const segments = points.slice(1).map((point, index) => {
    const previous = points[index]
    return {
      from: previous,
      to: point,
      length: Math.hypot(point[0] - previous[0], point[1] - previous[1]),
    }
  })
  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0)
  let remaining = totalLength / 2

  for (const segment of segments) {
    if (remaining <= segment.length) {
      const ratio = segment.length === 0 ? 0 : remaining / segment.length
      return {
        x: segment.from[0] + (segment.to[0] - segment.from[0]) * ratio,
        y: segment.from[1] + (segment.to[1] - segment.from[1]) * ratio,
      }
    }
    remaining -= segment.length
  }

  const last = points[points.length - 1]
  return { x: last[0], y: last[1] }
}

function layoutMarkers(markers, mapWidth, mapHeight, placed = []) {
  const { fontSize, radius, offset } = getMarkerVisualScale(mapWidth)
  const lineHeight = fontSize + 3
  const charWidth = fontSize * 0.54
  const labelGap = Math.max(6, Math.round(fontSize * 0.45))

  const result = markers.map((marker) => {
    const width = Math.max(30, Math.round(marker.label.length * charWidth))
    const height = lineHeight
    const candidates = [
      { x: marker.x + offset, y: marker.y - height / 2 },
      { x: marker.x - offset - width, y: marker.y - height / 2 },
      { x: marker.x + offset, y: marker.y - height - labelGap },
      { x: marker.x - offset - width, y: marker.y - height - labelGap },
      { x: marker.x + offset, y: marker.y + labelGap },
      { x: marker.x - offset - width, y: marker.y + labelGap },
    ]

    let chosen = null
    for (const candidate of candidates) {
      const box = {
        x: clamp(candidate.x, 1, mapWidth - width - 1),
        y: clamp(candidate.y, 1, mapHeight - height - 1),
        width,
        height,
      }
      if (!placed.some((existing) => intersects(existing, box))) {
        chosen = box
        break
      }
    }

    if (!chosen) {
      const fallback = candidates[0]
      chosen = {
        x: clamp(fallback.x, 1, mapWidth - width - 1),
        y: clamp(fallback.y, 1, mapHeight - height - 1),
        width,
        height,
      }
    }

    placed.push(chosen)
    return {
      ...marker,
      labelX: chosen.x,
      labelY: chosen.y,
      fontSize,
      radius,
      strokeWidth: Math.max(2.2, fontSize * 0.2),
    }
  })

  return result
}

function layoutMapAnnotations({ areas, paths, markers, showPaths, showMarkers, mapWidth, mapHeight }) {
  const placed = []
  const routeScale = getRouteLabelVisualScale(mapWidth)
  const markerLayouts = []
  const areaLabels = []
  const pathLabels = []

  areas.forEach((area) => {
    const label = area.name || area.id
    if (!label) return
    const center = centerOfPoints(area.points)
    const box = placeTextBox(
      getTextBox(label, center.x, center.y, routeScale.fontSize),
      placed,
      mapWidth,
      mapHeight
    )
    placed.push(box)
    areaLabels.push({
      id: area.id,
      label,
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
      fontSize: routeScale.fontSize,
      strokeWidth: routeScale.strokeWidth,
    })
  })

  if (showPaths) {
    paths.forEach((path) => {
      const label = path.label || path.id
      if (!label) return
      const center = midpointOfPath(path.points)
      const box = placeTextBox(
        getTextBox(label, center.x, center.y, routeScale.fontSize),
        placed,
        mapWidth,
        mapHeight
      )
      placed.push(box)
      pathLabels.push({
        id: path.id,
        label,
        x: box.x + box.width / 2,
        y: box.y + box.height / 2,
        fontSize: routeScale.fontSize,
        strokeWidth: routeScale.strokeWidth,
      })
    })
  }

  if (showMarkers) {
    markerLayouts.push(...layoutMarkers(markers, mapWidth, mapHeight, placed))
  }

  return {
    areaLabels: new Map(areaLabels.map((label) => [label.id, label])),
    pathLabels: new Map(pathLabels.map((label) => [label.id, label])),
    markerLayouts,
  }
}

export default function InteractiveRegionMap({
  region,
  mapConfig,
  mapConfigs,
  activeMapId,
  onChangeMap,
  visibleAreaIds,
  selectedAreaId,
  onSelectArea,
  showMarkers,
  showPaths,
  debugMode,
  isFullscreen,
  onToggleFullscreen,
}) {
  const containerRef = useRef(null)
  const debugTextRef = useRef(null)
  const [transform, setTransform] = useState(null)
  const pointersRef = useRef(new Map())
  const dragStartRef = useRef(null)
  const pinchStartRef = useRef(null)
  const [hoveredArea, setHoveredArea] = useState(null)
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 })
  const [debugDrag, setDebugDrag] = useState(null)
  const [debugBox, setDebugBox] = useState(null)
  const [debugPoint, setDebugPoint] = useState(null)
  const [debugOutput, setDebugOutput] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const [imageFailed, setImageFailed] = useState(false)

  const visibleAreas = useMemo(
    () => (mapConfig.areas || []).filter((area) => visibleAreaIds.has(area.id)),
    [mapConfig.areas, visibleAreaIds]
  )

  const switchLabelVisualScale = useMemo(
    () => getSwitchLabelVisualScale(mapConfig.map.width),
    [mapConfig.map.width]
  )

  const switchSpriteVisualScale = useMemo(
    () => getSwitchSpriteVisualScale(mapConfig.map.width),
    [mapConfig.map.width]
  )

  const annotationLayouts = useMemo(
    () => layoutMapAnnotations({
      areas: visibleAreas,
      paths: mapConfig.paths || [],
      markers: mapConfig.markers || [],
      showPaths,
      showMarkers,
      mapWidth: mapConfig.map.width,
      mapHeight: mapConfig.map.height,
    }),
    [
      mapConfig.markers,
      mapConfig.map.height,
      mapConfig.map.width,
      mapConfig.paths,
      showMarkers,
      showPaths,
      visibleAreas,
    ]
  )

  const knownPokemonNames = useMemo(() => new Set(
    mapConfigs.flatMap((mapEntry) =>
      (mapEntry.areas || []).flatMap((area) =>
        (area.spawns || []).map((spawn) => normalizePokemonLabel(spawn.name))
      )
    )
  ), [mapConfigs])

  useEffect(() => {
    setImageFailed(false)
  }, [mapConfig.map.image])

  const clampTransform = useCallback((next, containerRect) => {
    const scaledWidth = mapConfig.map.width * next.scale
    const scaledHeight = mapConfig.map.height * next.scale

    const centeredX = (containerRect.width - scaledWidth) / 2
    const centeredY = (containerRect.height - scaledHeight) / 2

    const minX = Math.min(0, containerRect.width - scaledWidth)
    const maxX = Math.max(0, containerRect.width - scaledWidth)
    const minY = Math.min(0, containerRect.height - scaledHeight)
    const maxY = Math.max(0, containerRect.height - scaledHeight)

    return {
      ...next,
      x: scaledWidth <= containerRect.width ? centeredX : clamp(next.x, minX, maxX),
      y: scaledHeight <= containerRect.height ? centeredY : clamp(next.y, minY, maxY),
    }
  }, [mapConfig.map.height, mapConfig.map.width])

  const toMapCoordinates = useCallback((clientX, clientY) => {
    if (!containerRef.current || !transform) return null
    const rect = containerRef.current.getBoundingClientRect()
    const mapX = (clientX - rect.left - transform.x) / transform.scale
    const mapY = (clientY - rect.top - transform.y) / transform.scale
    return {
      x: clamp(mapX, 0, mapConfig.map.width),
      y: clamp(mapY, 0, mapConfig.map.height),
    }
  }, [mapConfig.map.height, mapConfig.map.width, transform])

  const copyText = async (text, label) => {
    setDebugOutput(text)
    setCopyStatus('')
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
        setCopyStatus(`${label} copied to clipboard.`)
        return
      }
      if (debugTextRef.current) {
        debugTextRef.current.focus()
        debugTextRef.current.select()
        const copied = document.execCommand?.('copy')
        setCopyStatus(copied
          ? `${label} copied to clipboard.`
          : `Clipboard unavailable. ${label} shown below for manual copy.`)
      }
    } catch {
      if (debugTextRef.current) {
        debugTextRef.current.focus()
        debugTextRef.current.select()
        document.execCommand?.('copy')
      }
      setCopyStatus(`Clipboard blocked. ${label} shown below for manual copy.`)
    }
  }

  const copyPayload = async (payload, label) => {
    await copyText(JSON.stringify(payload), label)
  }

  const copyPointCoordinates = async () => {
    if (!debugPoint) return
    await copyPayload({ point: [debugPoint.x, debugPoint.y] }, 'Point coordinates')
  }

  const copyBoxCoordinates = async () => {
    if (!debugBox) return
    await copyText(`"points": ${JSON.stringify(debugBox.points)}`, 'Box points')
  }

  const handleWheelZoom = useCallback((event) => {
    if (!containerRef.current || !transform) return
    event.preventDefault()
    event.stopPropagation()

    const rect = containerRef.current.getBoundingClientRect()
    const zoomDirection = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP

    const minScale = computeFitTransform(rect, mapConfig).fitScale
    const maxScale = minScale * 7
    const nextScale = clamp(transform.scale * zoomDirection, minScale, maxScale)

    const pointerX = event.clientX - rect.left
    const pointerY = event.clientY - rect.top
    const mapX = (pointerX - transform.x) / transform.scale
    const mapY = (pointerY - transform.y) / transform.scale

    const next = {
      scale: nextScale,
      x: pointerX - mapX * nextScale,
      y: pointerY - mapY * nextScale,
    }
    setTransform(clampTransform(next, rect))
  }, [clampTransform, mapConfig, transform])

  useEffect(() => {
    if (!containerRef.current) return
    const element = containerRef.current
    const wheelListener = (event) => handleWheelZoom(event)
    element.addEventListener('wheel', wheelListener, { passive: false })
    return () => element.removeEventListener('wheel', wheelListener)
  }, [handleWheelZoom])

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(() => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      setTransform((current) => {
        if (!current) return computeFitTransform(rect, mapConfig)
        const refit = computeFitTransform(rect, mapConfig, current.scale)
        return clampTransform(refit, rect)
      })
    })

    observer.observe(containerRef.current)
    const rect = containerRef.current.getBoundingClientRect()
    setTransform(computeFitTransform(rect, mapConfig))
    return () => observer.disconnect()
  }, [clampTransform, mapConfig])

  const clearPointers = () => {
    pointersRef.current.clear()
    dragStartRef.current = null
    pinchStartRef.current = null
  }

  const handlePointerDown = useCallback((event) => {
    if (!containerRef.current || !transform) return
    if (event.button !== 0 && event.pointerType !== 'touch') return

    const target = event.target
    if (target instanceof Element && target.closest('[data-map-control],[data-debug-overlay],button,input,select,textarea,a')) {
      return
    }

    if (!debugMode && target instanceof Element && target.closest('polygon[data-area-id]')) {
      return
    }

    const mapPoint = toMapCoordinates(event.clientX, event.clientY)
    if (!mapPoint) return

    event.preventDefault()
    containerRef.current.setPointerCapture(event.pointerId)
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (debugMode) {
      setDebugDrag({ start: mapPoint, current: mapPoint })
      return
    }

    if (pointersRef.current.size === 1) {
      dragStartRef.current = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        x: transform.x,
        y: transform.y,
      }
      pinchStartRef.current = null
    } else if (pointersRef.current.size === 2) {
      const [a, b] = Array.from(pointersRef.current.values())
      const distance = Math.hypot(a.x - b.x, a.y - b.y)
      const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const rect = containerRef.current.getBoundingClientRect()
      const localMid = { x: midpoint.x - rect.left, y: midpoint.y - rect.top }
      pinchStartRef.current = {
        distance,
        scale: transform.scale,
        mapX: (localMid.x - transform.x) / transform.scale,
        mapY: (localMid.y - transform.y) / transform.scale,
      }
      dragStartRef.current = null
    }
  }, [debugMode, toMapCoordinates, transform])

  const handlePointerMove = useCallback((event) => {
    if (!containerRef.current || !transform) return
    if (!pointersRef.current.has(event.pointerId)) return

    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const rect = containerRef.current.getBoundingClientRect()

    if (debugMode) {
      const currentPoint = toMapCoordinates(event.clientX, event.clientY)
      setDebugDrag((current) => (current && currentPoint ? { ...current, current: currentPoint } : current))
      return
    }

    if (pointersRef.current.size === 1 && dragStartRef.current) {
      const deltaX = event.clientX - dragStartRef.current.pointerX
      const deltaY = event.clientY - dragStartRef.current.pointerY
      if (Math.abs(deltaX) < PAN_THRESHOLD_PX && Math.abs(deltaY) < PAN_THRESHOLD_PX) return

      const next = {
        ...transform,
        x: dragStartRef.current.x + deltaX,
        y: dragStartRef.current.y + deltaY,
      }
      setTransform(clampTransform(next, rect))
      return
    }

    if (pointersRef.current.size === 2 && pinchStartRef.current) {
      const [a, b] = Array.from(pointersRef.current.values())
      const distance = Math.hypot(a.x - b.x, a.y - b.y)
      const midpoint = { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top }

      const minScale = computeFitTransform(rect, mapConfig).fitScale
      const maxScale = minScale * 7
      const rawScale = pinchStartRef.current.scale * (distance / pinchStartRef.current.distance)
      const nextScale = clamp(rawScale, minScale, maxScale)

      const next = {
        scale: nextScale,
        x: midpoint.x - pinchStartRef.current.mapX * nextScale,
        y: midpoint.y - pinchStartRef.current.mapY * nextScale,
      }
      setTransform(clampTransform(next, rect))
    }
  }, [clampTransform, debugMode, mapConfig, toMapCoordinates, transform])

  const handlePointerEnd = useCallback((event) => {
    if (!containerRef.current) return

    if (debugMode && debugDrag?.start && debugDrag?.current) {
      const dx = Math.abs(debugDrag.current.x - debugDrag.start.x)
      const dy = Math.abs(debugDrag.current.y - debugDrag.start.y)
      const isPoint = dx <= DEBUG_POINT_THRESHOLD && dy <= DEBUG_POINT_THRESHOLD

      if (isPoint) {
        const point = { x: Math.round(debugDrag.current.x), y: Math.round(debugDrag.current.y) }
        setDebugPoint(point)
        setDebugOutput(JSON.stringify({ point: [point.x, point.y] }))
      } else {
        const box = getBoxFromPoints(debugDrag.start, debugDrag.current)
        setDebugBox(box)
        setDebugOutput(JSON.stringify({
          topLeft: [box.topLeft.x, box.topLeft.y],
          bottomRight: [box.bottomRight.x, box.bottomRight.y],
          points: box.points,
          width: box.width,
          height: box.height,
        }))
      }

      setCopyStatus('')
      setDebugDrag(null)
      clearPointers()
      return
    }

    pointersRef.current.delete(event.pointerId)
    if (pointersRef.current.size === 0) {
      dragStartRef.current = null
      pinchStartRef.current = null
    } else if (pointersRef.current.size === 1) {
      const last = Array.from(pointersRef.current.values())[0]
      dragStartRef.current = {
        pointerX: last.x,
        pointerY: last.y,
        x: transform?.x ?? 0,
        y: transform?.y ?? 0,
      }
      pinchStartRef.current = null
    }
  }, [debugDrag, debugMode, transform])

  const handleResetView = () => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setTransform(computeFitTransform(rect, mapConfig))
  }

  const currentDebugBox = debugDrag ? getBoxFromPoints(debugDrag.start, debugDrag.current) : debugBox

  if (!transform) {
    return <div className={styles.mapShell} ref={containerRef} />
  }

  return (
    <section className={`${styles.mapShell} ${isFullscreen ? styles.mapShellFullscreen : ''}`}>
      <header className={styles.mapTopBar}>
        <div>
          <h2 className={styles.mapTitle}>{region.name} Region Map</h2>
          <p className={styles.mapMeta}>{region.game}</p>
        </div>
        <div className={styles.mapActionGroup}>
          {mapConfigs.length > 1 && (
            <div className={styles.mapSwitchGroup}>
              {mapConfigs.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={`${styles.mapSwitchButton} ${entry.id === activeMapId ? styles.mapSwitchButtonActive : ''}`}
                  onClick={() => onChangeMap(entry.id)}
                >
                  {entry.name}
                </button>
              ))}
            </div>
          )}
          <button className={styles.resetButton} type="button" onClick={handleResetView}>
            Reset View
          </button>
          <button className={styles.resetButton} type="button" onClick={onToggleFullscreen}>
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
        </div>
      </header>

      <div
        ref={containerRef}
        className={styles.mapViewport}
        onDragStart={(event) => event.preventDefault()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onPointerLeave={handlePointerEnd}
      >
        <div
          className={styles.mapCanvas}
          style={{
            width: `${mapConfig.map.width}px`,
            height: `${mapConfig.map.height}px`,
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          }}
        >
          {imageFailed ? (
            <div className={styles.mapImagePlaceholder}>
              <strong>{mapConfig.name}</strong>
              <span>Map image not found</span>
              <small>{mapConfig.map.image}</small>
            </div>
          ) : (
            <img
              src={getAssetUrl(mapConfig.map.image)}
              alt={`${region.name} map`}
              className={styles.baseMap}
              draggable={false}
              loading="lazy"
              onError={() => setImageFailed(true)}
            />
          )}

          <svg
            viewBox={`0 0 ${mapConfig.map.width} ${mapConfig.map.height}`}
            className={styles.overlaySvg}
            role="presentation"
          >
            {showPaths && (mapConfig.paths || []).map((path) => (
              <g key={path.id} className={styles.routeLabelGroup}>
                <polyline
                  points={path.points.map((point) => point.join(',')).join(' ')}
                  className={styles.pathLine}
                />
                {annotationLayouts.pathLabels.has(path.id) && (
                  <text
                    x={annotationLayouts.pathLabels.get(path.id).x}
                    y={annotationLayouts.pathLabels.get(path.id).y}
                    className={styles.pathText}
                    style={{
                      fontSize: `${annotationLayouts.pathLabels.get(path.id).fontSize}px`,
                      strokeWidth: `${annotationLayouts.pathLabels.get(path.id).strokeWidth}px`,
                    }}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {annotationLayouts.pathLabels.get(path.id).label}
                  </text>
                )}
              </g>
            ))}

            {visibleAreas.map((area) => (
              <g key={area.id}>
                <polygon
                  data-area-id={area.id}
                  points={area.points.map((point) => point.join(',')).join(' ')}
                  className={`${styles.areaPolygon} ${selectedAreaId === area.id ? styles.areaPolygonSelected : ''} ${debugMode ? styles.nonInteractiveOverlay : ''}`}
                  onPointerDown={(event) => event.stopPropagation()}
                  onPointerUp={(event) => {
                    event.stopPropagation()
                    onSelectArea(area.id)
                  }}
                  onMouseEnter={(event) => {
                    const rect = containerRef.current?.getBoundingClientRect()
                    if (!rect) return
                    setHoveredArea(area)
                    setHoverPosition({ x: event.clientX - rect.left, y: event.clientY - rect.top })
                  }}
                  onMouseMove={(event) => {
                    const rect = containerRef.current?.getBoundingClientRect()
                    if (!rect) return
                    setHoverPosition({ x: event.clientX - rect.left, y: event.clientY - rect.top })
                  }}
                  onMouseLeave={() => setHoveredArea(null)}
                />
                {annotationLayouts.areaLabels.has(area.id) && (
                  <text
                    x={annotationLayouts.areaLabels.get(area.id).x}
                    y={annotationLayouts.areaLabels.get(area.id).y}
                    className={styles.areaText}
                    style={{
                      fontSize: `${annotationLayouts.areaLabels.get(area.id).fontSize}px`,
                      strokeWidth: `${annotationLayouts.areaLabels.get(area.id).strokeWidth}px`,
                    }}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {annotationLayouts.areaLabels.get(area.id).label}
                  </text>
                )}
              </g>
            ))}

            {(mapConfig.switchTriggers || []).map((trigger) => (
              <g
                key={trigger.id}
                data-map-control="switch-trigger"
                className={debugMode ? styles.nonInteractiveOverlay : ''}
                onPointerDown={stopMapEvent}
                onPointerUp={(event) => {
                  stopMapEvent(event)
                  onChangeMap(trigger.targetMapId, trigger.targetAreaId)
                }}
                onClick={stopMapEvent}
              >
                <polygon
                  points={trigger.points.map((point) => point.join(',')).join(' ')}
                  className={styles.switchPolygon}
                />
                {trigger.label && knownPokemonNames.has(normalizePokemonLabel(trigger.label)) ? (
                  <foreignObject
                    x={centerOfPoints(trigger.points).x - switchSpriteVisualScale.size / 2}
                    y={centerOfPoints(trigger.points).y - switchSpriteVisualScale.size / 2}
                    width={switchSpriteVisualScale.size}
                    height={switchSpriteVisualScale.size}
                    className={styles.switchSpriteObject}
                  >
                    <img
                      className={styles.switchSprite}
                      src={getLocalPokemonGif(trigger.label)}
                      alt={trigger.label}
                      title={trigger.label}
                      draggable={false}
                      onError={onGifError(trigger.label)}
                    />
                  </foreignObject>
                ) : trigger.label && (
                  <text
                    x={centerOfPoints(trigger.points).x}
                    y={centerOfPoints(trigger.points).y}
                    className={styles.switchText}
                    style={{
                      fontSize: `${switchLabelVisualScale.fontSize}px`,
                      strokeWidth: `${switchLabelVisualScale.strokeWidth}px`,
                    }}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {trigger.label}
                  </text>
                )}
              </g>
            ))}

            {showMarkers && annotationLayouts.markerLayouts.map((marker) => (
              <g key={marker.id} className={styles.poiGroup}>
                <circle cx={marker.x} cy={marker.y} r={marker.radius} className={styles.poiDot} />
                <text
                  x={marker.labelX}
                  y={marker.labelY}
                  className={styles.poiText}
                  style={{ fontSize: `${marker.fontSize}px`, strokeWidth: `${marker.strokeWidth}px` }}
                  dominantBaseline="hanging"
                >
                  {marker.label}
                </text>
              </g>
            ))}

            {debugPoint && debugMode && (
              <circle
                data-debug-overlay="point"
                cx={debugPoint.x}
                cy={debugPoint.y}
                r={Math.max(3, Math.round(mapConfig.map.width / 320))}
                className={styles.debugPoint}
                onPointerDown={stopMapEvent}
                onPointerUp={stopMapEvent}
                onClick={stopMapEvent}
              />
            )}

            {currentDebugBox && debugMode && (
              <rect
                data-debug-overlay="box"
                x={currentDebugBox.topLeft.x}
                y={currentDebugBox.topLeft.y}
                width={currentDebugBox.width}
                height={currentDebugBox.height}
                className={styles.debugRect}
                onPointerDown={stopMapEvent}
                onPointerUp={stopMapEvent}
                onClick={stopMapEvent}
              />
            )}
          </svg>
        </div>

        {hoveredArea && !debugMode && (
          <div className={styles.mapTooltip} style={{ left: hoverPosition.x + 12, top: hoverPosition.y + 12 }}>
            <strong>{hoveredArea.name}</strong>
            <span>{(hoveredArea.spawns || []).length} configured spawns</span>
          </div>
        )}

        {debugMode && (
          <div
            className={styles.debugPanel}
            data-debug-overlay="panel"
            onPointerDown={containMapEvent}
            onPointerUp={containMapEvent}
            onClick={containMapEvent}
          >
            <strong>Debug Coordinates</strong>
            <span>Click for point capture, drag for area box capture.</span>

            {debugPoint && <span>Point: [{debugPoint.x}, {debugPoint.y}]</span>}
            {currentDebugBox && (
              <>
                <span>Top-Left: [{currentDebugBox.topLeft.x}, {currentDebugBox.topLeft.y}]</span>
                <span>Bottom-Right: [{currentDebugBox.bottomRight.x}, {currentDebugBox.bottomRight.y}]</span>
                <span>Size: {currentDebugBox.width} x {currentDebugBox.height}</span>
              </>
            )}

            <div className={styles.debugButtonRow}>
              <button type="button" className={styles.resetButton} onClick={copyPointCoordinates} disabled={!debugPoint}>
                Copy Point JSON
              </button>
              <button type="button" className={styles.resetButton} onClick={copyBoxCoordinates} disabled={!debugBox}>
                Copy Box JSON
              </button>
            </div>

            <textarea
              ref={debugTextRef}
              className={styles.debugOutput}
              value={debugOutput}
              readOnly
              placeholder="Captured JSON will appear here."
            />

            {copyStatus && <span className={styles.debugStatus}>{copyStatus}</span>}
          </div>
        )}
      </div>
    </section>
  )
}
