import React, { useState, useEffect } from 'react';
import { Card, Row, Col, InputNumber, Button, Statistic, Progress, Typography, Space } from 'antd';
import { 
  PlusOutlined, 
  MinusOutlined, 
  CalculatorOutlined, 
  TrophyOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import './QuestionTracker.scss';

const { Title, Text } = Typography;

interface QuestionStats {
  targetQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  blankAnswers: number;
  netScore: number;
  completionRate: number;
}

interface QuestionTrackerProps {
  initialStats?: Partial<QuestionStats>;
  targetQuestions?: number;
  onStatsChange?: (stats: QuestionStats) => void;
  disabled?: boolean;
  size?: 'small' | 'large';
}

const QuestionTracker: React.FC<QuestionTrackerProps> = ({ 
  initialStats = {},
  targetQuestions = 0,
  onStatsChange,
  disabled = false,
  size = 'large'
}) => {
  const [stats, setStats] = useState<QuestionStats>({
    targetQuestions: targetQuestions || 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    blankAnswers: 0,
    netScore: 0,
    completionRate: 0,
    ...initialStats
  });

  // Net Score hesaplama
  const calculateNetScore = (correct: number, wrong: number): number => {
    return Math.max(correct - (wrong / 4), 0);
  };

  // Completion Rate hesaplama
  const calculateCompletionRate = (correct: number, wrong: number, blank: number, target: number): number => {
    if (target === 0) return 0;
    const totalAttempted = correct + wrong + blank;
    return Math.round((totalAttempted / target) * 100);
  };

  // Stats güncelleme
  const updateStats = (newValues: Partial<QuestionStats>) => {
    const updatedStats = { ...stats, ...newValues };
    
    // Otomatik hesaplamalar
    updatedStats.netScore = calculateNetScore(updatedStats.correctAnswers, updatedStats.wrongAnswers);
    updatedStats.completionRate = calculateCompletionRate(
      updatedStats.correctAnswers, 
      updatedStats.wrongAnswers, 
      updatedStats.blankAnswers, 
      updatedStats.targetQuestions
    );
    
    setStats(updatedStats);
    onStatsChange?.(updatedStats);
  };

  // Soru sayısı değiştirme fonksiyonları
  const changeCount = (type: 'correct' | 'wrong' | 'blank', delta: number) => {
    const newValue = Math.max(0, stats[`${type}Answers`] + delta);
    updateStats({ [`${type}Answers`]: newValue });
  };

  // Direct input handler
  const handleDirectInput = (type: 'correct' | 'wrong' | 'blank', value: number | null) => {
    if (value === null || value < 0) return;
    updateStats({ [`${type}Answers`]: value });
  };

  // Success rate hesaplama
  const getTotalAttempted = () => stats.correctAnswers + stats.wrongAnswers + stats.blankAnswers;
  const getSuccessRate = () => {
    const total = getTotalAttempted();
    return total > 0 ? Math.round((stats.correctAnswers / total) * 100) : 0;
  };

  // Remaining questions
  const getRemainingQuestions = () => Math.max(0, stats.targetQuestions - getTotalAttempted());

  // Component boyutuna göre stil
  const isSmall = size === 'small';

  useEffect(() => {
    if (targetQuestions !== stats.targetQuestions) {
      updateStats({ targetQuestions });
    }
  }, [targetQuestions]);

  return (
    <Card 
      title={
        <div className="question-tracker-header">
          <CalculatorOutlined /> Soru Takibi
          {stats.targetQuestions > 0 && (
            <Text type="secondary">({stats.targetQuestions} soru hedefi)</Text>
          )}
        </div>
      }
      size={isSmall ? 'small' : 'default'}
      className={`question-tracker ${isSmall ? 'small' : 'large'}`}
    >
      {/* Soru Girişi */}
      <div className="question-inputs">
        <Row gutter={[16, 16]}>
          {/* Doğru */}
          <Col xs={24} md={8}>
            <div className="question-input-group correct">
              <div className="label">
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <span>Doğru</span>
              </div>
              <div className="input-controls">
                <Button 
                  type="text" 
                  icon={<MinusOutlined />}
                  size={isSmall ? 'small' : 'middle'}
                  onClick={() => changeCount('correct', -1)}
                  disabled={disabled || stats.correctAnswers <= 0}
                />
                <InputNumber
                  value={stats.correctAnswers}
                  min={0}
                  max={stats.targetQuestions}
                  onChange={(value) => handleDirectInput('correct', value)}
                  disabled={disabled}
                  size={isSmall ? 'small' : 'middle'}
                  className="question-input"
                />
                <Button 
                  type="text" 
                  icon={<PlusOutlined />}
                  size={isSmall ? 'small' : 'middle'}
                  onClick={() => changeCount('correct', 1)}
                  disabled={disabled}
                />
              </div>
            </div>
          </Col>

          {/* Yanlış */}
          <Col xs={24} md={8}>
            <div className="question-input-group wrong">
              <div className="label">
                <span className="wrong-icon">✗</span>
                <span>Yanlış</span>
              </div>
              <div className="input-controls">
                <Button 
                  type="text" 
                  icon={<MinusOutlined />}
                  size={isSmall ? 'small' : 'middle'}
                  onClick={() => changeCount('wrong', -1)}
                  disabled={disabled || stats.wrongAnswers <= 0}
                />
                <InputNumber
                  value={stats.wrongAnswers}
                  min={0}
                  max={stats.targetQuestions}
                  onChange={(value) => handleDirectInput('wrong', value)}
                  disabled={disabled}
                  size={isSmall ? 'small' : 'middle'}
                  className="question-input"
                />
                <Button 
                  type="text" 
                  icon={<PlusOutlined />}
                  size={isSmall ? 'small' : 'middle'}
                  onClick={() => changeCount('wrong', 1)}
                  disabled={disabled}
                />
              </div>
            </div>
          </Col>

          {/* Boş */}
          <Col xs={24} md={8}>
            <div className="question-input-group blank">
              <div className="label">
                <span className="blank-icon">○</span>
                <span>Boş</span>
              </div>
              <div className="input-controls">
                <Button 
                  type="text" 
                  icon={<MinusOutlined />}
                  size={isSmall ? 'small' : 'middle'}
                  onClick={() => changeCount('blank', -1)}
                  disabled={disabled || stats.blankAnswers <= 0}
                />
                <InputNumber
                  value={stats.blankAnswers}
                  min={0}
                  max={stats.targetQuestions}
                  onChange={(value) => handleDirectInput('blank', value)}
                  disabled={disabled}
                  size={isSmall ? 'small' : 'middle'}
                  className="question-input"
                />
                <Button 
                  type="text" 
                  icon={<PlusOutlined />}
                  size={isSmall ? 'small' : 'middle'}
                  onClick={() => changeCount('blank', 1)}
                  disabled={disabled}
                />
              </div>
            </div>
          </Col>
        </Row>
      </div>

      {/* İstatistikler */}
      <div className="question-stats">
        <Row gutter={[16, 16]}>
          <Col xs={12} md={6}>
            <Statistic
              title="Net"
              value={stats.netScore.toFixed(1)}
              prefix={<TrophyOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ 
                fontSize: isSmall ? '16px' : '20px',
                fontWeight: 'bold',
                color: '#faad14'
              }}
            />
          </Col>
          
          <Col xs={12} md={6}>
            <Statistic
              title="Başarı"
              value={getSuccessRate()}
              suffix="%"
              valueStyle={{ 
                fontSize: isSmall ? '16px' : '20px',
                color: getSuccessRate() >= 70 ? '#52c41a' : getSuccessRate() >= 50 ? '#faad14' : '#ff4d4f'
              }}
            />
          </Col>
          
          <Col xs={12} md={6}>
            <Statistic
              title="Tamamlanan"
              value={getTotalAttempted()}
              suffix={`/${stats.targetQuestions}`}
              valueStyle={{ fontSize: isSmall ? '16px' : '20px' }}
            />
          </Col>
          
          <Col xs={12} md={6}>
            <Statistic
              title="Kalan"
              value={getRemainingQuestions()}
              valueStyle={{ 
                fontSize: isSmall ? '16px' : '20px',
                color: getRemainingQuestions() === 0 ? '#52c41a' : '#1890ff'
              }}
            />
          </Col>
        </Row>

        {/* Progress Bar */}
        {stats.targetQuestions > 0 && (
          <div className="completion-progress">
            <Text strong>İlerleme</Text>
            <Progress
              percent={stats.completionRate}
              status={stats.completionRate === 100 ? 'success' : 'active'}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
              format={(percent) => `${percent}% (${getTotalAttempted()}/${stats.targetQuestions})`}
            />
          </div>
        )}
      </div>

      {/* Hızlı Aksiyonlar (sadece large mode'da) */}
      {!isSmall && (
        <div className="quick-actions">
          <Space>
            <Button
              type="primary"
              ghost
              onClick={() => updateStats({ 
                correctAnswers: 0, 
                wrongAnswers: 0, 
                blankAnswers: 0 
              })}
              disabled={disabled}
              size="small"
            >
              Sıfırla
            </Button>
            <Button
              type="primary"
              onClick={() => {
                // Quick +5 doğru
                changeCount('correct', 5);
              }}
              disabled={disabled}
              size="small"
            >
              +5 Doğru
            </Button>
          </Space>
        </div>
      )}
    </Card>
  );
};

export default QuestionTracker;