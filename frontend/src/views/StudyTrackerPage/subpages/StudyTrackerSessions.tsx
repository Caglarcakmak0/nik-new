import React from 'react';
import { Typography } from 'antd';
import AISuggestionsPanel from '../../../components/AISuggestions/AISuggestionsPanel';
import { SessionHistory } from '../bones';
import '../StudyTracker.scss';

const { Title } = Typography;

const StudyTrackerSessions: React.FC = () => (
  <div className="study-tracker">
    <div style={{ marginBottom: 24, display:'flex', justifyContent:'space-between', alignItems:'center', gap:16, flexWrap:'wrap' }}>
      <Title level={2} style={{ margin: 0, fontWeight: 500, fontSize: '24px' }}>Oturum Geçmişi</Title>
      <div style={{ width:280, flex:'0 0 auto' }}>
        <AISuggestionsPanel scope="exam_tracker" />
      </div>
    </div>
    <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:16 }}>
      <SessionHistory />
    </div>
  </div>
);

export default StudyTrackerSessions;
