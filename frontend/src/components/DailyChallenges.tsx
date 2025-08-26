import React from 'react';
import { Card, Progress, Space, Tag, Button } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { apiRequest } from '../services/api';

interface Props { data: any; onClaimed?: () => void }

const DailyChallenges: React.FC<Props> = ({ data, onClaimed }) => {
  if (!data) return null;
  const challenges = data.challenges || [];
  const claim = async (key: string) => {
    await apiRequest('/gamification/claim-challenge', { method: 'POST', body: JSON.stringify({ key }) });
    onClaimed?.();
  };
  return (
    <Card title={<Space><ThunderboltOutlined /> Günlük Meydan Okumalar</Space>} size="small" style={{ marginTop: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        {challenges.map((c: any) => {
          const percent = (c.current / c.target) * 100;
          return (
            <Card key={c.key} size="small" style={{ background: '#fafafa' }} bodyStyle={{ padding: 12 }}>
              <Space direction="vertical" style={{ width: '100%' }} size={4}>
                <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontWeight: 600 }}>{c.title}</span>
                  <Tag color={c.isCompleted ? (c.claimed ? 'green' : 'gold') : 'blue'}>
                    {c.isCompleted ? (c.claimed ? 'Alındı' : 'Hazır') : `${Math.round(percent)}%`}
                  </Tag>
                </Space>
                <div style={{ fontSize: 12, color: '#555' }}>{c.description}</div>
                <Progress percent={Math.min(100, percent)} size="small" strokeColor={c.isCompleted ? '#52c41a' : '#1890ff'} />
                <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                  <Tag color="gold">+{c.xpReward} XP</Tag>
                  {c.isCompleted && !c.claimed && (
                    <Button size="small" type="primary" onClick={() => claim(c.key)}>Al</Button>
                  )}
                </Space>
              </Space>
            </Card>
          );
        })}
      </Space>
    </Card>
  );
};

export default DailyChallenges;
