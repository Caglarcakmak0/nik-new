import { useCallback, useEffect, useState } from 'react';
import { AchievementItem, AchievementStatsSummary, AchievementQueryParams, fetchUserAchievements } from '../services/achievements';

export function useAchievements(initialParams: AchievementQueryParams = {}) {
  const [items, setItems] = useState<AchievementItem[]>([]);
  const [stats, setStats] = useState<AchievementStatsSummary | undefined>();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<AchievementQueryParams>(initialParams);

  const load = useCallback(async (override?: AchievementQueryParams) => {
    setLoading(true); setError(null);
    try {
      const q = { ...params, ...(override || {}) };
      const resp = await fetchUserAchievements(q);
      setItems(resp.data);
      setStats(resp.stats);
      setParams(q);
    } catch (e: any) {
      setError(e?.message || 'Yükleme hatası');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { items, stats, loading, error, params, refetch: load, setParams };
}
