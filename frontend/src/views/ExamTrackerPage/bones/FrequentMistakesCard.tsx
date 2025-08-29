import React from 'react';

export const FrequentMistakesCard: React.FC<{ frequent: { topic:string; total:number; subject:string; }[]; onTopic:(t:string)=>void; }> = ({ frequent, onTopic }) => {
  return (
    <div className="exam-tracker-layout__card frequent-mistakes-card">
      <h3 className="card-title">En Sık Yanlışlar</h3>
      <ul className="frequent-list">
        {frequent.map(f => (
          <li key={f.topic} className="frequent-item" onClick={()=> onTopic(f.topic)}>
            <span className="frequent-item__name">{f.topic}</span>
            <span className="frequent-item__count">{f.total}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
