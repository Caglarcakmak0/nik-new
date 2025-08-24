import React, { useState, useEffect } from 'react';
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
import { StudyStatistics } from '../StudyTrackerPage/bones';
import { AnalyticsMiniCard, AnalyticsRangeCard } from '../../components/feature/analytics';
import type { AnalyticsRange } from '../../components/feature/analytics/AnalyticsRangeCard';


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
  const dailyTimeSeries = dashboardData ? Object.values((dashboardData as any).dailyDistribution || {}).map((d: any) => d.totalTime) : [];
  const dailySessionSeries = dashboardData ? Object.values((dashboardData as any).dailyDistribution || {}).map((d: any) => d.sessionCount) : [];

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
            <Col xs={12} md={5} style={{ marginBottom: 12, marginRight: 12 }}>
              <AnalyticsMiniCard
                title="Toplam Çalışma Süresi"
                subValue={(dashboardData.overview.totalStudyTime || 0) + ' dk'}
                data={dailyTimeSeries}
                color="#1890ff"
              />
            </Col>
            <Col xs={12} md={5} style={{ marginBottom: 12, marginRight: 12 }}>
              <AnalyticsMiniCard
                title="Mevcut Seri"
                subValue={dashboardData.overview.currentStreak + ' gün'}
                data={dailySessionSeries}
                color="#fa8c16"
                positive
              />
            </Col>
            <Col xs={12} md={5} style={{ marginBottom: 12, marginRight: 12 }}>
              <AnalyticsMiniCard
                title="Aktif Hedefler"
                subValue={dashboardData.overview.activeGoals}
                data={dailySessionSeries}
                color="#722ed1"
              />
            </Col>
            <Col xs={12} md={5} style={{ marginBottom: 12, marginRight: 12 }}>
              <AnalyticsMiniCard
                title="Profil Tamamlanma"
                subValue={'%' + (dashboardData.overview.profileCompleteness || 0)}
                data={dailyTimeSeries}
                color="#52c41a"
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
                  
                  {/* Profil Tamamlama Card */}
                  <Card style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <Text type="secondary">Profil Tamamlanma</Text>
                      <br />
                      <Progress 
                        percent={dashboardData?.overview.profileCompleteness || 0}
                        size="small"
                        status={
                          (dashboardData?.overview.profileCompleteness || 0) < 50 ? 'exception' : 'normal'
                        }
                      />
                    </div>
                  </Card>
                </Space>
              </div>
            </Col>
          </Row>
          {/* Study Tracker İstatistikler Sekmesi */}
          <StudyStatistics />
        </Space>
      )}
    </div>
  );
};

export default Dashboard;