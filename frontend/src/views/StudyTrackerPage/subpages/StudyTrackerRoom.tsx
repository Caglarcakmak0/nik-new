import React from 'react';
import { Typography } from 'antd';
import { StudyRoom } from '../bones';
import '../StudyTracker.scss';

const { Title } = Typography;

const StudyTrackerRoom: React.FC = () => (
  <div className="study-tracker">
    <div style={{ marginBottom: 24 }}>
      <Title level={2} style={{ margin: 0, fontWeight: 500, fontSize: '24px' }}>Çalışma Odası</Title>
    </div>
    <StudyRoom />
  </div>
);

export default StudyTrackerRoom;
