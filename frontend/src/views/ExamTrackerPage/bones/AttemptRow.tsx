import React from 'react';
import type { ExamAttempt } from './AttemptsList.tsx';

interface Props {
  attempt: ExamAttempt;
  expanded: boolean;
  onToggle: () => void;
  net: { correct: number; wrong: number; blank: number; accuracy: number };
  onTopic: (topic: string) => void;
  onEdit?: (attempt: ExamAttempt) => void;
  onDelete?: (id: string) => void;
}

function performanceClass(acc: number) {
  if (acc >= 0.8) return 'bar--excellent';
  if (acc >= 0.65) return 'bar--good';
  if (acc >= 0.5) return 'bar--medium';
  if (acc >= 0.35) return 'bar--low';
  return 'bar--critical';
}

export const AttemptRow: React.FC<Props> = ({ attempt, expanded, onToggle, net, onTopic, onEdit, onDelete }) => {
  const cls = performanceClass(net.accuracy);
  return (
    <div className={`exam-tracker-layout__attempt ${expanded ? 'exam-tracker-layout__attempt--expanded' : ''}`} onClick={onToggle}>
      <div className={`exam-tracker-layout__attempt__bar ${cls}`} />
    <div className="attempt-head">
        <div className="attempt-head__main">
          <h3 className="attempt-title">{attempt.source}</h3>
          <span className="attempt-date">{new Date(attempt.date).toLocaleDateString('tr-TR')}</span>
        </div>
        <div className="attempt-head__stats">
          <span className="net-chip">Doğru: {net.correct}</span>
          <span className="net-chip net-chip--wrong">Yanlış: {net.wrong}</span>
          <span className="net-chip net-chip--blank">Boş: {net.blank}</span>
          <span className="net-chip net-chip--acc">%{Math.round(net.accuracy*100)}</span>
      {onEdit && <button className="attempt-action" type="button" onClick={(e)=> { e.stopPropagation(); onEdit(attempt); }}>Düzenle</button>}
      {onDelete && <button className="attempt-action attempt-action--danger" type="button" onClick={(e)=> { e.stopPropagation(); onDelete(attempt.id); }}>Sil</button>}
        </div>
      </div>
      {expanded && (
        <div className="exam-tracker-layout__attempt__detail" onClick={e => e.stopPropagation()}>
          <div className="attempt-subjects">
            <table className="subjects-table">
              <thead>
                <tr><th>Ders</th><th>Doğru</th><th>Yanlış</th><th>Boş</th><th>Başarı %</th></tr>
              </thead>
              <tbody>
                {attempt.subjects.map(s => {
                  const ans = s.correct + s.wrong;
                  const acc = ans ? (s.correct/ans) : 0;
                  return <tr key={s.subject}><td>{s.subject}</td><td>{s.correct}</td><td>{s.wrong}</td><td>{s.blank}</td><td>%{Math.round(acc*100)}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
          <div className="attempt-topics">
            <h4 className="topics-head">Yanlış Konular</h4>
            <ul className="topics-list">
              {attempt.topics.map(t => (
                <li key={t.subject + t.topic} className="topic-item" onClick={()=> onTopic(t.topic)}>
                  <span className="topic-item__name">{t.topic}</span>
                  <span className="topic-item__count">{t.wrong}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
