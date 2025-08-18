import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, Row, Col, Typography, Table, Tag, Space, Empty, Avatar } from 'antd';
import { Drawer, Button } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { TeamOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { CoachCard } from '../../components/admin';
import StudentMonthlyCalendar from '../../components/admin/StudentMonthlyCalendar';
import { getAdminCoachStudents, getAdminCoachPerformance, apiRequest } from '../../services/api';
import { Modal, Form, Input, DatePicker, Divider, message } from 'antd';
import dayjs, { Dayjs } from 'dayjs';

const { Title, Text } = Typography;

type ApiResponse<T> = { message: string; data: T; pagination?: { page: number; limit: number; total: number } };

type StudentsResponseItem = {
  _id: string;
  name: string;
  email: string;
  grade?: string;
  city?: string;
};

type CoachPerformance = {
  coachId: string;
  studentStats: { total: number; active: number; inactive: number };
  feedbackStats: {
    totalFeedbacks: number;
    averageRating: number;
    categoryAverages: { communication: number; programQuality: number; overallSatisfaction: number };
    issuesCounts: { tooMuchPressure: number; notEnoughSupport: number; communicationProblems: number; programNotSuitable: number };
    lastFeedbackDate: string | null;
  };
  lastUpdated: string | null;
};

const CoachDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = React.useState(true);
  const [students, setStudents] = React.useState<StudentsResponseItem[]>([]);
  const [perf, setPerf] = React.useState<CoachPerformance | null>(null);
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [selectedStudentId, setSelectedStudentId] = React.useState<string | null>(null);
  const [selectedDate, setSelectedDate] = React.useState<Dayjs>(dayjs());

  // Program düzenleme modal durumu
  const [programModalOpen, setProgramModalOpen] = React.useState(false);
  const [programLoading, setProgramLoading] = React.useState(false);
  const [programSaving, setProgramSaving] = React.useState(false);
  const [editingProgram, setEditingProgram] = React.useState<null | {
    id: string;
    title: string;
    date: Dayjs;
    coachNotes?: string;
    subjects: Array<{ subject?: string; description?: string; targetTime?: number; priority?: number; notes?: string }>; 
  }>(null);

  const fetchData = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [studentsRes, perfRes] = await Promise.all([
        getAdminCoachStudents(id, { status: 'active', page: 1, limit: 20 }) as Promise<ApiResponse<StudentsResponseItem[]>>,
        getAdminCoachPerformance(id) as Promise<ApiResponse<CoachPerformance>>,
      ]);
      setStudents(studentsRes.data || []);
      setPerf(perfRes.data as any);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const columns: ColumnsType<StudentsResponseItem> = [
    { title: 'Öğrenci', dataIndex: 'name', key: 'name', render: (name: string) => (
      <Space><Avatar icon={<UserOutlined />} /><Text strong>{name}</Text></Space>
    ) },
    { title: 'E-posta', dataIndex: 'email', key: 'email' },
    { title: 'Sınıf', dataIndex: 'grade', key: 'grade', render: (v?: string) => v || '-' },
    { title: 'Şehir', dataIndex: 'city', key: 'city', render: (v?: string) => v || '-' },
    { title: 'Aksiyon', key: 'action', render: (_, record) => (
      <Button size="small" onClick={() => { setSelectedStudentId(record._id); setSelectedDate(dayjs()); setCalendarOpen(true); }}>
        Aylık Program
      </Button>
    ) }
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <UserOutlined style={{ color: '#1890ff' }} />
        <Title level={4} style={{ margin: 0 }}>Koç Detayı</Title>
        <Tag color="blue">Admin</Tag>
      </Space>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={10}>
          {perf ? (
            <CoachCard
              loading={loading}
              data={{
                coach: { id: id!, name: 'Koç', email: undefined }, // temel başlık; API email'i Admin sayfada ayrı
                studentStats: perf.studentStats,
                feedbackStats: perf.feedbackStats as any,
                lastUpdated: perf.lastUpdated,
              }}
            />
          ) : (
            <Card loading={loading}>
              <Empty description="Performans verisi yok" />
            </Card>
          )}
        </Col>
        <Col xs={24} md={14}>
          <Card title={<Space><TeamOutlined />Aktif Öğrenciler</Space>} loading={loading}>
            <Table columns={columns} dataSource={students} rowKey="_id" pagination={false} />
          </Card>
        </Col>
      </Row>
      <Drawer
        title="Öğrenci Aylık Programı (Koç kaynaklı)"
        open={calendarOpen}
        width={720}
        onClose={() => { setCalendarOpen(false); setSelectedStudentId(null); }}
      >
        {selectedStudentId && (
          <StudentMonthlyCalendar
            studentId={selectedStudentId}
            selectedDate={selectedDate}
            onDateSelect={async (date) => {
              try {
                setSelectedDate(date);
                if (!selectedStudentId) return;
                if (!id) return;
                setProgramLoading(true);
                const dateStr = date.format('YYYY-MM-DD');
                const qs = new URLSearchParams({ studentId: selectedStudentId, date: dateStr, coachId: id });
                const listRes = await apiRequest(`/coach/programs?${qs.toString()}`);
                const items: Array<{ _id: string }> = listRes?.data || [];
                if (!items.length) {
                  message.info('Seçilen günde koç tarafından oluşturulmuş program bulunamadı.');
                  return;
                }
                const programId = items[0]._id;
                const detailRes = await apiRequest(`/coach/programs/${programId}`);
                const d = detailRes?.data;
                setEditingProgram({
                  id: d._id,
                  title: d.title || '',
                  date: d.date ? dayjs(d.date) : date,
                  coachNotes: d.coachNotes || '',
                  subjects: (d.subjects || []).map((s: any) => ({
                    subject: s.subject || '',
                    description: s.description || '',
                    targetTime: typeof s.targetTime === 'number' ? s.targetTime : undefined,
                    priority: typeof s.priority === 'number' ? s.priority : 5,
                    notes: s.notes || ''
                  }))
                });
                setProgramModalOpen(true);
              } catch (e: any) {
                message.error(e?.message || 'Program detayı yüklenemedi');
              } finally {
                setProgramLoading(false);
              }
            }}
          />
        )}

        <Modal
          title={editingProgram ? 'Programı Görüntüle/Düzenle' : 'Program Detayı'}
          open={programModalOpen}
          onCancel={() => { setProgramModalOpen(false); setEditingProgram(null); }}
          onOk={async () => {
            if (!editingProgram) return;
            try {
              setProgramSaving(true);
              await apiRequest(`/coach/programs/${editingProgram.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                  title: editingProgram.title,
                  coachNotes: editingProgram.coachNotes || '',
                  date: editingProgram.date ? editingProgram.date.format('YYYY-MM-DD') : undefined,
                  subjects: (editingProgram.subjects || []).map((s) => ({
                    subject: s.subject || 'diger',
                    description: s.description || '',
                    targetTime: typeof s.targetTime === 'number' ? s.targetTime : undefined,
                    priority: typeof s.priority === 'number' ? s.priority : 5,
                    notes: s.notes || ''
                  }))
                })
              });
              message.success('Program güncellendi');
              setProgramModalOpen(false);
              setEditingProgram(null);
            } catch (e: any) {
              message.error(e?.message || 'Program güncellenemedi');
            } finally {
              setProgramSaving(false);
            }
          }}
          okText="Kaydet"
          cancelText="Kapat"
          confirmLoading={programSaving}
          destroyOnClose
          width={720}
        >
          {programLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
              Yükleniyor...
            </div>
          ) : editingProgram ? (
            <div>
              <Form layout="vertical">
                <Form.Item label="Başlık">
                  <Input
                    value={editingProgram.title}
                    onChange={(e) => setEditingProgram(prev => prev ? { ...prev, title: e.target.value } : prev)}
                    placeholder="Program başlığı"
                  />
                </Form.Item>
                <Form.Item label="Program Tarihi">
                  <DatePicker
                    value={editingProgram.date}
                    onChange={(val) => setEditingProgram(prev => prev && val ? { ...prev, date: val } : prev)}
                    style={{ width: '100%' }}
                    format="DD/MM/YYYY"
                  />
                </Form.Item>
                <Form.Item label="Koç Notları">
                  <Input.TextArea
                    rows={3}
                    value={editingProgram.coachNotes}
                    onChange={(e) => setEditingProgram(prev => prev ? { ...prev, coachNotes: e.target.value } : prev)}
                    placeholder="Örn: Genel hatlar / duyurular"
                    maxLength={1000}
                    showCount
                  />
                </Form.Item>

                <Divider>Ders ve Konular</Divider>
                {(editingProgram.subjects || []).map((subj, idx) => (
                  <div key={idx} style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                    <Form.Item label={`Ders ${idx + 1} - Adı`}>
                      <Input
                        value={subj.subject}
                        onChange={(e) => setEditingProgram(prev => {
                          if (!prev) return prev;
                          const next = [...prev.subjects];
                          next[idx] = { ...next[idx], subject: e.target.value };
                          return { ...prev, subjects: next };
                        })}
                        placeholder="Örn: Matematik"
                      />
                    </Form.Item>
                    <Form.Item label="Açıklama">
                      <Input
                        value={subj.description}
                        onChange={(e) => setEditingProgram(prev => {
                          if (!prev) return prev;
                          const next = [...prev.subjects];
                          next[idx] = { ...next[idx], description: e.target.value };
                          return { ...prev, subjects: next };
                        })}
                        placeholder="Konu/alt konu"
                      />
                    </Form.Item>
                    <Form.Item label="Hedef Süre (dk)">
                      <Input
                        type="number"
                        value={typeof subj.targetTime === 'number' ? subj.targetTime : ''}
                        onChange={(e) => setEditingProgram(prev => {
                          if (!prev) return prev;
                          const next = [...prev.subjects];
                          const val = Number(e.target.value);
                          next[idx] = { ...next[idx], targetTime: isNaN(val) ? undefined : val };
                          return { ...prev, subjects: next };
                        })}
                        placeholder="Örn: 60"
                      />
                    </Form.Item>
                  </div>
                ))}

                <Button
                  onClick={() => setEditingProgram(prev => prev ? { ...prev, subjects: [...prev.subjects, { subject: '', description: '', targetTime: 60, priority: 5, notes: '' }] } : prev)}
                >
                  Ders Ekle
                </Button>
              </Form>
            </div>
          ) : (
            <Empty description="Program bilgisi yok" />
          )}
        </Modal>
      </Drawer>
    </div>
  );
};

export default CoachDetail;


