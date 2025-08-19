import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Progress, 
  Typography, 
  Space, 
  Tag, 
  Alert, 
  Button,
  DatePicker,
  Select,
  Divider,
  Timeline,
  Tabs,
  Tooltip,
  Badge
} from 'antd';
import { 
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  TrophyOutlined,
  FireOutlined,
  ClockCircleOutlined,
  StarOutlined,
  ArrowUpOutlined,
  AimOutlined,
  ThunderboltOutlined,
  BookOutlined,
  CalendarOutlined,
  BulbOutlined,
  RiseOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined as ClockIcon,
  TrophyOutlined as TrophyIcon,
  RocketOutlined
} from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import './AdvancedAnalytics.scss';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface AdvancedAnalyticsProps {
  plan: {
    _id: string;
    date: string;
    title: string;
    subjects: Array<{
      subject: string;
      targetQuestions: number;
      targetTime?: number;
      topics: string[];
      priority: number;
      completedQuestions: number;
      correctAnswers: number;
      wrongAnswers: number;
      blankAnswers: number;
      studyTime: number;
      status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
      sessionIds: any[];
    }>;
    stats: {
      totalTargetQuestions: number;
      totalCompletedQuestions: number;
      totalTargetTime: number;
      totalStudyTime: number;
      completionRate: number;
      netScore: number;
      successRate: number;
    };
  };
  selectedDate: Dayjs;
  onRefresh: () => void;
}

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
  questionStats?: {
    targetQuestions: number;
    correctAnswers: number;
    wrongAnswers: number;
    blankAnswers: number;
    netScore: number;
    completionRate: number;
  };
}

const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({ plan, selectedDate, onRefresh }) => {
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(7, 'day'),
    dayjs()
  ]);

  // Plan içinden populate edilmiş session'ları çıkar (tek veri kaynağı)
  const extractSessionsFromPlan = (): StudySession[] => {
    try {
      const all: StudySession[] = [] as any;
      (plan?.subjects || []).forEach((subj) => {
        (subj.sessionIds || []).forEach((sess: any) => {
          if (sess && typeof sess === 'object' && (sess as any)._id) {
            all.push(sess as StudySession);
          }
        });
      });
      // benzersizleştir
      const map = new Map<string, StudySession>();
      all.forEach((s: any) => {
        const id = (s as any)._id || (s as any).id;
        if (id && !map.has(id)) map.set(id, s);
      });
      return Array.from(map.values());
    } catch {
      return [];
    }
  };

  // Gelişmiş Metrik Hesaplamaları
  const calculateAdvancedMetrics = () => {
    // Plan verilerinden temel metrikler
    const planEfficiency = plan.stats.totalStudyTime > 0 
      ? (plan.stats.totalCompletedQuestions / (plan.stats.totalStudyTime / 60))
      : 0;

    const velocityScore = plan.stats.completionRate * (plan.stats.successRate / 100) * 10;
    
    // Plan'dan ders dağılımı
    const planSubjectDistribution = plan.subjects.reduce((acc, subject) => {
      const totalQuestions = subject.correctAnswers + subject.wrongAnswers + subject.blankAnswers;
      if (totalQuestions > 0) {
        acc[subject.subject] = {
          totalQuestions,
          accuracy: (subject.correctAnswers / totalQuestions) * 100,
          timeSpent: subject.studyTime,
          efficiency: totalQuestions / (subject.studyTime / 60) || 0
        };
      }
      return acc;
    }, {} as Record<string, any>);

    // Study Sessions verilerinden ek metrikler (yalnızca plan içindeki sessionlar)
    let sessionsMetrics = {
      totalStudyTime: 0,
      averageQuality: 0,
      totalSessions: 0,
      subjectDistribution: {} as Record<string, any>
    };

    const src = extractSessionsFromPlan();
    if (src.length > 0) {
      // Tarih filtresi uygula (son hafta)
      const weekAgo = dayjs().subtract(7, 'day');
      const filteredSessions = src.filter(session => 
        dayjs(session.date).isAfter(weekAgo)
      );

      sessionsMetrics.totalSessions = filteredSessions.length;
      sessionsMetrics.totalStudyTime = filteredSessions.reduce((sum, s) => sum + s.duration, 0);
      sessionsMetrics.averageQuality = filteredSessions.length > 0 
        ? filteredSessions.reduce((sum, s) => sum + s.quality, 0) / filteredSessions.length 
        : 0;

      // Sessions'dan ders dağılımı
      sessionsMetrics.subjectDistribution = filteredSessions.reduce((acc, session) => {
        if (!acc[session.subject]) {
          acc[session.subject] = {
            totalTime: 0,
            sessions: 0,
            averageQuality: 0,
            totalQuestions: 0,
            accuracy: 0
          };
        }
        
        acc[session.subject].totalTime += session.duration;
        acc[session.subject].sessions += 1;
        acc[session.subject].averageQuality += session.quality;
        
        if (session.questionStats) {
          const totalAttempted = session.questionStats.correctAnswers + 
                                session.questionStats.wrongAnswers + 
                                session.questionStats.blankAnswers;
          acc[session.subject].totalQuestions += totalAttempted;
          if (totalAttempted > 0) {
            acc[session.subject].accuracy = (session.questionStats.correctAnswers / totalAttempted) * 100;
          }
        }
        
        return acc;
      }, {} as Record<string, any>);

      // Ortalama kaliteyi hesapla
      Object.keys(sessionsMetrics.subjectDistribution).forEach(subject => {
        const data = sessionsMetrics.subjectDistribution[subject];
        data.averageQuality = data.averageQuality / data.sessions;
      });
    }

    return {
      efficiency: Math.round(planEfficiency * 100) / 100,
      velocityScore: Math.round(velocityScore * 100) / 100,
      subjectDistribution: planSubjectDistribution,
      sessionsMetrics,
      consistencyScore: plan.stats.completionRate,
      focusScore: plan.stats.totalStudyTime > 0 ? Math.min(100, (plan.stats.totalCompletedQuestions / plan.stats.totalTargetQuestions) * 100) : 0
    };
  };

  const metrics = calculateAdvancedMetrics();

  // Renk Paleti
  const getMetricColor = (value: number) => {
    if (value >= 80) return '#52c41a';
    if (value >= 60) return '#faad14';
    if (value >= 40) return '#ff7a45';
    return '#ff4d4f';
  };

  const getMetricStatus = (value: number) => {
    if (value >= 80) return 'excellent';
    if (value >= 60) return 'good';
    if (value >= 40) return 'average';
    return 'needs-improvement';
  };

  // Zaman aralığı yardımcıları
  const getTimeframeDays = (): number => {
    switch (analyticsTimeframe) {
      case 'monthly':
        return 30;
      case 'weekly':
        return 7;
      case 'daily':
      default:
        return 7;
    }
  };

  const formatMinutes = (minutes: number): string => {
    if (!minutes || minutes <= 0) return '0dk';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}s ${m}d` : `${m}d`;
  };

  // Grafik verileri: Günlük zaman serisi
  const buildDailySeries = () => {
    const days = getTimeframeDays();
    const start = dayjs().startOf('day').subtract(days - 1, 'day');
    const map: Record<string, { minutes: number; sessions: number; qualitySum: number }> = {};

    for (let i = 0; i < days; i++) {
      const d = start.add(i, 'day');
      map[d.format('YYYY-MM-DD')] = { minutes: 0, sessions: 0, qualitySum: 0 };
    }

    const filtered = extractSessionsFromPlan().filter(s => {
      const d = dayjs(s.date);
      if (!d.isValid()) return false;
      if (d.isBefore(start) || d.isAfter(dayjs().endOf('day'))) return false;
      if (selectedSubject !== 'all' && s.subject !== selectedSubject) return false;
      return true;
    });

    filtered.forEach(s => {
      const key = dayjs(s.date).format('YYYY-MM-DD');
      if (!map[key]) return;
      map[key].minutes += s.duration || 0;
      map[key].sessions += 1;
      map[key].qualitySum += s.quality || 0;
    });

    return Object.keys(map).map(key => {
      const label = dayjs(key).format('DD MMM');
      const sessions = map[key].sessions;
      const avgQuality = sessions > 0 ? Math.round((map[key].qualitySum / sessions) * 10) / 10 : 0;
      return {
        date: key,
        label,
        minutes: map[key].minutes,
        sessions,
        avgQuality
      };
    });
  };

  // Grafik verileri: Ders bazlı süre dağılımı
  const buildSubjectDistribution = () => {
    const days = getTimeframeDays();
    const start = dayjs().startOf('day').subtract(days - 1, 'day');
    const subjectToMinutes: Record<string, number> = {};

    const src = extractSessionsFromPlan();
    src.forEach(s => {
      const d = dayjs(s.date);
      if (!d.isValid()) return;
      if (d.isBefore(start) || d.isAfter(dayjs().endOf('day'))) return;
      subjectToMinutes[s.subject] = (subjectToMinutes[s.subject] || 0) + (s.duration || 0);
    });

    const arr = Object.entries(subjectToMinutes)
      .map(([subject, minutes]) => ({ subject, minutes }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 8);

    return arr;
  };

  // Grafik verileri: Teknik kırılımı (pie)
  const buildTechniqueBreakdown = () => {
    const days = getTimeframeDays();
    const start = dayjs().startOf('day').subtract(days - 1, 'day');
    const techniqueToCount: Record<string, number> = {};

    const src = extractSessionsFromPlan();
    src.forEach(s => {
      const d = dayjs(s.date);
      if (!d.isValid()) return;
      if (d.isBefore(start) || d.isAfter(dayjs().endOf('day'))) return;
      techniqueToCount[s.technique] = (techniqueToCount[s.technique] || 0) + 1;
    });

    return Object.entries(techniqueToCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  };

  const chartPalette = ['#1890ff', '#52c41a', '#faad14', '#eb2f96', '#13c2c2', '#722ed1', '#f5222d', '#a0d911'];
  const dailySeries = buildDailySeries();
  const subjectData = buildSubjectDistribution();
  const techniqueData = buildTechniqueBreakdown();

  const renderMetricCard = (title: string, value: number, icon: React.ReactNode, suffix?: string, description?: string) => {
    const color = getMetricColor(value);
    const status = getMetricStatus(value);
    
    return (
      <Card className={`metric-card ${status}`} variant="borderless">
        <div className="metric-content">
          <div className="metric-icon">
            {icon}
          </div>
          <div className="metric-details">
            <Statistic
              title={title}
              value={value}
              suffix={suffix}
              valueStyle={{ color, fontSize: '24px', fontWeight: 700 }}
            />
            {description && (
              <Text type="secondary" className="metric-description">
                {description}
              </Text>
            )}
          </div>
          <div className="metric-indicator">
            <div className="indicator-dot" style={{ backgroundColor: color }} />
          </div>
        </div>
      </Card>
    );
  };

  const renderSubjectCard = (subject: any) => {
    const accuracy = subject.accuracy || 0;
    const efficiency = subject.efficiency || 0;
    
    return (
      <Card key={subject.subject} className="subject-card" variant="borderless">
        <div className="subject-header">
          <BookOutlined className="subject-icon" />
          <Title level={5} className="subject-title">{subject.subject}</Title>
          <Badge 
            status={accuracy >= 80 ? 'success' : accuracy >= 60 ? 'processing' : 'error'} 
            text={`${accuracy.toFixed(1)}%`}
          />
        </div>
        
        <div className="subject-metrics">
          <div className="metric-row">
            <div className="metric-item">
              <Text type="secondary">Tamamlanan</Text>
              <Text strong>{subject.totalQuestions}</Text>
            </div>
            <div className="metric-item">
              <Text type="secondary">Süre</Text>
              <Text strong>{Math.round(subject.timeSpent / 60)}dk</Text>
            </div>
            <div className="metric-item">
              <Text type="secondary">Verimlilik</Text>
              <Text strong>{efficiency.toFixed(1)}/dk</Text>
            </div>
          </div>
        </div>
        
        <Progress 
          percent={accuracy} 
          size="small" 
          strokeColor={getMetricColor(accuracy)}
          showInfo={false}
        />
      </Card>
    );
  };

  return (
    <div className="advanced-analytics-modern">
      {/* Header Section */}
      <div className="analytics-header">
        <div className="header-content">
          <div className="header-left">
            <Title level={3} className="header-title">
              <BarChartOutlined /> Çalışma İstatistikleri
            </Title>
            <Text type="secondary" className="header-subtitle">
              {selectedDate.format('DD MMMM YYYY')} tarihli performans analizi
            </Text>
          </div>
          <div className="header-actions">
            <Select
              value={analyticsTimeframe}
              onChange={setAnalyticsTimeframe}
              className="timeframe-select"
            >
              <Option value="daily">Günlük</Option>
              <Option value="weekly">Haftalık</Option>
              <Option value="monthly">Aylık</Option>
            </Select>
            <Button 
              type="primary" 
              icon={<ArrowUpOutlined />}
              onClick={onRefresh}
              className="refresh-btn"
            >
              Yenile
            </Button>
          </div>
        </div>
      </div>

      {/* Ana Metrikler */}
      <Row gutter={[24, 24]} className="metrics-section">
        <Col xs={24} sm={12} lg={6}>
          {renderMetricCard(
            'Tamamlanma Oranı',
            plan.stats.completionRate,
            <CheckCircleOutlined />,
            '%',
            'Hedeflenen görevlerin tamamlanma yüzdesi'
          )}
        </Col>
        <Col xs={24} sm={12} lg={6}>
          {renderMetricCard(
            'Başarı Oranı',
            plan.stats.successRate,
            <TrophyIcon />,
            '%',
            'Doğru cevapların toplam sorulara oranı'
          )}
        </Col>
        <Col xs={24} sm={12} lg={6}>
          {renderMetricCard(
            'Verimlilik',
            metrics.efficiency,
            <RocketOutlined />,
            'soru/dk',
            'Dakika başına çözülen soru sayısı'
          )}
        </Col>
        <Col xs={24} sm={12} lg={6}>
          {renderMetricCard(
            'Hız Skoru',
            metrics.velocityScore,
            <RiseOutlined />,
            '/10',
            'Genel performans ve hız değerlendirmesi'
          )}
        </Col>
      </Row>

      {/* Detaylı Analiz */}
      <Row gutter={[24, 24]} className="detailed-section">
        <Col xs={24} lg={24}>
          <Card className="main-chart-card" variant="borderless">
            <div className="card-header">
              <Title level={4}>
                <LineChartOutlined /> Konu Bazlı Performans
              </Title>
              <Select
                value={selectedSubject}
                onChange={setSelectedSubject}
                className="subject-select"
                placeholder="Konu seçin"
              >
                <Option value="all">Tüm Konular</Option>
                {plan.subjects.map(subject => (
                  <Option key={subject.subject} value={subject.subject}>
                    {subject.subject}
                  </Option>
                ))}
              </Select>
            </div>
            
            <div className="chart-content">
              <div className="chart-grid">
                <div className="chart-item chart-item--large">
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={dailySeries} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis yAxisId="left" tickFormatter={(v) => `${v}`} />
                      <RechartsTooltip formatter={(value: any, name: string) => {
                        if (name === 'Süre (dk)') return [formatMinutes(value as number), name];
                        if (name === 'Oturum') return [value, name];
                        if (name === 'Kalite') return [value, name];
                        return [value, name];
                      }} />
                      <Legend />
                      <Line type="monotone" dataKey="minutes" name="Süre (dk)" stroke="#1890ff" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="sessions" name="Oturum" stroke="#52c41a" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="avgQuality" name="Kalite" stroke="#faad14" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-item">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={subjectData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="subject" />
                      <YAxis />
                      <RechartsTooltip formatter={(value: any) => [formatMinutes(value as number), 'Süre (dk)']} />
                      <Legend />
                      <Bar dataKey="minutes" name="Süre (dk)">
                        {subjectData.map((entry, index) => (
                          <Cell key={`cell-sub-${index}`} fill={chartPalette[index % chartPalette.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-item">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={techniqueData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                        {techniqueData.map((entry, index) => (
                          <Cell key={`cell-tech-${index}`} fill={chartPalette[index % chartPalette.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Konu Detayları */}
      <Card className="subjects-section" variant="borderless">
        <div className="card-header">
          <Title level={4}>
            <BookOutlined /> Konu Bazlı Detaylar
          </Title>
        </div>
        
        <div className="subjects-content">
          {plan.subjects.map(subject => {
            const totalQuestions = subject.correctAnswers + subject.wrongAnswers + subject.blankAnswers;
            const accuracy = totalQuestions > 0 ? (subject.correctAnswers / totalQuestions) * 100 : 0;
            const efficiency = subject.studyTime > 0 ? totalQuestions / (subject.studyTime / 60) : 0;
            
            return (
              <div key={subject.subject} className="subject-card">
                <div className="subject-header">
                  <BookOutlined className="subject-icon" />
                  <div className="subject-title">{subject.subject}</div>
                  <Badge 
                    status={accuracy >= 80 ? 'success' : accuracy >= 60 ? 'processing' : 'error'} 
                    text={`${accuracy.toFixed(1)}%`}
                  />
                </div>
                
                <div className="subject-metrics">
                  <div className="metric-row">
                    <div className="metric-item">
                      <Text type="secondary">Tamamlanan</Text>
                      <Text strong>{totalQuestions}</Text>
                    </div>
                    <div className="metric-item">
                      <Text type="secondary">Süre</Text>
                      <Text strong>{Math.round(subject.studyTime / 60)}dk</Text>
                    </div>
                    <div className="metric-item">
                      <Text type="secondary">Verimlilik</Text>
                      <Text strong>{efficiency.toFixed(1)}/dk</Text>
                    </div>
                  </div>
                  
                  <div className="progress-section">
                    <div className="progress-header">
                      <span className="progress-title">Başarı Oranı</span>
                      <span className="progress-value">{accuracy.toFixed(1)}%</span>
                    </div>
                    <Progress 
                      percent={accuracy} 
                      size="small" 
                      showInfo={false}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Öneriler ve Uyarılar */}
      <Row gutter={[24, 24]} className="insights-section">
        <Col xs={24} lg={12}>
          <Card className="insights-card" variant="borderless">
            <div className="card-header">
              <Title level={4}>
                <BulbOutlined /> Performans Önerileri
              </Title>
            </div>
            
            <div className="insights-content">
              <div className="insights-grid">
                {plan.stats.completionRate < 70 && (
                  <div className="insight-card warning">
                    <div className="insight-icon">
                      <ClockCircleOutlined />
                    </div>
                    <div className="insight-content">
                      <div className="insight-header">
                        <Text strong className="insight-title">Tamamlanma Oranı Düşük</Text>
                      </div>
                      <Text type="secondary" className="insight-description">
                        Hedeflenen görevlerin %70'inden azını tamamladınız. Daha fazla zaman ayırmayı ve öncelik sıralaması yapmayı düşünün.
                      </Text>
                    </div>
                  </div>
                )}
                
                {plan.stats.successRate < 60 && (
                  <div className="insight-card error">
                    <div className="insight-icon">
                      <TrophyOutlined />
                    </div>
                    <div className="insight-content">
                      <div className="insight-header">
                        <Text strong className="insight-title">Başarı Oranı Geliştirilmeli</Text>
                      </div>
                      <Text type="secondary" className="insight-description">
                        Doğru cevap oranınız %60'ın altında. Konuları tekrar gözden geçirmenizi ve çalışma stratejinizi yeniden değerlendirmenizi öneririz.
                      </Text>
                    </div>
                  </div>
                )}
                
                {metrics.efficiency < 2 && (
                  <div className="insight-card info">
                    <div className="insight-icon">
                      <RocketOutlined />
                    </div>
                    <div className="insight-content">
                      <div className="insight-header">
                        <Text strong className="insight-title">Verimlilik Optimizasyonu</Text>
                      </div>
                      <Text type="secondary" className="insight-description">
                        Dakika başına çözülen soru sayısı düşük. Çalışma tekniklerinizi gözden geçirin ve odaklanma sürenizi artırın.
                      </Text>
                    </div>
                  </div>
                )}

                {plan.stats.totalStudyTime < 120 && (
                  <div className="insight-card neutral">
                    <div className="insight-icon">
                      <BookOutlined />
                    </div>
                    <div className="insight-content">
                      <div className="insight-header">
                        <Text strong className="insight-title">Çalışma Süresi Kısa</Text>
                      </div>
                      <Text type="secondary" className="insight-description">
                        Günlük çalışma süreniz 2 saatin altında. Daha fazla zaman ayırarak performansınızı artırabilirsiniz.
                      </Text>
                    </div>
                  </div>
                )}
                
                {plan.stats.completionRate >= 80 && plan.stats.successRate >= 70 && (
                  <div className="insight-card success">
                    <div className="insight-icon">
                      <StarOutlined />
                    </div>
                    <div className="insight-content">
                      <div className="insight-header">
                        <Text strong className="insight-title">Mükemmel Performans!</Text>
                      </div>
                      <Text type="secondary" className="insight-description">
                        Harika bir gün geçirdiniz! Bu tempoyu korumaya devam edin ve hedeflerinizi daha da yükseltmeyi düşünün.
                      </Text>
                    </div>
                  </div>
                )}

                {plan.subjects.some(subject => {
                  const totalQuestions = subject.correctAnswers + subject.wrongAnswers + subject.blankAnswers;
                  const accuracy = totalQuestions > 0 ? (subject.correctAnswers / totalQuestions) * 100 : 0;
                  return accuracy < 50;
                }) && (
                  <div className="insight-card error">
                    <div className="insight-icon">
                      <AimOutlined />
                    </div>
                    <div className="insight-content">
                      <div className="insight-header">
                        <Text strong className="insight-title">Zayıf Konu Tespit Edildi</Text>
                      </div>
                      <Text type="secondary" className="insight-description">
                        Bazı konularda %50'nin altında başarı oranınız var. Bu konulara özel çalışma planı oluşturmanızı öneririz.
                      </Text>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card className="trends-card" variant="borderless">
            <div className="card-header">
              <Title level={4}>
                <RiseOutlined /> Trend Analizi
              </Title>
            </div>
            
            <div className="trends-content">
              <Timeline 
                className="trends-timeline"
                items={[
                  {
                    className: "ant-timeline-item-red",
                    dot: <FireOutlined />,
                    children: (
                      <>
                        <Text strong>Günlük Hedef Performansı</Text>
                        <div className="trend-metric">
                          <div className="metric-icon">
                            <AimOutlined />
                          </div>
                          <div className="metric-details">
                            <div className="metric-label">Hedef vs Tamamlanan</div>
                            <div className="metric-value">
                              {plan.stats.totalCompletedQuestions} / {plan.stats.totalTargetQuestions}
                            </div>
                          </div>
                        </div>
                      </>
                    )
                  },
                  {
                    className: "ant-timeline-item-orange",
                    dot: <ClockCircleOutlined />,
                    children: (
                      <>
                        <Text strong>Zaman Yönetimi Analizi</Text>
                        <div className="trend-metric">
                          <div className="metric-details">
                            <div className="metric-label">Toplam Süre</div>
                            <div className="metric-value">
                              {Math.round(plan.stats.totalStudyTime / 60)} dakika
                            </div>
                          </div>
                        </div>
                      </>
                    )
                  },
                  {
                    className: "ant-timeline-item-green",
                    dot: <TrophyOutlined />,
                    children: (
                      <>
                        <Text strong>Başarı ve Kalite Metrikleri</Text>
                        <div className="trend-metric">
                          <div className="metric-details">
                            <div className="metric-label">Başarı Oranı</div>
                            <div className="metric-value">
                              %{plan.stats.successRate} ({plan.stats.netScore} net)
                            </div>
                          </div>
                        </div>
                      </>
                    )
                  },
                  {
                    className: "ant-timeline-item-red",
                    dot: <RocketOutlined />,
                    children: (
                      <>
                        <Text strong>Verimlilik Skoru</Text>
                        <div className="trend-metric">
                          <div className="metric-details">
                            <div className="metric-label">Soru/Dakika</div>
                            <div className="metric-value">
                              {metrics.efficiency.toFixed(1)} soru/dk
                            </div>
                          </div>
                        </div>
                      </>
                    )
                  }
                ]}
              />
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdvancedAnalytics;