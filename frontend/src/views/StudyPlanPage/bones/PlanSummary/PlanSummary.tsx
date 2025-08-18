import React from 'react';
import { Card, Row, Col, Statistic, Progress, Typography, Tag, Space, Divider } from 'antd';
import { 
  TrophyOutlined, 
  ClockCircleOutlined, 
  CheckCircleOutlined,
  FireOutlined,
  BarChartOutlined,
  LineChartOutlined,
  StarOutlined 
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface PlanSummaryProps {
  plan: {
    stats: {
      totalTargetQuestions: number;
      totalCompletedQuestions: number;
      totalTargetTime: number;
      totalStudyTime: number;
      completionRate: number;
      netScore: number;
      successRate: number;
    };
    subjects: Array<{
      subject: string;
      targetQuestions: number;
      completedQuestions: number;
      correctAnswers: number;
      wrongAnswers: number;
      studyTime: number;
      status: string;
    }>;
  };
  onRefresh: () => void;
}

const PlanSummary: React.FC<PlanSummaryProps> = ({ plan, onRefresh }) => {
  
  // Advanced analytics calculations
  const getPerformanceGrade = (successRate: number): { grade: string; color: string; icon: React.ReactNode } => {
    if (successRate >= 90) return { grade: 'A+', color: '#52c41a', icon: <StarOutlined /> };
    if (successRate >= 80) return { grade: 'A', color: '#73d13d', icon: <TrophyOutlined /> };
    if (successRate >= 70) return { grade: 'B', color: '#faad14', icon: <CheckCircleOutlined /> };
    if (successRate >= 60) return { grade: 'C', color: '#ff7a45', icon: <BarChartOutlined /> };
    return { grade: 'D', color: '#ff4d4f', icon: <LineChartOutlined /> };
  };

  const efficiency = plan.stats.totalStudyTime > 0 
    ? (plan.stats.totalCompletedQuestions / (plan.stats.totalStudyTime / 60)).toFixed(1)
    : '0';

  const averageQuestionsPerSubject = plan.subjects.length > 0 
    ? (plan.stats.totalTargetQuestions / plan.subjects.length).toFixed(0)
    : '0';

  const completedSubjects = plan.subjects.filter(s => s.status === 'completed').length;
  const performance = getPerformanceGrade(plan.stats.successRate);
  
  return (
    <div className="plan-summary">
      {/* Enhanced Genel İstatistikler */}
      <Card 
        title={
          <Space>
            <BarChartOutlined />
            Detaylı Analiz Raporu
            <Tag color={performance.color} style={{ marginLeft: 8 }}>
              {performance.icon} Not: {performance.grade}
            </Tag>
          </Space>
        } 
        style={{ marginBottom: '24px' }}
        extra={
          <Tag color="blue">
            {completedSubjects}/{plan.subjects.length} Ders Tamamlandı
          </Tag>
        }
      >
        <Row gutter={[16, 16]}>
          <Col xs={12} md={6}>
            <Card size="small" style={{ background: 'linear-gradient(135deg, #fff7e6 0%, #fffbe6 100%)', border: '1px solid #ffe58f' }}>
              <Statistic
                title="Toplam Net Skoru"
                value={plan.stats.netScore.toFixed(1)}
                prefix={<TrophyOutlined style={{ color: '#faad14' }} />}
                valueStyle={{ color: '#faad14', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ background: 'linear-gradient(135deg, #f6ffed 0%, #f0f9ff 100%)', border: '1px solid #b7eb8f' }}>
              <Statistic
                title="Verimlilik"
                value={efficiency}
                suffix="soru/saat"
                prefix={<LineChartOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ background: 'linear-gradient(135deg, #e6f7ff 0%, #f0f5ff 100%)', border: '1px solid #91d5ff' }}>
              <Statistic
                title="Çalışma Süresi"
                value={Math.round(plan.stats.totalStudyTime / 60)}
                suffix="saat"
                prefix={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
                valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ background: 'linear-gradient(135deg, #fff0f6 0%, #f9f0ff 100%)', border: '1px solid #d3adf7' }}>
              <Statistic
                title="Başarı Oranı"
                value={plan.stats.successRate}
                suffix="%"
                prefix={performance.icon}
                valueStyle={{ 
                  color: performance.color,
                  fontWeight: 'bold'
                }}
              />
            </Card>
          </Col>
        </Row>

        <Divider />
        
        {/* Advanced Progress Visualization */}
        <div style={{ marginTop: '16px' }}>
          <Row gutter={16}>
            <Col span={12}>
              <Title level={5} style={{ marginBottom: '8px' }}>
                <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                Plan İlerlemesi
              </Title>
              <Progress
                percent={plan.stats.completionRate}
                status={plan.stats.completionRate === 100 ? 'success' : 'active'}
                strokeColor={{
                  '0%': '#108ee9',
                  '50%': '#1890ff',
                  '100%': '#52c41a',
                }}
                strokeWidth={12}
                format={(percent) => `${percent}%`}
              />
              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">
                  {plan.stats.totalCompletedQuestions}/{plan.stats.totalTargetQuestions} soru
                </Text>
                <Text strong style={{ color: plan.stats.completionRate >= 75 ? '#52c41a' : '#faad14' }}>
                  {plan.stats.completionRate >= 75 ? 'Hedefte!' : 'Devam et!'}
                </Text>
              </div>
            </Col>
            <Col span={12}>
              <Title level={5} style={{ marginBottom: '8px' }}>
                <FireOutlined style={{ color: '#ff4d4f', marginRight: '8px' }} />
                Performans Skoru
              </Title>
              <Progress
                type="circle"
                percent={plan.stats.successRate}
                strokeColor={{
                  '0%': '#ff4d4f',
                  '50%': '#faad14',
                  '100%': '#52c41a',
                }}
                format={() => (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: performance.color }}>
                      {performance.grade}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {plan.stats.successRate}%
                    </div>
                  </div>
                )}
                size={120}
              />
            </Col>
          </Row>
        </div>
      </Card>

      {/* Enhanced Ders Bazlı Detay */}
      <Card 
        title={
          <Space>
            <BarChartOutlined />
            Ders Performans Analizi
          </Space>
        }
        extra={
          <Text type="secondary">
            {plan.subjects.length} Ders • Ortalama {averageQuestionsPerSubject} Soru/Ders
          </Text>
        }
      >
        <Row gutter={[16, 16]}>
          {plan.subjects.map((subject, index) => {
            const subjectCompletion = Math.round((subject.completedQuestions / subject.targetQuestions) * 100);
            const subjectNet = Math.max(subject.correctAnswers - (subject.wrongAnswers / 4), 0);
            const subjectSuccessRate = subject.completedQuestions > 0 
              ? Math.round((subject.correctAnswers / subject.completedQuestions) * 100) 
              : 0;
            
            const getSubjectIcon = (subjectName: string) => {
              const icons: Record<string, string> = {
                matematik: '📐',
                turkce: '',
                kimya: '🧪',
                fizik: '🔬',
                biyoloji: '🌱',
                tarih: '',
                cografya: '🌍',
                felsefe: '🤔',
                edebiyat: '',
                ingilizce: '🇬🇧'
              };
              return icons[subjectName.toLowerCase()] || '';
            };

            return (
              <Col xs={24} md={12} lg={8} key={index}>
                <Card 
                  size="small" 
                  style={{ 
                    background: subjectCompletion === 100 
                      ? 'linear-gradient(135deg, #f6ffed 0%, #f0f9ff 100%)'
                      : subjectCompletion >= 75
                      ? 'linear-gradient(135deg, #fff7e6 0%, #fffbe6 100%)'
                      : 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
                    border: `2px solid ${
                      subjectCompletion === 100 ? '#52c41a' :
                      subjectCompletion >= 75 ? '#faad14' : '#d9d9d9'
                    }`,
                    borderRadius: '12px',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                  hoverable
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <Title level={5} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '20px' }}>{getSubjectIcon(subject.subject)}</span>
                      {subject.subject.charAt(0).toUpperCase() + subject.subject.slice(1)}
                    </Title>
                    <Tag 
                      color={
                        subject.status === 'completed' ? 'success' :
                        subject.status === 'in_progress' ? 'processing' :
                        subject.status === 'skipped' ? 'error' : 'default'
                      }
                      style={{ fontSize: '10px' }}
                    >
                      {subject.status === 'completed' ? 'Tamamlandı' :
                       subject.status === 'in_progress' ? '🔄 Devam Ediyor' :
                       subject.status === 'skipped' ? 'Atlandı' : 'Başlanmadı'}
                    </Tag>
                  </div>
                  
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">İlerleme</Text>
                      <Text strong style={{ color: subjectCompletion >= 100 ? '#52c41a' : '#1890ff' }}>
                        {subject.completedQuestions}/{subject.targetQuestions}
                      </Text>
                    </div>
                    
                    <Progress
                      percent={subjectCompletion}
                      size="small"
                      status={subject.status === 'completed' ? 'success' : 'active'}
                      strokeColor={
                        subjectCompletion === 100 ? '#52c41a' :
                        subjectCompletion >= 75 ? '#faad14' : '#1890ff'
                      }
                      format={() => `${subjectCompletion}%`}
                    />
                    
                    <Row gutter={8} style={{ marginTop: '8px' }}>
                      <Col span={8}>
                        <div style={{ textAlign: 'center', padding: '4px', background: 'rgba(250, 173, 20, 0.1)', borderRadius: '6px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#faad14' }}>
                            {subjectNet.toFixed(1)}
                          </div>
                          <Text type="secondary" style={{ fontSize: '10px' }}>Net</Text>
                        </div>
                      </Col>
                      <Col span={8}>
                        <div style={{ textAlign: 'center', padding: '4px', background: 'rgba(24, 144, 255, 0.1)', borderRadius: '6px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1890ff' }}>
                            {Math.round(subject.studyTime / 60)}dk
                          </div>
                          <Text type="secondary" style={{ fontSize: '10px' }}>Süre</Text>
                        </div>
                      </Col>
                      <Col span={8}>
                        <div style={{ textAlign: 'center', padding: '4px', background: 'rgba(82, 196, 26, 0.1)', borderRadius: '6px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#52c41a' }}>
                            {subjectSuccessRate}%
                          </div>
                          <Text type="secondary" style={{ fontSize: '10px' }}>Doğru</Text>
                        </div>
                      </Col>
                    </Row>
                  </Space>
                </Card>
              </Col>
            );
          })}
        </Row>
      </Card>
    </div>
  );
};

export default PlanSummary;