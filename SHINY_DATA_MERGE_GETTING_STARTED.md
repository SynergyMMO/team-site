# Getting Started with Shiny Data Merge

## 🚀 Quick Start (5 minutes)

### 1. Open the configuration file
Open: `scripts/mergeShinyData.js`

### 2. Do two things (lines 20-48):

**A) Set which users to process:**
```javascript
const USERS_TO_PROCESS = ['Hyper', 'TTVxleJesse'];  // ← Change these
```

**B) Set which fields to merge:**
```javascript
const FIELDS_TO_MERGE = [
  'ivs',              // ← Include or exclude fields here
  'nature',
  'location',
  // Add/remove as needed
];
```

### 3. Save the file

### 4. Open terminal and run TEST mode:
```bash
npm run TestMergeData
```

### 5. Look for output file
Check your project root for: `merged_shiny_data.json`

### 6. Review the file
- Does it look right?
- Are the fields there?
- Are the Pokémon matched correctly?

### 7. If everything looks good, run the real merge:
```bash
npm run MergeData
```

Follow the prompts to enter your admin username and password.

Done! ✅

---

## 📚 More Info

- **Quick commands**: See [SHINY_DATA_MERGE_QUICK_REF.md](SHINY_DATA_MERGE_QUICK_REF.md)
- **Full guide**: See [SHINY_DATA_MERGE_GUIDE.md](SHINY_DATA_MERGE_GUIDE.md)
- **Summary**: See [SHINY_DATA_MERGE_SUMMARY.md](SHINY_DATA_MERGE_SUMMARY.md)
- **Examples**: See [src/pages/Admin/components/ShinyDataMergeExample.jsx](src/pages/Admin/components/ShinyDataMergeExample.jsx)

---

## 🎯 What Each Configuration Does

### USERS_TO_PROCESS
Controls which users get their data merged. Only users in this list will be processed.

```javascript
// Example: Merge only hyper's data
const USERS_TO_PROCESS = ['hyper'];

// Example: Merge hyper, Jesse, and two other users
const USERS_TO_PROCESS = ['hyper', 'Jesse', 'Player3', 'Player4'];
```

### FIELDS_TO_MERGE
Controls which API data fields get merged into existing Cloudflare data.

```javascript
// Example: Only merge IVs and nature
const FIELDS_TO_MERGE = ['ivs', 'nature'];

// Example: Merge all available fields
const FIELDS_TO_MERGE = [
  'ivs',
  'nature',
  'location',
  'encounter_method',
  'date_caught',
  'encounter_count',
  'nickname',
  'variant',
];
```

---

## 📋 What Happens in Each Step

### Step 1: `node scripts/mergeShinyData.js`

**This safely tests everything:**
- ✅ Fetches API data from ShinyBoard.net
- ✅ Fetches existing data from Cloudflare
- ✅ Merges them together
- ✅ Writes result to `merged_shiny_data.json`
- ❌ Does NOT modify the real database

**Output file**: `merged_shiny_data.json` (in your project root)

### Step 2: Review `merged_shiny_data.json`

Check that:
- 🔍 The data looks correct
- 🔍 API fields are present
- 🔍 Pokémon names matched
- 🔍 Numbers look right

### Step 3: `node scripts/mergeShinyData.js --update`

**This updates the real database:**
- ⚠️ Shows a 5-second warning
- ⏸️ Let you cancel with Ctrl+C if needed
- 📤 Updates Cloudflare with the merged data
- ✅ Confirms when done

---

## 🔄 The Merging Process

The system:

1. **Fetches** detailed shiny data from ShinyBoard API for each user
2. **Fetches** existing shiny data from your Cloudflare database
3. **Matches** Pokémon by name (exact match)
4. **Merges** only the configured fields
5. **Handles duplicates** in order (1st Riolu → 1st API Riolu, etc.)
6. **Outputs** to file (safe) or updates database (production)

### Example

```
Cloudflare has:
  Riolu (Sold: No)
  Graveler (Sold: Yes)

API has:
  Riolu (ivs: 31/31/31/31/31/31, nature: Jolly)
  Graveler (ivs: 28/31/30/20/31/31, nature: Adamant)

Result:
  Riolu (Sold: No, ivs: 31/31/31/31/31/31, nature: Jolly)
  Graveler (Sold: Yes, ivs: 28/31/30/20/31/31, nature: Adamant)
```

---

## ⚙️ Available API Fields

These are the fields you can add to `FIELDS_TO_MERGE`:

| Field | Example |
|-------|---------|
| `ivs` | `31/31/31/31/31/31` |
| `nature` | `Jolly`, `Adamant`, `Modest` |
| `location` | `Sinnoh - Route 210` |
| `encounter_method` | `Wild`, `Bred` |
| `date_caught` | `2025-01-15` |
| `encounter_count` | `150` |
| `nickname` | `Shadow` |
| `variant` | Any special variant info |

---

## ❓ FAQ

### "How often should I run this?"
As often as needed. The script is safe - test mode by default.

### "Can I add new fields?"
Yes! Just add the field name to `FIELDS_TO_MERGE` array.

### "What if a user isn't in Cloudflare?"
The script will skip them and show a message. No problem.

### "What if API has Pokémon Cloudflare doesn't?"
They're ignored. Only Cloudflare Pokémon get updated.

### "Can I undo a database update?"
Not automatically. But you can always re-run the test and update to any state you want.

### "What if I mess up the configuration?"
Just fix it and re-run the test. No harm done.

---

## 🛠️ CLI Commands

```bash
# Test (safe, outputs to file)
node scripts/mergeShinyData.js

# Explicitly test mode
node scripts/mergeShinyData.js --test

# Update real database (⚠️ after testing!)
node scripts/mergeShinyData.js --update

# Test with custom users only
node scripts/mergeShinyData.js --users hyper,Jesse

# Test with custom fields only
node scripts/mergeShinyData.js --fields ivs,nature

# Combine options
node scripts/mergeShinyData.js --test --users hyper --fields ivs,nature
```

---

## 📞 Need Help?

1. **Field names**: Check available fields in table above
2. **Usernames**: Make sure they exactly match (case-sensitive)
3. **File locations**: Check "More Info" section links above
4. **Code examples**: See [ShinyDataMergeExample.jsx](src/pages/Admin/components/ShinyDataMergeExample.jsx)

---

## ✅ You're All Set!

Now go to step 1 above and get started. It's safe, tested, and ready to use.
