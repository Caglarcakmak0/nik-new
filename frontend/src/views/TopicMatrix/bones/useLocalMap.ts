import { useEffect, useState } from 'react';

export function useLocalMap(subject: string, userId?: string, targetUserId?: string) {
  const effectiveUserId = targetUserId || userId;
  const storageKey = effectiveUserId
    ? `topic_color_matrix_v1_${subject}_${effectiveUserId}`
    : `topic_color_matrix_v1_${subject}`;

  const [map, setMap] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setMap(raw ? (JSON.parse(raw) as Record<string, string>) : {});
    } catch (_) {
      setMap({});
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(map));
    } catch (_) {
      // no-op
    }
  }, [map, storageKey]);

  const clear = () => {
    setMap({});
    try { localStorage.removeItem(storageKey); } catch (_) { /* no-op */ }
  };

  return { map, setMap, clear } as const;
}

export default useLocalMap;
