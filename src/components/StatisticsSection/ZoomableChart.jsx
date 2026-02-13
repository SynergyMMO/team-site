import { useState, useRef, useEffect, useCallback } from 'react'
import styles from './ZoomableChart.module.css'

export default function ZoomableChart({ children }) {
  const containerRef = useRef(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  
  // Use refs to track state during events without causing re-renders
  const stateRef = useRef({ zoom: 1, pan: { x: 0, y: 0 }, isPanning: false, panStart: { x: 0, y: 0 }, isTouchZooming: false, touchDistance: 0, touchStartZoom: 1 })

  // Update refs whenever state changes
  useEffect(() => {
    stateRef.current.zoom = zoom
    stateRef.current.pan = pan
  }, [zoom, pan])

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e) => {
    if (!containerRef.current) return
    e.preventDefault()

    const rect = containerRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const currentZoom = stateRef.current.zoom
    const currentPan = stateRef.current.pan

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(1, Math.min(10, currentZoom * zoomFactor))

    // Adjust pan to zoom towards mouse cursor
    const zoomDiff = newZoom - currentZoom
    setPan({
      x: currentPan.x - (mouseX / currentZoom) * (zoomDiff / newZoom),
      y: currentPan.y - (mouseY / currentZoom) * (zoomDiff / newZoom),
    })
    setZoom(newZoom)
  }, [])

  // Handle mouse pan (left click)
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return // Left mouse button
    stateRef.current.isPanning = true
    const currentPan = stateRef.current.pan
    const currentZoom = stateRef.current.zoom
    stateRef.current.panStart = { x: e.clientX - (currentPan.x / currentZoom), y: e.clientY - (currentPan.y / currentZoom) }
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!stateRef.current.isPanning) return
    const panStart = stateRef.current.panStart
    const currentZoom = stateRef.current.zoom
    setPan({
      x: (e.clientX - panStart.x) * currentZoom,
      y: (e.clientY - panStart.y) * currentZoom,
    })
  }, [])

  const handleMouseUp = useCallback(() => {
    stateRef.current.isPanning = false
  }, [])

  // Touch zoom (pinch) and pan (single finger)
  const getTouchDistance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      // Pinch zoom
      stateRef.current.isTouchZooming = true
      stateRef.current.touchDistance = getTouchDistance(e.touches)
      stateRef.current.touchStartZoom = stateRef.current.zoom
    } else if (e.touches.length === 1) {
      // Single finger panning
      stateRef.current.isPanning = true
      const currentPan = stateRef.current.pan
      const currentZoom = stateRef.current.zoom
      stateRef.current.panStart = { x: e.touches[0].clientX - (currentPan.x / currentZoom), y: e.touches[0].clientY - (currentPan.y / currentZoom) }
    }
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && stateRef.current.isTouchZooming && stateRef.current.touchDistance > 0) {
      // Pinch zoom
      e.preventDefault()
      const currentDistance = getTouchDistance(e.touches)
      // Calculate ratio from the start of the pinch gesture (not incremental)
      const zoomRatio = currentDistance / stateRef.current.touchDistance
      // Apply 10x faster zoom: 3 -> 30
      const dampedRatio = 1 + (zoomRatio - 1) * 30
      // Always calculate from the zoom level at pinch start, not current zoom
      const baseZoom = stateRef.current.touchStartZoom
      const newZoom = Math.max(1, Math.min(10, baseZoom * dampedRatio))
      setZoom(newZoom)
    } else if (e.touches.length === 1 && stateRef.current.isPanning) {
      // Single finger pan
      e.preventDefault()
      const panStart = stateRef.current.panStart
      const currentZoom = stateRef.current.zoom
      setPan({
        x: (e.touches[0].clientX - panStart.x) * currentZoom,
        y: (e.touches[0].clientY - panStart.y) * currentZoom,
      })
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    stateRef.current.isPanning = false
    stateRef.current.isTouchZooming = false
    stateRef.current.touchDistance = 0
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    el.addEventListener('wheel', handleWheel, { passive: false })
    el.addEventListener('mousedown', handleMouseDown)
    el.addEventListener('mousemove', handleMouseMove)
    el.addEventListener('mouseup', handleMouseUp)
    el.addEventListener('mouseleave', handleMouseUp)
    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('wheel', handleWheel)
      el.removeEventListener('mousedown', handleMouseDown)
      el.removeEventListener('mousemove', handleMouseMove)
      el.removeEventListener('mouseup', handleMouseUp)
      el.removeEventListener('mouseleave', handleMouseUp)
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleWheel, handleMouseDown, handleMouseMove, handleMouseUp, handleTouchStart, handleTouchMove, handleTouchEnd])

  return (
    <div className={styles.zoomableContainer} ref={containerRef}>
      <div
        className={styles.zoomableContent}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          cursor: stateRef.current.isPanning ? 'grabbing' : 'grab',
        }}
      >
        {children}
      </div>
      <div className={styles.zoomControls}>
        <button
          className={styles.zoomButton}
          onClick={() => setZoom(Math.max(1, zoom - 0.2))}
          title="Zoom Out"
        >
          −
        </button>
        <span className={styles.zoomLevel}>{Math.round(zoom * 100)}%</span>
        <button
          className={styles.zoomButton}
          onClick={() => setZoom(Math.min(10, zoom + 0.2))}
          title="Zoom In"
        >
          +
        </button>
        <button
          className={styles.zoomButton}
          onClick={() => {
            setZoom(1)
            setPan({ x: 0, y: 0 })
          }}
          title="Reset"
        >
          ↺
        </button>
        <button
          className={styles.zoomButton}
          onClick={() => {
            const elem = containerRef.current
            if (!elem) return
            
            // Request fullscreen
            if (elem.requestFullscreen) {
              elem.requestFullscreen().catch(() => {})
            } else if (elem.webkitRequestFullscreen) {
              elem.webkitRequestFullscreen()
            }
            
            // Try to request landscape orientation
            if (screen.orientation && screen.orientation.lock) {
              screen.orientation.lock('landscape').catch(() => {})
            }
          }}
          title="Fullscreen (Landscape)"
        >
          ⛶
        </button>
      </div>
      <div className={styles.zoomHint}>
        Scroll to zoom • Drag to pan • Pinch to zoom
      </div>
    </div>
  )
}
