import React, { useState } from 'react';
import { Modal, Input, Button, Space, Divider, Typography, message } from 'antd';
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
    mood: 'Normal',
    distractions: 0,
    notes: ''
  });

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
        mood: 'Normal',
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
      mood: 'Normal',
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
            background: '#667eea',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)'
          }}>
            <TrophyOutlined style={{ 
              fontSize: '24px', 
              color: 'white' 
            }} />
          </div>
          <Title level={3} style={{ 
            margin: 0, 
            color: '#333',
            fontWeight: '600'
          }}>
            Çalışma Oturumu Tamamlandı!
          </Title>
          <Text style={{ 
            fontSize: '14px',
            color: '#666',
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
          <Button 
            onClick={handleCancel} 
            disabled={loading}
            style={{
              borderRadius: '12px',
              height: '44px',
              padding: '0 24px',
              border: '1px solid #e9ecef',
              color: '#666'
            }}
          >
            Atla
          </Button>
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
          background: '#f8f9ff'
        }
      }}
    >
      <div className="session-feedback">
        {/* Session Summary */}
        {sessionData && (
          <div className="session-feedback__summary" style={{
            background: 'rgba(255,255,255,0.8)',
            padding: '16px',
            borderRadius: '12px',
            marginBottom: '24px',
            border: '1px solid rgba(102, 126, 234, 0.1)'
          }}>
            <Text style={{ 
              fontSize: '14px',
              color: '#667eea',
              fontWeight: '500'
            }}>
              {getSessionSummary()}
            </Text>
          </div>
        )}

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Quality Rating */}
          <div className="session-feedback__section" style={{
            background: 'white',
            padding: '20px',
            borderRadius: '16px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
            border: '1px solid #f0f0f0'
          }}>
            <QualityRating
              value={feedback.quality}
              onChange={(quality) => setFeedback(prev => ({ ...prev, quality }))}
              size="large"
            />
          </div>

          {/* Mood Selection */}
          <div className="session-feedback__section" style={{
            background: 'white',
            padding: '20px',
            borderRadius: '16px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
            border: '1px solid #f0f0f0'
          }}>
            <MoodSelector
              value={feedback.mood}
              onChange={(mood) => setFeedback(prev => ({ ...prev, mood }))}
              size="default"
            />
          </div>

          {/* Distraction Counter */}
          <div className="session-feedback__section" style={{
            background: 'white',
            padding: '20px',
            borderRadius: '16px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
            border: '1px solid #f0f0f0'
          }}>
            <DistractionCounter
              value={feedback.distractions}
              onChange={(distractions) => setFeedback(prev => ({ ...prev, distractions }))}
              size="default"
            />
          </div>

          {/* Notes */}
          <div className="session-feedback__section" style={{
            background: 'white',
            padding: '20px',
            borderRadius: '16px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
            border: '1px solid #f0f0f0'
          }}>
            <div className="session-feedback__label" style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '12px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#333'
            }}>
              <EditOutlined style={{ 
                marginRight: 8,
                color: '#667eea'
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
                border: '1px solid #e9ecef',
                resize: 'none'
              }}
            />
          </div>
        </Space>

        <div style={{ 
          marginTop: 24, 
          textAlign: 'center',
          padding: '16px',
          background: 'rgba(255,255,255,0.6)',
          borderRadius: '12px',
          border: '1px solid rgba(102, 126, 234, 0.1)'
        }}>
          <Text style={{ 
            fontSize: '12px',
            color: '#666',
            lineHeight: '1.5'
          }}>
            Bu veriler çalışma alışkanlıklarınızı analiz etmek ve size daha iyi öneriler sunmak için kullanılır
          </Text>
        </div>
      </div>
    </Modal>
  );
};

export default SessionFeedback;