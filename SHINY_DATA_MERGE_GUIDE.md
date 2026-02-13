# Shiny Data Merge System Guide

This guide explains how to use the new shiny data merge system that combines detailed API data from ShinyBoard with your existing Cloudflare Worker database.

## Overview

The system consists of two main components:

1. **React Hook** (`src/hooks/useShinyData.js`) - For use in React components
2. **Node.js Script** (`scripts/mergeShinyData.js`) - For command-line testing and database updates

Both share the same core merging logic and configuration.

---

## Configuration

Both the React hook and the Node.js script use the same configurable settings at the top of their files:

### Fields to Merge

Located at the top of both files, specify which API fields to include:

```javascript
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

**Available fields** (from ShinyBoard API):
- `ivs` - Individual Values (e.g., "31/31/31/31/31/31")
- `nature` - Pokémon nature (e.g., "Jolly", "Adamant")
- `location` - Where caught (e.g., "Sinnoh - Route 210")
- `encounter_method` - How it was encountered
- `date_caught` - When it was caught
- `encounter_count` - Total encounters for that species
- `nickname` - Custom name (if any)
- `variant` - Special variant info

**To add a new field:**
1. Add the field name to `FIELDS_TO_MERGE` array
2. The hook will automatically extract and merge it (if available in API data)

### Users to Process

Specify which users' data should be merged:

```javascript
const USERS_TO_PROCESS = ['hyper', 'Jesse'];
```

Add or remove usernames as needed. Only these users will be processed.

---

## Using the Node.js Script (Recommended for Testing)

The command-line script is the best way to test the merge before updating the real database.

### Basic Usage

Open a terminal in the project directory and run:

```bash
node scripts/mergeShinyData.js
```

This runs in **TEST MODE** by default, writing results to `merged_shiny_data.json`.

### Command-Line Options

#### Test Mode (Default)
```bash
node scripts/mergeShinyData.js --test
```
- Fetches data from API and Cloudflare
- Merges the data
- Writes output to `merged_shiny_data.json` (in project root)
- **Does NOT modify** the real database

#### Update Real Database
```bash
node scripts/mergeShinyData.js --update
```
- Same process as test mode
- **Updates the real Cloudflare database**
- Shows a 5-second warning before updating
- ⚠️ **Only run after verifying test output!**

#### Custom Users
```bash
node scripts/mergeShinyData.js --users hyper,Jesse,OtherUser
```
- Processes only the specified users (comma-separated, no spaces)

#### Custom Fields
```bash
node scripts/mergeShinyData.js --fields ivs,nature,location
```
- Merges only the specified fields (comma-separated, no spaces)

#### Combine Options
```bash
node scripts/mergeShinyData.js --test --users hyper --fields ivs,nature,location
```

### Understanding the Output

When running in test mode, you'll see output like:

```
🚀 Starting shiny data merge process...
📋 Processing users: hyper, Jesse
📦 Fields to merge: ivs, nature, location, encounter_method...
⚙️  Mode: TEST (output to file)

📥 Fetching API data...
  → Fetching hyper... ✓ (45 shinies)
  → Fetching Jesse... ✓ (23 shinies)

📥 Fetching Cloudflare database...
  ✓ Database loaded (142 users)

🔀 Merging data...
  ✓ hyper: Processed 12 shinies with 45 API entries
  ✓ Jesse: Processed 8 shinies with 23 API entries

💾 Writing to file (TEST MODE)...
✓ Data written to D:\path\to\merged_shiny_data.json

✅ Test complete!
📄 Review the output file: D:\path\to\merged_shiny_data.json

To update the real database, run:
   node scripts/mergeShinyData.js --update

📊 Summary:
   Users processed: 2
   Users skipped: 0
```

### Reviewing Test Output

1. The script creates `merged_shiny_data.json` in your project root
2. Open this file and verify the data looks correct:
   - Check that API fields were added to shinies
   - Verify Pokémon names match correctly
   - Look for any unexpected values or missing data
3. If it looks good, proceed to update the real database

---

## Using the React Hook

For use in React components:

### Basic Import and Usage

```jsx
import { useShinyDataMerge } from './hooks/useShinyData';

export function MyComponent() {
  const { data, loading, error } = useShinyDataMerge();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
```

### With Custom Options

```jsx
const { data, loading, error } = useShinyDataMerge({
  users: ['hyper', 'Jesse'],
  fields: ['ivs', 'nature', 'location'],
  outputToFile: true, // true for testing, false for real DB update
  outputPath: './test_output.json',
});
```

### Using the Main Merge Function Directly

```jsx
import { mergeShinyData } from './hooks/useShinyData';

async function handleMerge() {
  try {
    const result = await mergeShinyData({
      users: ['hyper'],
      fields: ['ivs', 'nature'],
      outputToFile: true,
    });
    console.log('Merge complete:', result);
  } catch (error) {
    console.error('Merge failed:', error);
  }
}
```

---

## Data Structure Examples

### Input: Cloudflare Database (Sample)

```json
{
  "hyper": {
    "shiny_count": 2,
    "shinies": {
      "1": {
        "Pokemon": "Riolu",
        "Sold": "No"
      },
      "2": {
        "Pokemon": "Graveler",
        "Sold": "Yes"
      }
    }
  }
}
```

### Input: ShinyBoard API Response (Sample)

```json
{
  "shinies": [
    {
      "pokemon": { "name": "Riolu" },
      "ivs": "31/31/31/31/31/31",
      "nature": "Jolly",
      "location": "Sinnoh - Route 210",
      "encounter_method": "Wild",
      "date_caught": "2025-01-15"
    },
    {
      "pokemon": { "name": "Graveler" },
      "ivs": "28/31/30/20/31/31",
      "nature": "Adamant",
      "location": "Johto - Mt. Silver",
      "encounter_method": "Wild",
      "date_caught": "2025-01-20"
    }
  ]
}
```

### Output: Merged Data

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
        "location": "Sinnoh - Route 210",
        "encounter_method": "Wild",
        "date_caught": "2025-01-15"
      },
      "2": {
        "Pokemon": "Graveler",
        "Sold": "Yes",
        "ivs": "28/31/30/20/31/31",
        "nature": "Adamant",
        "location": "Johto - Mt. Silver",
        "encounter_method": "Wild",
        "date_caught": "2025-01-20"
      }
    }
  }
}
```

---

## How the Merging Works

### Matching Logic

1. **By Pokémon Name**: Each Cloudflare shiny is matched to API data by Pokémon name (case-sensitive)
2. **Duplicate Handling**: If a user has multiple Pokémon of the same type, they're matched in order:
   - First Riolu in Cloudflare → First Riolu in API
   - Second Riolu in Cloudflare → Second Riolu in API
   - And so on...
3. **Non-matching**: If a Pokémon in Cloudflare doesn't have a match in API data, it keeps its existing fields (no deletion)
4. **Extra API Data**: If the API has Pokémon not in Cloudflare, they're ignored (only Cloudflare shinies are updated)

### Example with Duplicates

If a user has 3 Riolus in Cloudflare and the API also has 3 Riolus:

```
Cloudflare:
1. Riolu (base data)
2. Riolu (base data)
3. Riolu (base data)

API:
1. Riolu (ivs: 31/31/31/31/31/31, nature: Jolly)
2. Riolu (ivs: 30/30/30/30/30/30, nature: Modest)
3. Riolu (ivs: 28/28/28/28/28/28, nature: Timid)

Result:
1. Riolu (base + ivs: 31/31/31/31/31/31, nature: Jolly)
2. Riolu (base + ivs: 30/30/30/30/30/30, nature: Modest)
3. Riolu (base + ivs: 28/28/28/28/28/28, nature: Timid)
```

---

## Workflow: Testing → Production

### Step 1: Configure

Edit the configuration at the top of `scripts/mergeShinyData.js`:

```javascript
const FIELDS_TO_MERGE = ['ivs', 'nature', 'location'];
const USERS_TO_PROCESS = ['hyper', 'Jesse'];
```

### Step 2: Test

Run in test mode to generate output file:

```bash
node scripts/mergeShinyData.js --test
```

### Step 3: Verify

Open `merged_shiny_data.json` and review:
- ✅ Fields are present and correct
- ✅ Pokémon names matched properly
- ✅ Duplicate Pokémon are in correct order
- ✅ All existing data is preserved

### Step 4: Update (Only if test looks good!)

```bash
node scripts/mergeShinyData.js --update
```

The script will:
1. Show a 5-second warning
2. Give you time to cancel with Ctrl+C
3. Update the real database if you don't cancel
4. Confirm the update was successful

### Step 5: Verify in Production

Check the live database to ensure the update worked:
- Visit the admin panel or run a test query
- Spot-check a few users' data
- Verify the merged fields are present

---

## Troubleshooting

### "User 'X' not found in database"

The user exists in the API but not in Cloudflare. The script skips them. This is normal if:
- The user hasn't been added to Cloudflare yet
- The username differs between systems
- The user was removed from Cloudflare

**Solution**: Add the user to `USERS_TO_PROCESS` only if they exist in Cloudflare.

### API returns 0 shinies for a user

Possible causes:
- User has no shinies on ShinyBoard
- Username doesn't match exactly (case-sensitive)
- Network/API issue

**Solution**: Verify the username and check if the user has shinies on ShinyBoard.com

### Merged data looks incomplete

Check that:
1. Field names in `FIELDS_TO_MERGE` match API field names exactly
2. The API is returning data for those fields
3. You're not filtering out important fields

### Database didn't update

Ensure:
1. You ran `--update` mode (not `--test`)
2. You didn't cancel during the 5-second wait
3. The admin endpoint URL is correct
4. You have proper authentication (if needed)

---

## Advanced Usage

### Add a New Field to Merge

1. **Edit configuration** (both files):
   ```javascript
   const FIELDS_TO_MERGE = [
     'ivs',
     'nature',
     'location',
     'MY_NEW_FIELD',  // Add here
   ];
   ```

2. **Test it**:
   ```bash
   node scripts/mergeShinyData.js --test
   ```

3. **Verify in output** that the field appears in `merged_shiny_data.json`

4. **Update if good**:
   ```bash
   node scripts/mergeShinyData.js --update
   ```

### Process a Single User

```bash
node scripts/mergeShinyData.js --test --users hyper
```

### Create Multiple Test Outputs

Modify `OUTPUT_FILE_PATH` in the script or rename outputs after generation.

### Integrate with Automation

The script can be added to a CI/CD pipeline or scheduled task:

```bash
# Cron job (daily at midnight)
0 0 * * * cd /path/to/project && node scripts/mergeShinyData.js --update
```

---

## File Locations

```
project-root/
├── src/hooks/
│   └── useShinyData.js          ← React hook
├── scripts/
│   └── mergeShinyData.js         ← Node.js CLI script
└── merged_shiny_data.json        ← Test output (generated)
```

---

## API Responses

The script fetches from two endpoints:

1. **ShinyBoard API**: `https://shinyboard.net/api/users/{username}/shinies?page=1`
   - Provides detailed shiny information
   - Handles pagination automatically

2. **Cloudflare Worker**: `https://adminpage.hypersmmo.workers.dev/admin/database`
   - Returns all users' shiny showcase data
   - Used as the base for merging

3. **Cloudflare Update**: `https://adminpage.hypersmmo.workers.dev/admin/update-database` (POST)
   - Updates the KV store with merged data
   - Only called in `--update` mode

---

## Questions?

Refer back to the requirements section at the top of this guide or examine:
- [src/hooks/useShinyData.js](./src/hooks/useShinyData.js) - Detailed comments in code
- [scripts/mergeShinyData.js](./scripts/mergeShinyData.js) - CLI implementation
