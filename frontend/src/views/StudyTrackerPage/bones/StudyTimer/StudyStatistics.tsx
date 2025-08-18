import React, { useState, useEffect } from 'react';
import { 
  Select, 
  Typography,
  Progress,
  Spin,
  Tag,
  Button
} from 'antd';
import {
  ClockCircleOutlined,
  TrophyOutlined,
  FireOutlined,
  BarChartOutlined,
  BookOutlined,
  SmileOutlined,
  PhoneOutlined,
  CalendarOutlined,
  ExportOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { apiRequest } from '../../../../services/api';
import './StudyStatistics.scss';

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

type PeriodType = 'today' | 'week' | 'month' | 'all';
type ViewType = 'overview' | 'subjects' | 'techniques' | 'performance' | 'goals';

interface StudyStatisticsProps {
  refreshTrigger?: number;
}

const StudyStatistics: React.FC<StudyStatisticsProps> = ({ refreshTrigger = 0 }) => {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [period, setPeriod] = useState<PeriodType>('week');
  const [view, setView] = useState<ViewType>('overview');

  // Veri getirme
  const fetchStatistics = async () => {
    try {
      setLoading(true);
      console.log('Fetching study sessions...');
      const response = await apiRequest('/study-sessions', { method: 'GET' });
      
      console.log('API Response:', response);
      
      if (response && Array.isArray(response)) {
        console.log(`Found ${response.length} study sessions`);
        setSessions(response);
        calculateStatistics(response, period);
      } else {
        console.log('Response is not an array or empty:', response);
        setSessions([]);
        calculateStatistics([], period);
      }
    } catch (error) {
      console.error('İstatistik verisi alınamadı:', error);
      setSessions([]);
      calculateStatistics([], period);
    } finally {
      setLoading(false);
    }
  };

  // İstatistikleri hesapla
  const calculateStatistics = (allSessions: StudySession[], selectedPeriod: PeriodType) => {
    let filteredSessions = allSessions;
    
    // Dönem filtreleme
    const now = dayjs();
    switch (selectedPeriod) {
      case 'today':
        filteredSessions = allSessions.filter(s => 
          dayjs(s.date).isSame(now, 'day')
        );
        break;
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
      default:
        break;
    }

    if (filteredSessions.length === 0) {
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
        weeklyGoal: 1200, // 20 saat hedef
        weeklyProgress: 0,
        dailyGoals: {},
        weeklyQualityGoal: 4.0,
        weeklySessionGoal: 15,
        monthlyTarget: 5000 // ~83 saat/ay
      });
      return;
    }

    // Temel hesaplamalar
    const totalTime = filteredSessions.reduce((sum, s) => sum + s.duration, 0);
    const sessionsCount = filteredSessions.length;
    const averageQuality = filteredSessions.reduce((sum, s) => sum + s.quality, 0) / sessionsCount;
    const averageEfficiency = filteredSessions.reduce((sum, s) => sum + s.efficiency, 0) / sessionsCount;
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
    const days = selectedPeriod === 'today' ? 1 : 
                selectedPeriod === 'week' ? 7 : 
                selectedPeriod === 'month' ? 30 : 
                Math.max(1, dayjs().diff(dayjs(filteredSessions[filteredSessions.length - 1]?.date), 'day'));
    
    const dailyAverage = totalTime / days;

    // Haftalık progress (sadece hafta görünümünde)
    const weeklyGoal = 1200; // 20 saat = 1200 dakika
    const weeklyProgress = selectedPeriod === 'week' ? (totalTime / weeklyGoal) * 100 : 0;

    // Günlük hedefler - hafta boyunca her gün için 3 saat (180 dk) hedef
    const dailyGoals: { [date: string]: { target: number; actual: number; completed: boolean } } = {};
    if (selectedPeriod === 'week') {
      const startOfWeek = now.startOf('week');
      for (let i = 0; i < 7; i++) {
        const date = startOfWeek.add(i, 'day').format('YYYY-MM-DD');
        const dayActual = filteredSessions
          .filter(s => dayjs(s.date).format('YYYY-MM-DD') === date)
          .reduce((sum, s) => sum + s.duration, 0);
        
        dailyGoals[date] = {
          target: 180, // 3 saat hedef
          actual: dayActual,
          completed: dayActual >= 180
        };
      }
    }

    // Haftalık kalite ve oturum hedefleri
    const weeklyQualityGoal = 4.0;
    const weeklySessionGoal = 15;
    const monthlyTarget = 5000; // ~83 saat aylık hedef

    // Streak hesaplama (basit versiyon)
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
      dailyGoals,
      weeklyQualityGoal,
      weeklySessionGoal,
      monthlyTarget
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

  // Format süre
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}s ${mins}d` : `${mins}d`;
  };

  // Export fonksiyonu
  const handleExport = () => {
    if (!stats) return;
    
    const exportData = {
      period,
      generatedAt: new Date().toISOString(),
      statistics: stats,
      sessions: sessions.length
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `study-statistics-${period}-${dayjs().format('YYYY-MM-DD')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchStatistics();
  }, [period, refreshTrigger]);

  useEffect(() => {
    if (sessions.length > 0) {
      calculateStatistics(sessions, period);
    }
  }, [period]);

  if (loading) {
    return (
      <div className="study-statistics">
        <div className="loading-container">
          <div className="loading-spinner">
            <Spin size="large" />
          </div>
          <div className="loading-text">İstatistikler yükleniyor...</div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="study-statistics">
        <div className="empty-container">
          <div className="empty-icon">
            <BarChartOutlined />
          </div>
          <div className="empty-title">İstatistik Verisi Bulunamadı</div>
          <div className="empty-description">
            Henüz çalışma oturumu kaydınız bulunmuyor. İlk oturumunuzu başlatarak istatistiklerinizi görmeye başlayabilirsiniz.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="study-statistics">
      {/* Modern Header */}
      <div className="statistics-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Çalışma İstatistikleri</h1>
            <p>Performansını analiz et ve hedeflerini takip et</p>
          </div>
          
          <div className="header-controls">
            <Select value={period} onChange={setPeriod}>
              <Option value="today">Bugün</Option>
              <Option value="week">Bu Hafta</Option>
              <Option value="month">Bu Ay</Option>
              <Option value="all">Tümü</Option>
            </Select>
            
            <Select value={view} onChange={setView}>
              <Option value="overview">Genel Bakış</Option>
              <Option value="goals">Hedefler</Option>
              <Option value="subjects">Dersler</Option>
              <Option value="techniques">Teknikler</Option>
              <Option value="performance">Performans</Option>
            </Select>

            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchStatistics}
              className="refresh-btn"
            />
            
            <Button 
              icon={<ExportOutlined />} 
              onClick={handleExport}
              className="export-btn"
            >
              Dışa Aktar
            </Button>
          </div>
        </div>
      </div>

      {/* Overview */}
      {view === 'overview' && (
        <div className="statistics-content">
          {/* Ana Metrikler */}
          <div className="metric-card fade-in">
            <div className="metric-header">
              <div className="metric-icon">
                <ClockCircleOutlined />
              </div>
              <div className="metric-trend positive">
                <span>↗</span>
                <span>+12%</span>
              </div>
            </div>
            <div className="metric-value">{formatTime(stats.totalTime)}</div>
            <div className="metric-label">Toplam Süre</div>
            <div className="metric-description">
              Bu dönemde toplam çalışma süreniz
            </div>
          </div>

          <div className="metric-card fade-in">
            <div className="metric-header">
              <div className="metric-icon">
                <BookOutlined />
              </div>
              <div className="metric-trend positive">
                <span>↗</span>
                <span>+8%</span>
              </div>
            </div>
            <div className="metric-value">{stats.sessionsCount}</div>
            <div className="metric-label">Oturum Sayısı</div>
            <div className="metric-description">
              Tamamlanan çalışma oturumu sayısı
            </div>
          </div>

          <div className="metric-card fade-in">
            <div className="metric-header">
              <div className="metric-icon">
                <TrophyOutlined />
              </div>
              <div className="metric-trend neutral">
                <span>→</span>
                <span>0%</span>
              </div>
            </div>
            <div className="metric-value">{stats.averageQuality}/5</div>
            <div className="metric-label">Ortalama Kalite</div>
            <div className="metric-description">
              Oturumlarınızın ortalama kalite puanı
            </div>
          </div>

          <div className="metric-card fade-in">
            <div className="metric-header">
              <div className="metric-icon">
                <FireOutlined />
              </div>
              <div className="metric-trend positive">
                <span>↗</span>
                <span>+3</span>
              </div>
            </div>
            <div className="metric-value">{stats.streak}</div>
            <div className="metric-label">Güncel Seri</div>
            <div className="metric-description">
              Ardışık çalışma günü sayısı
            </div>
          </div>

          {/* Haftalık Hedef Progress */}
          {period === 'week' && (
            <div className="progress-card slide-up">
              <div className="progress-header">
                <h3>Haftalık Hedef</h3>
                <div className="progress-percentage">{Math.round(stats.weeklyProgress)}%</div>
              </div>
              <Progress
                type="circle"
                percent={Math.round(stats.weeklyProgress)}
                format={(percent) => `${percent}%`}
                strokeColor={{
                  '0%': '#ff4d4f',
                  '50%': '#faad14',
                  '100%': '#52c41a',
                }}
                size={120}
              />
              <div className="progress-details">
                <div className="progress-label">İlerleme</div>
                <div className="progress-target">
                  {formatTime(stats.totalTime)} / {formatTime(stats.weeklyGoal)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subjects View */}
      {view === 'subjects' && (
        <div className="analysis-section">
          <div className="analysis-card scale-in">
            <div className="analysis-header">
              <div className="analysis-icon">
                <BookOutlined />
              </div>
              <h3>Ders Bazlı Analiz</h3>
            </div>
            <div className="analysis-content">
              {Object.entries(stats.subjectBreakdown)
                .sort(([,a], [,b]) => b - a)
                .map(([subject, duration]) => (
                  <div key={subject} className="analysis-item">
                    <div className="item-info">
                      <div className="item-avatar" style={{ backgroundColor: '#667eea' }}>
                        {subject.charAt(0).toUpperCase()}
                      </div>
                      <div className="item-details">
                        <div className="item-name">
                          {subject.charAt(0).toUpperCase() + subject.slice(1)}
                        </div>
                        <div className="item-description">
                          Toplam {formatTime(duration as number)} çalışıldı
                        </div>
                      </div>
                    </div>
                    <div className="item-metrics">
                      <div className="item-value">
                        {Math.round((duration as number / stats.totalTime) * 100)}%
                      </div>
                      <div className="item-progress">
                        <Progress 
                          percent={Math.round((duration as number / stats.totalTime) * 100)} 
                          size="small"
                          strokeColor="#667eea"
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Techniques View */}
      {view === 'techniques' && (
        <div className="analysis-section">
          <div className="analysis-card scale-in">
            <div className="analysis-header">
              <div className="analysis-icon">
                <BarChartOutlined />
              </div>
              <h3>Teknik Kullanım Analizi</h3>
            </div>
            <div className="analysis-content">
              {Object.entries(stats.techniqueBreakdown)
                .sort(([,a], [,b]) => b - a)
                .map(([technique, count]) => (
                  <div key={technique} className="analysis-item">
                    <div className="item-info">
                      <div className="item-avatar" style={{ backgroundColor: '#10b981' }}>
                        {technique.charAt(0).toUpperCase()}
                      </div>
                      <div className="item-details">
                        <div className="item-name">{technique}</div>
                        <div className="item-description">
                          {count} oturumda kullanıldı
                        </div>
                      </div>
                    </div>
                    <div className="item-metrics">
                      <div className="item-value">
                        {Math.round((count as number / stats.sessionsCount) * 100)}%
                      </div>
                      <div className="item-progress">
                        <Progress 
                          percent={Math.round((count as number / stats.sessionsCount) * 100)} 
                          size="small"
                          strokeColor="#10b981"
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Goals View */}
      {view === 'goals' && (
        <div className="statistics-content">
          {/* Haftalık Hedefler */}
          {period === 'week' && (
            <>
              <div className="progress-card scale-in">
                <div className="progress-header">
                  <h3>Haftalık Çalışma Süresi</h3>
                  <div className="progress-percentage">{Math.round(stats.weeklyProgress)}%</div>
                </div>
                <Progress
                  type="circle"
                  percent={Math.round(stats.weeklyProgress)}
                  format={() => `${formatTime(stats.totalTime)}`}
                  strokeColor={{
                    '0%': '#ff4d4f',
                    '50%': '#faad14',
                    '100%': '#52c41a',
                  }}
                  size={120}
                />
                <div className="progress-details">
                  <div className="progress-label">İlerleme</div>
                  <div className="progress-target">
                    Hedef: {formatTime(stats.weeklyGoal)}
                  </div>
                </div>
              </div>

              <div className="progress-card scale-in">
                <div className="progress-header">
                  <h3>Kalite Hedefi</h3>
                  <div className="progress-percentage">{Math.round((stats.averageQuality / stats.weeklyQualityGoal) * 100)}%</div>
                </div>
                <Progress
                  type="circle"
                  percent={Math.round((stats.averageQuality / stats.weeklyQualityGoal) * 100)}
                  format={() => `${stats.averageQuality}/5`}
                  strokeColor={stats.averageQuality >= stats.weeklyQualityGoal ? '#52c41a' : '#1890ff'}
                  size={120}
                />
                <div className="progress-details">
                  <div className="progress-label">Ortalama Kalite</div>
                  <div className="progress-target">
                    Hedef: {stats.weeklyQualityGoal}/5
                  </div>
                </div>
              </div>

              <div className="progress-card scale-in">
                <div className="progress-header">
                  <h3>Oturum Sayısı</h3>
                  <div className="progress-percentage">{Math.round((stats.sessionsCount / stats.weeklySessionGoal) * 100)}%</div>
                </div>
                <Progress
                  type="circle"
                  percent={Math.round((stats.sessionsCount / stats.weeklySessionGoal) * 100)}
                  format={() => `${stats.sessionsCount}`}
                  strokeColor={stats.sessionsCount >= stats.weeklySessionGoal ? '#52c41a' : '#1890ff'}
                  size={120}
                />
                <div className="progress-details">
                  <div className="progress-label">Tamamlanan Oturum</div>
                  <div className="progress-target">
                    Hedef: {stats.weeklySessionGoal} oturum
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Aylık Hedef */}
          {period === 'month' && (
            <div className="progress-card scale-in">
              <div className="progress-header">
                <h3>Aylık Hedef</h3>
                <div className="progress-percentage">{Math.round((stats.totalTime / stats.monthlyTarget) * 100)}%</div>
              </div>
              <Progress
                type="circle"
                percent={Math.round((stats.totalTime / stats.monthlyTarget) * 100)}
                format={() => `${Math.round((stats.totalTime / stats.monthlyTarget) * 100)}%`}
                strokeColor={{
                  '0%': '#ff4d4f',
                  '50%': '#faad14',
                  '100%': '#52c41a',
                }}
                size={120}
              />
              <div className="progress-details">
                <div className="progress-label">Aylık Çalışma Hedefi</div>
                <div className="progress-target">
                  {formatTime(stats.totalTime)} / {formatTime(stats.monthlyTarget)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performance View */}
      {view === 'performance' && (
        <div className="visualization-section">
          <div className="chart-container">
            <div className="chart-header">
              <h3>Performans Analizi</h3>
              <div className="chart-controls">
                <Button size="small" type="text">Detaylar</Button>
              </div>
            </div>
            <div className="analysis-content">
              {Object.entries(stats.moodBreakdown)
                .sort(([,a], [,b]) => b - a)
                .map(([mood, count]) => (
                  <div key={mood} className="analysis-item">
                    <div className="item-info">
                      <div className="item-avatar" style={{ backgroundColor: '#f59e0b' }}>
                        <SmileOutlined />
                      </div>
                      <div className="item-details">
                        <div className="item-name">{mood}</div>
                        <div className="item-description">
                          {count} oturum
                        </div>
                      </div>
                    </div>
                    <div className="item-metrics">
                      <div className="item-value">
                        {Math.round((count as number / stats.sessionsCount) * 100)}%
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="insights-panel">
            <div className="insights-header">
              <h3>Performans İçgörüleri</h3>
              <p>Çalışma performansınızın detaylı analizi</p>
            </div>
            
            <div className="insight-item">
              <div className="insight-icon" style={{ backgroundColor: '#ef4444' }}>
                <PhoneOutlined />
              </div>
              <div className="insight-content">
                <div className="insight-title">Dikkat Dağınıklığı</div>
                <div className="insight-value">
                  {stats.totalDistractions} kez (oturum başına {Math.round(stats.totalDistractions / stats.sessionsCount * 10) / 10})
                </div>
              </div>
              <div className="insight-trend negative">
                -5%
              </div>
            </div>

            <div className="insight-item">
              <div className="insight-icon" style={{ backgroundColor: '#1890ff' }}>
                <CalendarOutlined />
              </div>
              <div className="insight-content">
                <div className="insight-title">Günlük Ortalama</div>
                <div className="insight-value">
                  {formatTime(stats.dailyAverage)} çalışma süresi
                </div>
              </div>
              <div className="insight-trend positive">
                +12%
              </div>
            </div>

            <div className="insight-item">
              <div className="insight-icon" style={{ backgroundColor: '#10b981' }}>
                <BarChartOutlined />
              </div>
              <div className="insight-content">
                <div className="insight-title">Verimlilik</div>
                <div className="insight-value">
                  %{stats.averageEfficiency} ortalama
                </div>
              </div>
              <div className="insight-trend positive">
                +8%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyStatistics;