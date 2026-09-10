const OFFER_CYCLE_MS = 12 * 60 * 60 * 1000;

// Derived from the clock, never stored: the window is the same number on a refresh, on a
// return visit, and in a second tab, and it rolls over to a fresh 12 hours on its own.
export const msLeftInCycle = (now = Date.now()): number => OFFER_CYCLE_MS - (now % OFFER_CYCLE_MS);

export const formatCountdown = (msLeft: number): string => {
  const totalSeconds = Math.floor(msLeft / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
};
