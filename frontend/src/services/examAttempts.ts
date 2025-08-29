import { apiRequest } from './api';

// Backend attempt shape
interface BackendSubject { name:string; correct:number; wrong:number; blank:number; }
interface BackendTopic { subject:string; topic:string; wrong:number; asked?:number; }
interface BackendAttempt { id:string; source:string; examType?:'TYT'|'AYT'; date:string; subjects:BackendSubject[]; topics?:BackendTopic[]; totals?: { correct:number; wrong:number; blank:number; net:number; accuracy:number }; }

// Frontend shape reused from AttemptsList
export interface AttemptSubjectStat { subject: string; correct: number; wrong: number; blank: number; }
export interface AttemptTopicMistake { topic: string; wrong: number; subject: string; asked?: number; }
export interface ExamAttempt { id:string; date:string; source:string; subjects:AttemptSubjectStat[]; topics:AttemptTopicMistake[]; }

function mapFromBackend(a: BackendAttempt): ExamAttempt {
  return {
    id: a.id,
    date: a.date,
    source: a.source,
    subjects: (a.subjects||[]).map(s=> ({ subject:s.name, correct:s.correct, wrong:s.wrong, blank:s.blank })),
    topics: (a.topics||[]).map(t=> ({ subject:t.subject, topic:t.topic, wrong:t.wrong, asked:t.asked }))
  };
}

function mapToBackendPayload(a: Partial<ExamAttempt>) {
  return {
    source: a.source,
    date: a.date,
    subjects: (a.subjects||[]).map(s=> ({ name:s.subject, correct:s.correct, wrong:s.wrong, blank:s.blank })),
    topics: (a.topics||[]).map(t=> ({ subject:t.subject, topic:t.topic, wrong:t.wrong, asked:t.asked }))
  };
}

export async function fetchAttempts(page=1, limit=100) {
  const res = await apiRequest(`/exam-attempts?page=${page}&limit=${limit}`);
  const data = (res.data as BackendAttempt[]).map(mapFromBackend);
  return { attempts: data, pagination: res.pagination };
}
export async function createAttempt(a: ExamAttempt) {
  const res = await apiRequest('/exam-attempts', { method:'POST', body: JSON.stringify(mapToBackendPayload(a)) });
  return mapFromBackend(res.data as BackendAttempt);
}
export async function updateAttemptApi(a: ExamAttempt) {
  const res = await apiRequest(`/exam-attempts/${a.id}`, { method:'PUT', body: JSON.stringify(mapToBackendPayload(a)) });
  return mapFromBackend(res.data as BackendAttempt);
}
export async function deleteAttempt(id:string) {
  await apiRequest(`/exam-attempts/${id}`, { method:'DELETE' });
}

export interface OverviewStats { lastAccuracy:number; delta:number; averageAccuracy:number; count:number; tyt:{correct:number;wrong:number;blank:number;net:number;accuracy:number}; ayt:{correct:number;wrong:number;blank:number;net:number;accuracy:number}; }
export async function fetchOverviewStats() {
  const res = await apiRequest('/exam-attempts/stats/overview');
  return res.data as OverviewStats;
}

export async function fetchTopicHistory(topic:string, range='all') {
  const res = await apiRequest(`/exam-attempts/analytics/topic-history?topic=${encodeURIComponent(topic)}&range=${range}`);
  return res.data as { date:string; wrong:number; accuracy:number }[];
}

export async function fetchAggregateHistory(type:'TYT'|'AYT', bucket='day', range='all') {
  const res = await apiRequest(`/exam-attempts/analytics/aggregate-history?type=${type}&bucket=${bucket}&range=${range}`);
  return res.data as { bucket:string; wrong:number; correct:number; netAvg:number; accuracy:number }[];
}

export async function fetchFrequentTopics(limit=15, period='30d') {
  const res = await apiRequest(`/exam-attempts/analytics/frequent-topics?limit=${limit}&period=${period}`);
  return res.data as { topic:string; wrong:number; subject:string; accuracy:number }[];
}
