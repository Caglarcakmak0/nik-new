import React, { useState } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Progress, 
  Typography, 
  Button,
  Select,
  Badge
} from 'antd';
import { 
  BarChartOutlined,
  LineChartOutlined,
  ArrowUpOutlined,
  BookOutlined,
  RiseOutlined,
  CheckCircleOutlined,
  TrophyOutlined as TrophyIcon,
  RocketOutlined
} from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { calculateAdvancedMetrics, extractSessionsFromPlan, timeframeToDays } from './useAdvancedAnalytics';
import type { StudyPlanLike } from './analyticsTypes';
import MetricCard from './MetricCard';
import InsightsCards from './InsightsCards';
import TrendsTimeline from './TrendsTimeline';
import './AdvancedAnalytics.scss';
// Recharts direct imports removed; handled inside chart components
import LineTimeSeriesChart from './charts/LineTimeSeriesChart';
import SubjectBarChart from './charts/SubjectBarChart';
import TechniquePieChart from './charts/TechniquePieChart';
// chartPalette handled internally by individual chart components

const { Title, Text } = Typography;
const { Option } = Select;

interface AdvancedAnalyticsProps {
  plan: StudyPlanLike;
  selectedDate: Dayjs;
  onRefresh: () => void;
}

// Local StudySession interface removed; types live in analyticsTypes if needed

const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({ plan, selectedDate, onRefresh }) => {
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  // dateRange kaldırıldı

  // Plan içinden populate edilmiş session'ları çıkar (tek veri kaynağı)
  // Sessions extraction now imported utility

  // Gelişmiş Metrik Hesaplamaları
  const metrics = calculateAdvancedMetrics(plan);

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
  const getTimeframeDays = (): number => timeframeToDays(analyticsTimeframe);

  // minutesToDisplay used within utility/chart components

  // Grafik verileri: Günlük zaman serisi
  const buildDailySeries = () => {
    const days = getTimeframeDays();
    const start = dayjs().startOf('day').subtract(days - 1, 'day');
    const map: Record<string, { minutes: number; sessions: number; qualitySum: number }> = {};

    for (let i = 0; i < days; i++) {
      const d = start.add(i, 'day');
      map[d.format('YYYY-MM-DD')] = { minutes: 0, sessions: 0, qualitySum: 0 };
    }

  const filtered = extractSessionsFromPlan(plan).filter(s => {
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

  const src = extractSessionsFromPlan(plan);
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

  const src = extractSessionsFromPlan(plan);
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

  const dailySeries = buildDailySeries();
  const subjectData = buildSubjectDistribution();
  const techniqueData = buildTechniqueBreakdown();

  const renderMetricCard = (title: string, value: number, icon: React.ReactNode, suffix?: string, description?: string) => (
    <MetricCard
      title={title}
      value={value}
      icon={icon}
      suffix={suffix}
      description={description}
      color={getMetricColor(value)}
      status={getMetricStatus(value)}
    />
  );

  // renderSubjectCard kaldırıldı (kullanılmıyor)

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
                <div className="chart-item">
                  <LineTimeSeriesChart data={dailySeries} />
                </div>
                <div className="chart-item">
                  <SubjectBarChart data={subjectData} />
                </div>
                <div className="chart-item">
                  <TechniquePieChart data={techniqueData.map(t => ({ technique: t.name, minutes: t.count }))} />
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

      {/* Öneriler ve Trendler (bölünmüş komponentler) */}
      <Row gutter={[24, 24]} className="insights-section">
        <Col xs={24} lg={12}>
          <InsightsCards plan={plan} efficiency={metrics.efficiency} />
        </Col>
        <Col xs={24} lg={12}>
          <TrendsTimeline plan={plan} efficiency={metrics.efficiency} />
        </Col>
      </Row>
    </div>
  );
};

export default AdvancedAnalytics;