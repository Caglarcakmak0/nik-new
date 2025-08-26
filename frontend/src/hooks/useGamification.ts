import { useEffect, useState, useCallback } from 'react';
import { apiRequest } from '../services/api';

export interface GamificationStats {
  totalXP: number;
  currentLevel: number;
  nextLevelXP: number; // cumulative threshold
  currentLevelXP: number; // xp into current level
  streak: number;
  maxStreak: number;
  totalAchievements: number;
}

export interface XPEventItem {
  id: string;
  type: string;
  amount: number;
  createdAt: string;
  meta?: any;
}

export function useGamification() {
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [events, setEvents] = useState<XPEventItem[]>([]);
  const [challenges, setChallenges] = useState<any | null>(null);
  const [recentAchievements, setRecentAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await apiRequest('/gamification/overview');
      const d = res.data;
      if (d?.stats) setStats(d.stats);
      if (Array.isArray(d?.events)) setEvents(d.events);
      if (d?.challenges) setChallenges(d.challenges);
      if (Array.isArray(d?.recentAchievements)) setRecentAchievements(d.recentAchievements);
    } catch (e) {}
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchOverview().finally(() => setLoading(false));
  }, [fetchOverview]);

  return { stats, events, challenges, recentAchievements, loading, refetch: fetchOverview };
}
