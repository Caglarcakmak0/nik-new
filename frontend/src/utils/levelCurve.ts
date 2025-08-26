// Frontend level curve utilities mirroring backend logic (250 * i^1.6 incremental)
const cumulativeCache: Record<number, number> = { 1: 0 };

export function cumulativeForLevel(level: number): number {
  if (level <= 1) return 0;
  if (cumulativeCache[level] != null) return cumulativeCache[level];
  let maxCached = Math.max(...Object.keys(cumulativeCache).map(Number));
  let total = cumulativeCache[maxCached];
  for (let i = maxCached + 1; i <= level; i++) {
    if (i === 1) continue;
    total += Math.round(250 * Math.pow(i - 1, 1.6));
    cumulativeCache[i] = total;
  }
  return cumulativeCache[level];
}

export function levelProgress(currentLevel: number, currentLevelXP: number, nextLevelXPThreshold: number) {
  const prevCum = cumulativeForLevel(currentLevel);
  const span = nextLevelXPThreshold - prevCum;
  const pct = span > 0 ? Math.min(100, (currentLevelXP / span) * 100) : 100;
  return { percent: pct, span, prevCum };
}
