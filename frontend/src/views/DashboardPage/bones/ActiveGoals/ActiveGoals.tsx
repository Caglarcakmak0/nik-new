import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Typography, Carousel, Tooltip } from 'antd';
import { PlusOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../../contexts/ThemeContext';

const { Text, Title } = Typography;

interface Goal {
  id: string;
  universityName: string;
  department: string;
  priority: number;
  progress: number;
  streak: number;
  daysRemaining: number;
  image?: string; // Okul görseli URL'i
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
  // Slayt göstergesi kaldırıldığı için state'e gerek yok

  const getPriorityColor = (priority: number) => {
    if (priority <= 3) return '#ff4d4f';
    if (priority <= 6) return '#faad14';
    return '#52c41a';
  };

  const getPriorityText = (priority: number) => {
    if (priority <= 3) return 'Yüksek';
    if (priority <= 6) return 'Orta';
    return 'Düşük';
  };

  // Üniversiteye özel kampüs fotoğrafları (birden fazla foto için)
  const getUniversityImages = (universityName: string): string[] => {
    const universityImages: { [key: string]: string[] } = {
      'İTÜ': [
        'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&h=800&fit=crop'
      ],
      'İstanbul Teknik Üniversitesi': [
        'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&h=800&fit=crop'
      ],
      'Boğaziçi': [
        'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1580537659466-0a9bfa916a54?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=1200&h=800&fit=crop'
      ],
      'Boğaziçi Üniversitesi': [
        'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1580537659466-0a9bfa916a54?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=1200&h=800&fit=crop'
      ],
      'ODTÜ': [
        'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1564981797816-1043664bf78d?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&h=800&fit=crop'
      ],
      'Orta Doğu Teknik Üniversitesi': [
        'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1564981797816-1043664bf78d?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&h=800&fit=crop'
      ],
      'İstanbul Üniversitesi': [
        'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&h=800&fit=crop'
      ],
      'Ankara Üniversitesi': [
        'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&h=800&fit=crop'
      ],
      'Hacettepe': [
        'https://images.unsplash.com/photo-1569467701197-ddac4b2c605a?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&h=800&fit=crop'
      ],
      'Hacettepe Üniversitesi': [
        'https://images.unsplash.com/photo-1569467701197-ddac4b2c605a?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&h=800&fit=crop'
      ],
      'Gazi': [
        'https://images.unsplash.com/photo-1564981797816-1043664bf78d?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&h=800&fit=crop'
      ],
      'Bilkent': [
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&h=800&fit=crop'
      ],
      'Koç': [
        'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1580537659466-0a9bfa916a54?w=1200&h=800&fit=crop'
      ],
      'Sabancı': [
        'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1564981797816-1043664bf78d?w=1200&h=800&fit=crop'
      ],
      'Galatasaray': [
        'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&h=800&fit=crop'
      ],
      'Yıldız Teknik': [
        'https://images.unsplash.com/photo-1569467701197-ddac4b2c605a?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&h=800&fit=crop'
      ]
    };

    for (const [key, images] of Object.entries(universityImages)) {
      if (universityName.toLowerCase().includes(key.toLowerCase())) {
        return images;
      }
    }
    return ['https://images.unsplash.com/photo-1562774053-701939374585?w=1200&h=800&fit=crop'];
  };

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

  // Her render'da farklı foto seç (carousel etkisi için)
  const getRandomUniversityImage = (universityName: string) => {
    const images = getUniversityImages(universityName);
    const randomIndex = Math.floor(Math.random() * images.length);
    return images[randomIndex];
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
        <div style={{ position: 'relative', borderRadius: '16px' }}>
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
          >
            {goals.map((goal) => (
              <div key={goal.id} style={{ padding: '0 8px' }}>
                <div
                  style={{
                    height: '320px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    background: goal.image 
                      ? `url(${goal.image}) center/cover`
                      : `url(${getRandomUniversityImage(goal.universityName)}) center/cover, ${getUniversityGradient(goal.universityName)}`,
                    boxShadow: isDark 
                      ? '0 8px 32px rgba(0,0,0,0.3)' 
                      : '0 8px 32px rgba(0,0,0,0.1)'
                  }}
                  
                  onClick={() => navigate('/goals')}
                >
                  {/* Gradient Overlay */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%)',
                    zIndex: 1
                  }} />

                  {/* Content */}
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '24px',
                    color: 'white',
                    zIndex: 2
                  }}>
                    

                    {/* Department */}
                    <Text 
                      style={{ 
                        color: 'rgba(255,255,255,0.8)',
                        fontSize: '16px',
                        display: 'block',
                        marginBottom: '8px'
                      }}
                    >
                      {goal.department}
                    </Text>

                    {/* University Name */}
                    <Title 
                      level={3} 
                      style={{ 
                        color: 'white',
                        margin: 0,
                        fontSize: '28px',
                        fontWeight: 700,
                        lineHeight: 1.2,
                        marginBottom: '16px'
                      }}
                    >
                      {goal.universityName}
                    </Title>


                  </div>
                </div>
              </div>
            ))}
          </Carousel>
          
        
        </div>
      ) : (
        <div style={{ 
          textAlign: 'center', 
          padding: '64px 24px',
          background: isDark ? '#262626' : '#fafafa',
          borderRadius: '16px',
          border: `2px dashed ${isDark ? '#434343' : '#d9d9d9'}`
        }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}></div>
          <Title level={3} type="secondary" style={{ marginBottom: '16px' }}>
            Henüz hedef okul eklemedin
          </Title>
          <Text 
            type="secondary" 
            style={{ 
              marginBottom: '32px', 
              display: 'block',
              fontSize: '16px',
              maxWidth: '400px',
              margin: '0 auto 32px'
            }}
          >
            YKS yolculuğunda hedeflerini belirlemek için üniversite ve bölüm ekle
          </Text>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => navigate('/goals')}
            size="large"
            style={{
              height: '48px',
              paddingLeft: '24px',
              paddingRight: '24px',
              fontSize: '16px'
            }}
          >
            İlk Hedefini Ekle
          </Button>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
          .ant-carousel .ant-carousel-dots li.ant-carousel-dot-active button {
            background-color: ${isDark ? '#1890ff' : '#1890ff'} !important;
          }
          .ant-carousel .ant-carousel-dots li button {
            background-color: ${isDark ? '#434343' : '#d9d9d9'} !important;
            border-radius: 50% !important;
            width: 8px !important;
            height: 8px !important;
            transition: all 0.3s ease !important;
          }
          .ant-carousel .ant-carousel-dots li.ant-carousel-dot-active button:hover {
            background-color: ${isDark ? '#40a9ff' : '#40a9ff'} !important;
          }
          .ant-carousel .ant-carousel-dots li button:hover {
            background-color: ${isDark ? '#595959' : '#bfbfbf'} !important;
          }
          .ant-carousel .ant-carousel-dots {
            bottom: -30px !important;
          }
          .ant-carousel .ant-carousel-dots li {
            margin: 0 4px !important;
          }
        `
      }} />
    </Card>
  );
};

export default ActiveGoals;