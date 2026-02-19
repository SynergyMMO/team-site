// Utility to get the last 4 level-up moves at or before a given level for a Pokémon
// Usage: getLevelUpMoveset(pokemonData, 30)
export function getLevelUpMoveset(pokemonData, level = 30) {
  if (!pokemonData || !pokemonData.level_up_moves) return [];
  // level_up_moves: [{ move: 'Tackle', level: 1 }, ...]
  const moves = pokemonData.level_up_moves
    .filter(m => m.level <= level)
    .sort((a, b) => b.level - a.level || b.move.localeCompare(a.move));
  // Get last 4 unique moves (by move name)
  const seen = new Set();
  const result = [];
  for (const m of moves) {
    if (!seen.has(m.move)) {
      result.push(m);
      seen.add(m.move);
    }
    if (result.length === 4) break;
  }
  // Return in ascending order (oldest first)
  return result.reverse();
}
