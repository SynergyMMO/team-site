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
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  // Calculate filtered suggestions directly, no state needed
  const filteredSuggestions = value.trim() && suggestions.length > 0
    ? suggestions
        .filter(s => s.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 8)
    : []

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSuggestionClick = (suggestion) => {
    onChange(suggestion)
    setIsOpen(false)
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion)
    }
  }

  return (
    <div className={styles.searchBarContainer} ref={containerRef}>
      <div className={styles.searchBar}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => {
            onChange(e.target.value)
            setIsOpen(e.target.value.trim().length > 0)
          }}
          onFocus={() => {
            if (value.trim() && filteredSuggestions.length > 0) {
              setIsOpen(true)
            }
          }}
          autoComplete="off"
          placeholder={placeholder}
        />
      </div>
      {isOpen && filteredSuggestions.length > 0 && (
        <ul className={styles.suggestionsList} role="listbox">
          {filteredSuggestions.map((suggestion, idx) => (
            <li
              key={idx}
              className={styles.suggestionItem}
              onClick={() => handleSuggestionClick(suggestion)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleSuggestionClick(suggestion)
              }}
              role="option"
              tabIndex={0}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
