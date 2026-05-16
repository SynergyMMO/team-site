const FIELDS_TO_MERGE = [
  'ivs',
  'nature',
  'location',
  'encounter_method',
  'date_caught',
  'encounter_count',
  'nickname',
];

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

const LEGACY_FIELDS_BY_CANONICAL_FIELD = {
  location: ['Location'],
  encounter_method: ['Encounter Type'],
  encounter_count: ['Encounter Count'],
};

const USERNAME_MAPPING = {

};

let USERS_TO_PROCESS = [];


const DEFAULT_MODE = 'update';

const OUTPUT_FILE_PATH = './merged_shiny_data.json';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import pokemonData from '../src/data/pokemmo_data/pokemon-data.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parseArgs(args) {
  const parsed = {
    mode: DEFAULT_MODE,
    users: [],
    fields: FIELDS_TO_MERGE,
  };

  // First, check for npm_config_user (set by npm run on Windows)
  if (process.env.npm_config_user) {
    parsed.users = [process.env.npm_config_user.trim()];
  }

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
    } else if (arg === '--user' && args[i + 1]) {
      parsed.users = [args[i + 1].trim()];
      i++;
    } else if (arg.startsWith('--user=')) {
      parsed.users = [arg.split('=')[1].trim()];
    }
  }

  return parsed;
}

function normalizeUsername(name) {
  return (name || '').toLowerCase().trim();
}

function normalizePokemonName(name) {
  if (!name) return name;

  let normalized = name.toLowerCase().trim();

  normalized = normalized
    .replace('♀', '-f')
    .replace('♂', '-m');

  const suffixMatch = normalized.match(/-[a-z]+$/i);
  if (suffixMatch) {
    const baseName = normalized.replace(/-[a-z]+$/i, '');
    if (baseName && baseName.length > 1) {
      normalized = baseName;
    }
  }

  return normalized;
}

function collectEvolutionChainNames(chainNode, names = []) {
  if (!chainNode) return names;

  if (chainNode.species?.name) {
    names.push(chainNode.species.name);
  }

  (chainNode.evolves_to || []).forEach((nextNode) => {
    collectEvolutionChainNames(nextNode, names);
  });

  return names;
}

function buildEvolutionGroups() {
  const groups = {};

  Object.values(pokemonData).forEach((pokemon) => {
    const chainNames = collectEvolutionChainNames(pokemon.evolution_chain?.chain)
      .map(normalizePokemonName)
      .filter(Boolean);

    if (chainNames.length === 0) return;

    const group = new Set(chainNames);
    chainNames.forEach((name) => {
      groups[name] = group;
    });
  });

  return groups;
}

const EVOLUTION_GROUPS = buildEvolutionGroups();

function getEvolutionGroup(name) {
  const normalizedName = normalizePokemonName(name);
  return EVOLUTION_GROUPS[normalizedName] || new Set([normalizedName]);
}


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

async function grabShinyData(playerName) {
  const results = [];
  let currentUrl = `https://shinyboard.net/api/users/${encodeURIComponent(playerName)}/shinies?page=1`;

  try {
    while (currentUrl) {
      const response = await fetch(currentUrl);
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
      const data = await response.json();

      if (data.shinies && Array.isArray(data.shinies)) {
        data.shinies.forEach((shiny) => {
          results.push(normalizeApiShiny(shiny, results.length));
        });
      }

      currentUrl = data.next_page_url || null;
    }

    return results;
  } catch (error) {
    console.error(`Error fetching shinies for ${playerName}:`, error.message);
    throw error;
  }
}

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
          results.push(normalizeApiShiny(shiny, results.length));
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

function normalizeApiShiny(shiny, apiIndex) {
  return {
    encounter_count: shiny.encounter_count,
    encounter_method: shiny.encounter_method,
    date_caught: shiny.date_caught,
    variant: shiny.variant,
    nickname: shiny.nickname,
    ivs: shiny.ivs,
    nature: shiny.nature,
    location: shiny.location,
    pokemon_id: shiny.pokemon_id ?? shiny.pokemon?.id ?? null,
    pokemon_name: (shiny.pokemon?.name || '').toLowerCase(),
    api_index: apiIndex,
  };
}

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

function extractApiFields(apiShiny, fieldsToMerge) {
  const extracted = {};
  fieldsToMerge.forEach((field) => {
    if (apiShiny.hasOwnProperty(field)) {
      extracted[field] = apiShiny[field];
    }
  });

  if (fieldsToMerge.includes('date_caught') && apiShiny.date_caught) {
    const caughtDateParts = getCaughtDateParts(apiShiny.date_caught);
    if (caughtDateParts) {
      extracted.Month = caughtDateParts.month;
      extracted.Year = caughtDateParts.year;
    }
  }

  return extracted;
}

function getCaughtDateParts(dateCaught) {
  const match = String(dateCaught).match(/^(\d{4})-(\d{2})-/);
  if (!match) return null;

  const monthIndex = Number(match[2]) - 1;
  const month = MONTH_NAMES[monthIndex];
  if (!month) return null;

  return {
    month,
    year: match[1],
  };
}

function applyApiFields(cloudflareShiny, apiShiny, fieldsToMerge, fieldsChanged) {
  const apiFields = extractApiFields(apiShiny, fieldsToMerge);

  Object.keys(apiFields).forEach(field => {
    const oldValue = cloudflareShiny[field];
    const newValue = apiFields[field];

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      fieldsChanged.push(field);
    }
  });

  return apiFields;
}

function findBestApiMatch(apiShinies, matchedApiIndexes, cloudflarePokemonName, cloudflareIndex) {
  const normalizedCloudflareName = normalizePokemonName(cloudflarePokemonName);
  const cloudflareGroup = getEvolutionGroup(cloudflarePokemonName);
  const unmatchedApiShinies = apiShinies.filter(apiShiny => !matchedApiIndexes.has(apiShiny.api_index));
  const compatibleMatches = unmatchedApiShinies
    .map((apiShiny) => {
      const apiName = normalizePokemonName(apiShiny.pokemon_name);
      const exactMatch = apiName === normalizedCloudflareName;
      const evolutionMatch = apiName && cloudflareGroup.has(apiName);

      if (!exactMatch && !evolutionMatch) return null;

      const distance = Math.abs(apiShiny.api_index - cloudflareIndex);
      return {
        apiShiny,
        score: (distance * 2) + (exactMatch ? 0 : 1),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score || a.apiShiny.api_index - b.apiShiny.api_index);

  return compatibleMatches[0]?.apiShiny || null;
}

function mergeUserData(cloudflareUserData, apiShinies, fieldsToMerge) {
  if (!cloudflareUserData || !cloudflareUserData.shinies) {
    return {
      userData: cloudflareUserData,
      changes: []
    };
  }

  const fieldsToRemove = new Set(ALL_MERGEABLE_FIELDS.filter(f => !fieldsToMerge.includes(f)));
  const legacyFieldsToRemove = new Set();
  fieldsToMerge.forEach((field) => {
    (LEGACY_FIELDS_BY_CANONICAL_FIELD[field] || []).forEach((legacyField) => {
      legacyFieldsToRemove.add(legacyField);
    });
  });

  const matchedApiIndexes = new Set();

  const mergedShinies = { ...cloudflareUserData.shinies };
  const changeLog = [];
  const shinyKeys = Object.keys(mergedShinies);

  shinyKeys.forEach((shinyIndex, cloudflareIndex) => {
    const cloudflareShiny = mergedShinies[shinyIndex];
    let newShiny = { ...cloudflareShiny };
    let fieldsChanged = [];

    fieldsToRemove.forEach(field => {
      if (newShiny.hasOwnProperty(field)) {
        fieldsChanged.push(`removed ${field}`);
        delete newShiny[field];
      }
    });

    const apiShiny = findBestApiMatch(
      apiShinies,
      matchedApiIndexes,
      cloudflareShiny.Pokemon,
      cloudflareIndex
    );

    if (apiShiny) {
      matchedApiIndexes.add(apiShiny.api_index);
      const apiFields = applyApiFields(cloudflareShiny, apiShiny, fieldsToMerge, fieldsChanged);

      newShiny = {
        ...newShiny,
        ...apiFields,
      };

      legacyFieldsToRemove.forEach(field => {
        if (newShiny.hasOwnProperty(field)) {
          fieldsChanged.push(`removed ${field}`);
          delete newShiny[field];
        }
      });
    }

    if (fieldsChanged.length > 0) {
      changeLog.push({
        pokemon: cloudflareShiny.Pokemon,
        fields: fieldsChanged
      });
    }

    mergedShinies[shinyIndex] = newShiny;
  });

  return {
    userData: {
      ...cloudflareUserData,
      shinies: mergedShinies,
    },
    changes: changeLog
  };
}

// ============================================================================
// DATABASE UPDATE & FILE OUTPUT
// ============================================================================

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

async function mergeShinyData(users, fields, mode, outputPath, username = null, password = null) {
  try {
    // Step 0: Fetch Cloudflare database early to extract users if needed
    log('🚀 Starting shiny data merge process...', 'info');
    log('\n📥 Fetching Cloudflare database...', 'info');
    const cloudflareDb = await fetchCloudflareDatabase();
    log(`  ✓ Database loaded (${Object.keys(cloudflareDb).length} users)`, 'success');

    // If users were not provided via CLI, extract them from the database
    if (!users || users.length === 0) {
      let allUsers = Object.keys(cloudflareDb);
      if (mode === 'test') {
        users = allUsers.slice(0, 5);
        log(`📋 TEST MODE: Using top 5 users from database: ${users.join(', ')}`, 'info');
      } else {
        users = allUsers;
        log(`📋 Automatically using all ${users.length} users from database`, 'info');
      }
    } else {
      log(`📋 Processing configured users: ${users.join(', ')}`, 'info');
    }

    log(`📦 Fields to merge: ${fields.join(', ')}`, 'info');
    log(`⚙️  Mode: ${mode === 'test' ? 'TEST (output to file)' : 'UPDATE (real database)'}`, 'warning');

    log('\n📥 Fetching API data...', 'info');
    const userPromises = users.map(async (user) => {
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
    log('\n🔍 Creating name mappings...', 'info');
    const normalizedToActualName = {};
    Object.keys(cloudflareDb).forEach(actualName => {
      const normalized = normalizeUsername(actualName);
      normalizedToActualName[normalized] = actualName;
    });

    log('\n🔀 Merging data...', 'info');
    const mergedDatabase = { ...cloudflareDb };
    let mergeCount = 0;
    let skipCount = 0;
    let totalChangedPokemon = 0;
    const changesByUser = {};

    for (const user of users) {
      const normalizedUser = normalizeUsername(user);
      const actualName = normalizedToActualName[normalizedUser];

      if (!actualName) {
        log(`  ⚠️  User '${user}' not found in database (tried: ${normalizedUser})`, 'warning');
        skipCount++;
        continue;
      }

      const userApiData = apiDataMap[user] || [];
      
      const mergeResult = mergeUserData(
        mergedDatabase[actualName],
        userApiData,
        fields
      );

      mergedDatabase[actualName] = mergeResult.userData;
      const changes = mergeResult.changes;
      
      if (changes.length > 0) {
        changesByUser[actualName] = changes;
        totalChangedPokemon += changes.length;
        log(`  ✓ ${actualName}: ${changes.length} Pokémon updated`, 'success');
        
        changes.forEach(change => {
          log(`     → ${change.pokemon}: ${change.fields.join(', ')}`, 'info');
        });
      } else {
        log(`  ✓ ${actualName}: No changes`, 'info');
      }
      
      mergeCount++;
    }

    if (mode === 'test') {
      log('\n💾 Writing to file (TEST MODE)...', 'info');
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
      log('\n📢 NOTICE: Merging configured users and pushing to Cloudflare...', 'warning');
      log(`📨 Processing users: ${users.join(', ')}`, 'info');
      log(`📊 All other ${Object.keys(cloudflareDb).length - users.length} users remain unchanged.`, 'info');
      if (!username || !password) {
        const credentials = await promptCredentials();
        username = credentials.username;
        password = credentials.password;
      }
      
      log('\n⏳ Pushing to Cloudflare in 5 seconds...', 'warning');
      log('   Press Ctrl+C now to cancel', 'warning');

      await new Promise(resolve => setTimeout(resolve, 5000));

      log('\n🔄 Pushing merged data to Cloudflare...', 'info');
      await updateCloudflareDatabase(mergedDatabase, username, password);
      log('\n✅ Push complete! Cloudflare database updated successfully!', 'success');
      log('🎉 All configured users now have merged API data.', 'success');
    }

    log('\n📊 Summary:', 'info');
    log(`   Users processed: ${mergeCount}`, 'info');
    log(`   Users skipped: ${skipCount}`, 'info');
    log(`   Total Pokémon with changes: ${totalChangedPokemon}`, 'success');
    
    if (totalChangedPokemon > 0) {
      log('\n📝 Change Details by User:', 'info');
      Object.keys(changesByUser).forEach(userName => {
        const changes = changesByUser[userName];
        log(`   ${userName} (${changes.length} Pokémon):`, 'success');
        changes.forEach(change => {
          log(`     • ${change.pokemon}: ${change.fields.join(', ')}`, 'info');
        });
      });
    } else {
      log('   No Pokémon data was changed', 'info');
    }

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
if (args.users && args.users.length > 0) {
  log(`Merging data for user(s): ${args.users.join(', ')}`, 'info');
}
mergeShinyData(args.users, args.fields, args.mode, OUTPUT_FILE_PATH, null, null);
