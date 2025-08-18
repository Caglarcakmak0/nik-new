import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Space,
  Badge,
  Progress,
  Row,
  Col,
  Tooltip,
  Tag,
  Button,
  Empty,
  Modal,
  List,
  Statistic
} from 'antd';
import {
  TrophyOutlined,
  StarOutlined,
  FireOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  BookOutlined,
  AimOutlined,
  CrownOutlined,
  GiftOutlined,
  LockOutlined,
  CheckOutlined
} from '@ant-design/icons';
import { useAuth } from '../../../../contexts/AuthContext';
import { apiRequest } from '../../../../services/api';
import dayjs from 'dayjs';
import './Achievements.scss';

const { Title, Text } = Typography;

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'study' | 'streak' | 'questions' | 'time' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
  requirement: {
    type: string;
    target: number;
    current?: number;
  };
  isUnlocked: boolean;
  unlockedAt?: string;
  progress: number;
}

interface AchievementCategory {
  key: string;
  name: string;
  icon: React.ReactNode;
  color: string;
}

const categories: AchievementCategory[] = [
  { key: 'study', name: 'Çalışma', icon: <BookOutlined />, color: '#1890ff' },
  { key: 'streak', name: 'Süreklilik', icon: <FireOutlined />, color: '#fa541c' },
  { key: 'questions', name: 'Sorular', icon: <AimOutlined />, color: '#52c41a' },
  { key: 'time', name: 'Zaman', icon: <ClockCircleOutlined />, color: '#722ed1' },
  { key: 'special', name: 'Özel', icon: <CrownOutlined />, color: '#faad14' }
];

const Achievements: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  // Achievement verilerini getir
  const fetchAchievements = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/achievements/user');
      setAchievements(response.data || []);
    } catch (error) {
      console.error('Achievements fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAchievements();
  }, []);

  // Kategori filtresi
  const filteredAchievements = achievements.filter(achievement => 
    selectedCategory === 'all' || achievement.category === selectedCategory
  );

  // Rarity renk belirleme
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return '#52c41a';
      case 'rare': return '#1890ff';
      case 'epic': return '#722ed1';
      case 'legendary': return '#fa8c16';
      default: return '#d9d9d9';
    }
  };

  // Rarity isimleri
  const getRarityName = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'Yaygın';
      case 'rare': return 'Nadir';
      case 'epic': return 'Epik';
      case 'legendary': return 'Efsanevi';
      default: return 'Bilinmeyen';
    }
  };

  // Icon belirleme
  const getAchievementIcon = (iconName: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      trophy: <TrophyOutlined />,
      star: <StarOutlined />,
      fire: <FireOutlined />,
      thunder: <ThunderboltOutlined />,
      clock: <ClockCircleOutlined />,
      book: <BookOutlined />,
      target: <AimOutlined />,
      crown: <CrownOutlined />,
      gift: <GiftOutlined />
    };
    return iconMap[iconName] || <StarOutlined />;
  };

  // Achievement detaylarını göster
  const showAchievementDetail = (achievement: Achievement) => {
    setSelectedAchievement(achievement);
    setDetailModalVisible(true);
  };

  // İstatistikler
  const totalAchievements = achievements.length;
  const unlockedAchievements = achievements.filter(a => a.isUnlocked).length;
  const totalPoints = achievements.filter(a => a.isUnlocked).reduce((sum, a) => sum + a.points, 0);
  const completionRate = totalAchievements > 0 ? Math.round((unlockedAchievements / totalAchievements) * 100) : 0;

  const renderAchievementCard = (achievement: Achievement) => {
    const isLocked = !achievement.isUnlocked;
    const rarityColor = getRarityColor(achievement.rarity);
    
    return (
      <Card
        key={achievement.id}
        className={`achievement-card ${isLocked ? 'locked' : 'unlocked'} ${achievement.rarity}`}
        hoverable
        onClick={() => showAchievementDetail(achievement)}
        cover={
          <div className="achievement-cover">
            <Badge 
              count={achievement.points} 
              style={{ backgroundColor: rarityColor }}
              offset={[-10, 10]}
            >
              <div className={`achievement-icon ${isLocked ? 'locked' : ''}`}>
                {isLocked ? <LockOutlined /> : getAchievementIcon(achievement.icon)}
              </div>
            </Badge>
            {achievement.isUnlocked && (
              <div className="unlock-badge">
                <CheckOutlined />
              </div>
            )}
          </div>
        }
        actions={[
          <Tooltip title={`${getRarityName(achievement.rarity)} Rozet`}>
            <Tag color={rarityColor}>{getRarityName(achievement.rarity)}</Tag>
          </Tooltip>
        ]}
      >
        <Card.Meta
          title={
            <Space direction="vertical" size={4}>
              <Text strong className={isLocked ? 'locked-text' : ''}>
                {isLocked ? '???' : achievement.title}
              </Text>
              {!isLocked && achievement.unlockedAt && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {dayjs(achievement.unlockedAt).format('DD MMM YYYY')} tarihinde açıldı
                </Text>
              )}
            </Space>
          }
          description={
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text type="secondary" className={isLocked ? 'locked-text' : ''}>
                {isLocked ? 'Bilinmeyen açıklama' : achievement.description}
              </Text>
              
              {!isLocked && achievement.progress < 100 && (
                <div>
                  <Progress 
                    percent={achievement.progress} 
                    size="small"
                    strokeColor={rarityColor}
                  />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {achievement.requirement.current || 0} / {achievement.requirement.target}
                  </Text>
                </div>
              )}
            </Space>
          }
        />
      </Card>
    );
  };

  return (
    <div className="achievements-page">
      {/* Header Stats */}
      <Card className="stats-card" style={{ marginBottom: 24 }}>
        <Row gutter={24}>
          <Col span={6}>
            <Statistic
              title="Toplam Rozet"
              value={unlockedAchievements}
              suffix={`/ ${totalAchievements}`}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Toplam Puan"
              value={totalPoints}
              prefix={<StarOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Tamamlanma"
              value={completionRate}
              suffix="%"
              prefix={<AimOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={6}>
            <div>
              <Text strong>İlerleme</Text>
              <Progress 
                percent={completionRate} 
                strokeColor="#52c41a"
                style={{ marginTop: 8 }}
              />
            </div>
          </Col>
        </Row>
      </Card>

      {/* Category Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Space wrap>
          <Button
            type={selectedCategory === 'all' ? 'primary' : 'default'}
            onClick={() => setSelectedCategory('all')}
          >
            Tümü ({achievements.length})
          </Button>
          {categories.map(category => {
            const count = achievements.filter(a => a.category === category.key).length;
            return (
              <Button
                key={category.key}
                type={selectedCategory === category.key ? 'primary' : 'default'}
                icon={category.icon}
                onClick={() => setSelectedCategory(category.key)}
              >
                {category.name} ({count})
              </Button>
            );
          })}
        </Space>
      </Card>

      {/* Achievements Grid */}
      <Card
        title={
          <Space>
            <GiftOutlined />
            <span>Rozetlerim</span>
          </Space>
        }
        loading={loading}
      >
        {filteredAchievements.length > 0 ? (
          <Row gutter={[16, 16]}>
            {filteredAchievements.map(achievement => (
              <Col xs={24} sm={12} md={8} lg={6} key={achievement.id}>
                {renderAchievementCard(achievement)}
              </Col>
            ))}
          </Row>
        ) : (
          <Empty description="Bu kategoride rozet bulunmuyor" />
        )}
      </Card>

      {/* Achievement Detail Modal */}
      <Modal
        title="Rozet Detayı"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={500}
      >
        {selectedAchievement && (
          <div className="achievement-detail">
            <div className="detail-header">
              <div className={`detail-icon ${selectedAchievement.isUnlocked ? '' : 'locked'}`}>
                {selectedAchievement.isUnlocked ? 
                  getAchievementIcon(selectedAchievement.icon) : 
                  <LockOutlined />
                }
              </div>
              <Space direction="vertical" style={{ flex: 1 }}>
                <Title level={4}>
                  {selectedAchievement.isUnlocked ? selectedAchievement.title : '???'}
                </Title>
                <Space>
                  <Tag color={getRarityColor(selectedAchievement.rarity)}>
                    {getRarityName(selectedAchievement.rarity)}
                  </Tag>
                  <Tag color="blue">
                    {selectedAchievement.points} puan
                  </Tag>
                </Space>
              </Space>
            </div>

            <div className="detail-content">
              <Text>
                {selectedAchievement.isUnlocked ? 
                  selectedAchievement.description : 
                  'Bu rozet henüz açılmamış. Gereksinimlerini tamamlayın.'
                }
              </Text>

              {selectedAchievement.isUnlocked ? (
                <div style={{ marginTop: 16 }}>
                  <Text type="secondary">
                    📅 {dayjs(selectedAchievement.unlockedAt).format('DD MMMM YYYY, HH:mm')} tarihinde açıldı
                  </Text>
                </div>
              ) : (
                <div style={{ marginTop: 16 }}>
                  <Text strong>İlerleme:</Text>
                  <Progress 
                    percent={selectedAchievement.progress}
                    strokeColor={getRarityColor(selectedAchievement.rarity)}
                    style={{ marginTop: 8 }}
                  />
                  <Text type="secondary">
                    {selectedAchievement.requirement.current || 0} / {selectedAchievement.requirement.target}
                  </Text>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Achievements;