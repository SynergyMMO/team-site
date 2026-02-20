// Utility to get a Pokémon's data from pokemon-data.json by name (case-insensitive)
// Normalization logic copied from useCatchCalcs.js
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getPokemonDataByName(name, pokemonData) {
  if (!name || !pokemonData) return null;
  let key = name.toLowerCase();
  if (pokemonData[key]) {
    return pokemonData[key];
  }
  key = normalizeName(name);
  if (pokemonData[key]) {
    return pokemonData[key];
  }
  // Try searching for displayName match
  for (const pokeKey in pokemonData) {
    if (
      pokemonData[pokeKey].displayName &&
      pokemonData[pokeKey].displayName.toLowerCase() === name.toLowerCase()
    ) {
      return pokemonData[pokeKey];
    }
  }
  return null;
}
