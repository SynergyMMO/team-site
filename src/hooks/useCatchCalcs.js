import { useCallback } from "react";
import { useInGameClock } from "./useInGameClock";
import pokemonData from "../data/pokemmo_data/pokemon-data.json";

/* =========================
   Utility: Normalize Name
========================= */
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* =========================
   Catch Rate Lookup (PURE)
========================= */
export function getCatchRateByName(name) {
  if (!name) return null;

  let key = name.toLowerCase();
  if (pokemonData[key]?.capture_rate != null) {
    return pokemonData[key].capture_rate;
  }

  key = normalizeName(name);
  if (pokemonData[key]?.capture_rate != null) {
    return pokemonData[key].capture_rate;
  }

  for (const pokeKey in pokemonData) {
    if (
      pokemonData[pokeKey].displayName?.toLowerCase() === name.toLowerCase()
    ) {
      return pokemonData[pokeKey].capture_rate;
    }
  }

  return null;
}

/* =========================
   Ball Data
========================= */

const ballCosts = {
  "Pokéball": 1,
  "Great Ball": 1.5,
  "Ultra Ball": 2,
  "Quick Ball": 2.25,
  "Dusk Ball": 2.5,
  "Net Ball": 2.25,
  "Nest Ball": 2.25,
};

const methods = [
  { ball: "Pokéball", ballRate: 1.0, hp: 100, turns: 0, statusMod: 1.0 },
  { ball: "Pokéball", ballRate: 1.0, hp: 1, turns: 1, statusMod: 1.0 },
  { ball: "Pokéball", ballRate: 1.0, hp: 100, turns: 1, statusMod: 2.0 },
  { ball: "Pokéball", ballRate: 1.0, hp: 1, turns: 2, statusMod: 2.0 },

  { ball: "Great Ball", ballRate: 1.5, hp: 100, turns: 0, statusMod: 1.0 },
  { ball: "Great Ball", ballRate: 1.5, hp: 1, turns: 1, statusMod: 1.0 },
  { ball: "Great Ball", ballRate: 1.5, hp: 100, turns: 1, statusMod: 2.0 },
  { ball: "Great Ball", ballRate: 1.5, hp: 1, turns: 2, statusMod: 2.0 },

  { ball: "Ultra Ball", ballRate: 2.0, hp: 100, turns: 0, statusMod: 1.0 },
  { ball: "Ultra Ball", ballRate: 2.0, hp: 1, turns: 1, statusMod: 1.0 },
  { ball: "Ultra Ball", ballRate: 2.0, hp: 100, turns: 1, statusMod: 2.0 },
  { ball: "Ultra Ball", ballRate: 2.0, hp: 1, turns: 2, statusMod: 2.0 },

  { ball: "Quick Ball", ballRate: 5.0, hp: 100, turns: 0, statusMod: 1.0 },
  { ball: "Quick Ball", ballRate: 1.0, hp: 1, turns: 1, statusMod: 1.0 },
  { ball: "Quick Ball", ballRate: 1.0, hp: 100, turns: 1, statusMod: 2.0 },
  { ball: "Quick Ball", ballRate: 1.0, hp: 1, turns: 2, statusMod: 2.0 },

  { ball: "Dusk Ball", ballRate: 3.5, hp: 100, turns: 0, statusMod: 1.0 },
  { ball: "Dusk Ball", ballRate: 3.5, hp: 1, turns: 1, statusMod: 1.0 },
  { ball: "Dusk Ball", ballRate: 3.5, hp: 100, turns: 1, statusMod: 2.0 },
  { ball: "Dusk Ball", ballRate: 3.5, hp: 1, turns: 2, statusMod: 2.0 },

  { ball: "Net Ball", ballRate: 1.0, hp: 100, turns: 0, statusMod: 1.0 },
  { ball: "Net Ball", ballRate: 1.0, hp: 1, turns: 1, statusMod: 1.0 },
  { ball: "Net Ball", ballRate: 1.0, hp: 100, turns: 1, statusMod: 2.0 },
  { ball: "Net Ball", ballRate: 1.0, hp: 1, turns: 2, statusMod: 2.0 },

  { ball: "Nest Ball", ballRate: 1.0, hp: 100, turns: 0, statusMod: 1.0 },
  { ball: "Nest Ball", ballRate: 1.0, hp: 1, turns: 1, statusMod: 1.0 },
  { ball: "Nest Ball", ballRate: 1.0, hp: 100, turns: 1, statusMod: 2.0 },
  { ball: "Nest Ball", ballRate: 1.0, hp: 1, turns: 2, statusMod: 2.0 },
];

/* =========================
   Multipliers (PURE)
========================= */

function getNestBallMultiplier(level = 30) {
  if (level <= 1) return 3.0;
  if (level >= 30) return 1.0;
  return 3.0 - ((level - 1) * (2.0 / 29));
}

function getNetBallMultiplier(types = []) {
  const lowered = types.map(t => t.toLowerCase());
  if (lowered.includes("water") || lowered.includes("bug")) {
    return 3.5;
  }
  return 1.0;
}

/* =========================
   Catch Formula (PURE)
========================= */

function calculateCatchChance(catchRate, ballRate, hpPercent, statusModifier = 1.0, level = 30) {
  const baseHP = 70;
  const IV = 31;
  const maxHP = Math.floor((((2 * baseHP + IV) * level) / 100) + level + 10);
  const currentHP = Math.floor((hpPercent / 100) * maxHP);
  const hpMultiplier = (3 * maxHP - 2 * currentHP) / (3 * maxHP);

  let captureValue = Math.floor(hpMultiplier * ballRate * catchRate * statusModifier);
  captureValue = Math.min(255, captureValue);

  return (captureValue / 255) * 100;
}

/* =========================
   PURE Top Ball Calculator
========================= */

function getTopBallsInternal(catchRate, level = 30, isNight = false, types = []) {
  const usableMethods = isNight
    ? methods
    : methods.filter(m => m.ball !== "Dusk Ball");

  const scored = usableMethods.map(method => {
    let ballRate = method.ballRate;
    console.log("getTopBallsInternal:", {
  catchRate,
  level,
  isNight,
  types
});


    if (method.ball === "Net Ball") {
      ballRate = getNetBallMultiplier(types);
    }

    if (method.ball === "Nest Ball") {
      ballRate = getNestBallMultiplier(level);
    }

    const catchChance = calculateCatchChance(
      catchRate,
      ballRate,
      method.hp,
      method.statusMod,
      level
    );

    const score = catchChance / (method.turns + ballCosts[method.ball]);

    return {
      ...method,
      catchChance,
      score,
      hpLabel: method.hp === 100 ? "100% HP" : "1% HP",
      statusLabel: method.statusMod === 2.0 ? "Sleep" : "Normal",
    };
  });

  scored.sort((a, b) => b.score - a.score);

  return [scored[0], scored[1]];
}

/* =========================
   SAFE Custom Hook
========================= */

export default function useCatchCalcs() {
  const { period } = useInGameClock();

  const isNight = period === "Night";

  const stableGetTopBalls = useCallback(
    (catchRate, level = 30, types = []) =>
      getTopBallsInternal(catchRate, level, isNight, types),
    [isNight]
  );

  return {
    getTopBalls: stableGetTopBalls
  };
}
