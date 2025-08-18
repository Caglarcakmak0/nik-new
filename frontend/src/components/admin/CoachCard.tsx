import React from 'react';
import { Card, Descriptions, Statistic, Row, Col, Typography, Avatar, Space } from 'antd';
import { UserOutlined, StarFilled } from '@ant-design/icons';

type CoachPerformance = {
  coach: { id: string; name: string; email?: string; avatar?: string | null };
  studentStats: { total: number; active: number; inactive: number };
  feedbackStats: {
    totalFeedbacks: number;
    averageRating: number;
    categoryAverages: { communication: number; programQuality: number; overallSatisfaction: number };
    issuesCounts: { tooMuchPressure: number; notEnoughSupport: number; communicationProblems: number; programNotSuitable: number };
    lastFeedbackDate: string | null;
  };
  lastUpdated?: string | null;
};

export type CoachCardProps = {
  data: CoachPerformance;
  title?: string;
  loading?: boolean;
};

const CoachCard: React.FC<CoachCardProps> = ({ data, title = 'Koç Performansı', loading }) => {
  return (
    <Card title={title} loading={loading}>
      <Space style={{ marginBottom: 12 }}>
        <Avatar icon={<UserOutlined />} src={data.coach?.avatar || undefined} />
        <div>
          <Typography.Text strong>{data.coach?.name}</Typography.Text>
          {data.coach?.email && (
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{data.coach.email}</div>
          )}
        </div>
      </Space>

      <Descriptions column={3} size="small">
        <Descriptions.Item label="Aktif Öğrenci">{data.studentStats?.active ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="Pasif Öğrenci">{data.studentStats?.inactive ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="Toplam Öğrenci">{data.studentStats?.total ?? '-'}</Descriptions.Item>
      </Descriptions>

      <Row gutter={12} style={{ marginTop: 12 }}>
        <Col span={12}>
          <Statistic
            title="Feedback Sayısı"
            value={data.feedbackStats?.totalFeedbacks || 0}
            prefix={<StarFilled style={{ color: '#faad14' }} />}
          />
        </Col>
        <Col span={12}>
          <Statistic title="Ortalama Puan" value={data.feedbackStats?.averageRating || 0} precision={1} />
        </Col>
      </Row>

      <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
        Son feedback: {data.feedbackStats?.lastFeedbackDate ? new Date(data.feedbackStats?.lastFeedbackDate).toLocaleDateString('tr-TR') : '-'}
      </Typography.Paragraph>
    </Card>
  );
};

export default CoachCard;


