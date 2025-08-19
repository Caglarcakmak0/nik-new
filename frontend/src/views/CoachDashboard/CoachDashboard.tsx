import React, { useState, useEffect } from 'react';
import { Card, Typography, Table, Button, Space, Tag, Divider, Row, Col, Modal, Form, Input, Select, message, DatePicker, InputNumber, Badge, Progress, Avatar, Alert } from 'antd';
import { PlusOutlined, EyeOutlined, CalendarOutlined, ClockCircleOutlined, UserOutlined, PlayCircleOutlined, BookOutlined } from '@ant-design/icons';
import { useAuth, useIsCoach } from '../../contexts/AuthContext';
import { apiRequest, getCoachLiveDashboard } from '../../services/api';
import { StudentCard } from '../../components/coach';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import CoachDashboardTour from '../../components/tour/CoachTour/CoachDashboardTour';

dayjs.extend(relativeTime);
dayjs.locale('tr');

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface Student {
  _id: string;
  fullName: string;
  email: string;
  avatar?: string;
  grade: string;
  lastActivity: string;
  activePlansCount: number;
}

interface ProgramForm {
  studentId: string;
  date: string;
  subjects: Array<{
    subject: string;
    description: string;
    duration: number; // dakika cinsinden
  }>;
}

const CoachDashboard: React.FC = () => {
  const isCoach = useIsCoach();
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [form] = Form.useForm();
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [studentReports, setStudentReports] = useState<any[]>([]);
  const [dateFilter] = useState(dayjs());
  const [studentProgramMap, setStudentProgramMap] = useState<Record<string, string | null>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  
  // Live Dashboard State
  const [liveDashboard, setLiveDashboard] = useState<any>(null);
  const [liveDashboardLoading, setLiveDashboardLoading] = useState(false);

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
      const response = await getCoachLiveDashboard();
      
      // Demo data ekleme - eğer gerçek veri yoksa
      const demoData = response.data || {
        liveStudents: [
          {
            studentId: 'student1',
            studentName: 'Ahmet Yılmaz',
            avatar: null,
            planId: 'demo1',
            planTitle: 'Matematik Yoğunlaşma Programı',
            totalSubjects: 3,
            completedSubjects: 1,
            inProgressSubjects: 1,
            totalProgress: 65,
            totalStudyTime: 135,
            targetTime: 285,
            lastActivity: new Date(Date.now() - 5 * 60 * 1000) // 5 dakika önce
          },
          {
            studentId: 'student2', 
            studentName: 'Zeynep Kaya',
            avatar: null,
            planId: 'demo2',
            planTitle: 'TYT Karma Çalışma',
            totalSubjects: 2,
            completedSubjects: 2,
            inProgressSubjects: 0,
            totalProgress: 100,
            totalStudyTime: 120,
            targetTime: 120,
            lastActivity: new Date(Date.now() - 2 * 60 * 1000) // 2 dakika önce
          }
        ],
        recentActivity: [
          {
            studentId: 'student1',
            studentName: 'Ahmet Yılmaz',
            avatar: null,
            planTitle: 'Matematik Yoğunlaşma Programı',
            totalProgress: 65,
            lastActivity: new Date(Date.now() - 5 * 60 * 1000)
          },
          {
            studentId: 'student2',
            studentName: 'Zeynep Kaya', 
            avatar: null,
            planTitle: 'TYT Karma Çalışma',
            totalProgress: 100,
            lastActivity: new Date(Date.now() - 10 * 60 * 1000)
          },
          {
            studentId: 'student3',
            studentName: 'Mehmet Demir',
            avatar: null,
            planTitle: 'Fen Bilimleri Özel',
            totalProgress: 45,
            lastActivity: new Date(Date.now() - 25 * 60 * 1000)
          }
        ],
        summary: {
          totalStudentsToday: 8,
          activeNow: 2,
          totalCompletedPlans: 3,
          averageProgress: 78
        }
      };
      
      setLiveDashboard(demoData);
    } catch (error) {
      console.error('Live dashboard fetch error:', error);
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
  }, [dateFilter]);

  // Create program for student
  const handleCreateProgram = async (values: ProgramForm) => {
    try {
      // Toplam süreyi hesapla
      const totalDuration = values.subjects.reduce((total, subject) => total + subject.duration, 0);
      const totalHours = Math.floor(totalDuration / 60);
      const totalMinutes = totalDuration % 60;
      
      console.log('Creating program:', values);
      
      // Prepare data for backend
      const dateObj = typeof values.date === 'string' ? dayjs(values.date) : values.date;
      const programData = {
        studentId: selectedStudent?._id || values.studentId,
        date: dateObj.format('YYYY-MM-DD'),
        subjects: values.subjects,
        title: `Günlük Program - ${dateObj.format('DD/MM/YYYY')}`
      };
      
      // Send to backend (create or update)
      if (isEditMode && editingProgramId) {
        const updateData = {
          date: dateObj.format('YYYY-MM-DD'),
          subjects: values.subjects.map(s => ({ subject: s.subject, description: s.description, targetTime: s.duration, priority: 5 })),
          title: `Koç Programı - ${dateObj.format('DD/MM/YYYY')}`
        };
        await apiRequest(`/coach/programs/${editingProgramId}`, {
          method: 'PUT',
          body: JSON.stringify(updateData)
        });
        message.success('Program başarıyla güncellendi');
      } else {
        await apiRequest('/daily-plans/coach-create', {
          method: 'POST',
          body: JSON.stringify(programData)
        });
        message.success(
          `Program başarıyla oluşturuldu! Toplam süre: ${totalHours} saat ${totalMinutes} dakika`
        );
      }
      setShowCreateModal(false);
      form.resetFields();
      setSelectedStudent(null);
      setIsEditMode(false);
      setEditingProgramId(null);
      
      // Refresh students to update active plans count
      fetchStudents();
      
    } catch (error: any) {
      console.error('Program creation error:', error);
      message.error(error.message || 'Program oluşturulurken hata oluştu');
    }
  };

  // View student reports
  const handleViewReports = async (student: Student) => {
    setSelectedStudent(student);
    setShowReportsModal(true);
    
    try {
      setLoading(true);
      const response = await apiRequest(`/daily-plans/coach/student-reports?studentId=${student._id}`);
      setStudentReports(response.data || []);
    } catch (error: any) {
      console.error('Student reports fetch error:', error);
      message.error('Öğrenci raporları yüklenirken hata oluştu');
      setStudentReports([]);
    } finally {
      setLoading(false);
    }
  };

  const openEditProgram = async (student: Student, programId: string) => {
    try {
      setIsEditMode(true);
      setEditingProgramId(programId);
      setSelectedStudent(student);
      setShowCreateModal(true);
      const detail = await apiRequest(`/coach/programs/${programId}`);
      const d = detail?.data;
      form.setFieldsValue({
        date: d?.date ? dayjs(d.date) : dateFilter,
        subjects: (d?.subjects || []).map((sub: any) => ({
          subject: sub.subject,
          description: sub.description,
          duration: sub.targetTime || 60
        }))
      });
    } catch (e: any) {
      message.error(e.message || 'Program detayı yüklenemedi');
      setIsEditMode(false);
      setEditingProgramId(null);
    }
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
            <Button
              type="primary"
              size="small"
              onClick={() => openEditProgram(record, studentProgramMap[record._id] as string)}
            >
              Programı Düzenle
            </Button>
          ) : (
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => {
                setIsEditMode(false);
                setEditingProgramId(null);
                setSelectedStudent(record);
                setShowCreateModal(true);
                form.resetFields();
                form.setFieldsValue({ date: dateFilter, subjects: [{ subject: '', description: '', duration: 60 }] });
              }}
            >
              Program Oluştur
            </Button>
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

      {/* Live Dashboard Stats */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={6}>
          <Card loading={liveDashboardLoading}>
            <div style={{ textAlign: 'center' }}>
              <Title level={3} style={{ color: '#1890ff', margin: 0 }}>
                {liveDashboard?.summary?.totalStudentsToday || students.length}
              </Title>
              <Text type="secondary">Bugünkü Öğrenciler</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card loading={liveDashboardLoading}>
            <div style={{ textAlign: 'center' }}>
              <Title level={3} style={{ color: '#52c41a', margin: 0 }}>
                <Badge dot={liveDashboard?.summary?.activeNow > 0}>
                  {liveDashboard?.summary?.activeNow || 0}
                </Badge>
              </Title>
              <Text type="secondary">🔴 Şu An Aktif</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card loading={liveDashboardLoading}>
            <div style={{ textAlign: 'center' }}>
              <Title level={3} style={{ color: '#722ed1', margin: 0 }}>
                {liveDashboard?.summary?.totalCompletedPlans || 0}
              </Title>
              <Text type="secondary">Tamamlanan Planlar</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card loading={liveDashboardLoading}>
            <div style={{ textAlign: 'center' }}>
              <Title level={3} style={{ color: '#fa8c16', margin: 0 }}>
                %{liveDashboard?.summary?.averageProgress || 0}
              </Title>
              <Text type="secondary">Ortalama İlerleme</Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Live Activity Dashboard */}
      {liveDashboard?.liveStudents && liveDashboard.liveStudents.length > 0 && (
        <Card 
          title={
            <Space>
              <PlayCircleOutlined style={{ color: '#52c41a' }} />
              <Text strong>🔴 Canlı Çalışan Öğrenciler</Text>
              <Badge count={liveDashboard.liveStudents.length} style={{ backgroundColor: '#52c41a' }} />
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
                    <Tag color={activity.totalProgress === 100 ? 'success' : 'processing'} size="small">
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
      <Card title="Öğrenci Listesi" extra={
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => setShowCreateModal(true)}
        >
          Yeni Program Oluştur
        </Button>
      }>
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

      {/* Create Program Modal */}
      <Modal
        title={selectedStudent ? `${selectedStudent.fullName} için Program Oluştur` : "Yeni Program Oluştur"}
        open={showCreateModal}
        onCancel={() => {
          setShowCreateModal(false);
          setSelectedStudent(null);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateProgram}
          initialValues={{
            date: dayjs(),
            subjects: [{ subject: '', description: '', duration: 60 }] // 60 dakika varsayılan
          }}
        >
          {!selectedStudent && (
            <Form.Item
              name="studentId"
              label="Öğrenci Seçin"
              rules={[{ required: true, message: 'Öğrenci seçiniz' }]}
            >
              <Select placeholder="Öğrenci seçin...">
                {students.map(student => (
                  <Option key={student._id} value={student._id}>
                    {student.fullName} - {student.grade}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item
            name="date"
            label="Program Tarihi"
            rules={[{ required: true, message: 'Tarih seçiniz' }]}
          >
            <DatePicker 
              style={{ width: '100%' }} 
              format="DD/MM/YYYY"
              placeholder="Tarih seçin..."
            />
          </Form.Item>

          <Divider>Dersler ve Konular</Divider>

          <Form.List name="subjects">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Card key={key} size="small" style={{ marginBottom: '16px' }}>
                    <Row gutter={16}>
                      <Col span={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'subject']}
                          label="Ders"
                          rules={[{ required: true, message: 'Ders adı giriniz' }]}
                        >
                          <Select placeholder="Ders seçin...">
                            <Option value="matematik">📐 Matematik</Option>
                            <Option value="turkce">Türkçe</Option>
                            <Option value="kimya">🧪 Kimya</Option>
                            <Option value="fizik">🔬 Fizik</Option>
                            <Option value="biyoloji">🌱 Biyoloji</Option>
                            <Option value="tarih">Tarih</Option>
                            <Option value="cografya">🌍 Coğrafya</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                     
                      <Col span={12}>
                        <Form.Item
                          {...restField}
                          name={[name, 'description']}
                          label="Konu Açıklaması"
                          rules={[{ required: true, message: 'Konu açıklaması giriniz' }]}
                        >
                          <TextArea
                            rows={2}
                            placeholder="Örnek: Mutlak değer konu anlatım 1-2 videoları izlenip pekiştirme soruları çözülecek"
                          />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item
                          {...restField}
                          name={[name, 'duration']}
                          label="Süre (dk)"
                          rules={[{ required: true, message: 'Süre giriniz' }]}
                        >
                          <InputNumber<number>
                            min={15}
                            max={480}
                            step={15}
                            placeholder="60"
                            style={{ width: '100%' }}
                            formatter={(value) => `${value} dk`}
                            parser={(value: string | undefined) => Number((value || '').replace(' dk', ''))}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={2}>
                        <Button
                          type="text"
                          danger
                          onClick={() => remove(name)}
                          style={{ marginTop: '30px' }}
                        >
                          Sil
                        </Button>
                      </Col>
                    </Row>
                  </Card>
                ))}
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    block
                    icon={<PlusOutlined />}
                  >
                    Ders Ekle
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <div style={{ textAlign: 'right', marginTop: '24px' }}>
            <Space>
              <Button onClick={() => {
                setShowCreateModal(false);
                setSelectedStudent(null);
                form.resetFields();
              }}>
                İptal
              </Button>
              <Button type="primary" htmlType="submit" icon={<CalendarOutlined />}>
                {isEditMode ? 'Programı Kaydet' : 'Program Oluştur'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Student Reports Modal */}
      <Modal
        title={selectedStudent ? `${selectedStudent.fullName} - Günlük Raporlar` : "Öğrenci Raporları"}
        open={showReportsModal}
        onCancel={() => {
          setShowReportsModal(false);
          setSelectedStudent(null);
          setStudentReports([]);
        }}
        footer={null}
        width={1200}
      >
        <div>
          {studentReports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Text type="secondary">
                Bu öğrenci henüz rapor göndermemiş.
              </Text>
            </div>
          ) : (
            studentReports.map((report) => (
              <Card key={report._id} style={{ marginBottom: '16px' }}>
                {/* Report Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <Title level={4} style={{ margin: 0 }}>
                      {dayjs(report.date).format('DD/MM/YYYY')} - {report.title}
                    </Title>
                    <Text type="secondary">
                      Gönderim: {dayjs(report.submittedAt).format('DD/MM/YYYY HH:mm')}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a' }}>
                        {report.stats.netScore.toFixed(1)}
                      </div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Net</Text>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>
                        %{report.stats.completionRate}
                      </div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Tamamlanma</Text>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#722ed1' }}>
                        {report.studentFeedback.motivationScore}/10
                      </div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Motivasyon</Text>
                    </div>
                  </div>
                </div>

                {/* Subject Results Table */}
                <Table
                  dataSource={report.subjects.map((subject: any, idx: number) => ({...subject, key: idx}))}
                  pagination={false}
                  size="small"
                  columns={[
                    {
                      title: 'Ders',
                      dataIndex: 'subject',
                      key: 'subject',
                      render: (subject: string) => {
                        const names: Record<string, string> = {
                          matematik: '📐 Matematik',
                          turkce: 'Türkçe', 
                          kimya: '🧪 Kimya',
                          fizik: '🔬 Fizik',
                          biyoloji: '🌱 Biyoloji',
                          tarih: 'Tarih',
                          cografya: '🌍 Coğrafya'
                        };
                        return names[subject] || subject;
                      }
                    },
                    {
                      title: 'Açıklama',
                      dataIndex: 'description',
                      key: 'description',
                      render: (desc: string) => (
                        <Text style={{ fontSize: '12px' }}>
                          {desc.length > 50 ? desc.substring(0, 50) + '...' : desc}
                        </Text>
                      )
                    },
                    {
                      title: 'D',
                      dataIndex: 'correctAnswers',
                      key: 'correct',
                      align: 'center',
                      width: 50,
                      render: (correct: number) => (
                        <Text style={{ color: '#52c41a', fontWeight: 'bold' }}>
                          {correct}
                        </Text>
                      )
                    },
                    {
                      title: 'Y',
                      dataIndex: 'wrongAnswers',
                      key: 'wrong',
                      align: 'center',
                      width: 50,
                      render: (wrong: number) => (
                        <Text style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
                          {wrong}
                        </Text>
                      )
                    },
                    {
                      title: 'B',
                      dataIndex: 'blankAnswers',
                      key: 'blank',
                      align: 'center',
                      width: 50,
                      render: (blank: number) => (
                        <Text style={{ color: '#8c8c8c', fontWeight: 'bold' }}>
                          {blank}
                        </Text>
                      )
                    },
                    {
                      title: 'Net',
                      dataIndex: 'netScore',
                      key: 'net',
                      align: 'center',
                      width: 60,
                      render: (net: number) => (
                        <Text style={{ color: '#faad14', fontWeight: 'bold' }}>
                          {net.toFixed(1)}
                        </Text>
                      )
                    },
                    {
                      title: 'Süre',
                      dataIndex: 'targetTime',
                      key: 'time',
                      align: 'center',
                      width: 60,
                      render: (time: number) => (
                        <Text>{time} dk</Text>
                      )
                    }
                  ]}
                />

                {/* Student Feedback */}
                {report.studentFeedback.feedbackText && (
                  <div style={{ marginTop: '16px', padding: '12px', background: '#f9f9f9', borderRadius: '8px' }}>
                    <Text strong>Öğrenci Feedback:</Text>
                    <div style={{ marginTop: '8px' }}>
                      <Text>{report.studentFeedback.feedbackText}</Text>
                    </div>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </Modal>

      {/* Coach page tour */}
      <CoachDashboardTour
        userId={user?._id}
        targets={{
          getHeaderEl: () => document.querySelector('.ant-typography') as HTMLElement | null,
          getStatsCardsEl: () => document.querySelector('.ant-row') as HTMLElement | null,
          getCreateButtonEl: () => document.querySelector('.ant-card .ant-btn-primary') as HTMLElement | null,
          getTableEl: () => document.querySelector('.ant-table') as HTMLElement | null,
        }}
      />
    </div>
  );
};

export default CoachDashboard;
