export const ALTERING_CAVE_ROTATION_ONE_INGAME_DAY = 82342
export const REAL_MS_PER_INGAME_DAY = 6 * 60 * 60 * 1000
export const IN_GAME_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const DAY_OFFSET = 5
export const ALTERING_CAVE_MOVE_WARNINGS = {
  pineco: 'SELF DESTRUCT / TAKE DOWN',
  mareep: 'TAKE DOWN',
  smeargle: 'STRUGGLE',
  snubbull: 'ROAR',
  shuppet: 'CURSE',
  absol: 'LIFE ORB',
  aron: 'ROAR',
}

export const ALTERING_CAVE_MOVE_SUMMARY = [
  {
    pokemon: 'Pineco',
    summary: 'Pineco has Self-Destruct (Level 19 or below), Take Down (Lvl 19 or below). Bring a Damp mon. Do not False Swipe.',
  },
  {
    pokemon: 'Mareep',
    summary: "Mareep has Take Down. Don't False Swipe.",
  },
  {
    pokemon: 'Smeargle',
    summary: 'Smeargle has Sketch. Use a move before switching, otherwise it will begin to Struggle.',
  },
  {
    pokemon: 'Snubbull',
    summary: 'Snubbull learns Roar at lvl 25. Make sure to swap to a Pokemon higher level so it does not end the battle.',
  },
  {
    pokemon: 'Aron',
    summary: 'Aron learns Roar at lvl 23 or below. Make sure to swap to a Pokemon higher level so it does not end the battle.',
  },
  {
    pokemon: 'Shuppet',
    summary: 'Shuppet has Curse at lvl 26+. Soak it so it is not Ghost type, or catch it before it dies.',
  },
  {
    pokemon: 'Absol',
    summary: 'Absol has a small chance to hold a Life Orb. Do not False Swipe it if it does.',
  },
]

export function getAlteringCaveMoveWarning(name) {
  return ALTERING_CAVE_MOVE_WARNINGS[String(name || '').trim().toLowerCase()] || ''
}

export function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor
}

export function getAlteringCaveRotationState(nowMs = Date.now()) {
  const inGameDay = Math.floor(nowMs / REAL_MS_PER_INGAME_DAY)
  const rotationIndex = positiveModulo(inGameDay - ALTERING_CAVE_ROTATION_ONE_INGAME_DAY, 7)
  const msIntoDay = positiveModulo(nowMs, REAL_MS_PER_INGAME_DAY)
  const msUntilSwap = REAL_MS_PER_INGAME_DAY - msIntoDay

  return {
    rotation: rotationIndex + 1,
    msUntilSwap,
  }
}

export function getMsUntilAlteringCaveRotation(targetRotation, rotationState = getAlteringCaveRotationState()) {
  const currentIndex = rotationState.rotation - 1
  const targetIndex = targetRotation - 1
  const rotationsUntilTarget = positiveModulo(targetIndex - currentIndex, 7)

  if (rotationsUntilTarget === 0) return 0

  return rotationState.msUntilSwap + (rotationsUntilTarget - 1) * REAL_MS_PER_INGAME_DAY
}

export function formatRotationDuration(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
  }

  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}
