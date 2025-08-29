import React, { useState, useEffect, useRef } from 'react';
import {
  Card, 
  Typography, 
  Space, 
  Row, 
  Col, 
  Button,
  DatePicker,
  message,
  Modal
} from 'antd';
import { 
  CalendarOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { useLocation } from 'react-router-dom';
import { useAuth, useIsStudent, useIsCoach } from '../../contexts/AuthContext';
import { apiRequest } from '../../services/api';
import DailyTable from './bones/DailyTable/DailyTable';

import CreatePlanModal from './bones/CreatePlan/CreatePlanModal';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

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
  const isFree = (_user?.plan?.tier as any) === 'free';
  const isStudent = useIsStudent();
  const isCoach = useIsCoach();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [currentPlan, setCurrentPlan] = useState<DailyPlan | null>(null);
  const [activeTab] = useState<string>('daily');
  const location = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Tour targets
  const headerRef = useRef<HTMLDivElement | null>(null);
  const datePickerRef = useRef<HTMLDivElement | null>(null);
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const dailyTableRef = useRef<HTMLDivElement | null>(null);
  // monthly calendar removed

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

  // URL'ye göre tab senkronize et (ayrı sayfalar)
  useEffect(() => {
    // Study plan tek sekme: günlük
  }, [location.pathname]);

  useEffect(() => {
  const target = '/study-plan';
    if (window.location.pathname !== target) {
      window.history.replaceState({}, '', target);
    }
  }, [activeTab]);

  // Plan var mı kontrolü
  const hasPlan = currentPlan !== null;

  return (
    <div className="study-plan-page">
      <Modal
        open={!!isFree}
        closable={false}
        maskClosable={false}
        getContainer={() => (document.querySelector('.app-content') as HTMLElement) || document.body}
        footer={[
          <Button key="upgrade" type="primary" onClick={() => { window.location.href = 'https://nikykskoclugu.com.tr/#iletisim'; }}>
            Premium’a Yükselt
          </Button>
        ]}
      >
  <Title level={4}>Günlük Programlar</Title>
  <Text>Bu sayfa, öğrencinin günlük çalışma programını planlama ve takibini içerir. Premium üyelik ile koç yönlendirmeleri ve düzenleme özellikleri aktif olur.</Text>
      </Modal>
      {/* Header */}
  <div className="page-header" ref={headerRef as any}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ fontWeight: 500, fontSize: '24px' }}>
      <CalendarOutlined /> Günlük Programlar
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
          <div className="study-plan-view-wrapper">
            {activeTab === 'daily' && (
              <div ref={dailyTableRef as any} className="stagger-item">
                <DailyTable
                  plan={currentPlan}
                  onSubjectUpdate={handleSubjectUpdate}
                  onPlanUpdate={(updateData) => handleUpdatePlan(currentPlan._id, updateData)}
                  onRefresh={() => fetchDailyPlan(selectedDate)}
                  loading={loading}
                />
              </div>
            )}
            {/* Monthly calendar removed; merged into Study Tracker */}
            {/* Analytics sekmesi kaldırıldı; ilgili içerik Dashboard'a taşındı */}
          </div>
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

   
    </div>
  );
};

export default StudyPlan;