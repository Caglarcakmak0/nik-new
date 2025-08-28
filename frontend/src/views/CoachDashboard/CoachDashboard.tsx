import React, { useState, useEffect } from 'react';
import { Card, Typography, Table, Button, Space, Tag, Row, Col, message, Progress, Avatar } from 'antd';
import { PlusOutlined, EyeOutlined, ClockCircleOutlined, UserOutlined, PlayCircleOutlined, BookOutlined } from '@ant-design/icons';
import { useAuth, useIsCoach } from '../../contexts/AuthContext';
import { apiRequest, getCoachLiveDashboard } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { StudentCard } from '../../components/coach';
import { AnalyticsMiniCard, AnalyticsRangeCard, AnalyticsRange } from '../../components/feature/analytics';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('tr');

const { Title, Text } = Typography;

interface Student {
  _id: string;
  fullName: string;
  email: string;
  avatar?: string;
  grade: string;
  lastActivity: string;
  activePlansCount: number;
}


const CoachDashboard: React.FC = () => {
  const isCoach = useIsCoach();
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  // Rapor / seçili öğrenci modalı kaldırıldı; ilgili state temizlendi
  const [dateFilter] = useState(dayjs());
  const [studentProgramMap, setStudentProgramMap] = useState<Record<string, string | null>>({});
  // isEditMode legacy state kaldırıldı

  // Sample teacher playlists (static demo data - replace with YouTube API results later)
  // (Modal kaldırıldı - YouTube entegrasyonu CreateProgram sayfasına taşındı)
  
  // Live Dashboard State
  const [liveDashboard, setLiveDashboard] = useState<any>(null);
  const [liveDashboardLoading, setLiveDashboardLoading] = useState(false);
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>('daily');

  // Redirect if not coach
  if (!isCoach) {
    return (
      <Card>
        <Text type="secondary">Bu sayfaya erişim yetkiniz bulunmuyor.</Text>
      </Card>
    );
  }

  // Fetch students assigned to coach
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/coach/students');
      setStudents(response.data || []);
      const dateStr = dateFilter.format('YYYY-MM-DD');
      const map: Record<string, string | null> = {};
      await Promise.all(
        (response.data || []).map(async (s: Student) => {
          try {
            const res = await apiRequest(`/coach/programs?studentId=${s._id}&date=${dateStr}&limit=1`);
            const first = (res.data || [])[0];
            map[s._id] = first?._id || null;
          } catch {
            map[s._id] = null;
          }
        })
      );
      setStudentProgramMap(map);
    } catch (error) {
      console.error('Students fetch error:', error);
      message.error('Öğrenci listesi yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Fetch live dashboard
  const fetchLiveDashboard = async () => {
    try {
      setLiveDashboardLoading(true);
      const response = await getCoachLiveDashboard(analyticsRange);
      setLiveDashboard(response.data); // no fallback demo data
    } catch (error) {
      console.error('Live dashboard fetch error:', error);
      setLiveDashboard(null);
    } finally {
      setLiveDashboardLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchLiveDashboard();
    
    // Auto-refresh live dashboard every 30 seconds
    const interval = setInterval(fetchLiveDashboard, 30000);
    return () => clearInterval(interval);
  }, [dateFilter, analyticsRange]);

  // Create program for student
  // Program oluşturma işlemi CreateProgram sayfasına taşındı

  // View student reports
  // Öğrenci rapor modalı kaldırıldı; ileride ayrı route'a taşınabilir.
  const handleViewReports = async (_student: Student) => {
    message.info('Rapor görüntüleme yakında ayrı sayfada sunulacak');
  };

  const openEditProgram = async (student: Student, programId: string) => {
    navigate(`/coach/programs/create?studentId=${student._id}&editId=${programId}`);
  };

  // Table columns
  const columns = [
    {
      title: 'Öğrenci',
      key: 'student',
      render: (_: any, record: Student) => <StudentCard student={record} />,
    },
    {
      title: 'Son Aktivite',
      dataIndex: 'lastActivity',
      key: 'lastActivity',
      render: (date: string) => (
        <Text>{dayjs(date).format('DD/MM/YYYY')}</Text>
      ),
    },
    {
      title: 'Bugünkü Planlar',
      dataIndex: 'activePlansCount',
      key: 'activePlansCount',
      align: 'center' as const,
      render: (count: number) => (
        <Tag color={count > 0 ? 'green' : 'red'}>{count}</Tag>
      ),
    },
    // Öğrenciye ait gamification/başarı yüzdeleri koç panelinden kaldırıldı
    {
      title: 'İşlemler',
      key: 'actions',
      render: (_: any, record: Student) => (
        <Space>
          {studentProgramMap[record._id] ? (
            <Button type="primary" size="small" onClick={() => openEditProgram(record, studentProgramMap[record._id] as string)}>Programı Düzenle</Button>
          ) : (
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => navigate(`/coach/programs/create?studentId=${record._id}`)}>Program Oluştur</Button>
          )}
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewReports(record)}
          >
            Raporlar
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ fontWeight: 500, fontSize: '24px' }}>👨‍🏫 Koç Paneli</Title>
      </div>

      {/* Range Filter (top-right) */}
      <div style={{ width:'100%', display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
        <AnalyticsRangeCard value={analyticsRange} onChange={setAnalyticsRange} />
      </div>
      {/* Live Dashboard Stats */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={12} md={6} style={{ marginBottom: 12 }}>
          <AnalyticsMiniCard
            title="Bugünkü Öğrenciler"
            subValue={liveDashboard?.summary?.totalStudentsToday ?? '-'}
            data={liveDashboard?.summary?.spark1 || []}
            loading={liveDashboardLoading}
            color="#1890ff"
          />
        </Col>
        <Col xs={12} md={6} style={{ marginBottom: 12 }}>
          <AnalyticsMiniCard
            title="Şu An Aktif"
            subValue={liveDashboard?.summary?.activeNow ?? '-'}
            data={liveDashboard?.summary?.spark2 || []}
            loading={liveDashboardLoading}
            color="#52c41a"
            positive
          />
        </Col>
        <Col xs={12} md={6} style={{ marginBottom: 12 }}>
          <AnalyticsMiniCard
            title="Tamamlanan Planlar"
            subValue={liveDashboard?.summary?.totalCompletedPlans ?? '-'}
            data={liveDashboard?.summary?.spark3 || []}
            loading={liveDashboardLoading}
            color="#722ed1"
          />
        </Col>
        <Col xs={12} md={6} style={{ marginBottom: 12 }}>
          <AnalyticsMiniCard
            title="Ortalama İlerleme"
            subValue={liveDashboard?.summary?.averageProgress !== undefined ? '%' + liveDashboard.summary.averageProgress : '-'}
            data={liveDashboard?.summary?.spark4 || []}
            loading={liveDashboardLoading}
            color="#fa8c16"
          />
        </Col>
      </Row>

      {/* Live Activity Dashboard */}
      {liveDashboard?.liveStudents && liveDashboard.liveStudents.length > 0 && (
        <Card 
          title={
            <Space>
              <PlayCircleOutlined style={{ color: '#52c41a' }} />
              <Text strong>🔴 Canlı Çalışan Öğrenciler</Text>
            </Space>
          }
          style={{ marginBottom: '24px' }}
        >
          <Row gutter={[16, 16]}>
            {liveDashboard.liveStudents.slice(0, 6).map((student: any) => (
              <Col xs={24} sm={12} md={8} key={student.studentId}>
                <Card size="small" style={{ borderLeft: '3px solid #52c41a' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                    <Avatar 
                      src={student.avatar} 
                      icon={<UserOutlined />} 
                      size="small"
                      style={{ marginRight: 8 }}
                    />
                    <div style={{ flex: 1 }}>
                      <Text strong style={{ fontSize: '14px' }}>{student.studentName}</Text>
                      <div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          <ClockCircleOutlined /> {dayjs(student.lastActivity).fromNow()}
                        </Text>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: 8 }}>
                    <Text style={{ fontSize: '12px' }}>{student.planTitle}</Text>
                  </div>
                  
                  <Progress 
                    percent={student.totalProgress} 
                    size="small" 
                    strokeColor="#52c41a"
                    format={(percent) => `${percent}%`}
                  />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      <BookOutlined /> {student.completedSubjects}/{student.totalSubjects} konu
                    </Text>
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      <ClockCircleOutlined /> {student.totalStudyTime}/{student.targetTime} dk
                    </Text>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
          {liveDashboard.liveStudents.length > 6 && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Text type="secondary">+{liveDashboard.liveStudents.length - 6} öğrenci daha çalışıyor...</Text>
            </div>
          )}
        </Card>
      )}

      {/* Recent Activity */}
      {liveDashboard?.recentActivity && liveDashboard.recentActivity.length > 0 && (
        <Card 
          title="Son Aktiviteler"
          style={{ marginBottom: '24px' }}
          extra={
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Son 30 dakika • Otomatik yenilenir
            </Text>
          }
        >
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {liveDashboard.recentActivity.slice(0, 10).map((activity: any) => (
              <div key={activity.studentId} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: '1px solid #f0f0f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar 
                    src={activity.avatar} 
                    icon={<UserOutlined />} 
                    size="small"
                    style={{ marginRight: 8 }}
                  />
                  <div>
                    <Text style={{ fontSize: '13px' }}>{activity.studentName}</Text>
                    <div>
                      <Text type="secondary" style={{ fontSize: '11px' }}>{activity.planTitle}</Text>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div>
                    <Tag color={activity.totalProgress === 100 ? 'success' : 'processing'}>
                      %{activity.totalProgress}
                    </Tag>
                  </div>
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    {dayjs(activity.lastActivity).format('HH:mm')}
                  </Text>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

  {/* Students Table */}
  <Card title="Öğrenci Listesi" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/coach/programs/create')}>Yeni Program Oluştur</Button>}>
        <Table
          columns={columns}
          dataSource={students}
          loading={loading}
          rowKey="_id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} / ${total} öğrenci`
          }}
        />
      </Card>

    
    </div>
  );
};

export default CoachDashboard;
