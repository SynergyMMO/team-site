import fs from 'fs';
import path from 'path';

function parseArgs(args) {
  const options = { user: '', output: '' };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--user' && args[index + 1]) {
      options.user = args[index + 1].trim();
      index += 1;
    } else if (arg.startsWith('--user=')) {
      options.user = arg.slice('--user='.length).trim();
    } else if (arg === '--output' && args[index + 1]) {
      options.output = args[index + 1].trim();
      index += 1;
    } else if (arg.startsWith('--output=')) {
      options.output = arg.slice('--output='.length).trim();
    }
  }

  return options;
}

async function fetchShinyNames(playerName) {
  const names = [];
  let currentUrl = `https://shinyboard.net/api/users/${encodeURIComponent(playerName)}/shinies?page=1`;

  while (currentUrl) {
    const response = await fetch(currentUrl);
    if (!response.ok) {
      throw new Error(`ShinyBoard returned ${response.status} while fetching ${currentUrl}`);
    }

    const data = await response.json();
    if (Array.isArray(data.shinies)) {
      data.shinies.forEach((shiny) => {
        const name = shiny.pokemon?.name || shiny.pokemon_name || shiny.name;
        if (name) names.push(name);
      });
    }

    currentUrl = data.next_page_url || null;
  }

  return names;
}

function defaultOutputPath(playerName) {
  const safeName = playerName.replace(/[^a-z0-9_-]/gi, '_') || 'user';
  return path.join(process.cwd(), `${safeName}-shiny-list.txt`);
}

async function main() {
  const { user, output } = parseArgs(process.argv.slice(2));

  if (!user) {
    console.error('Usage: node scripts/generateShinyList.js --user <ShinyBoard username> [--output <file.txt>]');
    process.exitCode = 1;
    return;
  }

  console.log(`Fetching ShinyBoard profile for ${user}...`);
  const shinyNames = await fetchShinyNames(user);
  const outputPath = path.resolve(output || defaultOutputPath(user));

  // This script deliberately only writes the local text file; it never calls the site database.
  fs.writeFileSync(outputPath, shinyNames.join(', '), 'utf8');
  console.log(`Wrote ${shinyNames.length} shinies to ${outputPath}`);
}

main().catch((error) => {
  console.error(`Could not generate shiny list: ${error.message}`);
  process.exitCode = 1;
});
