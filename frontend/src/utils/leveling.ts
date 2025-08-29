// Global leveling helper to unify XP -> Level math across components
// Formula mirrors backend approximation currently assumed in XPBar: xpNeededForLevel(n) = round(250 * n^1.6)
// Level 1 starts at cumulative 0.

const BASE = 250;
const EXP = 1.6;
const cache: number[] = [0]; // cumulative XP required to REACH given level index (level 1 => 0)

function ensure(level: number) {
  for (let i = cache.length; i <= level; i++) {
    const prev = cache[i - 1];
    const gain = Math.round(BASE * Math.pow(i - 1, EXP)); // xp to go from (i-1) -> i (i-1 is actual level)
    cache[i] = prev + (i === 1 ? 0 : gain); // for level 1, gain should be 0
  }
}

export function cumulativeXPForLevel(level: number): number {
  if (level < 1) return 0;
  ensure(level);
  return cache[level];
}

export function xpNeededForNextLevel(level: number): number {
  // XP needed to go from level -> level+1
  if (level < 1) return Math.round(BASE * Math.pow(1, EXP));
  return Math.round(BASE * Math.pow(level, EXP));
}

export interface LevelProgressInfo {
  currentLevel: number;
  currentLevelXP: number; // xp inside current level
  nextLevelXP: number;    // cumulative threshold for next level
  prevLevelXP: number;    // cumulative threshold for current level
  neededThisLevel: number; // xp needed inside this level
  percent: number;        // 0-100
  remaining: number;      // xp remaining inside this level
  totalXP: number;        // cumulative total xp overall
  isMax?: boolean;
}

/**
 * Derive progress info when you have (currentLevel, currentLevelXP, nextLevelXP, totalXP optional)
 */
export function getProgressFromStats(currentLevel: number, currentLevelXP: number, nextLevelXP: number, totalXP?: number): LevelProgressInfo {
  const prevCum = cumulativeXPForLevel(currentLevel);
  const needed = Math.max(0, nextLevelXP - prevCum);
  const percent = needed > 0 ? Math.min(100, (currentLevelXP / needed) * 100) : 100;
  const remaining = Math.max(0, needed - currentLevelXP);
  const isMax = needed === 0 || percent >= 100;
  return {
    currentLevel,
    currentLevelXP,
    nextLevelXP,
    prevLevelXP: prevCum,
    neededThisLevel: needed,
    percent,
    remaining,
    totalXP: typeof totalXP === 'number' ? totalXP : prevCum + currentLevelXP,
    isMax
  };
}

/**
 * Compute level purely from total cumulative XP (when backend doesn't provide level fields)
 * Returns the same progress info using recomputed boundaries.
 */
export function deriveLevelFromTotalXP(totalXP: number, maxLevel = 500): LevelProgressInfo {
  if (totalXP <= 0) {
    const firstNext = xpNeededForNextLevel(1);
    return getProgressFromStats(1, 0, firstNext, totalXP);
  }
  let level = 1;
  while (level < maxLevel) {
    const nextCum = cumulativeXPForLevel(level + 1);
    if (totalXP < nextCum) break;
    level++;
  }
  const prevCum = cumulativeXPForLevel(level);
  const nextCum = cumulativeXPForLevel(level + 1);
  const currentLevelXP = totalXP - prevCum;
  return getProgressFromStats(level, currentLevelXP, nextCum, totalXP);
}

/**
 * Format helper (UI convenience)
 */
export function formatProgressShort(info: LevelProgressInfo) {
  return info.isMax ? 'MAX' : `${info.currentLevelXP} / ${info.neededThisLevel} XP`;
}
