import { useReducer, useEffect, useMemo } from 'react'
import Autocomplete from './Autocomplete'
import pokemonData from '../../../data/pokemmo_data/pokemon-data.json'




const MONTHS = [ 'January','February','March','April','May','June','July','August','September','October','November','December']
const YEARS = ['2025','2026','2027','2028','2029','2030']
const ENCOUNTER_TYPES = ['5x Horde','3x Horde','Single','Fishing','Honey Tree','Egg','Safari','Fossil','Swarm','Gift']
const NATURES = [ 'Adamant','Bashful','Bold','Brave','Calm','Careful','Docile','Gentle','Hardy','Hasty','Impish','Jolly','Lax','Lonely','Mild','Modest','Naive','Naughty','Quiet','Quirky','Rash','Relaxed','Sassy','Serious','Timid']
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

const POKEMON_KEY_MAP = {}
Object.keys(pokemonData).forEach(key => {
  POKEMON_KEY_MAP[key] = key
  POKEMON_KEY_MAP[key.replace(/-/g, ' ')] = key
  POKEMON_KEY_MAP[key.replace(/-/g, '')] = key
})
function lookupEncounters(name) {
  if (!name) return []
  const n = name.toLowerCase().trim()
  const key = POKEMON_KEY_MAP[n] || POKEMON_KEY_MAP[n.replace(/\s+/g,'-')] || POKEMON_KEY_MAP[n.replace(/[^a-z0-9]/g,'')]
  return key ? (pokemonData[key]?.location_area_encounters || []) : []
}

// Default state
function getDefaultState() {
  return {
    Pokemon: '',
    Month: '',
    Year: '',
    'Encounter Type': '',
    Location: '',
    'Encounter Count': '',
    date_caught: null,
    nature: '',
    ivs: '',
    nickname: '',
    variant: '',
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

function reducer(state, action) {
  switch(action.type){
    case 'SET_FIELD': return { ...state, [action.field]: action.value }
    case 'RESET': return getDefaultState()
    case 'LOAD':
      const normalizedDate = action.data?.date_caught ? action.data.date_caught.split('T')[0] : null
      return { ...getDefaultState(), ...action.data, date_caught: normalizedDate }
    default: return state
  }
}

export default function ShinyForm({ initialData, onSubmit, submitLabel='Add', allPokemonNames=[], isMutating=false }) {
  const [form, dispatch] = useReducer(reducer, initialData || getDefaultState())

  useEffect(() => { if(initialData) dispatch({ type:'LOAD', data:initialData }) }, [initialData])

  useEffect(() => {
    const listener = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      }
    }
    document.addEventListener('keydown', listener)
    return () => document.removeEventListener('keydown', listener)
  }, [form])

  const encounters = useMemo(() => lookupEncounters(form.Pokemon), [form.Pokemon])
  const locationOptions = useMemo(() => {
    const seen = new Set()
    encounters.forEach(e => { if(e.location && e.region_name) seen.add(`${e.location} (${e.region_name})`) })
    return Array.from(seen).sort()
  }, [encounters])

  const handlePokemonChange = val => {
    dispatch({ type:'SET_FIELD', field:'Pokemon', value:val })
    dispatch({ type:'SET_FIELD', field:'Location', value:'' })
  }
  const handleLocationChange = val => dispatch({ type:'SET_FIELD', field:'Location', value:val })
  const handleDateCaughtChange = val => {
    dispatch({ type:'SET_FIELD', field:'date_caught', value:val })
    if(val){
      const [year, month] = val.split('-')
      dispatch({ type:'SET_FIELD', field:'Month', value:MONTHS[parseInt(month,10)-1] })
      dispatch({ type:'SET_FIELD', field:'Year', value:year })
    } else {
      dispatch({ type:'SET_FIELD', field:'Month', value:'' })
      dispatch({ type:'SET_FIELD', field:'Year', value:'' })
    }
  }


  const handleSubmit = (e) => {
    if(e) e.preventDefault()
    if(!form.Pokemon.trim()) return
    const cleaned = { ...form, Month: form.Month || null, Year: form.Year || null, date_caught: form.date_caught || null }
    onSubmit(cleaned)
  }

  const handleKeyDown = (e) => {
    if(e.key === 'Enter') {
      const tag = e.target.tagName.toLowerCase()
      console.log('KeyDown:', { key: e.key, tag, classList: e.target.classList })
      if(tag !== 'textarea' && !e.target.classList.contains('autocomplete-input')) {
        e.preventDefault()
        handleSubmit()
      }
    }
  }



  const handleReset = () => dispatch({ type:'RESET' })

  const formatIVs = raw => raw

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
      <label>Pokemon Name:</label>
      <Autocomplete
        id="shinyFormPokemon"
        value={form.Pokemon}
        className="autocomplete-input"
        onChange={handlePokemonChange}
        getOptions={() => allPokemonNames}
        placeholder="mew"
      />

      <label>Encounter Type:</label>
      <select value={form['Encounter Type']} onChange={e=>dispatch({ type:'SET_FIELD', field:'Encounter Type', value:e.target.value })}>
        <option value="">Select a method</option>
        {ENCOUNTER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      <label>Location:</label>
      {locationOptions.length > 0 ? (
        <select value={form.Location} onChange={e=>handleLocationChange(e.target.value)}>
          <option value="">Select a location</option>
          {locationOptions.map(loc => <option key={loc} value={loc}>{loc}</option>)}
        </select>
      ) : (
        <input type="text" value={form.Location} onChange={e=>handleLocationChange(e.target.value)} placeholder="Enter location" />
      )}

      <label>Encounter Count:</label>
      <input type="number" min="0" value={form['Encounter Count']} onChange={e=>dispatch({ type:'SET_FIELD', field:'Encounter Count', value:e.target.value })} placeholder="e.g. 3240" />

      <label>Month:</label>
      <select value={form.Month||''} onChange={e=>dispatch({ type:'SET_FIELD', field:'Month', value:e.target.value })}>
        <option value="">Select month</option>
        {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
      </select>

      <label>Year:</label>
      <select value={form.Year||''} onChange={e=>dispatch({ type:'SET_FIELD', field:'Year', value:e.target.value })}>
        <option value="">Select year</option>
        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
      </select>

      <label>Date Caught:</label>
      <input type="date" value={form.date_caught||''} onChange={e=>handleDateCaughtChange(e.target.value)} />

      <label>Nature:</label>
      <select value={form.nature} onChange={e=>dispatch({ type:'SET_FIELD', field:'nature', value:e.target.value })}>
        <option value="">Select a nature</option>
        {NATURES.map(n => <option key={n} value={n}>{n}</option>)}
      </select>

      <label>IVs:</label>
      <input type="text" value={form.ivs} onChange={e=>dispatch({ type:'SET_FIELD', field:'ivs', value:formatIVs(e.target.value) })} placeholder="31/31/31/31/31/31" maxLength={17} />

      <label>Nickname:</label>
      <input type="text" value={form.nickname} onChange={e=>dispatch({ type:'SET_FIELD', field:'nickname', value:e.target.value })} placeholder="Optional nickname" />

      <label>Variant:</label>
      <input type="text" value={form.variant} onChange={e=>dispatch({ type:'SET_FIELD', field:'variant', value:e.target.value })} placeholder="Optional variant" />

      {YES_NO_FIELDS.map(({key,label})=>(
        <div key={key}>
          <label>{label}:</label>
          <select value={form[key]} onChange={e=>dispatch({ type:'SET_FIELD', field:key, value:e.target.value })}>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
      ))}

      <label>Reaction Link:</label>
      <input type="text" value={form['Reaction Link']} onChange={e=>dispatch({ type:'SET_FIELD', field:'Reaction Link', value:e.target.value })} placeholder="Optional URL" />

      <div style={{ display:'flex', gap:10, marginTop:16 }}>
        <button type="submit" disabled={isMutating || !form.Pokemon.trim()}>{isMutating ? 'Saving...' : submitLabel}</button>
        <button type="button" onClick={() => dispatch({ type:'RESET' })} style={{ backgroundColor:'#555' }}>Reset</button>
      </div>
    </form>
  )
}

export { getDefaultState }
