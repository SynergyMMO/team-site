# Shiny Data Merge System - Quick Summary

## What Was Created

A complete system for merging detailed ShinyBoard API data with your existing Cloudflare Worker database. The system is **configurable, safe, and production-ready**.

---

## Files Created/Modified

### 1. **Enhanced React Hook** 
📁 `src/hooks/useShinyData.js`
- Fetches data from ShinyBoard API
- Fetches Cloudflare database
- Merges API fields into existing data
- Handles duplicates correctly
- Can output to file for testing or update real database
- Includes React hook for component usage
- **400+ lines of well-documented code**

### 2. **Node.js CLI Script**
📁 `scripts/mergeShinyData.js`
- Command-line interface for testing and updating
- Color-coded output for easy reading
- Configuration at the top
- Safe test mode by default
- 5-second warning before updating database
- Detailed logging of the merge process
- **300+ lines of production-ready code**

### 3. **Example Component**
📁 `src/pages/Admin/components/ShinyDataMergeExample.jsx`
- 4 complete examples showing how to use the hook
- Simple viewer component
- Admin panel with manual trigger
- User-specific display
- Custom hook wrapper

### 4. **Full Documentation**
📁 `SHINY_DATA_MERGE_GUIDE.md`
- 300+ lines of detailed documentation
- Configuration guide
- CLI reference
- Usage examples
- Troubleshooting
- API details
- Advanced features

### 5. **Quick Reference**
📁 `SHINY_DATA_MERGE_QUICK_REF.md`
- Quick lookup for common commands
- Configuration cheat sheet
- One-page reference guide

---

## How to Use (3 Steps)

### Step 1: Configure Users & Fields (Edit Top of File)

**In `scripts/mergeShinyData.js` (or `src/hooks/useShinyData.js`):**

```javascript
// Line 9-18: Configure which fields to grab
const FIELDS_TO_MERGE = [
  'ivs',
  'nature',
  'location',
  'encounter_method',
  'date_caught',
  // Add more as needed
];

// Line 23-25: Configure which users to process
const USERS_TO_PROCESS = ['hyper', 'Jesse'];
```

### Step 2: Test the Merge (Safe - Outputs to File)

```bash
node scripts/mergeShinyData.js
```

This will:
1. ✅ Fetch API data for all configured users
2. ✅ Fetch Cloudflare database
3. ✅ Merge data intelligently
4. ✅ Write to `merged_shiny_data.json` (in project root)
5. ✅ **NOT modify** the real database

### Step 3: Verify Output & Update (Only If Test Looks Good)

Open `merged_shiny_data.json` and verify:
- Data looks correct
- API fields are present
- Pokémon are matched properly

Then update the real database:

```bash
node scripts/mergeShinyData.js --update
```

---

## Key Features

### ✅ Configurable Fields
- Define which API fields to merge at the top of the file
- Add new fields instantly - no major rewrites needed
- Examples: "ivs", "nature", "location", "encounter_method", "date_caught"

### ✅ Configurable Users
- Specify exactly which users to process
- Only fetch and merge for those users
- Easy to add/remove users from the list

### ✅ Intelligent Merging
- Matches Pokémon by name (exact match)
- Handles duplicate Pokémon correctly (in order)
- Preserves all existing Cloudflare data
- Only adds the configured fields
- Skips API data for Pokémon not in Cloudflare

### ✅ Safe Testing
- **Test mode by default** (outputs to file)
- Review output before updating real database
- 5-second warning before real update
- Cancel with Ctrl+C if needed

### ✅ Easy CLI Usage
```bash
node scripts/mergeShinyData.js                              # Test (default)
node scripts/mergeShinyData.js --test                       # Test explicitly
node scripts/mergeShinyData.js --update                     # Update database
node scripts/mergeShinyData.js --users hyper,Jesse          # Custom users
node scripts/mergeShinyData.js --fields ivs,nature,location # Custom fields
```

### ✅ React Hook Support
Use in components for automatic merging:
```jsx
const { data, loading, error } = useShinyDataMerge({
  users: ['hyper', 'Jesse'],
  fields: ['ivs', 'nature', 'location'],
});
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  ShinyBoard API                  Cloudflare Database        │
│  (Detailed shiny data)           (User shinies)             │
│         │                                 │                 │
│         └──────────────┬──────────────────┘                 │
│                        ↓                                     │
│              ┌──────────────────┐                           │
│              │  Merge Logic     │                           │
│              │ (Match by name)  │                           │
│              │ (Handle dupes)   │                           │
│              │ (Add fields)     │                           │
│              └──────────────────┘                           │
│                        │                                     │
│         ┌──────────────┴──────────────┐                     │
│         ↓                              ↓                     │
│  Output to File              Update Cloudflare Database    │
│  (for testing)               (real data)                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Example: Before & After

### Before Merge
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

### After Merge (with FIELDS_TO_MERGE = ['ivs', 'nature', 'location'])
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
      },
      "2": {
        "Pokemon": "Graveler",
        "Sold": "Yes",
        "ivs": "28/31/30/20/31/31",
        "nature": "Adamant",
        "location": "Johto - Mt. Silver"
      }
    }
  }
}
```

---

## Configuration Reference

### Available API Fields
All of these can be added to `FIELDS_TO_MERGE`:

```javascript
const FIELDS_TO_MERGE = [
  'ivs',                  // e.g., "31/31/31/31/31/31"
  'nature',               // e.g., "Jolly", "Adamant"
  'location',             // e.g., "Sinnoh - Route 210"
  'encounter_method',     // e.g., "Wild", "Bred"
  'date_caught',          // e.g., "2025-01-15"
  'encounter_count',      // e.g., 150
  'nickname',             // e.g., "Shadow" (if any)
  'variant',              // Special variant info
];
```

### Users List
```javascript
const USERS_TO_PROCESS = [
  'hyper',
  'Jesse',
  // Add more usernames here
];
```

---

## Workflow Summary

```
┌─────────────────────────────────────────────┐
│ 1. Configure USERS_TO_PROCESS & FIELDS      │
│    Edit top of scripts/mergeShinyData.js    │
└────────────────┬────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────┐
│ 2. Test: node scripts/mergeShinyData.js     │
│    (Creates merged_shiny_data.json)         │
└────────────────┬────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────┐
│ 3. Review merged_shiny_data.json            │
│    ✓ Data looks good?                       │
│    ✓ Fields present?                        │
│    ✓ Matches correct?                       │
└────────────────┬────────────────────────────┘
                 │
                 ↓
        ┌───────┴───────┐
        │               │
      NO              YES
        │               │
        │               ↓
        │    ┌──────────────────────────┐
        │    │ 4. Update:               │
        │    │ node scripts/...js       │
        │    │ --update                 │
        │    └──────────────────────────┘
        │
      (Fix config & retest)
```

---

## Commands Cheat Sheet

```bash
# Test (safe, creates JSON file)
node scripts/mergeShinyData.js

# Test specific users
node scripts/mergeShinyData.js --users hyper,Jesse

# Test specific fields
node scripts/mergeShinyData.js --fields ivs,nature

# Update live database (ONLY after testing!)
node scripts/mergeShinyData.js --update

# Custom users + fields + test
node scripts/mergeShinyData.js --test --users hyper --fields ivs,nature,location
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "User not found" | User exists in API but not Cloudflare - remove from USERS_TO_PROCESS |
| Fields not in output | Add field name to FIELDS_TO_MERGE array |
| API returns 0 shinies | Check username (case-sensitive), verify user has shinies on ShinyBoard |
| Database not updated | Make sure you used `--update` flag, not just `--test` |
| Merge seems incomplete | Check field names match API exactly, verify API returns data |

---

## File Locations

```
project-root/
├── src/
│   ├── hooks/
│   │   └── useShinyData.js              ← Main React hook
│   └── pages/Admin/components/
│       └── ShinyDataMergeExample.jsx     ← Example usage
├── scripts/
│   └── mergeShinyData.js                ← CLI script
├── SHINY_DATA_MERGE_GUIDE.md            ← Full documentation
├── SHINY_DATA_MERGE_QUICK_REF.md        ← Quick reference
└── merged_shiny_data.json               ← Test output (generated)
```

---

## Next Steps

1. **Edit configuration** in `scripts/mergeShinyData.js`
   - Set `USERS_TO_PROCESS` to the users you want
   - Set `FIELDS_TO_MERGE` to the fields you want

2. **Run test** to verify everything works
   ```bash
   node scripts/mergeShinyData.js
   ```

3. **Review output file** (`merged_shiny_data.json`)

4. **Update real database** when confident
   ```bash
   node scripts/mergeShinyData.js --update
   ```

---

## Questions?

- **Quick lookup**: See `SHINY_DATA_MERGE_QUICK_REF.md`
- **Detailed info**: See `SHINY_DATA_MERGE_GUIDE.md`
- **Code examples**: See `src/pages/Admin/components/ShinyDataMergeExample.jsx`
- **Code docs**: Check comments in `src/hooks/useShinyData.js` and `scripts/mergeShinyData.js`

---

**Status**: ✅ Ready to use. All features implemented and documented.
