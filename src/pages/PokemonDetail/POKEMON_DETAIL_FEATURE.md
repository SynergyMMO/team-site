# Pokémon Detail Feature Documentation

## Overview

This documentation covers the new Pokémon Detail feature that allows users to click on Pokémon GIFs throughout the site and view detailed information about that Pokémon. The solution is designed to be maintainable, scalable, and easily extensible.

## Architecture

### Components & Files

#### 1. **PokemonDetail Page** (`src/pages/PokemonDetail/PokemonDetail.jsx`)
- Main page component that displays detailed Pokémon information
- Uses the `usePokemonDetails` hook to fetch data from PokéAPI
- Displays:
  - Name and ID
  - Image (with fallback to sprite)
  - Type badges
  - Abilities (normal and hidden)
  - Base stats with visual bars
  - Pokédex entry description
  - Breeding and catch information
  - Recent moves

#### 2. **usePokemonDetails Hook** (`src/hooks/usePokemonDetails.js`)
- Fetches Pokémon data from [PokéAPI](https://pokeapi.co)
- Handles both Pokémon data and species information
- Returns formatted data object with:
  - Basic info (ID, name, height, weight)
  - Types and color
  - Abilities (normal and hidden)
  - Stats (HP, ATK, DEF, SP.ATK, SP.DEF, SPD)
  - Moves (first 20)
  - Description from Pokédex
  - Egg groups and hatch counter
  - Catch rate
  - Generation info

#### 3. **Updated ShinyItem Component** (`src/components/ShinyItem/ShinyItem.jsx`)
- Made Pokémon GIFs clickable
- Added keyboard accessibility (Enter/Space to navigate)
- Navigate to `/pokemon/{pokemonName}` on click
- Added `role="button"` and `tabIndex` for accessibility
- Added visual feedback with hover effects

#### 4. **App Router** (`src/App.jsx`)
- New route: `/pokemon/:pokemonName`
- Lazy-loaded for optimal performance

## How to Add/Modify Pokémon Display

### Scenario 1: Adding a New Page That Displays Pokémon

If you have a new page (e.g., `Competitive` page) that displays Pokémon and want them to be clickable:

1. **Ensure you're using the ShinyItem component or similar**:
   ```jsx
   import ShinyItem from '../../components/ShinyItem/ShinyItem'
   
   // In your component:
   <ShinyItem shiny={pokemonData} points={points} userName={userName} />
   ```

2. **If you have a custom Pokémon display component**, add the click handler:
   ```jsx
   import { useNavigate } from 'react-router-dom'
   
   function CustomPokemonCard({ pokemon }) {
     const navigate = useNavigate()
     
     return (
       <img
         src={pokemon.image}
         alt={pokemon.name}
         onClick={() => navigate(`/pokemon/${pokemon.name.toLowerCase()}`)}
         style={{ cursor: 'pointer' }}
       />
     )
   }
   ```

### Scenario 2: Customizing the Detail Page Display

To modify what information is displayed on the Pokémon detail page:

1. **Edit PokemonDetail.jsx** to add/remove sections
2. **Update usePokemonDetails.js** if you need additional data from the API
3. **Modify PokemonDetail.module.css** for styling changes

Example: Adding a new section for evolution chain:

```jsx
// In usePokemonDetails.js, fetch evolution chain:
const evolutionResponse = await fetch(speciesData.evolution_chain.url)
const evolutionData = await evolutionResponse.json()
formattedData.evolutionChain = parseEvolutionChain(evolutionData.chain)

// In PokemonDetail.jsx, add section:
<section className={styles.infoCard}>
  <h2 className={styles.cardTitle}>Evolution Chain</h2>
  {/* Display evolution data */}
</section>
```

### Scenario 3: Displaying Pokémon Information on Different Pages

To add Pokémon details inline without navigating away:

```jsx
import { usePokemonDetails } from '../../hooks/usePokemonDetails'

function MyComponent({ pokemonName }) {
  const { data: pokemon, isLoading, error } = usePokemonDetails(pokemonName)
  
  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error loading Pokémon</div>
  
  return (
    <div>
      <h3>{pokemon.name}</h3>
      <p>Type: {pokemon.types.join(', ')}</p>
      <p>Height: {pokemon.height}m</p>
    </div>
  )
}
```

## Adding More Data to PokéAPI Requests

The hook currently fetches:
- Pokémon stats and traits
- Species information (description, generation, color)

To add more data (e.g., evolution chain, abilities details):

1. **Edit usePokemonDetails.js**:
   ```jsx
   // Add new API call in the try block
   const abilitiesResponse = await fetch(pokemon.abilities[0].ability.url)
   const abilitiesData = await abilitiesResponse.json()
   
   // Format and add to return object
   formattedData.abilityDescriptions = {
     [ability.name]: ability.effect_entries[0]?.effect || ''
   }
   ```

2. **Update the return type** in the component JSDoc comment

## API Reference

### PokéAPI Endpoints Used

1. **Pokémon Details**: `https://pokeapi.co/api/v2/pokemon/{name}`
2. **Species Info**: `https://pokeapi.co/api/v2/pokemon-species/{id}`
3. **Additional endpoints can be added for**: evolution chains, ability details, move details, etc.

## Performance Considerations

### Current Optimizations

- Lazy loading of the PokemonDetail component in App.jsx
- Pagination of moves (limited to 20)
- Image fallback (local GIF → official artwork → default sprite)
- Memoization in ShinyItem component

### Future Optimizations

- Implement caching for frequently viewed Pokémon
- Use React Query for better data management and caching
  ```jsx
  import { useQuery } from '@tanstack/react-query'
  
  const { data } = useQuery({
    queryKey: ['pokemon', pokemonName],
    queryFn: () => fetchPokemonDetails(pokemonName),
    staleTime: 1000 * 60 * 60 // 1 hour
  })
  ```
- Pre-fetch popular Pokémon on page load

## Catch Rate Calculator Feature (NEW)

### Overview
The PokéAPI Detail page now includes an interactive catch rate calculator that shows catch percentages for various Pokémon balls and conditions based on the Gen 5 capture formula.

### Implementation

#### Helper Functions
**`calculateCatchChance(catchRate, ballRate, hpPercent, statusModifier)`**
- Implements Gen 5 capture formula
- Parameters:
  - `catchRate`: Base catch rate (0-255) from Pokemon data
  - `ballRate`: Ball multiplier (e.g., Pokéball=1.0, Ultra Ball=2.0, Dusk Ball=3.5)
  - `hpPercent`: Current HP as percentage (0-100)
  - `statusModifier`: Status effect multiplier (1.0=none, 1.5=poison/burn, 2.0=sleep/freeze)
- Returns: Catch percentage (0-100)
- Formula: `A = [(3×MaxHP - 2×CurrentHP) / (3×MaxHP)] × BallRate × CatchRate × StatusMod`

**`calculateBestCatchMethod(catchRate)`**
- Analyzes all ball types and conditions
- Balances: catch rate, turns needed (0-2), ball cost
- Returns: `{ bestMethod, secondBestMethod }` objects with:
  - Ball name
  - Catch chance percentage
  - HP condition and status benefits
  - Turns required
  - Calculated efficiency score

### UI Component

#### Catch Rate Tooltip
- **Trigger**: Hover over catch rate bar
- **Display**: Interactive table with all ball types
  - Rows: Pokéball, Great Ball, Ultra Ball, Dusk Ball (night), Timer Ball (turn 11+), Safari Ball
  - Columns: 100% HP, 1% HP, Sleep 100% HP, Sleep 1% HP
- **Highlights**: 100% catch chance cells
- **Best Method Row**: Shows recommended ball + condition combo
- **Formula Display**: Shows calculation formula at bottom

#### Move Level Filter
- Collapsible on mobile via gear icon (⚙️)
- Single input field for filtering level-up moves by wild Pokémon level
- Persists across interactions

### Data Dependencies
- Pokemon `catchRate` from PokéAPI
- `maxWildLevel` calculated from location encounter data

### State Variables
```javascript
const [showCatchRateTooltip, setShowCatchRateTooltip] = useState(false)
const [maxWildLevel, setMaxWildLevel] = useState(0)
const [showMobileFilters, setShowMobileFilters] = useState(false)
```

## Styling & Theming

### Color System

The page uses CSS variables for type colors:
```css
const TYPE_COLORS = {
  normal: '#A8A878',
  fire: '#F08030',
  water: '#6890F0',
  // ... etc
}
```

### Responsive Design

The detail page is fully responsive:
- Desktop: 2-column grid (image + details)
- Tablet: Responsive grid layout
- Mobile: Single column layout

To modify breakpoints, edit `.module.css`:
```css
@media (max-width: 768px) {
  /* Mobile styles */
}
```

## Accessibility Features

- **Keyboard Navigation**: Pokémon images can be clicked with Enter/Space
- **ARIA Roles**: `role="button"` for semantic HTML
- **Focus Styling**: Visual focus indicators on interactive elements
- **Alt Text**: All images have descriptive alt text
- **Semantic HTML**: Uses proper heading hierarchy and semantic elements

## Testing

### Manual Testing Checklist

1. **Navigation**:
   - [ ] Click a Pokémon GIF on any page
   - [ ] Verify it navigates to detail page
   - [ ] Use browser back button to return

2. **Detail Page**:
   - [ ] Verify all sections load correctly
   - [ ] Check that both local GIF and sprite are available
   - [ ] Test on mobile/tablet view
   - [ ] Verify type colors display correctly

3. **Error Handling**:
   - [ ] Try visiting `/pokemon/invalid-name`
   - [ ] Verify error message displays
   - [ ] Check "Back to Pokédex" button works

4. **Performance**:
   - [ ] Check Network tab for API requests
   - [ ] Verify images load properly
   - [ ] Test with slow network (DevTools throttle)

## Common Issues & Solutions

### Issue: Pokémon not found error
**Solution**: Ensure Pokémon name is correctly formatted. PokéAPI expects lowercase names. The hook normalizes names automatically.

### Issue: Image not displaying
**Solution**: 
- Check Network tab for failed requests
- Verify local GIF exists at `public/images/pokemon_gifs/{tier}/{name}.gif`
- Sprite serves as fallback

### Issue: Component not updating when Pokémon name changes
**Solution**: Ensure `usePokemonDetails` dependency array includes `pokemonName`

## Future Enhancements

1. **Evolution Chain Display**: Show how Pokémon evolve
2. **Move Details**: Show move power, accuracy, effect
3. **Type Matchups**: Interactive type effectiveness chart
4. **Breeding Guide**: Show compatible breeding pairs
5. **Location Data**: Show where Pokémon can be found in games
6. **Compare Tool**: Compare stats between multiple Pokémon
7. **Team Builder**: Build and save Pokémon teams
8. **Offline Support**: Cache data for offline viewing

## File Structure Summary

```
src/
├── hooks/
│   └── usePokemonDetails.js          ← Data fetching hook
├── pages/
│   └── PokemonDetail/
│       ├── PokemonDetail.jsx         ← Detail page component
│       └── PokemonDetail.module.css  ← Detail page styles
├── components/
│   └── ShinyItem/
│       ├── ShinyItem.jsx             ← Updated to be clickable
│       └── ShinyItem.module.css      ← Added clickable styles
└── App.jsx                            ← Added route
```

## Questions & Support

For issues or questions about this feature:

1. Check this documentation first
2. Review the code comments in respective files
3. Check PokéAPI documentation: https://pokeapi.co/docs/v2
4. Review React Router documentation: https://reactrouter.com/

---

Last Updated: February 2026
