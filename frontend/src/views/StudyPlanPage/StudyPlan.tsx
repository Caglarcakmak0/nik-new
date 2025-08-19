import React, { useState, useEffect, useRef } from 'react';
import {
  Card, 
  Typography, 
  Space, 
  Row, 
  Col, 
  Button,
  DatePicker,
  Tabs,
  message
} from 'antd';
import { 
  CalendarOutlined,
  TableOutlined,
  BarChartOutlined,
  PlusOutlined,
  BulbOutlined,
  TrophyOutlined,
  GiftOutlined
} from '@ant-design/icons';
import { useAuth, useIsStudent, useIsCoach } from '../../contexts/AuthContext';
import { apiRequest } from '../../services/api';
import DailyTable from './bones/DailyTable/DailyTable';
import MonthlyCalendar from './bones/MonthlyCalendar/MonthlyCalendar';

import CreatePlanModal from './bones/CreatePlan/CreatePlanModal';
import AdvancedAnalytics from './bones/AdvancedAnalytics/AdvancedAnalytics';
import StudyRecommendations from './bones/StudyRecommendations/StudyRecommendations';
import Leaderboard from './bones/Leaderboard/Leaderboard';
import Achievements from './bones/Achievements/Achievements';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import StudyPlanTour from '../../components/tour/StudentTour/StudyPlanTour';
import './StudyPlan.scss';

const { Title, Text } = Typography;

interface DailyPlan {
  _id: string;
  date: string;
  title: string;
  subjects: Array<{
    subject: string;
    targetQuestions: number;
    targetTime?: number;
    topics: string[];
    description?: string;
    priority: number;
    completedQuestions: number;
    correctAnswers: number;
    wrongAnswers: number;
    blankAnswers: number;
    studyTime: number;
    status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
    sessionIds: string[];
  }>;
  mockExam?: {
    isScheduled: boolean;
    examType: string;
    scheduledTime: string;
    duration: number;
    subjects: string[];
    isCompleted: boolean;
  };
  stats: {
    totalTargetQuestions: number;
    totalCompletedQuestions: number;
    totalTargetTime: number;
    totalStudyTime: number;
    completionRate: number;
    netScore: number;
    successRate: number;
  };
  status: 'draft' | 'active' | 'completed' | 'failed' | 'archived';
  motivationNote?: string;
  dailyGoal?: string;
}

const StudyPlan: React.FC = () => {
  const { user: _user } = useAuth();
  const isStudent = useIsStudent();
  const isCoach = useIsCoach();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [currentPlan, setCurrentPlan] = useState<DailyPlan | null>(null);
  const [activeTab, setActiveTab] = useState<string>('daily');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Tour targets
  const headerRef = useRef<HTMLDivElement | null>(null);
  const datePickerRef = useRef<HTMLDivElement | null>(null);
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const dailyTableRef = useRef<HTMLDivElement | null>(null);
  const monthlyCalendarRef = useRef<HTMLDivElement | null>(null);

  // Günlük plan getir (GERÇEK API)
  const fetchDailyPlan = async (date: Dayjs) => {
    try {
      setLoading(true);
      const dateString = date.format('YYYY-MM-DD');
      const response = await apiRequest(`/daily-plans/by-date/${dateString}`);
      if (response && response.data) {
        setCurrentPlan(response.data);
      } else {
        setCurrentPlan(null);
      }
    } catch (error: any) {
      // 404 ise plan yok kabul et, diğerlerinde mesaj göster
      const msg: string = (error && error.message) || '';
      if (msg && (msg.includes('bulunamadı') || msg.includes('404'))) {
        setCurrentPlan(null);
      } else {
        console.error('Plan fetch error:', error);
        message.error('Plan yüklenirken hata oluştu');
      }
    } finally {
      setLoading(false);
    }
  };

  // Plan oluştur
  const handleCreatePlan = async (planData: any) => {
    try {
      setLoading(true);
      
      const response = await apiRequest('/daily-plans', {
        method: 'POST',
        body: JSON.stringify({
          ...planData,
          date: selectedDate.toISOString()
        })
      });
      
      if (response.data) {
        message.success('Günlük plan başarıyla oluşturuldu!');
        setCurrentPlan(response.data);
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('Plan create error:', error);
      message.error('Plan oluşturulurken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Plan güncelle
  const handleUpdatePlan = async (planId: string, updateData: any) => {
    try {
      const response = await apiRequest(`/daily-plans/${planId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      
      if (response.data) {
        setCurrentPlan(response.data);
        message.success('Plan başarıyla güncellendi!');
      }
    } catch (error) {
      console.error('Plan update error:', error);
      message.error('Plan güncellenirken hata oluştu');
    }
  };

  // Subject progress güncelle
  const handleSubjectUpdate = async (subjectIndex: number, updateData: any) => {
    if (!currentPlan) return;
    
    try {
      const response = await apiRequest(
        `/daily-plans/${currentPlan._id}/subjects/${subjectIndex}`,
        {
          method: 'PUT',
          body: JSON.stringify(updateData)
        }
      );
      
      if (response.data) {
        setCurrentPlan(response.data);
      }
    } catch (error) {
      console.error('Subject update error:', error);
      message.error('Ders ilerlemesi güncellenirken hata oluştu');
    }
  };

  // Tarih değiştiğinde plan getir
  useEffect(() => {
    fetchDailyPlan(selectedDate);
  }, [selectedDate]);

  // Plan var mı kontrolü
  const hasPlan = currentPlan !== null;

  return (
    <div className="study-plan-page">
      {/* Header */}
      <div className="page-header" ref={headerRef as any}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ fontWeight: 500, fontSize: '24px' }}>
              <CalendarOutlined /> Çalışma Programı
            </Title>
          </Col>
          <Col>
            <Space>
              <div ref={datePickerRef as any}>
                <DatePicker
                  value={selectedDate}
                  onChange={(date) => date && setSelectedDate(date)}
                  format="DD MMMM YYYY"
                  placeholder="Tarih seçin"
                />
              </div>
              {!hasPlan && isCoach && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setShowCreateModal(true)}
                  loading={loading}
                >
                  Plan Oluştur
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </div>
              
      {/* Content */}
      <div className="page-content" ref={tabsRef as any}>
        {hasPlan ? (
          // Plan var - Tabs ile farklı görünümler
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab} 
            size="large"
            animated={{ tabPane: true }}
            tabBarStyle={{ 
              marginBottom: '24px',
              transition: 'all 0.3s ease-in-out'
            }}
            items={[
              {
                key: 'daily',
                label: (
                  <span id="tab-daily-label" style={{ fontWeight: 500 }}>
                    <TableOutlined style={{ marginRight: '5px' }} />
                    Günlük Tablo
                  </span>
                ),
                children: (
                  <div ref={dailyTableRef as any} className="stagger-item">
                    <DailyTable
                      plan={currentPlan}
                      onSubjectUpdate={handleSubjectUpdate}
                      onPlanUpdate={(updateData) => handleUpdatePlan(currentPlan._id, updateData)}
                      onRefresh={() => fetchDailyPlan(selectedDate)}
                      loading={loading}
                    />
                  </div>
                )
              },

              {
                key: 'monthly',
                label: (
                  <span id="tab-monthly-label" style={{ fontWeight: 500 }}>
                    <CalendarOutlined style={{ marginRight: '5px' }} />
                    Aylık Görünüm
                  </span>
                ),
                children: (
                  <div ref={monthlyCalendarRef as any} className="stagger-item">
                    <MonthlyCalendar
                      selectedDate={selectedDate}
                      onDateSelect={setSelectedDate}
                      currentPlan={currentPlan}
                    />
                  </div>
                )
              },
              {
                key: 'analytics',
                label: (
                  <span id="tab-analytics-label" style={{ fontWeight: 500 }}>
                    <BarChartOutlined style={{ marginRight: '5px' }} />
                    Çalışma İstatistikleri
                  </span>
                ),
                forceRender: true,
                children: (
                  <AdvancedAnalytics
                    plan={currentPlan}
                    selectedDate={selectedDate}
                    onRefresh={() => fetchDailyPlan(selectedDate)}
                  />
                )
              },
              {
                key: 'recommendations',
                label: (
                  <span id="tab-recommendations-label" style={{ opacity: 0.5, fontWeight: 500 }}>
                    <BulbOutlined style={{ marginRight: '5px' }} />
                    AI Öneriler
                    <span style={{ fontSize: '10px', marginLeft: '8px', color: '#999' }}>(Yakında)</span>
                  </span>
                ),
                disabled: true,
                children: (
                  <StudyRecommendations
                    plan={currentPlan}
                    selectedDate={selectedDate}
                    onStartRecommendation={(rec) => {
                      message.info(`${rec.title} başlatıldı! Timer sayfasına yönlendiriliyorsunuz.`);
                    }}
                  />
                )
              },
              {
                key: 'leaderboard',
                label: (
                  <span id="tab-leaderboard-label" style={{ fontWeight: 500 }}>
                    <TrophyOutlined style={{ marginRight: '5px' }} />
                    Liderlik Tablosu
                  </span>
                ),
                children: <Leaderboard />
              },
              {
                key: 'achievements',
                label: (
                  <span id="tab-achievements-label" style={{ opacity: 0.5, fontWeight: 500 }}>
                    <GiftOutlined style={{ marginRight: '5px' }} />
                    Rozetlerim
                    <span style={{ fontSize: '10px', marginLeft: '8px', color: '#999' }}>(Yakında)</span>
                  </span>
                ),
                disabled: true,
                children: <Achievements />
              }
            ]}
          />
        ) : (
          // Plan yok - Boş durum
          <Card>
            <div className="study-plan-empty">
              <CalendarOutlined style={{ 
                fontSize: '72px', 
                color: 'var(--sp-accent-color, #1677ff)', 
                marginBottom: '24px' 
              }} />
              <Title level={3}>
                {selectedDate.format('DD MMMM YYYY')} için plan yok
              </Title>
              <Text type="secondary" style={{ fontSize: '16px', display: 'block', marginBottom: '32px' }}>
                {isStudent 
                  ? 'Bu tarih için koçunuz tarafından bir program oluşturulmamış'
                  : 'Bu tarih için çalışma programı oluşturarak hedeflerinizi belirleyin'
                }
              </Text>
              
              <Space size="large">
                {isCoach && (
                  <Button
                    type="primary"
                    size="large"
                    icon={<PlusOutlined />}
                    onClick={() => setShowCreateModal(true)}
                    loading={loading}
                  >
                    Yeni Plan Oluştur
                  </Button>
                )}
                
                <Button
                  size="large"
                  onClick={() => setSelectedDate(dayjs())}
                  disabled={selectedDate.isSame(dayjs(), 'day')}
                >
                  Bugüne Dön
                </Button>
              </Space>
              
              {/* Quick suggestions */}
              <div style={{ marginTop: '32px', textAlign: 'left', maxWidth: '400px', margin: '32px auto 0' }}>
                <Text strong>Plan önerileri:</Text>
                <ul style={{ marginTop: '8px', color: '#8c8c8c' }}>
                  <li>Hedef soru sayılarını belirleyin</li>
                  <li>Çalışma sürelerini planlayın</li>
                  <li>Konuları öncelik sırasına koyun</li>
                  <li>Deneme sınavı ekleyin</li>
                </ul>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Create Plan Modal */}
      <CreatePlanModal
        visible={showCreateModal}
        onCancel={() => setShowCreateModal(false)}
        onSubmit={handleCreatePlan}
        selectedDate={selectedDate}
        loading={loading}
      />

      {/* Page specific tour */}
      <StudyPlanTour
        userId={_user?._id}
        targets={{
          getHeaderEl: () => (headerRef.current as any) || null,
          getDatePickerEl: () => (datePickerRef.current as any) || null,
          getDailyTabEl: () => document.getElementById('tab-daily-label') as HTMLElement | null,
          getMonthlyTabEl: () => document.getElementById('tab-monthly-label') as HTMLElement | null,
          getLeaderboardTabEl: () => document.getElementById('tab-leaderboard-label') as HTMLElement | null,
        }}
      />
    </div>
  );
};

export default StudyPlan;