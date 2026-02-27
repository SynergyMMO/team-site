import { useState, useRef, useEffect } from 'react'
import styles from './HoverTooltip.module.css'

export default function HoverTooltip({ children, content }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })
  const containerRef = useRef(null)
  const isOverRef = useRef(false)
  const hideTimeout = useRef(null)

  const handleEnter = () => {
    isOverRef.current = true
    if (hideTimeout.current) clearTimeout(hideTimeout.current)
    setShowTooltip(true)
  }

  const handleLeave = () => {
    isOverRef.current = false
    hideTimeout.current = setTimeout(() => {
      if (!isOverRef.current) setShowTooltip(false)
    }, 120)
  }

  useEffect(() => {
    if (showTooltip && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setTooltipPos({
        top: rect.top + window.scrollY,
        left: rect.left + rect.width / 2 + window.scrollX,
      })
    }
  }, [showTooltip])

  return (
    <div
      className={styles.tooltipContainer}
      ref={containerRef}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {children}
      {showTooltip && (
        <div
          className={styles.tooltip}
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
            transform: 'translate(-50%, -100%)',
          }}
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        >
          {content}
          <div className={styles.tooltipArrow} />
        </div>
      )}
    </div>
  )
}
