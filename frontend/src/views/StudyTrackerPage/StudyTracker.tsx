import React, { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Typography,
  Space,
  Statistic,
  Timeline,
  Table,
  Tag,
  Button,
  Select,
  DatePicker,
  Tabs,
  Modal,
  Progress,
  Alert,
  Badge,
} from "antd";

import {
  ClockCircleOutlined,
  PlayCircleOutlined,
  BarChartOutlined,
  CalendarOutlined,
  TrophyOutlined,
  FireOutlined,
  HistoryOutlined,
  BookOutlined,
  CheckCircleOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { StudyTimer, StudyCalendar, SessionHistory, StudyRoom, StudyStatistics } from "./bones";
import { apiRequest, getStudentPrograms, StudentProgram } from "../../services/api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/tr"; // Türkçe locale

// Plugins'leri aktif et
dayjs.extend(relativeTime);
dayjs.locale("tr");

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface StudySession {
  _id: string;
  subject: string;
  duration: number;
  date: Date;
  quality: number;
  technique: string;
  mood: string;
  efficiency: number;
  notes?: string;
  distractions: number;
}

interface StudyStats {
  totalTime: number;
  sessionsCount: number;
  averageQuality: number;
  currentStreak: number;
  bestSubject: string;
  totalDistraction: number;
}

const StudyTracker: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<
    "week" | "month" | "all"
  >("week");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [statisticsRefresh, setStatisticsRefresh] = useState<number>(0);
  
  // Koç programları için yeni state'ler
  const [coachPrograms, setCoachPrograms] = useState<StudentProgram[]>([]);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<StudentProgram | null>(null);
  const [programsLoading, setProgramsLoading] = useState(false);
  
  // Timer modal için state'ler
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [selectedSubjectForTimer, setSelectedSubjectForTimer] = useState<any>(null);
  const [selectedProgramForTimer, setSelectedProgramForTimer] = useState<StudentProgram | null>(null);

  // Veri getirme
  const fetchStudyData = async () => {
    try {
      setLoading(true);

      // Analytics API'den genel istatistikl
      const response = await apiRequest("/study-sessions", {
        method: "GET",
      });
      console.log(response);
      setSessions(response);

      // Stats hesaplama
      const totalTime = response.reduce(
        (sum: number, s: any) => sum + s.duration,
        0
      );
      const avgQuality =
        response.reduce((sum: number, s: any) => sum + s.quality, 0) /
        response.length;

      // Streak hesaplama
      const calculateStreak = (sessions: StudySession[]): number => {
        if (sessions.length === 0) return 0;

        const sortedDates = sessions
          .map(s => dayjs(s.date).format('YYYY-MM-DD'))
          .filter((date, index, array) => array.indexOf(date) === index)
          .sort()
          .reverse();

        let streak = 0;
        const today = dayjs().format('YYYY-MM-DD');
        const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

        if (sortedDates[0] === today || sortedDates[0] === yesterday) {
          streak = 1;
          for (let i = 1; i < sortedDates.length; i++) {
            const currentDate = dayjs(sortedDates[i-1]);
            const nextDate = dayjs(sortedDates[i]);
            
            if (currentDate.diff(nextDate, 'day') === 1) {
              streak++;
            } else {
              break;
            }
          }
        }

        return streak;
      };

      setStats({
        totalTime,
        sessionsCount: response.length,
        averageQuality: avgQuality,
        currentStreak: calculateStreak(response),
        bestSubject: "Fizik",
        totalDistraction: response.reduce(
          (sum: number, s: any) => sum + s.distractions,
          0
        ),
      });
    } catch (error) {
      console.error("Study data fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Koç programlarını getir
  const fetchCoachPrograms = async () => {
    try {
      setProgramsLoading(true);
      const response = await getStudentPrograms({
        status: 'active',
        limit: 5
      });
      
      // Demo data ekleme - gerçek veriler yoksa
      const apiData = response.data || [];
      const demoData = apiData.length === 0 ? [
        {
          _id: 'demo1',
          title: '🧪 Test Programı - 30 Saniye',
          date: new Date().toISOString(),
          status: 'active' as const,
          coachNotes: 'Bu bir test programıdır. Timer test etmek için 30 saniyelik kısa çalışmalar yapın.',
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
              priority: 10
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
              priority: 8
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
        },
        {
          _id: 'demo2',
          title: 'Matematik Yoğunlaşma Programı',
          date: new Date(Date.now() - 86400000).toISOString(), // Dün
          status: 'active' as const,
          coachNotes: 'Fonksiyonlara odaklan, timer kullanarak çalış',
          subjects: [
            {
              subject: 'matematik',
              description: 'Fonksiyonlar ve Türev',
              targetTime: 120,
              studyTime: 45,
              status: 'in_progress'
            },
            {
              subject: 'kimya', 
              description: 'Organik Kimya',
              targetTime: 90,
              studyTime: 90,
              status: 'completed'
            }
          ],
          stats: {
            completionRate: 65,
            totalStudyTime: 135,
            totalTargetTime: 210
          }
        }
      ] : apiData;
      
      setCoachPrograms(demoData);
    } catch (error) {
      console.error('Coach programs fetch error:', error);
    } finally {
      setProgramsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudyData();
    fetchCoachPrograms();
  }, []);

  // Session tamamlandığında
  const handleSessionComplete = async (sessionData: any) => {
    try {
      console.log("Yeni oturum tamamlandı:", sessionData);
      
      // Eğer koç programından çalışma yapıldıysa, program bilgilerini ekle
      if (selectedProgramForTimer && selectedSubjectForTimer) {
        sessionData.dailyPlanId = selectedProgramForTimer._id;
        sessionData.coachProgram = true;
        sessionData.programTitle = selectedProgramForTimer.title;
        sessionData.subject = selectedSubjectForTimer.subject;
      }
      
      const response = await apiRequest("/study-sessions", {
        method: "POST",
        body: JSON.stringify(sessionData),
      });
      console.log(response);
      
      // Verileri yenile
      await fetchStudyData();
      await fetchCoachPrograms(); // Koç programlarını da yenile
      setStatisticsRefresh(prev => prev + 1);
      
      // Timer modal'ını kapat
      setShowTimerModal(false);
      setSelectedSubjectForTimer(null);
      setSelectedProgramForTimer(null);
    } catch (error) {
      console.error("Oturum kaydetme hatası:", error);
    }
  };

  // Koç programından timer başlatma
  const startCoachProgramTimer = (program: StudentProgram, subject: any) => {
    setSelectedProgramForTimer(program);
    setSelectedSubjectForTimer(subject);
    setShowTimerModal(true);
    setShowProgramModal(false); // Program modal'ını kapat
  };

  // Tablo kolonları
  const sessionColumns = [
    {
      title: "Tarih",
      dataIndex: "date",
      key: "date",
      render: (date: Date) => dayjs(date).format("DD/MM/YYYY HH:mm"),
      sorter: (a: StudySession, b: StudySession) =>
        new Date(a.date).getTime() - new Date(b.date).getTime(),
    },
    {
      title: "Ders",
      dataIndex: "subject",
      key: "subject",
      render: (subject: string) => (
        <Tag color="blue">
          {subject.charAt(0).toUpperCase() + subject.slice(1)}
        </Tag>
      ),
      filters: [
        { text: "Matematik", value: "matematik" },
        { text: "Fizik", value: "fizik" },
        { text: "Kimya", value: "kimya" },
        { text: "Biyoloji", value: "biyoloji" },
      ],
      onFilter: (value: any, record: StudySession) => record.subject === value,
    },
    {
      title: "Süre",
      dataIndex: "duration",
      key: "duration",
      render: (duration: number) => `${duration} dk`,
      sorter: (a: StudySession, b: StudySession) => a.duration - b.duration,
    },
    {
      title: "Teknik",
      dataIndex: "technique",
      key: "technique",
      render: (technique: string) => (
        <Tag
          color={
            technique === "Pomodoro"
              ? "orange"
              : technique === "Timeblock"
              ? "green"
              : "blue"
          }
        >
          {technique}
        </Tag>
      ),
    },
    {
      title: "Kalite",
      dataIndex: "quality",
      key: "quality",
      render: (quality: number) => (
        <div>
          {quality}
          <Text type="secondary"> ({quality}/5)</Text>
        </div>
      ),
      sorter: (a: StudySession, b: StudySession) => a.quality - b.quality,
    },
    {
      title: "Verimlilik",
      dataIndex: "efficiency",
      key: "efficiency",
      render: (efficiency: number) => (
        <Text
          style={{
            color:
              efficiency >= 80
                ? "#52c41a"
                : efficiency >= 60
                ? "#faad14"
                : "#ff4d4f",
          }}
        >
          %{efficiency}
        </Text>
      ),
      sorter: (a: StudySession, b: StudySession) => a.efficiency - b.efficiency,
    },
    {
      title: "Ruh Hali",
      dataIndex: "mood",
      key: "mood",
      render: (mood: string) => {
        const moodColors = {
          Enerjik: "green",
          Normal: "blue",
          Yorgun: "orange",
          Motivasyonsuz: "red",
          Stresli: "volcano",
          Mutlu: "cyan",
        };
        return (
          <Tag color={moodColors[mood as keyof typeof moodColors]}>{mood}</Tag>
        );
      },
    },
  ];

  // Süre formatlama
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}s ${mins}d` : `${mins}d`;
  };

  return (
    <div style={{ padding: "0 0 24px 0" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <Title level={2} style={{ margin: 0, fontWeight: 500, fontSize: '24px' }}>
          Çalışma Takip Merkezi
        </Title>
      </div>

      {/* Main Content */}
      <Row gutter={[24, 24]}>
        {/* Sol Panel - Timer ve İstatistikler */}
        <Col xs={24} lg={8}>
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            {/* Ana Timer */}
            <StudyTimer
              size="large"
              onSessionComplete={handleSessionComplete}
            />



            {/* Koç Programlarım */}
            {coachPrograms.length > 0 && (
              <Card 
                title="Koç Programlarım" 
                size="small"
                extra={
                  <Button 
                    type="link" 
                    size="small"
                    onClick={() => setShowProgramModal(true)}
                  >
                    Tümü
                  </Button>
                }
                loading={programsLoading}
              >
                <Space direction="vertical" size="small" style={{ width: "100%" }}>
                  {coachPrograms.slice(0, 3).map((program) => {
                    const isToday = new Date(program.date).toDateString() === new Date().toDateString();
                    const completionRate = program.stats?.completionRate || 0;
                    
                    return (
                      <div key={program._id} style={{ 
                        padding: '8px 0', 
                        borderBottom: '1px solid #f0f0f0' 
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <Space>
                              <Text strong style={{ fontSize: '13px' }}>{program.title}</Text>
                              {isToday && (
                                <Badge  
                                  count="BUGÜN" 
                                  style={{ backgroundColor: '#52c41a' }}
                                  size="small"
                                />
                              )}
                            </Space>
                            <div>
                              <Text type="secondary" style={{ fontSize: '11px' }}>
                                {program.subjects?.length || 0} konu • {completionRate}% tamamlandı
                              </Text>
                            </div>
                          </div>
                          <Button 
                            type="primary" 
                            size="small"
                            icon={<PlayCircleOutlined />}
                            onClick={() => {
                              setSelectedProgram(program);
                              setShowProgramModal(true);
                            }}
                          >
                            Çalış
                          </Button>
                        </div>
                        <Progress 
                          percent={completionRate} 
                          size="small" 
                          strokeColor={completionRate === 100 ? '#52c41a' : '#1890ff'}
                          showInfo={false}
                          style={{ marginTop: 4 }}
                        />
                      </div>
                    );
                  })}
                </Space>
              </Card>
            )}

            {/* En Son Aktiviteler */}
            <Card title="🕐 Son Aktiviteler" size="small">
              <Timeline
                items={sessions.slice(0, 5).map((session) => ({
                  color: session.efficiency >= 80 ? "green" : "blue",
                  children: (
                    <div key={session._id}>
                      <Text strong>{session.subject}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: "12px" }}>
                        {formatTime(session.duration)} • {session.technique} •
                        {session.quality}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: "11px" }}>
                        {dayjs(session.date).fromNow()}
                      </Text>
                    </div>
                  ),
                }))}
              />
            </Card>
          </Space>
        </Col>

        {/* Sağ Panel - Detaylı Veriler */}
        <Col xs={24} lg={16}>
          <Tabs
            defaultActiveKey="sessions"
            size="large"
            items={[
              {
                key: "sessions",
                label: (
                  <span>
                    <HistoryOutlined />
                    Oturum Geçmişi
                  </span>
                ),
                children: (
                  <SessionHistory refreshTrigger={statisticsRefresh} />
                ),
              },

              {
                key: "calendar",
                label: (
                  <span>
                    <CalendarOutlined />
                    Takvim
                  </span>
                ),
                children: (
                  <StudyCalendar refreshTrigger={statisticsRefresh} />
                ),
              },
              {
                key: "study-room",
                label: (
                  <span>
                    <TrophyOutlined />
                    Çalışma Odası
                  </span>
                ),
                children: (
                  <StudyRoom />
                ),
              },
              {
                key: "statistics",
                label: (
                  <span>
                    <BarChartOutlined />
                    İstatistikler
                  </span>
                ),
                children: (
                  <StudyStatistics refreshTrigger={statisticsRefresh} />
                ),
              },
              {
                key: "coach-programs",
                label: (
                  <span>
                    <UserOutlined />
                    Koç Programları
                  </span>
                ),
                children: (
                  <Card title="Koç Programlarım" loading={programsLoading}>
                    {coachPrograms.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <Text type="secondary">
                          Koçunuz henüz size program ataması yapmamış.
                        </Text>
                      </div>
                    ) : (
                      <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        {coachPrograms.map((program) => {
                          const isToday = new Date(program.date).toDateString() === new Date().toDateString();
                          const completionRate = program.stats?.completionRate || 0;
                          const totalSubjects = program.subjects?.length || 0;
                          const completedSubjects = program.subjects?.filter(s => s.status === 'completed')?.length || 0;
                          
                          return (
                            <Card key={program._id} size="small" style={{ border: isToday ? '2px solid #52c41a' : undefined }}>
                              <div style={{ marginBottom: 16 }}>
                                <Space>
                                  <Text strong>{program.title}</Text>
                                  {isToday && (
                                    <Badge 
                                      count="BUGÜN" 
                                      style={{ backgroundColor: '#52c41a' }}
                                    />
                                  )}
                                </Space>
                                <div style={{ marginTop: 4 }}>
                                  <Text type="secondary" style={{ fontSize: '12px' }}>
                                    📅 {new Date(program.date).toLocaleDateString('tr-TR', { 
                                      weekday: 'long', 
                                      day: 'numeric', 
                                      month: 'long' 
                                    })}
                                  </Text>
                                </div>
                              </div>

                              {program.coachNotes && (
                                <Alert
                                  type="info"
                                  message="Koç Notu"
                                  description={program.coachNotes}
                                  showIcon
                                  style={{ marginBottom: 16, fontSize: '12px' }}
                                />
                              )}

                              <Space size="large" wrap style={{ marginBottom: 16 }}>
                                <div>
                                  <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>İlerleme</Text>
                                  <Progress 
                                    type="circle" 
                                    percent={completionRate} 
                                    size={50}
                                    strokeColor="#52c41a"
                                  />
                                </div>
                                <div>
                                  <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>Konular</Text>
                                  <Text strong style={{ fontSize: '16px' }}>
                                    <BookOutlined /> {completedSubjects}/{totalSubjects}
                                  </Text>
                                </div>
                                <div>
                                  <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>Çalışma Süresi</Text>
                                  <Text strong style={{ fontSize: '16px' }}>
                                    <ClockCircleOutlined /> {program.stats?.totalStudyTime || 0} dk
                                  </Text>
                                </div>
                              </Space>

                              {program.subjects && program.subjects.length > 0 && (
                                <div>
                                  <Text type="secondary" style={{ fontSize: '12px', marginBottom: 8, display: 'block' }}>Konu Detayları:</Text>
                                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                    {program.subjects.map((subject, idx) => {
                                      const subjectProgress = (subject.targetTime && subject.targetTime > 0) 
                                        ? Math.round(((subject.studyTime || 0) / subject.targetTime) * 100) 
                                        : 0;
                                      
                                      return (
                                        <div key={idx} style={{ 
                                          padding: '6px 8px', 
                                          background: '#fafafa', 
                                          borderRadius: '4px',
                                          fontSize: '12px'
                                        }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                              <Text strong>{subject.subject?.charAt(0).toUpperCase() + subject.subject?.slice(1)}</Text>
                                              {subject.description && (
                                                <div>
                                                  <Text type="secondary" style={{ fontSize: '11px' }}>
                                                    {subject.description}
                                                  </Text>
                                                </div>
                                              )}
                                            </div>
                                            <Tag 
                                              color={
                                                subject.status === 'completed' ? 'success' : 
                                                subject.status === 'in_progress' ? 'processing' : 'default'
                                              }
                                            >
                                              {subject.status === 'completed' ? 'Tamamlandı' : 
                                               subject.status === 'in_progress' ? 'Devam Ediyor' : 'Başlanmadı'}
                                            </Tag>
                                          </div>
                                          <Progress 
                                            percent={Math.min(subjectProgress, 100)} 
                                            size="small" 
                                            strokeColor={subjectProgress >= 100 ? '#52c41a' : '#1890ff'}
                                            style={{ marginTop: 4 }}
                                          />
                                        </div>
                                      );
                                    })}
                                  </Space>
                                </div>
                              )}

                              <div style={{ marginTop: 16, textAlign: 'right' }}>
                                <Button 
                                  type="primary" 
                                  icon={<PlayCircleOutlined />}
                                  onClick={() => {
                                    setSelectedProgram(program);
                                    setShowProgramModal(true);
                                  }}
                                  disabled={completionRate === 100}
                                >
                                  {completionRate === 100 ? 'Tamamlandı' : 'Konu Seç ve Başla'}
                                </Button>
                              </div>
                            </Card>
                          );
                        })}
                      </Space>
                    )}
                  </Card>
                ),
              },
            ]}
          />
        </Col>
      </Row>

      {/* Coach Programs Modal */}
      <Modal
                        title="Tüm Koç Programlarım"
        open={showProgramModal}
        onCancel={() => {
          setShowProgramModal(false);
          setSelectedProgram(null);
        }}
        footer={null}
        width={800}
      >
        {selectedProgram ? (
          <div>
            <Alert
              type="info"
              message={`${selectedProgram.title} - Konu Seçimi`}
              description="Çalışmak istediğiniz konuyu seçin ve timer'ı başlatın"
              style={{ marginBottom: 16 }}
            />
            {selectedProgram.coachNotes && (
              <Alert
                type="success"
                message="Koç Notu"
                description={selectedProgram.coachNotes}
                style={{ marginBottom: 16, fontSize: '12px' }}
                showIcon
              />
            )}
            <div style={{ display: 'grid', gap: '8px' }}>
              {selectedProgram.subjects?.map((subject, idx) => {
                const subjectProgress = (subject.targetTime && subject.targetTime > 0) 
                  ? Math.round(((subject.studyTime || 0) / subject.targetTime) * 100) 
                  : 0;
                
                return (
                  <Card 
                    key={idx} 
                    size="small" 
                    style={{ 
                      marginBottom: 8,
                      border: subject.status === 'completed' ? '1px solid #52c41a' : 
                              subject.status === 'in_progress' ? '1px solid #1890ff' : '1px solid #d9d9d9',
                      opacity: subject.status === 'completed' ? 0.7 : 1
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <Space>
                          <Text strong style={{ fontSize: '14px' }}>
                            {subject.subject?.charAt(0).toUpperCase() + subject.subject?.slice(1)}
                          </Text>
                          <Tag 
                            color={
                              subject.status === 'completed' ? 'success' : 
                              subject.status === 'in_progress' ? 'processing' : 'default'
                            }
                          >
                            {subject.status === 'completed' ? 'Tamamlandı' : 
                             subject.status === 'in_progress' ? 'Devam Ediyor' : 'Başlanmadı'}
                          </Tag>
                        </Space>
                        <div style={{ marginTop: 4 }}>
                          <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                            {subject.description}
                          </Text>
                          <Space size="middle" style={{ marginTop: 4 }}>
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              Hedef: {subject.targetTime || 0} dk
                            </Text>
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              Çalışılan: {subject.studyTime || 0} dk ({subjectProgress}%)
                            </Text>
                            {subject.targetQuestions && (
                              <Text type="secondary" style={{ fontSize: '11px' }}>
                                Hedef Soru: {subject.targetQuestions}
                              </Text>
                            )}
                          </Space>
                        </div>
                        <Progress 
                          percent={Math.min(subjectProgress, 100)} 
                          size="small" 
                          strokeColor={subjectProgress >= 100 ? '#52c41a' : '#1890ff'}
                          style={{ marginTop: 6 }}
                        />
                      </div>
                      <div style={{ marginLeft: 16 }}>
                        <Button 
                          type="primary" 
                          size="small"
                          icon={<PlayCircleOutlined />}
                          disabled={subject.status === 'completed'}
                          onClick={() => {
                            startCoachProgramTimer(selectedProgram!, subject);
                          }}
                          style={{
                            backgroundColor: subject.status === 'in_progress' ? '#52c41a' : undefined,
                            borderColor: subject.status === 'in_progress' ? '#52c41a' : undefined
                          }}
                        >
                          {subject.status === 'completed' ? 'Tamamlandı' : 
                           subject.status === 'in_progress' ? 'Devam Et' : 'Başla'}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {coachPrograms.map((program) => {
              const isToday = new Date(program.date).toDateString() === new Date().toDateString();
              const completionRate = program.stats?.completionRate || 0;
              
              return (
                <Card 
                  key={program._id} 
                  size="small" 
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedProgram(program)}
                  hoverable
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Space>
                        <Text strong>{program.title}</Text>
                        {isToday && (
                          <Badge count="BUGÜN" style={{ backgroundColor: '#52c41a' }} />
                        )}
                      </Space>
                      <div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {program.subjects?.length || 0} konu • %{completionRate} tamamlandı
                        </Text>
                      </div>
                    </div>
                    <div>
                      <Progress 
                        type="circle" 
                        percent={completionRate} 
                        size={40}
                        strokeColor={completionRate === 100 ? '#52c41a' : '#1890ff'}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </Space>
        )}
      </Modal>

      {/* Coach Program Timer Modal */}
      <Modal
        title={selectedSubjectForTimer ? 
          `${selectedSubjectForTimer.subject?.charAt(0).toUpperCase() + selectedSubjectForTimer.subject?.slice(1)} Çalışması` : 
          'Çalışma Seansı'
        }
        open={showTimerModal}
        onCancel={() => {
          setShowTimerModal(false);
          setSelectedSubjectForTimer(null);
          setSelectedProgramForTimer(null);
        }}
        footer={null}
        width={600}
        destroyOnClose
      >
        {selectedProgramForTimer && selectedSubjectForTimer && (
          <div>
            <Alert
              type="info"
              message="Koç Programı Çalışması"
              description={
                <Space direction="vertical" size="small">
                  <Text><strong>Program:</strong> {selectedProgramForTimer.title}</Text>
                  <Text><strong>Konu:</strong> {selectedSubjectForTimer.description}</Text>
                  <Text>Hedef Süre: {selectedSubjectForTimer.targetTime || 0} dakika</Text>
                  {selectedSubjectForTimer.targetQuestions && selectedSubjectForTimer.targetQuestions > 0 && (
                    <Text>Hedef Soru: {selectedSubjectForTimer.targetQuestions} adet</Text>
                  )}
                  {selectedProgramForTimer.coachNotes && (
                    <Text italic>💬 Koç Notu: {selectedProgramForTimer.coachNotes}</Text>
                  )}
                </Space>
              }
              style={{ marginBottom: 16 }}
            />
            <StudyTimer
              size="large"
              initialConfig={{
                subject: selectedSubjectForTimer.subject,
                studyDuration: selectedSubjectForTimer.targetTime || 25,
                technique: 'Freeform'
              }}
              onSessionComplete={handleSessionComplete}
              coachMode={true}
              coachProgram={{
                subject: selectedSubjectForTimer.subject,
                duration: selectedSubjectForTimer.targetTime || 25,
                description: selectedSubjectForTimer.description || 'Koç programı çalışması'
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StudyTracker;
