import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, List, Typography, Tag, Space, Button, Skeleton, Alert, Progress, Divider, Modal, message } from 'antd';
import { PlayCircleOutlined, ClockCircleOutlined, BookOutlined, CheckCircleOutlined, TrophyOutlined, StopOutlined } from '@ant-design/icons';
import { getStudentProgramDetail, StudentProgram, createStudySession, updateLiveTracking } from '../../services/api';
import StudyTimer from '../../views/StudyTrackerPage/bones/StudyTimer/StudyTimer';

const { Title, Text } = Typography;

const statusColor: Record<string, string> = {
  draft: 'default',
  active: 'processing',
  completed: 'success',
  failed: 'error',
  archived: 'purple',
};

const subjectStatusColor: Record<string, string> = {
  not_started: 'default',
  in_progress: 'processing',
  completed: 'success',
  skipped: 'warning',
};

const subjectStatusText: Record<string, string> = {
  not_started: 'Başlanmadı',
  in_progress: 'Devam Ediyor',
  completed: 'Tamamlandı',
  skipped: 'Atlandı',
};

const StudentProgramDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<StudentProgram | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timerVisible, setTimerVisible] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getStudentProgramDetail(id);
      let programData = res.data;
      
      // Demo data - eğer gerçek veri yoksa veya demo ID ise
      if (!programData || id === 'demo1') {
        programData = {
          _id: 'demo1',
          title: '🧪 Test Programı - 30 Saniye',
          date: new Date().toISOString(),
          status: 'active' as const,
          coachNotes: 'Bu bir test programıdır. Timer test etmek için 30 saniyelik kısa çalışmalar yapın.',
          motivationNote: 'Test programı ile timer özelliklerini keşfet! Her konu sadece 30 saniye 🚀',
          subjects: [
            {
              subject: 'matematik',
              description: 'Test - Matematik 30 saniye',
              targetTime: 0.5, // 30 saniye = 0.5 dakika
              targetQuestions: 1,
              studyTime: 0,
              completedQuestions: 0,
              correctAnswers: 0,
              wrongAnswers: 0,
              blankAnswers: 0,
              status: 'not_started',
              topics: ['Test'],
              priority: 10,
              notes: 'Bu bir test konusudur - sadece 30 saniye'
            },
            {
              subject: 'turkce',
              description: 'Test - Türkçe 30 saniye',
              targetTime: 0.5, // 30 saniye = 0.5 dakika
              targetQuestions: 1,
              studyTime: 0,
              completedQuestions: 0,
              correctAnswers: 0,
              wrongAnswers: 0,
              blankAnswers: 0,
              status: 'not_started',
              topics: ['Test'],
              priority: 8,
              notes: 'Bu bir test konusudur - sadece 30 saniye'
            }
          ],
          stats: {
            completionRate: 0,
            totalStudyTime: 0,
            totalTargetTime: 1, // 2 x 0.5 dakika
            totalCompletedQuestions: 0,
            totalTargetQuestions: 2,
            netScore: 0
          }
        };
      }
      
      setProgram(programData);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Kayıt bulunamadı');
      setProgram(null);
    } finally {
      setLoading(false);
    }
  };

  const startStudySession = async (subject: any) => {
    if (!id) {
      message.error('Program ID bulunamadı');
      return;
    }

    setSelectedSubject(subject);
    setTimerVisible(true);
    
    // Real-time tracking'i başlat
    try {
      const subjectIndex = program?.subjects?.findIndex(s => s.subject === subject.subject);
      if (subjectIndex !== undefined && subjectIndex >= 0) {
        await updateLiveTracking(id, {
          subjectIndex,
          isActive: true,
          currentInterval: 'study'
        });
      }
    } catch (error) {
      console.error('Live tracking başlatılamadı:', error);
      // Live tracking hatası çalışmayı engellemez
    }
  };

  const handleSessionComplete = async (sessionData: any) => {
    if (!selectedSubject || !id) {
      message.error('Geçersiz çalışma verisi');
      return;
    }

    try {
      // Çalışma seansını kaydet
      await createStudySession({
        ...sessionData,
        dailyPlanId: id,
        subject: selectedSubject.subject
      });
      
      // Real-time tracking'i güncelle (seansı tamamlandı olarak işaretle)
      const subjectIndex = program?.subjects?.findIndex(s => s.subject === selectedSubject.subject);
      if (subjectIndex !== undefined && subjectIndex >= 0) {
        await updateLiveTracking(id, {
          subjectIndex,
          isActive: false,
          studyTime: sessionData.duration || 0,
          questionsAnswered: {
            correct: sessionData.questionStats?.correctAnswers || 0,
            wrong: sessionData.questionStats?.wrongAnswers || 0,
            blank: sessionData.questionStats?.blankAnswers || 0
          }
        });
      }
      
              message.success('Çalışma seansı kaydedildi!');
      await load(); // Programı yenile
      setTimerVisible(false);
      setSelectedSubject(null);
    } catch (error: any) {
      console.error('Session complete error:', error);
      message.error('Çalışma seansı kaydedilemedi: ' + (error?.message || 'Bilinmeyen hata'));
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <Card
      title={(
        <Space>
          <Link to="/student/coach">← Geri</Link>
          <Title level={5} style={{ margin: 0 }}>{program?.title || 'Çalışma Programı'}</Title>
          {program && <Tag color={statusColor[program.status] || 'default'}>{program.status}</Tag>}
        </Space>
      )}
    >
      {loading ? (
        <Skeleton active />
      ) : error ? (
        <Alert type="error" message={error} showIcon action={<Link to="/student/coach">Listeye Dön</Link>} />
      ) : !program ? (
        <Alert type="warning" message="Kayıt bulunamadı" showIcon action={<Link to="/student/coach">Listeye Dön</Link>} />
      ) : (
        <>
          {/* Program Özeti */}
          <div style={{ marginBottom: 24 }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text type="secondary">
                📅 {new Date(program.date).toLocaleDateString('tr-TR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
              {program.coachNotes && (
                <Alert
                  type="info"
                  message="Koç Notu"
                  description={program.coachNotes}
                  showIcon
                  style={{ marginTop: 8 }}
                />
              )}
              {program.motivationNote && (
                <Alert
                  type="success"
                  message="Motivasyon Notu"
                  description={program.motivationNote}
                  showIcon
                />
              )}
            </Space>
          </div>

          {/* İstatistikler */}
          {program.stats && (
            <Card size="small" style={{ marginBottom: 16 }}>
              <Space size="large" wrap>
                <div>
                  <Text type="secondary" style={{ display: 'block' }}>Toplam İlerleme</Text>
                  <Progress 
                    type="circle" 
                    percent={program.stats.completionRate || 0} 
                    size={60}
                    strokeColor="#52c41a"
                  />
                </div>
                <div>
                  <Text type="secondary" style={{ display: 'block' }}>Çalışma Süresi</Text>
                  <Text strong style={{ fontSize: '18px' }}>
                    <ClockCircleOutlined /> {program.stats.totalStudyTime || 0} / {program.stats.totalTargetTime || 0} dk
                  </Text>
                </div>
                <div>
                  <Text type="secondary" style={{ display: 'block' }}>Tamamlanan Sorular</Text>
                  <Text strong style={{ fontSize: '18px' }}>
                    <CheckCircleOutlined /> {program.stats.totalCompletedQuestions || 0} / {program.stats.totalTargetQuestions || 0}
                  </Text>
                </div>
                <div>
                  <Text type="secondary" style={{ display: 'block' }}>Net Skor</Text>
                  <Text strong style={{ fontSize: '18px', color: '#52c41a' }}>
                    <TrophyOutlined /> {program.stats.netScore || 0}
                  </Text>
                </div>
              </Space>
            </Card>
          )}

          <Divider />

          {/* Konu Listesi */}
          <List
            header={<Title level={5}>Çalışma Konuları</Title>}
            dataSource={program.subjects || []}
            renderItem={(s, idx) => {
              const progress = (s.targetTime && s.targetTime > 0) ? Math.round(((s.studyTime || 0) / s.targetTime) * 100) : 0;
              const questionProgress = (s.targetQuestions && s.targetQuestions > 0) ? Math.round(((s.completedQuestions || 0) / s.targetQuestions) * 100) : 0;
              
              return (
                <List.Item key={idx}>
                  <Card 
                    size="small" 
                    style={{ width: '100%' }}
                    actions={[
                      s.status !== 'completed' && (
                        <Button 
                          type="primary" 
                          icon={<PlayCircleOutlined />}
                          onClick={() => startStudySession(s)}
                          disabled={program.status !== 'active'}
                        >
                          Çalışmaya Başla
                        </Button>
                      ),
                      <Tag 
                        key="status"
                        color={subjectStatusColor[s.status as keyof typeof subjectStatusColor] || 'default'}
                      >
                        {subjectStatusText[s.status as keyof typeof subjectStatusText] || s.status}
                      </Tag>
                    ].filter(Boolean)}
                  >
                    <Card.Meta
                      title={
                        <Space>
                          <BookOutlined />
                          <Text strong>{s.subject?.charAt(0).toUpperCase() + s.subject?.slice(1)}</Text>
                          {s.priority && (
                            <Tag color={s.priority > 7 ? 'red' : s.priority > 4 ? 'orange' : 'green'}>
                              Öncelik: {s.priority}/10
                            </Tag>
                          )}
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                          {s.description && (
                            <Text type="secondary">{s.description}</Text>
                          )}
                          {s.topics && s.topics.length > 0 && (
                            <div>
                              <Text type="secondary">Konular: </Text>
                              {s.topics.map((topic: string, i: number) => (
                                <Tag key={i}>{topic}</Tag>
                              ))}
                            </div>
                          )}
                          
                          {/* Çalışma Süre İlerlemesi */}
                          <div>
                            <Text type="secondary" style={{ marginRight: 8 }}>
                              Süre: {s.studyTime || 0} / {s.targetTime || 0} dk ({progress}%)
                            </Text>
                            <Progress 
                              percent={Math.min(progress, 100)} 
                              size="small" 
                              style={{ maxWidth: 200 }}
                              strokeColor={progress >= 100 ? '#52c41a' : '#1890ff'}
                            />
                          </div>

                          {/* Soru İlerlemesi */}
                          {(s.targetQuestions && s.targetQuestions > 0) && (
                            <div>
                              <Text type="secondary" style={{ marginRight: 8 }}>
                                Sorular: {s.completedQuestions || 0} / {s.targetQuestions} ({questionProgress}%)
                              </Text>
                              <Progress 
                                percent={Math.min(questionProgress, 100)} 
                                size="small" 
                                style={{ maxWidth: 200 }}
                                strokeColor={questionProgress >= 100 ? '#52c41a' : '#1890ff'}
                              />
                            </div>
                          )}

                          {/* Performans */}
                          {(s.completedQuestions && s.completedQuestions > 0) && (
                            <Space size="middle">
                              <Text type="secondary">
                                Doğru: {s.correctAnswers || 0}
                              </Text>
                              <Text type="secondary">
                                Yanlış: {s.wrongAnswers || 0}
                              </Text>
                              <Text type="secondary">
                                ⭕ Boş: {s.blankAnswers || 0}
                              </Text>
                            </Space>
                          )}

                          {s.notes && (
                            <Alert 
                              type="info" 
                              message={s.notes} 
                              showIcon={false}
                            />
                          )}
                        </Space>
                      }
                    />
                  </Card>
                </List.Item>
              );
            }}
          />
        </>
      )}

      {/* Study Timer Modal */}
      <Modal
        title={`${selectedSubject?.subject?.charAt(0).toUpperCase() + selectedSubject?.subject?.slice(1)} Çalışması`}
        open={timerVisible}
        onCancel={() => {
          setTimerVisible(false);
          setSelectedSubject(null);
        }}
        footer={null}
        width={600}
        destroyOnClose
      >
        {selectedSubject && (
          <div>
            <Alert
              type="info"
              message="Çalışma Hedeflerin"
              description={
                <Space direction="vertical" size="small">
                  <Text>Hedef Süre: {selectedSubject.targetTime || 0} dakika</Text>
                  {(selectedSubject.targetQuestions && selectedSubject.targetQuestions > 0) && (
                    <Text>Hedef Soru: {selectedSubject.targetQuestions} adet</Text>
                  )}
                  {selectedSubject.topics && selectedSubject.topics.length > 0 && (
                    <Text>Konular: {selectedSubject.topics.join(', ')}</Text>
                  )}
                </Space>
              }
              style={{ marginBottom: 16 }}
            />
            <StudyTimer
              size="large"
              initialConfig={{
                subject: selectedSubject.subject,
                studyDuration: selectedSubject.targetTime || 25,
                technique: 'Freeform'
              }}
              onSessionComplete={handleSessionComplete}
            />
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default StudentProgramDetail;


