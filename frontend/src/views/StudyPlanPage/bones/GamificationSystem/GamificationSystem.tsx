import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Space,
  Progress,
  Row,
  Col,
  Badge,
  Statistic,
  Avatar,
  Tag,
  Tooltip,
  Button,
  Modal,
  List,
  Timeline,
  Divider
} from 'antd';
import {
  TrophyOutlined,
  StarOutlined,
  FireOutlined,
  ThunderboltOutlined,
  CrownOutlined,
  GiftOutlined,
  RiseOutlined,
  AimOutlined,
  ClockCircleOutlined,
  BookOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useAuth } from '../../../../contexts/AuthContext';
import { apiRequest } from '../../../../services/api';
import dayjs from 'dayjs';
import './GamificationSystem.scss';

const { Title, Text } = Typography;

interface UserLevel {
  level: number;
  title: string;
  minXP: number;
  maxXP: number;
  perks: string[];
  color: string;
  icon: React.ReactNode;
}

interface XPSource {
  action: string;
  points: number;
  description: string;
  category: 'study' | 'achievement' | 'streak' | 'bonus';
  multiplier?: number;
}

interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  xpReward: number;
  isCompleted: boolean;
  category: string;
  deadline: string;
}

interface UserStats {
  totalXP: number;
  currentLevel: number;
  nextLevelXP: number;
  currentLevelXP: number;
  streak: number;
  maxStreak: number;
  totalAchievements: number;
  weeklyXP: number;
  monthlyXP: number;
  dailyChallenges: DailyChallenge[];
}

const levels: UserLevel[] = [
  { level: 1, title: 'Yeni Başlayan', minXP: 0, maxXP: 1000, perks: ['Temel özellikler'], color: '#d9d9d9', icon: <BookOutlined /> },
  { level: 2, title: 'Öğrenci', minXP: 1000, maxXP: 2500, perks: ['İstatistikler', 'Günlük hedefler'], color: '#52c41a', icon: <TargetOutlined /> },
  { level: 3, title: 'Çalışkan', minXP: 2500, maxXP: 5000, perks: ['AI önerileri', 'İleri analitik'], color: '#1890ff', icon: <RiseOutlined /> },
  { level: 4, title: 'Azimli', minXP: 5000, maxXP: 10000, perks: ['Özel rozetler', 'Liderlik tablosu'], color: '#722ed1', icon: <FireOutlined /> },
  { level: 5, title: 'Uzman', minXP: 10000, maxXP: 20000, perks: ['Mentor modu', 'Özel yarışmalar'], color: '#fa541c', icon: <CrownOutlined /> },
  { level: 6, title: 'Usta', minXP: 20000, maxXP: 40000, perks: ['Elite rozetler', 'Özel içerikler'], color: '#faad14', icon: <StarOutlined /> },
  { level: 7, title: 'Efsane', minXP: 40000, maxXP: Infinity, perks: ['Tüm özellikler', 'Efsanevi statü'], color: '#fa8c16', icon: <TrophyOutlined /> }
];

const xpSources: XPSource[] = [
  { action: 'question_correct', points: 5, description: 'Doğru cevap', category: 'study' },
  { action: 'study_session', points: 20, description: '25 dakika çalışma', category: 'study' },
  { action: 'daily_goal', points: 50, description: 'Günlük hedefi tamamlama', category: 'study' },
  { action: 'streak_day', points: 10, description: 'Günlük seri (günlük)', category: 'streak', multiplier: 2 },
  { action: 'achievement_unlock', points: 100, description: 'Rozet kazanma', category: 'achievement' },
  { action: 'perfect_day', points: 200, description: 'Mükemmel gün (100% hedef)', category: 'bonus' },
  { action: 'weekly_challenge', points: 150, description: 'Haftalık meydan okuma', category: 'bonus' }
];

const GamificationSystem: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [levelModalVisible, setLevelModalVisible] = useState(false);
  const [xpHistoryVisible, setXpHistoryVisible] = useState(false);
  const [xpHistory, setXpHistory] = useState<any[]>([]);

  // Kullanıcı istatistiklerini getir
  const fetchUserStats = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/gamification/user-stats');
      setUserStats(response.data);
    } catch (error) {
      console.error('User stats fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  // XP geçmişini getir
  const fetchXPHistory = async () => {
    try {
      const response = await apiRequest('/gamification/xp-history');
      setXpHistory(response.data || []);
      setXpHistoryVisible(true);
    } catch (error) {
      console.error('XP history fetch error:', error);
    }
  };

  useEffect(() => {
    fetchUserStats();
  }, []);

  if (!userStats) {
    return <div>Loading...</div>;
  }

  const currentLevel = levels.find(l => l.level === userStats.currentLevel) || levels[0];
  const nextLevel = levels.find(l => l.level === userStats.currentLevel + 1);
  
  // Progress hesaplama
  const levelProgress = nextLevel ? 
    ((userStats.totalXP - currentLevel.minXP) / (nextLevel.minXP - currentLevel.minXP)) * 100 : 100;

  // Günlük zorlukları tamamlama oranı
  const challengeCompletionRate = userStats.dailyChallenges.length > 0 ?
    (userStats.dailyChallenges.filter(c => c.isCompleted).length / userStats.dailyChallenges.length) * 100 : 0;

  return (
    <div className="gamification-system">
      {/* Level Card */}
      <Card className="level-card" style={{ marginBottom: 24 }}>
        <Row align="middle" gutter={24}>
          <Col span={8}>
            <div className="level-display">
              <Badge 
                count={currentLevel.level} 
                style={{ backgroundColor: currentLevel.color }}
                offset={[-10, 10]}
              >
                <div className="level-avatar" style={{ backgroundColor: currentLevel.color }}>
                  {currentLevel.icon}
                </div>
              </Badge>
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <Title level={4} style={{ margin: 0, color: 'white' }}>
                  {currentLevel.title}
                </Title>
                <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Seviye {currentLevel.level}
                </Text>
              </div>
            </div>
          </Col>
          
          <Col span={16}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="Toplam XP"
                    value={userStats.totalXP.toLocaleString()}
                    prefix={<ThunderboltOutlined />}
                    valueStyle={{ color: 'white' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Seri"
                    value={userStats.streak}
                    prefix={<FireOutlined />}
                    suffix="gün"
                    valueStyle={{ color: 'white' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Rozetler"
                    value={userStats.totalAchievements}
                    prefix={<GiftOutlined />}
                    valueStyle={{ color: 'white' }}
                  />
                </Col>
              </Row>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Seviye İlerlemesi
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {nextLevel ? `${Math.round(levelProgress)}%` : 'Max Level'}
                  </Text>
                </div>
                <Progress
                  percent={Math.min(levelProgress, 100)}
                  strokeColor="#faad14"
                  trailColor="rgba(255,255,255,0.2)"
                />
                {nextLevel && (
                  <Text style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                    {nextLevel.minXP - userStats.totalXP} XP daha → {nextLevel.title}
                  </Text>
                )}
              </div>
            </Space>
          </Col>
        </Row>

        <Divider style={{ borderColor: 'rgba(255,255,255,0.2)' }} />

        <Row justify="center">
          <Col>
            <Space size="large">
              <Button 
                ghost 
                icon={<InfoCircleOutlined />}
                onClick={() => setLevelModalVisible(true)}
              >
                Seviye Detayları
              </Button>
              <Button 
                ghost 
                icon={<ClockCircleOutlined />}
                onClick={fetchXPHistory}
              >
                XP Geçmişi
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Daily Challenges */}
      <Card
        title={
          <Space>
            <TargetOutlined />
            <span>Günlük Meydan Okumalar</span>
            <Tag color="blue">{Math.round(challengeCompletionRate)}% tamamlandı</Tag>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        <Row gutter={[16, 16]}>
          {userStats.dailyChallenges.map((challenge) => (
            <Col xs={24} sm={12} lg={8} key={challenge.id}>
              <Card
                size="small"
                className={`challenge-card ${challenge.isCompleted ? 'completed' : ''}`}
                actions={[
                  <Space>
                    <ThunderboltOutlined />
                    <Text strong>{challenge.xpReward} XP</Text>
                  </Space>
                ]}
              >
                <Card.Meta
                  title={
                    <Space>
                      <Text strong>{challenge.title}</Text>
                      {challenge.isCompleted && (
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      )}
                    </Space>
                  }
                  description={
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text type="secondary">{challenge.description}</Text>
                      <Progress
                        percent={(challenge.current / challenge.target) * 100}
                        size="small"
                        strokeColor={challenge.isCompleted ? '#52c41a' : '#1890ff'}
                      />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {challenge.current} / {challenge.target}
                      </Text>
                    </Space>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* XP Sources */}
      <Card
        title={
          <Space>
            <StarOutlined />
            <span>XP Kazanma Yolları</span>
          </Space>
        }
      >
        <Row gutter={[16, 16]}>
          {xpSources.map((source, index) => (
            <Col xs={24} sm={12} lg={8} key={index}>
              <Card
                size="small"
                className="xp-source-card"
                hoverable
              >
                <Card.Meta
                  title={
                    <Space>
                      <Text>{source.description}</Text>
                      <Tag color="gold">+{source.points} XP</Tag>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={4}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Kategori: {source.category === 'study' ? 'Çalışma' :
                                  source.category === 'achievement' ? 'Başarı' :
                                  source.category === 'streak' ? 'Seri' : 'Bonus'}
                      </Text>
                      {source.multiplier && (
                        <Tag size="small" color="orange">
                          {source.multiplier}x çarpan
                        </Tag>
                      )}
                    </Space>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Level Details Modal */}
      <Modal
        title="Seviye Sistemi"
        visible={levelModalVisible}
        onCancel={() => setLevelModalVisible(false)}
        footer={null}
        width={700}
      >
        <div className="level-details">
          <List
            dataSource={levels}
            renderItem={(level) => (
              <List.Item className={level.level === userStats.currentLevel ? 'current-level' : ''}>
                <List.Item.Meta
                  avatar={
                    <Badge 
                      count={level.level} 
                      style={{ backgroundColor: level.color }}
                    >
                      <div 
                        className="level-icon"
                        style={{ backgroundColor: level.color }}
                      >
                        {level.icon}
                      </div>
                    </Badge>
                  }
                  title={
                    <Space>
                      <Text strong>{level.title}</Text>
                      {level.level === userStats.currentLevel && (
                        <Tag color="blue">Mevcut Seviye</Tag>
                      )}
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={8}>
                      <Text type="secondary">
                        {level.minXP.toLocaleString()} - {level.maxXP === Infinity ? '∞' : level.maxXP.toLocaleString()} XP
                      </Text>
                      <div>
                        <Text strong>Avantajlar:</Text>
                        <ul style={{ margin: '4px 0 0 20px' }}>
                          {level.perks.map((perk, index) => (
                            <li key={index}>{perk}</li>
                          ))}
                        </ul>
                      </div>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </div>
      </Modal>

      {/* XP History Modal */}
      <Modal
        title="XP Geçmişi"
        visible={xpHistoryVisible}
        onCancel={() => setXpHistoryVisible(false)}
        footer={null}
        width={600}
      >
        <Timeline mode="left">
          {xpHistory.map((entry, index) => (
            <Timeline.Item
              key={index}
              color={entry.xp > 0 ? 'green' : 'red'}
              label={dayjs(entry.date).format('HH:mm')}
            >
              <Space direction="vertical" size={4}>
                <Space>
                  <Text strong>{entry.action}</Text>
                  <Tag color={entry.xp > 0 ? 'green' : 'red'}>
                    {entry.xp > 0 ? '+' : ''}{entry.xp} XP
                  </Tag>
                </Space>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {entry.description}
                </Text>
              </Space>
            </Timeline.Item>
          ))}
        </Timeline>
      </Modal>
    </div>
  );
};

export default GamificationSystem;