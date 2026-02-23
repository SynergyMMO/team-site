import { useState, useRef, useEffect } from 'react'
import styles from './SearchBar.module.css'

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search for a player...',
  suggestions = [],
  onSuggestionSelect
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  const filteredSuggestions = value.trim() && suggestions.length > 0
    ? suggestions
        .filter(s => s.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 8)
    : []

  const showDropdown = isOpen && filteredSuggestions.length > 0

  // Reset active index when the suggestion list changes
  useEffect(() => {
    setActiveIndex(-1)
  }, [value])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSuggestionClick = (suggestion) => {
    onChange(suggestion)
    setIsOpen(false)
    setActiveIndex(-1)
    if (onSuggestionSelect) onSuggestionSelect(suggestion)
  }

  const handleKeyDown = (e) => {
    if (!showDropdown) {
      if (e.key === 'Escape') setIsOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, filteredSuggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0) {
        e.preventDefault()
        handleSuggestionClick(filteredSuggestions[activeIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setActiveIndex(-1)
    }
  }

  return (
    <div className={styles.searchBarContainer}>
      <div
        className={`${styles.searchBar} ${showDropdown ? styles.searchBarOpen : ''}`}
        ref={containerRef}
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => {
            onChange(e.target.value)
            setIsOpen(e.target.value.trim().length > 0)
          }}
          onFocus={() => {
            if (value.trim() && filteredSuggestions.length > 0) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          placeholder={placeholder}
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          role="combobox"
        />
        {showDropdown && (
          <ul className={styles.suggestionsList} role="listbox">
            {filteredSuggestions.map((suggestion, idx) => (
              <li
                key={idx}
                className={`${styles.suggestionItem} ${idx === activeIndex ? styles.suggestionItemActive : ''}`}
                onClick={() => handleSuggestionClick(suggestion)}
                role="option"
                aria-selected={idx === activeIndex}
                tabIndex={-1}
              >
                {suggestion}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
