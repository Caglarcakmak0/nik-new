import React, { useEffect, useState } from 'react';
import { Typography, Card, Space, Button, Badge, Tag, Progress, Modal } from 'antd';
import { useAuth } from '../../../contexts/AuthContext';
import { getStudentPrograms, StudentProgram } from '../../../services/api';
import { PlayCircleOutlined, BookOutlined, ClockCircleOutlined } from '@ant-design/icons';
import StudyTimer from '../bones/StudyTimer/StudyTimer';
import FullScreenSplitIntro from '../../../components/animations/FullScreenSplitIntro';
import ekranImage from '../../../assets/ekran.jpeg';
import '../StudyTracker.scss';

const { Title, Text } = Typography;

const StudyTrackerCoachPrograms: React.FC = () => {
  const { user } = useAuth();
  const isFree = (user?.plan?.tier as any) === 'free';
  const [programs, setPrograms] = useState<StudentProgram[]>([]);
  const [loading, setLoading] = useState(false);
  // Modal kaldırıldı; detaylar artık kart içinde açılır (accordion tarzı)
  const [expandedProgramId, setExpandedProgramId] = useState<string | null>(null);
  // Timer modal state (yeniden eklendi)
  const [showTimer, setShowTimer] = useState(false);
  const [activeSubject, setActiveSubject] = useState<{ programId: string; subject: string; targetTime?: number; technique?: string } | null>(null);
  const [showIntro, setShowIntro] = useState(false);

  const fetchPrograms = async () => {
    if (isFree) return;
    try {
      setLoading(true);
      const response = await getStudentPrograms({ status: 'active', limit: 5 });
      setPrograms(response.data || []);
    } catch (e) {
      console.error('Program fetch error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPrograms(); }, []);

  // Timer ve oturum kaydetme işlemleri bu sayfadan kaldırıldı.

  return (
    <div className="study-tracker">
      <div style={{ marginBottom: 24 }}>
  <Title level={2} style={{ margin: 0, fontWeight: 500, fontSize: '24px' }}>Günlük Programlar</Title>
      </div>
      {isFree ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Title level={4} style={{ marginBottom: 8 }}>Günlük Programlar</Title>
            <Text type="secondary">Premium üyelik ile koç programları ve yönlendirmeleri aktif olur.</Text>
            <div style={{ marginTop: 16 }}>
              <Button type="primary" onClick={() => { window.location.href = 'https://nikykskoclugu.com.tr/#iletisim'; }}>Premium’a Yükselt</Button>
            </div>
          </div>
        </Card>
      ) : (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {programs.map(program => {
            const isToday = new Date(program.date).toDateString() === new Date().toDateString();
            const completionRate = program.stats?.completionRate || 0;
            const totalSubjects = program.subjects?.length || 0;
            const completedSubjects = program.subjects?.filter(s => s.status === 'completed')?.length || 0;
            const expanded = expandedProgramId === program._id;
            return (
              <Card key={program._id} size="small" loading={loading} style={{ border: isToday ? '2px solid #52c41a' : undefined }}>
                <div style={{ marginBottom: 16 }}>
                  <Space>
                    <Text strong>{program.title}</Text>
                    { isToday && <Badge count="BUGÜN" style={{ backgroundColor: '#52c41a' }} /> }
                  </Space>
                </div>
                <Space size="large" wrap style={{ marginBottom: 16 }}>
                  <div>
                    <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>İlerleme</Text>
                    <Progress type="circle" percent={completionRate} size={100} strokeColor="#52c41a" />
                  </div>
                  <div>
                    <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Konular</Text>
                    <Text strong style={{ fontSize: 16 }}><BookOutlined /> {completedSubjects}/{totalSubjects}</Text>
                  </div>
                  <div>
                    <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Çalışma Süresi</Text>
                    <Text strong style={{ fontSize: 16 }}><ClockCircleOutlined /> {program.stats?.totalStudyTime || 0} dk</Text>
                  </div>
                </Space>
                <div style={{ textAlign: 'right' }}>
                  <Button
                    type={expanded ? 'default' : 'primary'}
                    icon={<PlayCircleOutlined />}
                    onClick={() => setExpandedProgramId(expanded ? null : program._id)}
                  >
                    {expanded ? 'Gizle' : (completionRate === 100 ? 'Tamamlandı (Detayları Gör)' : 'Konu Seç / Detay')}
                  </Button>
                </div>
                {expanded && (
                  <div style={{ marginTop: 24 }}>
                    <div className="programs-grid">
                      {program.subjects?.map((subject, idx) => {
                        const subjectProgress = (subject.targetTime && subject.targetTime > 0) ? Math.round(((subject.studyTime || 0) / subject.targetTime) * 100) : 0;
                        return (
                          <Card key={idx} size="small" className={`program-card ${subject.status === 'completed' ? 'completed' : subject.status === 'in_progress' ? 'in-progress' : 'default'}`}> 
                            <div className="program-content">
                              <div className="program-info">
                                <Space>
                                  <Text strong className="program-title">{subject.subject?.charAt(0).toUpperCase() + subject.subject?.slice(1)}</Text>
                                  <Tag color={subject.status === 'completed' ? 'success' : subject.status === 'in_progress' ? 'processing' : 'default'}>
                                    {subject.status === 'completed' ? 'Tamamlandı' : subject.status === 'in_progress' ? 'Devam Ediyor' : 'Başlanmadı'}
                                  </Tag>
                                </Space>
                                <div className="program-details">
                                  <Text type="secondary" className="program-description">{subject.description}</Text>
                                </div>
                                <Progress percent={Math.min(subjectProgress, 100)} size="small" strokeColor={subjectProgress >= 100 ? '#52c41a' : '#1890ff'} className="program-progress" />
                              </div>
                              <div className="program-actions">
                                <Button
                                  type="primary"
                                  size="small"
                                  icon={<PlayCircleOutlined />}
                                  disabled={subject.status === 'completed'}
                                  onClick={() => {
                                    if (showIntro) return;
                                    setActiveSubject({ programId: program._id, subject: subject.subject, targetTime: subject.targetTime });
                                    setShowIntro(true);
                                    setTimeout(() => { setShowTimer(true); }, 2200);
                                    setTimeout(() => setShowIntro(false), 2000 + 800);
                                  }}
                                  style={{ backgroundColor: subject.status === 'in_progress' ? '#52c41a' : undefined }}
                                >
                                  {subject.status === 'completed' ? 'Tamamlandı' : subject.status === 'in_progress' ? 'Devam Et' : 'Hazır'}
                                </Button>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </Space>
      )}
      {/* Çalışma Timer Modal */}
  {showIntro && <FullScreenSplitIntro duration={1200} fadeDuration={800} label={activeSubject?.subject} imageSrc={ekranImage} />}
      <Modal
        open={showTimer}
        onCancel={() => { setShowTimer(false); setActiveSubject(null); }}
        footer={null}
        width={520}
        destroyOnClose
        title={activeSubject ? `${activeSubject.subject} • Çalışma Oturumu` : 'Çalışma Oturumu'}
      >
        {activeSubject && (
          <StudyTimer
            size="large"
            initialConfig={{
              subject: activeSubject.subject,
              studyDuration: activeSubject.targetTime && activeSubject.targetTime > 0 ? Math.min(activeSubject.targetTime, 180) : 25,
              technique: 'Pomodoro'
            }}
            onSessionComplete={() => {
              // Oturum tamamlandığında programları yeniden yükle
              fetchPrograms();
            }}
          />
        )}
      </Modal>
    </div>
  );
};

export default StudyTrackerCoachPrograms;
