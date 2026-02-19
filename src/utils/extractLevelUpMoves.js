// Utility to extract level-up moves from the 'moves' array in pokemon-data.json
export function extractLevelUpMoves(moves) {
  if (!Array.isArray(moves)) return [];
  // Only include moves with type 'level' and a valid level
  return moves
    .filter(m => m.type === 'level' && typeof m.level === 'number')
    .map(m => ({ move: m.name, level: m.level }))
}
