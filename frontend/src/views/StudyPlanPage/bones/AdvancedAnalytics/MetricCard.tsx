import React from 'react';
import { Card, Statistic, Typography } from 'antd';

const { Text } = Typography;

interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  suffix?: string;
  description?: string;
  color: string;
  status: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, suffix, description, color, status }) => {
  return (
    <Card className={`metric-card ${status}`} variant="borderless">
      <div className="metric-content">
        <div className="metric-icon">{icon}</div>
        <div className="metric-details">
          <Statistic
            title={title}
            value={value}
            suffix={suffix}
            valueStyle={{ color, fontSize: '24px', fontWeight: 700 }}
          />
          {description && <Text type="secondary" className="metric-description">{description}</Text>}
        </div>
        <div className="metric-indicator">
          <div className="indicator-dot" style={{ backgroundColor: color }} />
        </div>
      </div>
    </Card>
  );
};

export default MetricCard;