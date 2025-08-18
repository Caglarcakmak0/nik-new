import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Button, 
  Space, 
  Tag, 
  Alert, 
  List, 
  Avatar,
  Progress,
  Divider,
  Modal,
  message,
  Tooltip,
  Badge
} from 'antd';
import { 
  BulbOutlined,
  RocketOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  BookOutlined,
  StarOutlined,
  ThunderboltOutlined,
  AimOutlined,
  FireOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  InfoCircleOutlined,
  RobotOutlined
} from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import './StudyRecommendations.scss';

const { Title, Text, Paragraph } = Typography;

interface StudyRecommendation {
  id: string;
  type: 'subject_focus' | 'time_optimization' | 'technique' | 'break' | 'review' | 'motivation';
  title: string;
  description: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: number; // minutes
  difficultyLevel: 'easy' | 'medium' | 'hard';
  subjects?: string[];
  actionable: boolean;
  confidence: number; // 0-100
  icon: React.ReactNode;
  color: string;
}

interface StudyRecommendationsProps {
  plan: {
    _id: string;
    subjects: Array<{
      subject: string;
      targetQuestions: number;
      completedQuestions: number;
      correctAnswers: number;
      wrongAnswers: number;
      blankAnswers: number;
      studyTime: number;
      status: string;
    }>;
    stats: {
      completionRate: number;
      successRate: number;
      netScore: number;
      totalStudyTime: number;
    };
  };
  selectedDate: Dayjs;
  onStartRecommendation?: (recommendation: StudyRecommendation) => void;
}

const StudyRecommendations: React.FC<StudyRecommendationsProps> = ({ 
  plan, 
  selectedDate, 
  onStartRecommendation 
}) => {
  const [recommendations, setRecommendations] = useState<StudyRecommendation[]>([]);
  const [selectedRecommendation, setSelectedRecommendation] = useState<StudyRecommendation | null>(null);
  const [detailModal, setDetailModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // AI-based recommendation engine
  const generateRecommendations = () => {
    const recs: StudyRecommendation[] = [];
    const currentHour = dayjs().hour();
    const timeOfDay = currentHour < 12 ? 'morning' : currentHour < 18 ? 'afternoon' : 'evening';
    
    // Analyze user performance
    const weakSubjects = plan.subjects
      .filter(s => s.correctAnswers + s.wrongAnswers + s.blankAnswers > 0)
      .sort((a, b) => {
        const aAccuracy = a.correctAnswers / (a.correctAnswers + a.wrongAnswers + a.blankAnswers);
        const bAccuracy = b.correctAnswers / (b.correctAnswers + b.wrongAnswers + b.blankAnswers);
        return aAccuracy - bAccuracy;
      })
      .slice(0, 2);

    const strongSubjects = plan.subjects
      .filter(s => s.correctAnswers + s.wrongAnswers + s.blankAnswers > 0)
      .sort((a, b) => {
        const aAccuracy = a.correctAnswers / (a.correctAnswers + a.wrongAnswers + a.blankAnswers);
        const bAccuracy = b.correctAnswers / (b.correctAnswers + b.wrongAnswers + b.blankAnswers);
        return bAccuracy - aAccuracy;
      })
      .slice(0, 2);

    // 1. Subject Focus Recommendations
    if (weakSubjects.length > 0) {
      const subject = weakSubjects[0];
      const accuracy = subject.correctAnswers / (subject.correctAnswers + subject.wrongAnswers + subject.blankAnswers);
      
      recs.push({
        id: 'focus_weak_subject',
        type: 'subject_focus',
        title: `${subject.subject.charAt(0).toUpperCase() + subject.subject.slice(1)} Odaklı Çalışma`,
        description: `%${Math.round(accuracy * 100)} doğruluk oranıyla en çok gelişime açık dersiniz. Kısa süreli yoğun çalışma önerisi.`,
        reason: 'Zayıf performans tespit edildi',
        priority: 'high',
        estimatedTime: 45,
        difficultyLevel: 'medium',
        subjects: [subject.subject],
        actionable: true,
        confidence: 85,
        icon: <BookOutlined />,
        color: '#ff4d4f'
      });
    }

    // 2. Time Optimization
    if (plan.stats.totalStudyTime > 0) {
      const efficiency = (plan.stats.completionRate / (plan.stats.totalStudyTime / 60));
      
      if (efficiency < 2) {
        recs.push({
          id: 'optimize_time',
          type: 'time_optimization',
          title: 'Pomodoro Tekniği ile Verimlilik Artışı',
          description: 'Mevcut çalışma hızınızı %30 artırmak için 25dk çalış, 5dk mola sistemine geçin.',
          reason: 'Düşük verimlilik tespit edildi',
          priority: 'high',
          estimatedTime: 90,
          difficultyLevel: 'easy',
          actionable: true,
          confidence: 78,
          icon: <ClockCircleOutlined />,
          color: '#1890ff'
        });
      }
    }

    // 3. Technique Recommendations
    if (timeOfDay === 'morning' && plan.stats.successRate < 70) {
      recs.push({
        id: 'morning_boost',
        type: 'technique',
        title: 'Sabah Enerjisi Aktivasyon Tekniği',
        description: 'Sabah saatlerinde beyninizin öğrenme kapasitesini maksimuma çıkarmak için 5dk nefes egzersizi + zor sorularla başlayın.',
        reason: 'Sabah verimliliği optimizasyonu',
        priority: 'medium',
        estimatedTime: 30,
        difficultyLevel: 'easy',
        actionable: true,
        confidence: 72,
        icon: <RocketOutlined />,
        color: '#52c41a'
      });
    }

    // 4. Break Recommendations
    if (plan.stats.totalStudyTime > 120) { // 2+ hours studied
      recs.push({
        id: 'strategic_break',
        type: 'break',
        title: 'Aktif Dinlenme Molası',
        description: '2+ saat çalışma sonrası beyninizin bilgileri pekiştirmesi için 15dk yürüyüş yapın.',
        reason: 'Uzun çalışma süresinden sonra mola gerekli',
        priority: 'medium',
        estimatedTime: 15,
        difficultyLevel: 'easy',
        actionable: true,
        confidence: 90,
        icon: <ThunderboltOutlined />,
        color: '#faad14'
      });
    }

    // 5. Review Recommendations
    if (strongSubjects.length > 0) {
      const subject = strongSubjects[0];
      recs.push({
        id: 'reinforce_strong',
        type: 'review',
        title: `${subject.subject.charAt(0).toUpperCase() + subject.subject.slice(1)} Pekiştirme`,
        description: 'Güçlü olduğunuz derste hızlı tekrar yaparak özgüveninizi artırın ve momentum kazanın.',
        reason: 'Güçlü alan pekiştirmesi',
        priority: 'low',
        estimatedTime: 20,
        difficultyLevel: 'easy',
        subjects: [subject.subject],
        actionable: true,
        confidence: 65,
        icon: <StarOutlined />,
        color: '#722ed1'
      });
    }

    // 6. Motivation Boost
    if (plan.stats.completionRate < 50 && timeOfDay === 'evening') {
      recs.push({
        id: 'evening_motivation',
        type: 'motivation',
        title: 'Günü Güçlü Bitirin',
        description: 'Hedeflerinizi tamamlamak için son bir çaba. 30dk odaklanarak günlük hedeflerinize yaklaşın.',
        reason: 'Düşük tamamlanma oranı + akşam saatleri',
        priority: 'high',
        estimatedTime: 30,
        difficultyLevel: 'medium',
        actionable: true,
        confidence: 88,
        icon: <FireOutlined />,
        color: '#f5222d'
      });
    }

    // Sort by priority and confidence
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    recs.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });

    return recs.slice(0, 6); // Top 6 recommendations
  };

  useEffect(() => {
    const recs = generateRecommendations();
    setRecommendations(recs);
  }, [plan]);

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: '#ff4d4f',
      medium: '#faad14',
      low: '#52c41a'
    };
    return colors[priority as keyof typeof colors];
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      easy: '#52c41a',
      medium: '#faad14',
      hard: '#ff4d4f'
    };
    return colors[difficulty as keyof typeof colors];
  };

  const handleStartRecommendation = (recommendation: StudyRecommendation) => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      message.success(`${recommendation.title} başlatıldı!`);
      if (onStartRecommendation) {
        onStartRecommendation(recommendation);
      }
      setLoading(false);
    }, 1000);
  };

  const showRecommendationDetail = (recommendation: StudyRecommendation) => {
    setSelectedRecommendation(recommendation);
    setDetailModal(true);
  };

  return (
    <div className="study-recommendations">
      {/* Header */}
      <Card className="recommendations-header" style={{ marginBottom: '24px' }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <RobotOutlined style={{ color: '#722ed1' }} />
              AI Destekli Çalışma Önerileri
              <Badge count={recommendations.length} showZero color="#722ed1" />
            </Title>
            <Text type="secondary" style={{ fontSize: '14px' }}>Performansınıza göre kişiselleştirilmiş akıllı öneriler</Text>
          </Col>
          <Col>
            <Button 
              type="primary" 
              icon={<BulbOutlined />}
              onClick={() => setRecommendations(generateRecommendations())}
            >
              Yenile
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Quick Stats */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={6}>
          <Card size="small" className="quick-stat">
            <div className="stat-content">
              <div className="stat-number" style={{ color: '#ff4d4f' }}>
                {recommendations.filter(r => r.priority === 'high').length}
              </div>
              <div className="stat-label">Yüksek Öncelik</div>
            </div>
          </Card>
        </Col>
        <Col xs={6}>
          <Card size="small" className="quick-stat">
            <div className="stat-content">
              <div className="stat-number" style={{ color: '#52c41a' }}>
                {recommendations.filter(r => r.actionable).length}
              </div>
              <div className="stat-label">Hemen Başla</div>
            </div>
          </Card>
        </Col>
        <Col xs={6}>
          <Card size="small" className="quick-stat">
            <div className="stat-content">
              <div className="stat-number" style={{ color: '#1890ff' }}>
                {Math.round(recommendations.reduce((acc, r) => acc + r.estimatedTime, 0) / recommendations.length)}dk
              </div>
              <div className="stat-label">Ort. Süre</div>
            </div>
          </Card>
        </Col>
        <Col xs={6}>
          <Card size="small" className="quick-stat">
            <div className="stat-content">
              <div className="stat-number" style={{ color: '#722ed1' }}>
                {Math.round(recommendations.reduce((acc, r) => acc + r.confidence, 0) / recommendations.length)}%
              </div>
              <div className="stat-label">AI Güven</div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Recommendations List */}
      <Row gutter={[16, 16]}>
        {recommendations.map((recommendation, index) => (
          <Col xs={24} md={12} key={recommendation.id}>
            <Card 
              className={`recommendation-card priority-${recommendation.priority}`}
              hoverable
              actions={[
                <Button 
                  key="detail" 
                  type="text" 
                  icon={<InfoCircleOutlined />}
                  onClick={() => showRecommendationDetail(recommendation)}
                >
                  Detay
                </Button>,
                <Button 
                  key="start" 
                  type="primary" 
                  icon={<PlayCircleOutlined />}
                  onClick={() => handleStartRecommendation(recommendation)}
                  loading={loading}
                  disabled={!recommendation.actionable}
                >
                  Başla
                </Button>
              ]}
            >
              <div className="recommendation-content">
                {/* Header */}
                <div className="recommendation-header">
                  <Avatar 
                    style={{ 
                      backgroundColor: recommendation.color,
                      marginBottom: '12px'
                    }}
                    icon={recommendation.icon}
                  />
                  <div className="recommendation-badges">
                    <Tag color={getPriorityColor(recommendation.priority)} size="small">
                      {recommendation.priority === 'high' ? 'Yüksek' : 
                       recommendation.priority === 'medium' ? 'Orta' : 'Düşük'} Öncelik
                    </Tag>
                    <Tag color={getDifficultyColor(recommendation.difficultyLevel)} size="small">
                      {recommendation.difficultyLevel === 'easy' ? 'Kolay' :
                       recommendation.difficultyLevel === 'medium' ? 'Orta' : 'Zor'}
                    </Tag>
                  </div>
                </div>

                {/* Content */}
                <Title level={5} style={{ marginBottom: '8px', fontSize: '16px' }}>
                  {recommendation.title}
                </Title>
                
                <Paragraph style={{ marginBottom: '12px', color: '#595959', fontSize: '14px' }}>
                  {recommendation.description}
                </Paragraph>

                {/* Metadata */}
                <div className="recommendation-meta">
                  <Space split={<Divider type="vertical" />}>
                    <Tooltip title="Tahmini süre">
                      <span>
                        <ClockCircleOutlined style={{ marginRight: '4px' }} />
                        {recommendation.estimatedTime}dk
                      </span>
                    </Tooltip>
                    <Tooltip title="AI güven oranı">
                      <span>
                                  <AimOutlined style={{ marginRight: '4px' }} />
                        %{recommendation.confidence}
                      </span>
                    </Tooltip>
                    {recommendation.subjects && (
                      <Tooltip title="İlgili dersler">
                        <span>
                          <BookOutlined style={{ marginRight: '4px' }} />
                          {recommendation.subjects.join(', ')}
                        </span>
                      </Tooltip>
                    )}
                  </Space>
                </div>

                {/* Confidence Bar */}
                <Progress 
                  percent={recommendation.confidence} 
                  size="small" 
                  showInfo={false}
                  strokeColor={recommendation.color}
                  style={{ marginTop: '12px' }}
                />
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Recommendation Detail Modal */}
      <Modal
        title={selectedRecommendation ? selectedRecommendation.title : 'Öneri Detayı'}
        open={detailModal}
        onCancel={() => {
          setDetailModal(false);
          setSelectedRecommendation(null);
        }}
        footer={[
          <Button key="cancel" onClick={() => setDetailModal(false)}>
            Kapat
          </Button>,
          selectedRecommendation?.actionable && (
            <Button 
              key="start" 
              type="primary" 
              icon={<PlayCircleOutlined />}
              onClick={() => {
                if (selectedRecommendation) {
                  handleStartRecommendation(selectedRecommendation);
                  setDetailModal(false);
                }
              }}
              loading={loading}
            >
              Hemen Başla
            </Button>
          )
        ]}
        width={600}
        className="recommendation-detail-modal"
      >
        {selectedRecommendation && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* Icon & Basic Info */}
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Avatar 
                size={64}
                style={{ backgroundColor: selectedRecommendation.color, marginBottom: '16px' }}
                icon={selectedRecommendation.icon}
              />
              <Title level={4} style={{ fontSize: '20px' }}>{selectedRecommendation.title}</Title>
              <Text type="secondary" style={{ fontSize: '14px' }}>{selectedRecommendation.description}</Text>
            </div>

            {/* Detailed Analysis */}
            <Card size="small" title={<span style={{ fontSize: '16px' }}>Neden Bu Öneri?</span>}>
              <Paragraph style={{ fontSize: '14px' }}>{selectedRecommendation.reason}</Paragraph>
              <Row gutter={16}>
                <Col span={8}>
                  <div className="detail-metric">
                    <Text strong style={{ fontSize: '12px' }}>Öncelik Seviyesi</Text>
                    <div>
                      <Tag color={getPriorityColor(selectedRecommendation.priority)}>
                        {selectedRecommendation.priority === 'high' ? 'Yüksek' : 
                         selectedRecommendation.priority === 'medium' ? 'Orta' : 'Düşük'}
                      </Tag>
                    </div>
                  </div>
                </Col>
                <Col span={8}>
                  <div className="detail-metric">
                    <Text strong style={{ fontSize: '12px' }}>Tahmini Süre</Text>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
                      {selectedRecommendation.estimatedTime} dakika
                    </div>
                  </div>
                </Col>
                <Col span={8}>
                  <div className="detail-metric">
                    <Text strong style={{ fontSize: '12px' }}>AI Güven Oranı</Text>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#52c41a' }}>
                      %{selectedRecommendation.confidence}
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>

            {/* Action Steps */}
            <Card size="small" title={<span style={{ fontSize: '16px' }}>Nasıl Başlamalı?</span>}>
              <List
                size="small"
                dataSource={[
                  'Çalışma ortamınızı hazırlayın (sessiz, aydınlık)',
                  'Telefonunuzu sessiz moda alın veya başka odaya koyun',
                  'Su ve gerekli malzemelerinizi yanınıza alın',
                  'Belirtilen süre kadar odaklanmaya hazırlanın',
                  'Timer başlatın ve önerilen tekniği uygulayın'
                ]}
                renderItem={(item, index) => (
                  <List.Item>
                    <Space>
                      <Avatar size="small" style={{ backgroundColor: '#f0f0f0', color: '#666' }}>
                        {index + 1}
                      </Avatar>
                      <Text style={{ fontSize: '14px' }}>{item}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            </Card>
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default StudyRecommendations;