// ============================================================================
// CONFIGURATION - Easy to modify
// ============================================================================

import React from 'react';

/**
 * Fields to grab from the API and merge into existing Cloudflare data.
 * Easily add or remove fields by modifying this array.
 * Available fields: encounter_count, encounter_method, date_caught, variant,
 *                   nickname, ivs, nature, location, and any others from the API
 */
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

/**
 * Users to fetch and merge data for.
 * Only these users will have their data processed.
 * Add or remove usernames as needed.
 */
const USERS_TO_PROCESS = ['Hyper', 'TTVxleJesse'];

/**
 * Enable/disable file output for testing.
 * When true, writes merged data to a file instead of updating the database.
 * Set to false when ready to update the real database.
 */
const OUTPUT_TO_FILE = true;

/**
 * Output file path (for testing).
 * The merged data will be written here when OUTPUT_TO_FILE is true.
 */
const OUTPUT_FILE_PATH = './merged_shiny_data.json';

// ============================================================================
// API FETCH FUNCTIONS
// ============================================================================

/**
 * Fetches shiny data from the ShinyBoard API for a specific player.
 * Handles pagination automatically.
 * @param {string} playerName - The username to fetch data for
 * @returns {Promise<Array>} Array of shiny objects with API data
 */
export async function grabShinyData(playerName) {
  const results = [];

  async function fetchPage(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
      const data = await response.json();

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

      if (data.next_page_url) {
        await fetchPage(data.next_page_url);
      }
    } catch (error) {
      console.error("Error fetching shinies:", error);
    }
  }

  const initialUrl = `https://shinyboard.net/api/users/${playerName}/shinies?page=1`;
  await fetchPage(initialUrl);

  console.log("All shinies for", playerName, results);
  return results;
}

/**
 * Fetches the entire Cloudflare database.
 * @returns {Promise<Object>} The database object with all users and their shinies
 */
async function fetchCloudflareDatabase() {
  try {
    const response = await fetch('https://adminpage.hypersmmo.workers.dev/admin/database');
    if (!response.ok) throw new Error(`Failed to fetch database: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching Cloudflare database:", error);
    throw error;
  }
}

// ============================================================================
// DATA MERGING LOGIC
// ============================================================================

/**
 * Extracts configurable fields from API data for a specific Pokémon.
 * @param {Object} apiShiny - The shiny object from the API
 * @param {Array<string>} fieldsToMerge - Which fields to extract
 * @returns {Object} Object containing only the specified fields
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
 * Matches Pokémon by name and handles duplicates correctly.
 * @param {Object} cloudflareUserData - User data from Cloudflare (with shinies object)
 * @param {Array} apiShinies - Array of shiny objects from API
 * @param {Array<string>} fieldsToMerge - Which fields to merge
 * @returns {Object} Merged user data with API fields added
 */
function mergeUserData(cloudflareUserData, apiShinies, fieldsToMerge) {
  if (!cloudflareUserData || !cloudflareUserData.shinies) {
    return cloudflareUserData; // Return as-is if no shinies
  }

  // Create a map of Pokémon names to their API data (ordered by appearance)
  const pokemonToApiData = {};
  const pokemonCount = {};

  apiShinies.forEach((apiShiny) => {
    const pokemonName = apiShiny.pokemon_name;
    if (!pokemonName) return;

    // Initialize count if not seen before
    if (!pokemonCount[pokemonName]) {
      pokemonCount[pokemonName] = 0;
      pokemonToApiData[pokemonName] = [];
    }

    // Store each occurrence
    pokemonToApiData[pokemonName][pokemonCount[pokemonName]] = apiShiny;
    pokemonCount[pokemonName]++;
  });

  // Merge: Iterate through Cloudflare shinies and add API data
  const mergedShinies = { ...cloudflareUserData.shinies };

  Object.keys(mergedShinies).forEach((shinyIndex) => {
    const cloudflareShiny = mergedShinies[shinyIndex];
    const pokemonName = cloudflareShiny.Pokemon.toLowerCase();

    // Try to find matching API data
    if (
      pokemonToApiData[pokemonName] &&
      pokemonToApiData[pokemonName].length > 0
    ) {
      // Get the next API shiny for this Pokémon (FIFO order)
      const apiShiny = pokemonToApiData[pokemonName].shift();

      // Extract and merge only configured fields
      const apiFields = extractApiFields(apiShiny, fieldsToMerge);
      mergedShinies[shinyIndex] = {
        ...cloudflareShiny,
        ...apiFields,
      };
    }
  });

  // Return updated user data
  return {
    ...cloudflareUserData,
    shinies: mergedShinies,
  };
}

// ============================================================================
// DATABASE UPDATE & FILE OUTPUT
// ============================================================================

/**
 * Writes data to a local file for testing/verification.
 * @param {Object} data - Data to write to file
 * @param {string} filePath - Path where the file should be written
 */
async function writeToFile(data, filePath) {
  try {
    // Check if we're in a Node.js environment
    if (typeof window === 'undefined' && typeof require !== 'undefined') {
      const fs = require('fs');
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`✓ Data written to ${filePath}`);
    } else {
      // Browser environment - offer download instead
      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'merged_shiny_data.json';
      link.click();
      console.log('✓ Data ready for download');
    }
  } catch (error) {
    console.error('Error writing to file:', error);
  }
}

/**
 * Updates the real Cloudflare database via the admin endpoint.
 * @param {Object} updatedDatabase - The complete updated database object
 */
async function updateCloudflareDatabase(updatedDatabase) {
  try {
    const response = await fetch(
      'https://adminpage.hypersmmo.workers.dev/admin/update-database',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedDatabase),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update database: ${response.status}`);
    }

    console.log('✓ Database updated successfully!');
    return await response.json();
  } catch (error) {
    console.error('Error updating Cloudflare database:', error);
    throw error;
  }
}

// ============================================================================
// MAIN ORCHESTRATION FUNCTION
// ============================================================================

/**
 * Main function that orchestrates the entire merge process.
 * 1. Fetches API data for configured users
 * 2. Fetches Cloudflare database
 * 3. Merges data for each user
 * 4. Either writes to file (for testing) or updates the database
 *
 * @param {Object} options - Configuration options (optional)
 * @param {Array<string>} options.users - Users to process (defaults to USERS_TO_PROCESS)
 * @param {Array<string>} options.fields - Fields to merge (defaults to FIELDS_TO_MERGE)
 * @param {boolean} options.outputToFile - Write to file instead of updating DB
 * @param {string} options.outputPath - Path for output file
 * @returns {Promise<Object>} The merged database
 */
export async function mergeShinyData(options = {}) {
  const {
    users = USERS_TO_PROCESS,
    fields = FIELDS_TO_MERGE,
    outputToFile = OUTPUT_TO_FILE,
    outputPath = OUTPUT_FILE_PATH,
  } = options;

  console.log('🚀 Starting shiny data merge process...');
  console.log(`📋 Processing users: ${users.join(', ')}`);
  console.log(`📦 Fields to merge: ${fields.join(', ')}`);

  try {
    // Step 1: Fetch API data for all users
    console.log('\n📥 Fetching API data...');
    const apiDataMap = {};
    for (const user of users) {
      console.log(`  → Fetching ${user}...`);
      apiDataMap[user] = await grabShinyData(user);
    }

    // Step 2: Fetch Cloudflare database
    console.log('\n📥 Fetching Cloudflare database...');
    const cloudflareDb = await fetchCloudflareDatabase();

    // Step 3: Merge data for each configured user
    console.log('\n🔀 Merging data...');
    const mergedDatabase = { ...cloudflareDb };

    for (const user of users) {
      if (!mergedDatabase[user]) {
        console.log(`  ⚠️  User '${user}' not found in database, skipping...`);
        continue;
      }

      console.log(`  → Merging ${user}...`);
      const userApiData = apiDataMap[user] || [];
      mergedDatabase[user] = mergeUserData(
        mergedDatabase[user],
        userApiData,
        fields
      );
    }

    // Step 4: Handle output (file or database)
    if (outputToFile) {
      console.log('\n💾 Writing to file (TEST MODE)...');
      await writeToFile(mergedDatabase, outputPath);
      console.log('\n✅ Test complete! Review the output file before updating the real database.');
      console.log('   To update the real database, set OUTPUT_TO_FILE = false and run again.');
    } else {
      console.log('\n🔄 Updating real Cloudflare database...');
      await updateCloudflareDatabase(mergedDatabase);
      console.log('\n✅ Database update complete!');
    }

    return mergedDatabase;
  } catch (error) {
    console.error('\n❌ Error during merge process:', error);
    throw error;
  }
}

// ============================================================================
// REACT HOOK (Optional - for use in components)
// ============================================================================

/**
 * React hook for using shiny data merging in components.
 * Returns loading/error states and the merged data.
 */
export function useShinyDataMerge(options = {}) {
  const [state, setState] = React.useState({
    data: null,
    loading: false,
    error: null,
  });

  React.useEffect(() => {
    const fetchAndMerge = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const merged = await mergeShinyData(options);
        setState({ data: merged, loading: false, error: null });
      } catch (error) {
        setState({
          data: null,
          loading: false,
          error: error.message,
        });
      }
    };

    fetchAndMerge();
  }, []);

  return state;
}