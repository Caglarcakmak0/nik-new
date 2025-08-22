import React, { useState } from 'react';
import { Typography, Card, Space } from 'antd';
import { StudyTimer } from '../bones';
import '../StudyTracker.scss';

const { Title, Text } = Typography;

const StudyTrackerTimer: React.FC = () => {
  const [lastSession, setLastSession] = useState<any | null>(null);
  return (
    <div className="study-tracker">
      <div style={{ marginBottom: 24 }}>
  <Title level={2} style={{ margin: 0, fontWeight: 500, fontSize: '24px' }}>Serbest Zamanlayıcı</Title>
  <Text type="secondary">Sadece serbest zamanlayıcı ile hızlı çalışma seansları başlatabilirsiniz.</Text>
      </div>
      <div className="study-tracker-grid">
        <div className="left-panel" style={{ gridColumn: '1 / -1' }}>
          <StudyTimer size="large" onSessionComplete={(s) => setLastSession(s)} />
        </div>
      </div>
      {lastSession && (
        <Card style={{ marginTop: 24 }}>
          <Space direction="vertical" size="small">
            <Text strong>Son Oturum Kaydedildi</Text>
            <Text>{lastSession.subject} - {lastSession.duration} dk - {new Date(lastSession.date).toLocaleTimeString('tr-TR')}</Text>
          </Space>
        </Card>
      )}
    </div>
  );
};

export default StudyTrackerTimer;
