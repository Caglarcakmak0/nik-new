import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Space,
  Button,
  Progress,
  Row,
  Col,
  Tag,
  Statistic,
  Avatar,
  List,
  Badge,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Tabs,
  Tooltip
} from 'antd';
import {
  TrophyOutlined,
  CalendarOutlined,
  TeamOutlined,
  GiftOutlined,
  PlusOutlined,
  FireOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  UserOutlined,
  RiseOutlined,
  CrownOutlined
} from '@ant-design/icons';
import { useAuth } from '../../../../contexts/AuthContext';
import { apiRequest } from '../../../../services/api';
import dayjs from 'dayjs';
import './Competitions.scss';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface Competition {
  id: string;
  title: string;
  description: string;
  type: 'weekly' | 'monthly' | 'special';
  category: 'questions' | 'time' | 'streak' | 'mixed';
  startDate: string;
  endDate: string;
  participants: Participant[];
  maxParticipants?: number;
  prizes: Prize[];
  rules: string[];
  isActive: boolean;
  isJoined: boolean;
  status: 'upcoming' | 'active' | 'ended';
  createdBy: string;
  createdAt: string;
  leaderboard: LeaderboardEntry[];
}

interface Participant {
  userId: string;
  name: string;
  avatar?: string;
  joinedAt: string;
  currentScore: number;
}

interface Prize {
  position: number;
  title: string;
  description: string;
  points: number;
  badge?: string;
}

interface LeaderboardEntry {
  userId: string;
  name: string;
  avatar?: string;
  score: number;
  rank: number;
  progress: {
    questions: number;
    studyTime: number;
    streak: number;
  };
}

const Competitions: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('active');
  const [form] = Form.useForm();

  // Yarışma verilerini getir
  const fetchCompetitions = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/competitions');
      setCompetitions(response.data || []);
    } catch (error) {
      console.error('Competitions fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompetitions();
  }, []);

  // Yarışmaya katıl
  const joinCompetition = async (competitionId: string) => {
    try {
      await apiRequest(`/competitions/${competitionId}/join`, {
        method: 'POST'
      });
      message.success('Yarışmaya başarıyla katıldınız!');
      fetchCompetitions();
    } catch (error) {
      console.error('Join competition error:', error);
      message.error('Yarışmaya katılırken hata oluştu');
    }
  };

  // Yarışma oluştur
  const createCompetition = async (values: any) => {
    try {
      setLoading(true);
      await apiRequest('/competitions', {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          startDate: values.dateRange[0].toISOString(),
          endDate: values.dateRange[1].toISOString(),
          createdBy: user?.id
        })
      });
      message.success('Yarışma başarıyla oluşturuldu!');
      setCreateModalVisible(false);
      form.resetFields();
      fetchCompetitions();
    } catch (error) {
      console.error('Create competition error:', error);
      message.error('Yarışma oluşturulurken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Durum rengini belirle
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'blue';
      case 'active': return 'green';
      case 'ended': return 'default';
      default: return 'default';
    }
  };

  // Durum metnini belirle
  const getStatusText = (status: string) => {
    switch (status) {
      case 'upcoming': return 'Yakında';
      case 'active': return 'Aktif';
      case 'ended': return 'Bitti';
      default: return 'Bilinmeyen';
    }
  };

  // Kategori iconunu belirle
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'questions': return <ThunderboltOutlined />;
      case 'time': return <ClockCircleOutlined />;
      case 'streak': return <FireOutlined />;
      case 'mixed': return <RiseOutlined />;
      default: return <TrophyOutlined />;
    }
  };

  // Filtrelenmiş yarışmaları getir
  const getFilteredCompetitions = () => {
    switch (activeTab) {
      case 'active':
        return competitions.filter(c => c.status === 'active');
      case 'upcoming':
        return competitions.filter(c => c.status === 'upcoming');
      case 'ended':
        return competitions.filter(c => c.status === 'ended');
      case 'my':
        return competitions.filter(c => c.isJoined);
      default:
        return competitions;
    }
  };

  // Yarışma detaylarını göster
  const showCompetitionDetail = (competition: Competition) => {
    setSelectedCompetition(competition);
    setDetailModalVisible(true);
  };

  const renderCompetitionCard = (competition: Competition) => {
    const timeLeft = dayjs(competition.endDate).diff(dayjs(), 'hours');
    const progress = competition.status === 'active' ? 
      ((dayjs().diff(dayjs(competition.startDate))) / (dayjs(competition.endDate).diff(dayjs(competition.startDate)))) * 100 : 0;

    return (
      <Card
        key={competition.id}
        className={`competition-card ${competition.status} ${competition.isJoined ? 'joined' : ''}`}
        hoverable
        onClick={() => showCompetitionDetail(competition)}
        actions={[
          competition.isJoined ? (
            <Tag color="green" icon={<UserOutlined />}>Katıldın</Tag>
          ) : competition.status === 'active' ? (
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                joinCompetition(competition.id);
              }}
            >
              Katıl
            </Button>
          ) : (
            <Tag color={getStatusColor(competition.status)}>
              {getStatusText(competition.status)}
            </Tag>
          )
        ]}
      >
        <Card.Meta
          avatar={
            <Badge 
              count={competition.participants.length} 
              style={{ backgroundColor: '#1890ff' }}
              offset={[-5, 5]}
            >
              <div className="competition-icon">
                {getCategoryIcon(competition.category)}
              </div>
            </Badge>
          }
          title={
            <Space direction="vertical" size={4}>
              <Space>
                <Text strong>{competition.title}</Text>
                <Tag color={getStatusColor(competition.status)}>
                  {getStatusText(competition.status)}
                </Tag>
              </Space>
              {competition.status === 'active' && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {timeLeft > 0 ? `${timeLeft} saat kaldı` : 'Süre doldu'}
                </Text>
              )}
            </Space>
          }
          description={
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text type="secondary">{competition.description}</Text>
              
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="Katılımcı"
                    value={competition.participants.length}
                    prefix={<TeamOutlined />}
                    suffix={competition.maxParticipants ? ` / ${competition.maxParticipants}` : ''}
                    valueStyle={{ fontSize: '16px' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Ödül"
                    value={competition.prizes[0]?.points || 0}
                    prefix={<GiftOutlined />}
                    suffix="puan"
                    valueStyle={{ fontSize: '16px', color: '#faad14' }}
                  />
                </Col>
              </Row>

              {competition.status === 'active' && (
                <div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>İlerleme:</Text>
                  <Progress 
                    percent={Math.min(progress, 100)} 
                    size="small"
                    strokeColor="#52c41a"
                    style={{ marginTop: 4 }}
                  />
                </div>
              )}

              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {dayjs(competition.startDate).format('DD MMM')} - {dayjs(competition.endDate).format('DD MMM YYYY')}
                </Text>
              </div>
            </Space>
          }
        />
      </Card>
    );
  };

  return (
    <div className="competitions-page">
      {/* Header */}
      <Card style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3}>
              <TrophyOutlined /> Yarışmalar
            </Title>
            <Text type="secondary">
              Diğer öğrencilerle yarışın ve rozetler kazanın
            </Text>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              Yarışma Oluştur
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Competitions */}
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'active',
              label: (
                <span>
                  <FireOutlined />
                  Aktif ({competitions.filter(c => c.status === 'active').length})
                </span>
              )
            },
            {
              key: 'upcoming',
              label: (
                <span>
                  <ClockCircleOutlined />
                  Yakında ({competitions.filter(c => c.status === 'upcoming').length})
                </span>
              )
            },
            {
              key: 'my',
              label: (
                <span>
                  <UserOutlined />
                  Katıldıklarım ({competitions.filter(c => c.isJoined).length})
                </span>
              )
            },
            {
              key: 'ended',
              label: (
                <span>
                  <CalendarOutlined />
                  Geçmiş ({competitions.filter(c => c.status === 'ended').length})
                </span>
              )
            }
          ]}
        />

        <div style={{ marginTop: 24 }}>
          {getFilteredCompetitions().length > 0 ? (
            <Row gutter={[16, 16]}>
              {getFilteredCompetitions().map(competition => (
                <Col xs={24} sm={12} lg={8} key={competition.id}>
                  {renderCompetitionCard(competition)}
                </Col>
              ))}
            </Row>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <TrophyOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
              <Title level={4} type="secondary">
                Bu kategoride yarışma bulunmuyor
              </Title>
              <Text type="secondary">
                Yeni yarışmalar için takipte kalın!
              </Text>
            </div>
          )}
        </div>
      </Card>

      {/* Competition Detail Modal */}
      <Modal
        title="Yarışma Detayı"
        visible={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setDetailModalVisible(false)}>
            Kapat
          </Button>,
          selectedCompetition && !selectedCompetition.isJoined && selectedCompetition.status === 'active' && (
            <Button 
              key="join" 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => {
                joinCompetition(selectedCompetition.id);
                setDetailModalVisible(false);
              }}
            >
              Yarışmaya Katıl
            </Button>
          )
        ]}
      >
        {selectedCompetition && (
          <div className="competition-detail">
            <div className="detail-header">
              <Row gutter={24}>
                <Col span={16}>
                  <Space direction="vertical" size={8}>
                    <Title level={4}>{selectedCompetition.title}</Title>
                    <Text>{selectedCompetition.description}</Text>
                    <Space>
                      <Tag color={getStatusColor(selectedCompetition.status)}>
                        {getStatusText(selectedCompetition.status)}
                      </Tag>
                      <Tag color="blue">
                        {selectedCompetition.type === 'weekly' ? 'Haftalık' : 
                         selectedCompetition.type === 'monthly' ? 'Aylık' : 'Özel'}
                      </Tag>
                    </Space>
                  </Space>
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Katılımcı Sayısı"
                    value={selectedCompetition.participants.length}
                    prefix={<TeamOutlined />}
                    suffix={selectedCompetition.maxParticipants ? ` / ${selectedCompetition.maxParticipants}` : ''}
                  />
                </Col>
              </Row>
            </div>

            <div className="detail-content">
              <Row gutter={24}>
                <Col span={12}>
                  <Card size="small" title="Ödüller">
                    <List
                      size="small"
                      dataSource={selectedCompetition.prizes}
                      renderItem={(prize) => (
                        <List.Item>
                          <Space>
                            {prize.position === 1 && <CrownOutlined style={{ color: '#faad14' }} />}
                            <Text strong>#{prize.position}</Text>
                            <Text>{prize.title}</Text>
                            <Tag color="gold">{prize.points} puan</Tag>
                          </Space>
                        </List.Item>
                      )}
                    />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small" title="Kurallar">
                    <ul>
                      {selectedCompetition.rules.map((rule, index) => (
                        <li key={index}>{rule}</li>
                      ))}
                    </ul>
                  </Card>
                </Col>
              </Row>

              {selectedCompetition.leaderboard.length > 0 && (
                <Card size="small" title="Liderlik Tablosu" style={{ marginTop: 16 }}>
                  <List
                    dataSource={selectedCompetition.leaderboard.slice(0, 10)}
                    renderItem={(entry) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={
                            <Badge count={entry.rank} style={{ backgroundColor: entry.rank <= 3 ? '#faad14' : '#1890ff' }}>
                              <Avatar src={entry.avatar}>{entry.name.charAt(0)}</Avatar>
                            </Badge>
                          }
                          title={entry.name}
                          description={`${entry.score} puan`}
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Create Competition Modal */}
      <Modal
        title="Yeni Yarışma Oluştur"
        visible={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={() => form.submit()}
        confirmLoading={loading}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={createCompetition}
        >
          <Form.Item
            name="title"
            label="Yarışma Adı"
            rules={[{ required: true, message: 'Yarışma adı gerekli' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="description"
            label="Açıklama"
            rules={[{ required: true, message: 'Açıklama gerekli' }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="type"
                label="Türü"
                rules={[{ required: true, message: 'Tür gerekli' }]}
              >
                <Select>
                  <Option value="weekly">Haftalık</Option>
                  <Option value="monthly">Aylık</Option>
                  <Option value="special">Özel</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="category"
                label="Kategori"
                rules={[{ required: true, message: 'Kategori gerekli' }]}
              >
                <Select>
                  <Option value="questions">Soru Bazlı</Option>
                  <Option value="time">Zaman Bazlı</Option>
                  <Option value="streak">Süreklilik Bazlı</Option>
                  <Option value="mixed">Karma</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="dateRange"
            label="Tarih Aralığı"
            rules={[{ required: true, message: 'Tarih aralığı gerekli' }]}
          >
            <RangePicker showTime style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="maxParticipants"
            label="Maksimum Katılımcı (Opsiyonel)"
          >
            <Input type="number" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Competitions;