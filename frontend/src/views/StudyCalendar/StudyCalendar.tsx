import React, { useState, useEffect } from 'react';
import { Card, Spin, Typography } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { apiRequest } from '../../services/api';
import { useIsStudent } from '../../contexts/AuthContext';
import CalendarView from './bones/CalendarView/CalendarView';
import DayModal from './bones/DayModal/DayModal';
import ReminderModal from './bones/ReminderModal/ReminderModal';
import { StudySession, DayData, ViewMode } from './types';

dayjs.extend(isoWeek);

const { Text } = Typography;

interface StudyCalendarProps {
  refreshTrigger?: number;
}

const StudyCalendar: React.FC<StudyCalendarProps> = ({ refreshTrigger = 0 }) => {
  const isStudent = useIsStudent();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [showDayModal, setShowDayModal] = useState(false);
  const [dayModalDate, setDayModalDate] = useState<Dayjs | null>(null);
  const [selectedDayData, setSelectedDayData] = useState<DayData | null>(null);
  
  // Reminder modal states
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderModalDate, setReminderModalDate] = useState<Dayjs | null>(null);

  // Data fetch
  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/study-sessions', { method: 'GET' });
      if (response && Array.isArray(response)) setSessions(response);
    } catch (error) {
      console.error('Session verisi alınamadı:', error);
    } finally {
      setLoading(false);
    }
  };

  // Organize day data
  const organizeDayData = (): { [key: string]: DayData } => {
    const map: { [key: string]: DayData } = {};
    sessions.forEach(session => {
      const key = dayjs(session.date).format('YYYY-MM-DD');
      if (!map[key]) {
        map[key] = {
          date: key,
          sessions: [],
          totalTime: 0,
          averageQuality: 0,
          averageEfficiency: 0,
          sessionCount: 0
        };
      }
      map[key].sessions.push(session);
      map[key].totalTime += session.duration;
      map[key].sessionCount += 1;
    });

    Object.keys(map).forEach(k => {
      const d = map[k];
      d.averageQuality = d.sessions.reduce((s: number, x: StudySession) => s + x.quality, 0) / d.sessionCount;
      d.averageEfficiency = d.sessions.reduce((s: number, x: StudySession) => s + x.efficiency, 0) / d.sessionCount;
    });

    return map;
  };

  const dayDataMap = organizeDayData();

  const handleDayClick = (date: Dayjs) => {
    const key = date.format('YYYY-MM-DD');
    const data = dayDataMap[key];
    if (data) {
      setSelectedDayData(data);
      setDayModalDate(date);
      setShowDayModal(true);
    }
  };

  const handleReminderClick = (date: Dayjs) => {
    setReminderModalDate(date);
    setShowReminderModal(true);
  };

  const handleReminderModalClose = () => {
    setShowReminderModal(false);
    setReminderModalDate(null);
  };

  useEffect(() => {
    fetchSessions();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Takvim yükleniyor...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="study-calendar">
      <Card style={{ borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        <CalendarView
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          viewMode={viewMode}
          setViewMode={setViewMode}
          dayDataMap={dayDataMap}
          sessions={sessions}
          onDayClick={handleDayClick}
          onReminderClick={handleReminderClick}
          isStudent={isStudent}
        />
      </Card>

      <DayModal
        open={showDayModal}
        onClose={() => setShowDayModal(false)}
        selectedDayData={selectedDayData}
        dayModalDate={dayModalDate}
        sessions={sessions}
      />

      <ReminderModal
        open={showReminderModal}
        onClose={handleReminderModalClose}
        selectedDate={reminderModalDate}
        sessions={sessions}
      />
    </div>
  );
};

export default StudyCalendar;
