import React, { useMemo } from 'react';
import { Row, Col, Card, Space, Button, Statistic, Tag, Rate, Typography, Empty } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { CoachesStatsList } from '../../../components/admin';
import type { FeedbackSummary } from '../../../services/api';

const { Text } = Typography;

const pieColors = ['#1890ff', '#faad14', '#52c41a', '#722ed1', '#ff4d4f'];

interface AnalyticsTabProps {
  feedbackSummary: FeedbackSummary | null;
  coachesStats: any[];
  analyticsLoading: boolean;
  refreshAnalytics(): void;
}

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ feedbackSummary, coachesStats, analyticsLoading, refreshAnalytics }) => {
  const categoryChartData = useMemo(() => feedbackSummary ? [
    { name: 'İletişim', value: feedbackSummary.categoryAverages.communication },
    { name: 'Program Kalitesi', value: feedbackSummary.categoryAverages.programQuality },
    { name: 'Memnuniyet', value: feedbackSummary.categoryAverages.overallSatisfaction }
  ] : [], [feedbackSummary]);

  const issuesChartData = useMemo(() => feedbackSummary ? [
    { name: 'Aşırı Baskı', value: feedbackSummary.issuesCounts.tooMuchPressure },
    { name: 'Yetersiz Destek', value: feedbackSummary.issuesCounts.notEnoughSupport },
    { name: 'İletişim', value: feedbackSummary.issuesCounts.communicationProblems },
    { name: 'Uygun Değil', value: feedbackSummary.issuesCounts.programNotSuitable }
  ] : [], [feedbackSummary]);

  const statusChartData = useMemo(() => feedbackSummary ? [
    { name: 'Yeni', value: feedbackSummary.statusCounts.new },
    { name: 'Okundu', value: feedbackSummary.statusCounts.read }
  ] : [], [feedbackSummary]);

  return (
    <>
      <Space style={{ width: '100%', marginBottom: 12, justifyContent: 'flex-end' }}>
        <Button icon={<ReloadOutlined />} onClick={refreshAnalytics} loading={analyticsLoading}>
          Yenile
        </Button>
      </Space>
      <Row gutter={[24, 24]}>
        <Col xs={24} md={8}>
          <Card title="Ortalama Puan" loading={analyticsLoading}>
            <Statistic
              title="Genel Ortalama"
              value={feedbackSummary?.averageRating || 0}
              precision={1}
              valueStyle={{ color: '#faad14' }}
            />
            <div style={{ marginTop: 8 }}>
              <Rate allowHalf disabled value={Number(feedbackSummary?.averageRating || 0)} />
            </div>
            <div style={{ marginTop: 12 }}>
              <Text type="secondary">
                Son feedback: {feedbackSummary?.lastFeedbackDate ? new Date(feedbackSummary.lastFeedbackDate).toLocaleDateString('tr-TR') : '-'}
              </Text>
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Tag color="blue">Yeni: {feedbackSummary?.statusCounts.new ?? 0}</Tag>
              <Tag color="green">Okundu: {feedbackSummary?.statusCounts.read ?? 0}</Tag>
              <Tag color="gold">Toplam: {feedbackSummary?.totalFeedbacks ?? 0}</Tag>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="📌 Durum Dağılımı" loading={analyticsLoading}>
            {statusChartData.length ? (
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusChartData} dataKey="value" nameKey="name" outerRadius={80} label>
                      {statusChartData.map((_, index) => (
                        <Cell key={`status-${index}`} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Empty description="Veri yok" />
            )}
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="🧩 Sorun Dağılımı" loading={analyticsLoading}>
            {issuesChartData.length ? (
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={issuesChartData} dataKey="value" nameKey="name" outerRadius={80} label>
                      {issuesChartData.map((_, index) => (
                        <Cell key={`issue-${index}`} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Empty description="Veri yok" />
            )}
          </Card>
        </Col>
        <Col span={24}>
          <Card title="Kategori Ortalama Puanları" loading={analyticsLoading}>
            {categoryChartData.length ? (
              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1890ff" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#69c0ff" stopOpacity={0.9} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 5]} tickCount={6} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" name="Ortalama" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Empty description="Veri yok" />
            )}
          </Card>
        </Col>
        <Col span={24}>
          <Card title="👥 Koç Özeti" loading={analyticsLoading}>
            {coachesStats.length ? (
              <CoachesStatsList
                items={coachesStats
                  .slice()
                  .sort((a, b) => (b?.feedbackStats?.totalFeedbacks || 0) - (a?.feedbackStats?.totalFeedbacks || 0))
                  .slice(0, 5)}
              />
            ) : (
              <Empty description="Koç istatistiği bulunamadı" />
            )}
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default AnalyticsTab;
