import React from 'react';
import { Card, Row, Col, Progress, Space } from 'antd';
import {
  ClockCircleOutlined,
  BookOutlined,
  StarOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { StarFilled, StarOutlined as StarOutlinedEmpty } from '@ant-design/icons';
import { useTheme } from '../../../../contexts/ThemeContext';
import { DayData } from '../../types';

interface DayStatsProps {
  selectedDayData: DayData;
}

const DayStats: React.FC<DayStatsProps> = ({ selectedDayData }) => {
  const { isDark } = useTheme();

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}s ${m}d` : `${m}d`;
  };

  const renderStars = (val: number) => (
    <span>
      {Array.from({ length: 5 }).map((_, i) => 
        i < Math.round(val) ? (
          <StarFilled key={i} style={{ color: '#fbbf24', fontSize: 14 }} />
        ) : (
          <StarOutlinedEmpty key={i} style={{ color: isDark ? '#475569' : '#d1d5db', fontSize: 14 }} />
        )
      )}
    </span>
  );

  const cardBg = isDark ? '#1f2937' : '#ffffff';
  const trailColor = isDark ? '#334155' : '#f1f5f9';
  const textPrimary = isDark ? '#f1f5f9' : '#1f2937';
  const textSecondary = isDark ? '#94a3b8' : '#6b7280';

  return (
    <Row gutter={[20, 20]} style={{ marginBottom: 8 }}>
      <Col xs={12} md={6}>
        <Card 
          size="small" 
          bordered={false} 
          style={{ 
            borderRadius: 14, 
            boxShadow: isDark ? '0 2px 6px rgba(0,0,0,0.6)' : '0 2px 6px rgba(0,0,0,0.05)', 
            background: cardBg 
          }}
        >
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            <span style={{ 
              fontSize: 12, 
              color: textSecondary, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6 
            }}>
              <ClockCircleOutlined style={{ color: '#10b981' }} /> Süre
            </span>
            <span style={{ fontSize: 20, fontWeight: 600, color: textPrimary }}>
              {formatTime(selectedDayData.totalTime)}
            </span>
            <Progress 
              percent={Math.min(100, (selectedDayData.totalTime / 240) * 100)} 
              showInfo={false} 
              strokeColor="#10b981" 
              trailColor={trailColor} 
              style={{ marginBottom: 0 }} 
            />
          </Space>
        </Card>
      </Col>
      
      <Col xs={12} md={6}>
        <Card 
          size="small" 
          bordered={false} 
          style={{ 
            borderRadius: 14, 
            boxShadow: isDark ? '0 2px 6px rgba(0,0,0,0.6)' : '0 2px 6px rgba(0,0,0,0.05)', 
            background: cardBg 
          }}
        >
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            <span style={{ 
              fontSize: 12, 
              color: textSecondary, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6 
            }}>
              <BookOutlined style={{ color: '#8b5cf6' }} /> Oturum
            </span>
            <span style={{ fontSize: 20, fontWeight: 600, color: textPrimary }}>
              {selectedDayData.sessionCount}
            </span>
            <Progress 
              percent={Math.min(100, (selectedDayData.sessionCount / 8) * 100)} 
              showInfo={false} 
              strokeColor="#8b5cf6" 
              trailColor={trailColor} 
              style={{ marginBottom: 0 }} 
            />
          </Space>
        </Card>
      </Col>
      
      <Col xs={12} md={6}>
        <Card 
          size="small" 
          bordered={false} 
          style={{ 
            borderRadius: 14, 
            boxShadow: isDark ? '0 2px 6px rgba(0,0,0,0.6)' : '0 2px 6px rgba(0,0,0,0.05)', 
            background: cardBg 
          }}
        >
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            <span style={{ 
              fontSize: 12, 
              color: textSecondary, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6 
            }}>
              <StarOutlined style={{ color: '#f59e0b' }} /> Kalite
            </span>
            <span style={{ 
              fontSize: 20, 
              fontWeight: 600, 
              color: textPrimary, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 4 
            }}>
              {selectedDayData.averageQuality.toFixed(1)} {renderStars(selectedDayData.averageQuality)}
            </span>
            <Progress 
              percent={Math.min(100, (selectedDayData.averageQuality / 5) * 100)} 
              showInfo={false} 
              strokeColor="#f59e0b" 
              trailColor={trailColor} 
              style={{ marginBottom: 0 }} 
            />
          </Space>
        </Card>
      </Col>
      
      <Col xs={12} md={6}>
        <Card 
          size="small" 
          bordered={false} 
          style={{ 
            borderRadius: 14, 
            boxShadow: isDark ? '0 2px 6px rgba(0,0,0,0.6)' : '0 2px 6px rgba(0,0,0,0.05)', 
            background: cardBg 
          }}
        >
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            <span style={{ 
              fontSize: 12, 
              color: textSecondary, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6 
            }}>
              <EyeOutlined style={{ color: '#3b82f6' }} /> Verimlilik
            </span>
            <span style={{ fontSize: 20, fontWeight: 600, color: textPrimary }}>
              {Math.round(selectedDayData.averageEfficiency)}%
            </span>
            <Progress 
              percent={Math.round(selectedDayData.averageEfficiency)} 
              showInfo={false} 
              strokeColor="#3b82f6" 
              trailColor={trailColor} 
              style={{ marginBottom: 0 }} 
            />
          </Space>
        </Card>
      </Col>
    </Row>
  );
};

export default DayStats;
