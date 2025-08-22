import React from 'react';
import { Typography } from 'antd';
import { StudyStatistics } from '../bones';
import '../StudyTracker.scss';

const { Title } = Typography;

const StudyTrackerStatistics: React.FC = () => (
  <div className="study-tracker">
    <div style={{ marginBottom: 24 }}>
      <Title level={2} style={{ margin: 0, fontWeight: 500, fontSize: '24px' }}>İstatistikler</Title>
    </div>
    <StudyStatistics />
  </div>
);

export default StudyTrackerStatistics;
