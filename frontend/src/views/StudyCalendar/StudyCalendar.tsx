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
  // mode: 'study' (only sessions & stats) | 'question' (includes deneme sınavları + hızlı DYB girişi)
  mode?: 'study' | 'question';
}

const StudyCalendar: React.FC<StudyCalendarProps> = ({ refreshTrigger = 0, mode = 'study' }) => {
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

  // Question mode: exam totals per day (toplam soru sayısı)
  const [examTotalsMap, setExamTotalsMap] = useState<Record<string, number>>({});
  const [planDYBTotalsMap, setPlanDYBTotalsMap] = useState<Record<string, number>>({});

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
    let data = dayDataMap[key];
    // Soru takvimi modunda boş gün bile açılsın
    if (!data && mode === 'question') {
      data = {
        date: key,
        sessions: [],
        totalTime: 0,
        averageQuality: 0,
        averageEfficiency: 0,
        sessionCount: 0
      };
    }
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

  // Fetch study sessions (always for underlying data / might be hidden in question mode)
  useEffect(() => {
    fetchSessions();
  }, [refreshTrigger]);

  // Fetch practice exams per month when in question mode
  useEffect(() => {
    const fetchExams = async () => {
      if (mode !== 'question') { setExamTotalsMap({}); return; }
      try {
        const start = selectedDate.startOf('month').toISOString();
        const end = selectedDate.endOf('month').toISOString();
        const res = await apiRequest(`/student/exams?from=${start}&to=${end}&limit=500`, { method: 'GET' });
        const list: any[] = res?.data || [];
        const map: Record<string, number> = {};
        list.forEach(ex => {
          const key = dayjs(ex.date).format('YYYY-MM-DD');
          // Yalnızca çözülen (doğru + yanlış) soru sayısını al
          const attempted = (ex?.totals?.correctAnswers || 0) + (ex?.totals?.wrongAnswers || 0);
          map[key] = (map[key] || 0) + attempted;
        });
        setExamTotalsMap(map);
      } catch {
        setExamTotalsMap({});
      }
    };
    fetchExams();
  }, [mode, selectedDate]);

  // Fetch daily plans (DYB girişleri) per month when in question mode
  useEffect(() => {
    const fetchPlans = async () => {
      if (mode !== 'question') { setPlanDYBTotalsMap({}); return; }
      try {
        const start = selectedDate.startOf('month').toISOString();
        const end = selectedDate.endOf('month').toISOString();
        // Varsayım: /daily-plans endpoint'i tarih aralığı filtrelemezse büyük liste dönebilir; burada optimize edilmemiş.
        const res = await apiRequest(`/daily-plans?from=${start}&to=${end}&limit=500`, { method: 'GET' });
        const list: any[] = Array.isArray(res?.data) ? res.data : (res?.data ? [res.data] : []);
        const map: Record<string, number> = {};
        list.forEach(plan => {
          if (!plan?.date) return;
          const key = dayjs(plan.date).format('YYYY-MM-DD');
          const subjects: any[] = plan.subjects || [];
          const attempted = subjects.reduce((sum, s) => sum + (s.correctAnswers || 0) + (s.wrongAnswers || 0), 0);
          if (attempted > 0) map[key] = (map[key] || 0) + attempted;
        });
        setPlanDYBTotalsMap(map);
      } catch {
        setPlanDYBTotalsMap({});
      }
    };
    fetchPlans();
  }, [mode, selectedDate]);

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
          questionMode={mode === 'question'}
          examTotalsMap={Object.keys(examTotalsMap).length || Object.keys(planDYBTotalsMap).length ?
            // iki kaynağı birleştir
            Object.keys({ ...examTotalsMap, ...planDYBTotalsMap }).reduce<Record<string, number>>((acc, k) => {
              acc[k] = (examTotalsMap[k] || 0) + (planDYBTotalsMap[k] || 0);
              return acc;
            }, {})
          : examTotalsMap}
        />
      </Card>

  <DayModal
        open={showDayModal}
        onClose={() => setShowDayModal(false)}
        selectedDayData={selectedDayData}
        dayModalDate={dayModalDate}
        sessions={sessions}
        mode={mode}
      />

      {mode !== 'question' && (
        <ReminderModal
          open={showReminderModal}
          onClose={handleReminderModalClose}
          selectedDate={reminderModalDate}
          sessions={sessions}
        />
      )}
    </div>
  );
};

export default StudyCalendar;
