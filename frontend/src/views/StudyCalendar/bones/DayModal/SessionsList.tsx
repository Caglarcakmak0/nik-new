import React from 'react';
import { Card, Space, Tag, Tooltip } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { StarFilled, StarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTheme } from '../../../../contexts/ThemeContext';
import { StudySession } from '../../types';

interface SessionsListProps {
  sessions: StudySession[];
}

const SessionsList: React.FC<SessionsListProps> = ({ sessions }) => {
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
          <StarOutlined key={i} style={{ color: isDark ? '#475569' : '#d1d5db', fontSize: 14 }} />
        )
      )}
    </span>
  );

  const getSubjectColor = (subject: string) => {
    const palette = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#ec4899'];
    let hash = 0;
    for (let i = 0; i < subject.length; i++) {
      hash = subject.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palette[Math.abs(hash) % palette.length];
  };

  const cardBg = isDark ? '#1f2937' : '#ffffff';
  const textPrimary = isDark ? '#f1f5f9' : '#1f2937';
  const textSecondary = isDark ? '#94a3b8' : '#6b7280';

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Space style={{ fontWeight: 600, fontSize: 15, color: textPrimary }}>
          <CheckCircleOutlined style={{ color: '#10b981' }} />
          Çalışma Oturumları
        </Space>
        <div style={{ fontSize: 12, color: textSecondary }}>{sessions.length} kayıt</div>
      </div>

      <div style={{ maxHeight: 340, overflowY: 'auto', paddingRight: 4 }}>
        <Space direction="vertical" style={{ width: '100%' }} size={14}>
          {sessions.map(session => {
            const subjectColor = getSubjectColor(session.subject);
            return (
              <Card
                key={session._id}
                size="small"
                bordered={false}
                style={{
                  borderRadius: 16,
                  background: cardBg,
                  boxShadow: isDark ? '0 1px 4px rgba(0,0,0,0.7)' : '0 1px 4px rgba(0,0,0,0.06)',
                  position: 'relative',
                  overflow: 'hidden',
                  border: `1px solid ${isDark ? '#334155' : '#f1f5f9'}`
                }}
                bodyStyle={{ padding: '14px 16px 12px' }}
              >
                <div style={{ 
                  position: 'absolute', 
                  left: 0, 
                  top: 0, 
                  bottom: 0, 
                  width: 6, 
                  background: subjectColor, 
                  opacity: 0.85 
                }} />
                
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: 12, 
                  alignItems: 'center', 
                  justifyContent: 'space-between' 
                }}>
                  <Space size={10} wrap>
                    <Tag color={subjectColor} style={{ borderRadius: 8, margin: 0, fontWeight: 500 }}>
                      {session.subject.charAt(0).toUpperCase() + session.subject.slice(1)}
                    </Tag>
                    <Tag 
                      color={session.technique === 'Pomodoro' ? 'orange' : 'green'} 
                      style={{ borderRadius: 8, margin: 0, fontWeight: 500 }}
                    >
                      {session.technique}
                    </Tag>
                    <Tag 
                      color="default" 
                      style={{ 
                        borderRadius: 8, 
                        margin: 0, 
                        fontWeight: 500, 
                        background: isDark ? '#334155' : '#f1f5f9', 
                        border: 'none', 
                        color: isDark ? '#cbd5e1' : '#475569' 
                      }}
                    >
                      {dayjs(session.date).format('HH:mm')}
                    </Tag>
                  </Space>
                  <div style={{ fontSize: 13, color: textSecondary, fontWeight: 500 }}>
                    {formatTime(session.duration)}
                  </div>
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: 18, 
                  marginTop: 10, 
                  fontSize: 12, 
                  color: textSecondary 
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {renderStars(session.quality)}
                  </span>
                  <span>Verimlilik: %{session.efficiency}</span>
                  <span>Ruh Hali: {session.mood}</span>
                  {session.distractions > 0 && (
                    <span style={{ color: '#ef4444' }}>
                      Dikkat Dağınıklığı: {session.distractions}
                    </span>
                  )}
                  {session.notes && (
                    <Tooltip title={session.notes}>
                      <span style={{ cursor: 'help', color: '#3b82f6' }}>Not</span>
                    </Tooltip>
                  )}
                </div>
              </Card>
            );
          })}
        </Space>
      </div>
    </>
  );
};

export default SessionsList;
