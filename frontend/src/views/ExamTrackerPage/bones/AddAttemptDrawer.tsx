import React, { useState } from 'react';
import type { ExamAttempt, AttemptSubjectStat, AttemptTopicMistake } from './AttemptsList.tsx';

interface Props { open: boolean; onClose:()=>void; onSubmit:(a:ExamAttempt)=>void; attempts?: ExamAttempt[]; initial?: ExamAttempt; }

export const AddAttemptDrawer: React.FC<Props> = ({ open, onClose, onSubmit, attempts = [], initial }) => {
  const [date, setDate] = useState<string>(initial?.date || '');
  const [source, setSource] = useState<string>(initial?.source || '');
  const [subjects, setSubjects] = useState<AttemptSubjectStat[]>(initial?.subjects || []);
  const [topics, setTopics] = useState<AttemptTopicMistake[]>(initial?.topics || []);

  // Reset when initial changes (edit vs yeni)
  React.useEffect(()=> {
    if (open) {
      setDate(initial?.date || '');
      setSource(initial?.source || '');
      setSubjects(initial?.subjects || []);
      setTopics(initial?.topics || []);
    }
  }, [initial, open]);

  if (!open) return null;

  function addSubject() { setSubjects(s => [...s, { subject:'', correct:0, wrong:0, blank:0 }]); }
  function updateSubject(i:number, patch:Partial<AttemptSubjectStat>) { setSubjects(s => s.map((row,idx)=> idx===i? {...row,...patch}:row)); }
  function addTopic() { setTopics(t => [...t, { subject:'', topic:'', wrong:1 }]); }
  function updateTopic(i:number, patch:Partial<AttemptTopicMistake>) { setTopics(t => t.map((row,idx)=> idx===i? {...row,...patch}:row)); }

  const subjectNames = Array.from(new Set(attempts.flatMap(a=> a.subjects.map(s=> s.subject)))).filter(Boolean);
  const topicNames = Array.from(new Set(attempts.flatMap(a=> a.topics.map(t=> t.topic)))).filter(Boolean);
  const autoAddedSubjects: string[] = [];
  // auto-add subjects from topics if not present
  topics.forEach(t=> { if (t.subject && !subjects.some(s=> s.subject===t.subject)) { autoAddedSubjects.push(t.subject); } });

  const totalNet = subjects.reduce((acc,s)=> acc + (s.correct - s.wrong*0.25), 0);

  const errors:string[] = [];
  // Basic validations
  const dt = date ? new Date(date) : null;
  if (dt && dt.getTime() > Date.now()+ 1000*60*60*24) errors.push('Tarih gelecekte olamaz');
  subjects.forEach((s,i)=> {
    if (s.correct<0||s.wrong<0||s.blank<0) errors.push(`Ders ${i+1}: negatif değer`);
  });
  // total answered sanity (optional, if total known)
  topics.forEach((t,i)=> { if (t.wrong<0) errors.push(`Konu ${i+1}: negatif yanlış`); });
  const formValid = date && source.trim() && subjects.some(s=> s.subject.trim()) && errors.length===0;

  function submit() {
    if (!formValid) return;
    // Normalize strings
    const norm = (v:string)=> v.trim().replace(/\s+/g,' ');
    // Append auto-added subjects with zero stats
    const extendedSubjects = [...subjects];
    autoAddedSubjects.forEach(sub => {
      if (!extendedSubjects.some(s=> s.subject===sub)) extendedSubjects.push({ subject: sub, correct:0, wrong:0, blank:0 });
    });
    const attempt: ExamAttempt = {
      id: initial?.id || ('temp-' + Date.now()),
      date,
      source: norm(source),
      subjects: extendedSubjects.filter(s => s.subject).map(s=> ({ ...s, subject:norm(s.subject) })),
      topics: topics.filter(t => t.topic).map(t=> ({ ...t, subject: norm(t.subject), topic: norm(t.topic) })),
    };
    onSubmit(attempt);
    onClose();
    setDate(''); setSource(''); setSubjects([]); setTopics([]);
  }

  return (
    <div className="et-drawer-backdrop" onClick={onClose}>
      <div className="et-drawer" onClick={e=> e.stopPropagation()}>
        <div className="et-drawer__header">
          <h3>{initial ? 'Deneme Düzenle' : 'Deneme Ekle'}</h3>
          <button onClick={onClose} className="et-close">×</button>
        </div>
        <div className="et-drawer__body">
          <label className="et-field">Tarih
            <input type="date" value={date} onChange={e=> setDate(e.target.value)} />
          </label>
          <label className="et-field">Yayın
            <input type="text" value={source} onChange={e=> setSource(e.target.value)} placeholder="Örn: XYZ Yayınları TYT 3" />
          </label>

          <div className="et-section">
            <div className="et-section__head">
              <h4>Dersler</h4>
              <button type="button" onClick={addSubject}>+ Ders</button>
            </div>
            <div className="et-table like-grid">
              <div className="et-table__head">Ders</div>
              <div className="et-table__head">Doğru</div>
              <div className="et-table__head">Yanlış</div>
              <div className="et-table__head">Boş</div>
              {subjects.map((s,i)=>([
                <input list="et-subjects" key={'subj-'+i} placeholder="Ders" value={s.subject} onChange={e=> updateSubject(i,{subject:e.target.value})} />,
                <input key={'cor-'+i} type="number" value={s.correct} onChange={e=> updateSubject(i,{correct:Number(e.target.value)})} />,
                <input key={'wrong-'+i} type="number" value={s.wrong} onChange={e=> updateSubject(i,{wrong:Number(e.target.value)})} />,
                <input key={'blank-'+i} type="number" value={s.blank} onChange={e=> updateSubject(i,{blank:Number(e.target.value)})} />
              ]))}
            </div>
            <datalist id="et-subjects">
              {subjectNames.map(s=> <option key={s} value={s} />)}
            </datalist>
          </div>

          <div className="et-section">
            <div className="et-section__head">
              <h4>Konular (yanlış)</h4>
              <button type="button" onClick={addTopic}>+ Konu</button>
            </div>
            <div className="et-table like-grid">
              <div className="et-table__head">Ders</div>
              <div className="et-table__head">Konu</div>
              <div className="et-table__head">Yanlış</div>
              {topics.map((t,i)=>([
                <input list="et-subjects" key={'tsub-'+i} placeholder="Ders" value={t.subject} onChange={e=> updateTopic(i,{subject:e.target.value})} />,
                <input list="et-topics" key={'ttop-'+i} placeholder="Konu" value={t.topic} onChange={e=> updateTopic(i,{topic:e.target.value})} />,
                <input key={'twrong-'+i} type="number" value={t.wrong} onChange={e=> updateTopic(i,{wrong:Number(e.target.value)})} />
              ]))}
            </div>
            <datalist id="et-topics">
              {topicNames.map(t=> <option key={t} value={t} />)}
            </datalist>
          </div>
          <div className="et-summary-box">Toplam Net: <strong>{totalNet.toFixed(2)}</strong></div>
          {errors.length>0 && (
            <div className="et-errors">
              {errors.map(e=> <div key={e} className="et-error-item">{e}</div>)}
            </div>
          )}
        </div>
        <div className="et-drawer__footer">
          <button disabled={!formValid} onClick={submit} className="etl-btn etl-btn--primary" type="button">{initial ? 'Güncelle' : 'Kaydet'}</button>
        </div>
      </div>
    </div>
  );
};
