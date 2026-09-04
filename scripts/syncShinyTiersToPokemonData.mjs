// Syncs shiny_tier/shiny_points in pokemon-data.json from tier_pokemon.json (source of truth), which is
// itself generated from osw-encounter-tiers.json via updateTierPokemonFromOsw.mjs.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tierPokemonPath = path.join(__dirname, '../src/data/tier_pokemon.json');
const tierPointsPath = path.join(__dirname, '../src/data/tier_points.json');
const pokemonDataPath = path.join(__dirname, '../src/data/pokemmo_data/pokemon-data.json');

const tierPokemon = JSON.parse(fs.readFileSync(tierPokemonPath, 'utf8'));
const tierPoints = JSON.parse(fs.readFileSync(tierPointsPath, 'utf8'));
const pokemonData = JSON.parse(fs.readFileSync(pokemonDataPath, 'utf8'));

const speciesTier = {};
for (const [tierName, list] of Object.entries(tierPokemon)) {
  const num = Number(tierName.replace('Tier ', ''));
  for (const name of list) speciesTier[name] = num;
}

let changed = 0;
for (const [key, data] of Object.entries(pokemonData)) {
  const expectedTier = speciesTier[key];
  if (expectedTier === undefined) continue;
  const expectedPoints = tierPoints[`Tier ${expectedTier}`];
  if (data.shiny_tier !== expectedTier || data.shiny_points !== expectedPoints) {
    data.shiny_tier = expectedTier;
    data.shiny_points = expectedPoints;
    changed++;
  }
}

fs.writeFileSync(pokemonDataPath, JSON.stringify(pokemonData, null, 4) + '\n');
console.log(`Updated shiny_tier/shiny_points for ${changed} species.`);
