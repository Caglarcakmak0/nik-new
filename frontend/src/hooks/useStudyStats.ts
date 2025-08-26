import { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { apiRequest } from '../services/api';

dayjs.extend(isoWeek);

export type StudyStatsPeriod = 'today' | 'week' | 'month' | 'all';

export interface StudySession {
  _id: string;
  subject: string;
  duration: number; // minutes
  date: string | Date;
  quality: number; // 1-5
  technique: string;
  mood: string;
  efficiency: number; // percent 0-100
  distractions: number;
}

export interface StudyStats {
  totalTime: number;
  sessionsCount: number;
  averageQuality: number; // 1-5
  averageEfficiency: number; // 0-100
  totalDistractions: number;
  streak: number;
  weeklyGoal?: number; // minutes
  weeklyProgress?: number; // 0-100
}

interface UseStudyStatsResult {
  loading: boolean;
  sessions: StudySession[];
  stats: StudyStats | null;
  // Series for charts (mini analytics cards)
  totalTimeSeries: number[]; // minutes per day (or per session for today)
  sessionCountSeries: number[]; // session counts per day
  qualitySeries: number[]; // average quality per day
  streakSeries: number[]; // simple previous vs current streak for delta pills
  refetch: () => void;
}

// Helper to compute consecutive-day streak including today / yesterday
function computeStreak(allSessions: StudySession[]): number {
  if (!allSessions.length) return 0;
  const uniqueDates = Array.from(
    new Set(allSessions.map(s => dayjs(s.date).format('YYYY-MM-DD')))
  ).sort().reverse();
  const today = dayjs().format('YYYY-MM-DD');
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = dayjs(uniqueDates[i - 1]);
    const cur = dayjs(uniqueDates[i]);
    if (prev.diff(cur, 'day') === 1) streak++; else break;
  }
  return streak;
}

export function useStudyStats(period: StudyStatsPeriod): UseStudyStatsResult {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const refetch = () => setRefreshIndex(i => i + 1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const resp = await apiRequest('/study-sessions', { method: 'GET' });
        if (!cancelled && Array.isArray(resp)) {
          setSessions(resp as StudySession[]);
        }
      } catch (e) {
        if (!cancelled) setSessions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [period, refreshIndex]);

  // Filter sessions by period
  const filtered = useMemo(() => {
    const now = dayjs();
    return sessions.filter(s => {
      const d = dayjs(s.date);
      switch (period) {
        case 'today': return d.isSame(now, 'day');
        case 'week': return d.isSame(now, 'week');
        case 'month': return d.isSame(now, 'month');
        case 'all': default: return true;
      }
    });
  }, [sessions, period]);

  // Compute stats
  useEffect(() => {
    const weeklyGoalConst = 1200; // 20 saat = 1200 dk
    if (!filtered.length) { setStats({
      totalTime: 0,
      sessionsCount: 0,
      averageQuality: 0,
      averageEfficiency: 0,
      totalDistractions: 0,
      streak: computeStreak(sessions),
      weeklyGoal: weeklyGoalConst,
      weeklyProgress: period === 'week' ? 0 : undefined
    }); return; }
    const totalTime = filtered.reduce((sum, s) => sum + s.duration, 0);
    const sessionsCount = filtered.length;
    const averageQuality = filtered.reduce((sum, s) => sum + s.quality, 0) / sessionsCount;
    const averageEfficiency = filtered.reduce((sum, s) => sum + s.efficiency, 0) / sessionsCount;
    const totalDistractions = filtered.reduce((sum, s) => sum + s.distractions, 0);
    const weeklyGoal = weeklyGoalConst;
    const weeklyProgress = period === 'week' ? Math.min(100, (totalTime / weeklyGoal) * 100) : undefined;
    setStats({
      totalTime,
      sessionsCount,
      averageQuality: Math.round(averageQuality * 10) / 10,
      averageEfficiency: Math.round(averageEfficiency),
      totalDistractions,
      streak: computeStreak(sessions),
      weeklyGoal,
      weeklyProgress
    });
  }, [filtered, sessions]);

  // Build time-series for mini charts
  const { totalTimeSeries, sessionCountSeries, qualitySeries } = useMemo(() => {
    // Group by date (YYYY-MM-DD)
    const map: Record<string, { time: number; sessions: number; qualityTotal: number; qualityCount: number; }> = {};
    filtered.forEach(s => {
      const key = dayjs(s.date).format('YYYY-MM-DD');
      if (!map[key]) map[key] = { time: 0, sessions: 0, qualityTotal: 0, qualityCount: 0 };
      map[key].time += s.duration;
      map[key].sessions += 1;
      map[key].qualityTotal += s.quality;
      map[key].qualityCount += 1;
    });

    let orderedKeys: string[] = [];
    const now = dayjs();
    if (period === 'week') {
      const start = now.startOf('week');
      orderedKeys = Array.from({ length: 7 }, (_, i) => start.add(i, 'day').format('YYYY-MM-DD'));
    } else if (period === 'month') {
      const daysInMonth = now.daysInMonth();
      orderedKeys = Array.from({ length: daysInMonth }, (_, i) => now.date(i + 1).format('YYYY-MM-DD'));
    } else if (period === 'today') {
      // For today use sessions sequential durations
      return {
        totalTimeSeries: filtered.map(s => s.duration),
        sessionCountSeries: filtered.map(() => 1),
        qualitySeries: filtered.map(s => s.quality)
      };
    } else { // all
      orderedKeys = Object.keys(map).sort();
    }

    const totalTimeSeries: number[] = [];
    const sessionCountSeries: number[] = [];
    const qualitySeries: number[] = [];
    orderedKeys.forEach(k => {
      const entry = map[k];
      if (entry) {
        totalTimeSeries.push(entry.time);
        sessionCountSeries.push(entry.sessions);
        qualitySeries.push(entry.qualityCount ? +(entry.qualityTotal / entry.qualityCount).toFixed(2) : 0);
      } else {
        totalTimeSeries.push(0);
        sessionCountSeries.push(0);
        qualitySeries.push(0);
      }
    });
    return { totalTimeSeries, sessionCountSeries, qualitySeries };
  }, [filtered, period]);

  const streakSeries = useMemo(() => {
    if (!stats) return [];
    if (stats.streak <= 0) return [0,0];
    return [Math.max(0, stats.streak - 1), stats.streak];
  }, [stats]);

  return {
    loading,
    sessions,
    stats,
    totalTimeSeries,
    sessionCountSeries,
    qualitySeries,
    streakSeries,
    refetch
  };
}

// Small helper for formatting minutes similar to StudyStatistics component
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}s ${m}d`;
  return `${m}d`;
}

export default useStudyStats;
