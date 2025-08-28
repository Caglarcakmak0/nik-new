import React from 'react';
import { Dayjs } from 'dayjs';
import { useTheme } from '../../../../contexts/ThemeContext';
import { DayData, ReminderItem } from '../../types';

interface CalendarCellProps {
  date: Dayjs;
  dayData?: DayData;
  monthlyStats?: { completionRate: number; netScore: number };
  reminders?: ReminderItem[];
  onDayClick: (date: Dayjs) => void;
  questionMode?: boolean;
  examTotal?: number; // soru takviminde o gün çözülen toplam soru
}

const CalendarCell: React.FC<CalendarCellProps> = ({
  date,
  dayData,
  monthlyStats,
  reminders,
  onDayClick,
  questionMode = false,
  examTotal
}) => {
  const { isDark } = useTheme();

  // Yoğunluk ve plan tamamlama renkleri
  const intensity = questionMode ? 0 : (dayData ? Math.min(4, Math.floor(dayData.totalTime / 30)) : 0);
  const colors = ['#f8fafc', '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8'];
  const color = colors[intensity];
  
  let planColor: string | null = null;
  if (!questionMode && monthlyStats) {
    planColor = monthlyStats.completionRate >= 90 ? '#10b981' 
      : monthlyStats.completionRate >= 70 ? '#3b82f6' 
      : monthlyStats.completionRate >= 50 ? '#f59e0b' 
      : '#ef4444';
  }

  const darkIntensityColors = ['#1f2937', '#1e3a8a33', '#1e3a8a55', '#1e3a8a77', '#1e3a8a99'];
  const bgColor = isDark ? darkIntensityColors[intensity] : color;
  const textPrimary = isDark ? '#f1f5f9' : '#334155';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const planText = isDark ? (planColor || '#cbd5e1') : (planColor || '#475569');
  const borderColor = planColor ? planColor : isDark ? '#334155' : colors[Math.min(4, intensity + 1)];
  
  const isEmpty = questionMode ? !examTotal : (!dayData && !monthlyStats && (!reminders || reminders.length === 0));

  return (
    <>
      <div
        className="calendar-day-content"
        style={questionMode ? {
          position: 'relative',
          background: 'transparent',
          border: 'none',
          minHeight: 54,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          fontWeight: 600,
          color: textPrimary,
          cursor: 'pointer'
        } : (isEmpty ? {
          position: 'relative',
          background: 'transparent',
          padding: 2,
          minHeight: 54,
          cursor: 'pointer'
        } : {
          position: 'relative',
          background: bgColor,
          borderRadius: 8,
          padding: 4,
          border: planColor ? `2px solid ${planColor}` : `1px solid ${borderColor}`,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.6)' : '0 1px 3px rgba(0,0,0,0.1)',
          minHeight: 54
        })}
        onClick={() => onDayClick(date)}
      >
        {questionMode && examTotal !== undefined && examTotal > 0 && (
          <span>{examTotal}</span>
        )}

        {!questionMode && dayData && (
          <>
            <div style={{ fontSize: 11, color: textPrimary, fontWeight: 600 }}>
              {dayData.sessionCount} oturum
            </div>
            <div style={{ fontSize: 10, color: textSecondary }}>
              {Math.floor(dayData.totalTime / 60)}s {dayData.totalTime % 60}d
            </div>
          </>
        )}

        {!questionMode && monthlyStats && (
          <div style={{ fontSize: 9, color: planText, fontWeight: 600, marginTop: 2 }}>
            %{Math.round(monthlyStats.completionRate)} • Net {Math.round(monthlyStats.netScore * 10) / 10}
          </div>
        )}

        {!questionMode && reminders && reminders.length > 0 && (
          <div style={{ marginTop: 2 }}>
            <div style={{ 
              fontSize: 9, 
              color: isDark ? '#e2e8f0' : '#334155', 
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis' 
            }}>
              📌 {reminders[0].text}
              {reminders[0].isDone && <span style={{ textDecoration: 'line-through', opacity: 0.6 }}> ✓</span>}
            </div>
            {reminders.length > 1 && (
              <div style={{ fontSize: 8, color: isDark ? '#94a3b8' : '#64748b' }}>
                +{reminders.length - 1} diğer
              </div>
            )}
          </div>
        )}

     
      </div>
    </>
  );
};

export default CalendarCell;
