import React from 'react';
import { List, Tag, Typography, Space } from 'antd';

type CoachesStatsItem = {
  coach: { id: string; name: string; email?: string };
  studentStats: { total: number; active: number; inactive: number };
  feedbackStats: {
    totalFeedbacks: number;
    averageRating: number;
    categoryAverages: { communication: number; programQuality: number; overallSatisfaction: number };
  };
  lastUpdated?: string;
};

export type CoachesStatsListProps = {
  items: CoachesStatsItem[];
  title?: React.ReactNode;
  loading?: boolean;
};

const CoachesStatsList: React.FC<CoachesStatsListProps> = ({ items, title, loading }) => {
  return (
    <List
      header={title}
      loading={loading}
      dataSource={items}
      renderItem={(item) => (
        <List.Item>
          <List.Item.Meta
            title={
              <Space>
                {item.coach.name}
                <Tag>{(item.feedbackStats.averageRating as any)?.toFixed?.(1) ?? item.feedbackStats.averageRating}</Tag>
              </Space>
            }
            description={
              <Typography.Text type="secondary">
                Aktif: {item.studentStats.active} • Pasif: {item.studentStats.inactive} • Toplam: {item.studentStats.total}
              </Typography.Text>
            }
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <Tag color="gold">{item.feedbackStats.totalFeedbacks}</Tag>
            <Tag color="blue">İletişim {item.feedbackStats.categoryAverages.communication}</Tag>
            <Tag color="green">Program {item.feedbackStats.categoryAverages.programQuality}</Tag>
            <Tag color="purple">Memnuniyet {item.feedbackStats.categoryAverages.overallSatisfaction}</Tag>
          </div>
        </List.Item>
      )}
    />
  );
};

export default CoachesStatsList;


