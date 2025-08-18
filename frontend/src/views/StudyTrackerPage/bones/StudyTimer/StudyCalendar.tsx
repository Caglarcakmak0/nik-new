import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Badge, 
  Card, 
  Typography, 
  Row, 
  Col, 
  Statistic,
  List,
  Tag,
  Space,
  Button,
  Select,
  Tooltip,
  Modal,
  Empty,
  Spin,
  Divider,
  Progress
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  FireOutlined,
  BookOutlined,
  LeftOutlined,
  RightOutlined,
  EyeOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  StarOutlined,
  InfoCircleOutlined,
  SmileOutlined,
  PhoneOutlined
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { apiRequest } from '../../../../services/api';

dayjs.extend(isoWeek);

const { Title, Text } = Typography;
const { Option } = Select;

interface StudySession {
  _id: string;
  subject: string;
  duration: number;
  date: Date;
  quality: number;
  technique: string;
  mood: string;
  efficiency: number;
  notes?: string;
  distractions: number;
}

interface DayData {
  date: string;
  sessions: StudySession[];
  totalTime: number;
  averageQuality: number;
  averageEfficiency: number;
  sessionCount: number;
}

interface StudyStats {
  totalTime: number;
  sessionsCount: number;
  averageQuality: number;
  averageEfficiency: number;
  totalDistractions: number;
  streak: number;
  bestSubject: string;
  mostUsedTechnique: string;
  subjectBreakdown: { [key: string]: number };
  techniqueBreakdown: { [key: string]: number };
  moodBreakdown: { [key: string]: number };
  dailyAverage: number;
  weeklyGoal: number;
  weeklyProgress: number;
  dailyGoals: { [date: string]: { target: number; actual: number; completed: boolean } };
  weeklyQualityGoal: number;
  weeklySessionGoal: number;
  monthlyTarget: number;
}

type ViewMode = 'month' | 'year';
type PeriodType = 'week' | 'month' | 'all';

interface StudyCalendarProps {
  refreshTrigger?: number;
}

const StudyCalendar: React.FC<StudyCalendarProps> = ({ refreshTrigger = 0 }) => {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDayData, setSelectedDayData] = useState<DayData | null>(null);
  const [stats, setStats] = useState<StudyStats | null>(null);
  
  // Veri getirme
  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/study-sessions', { method: 'GET' });
      
      if (response && Array.isArray(response)) {
        setSessions(response);
        calculateStatistics(response);
      }
    } catch (error) {
      console.error('Session verisi alınamadı:', error);
    } finally {
      setLoading(false);
    }
  };

  // İstatistikleri hesapla
  const calculateStatistics = (allSessions: StudySession[]) => {
    if (allSessions.length === 0) {
      setStats({
        totalTime: 0,
        sessionsCount: 0,
        averageQuality: 0,
        averageEfficiency: 0,
        totalDistractions: 0,
        streak: 0,
        bestSubject: '-',
        mostUsedTechnique: '-',
        subjectBreakdown: {},
        techniqueBreakdown: {},
        moodBreakdown: {},
        dailyAverage: 0,
        weeklyGoal: 1200,
        weeklyProgress: 0,
        dailyGoals: {},
        weeklyQualityGoal: 4.0,
        weeklySessionGoal: 15,
        monthlyTarget: 5000
      });
      return;
    }

    // Dönem filtreleme
    let filteredSessions = allSessions;
    const now = dayjs();
    
    switch (periodType) {
      case 'week':
        filteredSessions = allSessions.filter(s => 
          dayjs(s.date).isSame(now, 'week')
        );
        break;
      case 'month':
        filteredSessions = allSessions.filter(s => 
          dayjs(s.date).isSame(now, 'month')
        );
        break;
      default: // 'all'
        filteredSessions = allSessions;
        break;
    }

    // Temel hesaplamalar
    const totalTime = filteredSessions.reduce((sum, s) => sum + s.duration, 0);
    const sessionsCount = filteredSessions.length;
    const averageQuality = filteredSessions.length > 0 ? 
      filteredSessions.reduce((sum, s) => sum + s.quality, 0) / sessionsCount : 0;
    const averageEfficiency = filteredSessions.length > 0 ? 
      filteredSessions.reduce((sum, s) => sum + s.efficiency, 0) / sessionsCount : 0;
    const totalDistractions = filteredSessions.reduce((sum, s) => sum + s.distractions, 0);

    // Ders dağılımı
    const subjectBreakdown: { [key: string]: number } = {};
    filteredSessions.forEach(s => {
      subjectBreakdown[s.subject] = (subjectBreakdown[s.subject] || 0) + s.duration;
    });

    // Teknik dağılımı
    const techniqueBreakdown: { [key: string]: number } = {};
    filteredSessions.forEach(s => {
      techniqueBreakdown[s.technique] = (techniqueBreakdown[s.technique] || 0) + 1;
    });

    // Ruh hali dağılımı
    const moodBreakdown: { [key: string]: number } = {};
    filteredSessions.forEach(s => {
      moodBreakdown[s.mood] = (moodBreakdown[s.mood] || 0) + 1;
    });

    // En iyi ders
    const bestSubject = Object.entries(subjectBreakdown)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '-';

    // En çok kullanılan teknik
    const mostUsedTechnique = Object.entries(techniqueBreakdown)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '-';

    // Günlük ortalama
    const days = periodType === 'week' ? 7 : 
                periodType === 'month' ? 30 : 
                Math.max(1, dayjs().diff(dayjs(filteredSessions[filteredSessions.length - 1]?.date), 'day'));
    
    const dailyAverage = totalTime / days;

    // Haftalık progress (sadece hafta görünümünde)
    const weeklyGoal = 1200;
    const weeklyProgress = periodType === 'week' ? (totalTime / weeklyGoal) * 100 : 0;

    // Streak hesaplama (tüm oturumlar için)
    const streak = calculateStreak(allSessions);

    setStats({
      totalTime,
      sessionsCount,
      averageQuality: Math.round(averageQuality * 10) / 10,
      averageEfficiency: Math.round(averageEfficiency),
      totalDistractions,
      streak,
      bestSubject,
      mostUsedTechnique,
      subjectBreakdown,
      techniqueBreakdown,
      moodBreakdown,
      dailyAverage: Math.round(dailyAverage),
      weeklyGoal,
      weeklyProgress: Math.min(100, weeklyProgress),
      dailyGoals: {},
      weeklyQualityGoal: 4.0,
      weeklySessionGoal: 15,
      monthlyTarget: 5000
    });
  };

  // Streak hesaplama
  const calculateStreak = (allSessions: StudySession[]): number => {
    if (allSessions.length === 0) return 0;

    const sortedDates = allSessions
      .map(s => dayjs(s.date).format('YYYY-MM-DD'))
      .filter((date, index, array) => array.indexOf(date) === index)
      .sort()
      .reverse();

    let streak = 0;
    const today = dayjs().format('YYYY-MM-DD');
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

    if (sortedDates[0] === today || sortedDates[0] === yesterday) {
      streak = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const currentDate = dayjs(sortedDates[i-1]);
        const nextDate = dayjs(sortedDates[i]);
        
        if (currentDate.diff(nextDate, 'day') === 1) {
          streak++;
        } else {
          break;
        }
      }
    }

    return streak;
  };

  // Günlük verileri organize et
  const organizeDayData = (): { [key: string]: DayData } => {
    const dayDataMap: { [key: string]: DayData } = {};
    
    sessions.forEach(session => {
      const dateKey = dayjs(session.date).format('YYYY-MM-DD');
      
      if (!dayDataMap[dateKey]) {
        dayDataMap[dateKey] = {
          date: dateKey,
          sessions: [],
          totalTime: 0,
          averageQuality: 0,
          averageEfficiency: 0,
          sessionCount: 0
        };
      }
      
      dayDataMap[dateKey].sessions.push(session);
      dayDataMap[dateKey].totalTime += session.duration;
      dayDataMap[dateKey].sessionCount++;
    });
    
    // Ortalamaları hesapla
    Object.keys(dayDataMap).forEach(dateKey => {
      const dayData = dayDataMap[dateKey];
      dayData.averageQuality = dayData.sessions.reduce((sum, s) => sum + s.quality, 0) / dayData.sessionCount;
      dayData.averageEfficiency = dayData.sessions.reduce((sum, s) => sum + s.efficiency, 0) / dayData.sessionCount;
    });
    
    return dayDataMap;
  };

  const dayDataMap = organizeDayData();

  // Günü göster
  const handleDayClick = (date: Dayjs) => {
    const dateKey = date.format('YYYY-MM-DD');
    const dayData = dayDataMap[dateKey];
    
    if (dayData && dayData.sessions.length > 0) {
      setSelectedDayData(dayData);
      setShowDayModal(true);
    }
  };

  // Takvim için özel renderer
  const dateCellRender = (date: Dayjs) => {
    const dateKey = date.format('YYYY-MM-DD');
    const dayData = dayDataMap[dateKey];
    
    if (!dayData || dayData.sessions.length === 0) {
      return null;
    }

    // İntensite seviyesi (renk hesaplama)
    const intensity = Math.min(4, Math.floor(dayData.totalTime / 30)); // Her 30dk için 1 seviye
    const colors = ['#f0f9ff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8'];
    const color = colors[intensity];
    
    return (
      <div 
        className="calendar-day-content" 
        style={{ 
          backgroundColor: color,
          borderRadius: '8px',
          padding: '4px',
          border: `1px solid ${colors[Math.min(4, intensity + 1)]}`,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}
        onClick={() => handleDayClick(date)}
      >
        <div style={{ fontSize: '11px', color: '#374151', fontWeight: 500 }}>
          {dayData.sessionCount} oturum
        </div>
        <div style={{ fontSize: '10px', color: '#6b7280' }}>
          {Math.floor(dayData.totalTime / 60)}s {dayData.totalTime % 60}d
        </div>
      </div>
    );
  };

  // Aylık cell renderer (yıl görünümü için)
  const monthCellRender = (date: Dayjs) => {
    const monthStart = date.startOf('month');
    const monthEnd = date.endOf('month');
    
    const monthSessions = sessions.filter(session => {
      const sessionDate = dayjs(session.date);
      return sessionDate.isAfter(monthStart) && sessionDate.isBefore(monthEnd);
    });
    
    if (monthSessions.length === 0) return null;
    
    const totalTime = monthSessions.reduce((sum, s) => sum + s.duration, 0);
    const sessionCount = monthSessions.length;
    
    return (
      <div className="month-cell-content">
        <div style={{ fontWeight: 600, color: '#374151' }}>{sessionCount} oturum</div>
        <div style={{ color: '#6b7280' }}>{Math.floor(totalTime / 60)}s</div>
      </div>
    );
  };

  // Header controls
  const headerRender = ({ value, onChange }: any) => {
    const start = 0;
    const end = 12;
    const monthOptions = [];
    
    const current = value.clone();
    const localeData = value.localeData();
    const months = [];
    for (let i = 0; i < 12; i++) {
      current.month(i);
      months.push(localeData.monthsShort(current));
    }
    
    for (let index = start; index < end; index++) {
      monthOptions.push(
        <Option key={index} value={index}>
          {months[index]}
        </Option>
      );
    }
    
    const month = value.month();
    const year = value.year();
    
    return (
      <div style={{ 
        padding: '16px 24px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderRadius: '12px',
        marginBottom: '16px'
      }}>
        <Space size="middle">
          <Button 
            type="text"
            size="small"
            icon={<LeftOutlined />}
            onClick={() => {
              const newValue = value.clone().subtract(1, viewMode);
              onChange(newValue);
            }}
            style={{ color: '#6b7280' }}
          />
          
          <Select
            size="small"
            value={month}
            onChange={(selectedMonth) => {
              const newValue = value.clone().month(selectedMonth);
              onChange(newValue);
            }}
            style={{ minWidth: 100 }}
          >
            {monthOptions}
          </Select>
          
          <Select
            size="small"
            value={year}
            onChange={(selectedYear) => {
              const newValue = value.clone().year(selectedYear);
              onChange(newValue);
            }}
            style={{ minWidth: 80 }}
          >
            {Array.from({ length: 10 }, (_, i) => year - 5 + i).map(y => (
              <Option key={y} value={y}>{y}</Option>
            ))}
          </Select>
          
          <Button 
            type="text"
            size="small"
            icon={<RightOutlined />}
            onClick={() => {
              const newValue = value.clone().add(1, viewMode);
              onChange(newValue);
            }}
            style={{ color: '#6b7280' }}
          />
        </Space>

        <Space size="middle">
          <Select
            size="small"
            value={viewMode}
            onChange={setViewMode}
            style={{ minWidth: 120 }}
          >
            <Option value="month">Ay Görünümü</Option>
            <Option value="year">Yıl Görünümü</Option>
          </Select>
          
          {viewMode === 'month' && (
            <Tooltip
              title={
                <div style={{ padding: '8px 0' }}>
                  <div style={{ marginBottom: '8px', fontWeight: 600, color: '#fff' }}>Renk Gösterge</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 16, height: 16, backgroundColor: '#f0f9ff', border: '1px solid #e0f2fe', borderRadius: 4 }}></div>
                    <span style={{ fontSize: 12, color: '#fff' }}>0-30 dakika</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 16, height: 16, backgroundColor: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: 4 }}></div>
                    <span style={{ fontSize: 12, color: '#fff' }}>30-60 dakika</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 16, height: 16, backgroundColor: '#bae6fd', border: '1px solid #7dd3fc', borderRadius: 4 }}></div>
                    <span style={{ fontSize: 12, color: '#fff' }}>60-90 dakika</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 16, height: 16, backgroundColor: '#7dd3fc', border: '1px solid #38bdf8', borderRadius: 4 }}></div>
                    <span style={{ fontSize: 12, color: '#fff' }}>90-120 dakika</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 16, height: 16, backgroundColor: '#38bdf8', border: '1px solid #0ea5e9', borderRadius: 4 }}></div>
                    <span style={{ fontSize: 12, color: '#fff' }}>120+ dakika</span>
                  </div>
                </div>
              }
              placement="bottomRight"
            >
              <Button 
                type="text" 
                size="small" 
                icon={<InfoCircleOutlined />} 
                style={{ color: '#6b7280' }}
              />
            </Tooltip>
          )}
        </Space>
      </div>
    );
  };

  // Bu ay istatistikleri
  const getMonthStats = () => {
    const monthStart = selectedDate.startOf('month');
    const monthEnd = selectedDate.endOf('month');
    
    const monthSessions = sessions.filter(session => {
      const sessionDate = dayjs(session.date);
      return sessionDate.isAfter(monthStart.subtract(1, 'day')) && 
             sessionDate.isBefore(monthEnd.add(1, 'day'));
    });
    
    const totalTime = monthSessions.reduce((sum, s) => sum + s.duration, 0);
    const avgQuality = monthSessions.length > 0 ? 
      monthSessions.reduce((sum, s) => sum + s.quality, 0) / monthSessions.length : 0;

    
    const activeDays = new Set(monthSessions.map(s => dayjs(s.date).format('YYYY-MM-DD'))).size;
    
    return {
      totalTime,
      sessionCount: monthSessions.length,
      avgQuality: Math.round(avgQuality * 10) / 10,
      activeDays
    };
  };

  const monthStats = getMonthStats();

  // Format süre
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}s ${mins}d` : `${mins}d`;
  };

  useEffect(() => {
    fetchSessions();
  }, [refreshTrigger]);

  useEffect(() => {
    if (sessions.length > 0) {
      calculateStatistics(sessions);
    }
  }, [periodType]);

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
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <Title level={3} style={{ margin: 0, color: '#1f2937', fontWeight: 600 }}>
          Çalışma Takvimi
        </Title>
        <Text type="secondary" style={{ fontSize: '16px' }}>
          Çalışma oturumlarını takvim üzerinde görüntüle ve analiz et
        </Text>
      </div>

      {/* Birleştirilmiş İstatistikler Kartı */}
      {stats && (
        <Card 
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <BarChartOutlined style={{ color: '#3b82f6' }} />
                <span style={{ fontWeight: 600, color: '#1f2937' }}>İstatistikler</span>
              </Space>
              <Select
                size="small"
                value={periodType}
                onChange={setPeriodType}
                style={{ minWidth: 100 }}
              >
                <Option value="week">Bu Hafta</Option>
                <Option value="month">Bu Ay</Option>
                <Option value="all">Tümü</Option>
              </Select>
            </div>
          } 
          size="small"
          style={{ 
            borderRadius: '16px', 
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            marginBottom: 24
          }}
        >
          <Row gutter={[24, 16]}>
            <Col xs={12} sm={6} md={3}>
              <Statistic
                title={
                  <Space size="small">
                    <ClockCircleOutlined style={{ color: '#10b981' }} />
                    <span style={{ color: '#6b7280', fontSize: '14px' }}>Toplam Süre</span>
                  </Space>
                }
                value={formatTime(stats.totalTime)}
                valueStyle={{ fontSize: '16px', fontWeight: 600, color: '#1f2937' }}
              />
            </Col>
            <Col xs={12} sm={6} md={3}>
              <Statistic
                title={
                  <Space size="small">
                    <BookOutlined style={{ color: '#8b5cf6' }} />
                    <span style={{ color: '#6b7280', fontSize: '14px' }}>Oturum Sayısı</span>
                  </Space>
                }
                value={stats.sessionsCount}
                valueStyle={{ fontSize: '16px', fontWeight: 600, color: '#1f2937' }}
              />
            </Col>
            <Col xs={12} sm={6} md={3}>
              <Statistic
                title={
                  <Space size="small">
                    <StarOutlined style={{ color: '#f59e0b' }} />
                    <span style={{ color: '#6b7280', fontSize: '14px' }}>Ort. Kalite</span>
                  </Space>
                }
                value={stats.averageQuality}
                suffix="/5"
                valueStyle={{ fontSize: '16px', fontWeight: 600, color: '#1f2937' }}
              />
            </Col>
            <Col xs={12} sm={6} md={3}>
              <Statistic
                title={
                  <Space size="small">
                    <EyeOutlined style={{ color: '#3b82f6' }} />
                    <span style={{ color: '#6b7280', fontSize: '14px' }}>Ort. Verimlilik</span>
                  </Space>
                }
                value={stats.averageEfficiency}
                suffix="%"
                valueStyle={{ fontSize: '16px', fontWeight: 600, color: '#1f2937' }}
              />
            </Col>
          </Row>

          {/* Haftalık Hedef Progress - Sadece hafta seçiliyse göster */}
          {periodType === 'week' && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
              <Row gutter={[16, 16]} align="middle">
                <Col xs={24} sm={12}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ textAlign: 'center' }}>
                      <Progress
                        type="circle"
                        percent={Math.round(stats.weeklyProgress)}
                        format={(percent) => `${percent}%`}
                        strokeColor={{
                          '0%': '#ff4d4f',
                          '50%': '#faad14',
                          '100%': '#52c41a',
                        }}
                        size={60}
                      />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1f2937', fontSize: '14px' }}>Haftalık Hedef</div>
                      <div style={{ color: '#6b7280', fontSize: '12px' }}>
                        {formatTime(stats.totalTime)} / {formatTime(stats.weeklyGoal)}
                      </div>
                    </div>
                  </div>
                </Col>
                <Col xs={24} sm={12}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ textAlign: 'center' }}>
                      <Progress
                        type="circle"
                        percent={Math.round((stats.averageQuality / stats.weeklyQualityGoal) * 100)}
                        format={() => `${stats.averageQuality}/5`}
                        strokeColor={stats.averageQuality >= stats.weeklyQualityGoal ? '#52c41a' : '#1890ff'}
                        size={60}
                      />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1f2937', fontSize: '14px' }}>Kalite Hedefi</div>
                      <div style={{ color: '#6b7280', fontSize: '12px' }}>
                        Hedef: {stats.weeklyQualityGoal}/5
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          )}


        </Card>
      )}

      {/* Takvim */}
      <Card style={{ borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <Calendar
          value={selectedDate}
          onChange={setSelectedDate}
          mode={viewMode}
          dateCellRender={viewMode === 'month' ? dateCellRender : undefined}
          monthCellRender={viewMode === 'year' ? monthCellRender : undefined}
          headerRender={headerRender}
        />
      </Card>

      {/* Günlük Detay Modal */}
      <Modal
        title={
          selectedDayData ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <CalendarOutlined style={{ color: '#3b82f6' }} />
              <span style={{ fontWeight: 600, color: '#1f2937' }}>
                {dayjs(selectedDayData.date).format('DD MMMM YYYY')} - Çalışma Detayları
              </span>
            </div>
          ) : 'Günlük Detay'
        }
        open={showDayModal}
        onCancel={() => setShowDayModal(false)}
        footer={null}
        width={700}
        style={{ borderRadius: '16px' }}
      >
        {selectedDayData && (
          <div>
            {/* Günlük Özet */}
            <Row gutter={24} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Statistic
                  title={
                    <Space size="small">
                      <ClockCircleOutlined style={{ color: '#10b981' }} />
                      <span style={{ color: '#6b7280', fontSize: '14px' }}>Toplam Süre</span>
                    </Space>
                  }
                  value={formatTime(selectedDayData.totalTime)}
                  valueStyle={{ fontSize: '20px', fontWeight: 600, color: '#1f2937' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title={
                    <Space size="small">
                      <BookOutlined style={{ color: '#8b5cf6' }} />
                      <span style={{ color: '#6b7280', fontSize: '14px' }}>Oturum Sayısı</span>
                    </Space>
                  }
                  value={selectedDayData.sessionCount}
                  valueStyle={{ fontSize: '20px', fontWeight: 600, color: '#1f2937' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title={
                    <Space size="small">
                      <StarOutlined style={{ color: '#f59e0b' }} />
                      <span style={{ color: '#6b7280', fontSize: '14px' }}>Ort. Kalite</span>
                    </Space>
                  }
                  value={selectedDayData.averageQuality.toFixed(1)}
                  suffix="/5"
                  valueStyle={{ fontSize: '20px', fontWeight: 600, color: '#1f2937' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title={
                    <Space size="small">
                      <EyeOutlined style={{ color: '#3b82f6' }} />
                      <span style={{ color: '#6b7280', fontSize: '14px' }}>Ort. Verimlilik</span>
                    </Space>
                  }
                  value={`${Math.round(selectedDayData.averageEfficiency)}%`}
                  valueStyle={{ fontSize: '20px', fontWeight: 600, color: '#1f2937' }}
                />
              </Col>
            </Row>

            <Divider style={{ margin: '24px 0' }} />

            {/* Oturum Listesi */}
            <List
              header={
                <div style={{ 
                  fontWeight: 600, 
                  color: '#1f2937', 
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <CheckCircleOutlined style={{ color: '#10b981' }} />
                  Çalışma Oturumları
                </div>
              }
              dataSource={selectedDayData.sessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())}
              renderItem={(session) => (
                <List.Item style={{ 
                  padding: '16px 0',
                  borderBottom: '1px solid #f3f4f6'
                }}>
                  <List.Item.Meta
                    title={
                      <Space size="middle">
                        <Tag color="blue" style={{ borderRadius: '6px', fontWeight: 500 }}>
                          {session.subject.charAt(0).toUpperCase() + session.subject.slice(1)}
                        </Tag>
                        <Tag 
                          color={session.technique === 'Pomodoro' ? 'orange' : 'green'} 
                          style={{ borderRadius: '6px', fontWeight: 500 }}
                        >
                          {session.technique}
                        </Tag>
                        <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>
                          {dayjs(session.date).format('HH:mm')}
                        </span>
                      </Space>
                    }
                    description={
                      <Space size="large" style={{ marginTop: 8 }}>
                        <span style={{ color: '#374151', fontWeight: 500 }}>
                          {formatTime(session.duration)}
                        </span>
                        <span style={{ color: '#6b7280' }}>
                          Kalite: {session.quality}/5
                        </span>
                        <span style={{ color: '#6b7280' }}>
                          Verimlilik: %{session.efficiency}
                        </span>
                        <span style={{ color: '#6b7280' }}>
                          Ruh Hali: {session.mood}
                        </span>
                        {session.notes && (
                          <Tooltip title={session.notes}>
                            <span style={{ cursor: 'help', color: '#3b82f6' }}>Not</span>
                          </Tooltip>
                        )}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StudyCalendar;