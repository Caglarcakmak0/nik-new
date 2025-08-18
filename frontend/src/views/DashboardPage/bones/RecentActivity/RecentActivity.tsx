import React from 'react';
import { Card, List, Tag, Typography } from 'antd';

const { Text } = Typography;

interface Activity {
  date: string;
  subject: string;
  duration: number;
  quality: number;
  mood: string;
  efficiency: number;
}

interface RecentActivityProps {
  activities: Activity[];
  loading?: boolean;
}

const RecentActivity: React.FC<RecentActivityProps> = ({ activities, loading = false }) => {
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}s ${mins}d` : `${mins}d`;
  };

  return (
    <Card title="Son Aktiviteler" loading={loading}>
      {activities && activities.length > 0 ? (
        <List
          dataSource={activities}
          renderItem={(activity) => (
            <List.Item>
              <div style={{ width: '100%' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center' 
                }}>
                  <div>
                    <Text strong>{activity.subject}</Text>
                    <br />
                    <Text type="secondary">
                      {formatTime(activity.duration)} • Kalite: {activity.quality}/5 • {activity.mood}
                    </Text>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <Text type="secondary">
                      {new Date(activity.date).toLocaleDateString('tr-TR')}
                    </Text>
                    <br />
                    <Tag color={
                      activity.efficiency > 70 ? 'green' : 
                      activity.efficiency > 40 ? 'orange' : 'red'
                    }>
                      %{activity.efficiency}
                    </Tag>
                  </div>
                </div>
              </div>
            </List.Item>
          )}
        />
      ) : (
        <div style={{ textAlign: 'center', padding: '32px' }}>
          <Text type="secondary">Henüz çalışma kaydın yok</Text>
          <br />
          <Text type="secondary">Study Tracker ile çalışmalarını kaydetmeye başla!</Text>
        </div>
      )}
    </Card>
  );
};

export default RecentActivity;