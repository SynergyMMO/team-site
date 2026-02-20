import { useState, useEffect } from 'react';

// Core in-game clock logic as a pure function
function getInGameState(DAY_OFFSET = 0, IN_GAME_DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']) {
  const now = Date.now();
  const utcMinutes = now / 60000;

  const utcMidnight = Math.floor(utcMinutes / 1440) * 1440;
  const minsSinceMidnight = utcMinutes - utcMidnight;
  const inGameTotalMins = (minsSinceMidnight * 4) % 1440;

  const hours = Math.floor(inGameTotalMins / 60);
  const mins = Math.floor(inGameTotalMins % 60);

  let period = 'Night';
  if (hours >= 4 && hours < 11) period = 'Morning';
  else if (hours >= 11 && hours < 21) period = 'Day';

  let nextBoundary;
  if (hours >= 4 && hours < 11) nextBoundary = 11 * 60;
  else if (hours >= 11 && hours < 21) nextBoundary = 21 * 60;
  else nextBoundary = hours >= 21 ? 28 * 60 : 4 * 60;

  const inGameMinsLeft = nextBoundary - inGameTotalMins;
  const realMinsLeft = Math.ceil(inGameMinsLeft / 4);

  const inGameDay = Math.floor(utcMinutes / 360);
  const dayIndex = (inGameDay + DAY_OFFSET) % 7;

  return {
    hours,
    mins,
    period,
    day: IN_GAME_DAYS[dayIndex],
    realMinsLeft,
  };
}

// Reusable Hook
export function useInGameClock(DAY_OFFSET = 0, IN_GAME_DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']) {
  const [state, setState] = useState(() => getInGameState(DAY_OFFSET, IN_GAME_DAYS));

  useEffect(() => {
    const interval = setInterval(() => setState(getInGameState(DAY_OFFSET, IN_GAME_DAYS)), 1000);
    return () => clearInterval(interval);
  }, [DAY_OFFSET, IN_GAME_DAYS]);

  return state;
}
