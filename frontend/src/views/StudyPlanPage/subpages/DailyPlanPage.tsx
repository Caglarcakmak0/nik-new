import React from 'react';
import StudyPlan from '../StudyPlan';
import { useAuth } from '../../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

// Günlük tablo sekmesinin bağımsız sayfa versiyonu
const DailyPlanPage: React.FC = () => {
  const { user } = useAuth();
  if (user?.plan?.tier !== 'premium') {
    return <Navigate to="/weekly-plan" replace />;
  }
  return <StudyPlan />;
};

export default DailyPlanPage;
