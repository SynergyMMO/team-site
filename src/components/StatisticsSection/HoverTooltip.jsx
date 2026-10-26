import { useState, useRef, useLayoutEffect } from 'react'
import styles from './HoverTooltip.module.css'

export default function HoverTooltip({ children, content }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPos, setTooltipPos] = useState(null)
  const containerRef = useRef(null)
  const tooltipRef = useRef(null)
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

  useLayoutEffect(() => {
    if (!showTooltip) {
      setTooltipPos(null)
      return
    }

    const updateTooltipPosition = () => {
      if (!containerRef.current || !tooltipRef.current) return

      const triggerRect = containerRef.current.getBoundingClientRect()
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      const spaceAbove = triggerRect.top
      const spaceBelow = window.innerHeight - triggerRect.bottom
      const placeAbove = spaceAbove >= tooltipRect.height + 8 || spaceBelow < tooltipRect.height + 8
      const maxTop = Math.max(8, window.innerHeight - tooltipRect.height - 8)
      const top = placeAbove
        ? Math.max(8, triggerRect.top - tooltipRect.height - 8)
        : Math.min(triggerRect.bottom + 8, maxTop)
      const center = triggerRect.left + triggerRect.width / 2
      const halfWidth = tooltipRect.width / 2
      const left = Math.min(
        Math.max(center, halfWidth + 8),
        window.innerWidth - halfWidth - 8
      )

      setTooltipPos({ top, left, placement: placeAbove ? 'above' : 'below' })
    }

    updateTooltipPosition()
    window.addEventListener('resize', updateTooltipPosition)
    window.addEventListener('scroll', updateTooltipPosition, true)

    return () => {
      window.removeEventListener('resize', updateTooltipPosition)
      window.removeEventListener('scroll', updateTooltipPosition, true)
    }
  }, [showTooltip, content])

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
          ref={tooltipRef}
          style={{
            top: tooltipPos?.top ?? 0,
            left: tooltipPos?.left ?? 0,
            transform: 'translateX(-50%)',
            visibility: tooltipPos ? 'visible' : 'hidden',
          }}
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        >
          {content}
          <div
            className={`${styles.tooltipArrow} ${tooltipPos?.placement === 'below' ? styles.tooltipArrowUp : ''}`}
          />
        </div>
      )}
    </div>
  )
}
