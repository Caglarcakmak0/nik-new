import React from 'react';
import { Typography } from 'antd';
import { SessionHistory } from '../bones';
import '../StudyTracker.scss';

const { Title } = Typography;

const StudyTrackerSessions: React.FC = () => (
  <div className="study-tracker">
    <div style={{ marginBottom: 24 }}>
      <Title level={2} style={{ margin: 0, fontWeight: 500, fontSize: '24px' }}>Oturum Geçmişi</Title>
    </div>
    <SessionHistory />
  </div>
);

export default StudyTrackerSessions;
