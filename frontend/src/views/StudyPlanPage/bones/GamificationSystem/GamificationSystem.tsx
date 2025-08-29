import React, { useState } from 'react';
import {
  Card,
  Typography,
  Space,
  Row,
  Col,
  Statistic,
  Tag,
  Button,
  Modal,
  List,
  Divider,
  Badge
} from 'antd';
import {
  TrophyOutlined,
  StarOutlined,
  FireOutlined,
  ThunderboltOutlined,
  GiftOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useGamification } from '../../../../hooks/useGamification';
import XPBar from '../../../../components/XPBar';
import DailyChallenges from '../../../../components/DailyChallenges';
import { getProgressFromStats } from '../../../../utils/leveling';
import './GamificationSystem.scss';

const { Title, Text } = Typography;

interface XPSource {
  action: string;
  points: number;
  description: string;
  category: 'study' | 'achievement' | 'streak' | 'bonus';
  multiplier?: number;
}

// Legacy levels removed; dynamic curve used now. Provide simple titles by tier bands.
const dynamicLevelTitle = (level: number) => {
  if (level < 5) return 'Yeni Başlayan';
  if (level < 10) return 'Öğrenci';
  if (level < 15) return 'Çalışkan';
  if (level < 20) return 'Azimli';
  if (level < 30) return 'Uzman';
  if (level < 40) return 'Usta';
  return 'Efsane';
};

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
  const { stats, events, challenges, refetch } = useGamification();
  const [eventsVisible, setEventsVisible] = useState(false);
  const [levelModalVisible, setLevelModalVisible] = useState(false);

  if (!stats) return <div>Loading...</div>;

  const lp = getProgressFromStats(stats.currentLevel, stats.currentLevelXP, stats.nextLevelXP, stats.totalXP);
  const title = dynamicLevelTitle(stats.currentLevel);
  // Derived values
  const xpToNext = stats ? (stats.nextLevelXP - stats.currentLevelXP) : 0;

  return (
    <div className="gamification-system">
      {/* Level Card */}
      <Card className="level-card" style={{ marginBottom: 24 }}>
        <Row align="middle" gutter={24}>
          <Col span={8}>
            <div className="level-display">
              <Badge count={stats.currentLevel} style={{ backgroundColor: '#faad14' }} offset={[-10, 10]}>
                <div className="level-avatar" style={{ backgroundColor: '#faad14' }}>
                  <TrophyOutlined />
                </div>
              </Badge>
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <Title level={4} style={{ margin: 0, color: 'white' }}>
                  {title}
                </Title>
                <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Seviye {stats.currentLevel}
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
                    value={stats.totalXP.toLocaleString()}
                    prefix={<ThunderboltOutlined />}
                    valueStyle={{ color: 'white' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Seri"
                    value={stats.streak}
                    prefix={<FireOutlined />}
                    suffix="gün"
                    valueStyle={{ color: 'white' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Rozetler"
                    value={stats.totalAchievements}
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
                    {Math.round(lp.percent)}%
                  </Text>
                </div>
                <XPBar totalXP={stats.totalXP} currentLevel={stats.currentLevel} currentLevelXP={stats.currentLevelXP} nextLevelXP={stats.nextLevelXP} />
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
              <Button ghost icon={<ClockCircleOutlined />} onClick={() => setEventsVisible(true)}>XP Olayları</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Daily Challenges */}
  {challenges && <DailyChallenges data={challenges} onClaimed={refetch} />}

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
                        <Tag color="orange">
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
        open={levelModalVisible}
        onCancel={() => setLevelModalVisible(false)}
        footer={null}
        width={640}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Title level={5} style={{ marginTop: 0 }}>Mevcut Durum</Title>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic title="Seviye" value={stats.currentLevel} />
              </Col>
              <Col span={12}>
                <Statistic title="Seviye %" value={Math.round(lp.percent)} suffix="%" />
              </Col>
            </Row>
            <Row gutter={16} style={{ marginTop: 12 }}>
              <Col span={12}>
                <Statistic title="Bu Seviyede XP" value={stats.currentLevelXP} />
              </Col>
              <Col span={12}>
                <Statistic title="Sonraki Seviyeye" value={xpToNext} suffix="XP" />
              </Col>
            </Row>
          </div>
          <div>
            <Title level={5}>Seviye Ünvanları</Title>
            <List
              size="small"
              dataSource={[
                { range: '1-4', title: 'Yeni Başlayan' },
                { range: '5-9', title: 'Öğrenci' },
                { range: '10-14', title: 'Çalışkan' },
                { range: '15-19', title: 'Azimli' },
                { range: '20-29', title: 'Uzman' },
                { range: '30-39', title: 'Usta' },
                { range: '40+', title: 'Efsane' }
              ]}
              renderItem={(item) => (
                <List.Item>
                  <Space>
                    <Tag>{item.range}</Tag>
                    <Text>{item.title}</Text>
                  </Space>
                </List.Item>
              )}
            />
          </div>
          <div>
            <Title level={5}>Formül</Title>
            <Text type="secondary">
              Seviye ilerlemesi dinamik bir eğri ile hesaplanır. Her seviye için gereken toplam XP kümülatif olarak artar,
              bu sayede ilk seviyeler hızlı, ileri seviyeler daha zorlu hissedilir. Çalışma oturumları, doğru cevaplar,
              günlük görevler, seri (streak) bonusu ve rozetler XP sağlar.
            </Text>
          </div>
        </Space>
      </Modal>

      {/* XP History Modal */}
      <Modal title="XP Olayları" open={eventsVisible} onCancel={() => setEventsVisible(false)} footer={null} width={520}>
        <List
          size="small"
          dataSource={events}
          renderItem={(e: any) => (
            <List.Item>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <span>{e.type}</span>
                <Tag color={e.amount > 0 ? 'green' : 'red'}>{e.amount > 0 ? '+' : ''}{e.amount} XP</Tag>
              </Space>
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
};

export default GamificationSystem;