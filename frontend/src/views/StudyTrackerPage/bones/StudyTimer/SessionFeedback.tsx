import React, { useState } from 'react';
import { Modal, Input, Button, Space, Typography, message, Popconfirm } from 'antd';
import { useTheme } from '../../../../contexts/ThemeContext';
import { CheckOutlined, EditOutlined, TrophyOutlined } from '@ant-design/icons';
import QualityRating from './QualityRating';
import MoodSelector from './MoodSelector';
import DistractionCounter from './DistractionCounter';

const { TextArea } = Input;
const { Title, Text } = Typography;

type MoodType = 'Enerjik' | 'Normal' | 'Yorgun' | 'Motivasyonsuz' | 'Stresli' | 'Mutlu';

interface SessionFeedbackData {
  quality: number;
  mood: MoodType;
  distractions: number;
  notes: string;
}

interface SessionFeedbackProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (feedbackData: SessionFeedbackData) => void;
  sessionData?: {
    subject: string;
    technique: string;
    duration: number;
    targetSessions?: number;
    completedSessions?: number;
  };
}

const SessionFeedback: React.FC<SessionFeedbackProps> = ({
  visible,
  onCancel,
  onSubmit,
  sessionData
}) => {
  const [feedback, setFeedback] = useState<SessionFeedbackData>({
    quality: 0,
    mood: undefined as any, // Zorunlu seçilecek
    distractions: 0,
    notes: ''
  });
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (feedback.quality === 0) {
      message.error('Lütfen çalışma kalitesini değerlendirin!');
      return;
    }

  if (!feedback.mood) {
      message.error('Lütfen ruh halinizi seçin!');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(feedback);
      
      // Reset form
      setFeedback({
        quality: 0,
        mood: undefined as any,
        distractions: 0,
        notes: ''
      });
      
      message.success('Geri bildiriminiz kaydedildi!');
    } catch (error) {
      message.error('Geri bildirim kaydedilemedi. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form
    setFeedback({
      quality: 0,
      mood: undefined as any,
      distractions: 0,
      notes: ''
    });
    onCancel();
  };

  const getSessionSummary = () => {
    if (!sessionData) return '';
    
    const { subject, technique, duration, targetSessions, completedSessions } = sessionData;
    let summary = `${technique} - ${subject} (${duration}dk)`;
    
    if (targetSessions && completedSessions !== undefined) {
      summary += ` • ${completedSessions}/${targetSessions} tamamlandı`;
    }
    
    return summary;
  };

  return (
    <Modal
      title={
        <div style={{ 
          textAlign: 'center',
          padding: '24px 0 16px 0'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: isDark ? 'linear-gradient(135deg,#4f46e5,#4338ca)' : '#667eea',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            boxShadow: isDark ? '0 8px 24px rgba(79,70,229,0.45)' : '0 8px 24px rgba(102, 126, 234, 0.3)'
          }}>
            <TrophyOutlined style={{ 
              fontSize: '24px', 
              color: 'white' 
            }} />
          </div>
          <Title level={3} style={{ 
            margin: 0, 
            color: isDark ? '#f1f5f9' : '#333',
            fontWeight: '600'
          }}>
            Çalışma Oturumu Tamamlandı!
          </Title>
          <Text style={{ 
            fontSize: '14px',
            color: isDark ? '#94a3b8' : '#666',
            marginTop: '4px',
            display: 'block'
          }}>
            Harika bir iş çıkardınız! Geri bildiriminizi paylaşın
          </Text>
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      footer={
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 0'
        }}>
          <Popconfirm
            title="Oturum kaydedilmeyecek"
            description="Bu oturumu kaydetmeden kapatmak istediğinize emin misiniz?"
            okText="Evet"
            cancelText="Vazgeç"
            onConfirm={handleCancel}
            disabled={loading}
          >
            <Button 
              disabled={loading}
              style={{
                borderRadius: '12px',
                height: '44px',
                padding: '0 24px',
                border: '1px solid #e9ecef',
                color: '#666'
              }}
            >
              Kaydetmeden Kapat
            </Button>
          </Popconfirm>
          <Button 
            type="primary" 
            icon={<CheckOutlined />}
            onClick={handleSubmit}
            loading={loading}
            style={{
              borderRadius: '12px',
              height: '44px',
              padding: '0 32px',
              background: '#667eea',
              border: 'none',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
            }}
          >
            Geri Bildirimi Kaydet
          </Button>
        </div>
      }
      width={600}
      centered
      maskClosable={false}
      style={{ top: 20 }}
      styles={{ 
        body: { 
          padding: '0 24px 24px 24px',
          background: isDark ? 'linear-gradient(145deg,#0f172a,#1e293b)' : '#f8f9ff'
        },
        mask: isDark ? { backdropFilter: 'blur(2px)' } : undefined
      }}
    >
      <div className="session-feedback">
        {/* Session Summary */}
        {sessionData && (
          <div className="session-feedback__summary" style={{
            background: isDark ? 'rgba(30,41,59,0.85)' : 'rgba(255,255,255,0.8)',
            padding: '16px',
            borderRadius: '12px',
            marginBottom: '24px',
            border: isDark ? '1px solid rgba(99,102,241,0.25)' : '1px solid rgba(102, 126, 234, 0.1)'
          }}>
            <Text style={{ 
              fontSize: '14px',
              color: isDark ? '#818cf8' : '#667eea',
              fontWeight: '500'
            }}>
              {getSessionSummary()}
            </Text>
          </div>
        )}

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Quality Rating */}
          <div className="session-feedback__section" style={{
            background: isDark ? '#1e293b' : 'white',
            padding: '20px',
            borderRadius: '16px',
            boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.05)',
            border: isDark ? '1px solid #334155' : '1px solid #f0f0f0'
          }}>
            <QualityRating
              value={feedback.quality}
              onChange={(quality) => setFeedback(prev => ({ ...prev, quality }))}
              size="large"
            />
          </div>

          {/* Mood Selection */}
          <div className="session-feedback__section" style={{
            background: isDark ? '#1e293b' : 'white',
            padding: '20px',
            borderRadius: '16px',
            boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.05)',
            border: isDark ? '1px solid #334155' : '1px solid #f0f0f0'
          }}>
            <MoodSelector
              value={feedback.mood}
              onChange={(mood) => setFeedback(prev => ({ ...prev, mood }))}
              size="default"
            />
          </div>

          {/* Distraction Counter */}
          <div className="session-feedback__section" style={{
            background: isDark ? '#1e293b' : 'white',
            padding: '20px',
            borderRadius: '16px',
            boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.05)',
            border: isDark ? '1px solid #334155' : '1px solid #f0f0f0'
          }}>
            <DistractionCounter
              value={feedback.distractions}
              onChange={(distractions) => setFeedback(prev => ({ ...prev, distractions }))}
              size="default"
            />
          </div>

          {/* Notes */}
          <div className="session-feedback__section" style={{
            background: isDark ? '#1e293b' : 'white',
            padding: '20px',
            borderRadius: '16px',
            boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.05)',
            border: isDark ? '1px solid #334155' : '1px solid #f0f0f0'
          }}>
            <div className="session-feedback__label" style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '12px',
              fontSize: '14px',
              fontWeight: '600',
              color: isDark ? '#e2e8f0' : '#333'
            }}>
              <EditOutlined style={{ 
                marginRight: 8,
                color: isDark ? '#818cf8' : '#667eea'
              }} />
              Notlar (İsteğe Bağlı)
            </div>
            <TextArea
              placeholder="Bu çalışma oturumu hakkında notlarınızı yazabilirsiniz..."
              value={feedback.notes}
              onChange={(e) => setFeedback(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              maxLength={500}
              showCount
              style={{
                borderRadius: '12px',
                border: isDark ? '1px solid #475569' : '1px solid #e9ecef',
                background: isDark ? '#0f172a' : 'white',
                color: isDark ? '#f1f5f9' : 'inherit',
                resize: 'none'
              }}
            />
          </div>
        </Space>

        <div style={{ marginTop: 24 }}>
          <div style={{ 
            textAlign: 'center',
            padding: '16px',
            background: isDark ? 'rgba(30,41,59,0.7)' : 'rgba(255,255,255,0.6)',
            borderRadius: '12px',
            border: isDark ? '1px solid rgba(99,102,241,0.25)' : '1px solid rgba(102, 126, 234, 0.1)',
            marginBottom: 12
          }}>
            <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#666', lineHeight: '1.5' }}>
              Bu veriler çalışma alışkanlıklarınızı analiz etmek ve size daha iyi öneriler sunmak için kullanılır
            </Text>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Text type="danger" style={{ fontSize: 12, color: isDark ? '#f87171' : undefined }}>
              Kaydetmeden Kapat seçeneğini kullanırsanız bu oturum kaydedilmeyecek.
            </Text>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SessionFeedback;