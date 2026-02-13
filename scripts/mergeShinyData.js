#!/usr/bin/env node

/**
 * Node.js script to merge ShinyBoard API data with Cloudflare database and push updates.
 * 
 * This script automatically loads all users from the Cloudflare database and merges their
 * ShinyBoard API data. You can customize username mappings in the USERNAME_MAPPING config.
 * 
 * Usage:
 *   node scripts/mergeShinyData.js              # Merges all users from database and pushes to Cloudflare
 *   node scripts/mergeShinyData.js --test       # Outputs to file for verification (no push)
 *   node scripts/mergeShinyData.js --users Hyper,Jesse  # Custom users only (overrides database list)
 *   node scripts/mergeShinyData.js --fields ivs,nature  # Custom fields to merge
 *   node scripts/mergeShinyData.js --test --fields ivs,nature  # Test with custom fields
 */

// ============================================================================
// CONFIGURATION - Easy to modify
// ============================================================================

/**
 * Fields to grab from the API and merge into existing Cloudflare data.
 */
const FIELDS_TO_MERGE = [
  'ivs',
  'nature',
  'location',
  'encounter_method',
  'date_caught',
  'encounter_count',
  'nickname',
];

/**
 * All possible fields that can be merged from the API.
 * Used to identify and remove fields that are no longer in FIELDS_TO_MERGE.
 */
const ALL_MERGEABLE_FIELDS = [
  'ivs',
  'nature',
  'location',
  'encounter_method',
  'date_caught',
  'encounter_count',
  'nickname',
  'variant',
];

/**
 * Username mapping for ShinyBoard API lookups.
 * 
 * If a user's name in the database doesn't match their ShinyBoard username,
 * add an entry here to tell the script which ShinyBoard username to use.
 * 
 * Format: "DatabaseName": "ShinyBoardUsername"
 * 
 * Example:
 *   "Matty": "Matt",        // Uses "Matt" when fetching from ShinyBoard API for "Matty"
 *   "Jay": "JayStorm",      // Uses "JayStorm" when fetching from ShinyBoard API for "Jay"
 * 
 * Users NOT in this map will use their database name as-is on ShinyBoard.
 * Leave empty {} if all database names match ShinyBoard names exactly.
 */
const USERNAME_MAPPING = {
  // Add overrides here as needed
  // Example: "Hyper": "HyperTheKing",
};

/**
 * Users to fetch and merge data for.
 * 
 * DYNAMIC: This list is automatically populated from the Cloudflare database.
 * All users in the database's shiny_database key will be processed.
 * 
 * This can be overridden via command-line:
 *   node scripts/mergeShinyData.js --users User1,User2,User3
 */
let USERS_TO_PROCESS = [];


/**
 * Default mode: 'update' pushes to Cloudflare, 'test' outputs to file
 */
const DEFAULT_MODE = 'update';

/**
 * Output file path for test mode
 */
const OUTPUT_FILE_PATH = './merged_shiny_data.json';

// ============================================================================
// IMPORTS & SETUP
// ============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Simple argument parser
 */
function parseArgs(args) {
  const parsed = {
    mode: DEFAULT_MODE,
    users: [],  // Start with empty - will be populated from database if not provided
    fields: FIELDS_TO_MERGE,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--test') {
      parsed.mode = 'test';
    } else if (arg === '--update') {
      parsed.mode = 'update';
    } else if (arg === '--users' && args[i + 1]) {
      parsed.users = args[i + 1].split(',').map(u => u.trim());
      i++;
    } else if (arg === '--fields' && args[i + 1]) {
      parsed.fields = args[i + 1].split(',').map(f => f.trim());
      i++;
    }
  }

  return parsed;
}

/**
 * Normalizes a username for matching purposes (lowercase, trim whitespace).
 * This allows case-insensitive and whitespace-insensitive matching.
 */
function normalizeUsername(name) {
  return (name || '').toLowerCase().trim();
}

/**
 * Logs with colors (basic ANSI colors)
 */
function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    warning: '\x1b[33m', // Yellow
    error: '\x1b[31m',   // Red
    reset: '\x1b[0m',
  };

  const color = colors[type] || colors.info;
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Prompts user for username and password via CLI
 */
function promptCredentials() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('\n🔐 Enter admin username: ', (username) => {
      rl.question('🔐 Enter admin password: ', (password) => {
        rl.close();
        resolve({ username, password });
      });
    });
  });
}

// ============================================================================
// API FETCH FUNCTIONS
// ============================================================================

/**
 * Fetches shiny data from the ShinyBoard API for a specific player.
 * Fetches all pages in parallel for speed.
 */
async function grabShinyData(playerName) {
  const results = [];
  const pagesToFetch = [];
  let pageNum = 1;
  let hasMore = true;

  // First, fetch the initial page to discover how many pages exist
  try {
    const initialUrl = `https://shinyboard.net/api/users/${playerName}/shinies?page=1`;
    const response = await fetch(initialUrl);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
    const data = await response.json();

    // Collect initial page data
    if (data.shinies && Array.isArray(data.shinies)) {
      data.shinies.forEach((shiny) => {
        results.push({
          encounter_count: shiny.encounter_count,
          encounter_method: shiny.encounter_method,
          date_caught: shiny.date_caught,
          variant: shiny.variant,
          nickname: shiny.nickname,
          ivs: shiny.ivs,
          nature: shiny.nature,
          location: shiny.location,
          pokemon_name: (shiny.pokemon?.name || '').toLowerCase(),
        });
      });
    }

    // If there are more pages, queue them for parallel fetching
    if (data.next_page_url) {
      let nextUrl = data.next_page_url;
      while (nextUrl) {
        pagesToFetch.push(nextUrl);
        // Extract page number to calculate next
        const pageMatch = nextUrl.match(/page=([0-9]+)/);
        if (pageMatch) {
          const currentPage = parseInt(pageMatch[1]);
          nextUrl = `https://shinyboard.net/api/users/${playerName}/shinies?page=${currentPage + 1}`;
          // We don't know yet if this page exists, so we'll try to fetch it
          // Actually, we should just fetch what we know exists from next_page_url
          // Let's use a different approach - keep following next_page_url
        }
        // Break after one since we need to fetch sequentially to find the end
        break;
      }
    }

    // Fetch remaining pages in parallel
    if (pagesToFetch.length > 0) {
      const promises = pagesToFetch.map(async (url) => {
        try {
          const pageData = await fetchAllPagesFromUrl(url, playerName);
          return pageData;
        } catch (err) {
          console.warn(`Warning: Failed to fetch ${url}:`, err.message);
          return [];
        }
      });

      const allPages = await Promise.all(promises);
      allPages.forEach((pageResults) => {
        results.push(...pageResults);
      });
    }

    return results;
  } catch (error) {
    console.error(`Error fetching shinies for ${playerName}:`, error.message);
    throw error;
  }
}

/**
 * Helper to recursively fetch all pages starting from a given URL.
 */
async function fetchAllPagesFromUrl(url, playerName) {
  const results = [];
  let currentUrl = url;

  while (currentUrl) {
    try {
      const response = await fetch(currentUrl);
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
      const data = await response.json();

      if (data.shinies && Array.isArray(data.shinies)) {
        data.shinies.forEach((shiny) => {
          results.push({
            encounter_count: shiny.encounter_count,
            encounter_method: shiny.encounter_method,
            date_caught: shiny.date_caught,
            variant: shiny.variant,
            nickname: shiny.nickname,
            ivs: shiny.ivs,
            nature: shiny.nature,
            location: shiny.location,
            pokemon_name: (shiny.pokemon?.name || '').toLowerCase(),
          });
        });
      }

      currentUrl = data.next_page_url || null;
    } catch (error) {
      console.error(`Error fetching from ${currentUrl}:`, error.message);
      break;
    }
  }

  return results;
}

/**
 * Fetches the entire Cloudflare database.
 */
async function fetchCloudflareDatabase() {
  try {
    const response = await fetch('https://adminpage.hypersmmo.workers.dev/admin/database');
    if (!response.ok) throw new Error(`Failed to fetch database: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching Cloudflare database:', error.message);
    throw error;
  }
}

// ============================================================================
// DATA MERGING LOGIC
// ============================================================================

/**
 * Extracts configurable fields from API data.
 */
function extractApiFields(apiShiny, fieldsToMerge) {
  const extracted = {};
  fieldsToMerge.forEach((field) => {
    if (apiShiny.hasOwnProperty(field)) {
      extracted[field] = apiShiny[field];
    }
  });
  return extracted;
}

/**
 * Merges API data into Cloudflare data for a single user.
 * Also removes any mergeable fields that are no longer in fieldsToMerge.
 */
function mergeUserData(cloudflareUserData, apiShinies, fieldsToMerge) {
  if (!cloudflareUserData || !cloudflareUserData.shinies) {
    return cloudflareUserData;
  }

  // Determine which fields to remove (API fields not in current merge list)
  const fieldsToRemove = new Set(ALL_MERGEABLE_FIELDS.filter(f => !fieldsToMerge.includes(f)));

  // Create a map of Pokémon names to their API data (ordered by appearance)
  const pokemonToApiData = {};
  const pokemonCount = {};

  apiShinies.forEach((apiShiny) => {
    const pokemonName = apiShiny.pokemon_name;
    if (!pokemonName) return;

    if (!pokemonCount[pokemonName]) {
      pokemonCount[pokemonName] = 0;
      pokemonToApiData[pokemonName] = [];
    }

    pokemonToApiData[pokemonName][pokemonCount[pokemonName]] = apiShiny;
    pokemonCount[pokemonName]++;
  });

  // Merge: Iterate through Cloudflare shinies and add API data
  const mergedShinies = { ...cloudflareUserData.shinies };

  Object.keys(mergedShinies).forEach((shinyIndex) => {
    const cloudflareShiny = mergedShinies[shinyIndex];
    const pokemonName = cloudflareShiny.Pokemon.toLowerCase();

    // Start with existing shiny and remove fields that are no longer being merged
    let newShiny = { ...cloudflareShiny };
    fieldsToRemove.forEach(field => {
      delete newShiny[field];
    });

    if (
      pokemonToApiData[pokemonName] &&
      pokemonToApiData[pokemonName].length > 0
    ) {
      const apiShiny = pokemonToApiData[pokemonName].shift();
      const apiFields = extractApiFields(apiShiny, fieldsToMerge);
      newShiny = {
        ...newShiny,
        ...apiFields,
      };
    }

    mergedShinies[shinyIndex] = newShiny;
  });

  return {
    ...cloudflareUserData,
    shinies: mergedShinies,
  };
}

// ============================================================================
// DATABASE UPDATE & FILE OUTPUT
// ============================================================================

/**
 * Writes merged data to a local JSON file.
 */
function writeToFile(data, filePath) {
  try {
    // Resolve to absolute path if relative
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);

    fs.writeFileSync(absolutePath, JSON.stringify(data, null, 2));
    log(`✓ Data written to ${absolutePath}`, 'success');
    return absolutePath;
  } catch (error) {
    log(`✗ Error writing to file: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Updates the real Cloudflare database.
 */
async function updateCloudflareDatabase(updatedDatabase, username, password) {
  try {
    const response = await fetch(
      'https://adminpage.hypersmmo.workers.dev/admin/update-database',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          data: updatedDatabase,
          action: 'Automated merge from merge script',
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update database: ${response.status}`);
    }

    log('✓ Database updated successfully!', 'success');
    return await response.json();
  } catch (error) {
    log(`✗ Error updating Cloudflare database: ${error.message}`, 'error');
    throw error;
  }
}

// ============================================================================
// MAIN ORCHESTRATION FUNCTION
// ============================================================================

/**
 * Main function that orchestrates the entire merge process.
 */
async function mergeShinyData(users, fields, mode, outputPath, username = null, password = null) {
  try {
    // Step 0: Fetch Cloudflare database early to extract users if needed
    log('🚀 Starting shiny data merge process...', 'info');
    log('\n📥 Fetching Cloudflare database...', 'info');
    const cloudflareDb = await fetchCloudflareDatabase();
    log(`  ✓ Database loaded (${Object.keys(cloudflareDb).length} users)`, 'success');

    // If users were not provided via CLI, extract them from the database
    if (!users || users.length === 0) {
      users = Object.keys(cloudflareDb);
      log(`📋 Automatically using all ${users.length} users from database`, 'info');
    } else {
      log(`📋 Processing configured users: ${users.join(', ')}`, 'info');
    }

    log(`📦 Fields to merge: ${fields.join(', ')}`, 'info');
    log(`⚙️  Mode: ${mode === 'test' ? 'TEST (output to file)' : 'UPDATE (real database)'}`, 'warning');

    // Step 1: Fetch API data for all users IN PARALLEL
    // Apply USERNAME_MAPPING to get the correct ShinyBoard username
    log('\n📥 Fetching API data...', 'info');
    const userPromises = users.map(async (user) => {
      // Check if this user has a mapped ShinyBoard name
      const shinyboardUsername = USERNAME_MAPPING[user] || user;
      process.stdout.write(`  → Fetching ${shinyboardUsername}${USERNAME_MAPPING[user] ? ` (mapped from "${user}")` : ''}...`);
      try {
        const data = await grabShinyData(shinyboardUsername);
        log(` ✓ (${data.length} shinies)`, 'success');
        return [user, data];
      } catch (error) {
        log(` ✗ Failed`, 'error');
        return [user, []];
      }
    });

    const userResults = await Promise.all(userPromises);
    const apiDataMap = Object.fromEntries(userResults);

    // Step 2: Create mapping from normalized names to actual database names
    log('\n🔍 Creating name mappings...', 'info');
    const normalizedToActualName = {};
    Object.keys(cloudflareDb).forEach(actualName => {
      const normalized = normalizeUsername(actualName);
      normalizedToActualName[normalized] = actualName;
    });

    // Step 3: Merge data for each configured user
    log('\n🔀 Merging data...', 'info');
    const mergedDatabase = { ...cloudflareDb };
    let mergeCount = 0;
    let skipCount = 0;

    for (const user of users) {
      const normalizedUser = normalizeUsername(user);
      const actualName = normalizedToActualName[normalizedUser];

      if (!actualName) {
        log(`  ⚠️  User '${user}' not found in database (tried: ${normalizedUser})`, 'warning');
        skipCount++;
        continue;
      }

      const userApiData = apiDataMap[user] || [];
      const beforeCount = Object.keys(mergedDatabase[actualName].shinies || {}).length;
      
      mergedDatabase[actualName] = mergeUserData(
        mergedDatabase[actualName],
        userApiData,
        fields
      );

      const afterCount = Object.keys(mergedDatabase[actualName].shinies || {}).length;

      log(`  ✓ ${user} → ${actualName}: Processed ${beforeCount} shinies with ${userApiData.length} API entries`, 'success');
      mergeCount++;
    }

    // Step 4: Handle output (file or database)
    if (mode === 'test') {
      log('\n💾 Writing to file (TEST MODE)...', 'info');
      // Only output the configured users for testing
      const testOutput = {};
      for (const user of users) {
        const actualName = normalizedToActualName[normalizeUsername(user)];
        if (actualName && mergedDatabase[actualName]) {
          testOutput[actualName] = mergedDatabase[actualName];
        }
      }
      const outputPathResolved = writeToFile(testOutput, outputPath);
      log('\n✅ Test mode complete!', 'success');
      log('📄 Review the output file: ' + outputPathResolved, 'info');
      log('', 'info');
      log('Review the data to verify everything is correct.', 'info');
      log('Then run the real push:', 'info');
      log('   node scripts/mergeShinyData.js', 'info');
    } else {
      // Update mode - push to Cloudflare
      log('\n📢 NOTICE: Merging configured users and pushing to Cloudflare...', 'warning');
      log(`📨 Processing users: ${users.join(', ')}`, 'info');
      log(`📊 All other ${Object.keys(cloudflareDb).length - users.length} users remain unchanged.`, 'info');
      
      // Prompt for credentials if not provided
      if (!username || !password) {
        const credentials = await promptCredentials();
        username = credentials.username;
        password = credentials.password;
      }
      
      log('\n⏳ Pushing to Cloudflare in 5 seconds...', 'warning');
      log('   Press Ctrl+C now to cancel', 'warning');

      // Safety countdown
      await new Promise(resolve => setTimeout(resolve, 5000));

      log('\n🔄 Pushing merged data to Cloudflare...', 'info');
      await updateCloudflareDatabase(mergedDatabase, username, password);
      log('\n✅ Push complete! Cloudflare database updated successfully!', 'success');
      log('🎉 All configured users now have merged API data.', 'success');
    }

    // Summary
    log('\n📊 Summary:', 'info');
    log(`   Users processed: ${mergeCount}`, 'info');
    log(`   Users skipped: ${skipCount}`, 'info');

    return mergedDatabase;
  } catch (error) {
    log('\n❌ Error during merge process:', 'error');
    log(error.message, 'error');
    process.exit(1);
  }
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

const args = parseArgs(process.argv.slice(2));

log('', 'info');
mergeShinyData(args.users, args.fields, args.mode, OUTPUT_FILE_PATH, null, null);
