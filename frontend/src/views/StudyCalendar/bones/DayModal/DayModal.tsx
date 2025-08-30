import React from 'react';
import { Modal, Row, Col, Divider, Spin } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useTheme } from '../../../../contexts/ThemeContext';
import { DayData, StudySession } from '../../types';
import DayStats from './DayStats';
import SessionsList from './SessionsList';
import QuickDYBEntry from './QuickDYBEntry';
import PracticeExams from './PracticeExams';

interface DayModalProps {
  open: boolean;
  onClose: () => void;
  selectedDayData: DayData | null;
  dayModalDate: Dayjs | null;
  sessions: StudySession[];
  mode?: 'study' | 'question';
}

const DayModal: React.FC<DayModalProps> = ({
  open,
  onClose,
  selectedDayData,
  dayModalDate,
  sessions,
  mode = 'study'
}) => {
  const { isDark } = useTheme();

  if (!selectedDayData || !dayModalDate) {
    return null;
  }

  const sortedSessions = [...selectedDayData.sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <CalendarOutlined style={{ color: '#3b82f6' }} />
          <span style={{ fontWeight: 600, color: isDark ? '#f1f5f9' : '#1f2937' }}>
            {dayjs(selectedDayData.date).format('DD MMMM YYYY')} - {mode === 'question' ? 'Soru Girişi' : 'Çalışma Detayları'}
          </span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
      style={{ borderRadius: 16, overflow: 'hidden' }}
      styles={{ body: { overflowX: 'hidden', paddingBottom: 24 } }}
    >
      <div style={{ position: 'relative' }}>
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
        
          opacity: isDark ? 0.85 : 0.6, 
          borderRadius: 16, 
          pointerEvents: 'none' 
        }} />
        
        <div style={{ position: 'relative' }}>
          {mode !== 'question' && (
            <>
              <DayStats selectedDayData={selectedDayData} />
              <Divider style={{ margin: '16px 0 12px' }} />
              <SessionsList sessions={sortedSessions} />
              <Divider style={{ margin: '20px 0 12px' }} />
            </>
          )}
          {mode === 'question' && (
            <>
              <PracticeExams 
                dayModalDate={dayModalDate}
                sessions={sessions}
              />
              <Divider style={{ margin: '20px 0 12px' }} />
              <QuickDYBEntry
                dayModalDate={dayModalDate}
                selectedDayData={selectedDayData}
                sessions={sessions}
              />
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default DayModal;
