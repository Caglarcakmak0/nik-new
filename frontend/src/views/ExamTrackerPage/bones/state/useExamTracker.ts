import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { ExamAttempt } from '../AttemptsList.tsx';
import { fetchAttempts, createAttempt, updateAttemptApi, deleteAttempt, fetchOverviewStats, fetchFrequentTopics, fetchTopicHistory, fetchAggregateHistory } from '../../../../services/examAttempts';
import { CACHE_KEYS, DEFAULT_FREQUENT_LIMIT, DEFAULT_FREQUENT_RANGE, DEFAULT_TOPIC_HISTORY_RANGE, DEFAULT_AGGREGATE_RANGE } from './examTrackerConstants';
import { getCache, setCache, invalidatePrefix } from './examTrackerCache';

export interface TopicHistoryPoint { attemptId: string; date: string; wrong: number; }
export interface TopicAggregate { topic: string; total: number; subject: string; }
export interface SuggestionItem { topic: string; reason: string; action: string; weight: number; }
export interface AttemptSummary { id:string; date:string; accuracy:number; correct:number; wrong:number; blank:number; }

// Basit öneri algoritması (son 2 deneme + toplam pattern)
function buildSuggestions(attempts: ExamAttempt[]): SuggestionItem[] {
  if (attempts.length === 0) return [];
  const lastTwo = attempts.slice(0, 2); // tarih sıralı geldi varsayım
  const countMap = new Map<string, { topic: string; subject: string; lastTwoWrong: number; totalWrong: number; askedLastTwo:number; askedTotal:number }>();
  attempts.forEach((a, idx) => {
    a.topics.forEach(t => {
      const key = t.topic + '|' + t.subject;
      const entry = countMap.get(key) || { topic: t.topic, subject: t.subject, lastTwoWrong: 0, totalWrong: 0, askedLastTwo:0, askedTotal:0 };
      entry.totalWrong += t.wrong;
      entry.askedTotal += (t.asked ?? (t.wrong + 1));
      if (idx < lastTwo.length) { entry.lastTwoWrong += t.wrong; entry.askedLastTwo += (t.asked ?? (t.wrong + 1)); }
      countMap.set(key, entry);
    });
  });
  const arr = Array.from(countMap.values())
    .map(e => {
      const repeatFactor = e.lastTwoWrong >= 2 ? 1.2 : 1;
      const recentAccuracy = e.askedLastTwo ? (e.askedLastTwo - e.lastTwoWrong)/e.askedLastTwo : 1;
      const overallAccuracy = e.askedTotal ? (e.askedTotal - e.totalWrong)/e.askedTotal : 1;
      const penalty = (1 - recentAccuracy) * 2 + (1 - overallAccuracy);
      const recentWeight = e.lastTwoWrong * 1.2 + penalty * 3;
      const totalWeight = e.totalWrong * 0.4;
      const weight = (recentWeight + totalWeight + penalty) * repeatFactor;
      let reason = `Son 2 denemede ${e.lastTwoWrong} yanlış`;
      if (e.lastTwoWrong === 0) reason = 'Son 2 denemede hata yok';
      if (e.lastTwoWrong >= 2) reason += ' (tekrarlayan)';
      const action = penalty > 1.2 ? 'Öncelikli tekrar' : (e.lastTwoWrong >= 2 ? 'Hemen tekrar et' : 'Kısa gözden geçir');
      return { topic: e.topic, reason, action, weight } as SuggestionItem;
    })
    .filter(s => s.weight > 1.4)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);
  return arr;
}

function buildFrequentTopics(attempts: ExamAttempt[]): TopicAggregate[] {
  const map = new Map<string, TopicAggregate>();
  attempts.forEach(a => a.topics.forEach(t => {
    const k = t.topic + '|' + t.subject;
    const ex = map.get(k) || { topic: t.topic, total: 0, subject: t.subject };
    ex.total += t.wrong;
    map.set(k, ex);
  }));
  return Array.from(map.values()).sort((a,b)=> b.total - a.total).slice(0, 8);
}

export function useExamTracker(initial: ExamAttempt[], options: { enableRemote?: boolean } = {}) {
  const { enableRemote = true } = options;
  const [attempts, setAttempts] = useState<ExamAttempt[]>(initial);
  // Keep an immutable reference of the provided initial (mock) attempts so we can restore when remote -> mock toggle happens
  const initialMockRef = useRef<ExamAttempt[]>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<{ averageAccuracy:number; lastAccuracy:number; delta:number } | null>(null);
  const [remoteFrequent, setRemoteFrequent] = useState<{ topic:string; wrong:number; subject:string; accuracy:number }[]>([]);
  const [topicHistoryTopic, setTopicHistoryTopic] = useState<string | null>(null);
  const [topicHistoryRange, setTopicHistoryRange] = useState<string>(DEFAULT_TOPIC_HISTORY_RANGE);
  const [aggregateKind, setAggregateKind] = useState<'TYT'|'AYT'|null>(null);
  const [aggregateRange, setAggregateRange] = useState<string>(DEFAULT_AGGREGATE_RANGE);
  const [aggregateBucket, setAggregateBucket] = useState<'day'|'week'|'month'>('day');
  const [topicHistoryRemote, setTopicHistoryRemote] = useState<{ date:string; wrong:number; accuracy:number }[]>([]);
  const [aggregateHistoryRemote, setAggregateHistoryRemote] = useState<{ bucket:string; wrong:number; correct:number; netAvg:number; accuracy:number }[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<ExamAttempt | null>(null);

  const suggestions = useMemo(()=> buildSuggestions(attempts), [attempts]);
  const frequentTopicsLocal = useMemo(()=> buildFrequentTopics(attempts), [attempts]);
  const frequentTopics = remoteFrequent.length ? remoteFrequent.map(r=> ({ topic:r.topic, total:r.wrong, subject:r.subject })) : frequentTopicsLocal;

  const summaries: AttemptSummary[] = useMemo(()=> attempts.map(a => {
    const totals = a.subjects.reduce((acc,s)=> { acc.correct+=s.correct; acc.wrong+=s.wrong; acc.blank+=s.blank; return acc; }, {correct:0,wrong:0,blank:0});
    const answered = totals.correct + totals.wrong;
    const accuracy = answered? totals.correct/answered : 0;
    return { id:a.id, date:a.date, accuracy, ...totals };
  }), [attempts]);

  // Always call useMemo (do not short-circuit with overview) to preserve hook order.
  const computedOverviewStats = useMemo(()=> {
    if (!summaries.length) return { averageAccuracy:0, lastAccuracy:0, delta:0 };
    const averageAccuracy = summaries.reduce((acc,s)=> acc+s.accuracy,0)/summaries.length;
    const lastAccuracy = summaries[0].accuracy;
    const prev = summaries[1]?.accuracy ?? lastAccuracy;
    const delta = lastAccuracy - prev;
    return { averageAccuracy, lastAccuracy, delta };
  }, [summaries]);
  const overallStats = overview ?? computedOverviewStats;

  // Local fallback history (used until remote fetched)
  const topicHistoryLocal = useMemo(() => {
    if (!topicHistoryTopic) return [] as TopicHistoryPoint[];
    const points: TopicHistoryPoint[] = [];
    attempts.forEach(a => {
      const match = a.topics.find(t => t.topic === topicHistoryTopic);
      if (match) points.push({ attemptId: a.id, date: a.date, wrong: match.wrong });
    });
    return points.sort((a,b)=> new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [attempts, topicHistoryTopic]);

  const topicHistory = topicHistoryRemote.length ? topicHistoryRemote.map((p,i)=> ({ attemptId:String(i), date:p.date, wrong:p.wrong })) : topicHistoryLocal;

  // Lokal (mock) modda aggregate history boş kalıyordu -> fallback hesaplama
  const aggregateHistory = enableRemote ? aggregateHistoryRemote : (()=> {
    if (!aggregateKind) return [] as { bucket:string; wrong:number; correct:number; netAvg:number; accuracy:number }[];
    // attempts içinde examType alanı yoksa (mock), source üzerinden kaba bir ayrım yapılabilir; yoksa hepsini dahil et
    const filtered = attempts.filter(a => (a as any).examType ? (a as any).examType === aggregateKind : true);
    const groups = new Map<string, { wrong:number; correct:number; total:number; netSum:number; count:number }>();
    const bucketMode = aggregateBucket; // 'day' | 'week' | 'month'
    for (const att of filtered) {
      const d = new Date(att.date);
      let key:string;
      if (bucketMode === 'month') {
        key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
      } else if (bucketMode === 'week') {
        // ISO week
        const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const day = tmp.getUTCDay() || 7;
        if (day !== 1) tmp.setUTCDate(tmp.getUTCDate() - day + 1);
        const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(),0,1));
        const week = Math.ceil((((tmp.getTime()-yearStart.getTime())/86400000)+1)/7);
        key = tmp.getUTCFullYear() + '-W' + week;
      } else {
        key = d.toISOString().slice(0,10);
      }
      // Totalleri subjects üzerinden topla (varsayım: correct/wrong/blank alanları mevcut)
      let corr = 0, wr = 0;
      (att.subjects||[]).forEach((s:any)=> { corr += s.correct||0; wr += s.wrong||0; });
      const g = groups.get(key) || { wrong:0, correct:0, total:0, netSum:0, count:0 };
      g.wrong += wr; g.correct += corr; g.total += corr + wr; g.count += 1;
      // Net formülü belirsiz -> tahmini: net = correct - wrong/4 (TYT tarzı). Eğer negative olursa yine hesaplanır.
      g.netSum += corr - wr/4;
      groups.set(key, g);
    }
    const rows = Array.from(groups.entries()).sort((a,b)=> a[0].localeCompare(b[0])).map(([bucket, g]) => ({
      bucket,
      wrong: g.wrong,
      correct: g.correct,
      netAvg: g.count ? parseFloat((g.netSum / g.count).toFixed(2)) : 0,
      accuracy: g.total>0 ? g.correct / g.total : 0
    }));
    return rows;
  })();

  // TYT / AYT toplam net hesapları
  const { tytNet, aytNet } = useMemo(() => {
    const aggregate = (list: ExamAttempt[]) => {
      if (!list.length) return { correct:0, wrong:0, blank:0, net:0, accuracy:0 };
      const sums = list.reduce((acc,a)=> {
        a.subjects.forEach(s=> { acc.correct+=s.correct; acc.wrong+=s.wrong; acc.blank+=s.blank; });
        return acc;
      }, {correct:0, wrong:0, blank:0});
      const answered = sums.correct + sums.wrong;
      const accuracy = answered? sums.correct/answered : 0;
      const net = sums.correct - sums.wrong/4;
      return { ...sums, net, accuracy };
    };
    const tytAttempts = attempts.filter(a => /TYT/i.test(a.source));
    const aytAttempts = attempts.filter(a => /AYT/i.test(a.source));
    return { tytNet: aggregate(tytAttempts), aytNet: aggregate(aytAttempts) };
  }, [attempts]);

  const invalidateAfterMutation = useCallback(() => {
    setOverview(null); // force recompute vs remote until refetched
    invalidatePrefix('topicHistory|');
    invalidatePrefix('aggregateHistory|');
    invalidatePrefix('frequent|');
    // refetch overview & frequent
    void refreshOverviewAndFrequent();
  }, []);

  const addAttempt = useCallback(async (a: ExamAttempt) => {
    const optimisticId = a.id;
    setAttempts(prev => [a, ...prev]);
    try {
      const created = await createAttempt(a);
      setAttempts(prev => prev.map(p=> p.id===optimisticId? created: p).sort((x,y)=> new Date(y.date).getTime() - new Date(x.date).getTime()));
      invalidateAfterMutation();
    } catch (e:any) {
      setAttempts(prev => prev.filter(p=> p.id!==optimisticId));
      setError(e.message || 'Ekleme hatası');
    }
  }, [invalidateAfterMutation]);

  const updateAttempt = useCallback(async (a: ExamAttempt) => {
    setAttempts(prev => prev.map(p=> p.id===a.id? a: p));
    try {
      const saved = await updateAttemptApi(a);
      setAttempts(prev => prev.map(p=> p.id===a.id? saved: p));
      invalidateAfterMutation();
    } catch(e:any) {
      setError(e.message || 'Güncelleme hatası');
    }
  }, [invalidateAfterMutation]);

  const removeAttempt = useCallback(async (id: string) => {
    const backup = attempts;
    setAttempts(prev => prev.filter(p=> p.id!==id));
    try { await deleteAttempt(id); invalidateAfterMutation(); } catch(e:any){ setAttempts(backup); setError(e.message || 'Silme hatası'); }
  }, [attempts, invalidateAfterMutation]);

  const overviewFetchInFlight = useRef<AbortController|null>(null);
  const frequentFetchInFlight = useRef<AbortController|null>(null);

  const refreshOverviewAndFrequent = useCallback(async () => {
    try {
      overviewFetchInFlight.current?.abort();
      frequentFetchInFlight.current?.abort();
      overviewFetchInFlight.current = new AbortController();
      frequentFetchInFlight.current = new AbortController();
      const [stats, freq] = await Promise.all([
        fetchOverviewStats(),
        fetchFrequentTopics(DEFAULT_FREQUENT_LIMIT, DEFAULT_FREQUENT_RANGE).catch(()=> [])
      ]);
      setOverview({ averageAccuracy: stats.averageAccuracy, lastAccuracy: stats.lastAccuracy, delta: stats.delta });
      setRemoteFrequent(freq);
    } catch(e:any) { /* swallow to avoid UI flicker */ }
  }, []);

  // initial load
  useEffect(()=> {
    if (!enableRemote) return; // mock only mode
    (async()=> {
      setLoading(true); setError(null);
      try {
        const { attempts: atts } = await fetchAttempts();
        setAttempts(atts.sort((a,b)=> new Date(b.date).getTime()-new Date(a.date).getTime()));
        await refreshOverviewAndFrequent();
      } catch(e:any) { setError(e.message||'Yükleme hatası'); }
      finally { setLoading(false); }
    })();
  }, [refreshOverviewAndFrequent, enableRemote]);

  // When switching to mock mode (enableRemote -> false) restore original mock dataset & clear remote-only analytics state
  useEffect(()=> {
    if (enableRemote) return; // only act on switch OFF remote
    setAttempts(initialMockRef.current);
    setOverview(null);
    setRemoteFrequent([]); // fall back to local frequent topics
    setTopicHistoryRemote([]);
    setAggregateHistoryRemote([]);
  }, [enableRemote]);

  // Lazy fetch topic history when modal opens or dependencies change
  useEffect(()=> {
    if (!topicHistoryTopic) return; // closed
  if (!enableRemote) return; // do not fetch when in mock-only mode
  const key = CACHE_KEYS.topicHistory(topicHistoryTopic, topicHistoryRange as any);
    const cached = getCache<{ date:string; wrong:number; accuracy:number }[]>(key);
    if (cached) { setTopicHistoryRemote(cached); return; }
    let active = true;
    setAnalyticsLoading(true);
    fetchTopicHistory(topicHistoryTopic, topicHistoryRange).then(data => { if (active){ setTopicHistoryRemote(data); setCache(key, data); } })
      .catch(e=> { if (active) setError(e.message||'Topic history hata'); })
      .finally(()=> { if (active) setAnalyticsLoading(false); });
    return () => { active = false; };
  }, [topicHistoryTopic, topicHistoryRange]);

  // Lazy fetch aggregate history when modal parameters change
  useEffect(()=> {
    if (!aggregateKind) return;
  if (!enableRemote) return; // mock mode -> skip remote fetch
  const key = CACHE_KEYS.aggregateHistory(aggregateKind, aggregateBucket, aggregateRange as any);
    const cached = getCache<{ bucket:string; wrong:number; correct:number; netAvg:number; accuracy:number }[]>(key);
    if (cached) { setAggregateHistoryRemote(cached); return; }
    let active = true; setAnalyticsLoading(true);
    fetchAggregateHistory(aggregateKind, aggregateBucket, aggregateRange).then(data=> { if (active){ setAggregateHistoryRemote(data); setCache(key, data); } })
      .catch(e=> { if (active) setError(e.message||'Aggregate history hata'); })
      .finally(()=> { if (active) setAnalyticsLoading(false); });
    return ()=> { active=false; };
  }, [aggregateKind, aggregateBucket, aggregateRange]);

  return {
    attempts,
    loading,
    error,
  clearError: ()=> setError(null),
    summaries,
    overallStats,
    suggestions,
    frequentTopics,
  remoteFrequentActive: remoteFrequent.length>0,
    topicHistory,
    topicHistoryTopic,
    setTopicHistoryTopic,
    topicHistoryRange,
    setTopicHistoryRange,
    aggregateHistory,
    aggregateKind,
    setAggregateKind,
    aggregateRange,
    setAggregateRange,
    aggregateBucket,
    setAggregateBucket,
    analyticsLoading,
    tytNet,
    aytNet,
    showAdd,
    setShowAdd,
    editing,
    setEditing,
    addAttempt,
    updateAttempt,
    removeAttempt,
  refreshOverviewAndFrequent,
  enableRemote,
  };
}
