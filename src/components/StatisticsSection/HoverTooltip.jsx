import { useState, useRef, useEffect } from 'react'
import styles from './HoverTooltip.module.css'

export default function HoverTooltip({ content, children }) {
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })
  const containerRef = useRef(null)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    if (!showTooltip || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    setTooltipPos({
      top: rect.top - 10,
      left: rect.left + rect.width / 2,
    })
  }, [showTooltip])

  return (
    <div
      className={styles.tooltipContainer}
      ref={containerRef}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
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
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {content}
          <div className={styles.tooltipArrow} />
        </div>
      )}
    </div>
  )
}
