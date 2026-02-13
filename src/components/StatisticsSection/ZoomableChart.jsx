import { useState, useRef, useEffect } from 'react'
import styles from './ZoomableChart.module.css'

export default function ZoomableChart({ children }) {
  const containerRef = useRef(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  // Handle mouse wheel zoom
  const handleWheel = (e) => {
    if (!containerRef.current) return
    e.preventDefault()

    const rect = containerRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(1, Math.min(10, zoom * zoomFactor))

    // Adjust pan to zoom towards mouse cursor
    const zoomDiff = newZoom - zoom
    setPan({
      x: pan.x - (mouseX / zoom) * (zoomDiff / newZoom),
      y: pan.y - (mouseY / zoom) * (zoomDiff / newZoom),
    })
    setZoom(newZoom)
  }

  // Handle mouse pan (left click)
  const handleMouseDown = (e) => {
    if (e.button !== 0) return // Left mouse button
    setIsPanning(true)
    setPanStart({ x: e.clientX - pan.x * zoom, y: e.clientY - pan.y * zoom })
  }

  const handleMouseMove = (e) => {
    if (!isPanning) return
    setPan({
      x: (e.clientX - panStart.x) / zoom,
      y: (e.clientY - panStart.y) / zoom,
    })
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  // Touch zoom (pinch)
  const [touchDistance, setTouchDistance] = useState(0)
  const [touchZoom, setTouchZoom] = useState(1)

  const getTouchDistance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      setTouchDistance(getTouchDistance(e.touches))
      setTouchZoom(zoom)
    }
  }

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && touchDistance > 0) {
      const currentDistance = getTouchDistance(e.touches)
      const zoomRatio = currentDistance / touchDistance
      const newZoom = Math.max(1, Math.min(10, touchZoom * zoomRatio))
      setZoom(newZoom)
    }
  }

  useEffect(() => {
    if (!containerRef.current) return

    containerRef.current.addEventListener('wheel', handleWheel, { passive: false })
    containerRef.current.addEventListener('mousedown', handleMouseDown)
    containerRef.current.addEventListener('mousemove', handleMouseMove)
    containerRef.current.addEventListener('mouseup', handleMouseUp)
    containerRef.current.addEventListener('mouseleave', handleMouseUp)
    containerRef.current.addEventListener('touchstart', handleTouchStart)
    containerRef.current.addEventListener('touchmove', handleTouchMove)

    return () => {
      const el = containerRef.current
      if (!el) return
      el.removeEventListener('wheel', handleWheel)
      el.removeEventListener('mousedown', handleMouseDown)
      el.removeEventListener('mousemove', handleMouseMove)
      el.removeEventListener('mouseup', handleMouseUp)
      el.removeEventListener('mouseleave', handleMouseUp)
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
    }
  }, [zoom, pan, isPanning, panStart, touchDistance, touchZoom])

  return (
    <div className={styles.zoomableContainer} ref={containerRef}>
      <div
        className={styles.zoomableContent}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          cursor: isPanning ? 'grabbing' : 'grab',
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
      </div>
      <div className={styles.zoomHint}>
        Scroll to zoom • Left-click + drag to pan • Pinch to zoom
      </div>
    </div>
  )
}
