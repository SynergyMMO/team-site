// Utility to get a Pokémon's data from pokemon-data.json by name (case-insensitive)
export function getPokemonDataByName(name, pokemonData) {
  if (!name || !pokemonData) return null;
  // Try exact match, then lowercased
  return (
    pokemonData[name] ||
    pokemonData[name.toLowerCase()] ||
    pokemonData[name.replace(/\s/g, '').toLowerCase()] ||
    null
  );
}
