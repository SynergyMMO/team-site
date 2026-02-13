# Shiny Data Merge - Quick Reference

## Quick Start

### Test the merge (safe, outputs to file)
```bash
node scripts/mergeShinyData.js
```

### Update the real database (after verifying test output)
```bash
node scripts/mergeShinyData.js --update
```

---

## Configuration

Both files use the same configuration at the top:

**File locations:**
- `/src/hooks/useShinyData.js` (React hook)
- `/scripts/mergeShinyData.js` (Node.js script)

### Change which users to process

```javascript
const USERS_TO_PROCESS = ['hyper', 'Jesse', 'AnotherUser'];
```

### Change which fields to merge

```javascript
const FIELDS_TO_MERGE = [
  'ivs',             // Individual Values
  'nature',          // Pokémon nature
  'location',        // Where caught
  'encounter_method', // How encountered
  'date_caught',     // When caught
  'encounter_count', // Total encounters
  'nickname',        // Custom name
  'variant',         // Special variant
];
```

---

## CLI Commands

| Command | Effect |
|---------|--------|
| `node scripts/mergeShinyData.js` | Test mode (outputs file) |
| `node scripts/mergeShinyData.js --test` | Same as above |
| `node scripts/mergeShinyData.js --update` | Updates REAL database ⚠️ |
| `node scripts/mergeShinyData.js --users hyper,Jesse` | Only process specific users |
| `node scripts/mergeShinyData.js --fields ivs,nature` | Only merge specific fields |
| `node scripts/mergeShinyData.js --test --users hyper --fields ivs,nature` | Combine options |

---

## React Hook Usage

### Basic
```jsx
import { mergeShinyData } from './hooks/useShinyData';

const result = await mergeShinyData();
```

### With options
```jsx
const result = await mergeShinyData({
  users: ['hyper', 'Jesse'],
  fields: ['ivs', 'nature'],
  outputToFile: true,
});
```

### As React hook
```jsx
import { useShinyDataMerge } from './hooks/useShinyData';

const { data, loading, error } = useShinyDataMerge({
  users: ['hyper'],
  fields: ['ivs', 'nature'],
});
```

---

## Data Structure

### Input (Cloudflare)
```json
{
  "hyper": {
    "shiny_count": 2,
    "shinies": {
      "1": { "Pokemon": "Riolu", "Sold": "No" },
      "2": { "Pokemon": "Graveler", "Sold": "Yes" }
    }
  }
}
```

### Input (ShinyBoard API)
```json
{
  "shinies": [
    {
      "pokemon": { "name": "Riolu" },
      "ivs": "31/31/31/31/31/31",
      "nature": "Jolly",
      "location": "Sinnoh - Route 210"
    }
  ]
}
```

### Output (Merged)
```json
{
  "hyper": {
    "shiny_count": 2,
    "shinies": {
      "1": {
        "Pokemon": "Riolu",
        "Sold": "No",
        "ivs": "31/31/31/31/31/31",
        "nature": "Jolly",
        "location": "Sinnoh - Route 210"
      }
    }
  }
}
```

---

## How It Works

1. **Fetches** detailed shiny data from ShinyBoard API for specified users
2. **Fetches** existing shiny data from Cloudflare database
3. **Matches** Pokémon by name (exact match, case-sensitive)
4. **Handles duplicates** in order (1st Riolu → 1st API Riolu, etc.)
5. **Merges** only configured fields
6. **Outputs** to file (test) or updates database (production)

---

## Workflow

```
1. Configure users & fields
        ↓
2. Run: node scripts/mergeShinyData.js
        ↓
3. Review: merged_shiny_data.json
        ↓
4. If good, run: node scripts/mergeShinyData.js --update
        ↓
5. Verify in live database
```

---

## Features

✅ Configurable fields - easily add/remove what to merge  
✅ Configurable users - only process specific users  
✅ Duplicate handling - matches Pokémon in order  
✅ Safe testing - test output to file before DB update  
✅ Error handling - gracefully handles missing data  
✅ CLI & React - both command-line and component options  
✅ Modular code - easy to extend or modify  

---

## Troubleshooting

**"User not found in database"**
→ User exists in API but not Cloudflare. Remove from `USERS_TO_PROCESS`.

**0 shinies for a user**
→ User may have no shinies or wrong username (case-sensitive).

**Fields not appearing in output**
→ Add field name to `FIELDS_TO_MERGE` array.

**Database didn't update**
→ Make sure you ran `--update` mode, not `--test` mode.

---

## Files

```
src/hooks/useShinyData.js         ← React hook with merging logic
scripts/mergeShinyData.js         ← CLI script for testing/updating
merged_shiny_data.json            ← Test output (created after running)
SHINY_DATA_MERGE_GUIDE.md         ← Full documentation
SHINY_DATA_MERGE_QUICK_REF.md     ← This file
```

---

## More Info

See `SHINY_DATA_MERGE_GUIDE.md` for detailed documentation, examples, and advanced usage.
