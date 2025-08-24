import React from 'react';
import StudyPlan from '../StudyPlan';

// Günlük tablo sekmesinin bağımsız sayfa versiyonu
const DailyPlanPage: React.FC = () => {
  return <StudyPlan initialTab="daily" />;
};

export default DailyPlanPage;
