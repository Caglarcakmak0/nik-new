import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AttemptRow } from './AttemptRow.tsx';

// Mock data tipi
export interface AttemptSubjectStat { subject: string; correct: number; wrong: number; blank: number; }
export interface AttemptTopicMistake { topic: string; wrong: number; subject: string; asked?: number; }
export interface ExamAttempt {
  id: string;
  date: string; // ISO
  source: string;
  subjects: AttemptSubjectStat[];
  topics: AttemptTopicMistake[];
}

export const MOCK_ATTEMPTS: ExamAttempt[] = [
  {
    id: 'a1',
    date: '2025-08-15',
    source: 'XYZ Yayınları TYT 1',
    subjects: [
      { subject: 'Matematik', correct: 28, wrong: 7, blank: 5 },
      { subject: 'Geometri', correct: 10, wrong: 5, blank: 5 },
      { subject: 'Fizik', correct: 7, wrong: 3, blank: 0 },
    ],
    topics: [
  { subject: 'Matematik', topic: 'Problemler', wrong: 3, asked: 6 },
  { subject: 'Matematik', topic: 'Fonksiyonlar', wrong: 2, asked: 5 },
  { subject: 'Geometri', topic: 'Çember', wrong: 2, asked: 5 },
  { subject: 'Geometri', topic: 'Üçgenler', wrong: 2, asked: 6 },
    ],
  },
  {
    id: 'a2',
    date: '2025-08-20',
    source: 'XYZ Yayınları TYT 2',
    subjects: [
      { subject: 'Matematik', correct: 26, wrong: 9, blank: 5 },
      { subject: 'Geometri', correct: 12, wrong: 4, blank: 4 },
      { subject: 'Fizik', correct: 6, wrong: 4, blank: 0 },
    ],
    topics: [
  { subject: 'Matematik', topic: 'Problemler', wrong: 4, asked: 7 },
  { subject: 'Matematik', topic: 'Trigonometri', wrong: 3, asked: 6 },
  { subject: 'Geometri', topic: 'Çember', wrong: 1, asked: 4 },
  { subject: 'Fizik', topic: 'Basınç', wrong: 2, asked: 5 },
    ],
  },
  {
    id: 'a3',
    date: '2025-08-25',
    source: 'ABC Yayınları TYT 1',
    subjects: [
      { subject: 'Matematik', correct: 30, wrong: 6, blank: 4 },
      { subject: 'Geometri', correct: 11, wrong: 5, blank: 4 },
      { subject: 'Fizik', correct: 8, wrong: 2, blank: 0 },
    ],
    topics: [
  { subject: 'Matematik', topic: 'Problemler', wrong: 2, asked: 5 },
  { subject: 'Matematik', topic: 'Trigonometri', wrong: 2, asked: 5 },
  { subject: 'Geometri', topic: 'Çember', wrong: 2, asked: 5 },
  { subject: 'Geometri', topic: 'Çokgenler', wrong: 1, asked: 4 },
    ],
  },
];

function calcNet(subjects: AttemptSubjectStat[]) {
  const sums = subjects.reduce((acc, s) => { acc.correct += s.correct; acc.wrong += s.wrong; acc.blank += s.blank; return acc; }, {correct:0, wrong:0, blank:0});
  const totalAnswered = sums.correct + sums.wrong;
  const accuracy = totalAnswered ? (sums.correct / totalAnswered) : 0;
  return { ...sums, accuracy };
}

export const AttemptsList: React.FC<{ attempts: ExamAttempt[]; onTopic:(t:string)=>void; onEdit:(a:ExamAttempt)=>void; onDelete:(id:string)=>void; }> = ({ attempts, onTopic, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState<string | null>(attempts[0]?.id || null);
  const useVirtual = attempts.length > 150;
  const ListRef = useRef<any>(null);

  useEffect(()=> {
    if (useVirtual && !ListRef.current) {
      import('react-window')
        .then(mod => { ListRef.current = mod.FixedSizeList; })
        .catch(()=> { /* silently fallback */ });
    }
  }, [useVirtual]);
  const rows = useMemo(()=> attempts.map(a=> ({ a, net: calcNet(a.subjects) })), [attempts]);
  if (!useVirtual || !ListRef.current) {
    return (
      <div className="exam-tracker-layout__list">
        {rows.map(({a, net}) => (
          <AttemptRow key={a.id} attempt={a} expanded={expanded===a.id} onToggle={() => setExpanded(expanded===a.id ? null : a.id)} net={net} onTopic={onTopic} onEdit={onEdit} onDelete={onDelete}/>
        ))}
      </div>
    );
  }
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const { a, net } = rows[index];
    return (
      <div style={style}>
        <AttemptRow attempt={a} expanded={expanded===a.id} onToggle={() => setExpanded(expanded===a.id ? null : a.id)} net={net} onTopic={onTopic} onEdit={onEdit} onDelete={onDelete} />
      </div>
    );
  };
  const ListComp = ListRef.current;
  return (
    <div className="exam-tracker-layout__list">
      <ListComp height={600} width={"100%"} itemCount={rows.length} itemSize={expanded? 220: 140} overscanCount={5}>
        {Row as any}
      </ListComp>
    </div>
  );
};
