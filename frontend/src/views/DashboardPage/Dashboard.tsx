import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { 
  Card, 
  Typography, 
  Space, 
  Row, 
  Col, 
  Statistic, 
  Progress
} from 'antd';
import { 
  FireOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { apiRequest, getLeaderboardUserStats, getAdvancedAnalytics, AdvancedAnalyticsResponse } from '../../services/api';
import type { LeaderboardUserStats } from '../../services/api';
import { ActiveGoals } from './bones';
const AdvancedAnalytics = React.lazy(() => import('../StudyPlanPage/bones/AdvancedAnalytics/AdvancedAnalytics'));
import { AnalyticsMiniCard, AnalyticsRangeCard } from '../../components/feature/analytics';
import type { AnalyticsRange } from '../../components/feature/analytics/AnalyticsRangeCard';
import { useStudyStats, formatMinutes } from '../../hooks/useStudyStats';


const { Title, Text } = Typography;

interface DashboardData {
  overview: {
    totalStudyTime: number;
    currentStreak: number;
    activeGoals: number;
    profileCompleteness: number;
  };
  weeklyTrend: {
    totalTime: number;
    sessionCount: number;
    averageQuality: number;
    averageEfficiency: number;
  };
  goalsOverview: Array<{
    id: string;
    universityName: string;
    department: string;
    priority: number;
    progress: number;
    streak: number;
    daysRemaining: number;
    image?: string; // Okul görseli URL'i
  }>;
  recentActivity: Array<{
    date: string;
    subject: string;
    duration: number;
    quality: number;
    mood: string;
    efficiency: number;
  }>;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLeaderboard, setUserLeaderboard] = useState<LeaderboardUserStats | null>(null);
  const [range, setRange] = useState<AnalyticsRange>('weekly');
  const [advLoading, setAdvLoading] = useState(false);
  const [advancedData, setAdvancedData] = useState<AdvancedAnalyticsResponse | null>(null);
  // Map dashboard analytics range to study stats period
  const studyPeriodMap: Record<AnalyticsRange, 'today' | 'week' | 'month' | 'all'> = {
    daily: 'today',
    weekly: 'week',
    monthly: 'month',
    all: 'all'
  };
  const { stats: studyStats, /*sessions*/ totalTimeSeries, sessionCountSeries, qualitySeries, streakSeries } = useStudyStats(studyPeriodMap[range]);
  // No local computed streak; backend provides overview.currentStreak

  // Dashboard verilerini al
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(`/analytics/dashboard?range=${range}`);
      if (response.data) setDashboardData(response.data);
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      // Fallback veri yok: state null kalır
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // advanced analytics
    (async () => {
      setAdvLoading(true);
      try {
  // Advanced endpoint 'all' desteklemiyor; 'all' seçilirse monthly'e fallback
  const advRange = range === 'all' ? 'monthly' : range;
  const res = await getAdvancedAnalytics({ range: advRange as any, includeSessions: true });
        setAdvancedData(res.data);
      } catch (e) {
        console.error('Advanced analytics fetch error', e);
        setAdvancedData(null);
      } finally {
        setAdvLoading(false);
      }
    })();
  }, [range]);

  useEffect(() => {
    (async () => {
      try {
        const res = await getLeaderboardUserStats();
        setUserLeaderboard(res.data);
      } catch {}
    })();
  }, []);

  // Spark verileri hazırla (mini card için). Boşsa [] döner.
  // Replaced: we now derive series from study tracker statistics hook
  const dailyTimeSeries = totalTimeSeries;
  const dailySessionSeries = sessionCountSeries;

  return (
    <div>
      {/* Welcome Section */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, fontWeight: 500, fontSize: '24px' }}>
          Hoş geldin, {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email}! 👋
        </Title>
        <Text type="secondary">
          YKS yolculuğunda bugün nasıl ilerleme kaydedeceğiz?
        </Text>
      </div>

      {loading ? (
        <Card loading style={{ minHeight: '200px' }} />
      ) : !dashboardData ? (
        <Card style={{ minHeight: '120px' }}>
          <Text type="danger">Dashboard verileri alınamadı.</Text>
        </Card>
      ) : (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Mini Analytics Cards */}
          <div style={{ width:'100%', display:'flex', justifyContent:'flex-end', marginBottom:8 }}>
            <AnalyticsRangeCard value={range} onChange={setRange} />
          </div>
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col xs={12} md={6} style={{ marginBottom: 12 }}>
              <AnalyticsMiniCard
                title="Toplam Çalışma Süresi"
                subValue={studyStats ? formatMinutes(studyStats.totalTime) : '0d'}
                data={dailyTimeSeries}
              />
            </Col>
            <Col xs={12} md={6} style={{ marginBottom: 12 }}>
              <AnalyticsMiniCard
                title="Mevcut Seri"
                subValue={(studyStats?.streak || 0) + ' gün'}
                data={streakSeries}
                positive
              />
            </Col>
            <Col xs={12} md={6} style={{ marginBottom: 12 }}>
              <AnalyticsMiniCard
                title="Oturum Sayısı"
                subValue={studyStats?.sessionsCount || 0}
                data={dailySessionSeries}
              />
            </Col>
            <Col xs={12} md={6} style={{ marginBottom: 12 }}>
              <AnalyticsMiniCard
                title="Ortalama Kalite"
                subValue={(studyStats?.averageQuality || 0) + '/5'}
                data={qualitySeries}
                positive
              />
            </Col>
          </Row>
          
          {/* Üst bölüm: %80 ActiveGoals | %20 sağ kolon */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={19}>
              <ActiveGoals 
                goals={dashboardData?.goalsOverview || []}
                loading={loading}
              />
            </Col>
            <Col xs={24} lg={5}>
              <div style={{  display: 'flex', flexDirection: 'column' }}>
                <Space direction="vertical" size={5} style={{ width: '100%', flex: 1 }}>
                  {/* Leaderboard Card */}
                  <Card style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <Space direction="vertical" style={{ width: '100%' }} size={12}>
                        <Statistic
                          title="Mevcut Seri"
                          value={dashboardData?.overview.currentStreak || 0}
                          suffix="gün"
                          prefix={<FireOutlined style={{ color: '#ff4d4f' }} />}
                        />
                        <div>
                          <Statistic
                            title="Liderlik Puanın"
                            value={userLeaderboard?.totalScore || 0}
                            prefix={<ThunderboltOutlined style={{ color: '#722ed1' }} />}
                          />
                          {userLeaderboard && (
                            <Text type="secondary">#{userLeaderboard.rank} sırada</Text>
                          )}
                        </div>
                      </Space>
                    </div>
                  </Card>
                  
                  {/* Haftalık Hedef Card (profil tamamlanma yerine) */}
                  <Card style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <Text type="secondary">Haftalık Hedef</Text>

                      </div>
                      <Progress
                        percent={Math.round(studyStats?.weeklyProgress || 0)} 
                        strokeColor={{
                          '0%': '#ff4d4f',
                          '50%': '#faad14',
                          '100%': '#52c41a'
                        }}
                      />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {formatMinutes(studyStats?.totalTime || 0)} / {formatMinutes(studyStats?.weeklyGoal || 1200)}
                      </Text>
                    </div>
                  </Card>
                </Space>
              </div>
            </Col>
          </Row>
          {/* Eski Study Plan Analytics içeriği - lazy yüklü */}
          <React.Suspense fallback={<Card loading style={{ minHeight:180 }} />}> 
            {dashboardData && advancedData && (
              <Card style={{ marginTop: 32 }} title="Detaylı Analizler (Gerçek Veriler)">
                <AdvancedAnalytics
                  plan={(() => {
                    // Server aggregated veriyi StudyPlanLike şekline map et
                    const subjMap = advancedData.subjectStats;
                    const sessionsList = (advancedData.sessions || []).map(s => ({
                      ...s,
                      _id: s._id || s.id
                    }));
                    // sessions'i subject'e göre grupla
                    const grouped: Record<string, any[]> = {};
                    sessionsList.forEach((s: any) => {
                      const subj = s.subject || 'diger';
                      if (!grouped[subj]) grouped[subj] = [];
                      grouped[subj].push(s);
                    });
                    const subjects = subjMap.map(ss => {
                      const sessList = grouped[ss.subject] || [];
                      const correct = ss.correctAnswers || 0;
                      const wrong = ss.wrongAnswers || 0;
                      const blank = ss.blankAnswers || 0;
                      return {
                        subject: ss.subject,
                        targetQuestions: 0,
                        targetTime: ss.totalTime,
                        topics: [],
                        priority: 5,
                        completedQuestions: correct + wrong + blank,
                        correctAnswers: correct,
                        wrongAnswers: wrong,
                        blankAnswers: blank,
                        studyTime: ss.totalTime,
                        status: 'completed',
                        sessionIds: sessList
                      };
                    });
                    const totalStudyTime = advancedData.overall.totalStudyTime;
                    const { accuracyPercent } = advancedData.questionStatsSummary;
                    const totalCompletedQuestions = advancedData.questionStatsSummary.totalAttempted;
                    const successRate = Math.round(accuracyPercent);
                    return {
                      _id: 'adv-analytics-plan',
                      date: advancedData.from,
                      title: 'Gelişmiş Analiz Dönemi',
                      subjects,
                      stats: {
                        totalTargetQuestions: 0,
                        totalCompletedQuestions,
                        totalTargetTime: 0,
                        totalStudyTime,
                        completionRate: 0,
                        netScore: 0, // advanced endpoint henüz netScore döndürmüyor
                        successRate
                      }
                    } as any;
                  })()}
                  selectedDate={dayjs() as any}
                  onRefresh={() => { fetchDashboardData(); }}
                />
              </Card>
            )}
            {dashboardData && !advancedData && (
              <Card style={{ marginTop: 32 }} loading={advLoading} title="Detaylı Analizler">
                {!advLoading && <span>Veri alınamadı.</span>}
              </Card>
            )}
          </React.Suspense>
        </Space>
      )}
    </div>
  );
};

export default Dashboard;
