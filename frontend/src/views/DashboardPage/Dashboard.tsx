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
  ClockCircleOutlined,
  FireOutlined,
  TrophyOutlined,
  LineChartOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { apiRequest } from '../../services/api';
import { ActiveGoals } from './bones';


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
  }, []);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}s ${mins}d` : `${mins}d`;
  };


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
          
          {/* Aktif Hedefler - Okul Kartları */}
          <ActiveGoals 
            goals={dashboardData?.goalsOverview || []}
            loading={loading}
          />
          {/* Ana İstatistik Kartları */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Toplam Çalışma"
                  value={dashboardData?.overview.totalStudyTime || 0}
                  formatter={value => formatTime(Number(value))}
                  prefix={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Mevcut Seri"
                  value={dashboardData?.overview.currentStreak || 0}
                  suffix="gün"
                  prefix={<FireOutlined style={{ color: '#ff4d4f' }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Aktif Hedefler"
                  value={dashboardData?.overview.activeGoals || 0}
                  prefix={<TrophyOutlined style={{ color: '#faad14' }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <div>
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
            </Col>
          </Row>


          {/* Haftalık Trend */}
          {dashboardData?.weeklyTrend && (
            <Card title="Bu Hafta" extra={<LineChartOutlined />}>
              <Row gutter={16}>
                <Col xs={12} md={6}>
                  <Statistic
                    title="Çalışma Süresi"
                    value={formatTime(dashboardData.weeklyTrend.totalTime)}
                    valueStyle={{ fontSize: '16px' }}
                  />
                </Col>
                <Col xs={12} md={6}>
                  <Statistic
                    title="Oturum Sayısı"
                    value={dashboardData.weeklyTrend.sessionCount}
                    valueStyle={{ fontSize: '16px' }}
                  />
                </Col>
                <Col xs={12} md={6}>
                  <Statistic
                    title="Ortalama Kalite"
                    value={dashboardData.weeklyTrend.averageQuality.toFixed(1)}
                    suffix="/5"
                    valueStyle={{ fontSize: '16px' }}
                  />
                </Col>
                <Col xs={12} md={6}>
                  <Statistic
                    title="Verimlilik"
                    value={Math.round(dashboardData.weeklyTrend.averageEfficiency)}
                    suffix="%"
                    valueStyle={{ fontSize: '16px' }}
                  />
                </Col>
              </Row>
            </Card>
          )}
        </Space>
      )}
    </div>
  );
};

export default Dashboard;