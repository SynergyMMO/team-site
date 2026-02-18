import { useReducer, useEffect, useMemo } from 'react'
import Autocomplete from './Autocomplete'
import pokemonData from '../../../data/pokemmo_data/pokemon-data.json'

// Build lookup map at module level for fast name resolution
const POKEMON_KEY_MAP = {}
Object.keys(pokemonData).forEach(key => {
  POKEMON_KEY_MAP[key] = key                     // exact: "bulbasaur"
  POKEMON_KEY_MAP[key.replace(/-/g, ' ')] = key  // spaces: "mr mime"
  POKEMON_KEY_MAP[key.replace(/-/g, '')] = key   // joined: "mrmime"
})

function lookupEncounters(name) {
  if (!name) return []
  const n = name.toLowerCase().trim()
  const key = POKEMON_KEY_MAP[n]
    || POKEMON_KEY_MAP[n.replace(/\s+/g, '-')]
    || POKEMON_KEY_MAP[n.replace(/[^a-z0-9]/g, '')]
  return key ? (pokemonData[key]?.location_area_encounters || []) : []
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const YEARS = [
  '2013', '2014', '2015', '2016', '2017', '2018', '2019',
  '2020', '2021', '2022', '2023', '2024', '2025', '2026',
  '2027', '2028', '2029', '2030',
]

const ENCOUNTER_TYPES = ['5x Horde', '3x Horde', 'Single', 'Fishing', 'Honey Tree', 'Egg', 'Safari', 'Fossil', 'Swarm', 'Gift']

const YES_NO_FIELDS = [
  { key: 'Egg', label: 'Egg' },
  { key: 'Favourite', label: 'Favourite' },
  { key: 'Secret Shiny', label: 'Secret Shiny' },
  { key: 'Alpha', label: 'Alpha' },
  { key: 'Sold', label: 'Sold' },
  { key: 'Event', label: 'Event' },
  { key: 'Reaction', label: 'Reaction' },
  { key: 'MysteriousBall', label: 'Mysterious Ball' },
  { key: 'Safari', label: 'Safari' },
  { key: 'Honey Tree', label: 'Honey Tree' },
  { key: 'Legendary', label: 'Legendary' },
]

const now = new Date()
const currentMonth = MONTHS[now.getMonth()]
const currentYear = String(now.getFullYear())

function getDefaultState() {
  return {
    Pokemon: '',
    Month: currentMonth,
    Year: currentYear,
    'Encounter Type': '',
    Location: '',
    'Encounter Count': '',
    Egg: 'No',
    Favourite: 'No',
    'Secret Shiny': 'No',
    Alpha: 'No',
    Sold: 'No',
    Event: 'No',
    Reaction: 'No',
    MysteriousBall: 'No',
    Safari: 'No',
    'Honey Tree': 'No',
    Legendary: 'No',
    'Reaction Link': '',
  }
}

function getEditState(data) {
  const base = getDefaultState()
  base.Month = ''
  base.Year = ''
  return { ...base, ...data }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value }
    case 'RESET':
      return getDefaultState()
    case 'LOAD':
      return getEditState(action.data)
    default:
      return state
  }
}

export default function ShinyForm({ initialData, onSubmit, submitLabel = 'Add', allPokemonNames = [], isMutating = false, isEditMode = false }) {
  const [form, dispatch] = useReducer(reducer, initialData || getDefaultState())

  useEffect(() => {
    if (initialData) dispatch({ type: 'LOAD', data: initialData })
  }, [initialData])

  // Derive location options from the selected Pokemon's encounter data
  const encounters = useMemo(() => lookupEncounters(form.Pokemon), [form.Pokemon])

  const locationOptions = useMemo(() => {
    const seen = new Set()
    encounters.forEach(e => {
      if (e.location && e.region_name) seen.add(`${e.location} (${e.region_name})`)
    })
    return Array.from(seen).sort()
  }, [encounters])

  function handlePokemonChange(val) {
    dispatch({ type: 'SET_FIELD', field: 'Pokemon', value: val })
    dispatch({ type: 'SET_FIELD', field: 'Location', value: '' })
  }

  function handleLocationChange(val) {
    dispatch({ type: 'SET_FIELD', field: 'Location', value: val })
  }

  function handleSubmit() {
    if (!form.Pokemon.trim()) return
    onSubmit({ ...form })
  }

  function handleReset() {
    dispatch({ type: 'RESET' })
  }

  return (
    <div>
      <label>Pokemon Name:</label>
      <Autocomplete
        id="shinyFormPokemon"
        value={form.Pokemon}
        onChange={handlePokemonChange}
        getOptions={() => allPokemonNames}
        placeholder="mew"
      />

      <label htmlFor="shinyMonth">Month:</label>
      <select id="shinyMonth" value={form.Month} onChange={e => dispatch({ type: 'SET_FIELD', field: 'Month', value: e.target.value })}>
        <option value="">--</option>
        {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
      </select>

      <label htmlFor="shinyYear">Year:</label>
      <select id="shinyYear" value={form.Year} onChange={e => dispatch({ type: 'SET_FIELD', field: 'Year', value: e.target.value })}>
        <option value="">--</option>
        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
      </select>

      <label htmlFor="shinyEncounterType">Encounter Type:</label>
      <select
        id="shinyEncounterType"
        value={form['Encounter Type']}
        onChange={e => dispatch({ type: 'SET_FIELD', field: 'Encounter Type', value: e.target.value })}
      >
        <option value="">Select a method</option>
        {ENCOUNTER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      <label htmlFor="shinyLocation">Location:</label>
      {locationOptions.length > 0 ? (
        <select
          id="shinyLocation"
          value={form.Location}
          onChange={e => handleLocationChange(e.target.value)}
        >
          <option value="">Select a location</option>
          {locationOptions.map(loc => <option key={loc} value={loc}>{loc}</option>)}
        </select>
      ) : (
        <input
          id="shinyLocation"
          type="text"
          value={form.Location}
          onChange={e => handleLocationChange(e.target.value)}
          placeholder="Enter location"
        />
      )}

      <label htmlFor="shinyEncounterCount">Encounter Count:</label>
      <input
        id="shinyEncounterCount"
        type="number"
        min="0"
        value={form['Encounter Count']}
        onChange={e => dispatch({ type: 'SET_FIELD', field: 'Encounter Count', value: e.target.value })}
        placeholder="e.g. 3240"
      />

      {YES_NO_FIELDS.map(({ key, label }) => (
        <div key={key}>
          <label htmlFor={`shiny_${key}`}>{label}:</label>
          <select
            id={`shiny_${key}`}
            value={form[key]}
            onChange={e => dispatch({ type: 'SET_FIELD', field: key, value: e.target.value })}
          >
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
      ))}

      <label>Reaction Link:</label>
      <input
        type="text"
        value={form['Reaction Link']}
        onChange={e => dispatch({ type: 'SET_FIELD', field: 'Reaction Link', value: e.target.value })}
        placeholder="Optional URL"
      />

      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button onClick={handleSubmit} disabled={isMutating || !form.Pokemon.trim()}>
          {isMutating ? 'Saving...' : submitLabel}
        </button>
        <button onClick={handleReset} type="button" style={{ backgroundColor: '#555' }}>
          Reset
        </button>
      </div>
    </div>
  )
}

export { getDefaultState }
