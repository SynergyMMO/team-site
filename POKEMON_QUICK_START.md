# Quick Start: Pokémon Detail Feature Integration

## For Developers: Add Clickable Pokémon to Your Page

Follow these steps to add the Pokémon detail feature to any page in your project.

### Step 1: Use ShinyItem Component (Easiest)

If your page already uses the `ShinyItem` component, **you're done!** Pokémon GIFs are automatically clickable.

```jsx
import ShinyItem from '../../components/ShinyItem/ShinyItem'

function MyPage() {
  return (
    <div>
      {shinies.map(shiny => (
        <ShinyItem
          key={shiny.Pokemon}
          shiny={shiny}
          points={points}
          userName={userName}
        />
      ))}
    </div>
  )
}
```

### Step 2: Custom Pokémon Component

If you have a custom component for displaying Pokémon:

```jsx
import { useNavigate } from 'react-router-dom'
import styles from './MyComponent.module.css'

function MyPokemonComponent({ pokemon }) {
  const navigate = useNavigate()

  const handlePokemonClick = (name) => {
    navigate(`/pokemon/${name.toLowerCase()}`)
  }

  return (
    <div className={styles.pokemonCard}>
      <img
        src={pokemon.imageUrl}
        alt={pokemon.name}
        onClick={() => handlePokemonClick(pokemon.name)}
        className={styles.pokemonImage}
        style={{ cursor: 'pointer' }}
      />
      <p>{pokemon.name}</p>
    </div>
  )
}

export default MyPokemonComponent
```

### Step 3: Display Pokémon Info Inline

Don't want to navigate? Display info directly on your page:

```jsx
import { usePokemonDetails } from '../../hooks/usePokemonDetails'

function DetailedPokemonCard({ pokemonName }) {
  const { data, isLoading, error } = usePokemonDetails(pokemonName)

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div style={{ padding: '1rem', border: '1px solid #ccc' }}>
      <h2>{data.displayName}</h2>
      <p><strong>Type:</strong> {data.types.join(', ')}</p>
      <p><strong>Height:</strong> {data.height}m</p>
      <p><strong>Weight:</strong> {data.weight}kg</p>
      <p>{data.description}</p>
    </div>
  )
}

export default DetailedPokemonCard
```

### Step 4: Advanced - Custom Hook Usage

For more complex use cases:

```jsx
import { usePokemonDetails } from '../../hooks/usePokemonDetails'

function PokemonStats({ pokemonName }) {
  const { data: pokemon, isLoading, error } = usePokemonDetails(pokemonName)

  if (isLoading) return null

  return (
    <table>
      <tbody>
        <tr>
          <td>HP</td>
          <td>{pokemon.stats.hp}</td>
        </tr>
        <tr>
          <td>Attack</td>
          <td>{pokemon.stats.attack}</td>
        </tr>
        <tr>
          <td>Defense</td>
          <td>{pokemon.stats.defense}</td>
        </tr>
        <tr>
          <td>SP.ATK</td>
          <td>{pokemon.stats.spAtk}</td>
        </tr>
        <tr>
          <td>SP.DEF</td>
          <td>{pokemon.stats.spDef}</td>
        </tr>
        <tr>
          <td>Speed</td>
          <td>{pokemon.stats.speed}</td>
        </tr>
      </tbody>
    </table>
  )
}

export default PokemonStats
```

## Available Hooks for Pokémon Data

### `usePokemonDetails(pokemonName)`

The hook returns an object with this structure:

```javascript
{
  id: number,                    // Pokémon ID (1-1000+)
  name: string,                  // API name (lowercase)
  displayName: string,           // Original display name
  height: number,                // In meters
  weight: number,                // In kilograms
  types: string[],               // e.g., ['fire', 'flying']
  abilities: {
    normal: string[],            // Regular abilities
    hidden: string[]             // Hidden abilities
  },
  stats: {
    hp: number,
    attack: number,
    defense: number,
    spAtk: number,
    spDef: number,
    speed: number
  },
  moves: [                        // Array of move objects
    {
      name: string,              // Move name
      methods: [                 // How it's learned
        {
          level: number,         // Level learned (0 if not level-up)
          method: string         // 'level-up', 'machine', 'tutor', etc.
        }
      ]
    }
  ],
  sprite: string,                // Best available sprite URL (from JSON-based system)
  generation: string,            // e.g., 'generation-v'
  description: string,           // Pokédex entry
  color: string,                 // Color name
  baseExperience: number,        // Base experience points
  eggGroups: string[],           // Breeding groups
  catchRate: number,             // Catch rate value (1-255)
  hatchCounter: number,          // Egg cycles to hatch
  isLegendary: boolean,          // Is legendary Pokemon
  isMythical: boolean,           // Is mythical Pokemon
  obtainable: boolean,           // Can be obtained in-game
  locations: [                   // Where to find this Pokemon
    {
      location: string,
      region_name: string,
      min_level: number,
      max_level: number,
      rarity: string,
      time: string               // 'ALL', 'Day/Morning', etc.
    }
  ]
}
```

### `usePokemonSprites(pokemonName)` - NEW SYSTEM (v2.0+)

**Returns:** Object with sprites organized by generation

```javascript
const spritesByGeneration = usePokemonSprites(pokemonName);
// Result:
{
  'generation-i': [
    {
      url: string,               // Image URL
      label: string,             // e.g., "Red-Blue - Normal"
      type: string               // 'png' or 'gif'
    },
    // ... more sprites
  ],
  'generation-v': [
    {
      url: string,
      label: string,             // e.g., "Black-White - Animated Shiny (Female)"
      type: string               // 'gif' for animated
    },
    // ... more sprites
  ]
  // ... other generations
}
```

**Key Features:**
- Sprites automatically organized by generation
- Includes gender variants when available
- Animated GIFs in Generation V
- Transparent sprites for Generation I & II
- Official artwork as fallback

### `usePokemonForms(pokemonName)` - DYNAMIC FORM DISCOVERY (v2.0+)

**Returns:** Array of available forms and variants

```javascript
const forms = usePokemonForms(pokemonName);
// Result:
[
  {
    name: 'bulbasaur',           // Internal form name
    label: 'Bulbasaur (Male)',   // User-friendly label
    type: 'gender',              // 'form' or 'gender'
    displayLabel: 'Bulbasaur'    // Short label
  },
  {
    name: 'rotom-heat',
    label: 'Heat',
    type: 'form',
    displayLabel: 'Heat'
  },
  // ... more forms
]
```

### `usePokemonLocations(pokemonName)`

**Returns:** Array of location objects where Pokemon can be found

```javascript
const locations = usePokemonLocations(pokemonName);
// Result:
[
  {
    pokemon: string,
    pokemon_id: number,          // Correct ID for form variants
    location: string,            // e.g., "ROUTE 3"
    region_name: string,         // e.g., "Kanto"
    type: string,                // Encounter type (Grass, Water, etc.)
    min_level: number,
    max_level: number,
    rarity: string,              // Common, Uncommon, Rare, etc.
    time: string                 // 'ALL', 'Day/Morning', etc.
  }
]
```

### `usePokemonOrder()`

**Returns:** Navigation helpers for Pokemon ordering

```javascript
const { 
  allPokemon,              // Array of base Pokemon names in ID order
  getPokemonIndex,         // Function: Get index of Pokemon
  getNextPokemon,          // Function: Get next Pokemon name
  getPreviousPokemon       // Function: Get previous Pokemon name
} = usePokemonOrder();
```
```

## New Sprite System Integration (v2.0+)

The sprite system has been refactored to use a JSON-based approach in `src/data/pokemmo_data/pokemon-sprites.json`. This provides several advantages:

### Features
- **Generation-Based Organization:** Sprites organized by game generation
- **Gender Variants:** Female variants auto-detected and displayed separately
- **Animated Sprites:** Generation V includes GIF animations
- **Multiple Variants per Generation:** Normal, Shiny, Transparent, Official Artwork
- **Dynamic Form Discovery:** Forms and variants discovered automatically

### Using the New System

```jsx
import { usePokemonSprites } from '../../hooks/usePokemonSprites'
import { usePokemonForms } from '../../hooks/usePokemonForms'

function PokemonViewer({ pokemonName }) {
  const spritesByGeneration = usePokemonSprites(pokemonName)
  const availableForms = usePokemonForms(pokemonName)
  
  const [selectedGen, setSelectedGen] = useState('generation-v')
  const [selectedGender, setSelectedGender] = useState('male')
  
  const genSprites = spritesByGeneration[selectedGen] || []
  const filteredSprites = genSprites.filter(s => {
    if (selectedGender === 'female') return s.label.includes('(Female)')
    return !s.label.includes('(Female)')
  })
  
  return (
    <div>
      {/* Generation selector */}
      <select onChange={(e) => setSelectedGen(e.target.value)}>
        {Object.keys(spritesByGeneration).map(gen => (
          <option key={gen} value={gen}>{gen}</option>
        ))}
      </select>
      
      {/* Gender selector */}
      <button onClick={() => setSelectedGender('male')}>Male</button>
      <button onClick={() => setSelectedGender('female')}>Female</button>
      
      {/* Display sprites */}
      {filteredSprites.map((sprite, idx) => (
        <img key={idx} src={sprite.url} alt={sprite.label} />
      ))}
    </div>
  )
}
```

### Migration from Old System

If you were using the old sprite system:

**Before (Flat Array):**
```javascript
const sprites = usePokemonSprites(pokemon)
// Returns: [{url, label, type}, ...]
```

**Now (Generation-Organized):**
```javascript
const spritesByGeneration = usePokemonSprites(pokemon)
// Returns: {'generation-i': [...], 'generation-v': [...], ...}
```

## Navigation Routes

### Detail Page
```
/pokemon/{pokemonName}
```

Examples:
- `/pokemon/pikachu`
- `/pokemon/charizard`
- `/pokemon/bulbasaur`
- `/pokemon/rotom-heat` (forms included)
- `/pokemon/frillish-f` (gender variants)

The name in the URL can be any valid Pokémon name from the official Pokédex.

## Styling the Clickable Image

In your CSS module:

```css
.pokemonImage {
  cursor: pointer;
  transition: transform 0.2s ease, filter 0.2s ease;
}

.pokemonImage:hover {
  transform: scale(1.1);
  filter: brightness(1.2);
}

.pokemonImage:focus {
  outline: 2px solid #667eea;
  outline-offset: 2px;
}
```

## Common Patterns

### Pattern 1: Grid of Clickable Pokémon

```jsx
function PokemonGrid({ pokemonList }) {
  const navigate = useNavigate()

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
      {pokemonList.map(pokemon => (
        <img
          key={pokemon.name}
          src={pokemon.sprite}
          alt={pokemon.name}
          onClick={() => navigate(`/pokemon/${pokemon.name.toLowerCase()}`)}
          style={{ cursor: 'pointer', width: '100%' }}
        />
      ))}
    </div>
  )
}
```

### Pattern 2: List with Details and Link

```jsx
function PokemonList({ pokemonList }) {
  return (
    <ul>
      {pokemonList.map(pokemon => (
        <Link
          key={pokemon.name}
          to={`/pokemon/${pokemon.name.toLowerCase()}`}
          style={{ textDecoration: 'none' }}
        >
          <li>
            <img src={pokemon.sprite} alt={pokemon.name} style={{ width: '50px' }} />
            <span>{pokemon.name}</span>
          </li>
        </Link>
      ))}
    </ul>
  )
}
```

### Pattern 3: Modal Display

```jsx
import { useState } from 'react'
import { usePokemonDetails } from '../../hooks/usePokemonDetails'

function PokemonModal() {
  const [selectedPokemon, setSelectedPokemon] = useState(null)
  const { data: pokemon } = usePokemonDetails(selectedPokemon)

  return (
    <>
      <button onClick={() => setSelectedPokemon('pikachu')}>
        View Pikachu Details
      </button>

      {pokemon && (
        <div className="modal">
          <h2>{pokemon.displayName}</h2>
          <p>Type: {pokemon.types.join(', ')}</p>
          <button onClick={() => setSelectedPokemon(null)}>Close</button>
        </div>
      )}
    </>
  )
}
```

## Troubleshooting

### "Pokémon not found" error
- Check the Pokémon name spelling
- Names should be lowercase with hyphens (e.g., `mr-mime`, `type-null`)
- Use the [PokéAPI Explorer](https://pokeapi.co) to look up correct names

### Images not displaying
- Verify the Pokémon name is correct
- Check Network tab for failed image requests
- The detail page shows a fallback sprite if local GIF isn't available

### Component not updating
- Ensure Pokémon name is changing in the URL
- Check React Router version compatibility
- Verify `useNavigate()` is used correctly

## Next Steps

1. **Basic Integration**: Use ShinyItem component (no extra code needed)
2. **Custom Integration**: Add navigation to a custom component
3. **Advanced**: Create a specialized Pokémon display with inline details
4. **Optimization**: Cache Pokémon data with React Query (see main documentation)

---

For full documentation, see [POKEMON_DETAIL_FEATURE.md](./POKEMON_DETAIL_FEATURE.md)
