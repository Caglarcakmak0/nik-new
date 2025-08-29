import { useCallback, useEffect, useRef, useState } from 'react';
import { HabitRoutineDto, getHabitRoutines, markHabit, updateHabitRoutine, changeHabitStatus } from '../services/habits';

interface UseHabitsResult {
  routines: HabitRoutineDto[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  markDone: (id: string) => void;
  markSkip: (id: string) => void;
  mockMode: boolean;
  toggleMock: () => void;
  updateRoutine: (id: string, patch: Partial<HabitRoutineDto>) => Promise<void>;
  setRoutineStatus: (id: string, status: 'active'|'paused'|'archived') => Promise<void>;
}

const MOCK_ROUTINES: HabitRoutineDto[] = [
  { _id:'m1', name:'Sabah tekrar', schedule:{ timeStart:'08:00', recurrence:'daily' }, metrics:{ currentStreak:5, longestStreak:12, difficulty:3 }, todayLog:{ _id:'ml1', status:'pending' } },
  { _id:'m2', name:'Paragraf seti', schedule:{ timeStart:'10:30', recurrence:'weekdays' }, metrics:{ currentStreak:2, longestStreak:7, difficulty:2 }, todayLog:{ _id:'ml2', status:'pending' } },
  { _id:'m3', name:'Akşam deneme analizi', schedule:{ timeStart:'20:00', recurrence:'daily' }, metrics:{ currentStreak:15, longestStreak:22, difficulty:4 }, todayLog:{ _id:'ml3', status:'done' } }
];

export function useHabits(): UseHabitsResult {
  const [routines, setRoutines] = useState<HabitRoutineDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [mockMode, setMockMode] = useState<boolean>(() => {
    try { const stored = localStorage.getItem('habits_mock_mode'); return stored === '1'; } catch { return false; }
  });
  const esRef = useRef<EventSource | null>(null);
  const mountedRef = useRef(true);

  const fetchList = useCallback(async () => {
    if (mockMode) { setRoutines(MOCK_ROUTINES); return; }
    setLoading(true); setError(null);
    try {
      const res = await getHabitRoutines();
      if(!mountedRef.current) return;
      setRoutines(res.data);
    } catch (e: any) {
      setError(e.message || 'Yüklenemedi');
    } finally { setLoading(false); }
  }, [mockMode]);

  useEffect(() => { mountedRef.current = true; fetchList(); return () => { mountedRef.current = false; esRef.current?.close(); }; }, [fetchList]);

  // SSE subscribe (token from localStorage appended as query, backend supports it)
  useEffect(() => {
  if (mockMode) return; // no SSE in mock
  const token = localStorage.getItem('token');
    if(!token) return; // wait until login
    const es = new EventSource(`/api/habits/events?token=${encodeURIComponent(token)}`);
    esRef.current = es;
    es.addEventListener('habit_completed', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data);
        setRoutines(prev => prev.map(r => {
          if (r._id !== data.habitId) return r;
          const newLog = { ...(r.todayLog||{}), status: data.status as any, completedAt: new Date().toISOString() } as HabitRoutineDto['todayLog'];
          return { ...r, todayLog: newLog, metrics: { ...(r.metrics||{}), currentStreak: data.streak } } as HabitRoutineDto;
        }));
      } catch {}
    });
    es.addEventListener('habit_routines_list', () => { fetchList(); });
    es.addEventListener('habit_risk_snapshot', () => {/* could lazy refresh risk later */});
    es.onerror = () => { /* auto-reconnect handled by browser; optional backoff logic */ };
    return () => { es.close(); };
  }, [fetchList]);

  const optimisticUpdate = (id: string, status: 'done'|'late'|'skipped') => {
    setRoutines(prev => prev.map(r => {
      if (r._id !== id) return r;
      const newLog = { ...(r.todayLog||{}), status } as HabitRoutineDto['todayLog'];
      return { ...r, todayLog: newLog } as HabitRoutineDto;
    }));
  };

  const markDone = useCallback(async (id: string) => {
    optimisticUpdate(id,'done');
    try { await markHabit(id,'done'); } catch (e){ fetchList(); }
  }, [fetchList]);
  const markSkip = useCallback(async (id: string) => {
    optimisticUpdate(id,'skipped');
    try { await markHabit(id,'skip'); } catch (e){ fetchList(); }
  }, [fetchList]);

  const updateRoutine = useCallback(async (id: string, patch: Partial<HabitRoutineDto>) => {
    if (mockMode) {
      setRoutines(prev => prev.map(r => r._id===id? ({ ...r, ...patch, schedule: { ...r.schedule, ...(patch.schedule||{}) } }): r));
      return;
    }
    try { await updateHabitRoutine(id, patch); await fetchList(); } catch(e){ /* surface? */ }
  }, [mockMode, fetchList]);

  const setRoutineStatus = useCallback(async (id: string, status: 'active'|'paused'|'archived') => {
    if (mockMode) {
      setRoutines(prev => prev.map(r => r._id===id? ({ ...r, status }): r));
      return;
    }
    try { await changeHabitStatus(id, status); await fetchList(); } catch(e){ /* ignore */ }
  }, [mockMode, fetchList]);

  const toggleMock = () => { setMockMode(m => { const next = !m; try { localStorage.setItem('habits_mock_mode', next? '1':'0'); } catch{} return next; }); };

  return { routines, loading, error, refresh: fetchList, markDone, markSkip, mockMode, toggleMock, updateRoutine, setRoutineStatus };
}
