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
import dayjs from 'dayjs';


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
  const [computedStreak, setComputedStreak] = useState<number | null>(null);

  // Dashboard verilerini al
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/analytics/dashboard');
      if (response.data) {
        setDashboardData(response.data);
      }
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      // Hata durumunda boş data ile devam et
      setDashboardData({
        overview: {
          totalStudyTime: 0,
          currentStreak: 0,
          activeGoals: 0,
          profileCompleteness: user?.profileCompleteness || 0
        },
        weeklyTrend: {
          totalTime: 0,
          sessionCount: 0,
          averageQuality: 0,
          averageEfficiency: 0
        },
        goalsOverview: [],
        recentActivity: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Liderlik kullanıcı istatistikleri
    (async () => {
      try {
        const res = await getLeaderboardUserStats();
        setUserLeaderboard(res.data);
      } catch (err) {
        // Sessizce geç; dashboard minimum verilerle yüklenebilir
      }
    })();
    // Study Tracker ile aynı sistem: /study-sessions üzerinden hesapla
    (async () => {
      try {
        const sessions: Array<{ date: string | Date; duration: number; quality: number; efficiency: number }> = await apiRequest('/study-sessions');
        // Streak hesapla (Study Tracker mantığı)
        const uniqueDates = Array.from(new Set(sessions.map(s => dayjs(s.date).format('YYYY-MM-DD')))).sort().reverse();
        let streak = 0;
        const today = dayjs().format('YYYY-MM-DD');
        const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
        if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
          streak = 1;
          for (let i = 1; i < uniqueDates.length; i++) {
            const prev = dayjs(uniqueDates[i - 1]);
            const curr = dayjs(uniqueDates[i]);
            if (prev.diff(curr, 'day') === 1) streak++;
            else break;
          }
        }
        setComputedStreak(streak);
      } catch (e) {
        setComputedStreak(0);
      }
    })();
  }, []);

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
        <Card loading={true} style={{ minHeight: '200px' }}>
          <div>Dashboard verileri yükleniyor...</div>
        </Card>
      ) : (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          
          {/* Üst bölüm: %80 ActiveGoals | %20 sağ kolon */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={19}>
              <ActiveGoals 
                goals={dashboardData?.goalsOverview || []}
                loading={loading}
              />
            </Col>
            <Col xs={24} lg={5}>
              <div style={{  display: 'flex', flexDirection: 'column', paddingTop: '22px' }}>
                <Space direction="vertical" size={5} style={{ width: '100%', flex: 1 }}>
                  {/* Leaderboard Card */}
                  <Card style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <Space direction="vertical" style={{ width: '100%' }} size={12}>
                        <Statistic
                          title="Mevcut Seri"
                          value={computedStreak ?? 0}
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