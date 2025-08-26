import React from 'react';
import { Typography } from 'antd';
import StudyCalendar from '../../StudyCalendar';
import '../StudyTracker.scss';

const { Title } = Typography;

const StudyTrackerCalendar: React.FC = () => (
  <div className="study-tracker">
    <div style={{ marginBottom: 24 }}>
      <Title level={2} style={{ margin: 0, fontWeight: 500, fontSize: '24px' }}>Çalışma Takvimi</Title>
    </div>
    <StudyCalendar />
  </div>
);

export default StudyTrackerCalendar;
