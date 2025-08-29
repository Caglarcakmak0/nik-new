import React from 'react';
import { SuggestionsCard } from './SuggestionsCard.tsx';
import { FrequentMistakesCard } from './FrequentMistakesCard.tsx';

export const InsightsColumn: React.FC<{
  suggestions: { topic:string; reason:string; action:string; }[];
  frequent: { topic:string; total:number; subject:string; }[];
  onTopic:(t:string)=>void;
}> = ({ suggestions, frequent, onTopic }) => (
  <div className="exam-tracker-layout__insights">
    <SuggestionsCard suggestions={suggestions} />
    <FrequentMistakesCard frequent={frequent} onTopic={onTopic} />
  </div>
);
