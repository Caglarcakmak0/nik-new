import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Typography, Carousel } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../../contexts/ThemeContext';
import { getUniversityImages, getRandomUniversityImage } from '../../../../constants/universityImages';
import './ActiveGoals.scss';

const { Text, Title } = Typography;

interface Goal {
  id: string;
  universityName: string;
  department: string;
  priority: number;
  progress: number;
  streak: number;
  daysRemaining: number;
}

interface ActiveGoalsProps {
  goals: Goal[];
  loading?: boolean;
}

const ActiveGoals: React.FC<ActiveGoalsProps> = ({ goals, loading = false }) => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const carouselRef = useRef<any>(null);
  const [autoPlay, setAutoPlay] = useState(true);

  const getUniversityGradient = (universityName: string) => {
    const gradients: { [key: string]: string } = {
      'İTÜ': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'İstanbul Teknik Üniversitesi': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'Boğaziçi': 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'Boğaziçi Üniversitesi': 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'ODTÜ': 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      'Orta Doğu Teknik Üniversitesi': 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      'Koç': 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      'Sabancı': 'linear-gradient(135deg, #a8e6cf 0%, #dcedc1 100%)',
      'Bilkent': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'Hacettepe': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'default': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    };
    
    for (const [key, gradient] of Object.entries(gradients)) {
      if (universityName.toLowerCase().includes(key.toLowerCase())) {
        return gradient;
      }
    }
    return gradients.default;
  };

  // Görsel kaynağı: Her zaman üniversite imaj havuzu
  const getGoalImage = (goal: Goal): string => {
    return getRandomUniversityImage(goal.universityName);
  };

  const toggleAutoPlay = () => {
    setAutoPlay(!autoPlay);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        carouselRef.current?.prev();
      } else if (e.key === 'ArrowRight') {
        carouselRef.current?.next();
      } else if (e.key === ' ') {
        e.preventDefault();
        toggleAutoPlay();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <Card
      loading={loading}
      style={{
        background: isDark ? '#141414' : 'transparent',
        border: 'none',
        borderBottom: 'none'
      }}
    >
      {goals && goals.length > 0 ? (
        <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden' }}>
          <Carousel
            ref={carouselRef}
            autoplay={autoPlay}
            autoplaySpeed={4000}
            dots={false}
            infinite={true}
            speed={600}
            slidesToShow={1}
            slidesToScroll={1}
            swipeToSlide={true}
            touchMove={true}
            className="active-goals-carousel"
          >
                         {goals.map((goal) => (
               <div key={goal.id} style={{ padding: '0 8px' }}>
                 <div
                   className="goal-card"
                   style={{
                     background: `url(${getGoalImage(goal)}) center/cover`
                   }}
                   onClick={() => navigate('/goals')}
                 >
                   {/* Gradient Overlay */}
                   <div className="gradient-overlay" />

                   {/* Content */}
                   <div className="goal-content">
                     {/* Department */}
                     <Text className="goal-department">
                       {goal.department}
                     </Text>

                     {/* University Name */}
                     <Title level={3} className="goal-university">
                       {goal.universityName}
                     </Title>
                   </div>
                 </div>
               </div>
             ))}
          </Carousel>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon"></div>
          <Title level={3} type="secondary" className="empty-state-title">
            Henüz hedef okul eklemedin
          </Title>
          <Text type="secondary" className="empty-state-description">
            YKS yolculuğunda hedeflerini belirlemek için üniversite ve bölüm ekle
          </Text>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => navigate('/goals')}
            size="large"
            className="empty-state-button"
          >
            İlk Hedefini Ekle
          </Button>
        </div>
      )}


    </Card>
  );
};

export default ActiveGoals;