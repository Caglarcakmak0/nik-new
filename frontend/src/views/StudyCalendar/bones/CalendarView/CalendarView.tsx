import React, { useState, useEffect } from 'react';
import { Calendar } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { getStudentPrograms, getReminders } from '../../../../services/api';
import { StudySession, DayData, ViewMode, ReminderItem } from '../../types';
import { useTheme } from '../../../../contexts/ThemeContext';
import CalendarCell from './CalendarCell';
import CalendarHeader from './CalendarHeader';
import './CalendarView.scss';

interface CalendarViewProps {
  selectedDate: Dayjs;
  setSelectedDate: (date: Dayjs) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  dayDataMap: { [key: string]: DayData };
  sessions: StudySession[];
  onDayClick: (date: Dayjs) => void;
  onReminderClick: (date: Dayjs) => void;
  isStudent: boolean;
  questionMode?: boolean; // soru takvimi modu
  examTotalsMap?: Record<string, number>; // gün bazlı toplam soru sayısı
}

const CalendarView: React.FC<CalendarViewProps> = ({
  selectedDate,
  setSelectedDate,
  viewMode,
  setViewMode,
  dayDataMap,
  sessions,
  onDayClick,
  onReminderClick,
  isStudent,
  questionMode = false,
  examTotalsMap = {}
}) => {
  const { isDark } = useTheme();
  const [monthlyStats, setMonthlyStats] = useState<Record<string, { completionRate: number; netScore: number }>>({});
  const [remindersMap, setRemindersMap] = useState<Record<string, ReminderItem[]>>({});

  // Aylık plan istatistiklerini getir
  const fetchMonthlyStats = async (baseDate: Dayjs) => {
  if (!isStudent || questionMode) { 
      setMonthlyStats({}); 
      return; 
    }
    try {
      const start = baseDate.startOf('month').toDate().toISOString();
      const end = baseDate.endOf('month').toDate().toISOString();
      const res = await getStudentPrograms({ from: start, to: end, limit: 200 });
      const list: any[] = res?.data || [];
      const map: Record<string, { completionRate: number; netScore: number }> = {};
      list.forEach(p => {
        const key = dayjs(p.date).format('YYYY-MM-DD');
        map[key] = {
          completionRate: Number(p?.stats?.completionRate) || 0,
          netScore: Number(p?.stats?.netScore) || 0
        };
      });
      setMonthlyStats(map);
    } catch {
      setMonthlyStats({});
    }
  };

  // Hatırlatmaları getir
  const fetchReminders = async (baseDate: Dayjs) => {
  if (questionMode) { setRemindersMap({}); return; }
    try {
      const start = baseDate.startOf('month').toDate().toISOString();
      const end = baseDate.endOf('month').toDate().toISOString();
      const res = await getReminders({ from: start, to: end });
      const list: ReminderItem[] = res?.data || [];
      const map: Record<string, ReminderItem[]> = {};
      list.forEach(r => {
        const key = dayjs(r.date).format('YYYY-MM-DD');
        if (!map[key]) map[key] = [];
        map[key].push(r);
      });
      setRemindersMap(map);
    } catch {
      setRemindersMap({});
    }
  };


  // Cell render (month view)
  const dateCellRender = (date: Dayjs) => {
    const key = date.format('YYYY-MM-DD');
    return (
  <CalendarCell
        date={date}
        dayData={questionMode ? undefined : dayDataMap[key]}
        monthlyStats={questionMode ? undefined : monthlyStats[key]}
        reminders={questionMode ? undefined : remindersMap[key]}
        onDayClick={onDayClick}
        questionMode={questionMode}
        examTotal={questionMode ? examTotalsMap[key] : undefined}
      />
    );
  };

  // Year view month summary
  const monthCellRender = (date: Dayjs) => {
    const start = date.startOf('month');
    const end = date.endOf('month');
    const monthSessions = sessions.filter(s => {
      const sd = dayjs(s.date);
      return sd.isAfter(start) && sd.isBefore(end);
    });
    if (monthSessions.length === 0) return null;
    const total = monthSessions.reduce((sum, s) => sum + s.duration, 0);
    return (
      <div className="month-cell-content">
        <div style={{ fontWeight: 600, color: '#374151' }}>{monthSessions.length} oturum</div>
        <div style={{ color: '#6b7280' }}>{Math.floor(total / 60)}s</div>
      </div>
    );
  };

  // Calendar header
  const headerRender = ({ value, onChange }: any) => {
    return (
      <CalendarHeader
        value={value}
        onChange={onChange}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />
    );
  };

  useEffect(() => {
  fetchMonthlyStats(selectedDate);
  fetchReminders(selectedDate);

  if (questionMode) return; // soru modunda not ekleme / buton yok

  // Add reminder buttons to date-value areas (only study calendar)
  const addReminderButtons = () => {
      const dateValues = document.querySelectorAll('.ant-picker-calendar-date-value');
            dateValues.forEach((dateValue) => {
        const dateValueEl = dateValue as HTMLElement;
        
        // Skip if button already exists
        if (dateValueEl.querySelector('.reminder-btn-injected')) return;
        
        // Get the date number from the date value text
        const dateText = dateValueEl.textContent?.trim();
        if (!dateText || isNaN(Number(dateText))) return;
        
        const dayNumber = Number(dateText);
        const currentMonth = selectedDate.month();
        const currentYear = selectedDate.year();
        const cellDate = dayjs().year(currentYear).month(currentMonth).date(dayNumber);
        
        // Create button with theme-aware styling
        const button = document.createElement('button');
        button.className = 'reminder-btn-injected';
        button.setAttribute('data-date', cellDate.format('YYYY-MM-DD'));
        button.setAttribute('data-theme', isDark ? 'dark' : 'light');
        
        // Create EditOutlined icon SVG
        const iconSvg = `
          <svg viewBox="64 64 896 896" focusable="false" data-icon="edit" width="12px" height="12px" fill="currentColor" aria-hidden="true">
            <path d="M257.7 752c2 0 4-.2 6-.5L431.9 722c2-.4 3.9-1.3 5.3-2.8l423.9-423.9a9.96 9.96 0 000-14.1L694.9 114.9c-1.9-1.9-4.4-2.9-7.1-2.9s-5.2 1-7.1 2.9L256.8 538.8c-1.5 1.5-2.4 3.3-2.8 5.3l-29.5 168.2a33.5 33.5 0 009.4 29.8c6.6 6.4 14.9 9.9 23.8 9.9zm67.4-174.4L687.8 215l73.3 73.3-362.7 362.6-88.9 15.7 15.6-89zM880 836H144c-17.7 0-32 14.3-32 32v36c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-36c0-17.7-14.3-32-32-32z"></path>
          </svg>
        `;
        
        button.innerHTML = iconSvg;
        
        // Theme-aware colors
        const lightColors = {
          background: '#e2e8f0',
          color: '#334155',
          hoverBackground: '#cbd5e1',
          hoverColor: '#1f2937'
        };
        
        const darkColors = {
          background: '#334155',
          color: '#e2e8f0',
          hoverBackground: '#475569',
          hoverColor: '#f1f5f9'
        };
        
        const colors = isDark ? darkColors : lightColors;
        
        button.style.cssText = `
          position: absolute;
          top: 2px;
          left: 2px;
          width: 22px;
          height: 22px;
          background: ${colors.background};
          border: none;
          border-radius: 4px;
          cursor: pointer;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          color: ${colors.color};
        `;
        
        // Add theme-aware hover effects
        button.addEventListener('mouseenter', () => {
          button.style.background = colors.hoverBackground;
          button.style.transform = 'scale(1.1)';
          button.style.color = colors.hoverColor;
        });
        button.addEventListener('mouseleave', () => {
          button.style.background = colors.background;
          button.style.transform = 'scale(1)';
          button.style.color = colors.color;
        });
        
        // Add click handler with direct date reference
        button.addEventListener('click', (e: Event) => {
          e.stopPropagation();
          e.preventDefault();
          
          // Get date from button's data attribute (most reliable)
          const buttonDate = button.getAttribute('data-date');
          let finalDate = cellDate; // fallback to calculated date
          
          if (buttonDate) {
            try {
              finalDate = dayjs(buttonDate);
              console.log('Using date from button data-date:', buttonDate);
            } catch (error) {
              console.log('Error parsing button data-date, using calculated date');
            }
          }
          
          console.log('Reminder button clicked for date:', finalDate.format('YYYY-MM-DD'));
          
          // Call the callback directly with the final date
          try {
            onReminderClick(finalDate);
            console.log('onReminderClick called successfully with date:', finalDate.format('YYYY-MM-DD'));
          } catch (error) {
            console.error('Error calling onReminderClick:', error);
          }
        });
        
        // Insert button
        dateValueEl.style.position = 'relative';
        dateValueEl.appendChild(button);
        
        console.log(`Added reminder button for date: ${cellDate.format('YYYY-MM-DD')}`);
      });
    };
    
    // Run after DOM updates
    setTimeout(addReminderButtons, 100);
  }, [selectedDate.year(), selectedDate.month(), isStudent, onReminderClick, isDark, questionMode]);

  return (
    <div className="calendar-view">
      <Calendar
        value={selectedDate}
        onChange={setSelectedDate}
        onSelect={(d: any) => { 
          setSelectedDate(d); 
          if (viewMode === 'month') onDayClick(d); 
        }}
        mode={viewMode}
        dateCellRender={viewMode === 'month' ? dateCellRender : undefined}
        monthCellRender={viewMode === 'year' ? monthCellRender : undefined}
        headerRender={headerRender}
        onPanelChange={(d: any, mode: any) => { 
          setSelectedDate(d); 
          setViewMode(mode); 
          fetchMonthlyStats(d); 
          fetchReminders(d); 
        }}
      />
    </div>
  );
};

export default CalendarView;
