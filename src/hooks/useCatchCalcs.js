
import { useCallback } from 'react';
import { useInGameClock } from './useInGameclock';
import pokemonData from '../data/pokemmo_data/pokemon-data.json';

/**
 * Utility to normalize Pokémon names for lookup in pokemon-data.json
 * @param {string} name
 * @returns {string}
 */
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Get the catch rate for a Pokémon by name from pokemon-data.json
 * @param {string} name
 * @returns {number|null} catch rate or null if not found
 */
export function getCatchRateByName(name) {
  if (!name) return null;
  // Try direct match, then normalized
  let key = name.toLowerCase();
  if (pokemonData[key] && typeof pokemonData[key].capture_rate === 'number') {
    return pokemonData[key].capture_rate;
  }
  key = normalizeName(name);
  if (pokemonData[key] && typeof pokemonData[key].capture_rate === 'number') {
    return pokemonData[key].capture_rate;
  }
  // Try searching for displayName match
  for (const pokeKey in pokemonData) {
    if (
      pokemonData[pokeKey].displayName &&
      pokemonData[pokeKey].displayName.toLowerCase() === name.toLowerCase()
    ) {
      return pokemonData[pokeKey].capture_rate;
    }
  }
  return null;
}

// Usage: For LNY event Pokémon, use getCatchRateByName(pokemonName) to get the catch rate.

/**
 * Calculate catch rate percentage for a given ball and HP condition
 * Gen 5 Formula: A = ((3 × MaxHP - 2 × CurrentHP) / (3 × MaxHP)) × BallRate × CatchRate × Status
 * @param {number} catchRate - Base catch rate (0-255)
 * @param {number} ballRate - Ball multiplier (e.g., 1.0 for Pokéball, 2.0 for Ultra Ball)
 * @param {number} hpPercent - Current HP as percentage (0-100)
 * @param {number} statusModifier - Status modifier (1.0 for no status, 1.5 for poison/burn/paralysis, 2.0 for sleep/freeze)
 * @param {number} level - Pokémon level (default 30)
 * @returns {number} Catch percentage (0-100)
 */
function calculateCatchChance(catchRate, ballRate, hpPercent, statusModifier = 1.0, level = 30) {
  const baseHP = 70;
  const IV = 31;
  const EV = 0;
  const nature = 1.0;
  const maxHP = Math.floor((((2 * baseHP + IV + Math.floor(EV / 4)) * level) / 100 + level + 10) * nature);
  const currentHP = Math.floor((hpPercent / 100) * maxHP);
  const hpMultiplier = (3 * maxHP - 2 * currentHP) / (3 * maxHP);
  let captureValue = Math.floor(hpMultiplier * ballRate * catchRate * statusModifier);
  captureValue = Math.min(255, captureValue);
  return (captureValue / 255) * 100;
}

/**
 * @param {number} catchRate
 * @param {number} level 
 */
function calculateBestCatchMethod(catchRate, level = 30) {
  const ballCosts = {
    'Pokéball': 1,
    'Great Ball': 1.5,
    'Ultra Ball': 2,
    'Quick Ball': 2.25,
    'Dusk Ball': 2.5,
  };
  const methods = [
    { ball: 'Pokéball', ballRate: 1.0, hp: 100, turns: 0, statusMod: 1.0 },
    { ball: 'Pokéball', ballRate: 1.0, hp: 1, turns: 1, statusMod: 1.0 },
    { ball: 'Pokéball', ballRate: 1.0, hp: 100, turns: 1, statusMod: 2.0 },
    { ball: 'Pokéball', ballRate: 1.0, hp: 1, turns: 2, statusMod: 2.0 },
    { ball: 'Great Ball', ballRate: 1.5, hp: 100, turns: 0, statusMod: 1.0 },
    { ball: 'Great Ball', ballRate: 1.5, hp: 1, turns: 1, statusMod: 1.0 },
    { ball: 'Great Ball', ballRate: 1.5, hp: 100, turns: 1, statusMod: 2.0 },
    { ball: 'Great Ball', ballRate: 1.5, hp: 1, turns: 2, statusMod: 2.0 },
    { ball: 'Ultra Ball', ballRate: 2.0, hp: 100, turns: 0, statusMod: 1.0 },
    { ball: 'Ultra Ball', ballRate: 2.0, hp: 1, turns: 1, statusMod: 1.0 },
    { ball: 'Ultra Ball', ballRate: 2.0, hp: 100, turns: 1, statusMod: 2.0 },
    { ball: 'Ultra Ball', ballRate: 2.0, hp: 1, turns: 2, statusMod: 2.0 },
    { ball: 'Quick Ball', ballRate: 5.0, hp: 100, turns: 0, statusMod: 1.0 },
    { ball: 'Quick Ball', ballRate: 1.0, hp: 1, turns: 1, statusMod: 1.0 },
    { ball: 'Quick Ball', ballRate: 1.0, hp: 100, turns: 1, statusMod: 2.0 },
    { ball: 'Quick Ball', ballRate: 1.0, hp: 1, turns: 2, statusMod: 2.0 },
    { ball: 'Dusk Ball', ballRate: 3.5, hp: 100, turns: 0, statusMod: 1.0 },
    { ball: 'Dusk Ball', ballRate: 3.5, hp: 1, turns: 1, statusMod: 1.0 },
    { ball: 'Dusk Ball', ballRate: 3.5, hp: 100, turns: 1, statusMod: 2.0 },
    { ball: 'Dusk Ball', ballRate: 3.5, hp: 1, turns: 2, statusMod: 2.0 },
  ];
  let bestMethod = null;
  let secondBestMethod = null;
  let bestScore = -Infinity;
  let secondBestScore = -Infinity;
  methods.forEach(method => {
    const catchChance = calculateCatchChance(catchRate, method.ballRate, method.hp, method.statusMod, level);
    const costFactor = ballCosts[method.ball];
    const score = catchChance / (method.turns + costFactor);
    if (score > bestScore) {
      secondBestScore = bestScore;
      secondBestMethod = bestMethod;
      bestScore = score;
      bestMethod = {
        ...method,
        catchChance,
        score,
        hpLabel: method.hp === 100 ? '100% HP' : '1% HP',
        statusLabel: method.statusMod === 2.0 ? 'Sleep' : 'Normal'
      };
    } else if (score > secondBestScore) {
      secondBestScore = score;
      secondBestMethod = {
        ...method,
        catchChance,
        score,
        hpLabel: method.hp === 100 ? '100% HP' : '1% HP',
        statusLabel: method.statusMod === 2.0 ? 'Sleep' : 'Normal'
      };
    }
  });
  return { bestMethod, secondBestMethod };
}

function getTopBalls(catchRate, level = 30, periodOverride) {
  const { bestMethod, secondBestMethod } = calculateBestCatchMethod(catchRate, level) || {};
  // Determine if Dusk Ball should be disabled
  let isNight = false;
  if (typeof periodOverride === 'string') {
    isNight = periodOverride === 'Night';
  } else {
    // fallback: try to use useInGameClock (for React usage)
    try {
      const clock = useInGameClock();
      isNight = clock.period === 'Night';
    } catch (e) {
      isNight = false;
    }
  }
  // If not night, always return the best and 2nd best non-Dusk Ball options
  if (!isNight) {
    // Get all methods, filter out Dusk Ball, sort by score
    const allMethods = [];
    const ballCosts = {
      'Pokéball': 1,
      'Great Ball': 1.5,
      'Ultra Ball': 2,
      'Quick Ball': 2.25,
      'Dusk Ball': 2.5,
    };
    const methods = [
      { ball: 'Pokéball', ballRate: 1.0, hp: 100, turns: 0, statusMod: 1.0 },
      { ball: 'Pokéball', ballRate: 1.0, hp: 1, turns: 1, statusMod: 1.0 },
      { ball: 'Pokéball', ballRate: 1.0, hp: 100, turns: 1, statusMod: 2.0 },
      { ball: 'Pokéball', ballRate: 1.0, hp: 1, turns: 2, statusMod: 2.0 },
      { ball: 'Great Ball', ballRate: 1.5, hp: 100, turns: 0, statusMod: 1.0 },
      { ball: 'Great Ball', ballRate: 1.5, hp: 1, turns: 1, statusMod: 1.0 },
      { ball: 'Great Ball', ballRate: 1.5, hp: 100, turns: 1, statusMod: 2.0 },
      { ball: 'Great Ball', ballRate: 1.5, hp: 1, turns: 2, statusMod: 2.0 },
      { ball: 'Ultra Ball', ballRate: 2.0, hp: 100, turns: 0, statusMod: 1.0 },
      { ball: 'Ultra Ball', ballRate: 2.0, hp: 1, turns: 1, statusMod: 1.0 },
      { ball: 'Ultra Ball', ballRate: 2.0, hp: 100, turns: 1, statusMod: 2.0 },
      { ball: 'Ultra Ball', ballRate: 2.0, hp: 1, turns: 2, statusMod: 2.0 },
      { ball: 'Quick Ball', ballRate: 5.0, hp: 100, turns: 0, statusMod: 1.0 },
      { ball: 'Quick Ball', ballRate: 1.0, hp: 1, turns: 1, statusMod: 1.0 },
      { ball: 'Quick Ball', ballRate: 1.0, hp: 100, turns: 1, statusMod: 2.0 },
      { ball: 'Quick Ball', ballRate: 1.0, hp: 1, turns: 2, statusMod: 2.0 },
      // Dusk Ball omitted
    ];
    methods.forEach(method => {
      const catchChance = calculateCatchChance(catchRate, method.ballRate, method.hp, method.statusMod, level);
      const costFactor = ballCosts[method.ball];
      const score = catchChance / (method.turns + costFactor);
      allMethods.push({
        ...method,
        catchChance,
        score,
        hpLabel: method.hp === 100 ? '100% HP' : '1% HP',
        statusLabel: method.statusMod === 2.0 ? 'Sleep' : 'Normal'
      });
    });
    // Sort by score descending
    allMethods.sort((a, b) => b.score - a.score);
    return [allMethods[0], allMethods[1]];
  }
  // Otherwise (night), return normal best/second best
  return [bestMethod, secondBestMethod];
}

export default function useCatchCalcs() {
  const clock = useInGameClock();
  return {
    calculateCatchChance: useCallback(calculateCatchChance, []),
    calculateBestCatchMethod: useCallback(calculateBestCatchMethod, []),
    getTopBalls: (catchRate, level = 30) => getTopBalls(catchRate, level, clock.period),
  };
}