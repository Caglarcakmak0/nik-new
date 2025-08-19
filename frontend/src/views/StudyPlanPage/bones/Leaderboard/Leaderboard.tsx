
import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Space,
  Avatar,
  Badge,
  Statistic,
  Row,
  Col,
  Progress,
  Tag,
  Tabs,
  Button,
  Tooltip,
  List
} from 'antd';
import {
  TrophyOutlined,
  CrownOutlined,
  FireOutlined,
  ThunderboltOutlined,
  StarOutlined,
  RiseOutlined,
  CalendarOutlined,
  TeamOutlined,
  GiftOutlined,
  CheckOutlined
} from '@ant-design/icons';
import { useAuth } from '../../../../contexts/AuthContext';
import { apiRequest } from '../../../../services/api';
import './Leaderboard.scss';

const { Title, Text } = Typography;

interface UserStats {
  _id: string;
  name: string;
  avatar?: string;
  totalScore: number;
  totalQuestions: number;
  totalStudyTime: number;
  streak: number;
  level: number;
  experience: number;
  achievements: Achievement[];
  weeklyScore: number;
  monthlyScore: number;
  rank: number;
  weeklyRank: number;
  monthlyRank: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt: string;
  points: number;
}

interface Competition {
  id: string;
  title: string;
  description: string;
  type: 'weekly' | 'monthly' | 'special';
  startDate: string;
  endDate: string;
  participants: number;
  prize: string;
  isActive: boolean;
}

type DuelPeriod = 'daily' | 'weekly';

type LeaderboardProps = {
  enableDuelActions?: boolean;
  onInviteDuel?: (userId: string, period: DuelPeriod) => void | Promise<void>;
  duelPeriodResolver?: (activeTab: 'overall' | 'weekly' | 'monthly') => DuelPeriod | null;
};

const Leaderboard: React.FC<LeaderboardProps> = ({
  enableDuelActions = false,
  onInviteDuel,
  duelPeriodResolver,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<UserStats[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overall');
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [inviteStateByUserId, setInviteStateByUserId] = useState<Record<string, 'idle' | 'loading' | 'success'>>({});

  // Leaderboard verilerini getir
  const fetchLeaderboardData = async (period = 'overall') => {
    try {
      setLoading(true);
      
      const [leaderboardRes, userStatsRes, competitionsRes] = await Promise.all([
        apiRequest(`/leaderboard/${period}`),
        apiRequest('/users/me/stats'),
        apiRequest('/competitions/active')
      ]);

      setLeaderboardData(leaderboardRes.data || []);
      setUserStats(userStatsRes.data);
      setCompetitions(competitionsRes.data || []);
    } catch (error: any) {
      console.error('Leaderboard fetch error:', error);
      
      // Kullanıcıya hata mesajı göster (console'da spam yapmamak için sadece önemli hatalarda)
      if (!error.message?.includes('API request failed')) {
        // Network veya kritik hatalar için kullanıcıya bilgi ver
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboardData(activeTab);
  }, [activeTab]);

  const handleInvite = async (targetUserId: string) => {
    if (!enableDuelActions || !onInviteDuel) return;
    const duelPeriod = duelPeriodResolver ? duelPeriodResolver(activeTab as any) : null;
    if (!duelPeriod) return;
    setInviteStateByUserId((s) => ({ ...s, [targetUserId]: 'loading' }));
    try {
      await onInviteDuel(targetUserId, duelPeriod);
      setInviteStateByUserId((s) => ({ ...s, [targetUserId]: 'success' }));
      setTimeout(() => {
        setInviteStateByUserId((s) => ({ ...s, [targetUserId]: 'idle' }));
      }, 1800);
    } catch {
      setInviteStateByUserId((s) => ({ ...s, [targetUserId]: 'idle' }));
    }
  };

  // Level hesaplama
  const calculateLevelProgress = (experience: number, level: number) => {
    const baseXP = 1000;
    const currentLevelXP = baseXP * Math.pow(1.5, level - 1);
    const nextLevelXP = baseXP * Math.pow(1.5, level);
    const progressXP = experience - currentLevelXP;
    const neededXP = nextLevelXP - currentLevelXP;
    
    return {
      progress: Math.min((progressXP / neededXP) * 100, 100),
      current: Math.max(progressXP, 0),
      needed: neededXP
    };
  };

  // Rozet renk belirleme
  const getAchievementColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return '#52c41a';
      case 'rare': return '#1890ff';
      case 'epic': return '#722ed1';
      case 'legendary': return '#fa8c16';
      default: return '#d9d9d9';
    }
  };

  // Rank badge rengi
  const getRankBadgeProps = (rank: number) => {
    if (rank === 1) return { color: 'gold', icon: <CrownOutlined /> };
    if (rank === 2) return { color: '#c0c0c0', icon: <TrophyOutlined /> };
    if (rank === 3) return { color: '#cd7f32', icon: <TrophyOutlined /> };
    if (rank <= 10) return { color: 'blue', icon: <StarOutlined /> };
    return { color: 'default', icon: null };
  };

  const renderLeaderboardItem = (userData: UserStats, _index: number) => {
    const rankProps = getRankBadgeProps(userData.rank);
    const isCurrentUser = userData._id === user?._id;
    const duelPeriod = duelPeriodResolver ? duelPeriodResolver(activeTab as any) : null;
    const inviteState = inviteStateByUserId[userData._id] || 'idle';
    
    return (
      <List.Item
        key={userData._id}
        className={`leaderboard-item ${isCurrentUser ? 'current-user' : ''}`}
        actions={[
          <Space>
            <Statistic 
              title="Puan" 
              value={activeTab === 'weekly' ? userData.weeklyScore : 
                     activeTab === 'monthly' ? userData.monthlyScore : userData.totalScore}
              suffix={<ThunderboltOutlined />}
            />
          </Space>
          ,
          enableDuelActions && duelPeriod && !isCurrentUser && (
                        <Button
              size="small" 
              type="primary"
              className={`duel-invite-btn ${inviteState === 'success' ? 'success' : ''}`}
              loading={inviteState === 'loading'}
              onClick={() => handleInvite(userData._id)}
            >
              {inviteState === 'success' ? (
                <CheckOutlined />
              ) : (
                'Düelloya Davet Et'
              )}
            </Button>
          )
        ]}
      >
        <List.Item.Meta
          avatar={
            <Badge 
              count={userData.rank} 
              style={{ backgroundColor: rankProps.color }}
              offset={[-5, 5]}
            >
              <Avatar 
                size={48} 
                src={userData.avatar}
                style={{ backgroundColor: '#1890ff' }}
              >
                {userData.name.charAt(0).toUpperCase()}
              </Avatar>
            </Badge>
          }
          title={
            <Space>
              {userData.name}
              {rankProps.icon}
              {userData.streak > 0 && (
                <Tag color="volcano" icon={<FireOutlined />}>
                  {userData.streak} gün
                </Tag>
              )}
              <Tag color="purple">Seviye {userData.level}</Tag>
            </Space>
          }
          description={
            <Space direction="vertical" size={4}>
              <Text type="secondary">
                {userData.totalQuestions.toLocaleString()} soru • {Math.round(userData.totalStudyTime / 60)} saat
              </Text>
              <Space size={2}>
                {userData.achievements.slice(0, 3).map((achievement) => (
                  <Tooltip key={achievement.id} title={`${achievement.title} - ${achievement.description}`}>
                    <Tag 
                      color={getAchievementColor(achievement.rarity)}
                      style={{ margin: 0, fontSize: '10px', padding: '0 4px' }}
                    >
                      {achievement.title}
                    </Tag>
                  </Tooltip>
                ))}
                {userData.achievements.length > 3 && (
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    +{userData.achievements.length - 3} rozet
                  </Text>
                )}
              </Space>
            </Space>
          }
        />
      </List.Item>
    );
  };

  return (
    <div className="leaderboard-page">
      {/* User Stats Card */}
      {userStats && (
        <Card className="user-stats-card" style={{ marginBottom: 24 }}>
          <Row gutter={24} align="middle">
            <Col span={6}>
              <div className="user-profile">
                <Badge 
                  count={userStats.rank} 
                  style={{ backgroundColor: getRankBadgeProps(userStats.rank).color }}
                >
                  <Avatar size={72} src={userStats.avatar} style={{ backgroundColor: '#1890ff' }}>
                      {(user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email || 'U').charAt(0).toUpperCase()}
                  </Avatar>
                </Badge>
                <div style={{ marginTop: 12, textAlign: 'center' }}>
                  <Title level={4} style={{ margin: 0 }}>
                    {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : (user?.email || 'Kullanıcı')}
                  </Title>
                  <Space>
                    <Tag color="purple">Seviye {userStats.level}</Tag>
                    {userStats.streak > 0 && (
                      <Tag color="volcano" icon={<FireOutlined />}>
                        {userStats.streak} gün
                      </Tag>
                    )}
                  </Space>
                </div>
              </div>
            </Col>
            
            <Col span={18}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="Toplam Puan"
                    value={userStats.totalScore}
                    prefix={<ThunderboltOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                  <Text type="secondary">#{userStats.rank} sırada</Text>
                </Col>
                
                <Col span={8}>
                  <div>
                    <Text strong>Seviye İlerlemesi</Text>
                    <Progress
                      percent={calculateLevelProgress(userStats.experience, userStats.level).progress}
                      size="small"
                      strokeColor="#722ed1"
                      style={{ marginTop: 4 }}
                    />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {calculateLevelProgress(userStats.experience, userStats.level).current} / {calculateLevelProgress(userStats.experience, userStats.level).needed} XP
                    </Text>
                  </div>
                </Col>
                
                <Col span={8}>
                  <Statistic
                    title="Rozetler"
                    value={userStats.achievements.length}
                    prefix={<GiftOutlined />}
                    valueStyle={{ color: '#fa8c16' }}
                  />
                  <Space size={2} wrap style={{ marginTop: 4 }}>
                    {userStats.achievements.slice(0, 4).map((achievement) => (
                      <Tooltip key={achievement.id} title={`${achievement.title} - ${achievement.description}`}>
                        <Tag 
                          color={getAchievementColor(achievement.rarity)}
                          style={{ margin: 0, fontSize: '10px', padding: '0 4px' }}
                        >
                          {achievement.title}
                        </Tag>
                      </Tooltip>
                    ))}
                  </Space>
                </Col>
              </Row>
            </Col>
          </Row>
        </Card>
      )}

      {/* Active Competitions */}
      {competitions.length > 0 && (
        <Card title={
          <Space>
            <CalendarOutlined />
            <span>Aktif Yarışmalar</span>
          </Space>
        } style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            {competitions.map((competition) => (
              <Col span={8} key={competition.id}>
                <Card size="small" className="competition-card">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <Title level={5} style={{ margin: 0 }}>{competition.title}</Title>
                      <Text type="secondary">{competition.description}</Text>
                    </div>
                    <div>
                      <Space>
                        <TeamOutlined />
                        <Text>{competition.participants} katılımcı</Text>
                      </Space>
                    </div>
                    <Tag color="gold">{competition.prize}</Tag>
                    <Button type="primary" size="small" block>
                      Katıl
                    </Button>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Leaderboard */}
      <Card 
        title={
          <Space>
            <TrophyOutlined />
            <span>Liderlik Tablosu</span>
          </Space>
        }
        extra={
          <Button 
            icon={<RiseOutlined />} 
            onClick={() => fetchLeaderboardData(activeTab)}
            loading={loading}
          >
            Yenile
          </Button>
        }
      >
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'overall',
              label: (
                <span>
                  <TrophyOutlined />
                  Genel
                </span>
              ),
              children: (
                <List
                  loading={loading}
                  dataSource={leaderboardData}
                  renderItem={renderLeaderboardItem}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: false,
                    showTotal: (total) => `Toplam ${total} kullanıcı`
                  }}
                />
              )
            },
            {
              key: 'weekly',
              label: (
                <span>
                  <CalendarOutlined />
                  Haftalık
                </span>
              ),
              children: (
                <List
                  loading={loading}
                  dataSource={leaderboardData}
                  renderItem={renderLeaderboardItem}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: false
                  }}
                />
              )
            },
            {
              key: 'monthly',
              label: (
                <span>
                  <CalendarOutlined />
                  Aylık
                </span>
              ),
              children: (
                <List
                  loading={loading}
                  dataSource={leaderboardData}
                  renderItem={renderLeaderboardItem}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: false
                  }}
                />
              )
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default Leaderboard;