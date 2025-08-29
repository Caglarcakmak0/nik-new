import React from 'react';

export const SuggestionsCard: React.FC<{ suggestions: { topic:string; reason:string; action:string; }[] }> = ({ suggestions }) => {
  return (
    <div className="exam-tracker-layout__card suggestions-card">
      <h3 className="card-title">Öneriler</h3>
      <ul className="suggestions-list">
  {suggestions.map(s => (
          <li key={s.topic} className="suggestion-item">
            <div className="suggestion-item__topic">{s.topic}</div>
            <div className="suggestion-item__reason">{s.reason}</div>
            <div className="suggestion-item__action">{s.action}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};
