import React, { useState } from 'react';
import { Typography } from 'antd';
import StudyCalendar from '../../StudyCalendar';
import '../StudyTracker.scss';

const { Title } = Typography;

const StudyTrackerCalendar: React.FC = () => {
  const [mode, setMode] = useState<'study' | 'question'>('study');

  return (
    <div className="study-tracker">
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Title level={2} style={{ margin: 0, fontWeight: 500, fontSize: '24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            onClick={() => setMode('study')}
            style={{
              cursor: 'pointer',
              color: mode === 'study' ? '#3c3b3bff' : undefined,
              textDecoration: mode === 'study' ? 'box-shadow: inset 0 -2px 0 0 currentColor' : 'none'
            }}
          >Çalışma Takvimi</span>
          <span style={{ opacity: 0.5 }}>|</span>
          <span
            onClick={() => setMode('question')}
            style={{
              cursor: 'pointer',
              color: mode === 'question' ? '#3c3b3bff' : undefined,
            }}
          >Soru Takvimi</span>
        </Title>
      </div>
  <StudyCalendar key={`calendar-${mode}`} mode={mode} />
    </div>
  );
};

export default StudyTrackerCalendar;
