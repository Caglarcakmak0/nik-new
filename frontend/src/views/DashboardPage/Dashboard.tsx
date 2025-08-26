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
import { apiRequest, getLeaderboardUserStats } from '../../services/api';
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
  // Map dashboard analytics range to study stats period
  const studyPeriodMap: Record<AnalyticsRange, 'today' | 'week' | 'month' | 'all'> = {
    daily: 'today',
    weekly: 'week',
    monthly: 'month',
    all: 'all'
  };
  const { stats: studyStats, totalTimeSeries, sessionCountSeries, qualitySeries, streakSeries } = useStudyStats(studyPeriodMap[range]);
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
            {dashboardData && (
              <Card style={{ marginTop: 32 }} title="Detaylı Analizler">
                <AdvancedAnalytics 
                  plan={{
                    _id: 'dash-proxy',
                    date: new Date().toISOString(),
                    title: 'Dashboard Analytics',
                    subjects: [
                      {
                        subject: 'Matematik',
                        targetQuestions: 40,
                        targetTime: 120,
                        topics: ['Denklemler', 'Fonksiyonlar'],
                        priority: 1,
                        completedQuestions: 38,
                        correctAnswers: 32,
                        wrongAnswers: 4,
                        blankAnswers: 2,
                        studyTime: 110,
                        status: 'completed',
                        sessionIds: [
                          {
                            _id: 'mat-1',
                            subject: 'Matematik',
                            duration: 55,
                            date: dayjs().subtract(1,'day').toDate(),
                            quality: 4.2,
                            technique: 'Soru Çözümü',
                            mood: 'focused',
                            efficiency: 1.9,
                            distractions: 1,
                            questionStats: {
                              targetQuestions: 20,
                              correctAnswers: 17,
                              wrongAnswers: 2,
                              blankAnswers: 1,
                              netScore: 16,
                              completionRate: 95
                            }
                          },
                          {
                            _id: 'mat-2',
                            subject: 'Matematik',
                            duration: 55,
                            date: dayjs().subtract(3,'day').toDate(),
                            quality: 3.8,
                            technique: 'Konu Tekrarı',
                            mood: 'normal',
                            efficiency: 1.6,
                            distractions: 2,
                            questionStats: {
                              targetQuestions: 20,
                              correctAnswers: 15,
                              wrongAnswers: 3,
                              blankAnswers: 2,
                              netScore: 13.5,
                              completionRate: 90
                            }
                          }
                        ]
                      },
                      {
                        subject: 'Fizik',
                        targetQuestions: 20,
                        targetTime: 60,
                        topics: ['Kuvvet', 'Enerji'],
                        priority: 2,
                        completedQuestions: 18,
                        correctAnswers: 12,
                        wrongAnswers: 5,
                        blankAnswers: 1,
                        studyTime: 55,
                        status: 'completed',
                        sessionIds: [
                          {
                            _id: 'fiz-1',
                            subject: 'Fizik',
                            duration: 30,
                            date: dayjs().subtract(2,'day').toDate(),
                            quality: 4.5,
                            technique: 'Video',
                            mood: 'focused',
                            efficiency: 1.2,
                            distractions: 0,
                            questionStats: {
                              targetQuestions: 10,
                              correctAnswers: 7,
                              wrongAnswers: 2,
                              blankAnswers: 1,
                              netScore: 6.5,
                              completionRate: 90
                            }
                          },
                          {
                            _id: 'fiz-2',
                            subject: 'Fizik',
                            duration: 25,
                            date: dayjs().subtract(4,'day').toDate(),
                            quality: 3.9,
                            technique: 'Soru Çözümü',
                            mood: 'normal',
                            efficiency: 1.1,
                            distractions: 1,
                            questionStats: {
                              targetQuestions: 10,
                              correctAnswers: 5,
                              wrongAnswers: 4,
                              blankAnswers: 1,
                              netScore: 3.5,
                              completionRate: 80
                            }
                          }
                        ]
                      },
                      {
                        subject: 'Kimya',
                        targetQuestions: 15,
                        targetTime: 45,
                        topics: ['Atom', 'Molekül'],
                        priority: 3,
                        completedQuestions: 14,
                        correctAnswers: 10,
                        wrongAnswers: 3,
                        blankAnswers: 1,
                        studyTime: 40,
                        status: 'completed',
                        sessionIds: [
                          {
                            _id: 'kim-1',
                            subject: 'Kimya',
                            duration: 20,
                            date: dayjs().subtract(1,'day').toDate(),
                            quality: 4.0,
                            technique: 'Konu Tekrarı',
                            mood: 'good',
                            efficiency: 1.3,
                            distractions: 0,
                            questionStats: {
                              targetQuestions: 8,
                              correctAnswers: 6,
                              wrongAnswers: 1,
                              blankAnswers: 1,
                              netScore: 5.5,
                              completionRate: 87
                            }
                          },
                          {
                            _id: 'kim-2',
                            subject: 'Kimya',
                            duration: 20,
                            date: dayjs().subtract(5,'day').toDate(),
                            quality: 3.7,
                            technique: 'Soru Çözümü',
                            mood: 'normal',
                            efficiency: 1.1,
                            distractions: 1,
                            questionStats: {
                              targetQuestions: 7,
                              correctAnswers: 4,
                              wrongAnswers: 2,
                              blankAnswers: 1,
                              netScore: 3,
                              completionRate: 85
                            }
                          }
                        ]
                      }
                    ],
                    stats: {
                      totalTargetQuestions: 75,
                      totalCompletedQuestions: 70,
                      totalTargetTime: 225,
                      totalStudyTime: 205,
                      completionRate: 93,
                      netScore: 42.5,
                      successRate: 75
                    }
                  } as any}
                  selectedDate={dayjs() as any}
                  onRefresh={() => { /* dashboard refresh */ fetchDashboardData(); }}
                />
              </Card>
            )}
          </React.Suspense>
        </Space>
      )}
    </div>
  );
};

export default Dashboard;
