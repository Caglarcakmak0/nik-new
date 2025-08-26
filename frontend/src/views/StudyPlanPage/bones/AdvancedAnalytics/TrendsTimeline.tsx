import React from 'react';
import { Card, Typography, Timeline } from 'antd';
import { 
  RiseOutlined,
  FireOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  RocketOutlined
} from '@ant-design/icons';
import type { StudyPlanLike } from './analyticsTypes';

const { Title, Text } = Typography;

interface Props {
  plan: StudyPlanLike;
  efficiency: number;
}

const TrendsTimeline: React.FC<Props> = ({ plan, efficiency }) => {
  return (
    <Card className="trends-card" variant="borderless">
      <div className="card-header">
        <Title level={4}>
          <RiseOutlined /> Trend Analizi
        </Title>
      </div>
      <div className="trends-content">
        <Timeline
          className="trends-timeline"
          items={[
            {
              className: 'ant-timeline-item-red',
              dot: <FireOutlined />,
              children: (
                <>
                  <Text strong>Günlük Hedef Performansı</Text>
                  <div className="trend-metric">
                    <div className="metric-details">
                      <div className="metric-value">{plan.stats.totalCompletedQuestions} / {plan.stats.totalTargetQuestions}</div>
                    </div>
                  </div>
                </>
              )
            },
            {
              className: 'ant-timeline-item-orange',
              dot: <ClockCircleOutlined />,
              children: (
                <>
                  <Text strong>Zaman Yönetimi</Text>
                  <div className="trend-metric">
                    <div className="metric-details">
                      <div className="metric-label">Toplam Süre</div>
                      <div className="metric-value">{Math.round(plan.stats.totalStudyTime / 60)} dakika</div>
                    </div>
                  </div>
                </>
              )
            },
            {
              className: 'ant-timeline-item-green',
              dot: <TrophyOutlined />,
              children: (
                <>
                  <Text strong>Başarı ve Kalite</Text>
                  <div className="trend-metric">
                    <div className="metric-details">
                      <div className="metric-label">Başarı Oranı</div>
                      <div className="metric-value">%{plan.stats.successRate} ({plan.stats.netScore} net)</div>
                    </div>
                  </div>
                </>
              )
            },
            {
              className: 'ant-timeline-item-red',
              dot: <RocketOutlined />,
              children: (
                <>
                  <Text strong>Verimlilik Skoru</Text>
                  <div className="trend-metric">
                    <div className="metric-details">
                      <div className="metric-label">Soru/Dakika</div>
                      <div className="metric-value">{efficiency.toFixed(1)} soru/dk</div>
                    </div>
                  </div>
                </>
              )
            }
          ]}
        />
      </div>
    </Card>
  );
};

export default TrendsTimeline;