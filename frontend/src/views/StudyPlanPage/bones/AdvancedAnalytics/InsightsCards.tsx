import React from 'react';
import { Card, Typography } from 'antd';
import { 
  BulbOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  RocketOutlined,
  StarOutlined,
  AimOutlined,
  BookOutlined
} from '@ant-design/icons';
import type { StudyPlanLike } from './analyticsTypes';

const { Title, Text } = Typography;

interface Props {
  plan: StudyPlanLike;
  efficiency: number;
}

const InsightsCards: React.FC<Props> = ({ plan, efficiency }) => {
  return (
    <Card className="insights-card" variant="borderless">
      <div className="card-header">
        <Title level={4}>
          <BulbOutlined /> Performans Önerileri
        </Title>
      </div>
      <div className="insights-content">
        <div className="insights-grid">
          {plan.stats.completionRate < 70 && (
            <div className="insight-card warning">
              <div className="insight-icon">
                <ClockCircleOutlined />
              </div>
              <div className="insight-content">
                <div className="insight-header">
                  <Text strong className="insight-title">Tamamlanma Oranı Düşük</Text>
                </div>
                <Text type="secondary" className="insight-description">
                  Hedeflenen görevlerin %70'inden azını tamamladınız. Önceliklendirme ve zaman planlaması yapın.
                </Text>
              </div>
            </div>
          )}
          {plan.stats.successRate < 60 && (
            <div className="insight-card error">
              <div className="insight-icon">
                <TrophyOutlined />
              </div>
              <div className="insight-content">
                <div className="insight-header">
                  <Text strong className="insight-title">Başarı Oranı Geliştirilmeli</Text>
                </div>
                <Text type="secondary" className="insight-description">
                  Doğru cevap oranı düşük. Konu tekrarları ve soru analizi yapmayı deneyin.
                </Text>
              </div>
            </div>
          )}
          {efficiency < 2 && (
            <div className="insight-card info">
              <div className="insight-icon">
                <RocketOutlined />
              </div>
              <div className="insight-content">
                <div className="insight-header">
                  <Text strong className="insight-title">Verimlilik Artırılabilir</Text>
                </div>
                <Text type="secondary" className="insight-description">
                  Dakika başına soru sayısı düşük. Odak blokları oluşturun ve dikkat dağıtıcıları azaltın.
                </Text>
              </div>
            </div>
          )}
          {plan.stats.totalStudyTime < 120 && (
            <div className="insight-card neutral">
              <div className="insight-icon">
                <BookOutlined />
              </div>
              <div className="insight-content">
                <div className="insight-header">
                  <Text strong className="insight-title">Çalışma Süresi Kısa</Text>
                </div>
                <Text type="secondary" className="insight-description">
                  Toplam süre 2 saatin altında. Günlük planınıza ekstra bir blok ekleyin.
                </Text>
              </div>
            </div>
          )}
          {plan.stats.completionRate >= 80 && plan.stats.successRate >= 70 && (
            <div className="insight-card success">
              <div className="insight-icon">
                <StarOutlined />
              </div>
              <div className="insight-content">
                <div className="insight-header">
                  <Text strong className="insight-title">Mükemmel Performans!</Text>
                </div>
                <Text type="secondary" className="insight-description">
                  Harika ilerliyorsunuz. Aynı tempoda devam edin ve hedefi artırmayı düşünün.
                </Text>
              </div>
            </div>
          )}
          {plan.subjects.some(s => {
            const total = s.correctAnswers + s.wrongAnswers + s.blankAnswers;
            const acc = total > 0 ? (s.correctAnswers / total) * 100 : 0;
            return acc < 50;
          }) && (
            <div className="insight-card error">
              <div className="insight-icon">
                <AimOutlined />
              </div>
              <div className="insight-content">
                <div className="insight-header">
                  <Text strong className="insight-title">Zayıf Konu Tespit</Text>
                </div>
                <Text type="secondary" className="insight-description">
                  %50 altı başarı görülen konular için ek tekrar planlayın.
                </Text>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default InsightsCards;