import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Table, Button, Space, Tag, Form, Select, DatePicker, Modal, Input, message, Switch, Popconfirm, InputNumber, Divider, Row, Col } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import { apiRequest } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import ProgramManagerTour from '../../components/tour/CoachTour/ProgramManagerTour';

const { Option } = Select;

interface ProgramRow {
  _id: string;
  title: string;
  date: string;
  student?: {
    _id: string;
    name: string;
    email: string;
  } | null;
  subjectsCount: number;
  status: 'draft' | 'active' | 'completed' | 'failed' | 'archived';
}

interface PaginationState {
  current: number;
  pageSize: number;
  total: number;
}

type ProgramDetailSubject = {
  subject: string;
  description?: string;
  targetTime?: number;
  priority?: number;
  notes?: string;
};

type ProgramDetail = {
  _id: string;
  title?: string;
  date: string;
  status?: string;

  subjects: ProgramDetailSubject[];
};

const subjectOptions: { value: string; label: string }[] = [
  // TYT
  { value: 'matematik', label: 'Matematik' },
  { value: 'geometri', label: 'Geometri' },
  { value: 'turkce', label: 'Türkçe' },
  { value: 'tarih', label: 'Tarih' },
  { value: 'cografya', label: 'Coğrafya' },
  { value: 'felsefe', label: 'Felsefe' },
  { value: 'fizik', label: 'Fizik' },
  { value: 'kimya', label: 'Kimya' },
  { value: 'biyoloji', label: 'Biyoloji' },
  // AYT
  { value: 'matematik_ayt', label: 'Matematik (AYT)' },
  { value: 'fizik_ayt', label: 'Fizik (AYT)' },
  { value: 'kimya_ayt', label: 'Kimya (AYT)' },
  { value: 'biyoloji_ayt', label: 'Biyoloji (AYT)' },
  { value: 'edebiyat', label: 'Edebiyat' },
  { value: 'tarih_ayt', label: 'Tarih (AYT)' },
  { value: 'cografya_ayt', label: 'Coğrafya (AYT)' },
  // YDT
  { value: 'ingilizce', label: 'İngilizce' },
  { value: 'almanca', label: 'Almanca' },
  { value: 'fransizca', label: 'Fransızca' },
  // Diğer
  { value: 'genel_tekrar', label: 'Genel Tekrar' },
  { value: 'deneme_sinavi', label: 'Deneme Sınavı' },
  { value: 'diger', label: 'Diğer' },
];

const ProgramManager: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const filtersRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<HTMLDivElement | null>(null);
  const mockBtnRef = useRef<HTMLButtonElement | null>(null);
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({ current: 1, pageSize: 10, total: 0 });

  // Filters
  const [students, setStudents] = useState<{ value: string; label: string }[]>([]);
  const [filters, setFilters] = useState<{ studentId?: string; date?: Dayjs | null }>({});

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editing, setEditing] = useState<{ id: string; title: string; date: Dayjs | null; subjects: ProgramDetailSubject[] } | null>(null);
  const [hideMock, setHideMock] = useState<boolean>(true);
  const [deletingMock, setDeletingMock] = useState<boolean>(false);

  const columns: ColumnsType<ProgramRow> = [
    {
      title: 'Öğrenci',
      dataIndex: ['student', 'name'],
      key: 'student',
      render: (_: any, record) => record.student ? (
        <div>
          <div style={{ fontWeight: 600 }}>{record.student.name}</div>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>{record.student.email}</div>
        </div>
      ) : <span>-</span>
    },
    { title: 'Başlık', dataIndex: 'title', key: 'title' },
    {
      title: 'Tarih',
      dataIndex: 'date',
      key: 'date',
      render: (value: string) => dayjs(value).format('DD/MM/YYYY'),
      width: 130
    },
    {
      title: 'Ders Sayısı',
      dataIndex: 'subjectsCount',
      key: 'subjectsCount',
      align: 'center',
      width: 110
    },
    {
      title: 'Durum',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: ProgramRow['status']) => {
        const color =
          status === 'active' ? 'processing' :
          status === 'completed' ? 'success' :
          status === 'failed' ? 'error' :
          status === 'archived' ? 'default' : 'default';
        return <Tag color={color}>{status}</Tag>;
      }
    },
    {
      title: 'İşlemler',
      key: 'actions',
      width: 140,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openEdit(record)}>Düzenle</Button>
          <Popconfirm
            title="Bu program silinsin mi?"
            okText="Evet"
            cancelText="Hayır"
            onConfirm={() => deleteProgram(record._id)}
          >
            <Button size="small" danger>Sil</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const fetchStudents = async () => {
    try {
      const res = await apiRequest(`/coach/students?page=1&limit=100`);
      const items = (res.data || []).map((s: any) => ({
        value: s._id,
        label: s.fullName || s.email
      }));
      setStudents(items);
    } catch (e: any) {
      message.error(e.message || 'Öğrenci listesi getirilemedi');
    }
  };

  const fetchPrograms = async (page = pagination.current, pageSize = pagination.pageSize) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));
      if (filters.studentId) params.set('studentId', filters.studentId);
      if (filters.date) params.set('date', filters.date!.format('YYYY-MM-DD'));

      const res = await apiRequest(`/coach/programs?${params.toString()}`);
      setPrograms(res.data || []);
      setPagination({
        current: page,
        pageSize,
        total: res.pagination?.total || 0
      });
    } catch (e: any) {
      message.error(e.message || 'Program listesi getirilemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchProgramDetail = async (id: string) => {
    const res = await apiRequest(`/coach/programs/${id}`);
    return res.data as ProgramDetail;
  };

  const openEdit = async (row: ProgramRow) => {
    try {
      setEditLoading(true);
      const detail = await fetchProgramDetail(row._id);
      setEditing({
        id: row._id,
        title: detail?.title || row.title || '',

        date: detail?.date ? dayjs(detail.date) : (row.date ? dayjs(row.date) : null),
        subjects: Array.isArray(detail?.subjects) ? detail.subjects : []
      });
      setEditOpen(true);
    } catch (e: any) {
      message.error(e.message || 'Program detayı yüklenemedi');
    } finally {
      setEditLoading(false);
    }
  };

  const submitEdit = async () => {
    if (!editing) return;
    try {
      setEditLoading(true);
      await apiRequest(`/coach/programs/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editing.title,

          date: editing.date ? editing.date.format('YYYY-MM-DD') : undefined,
          subjects: (editing.subjects || []).map((s) => ({
            subject: s.subject || 'diger',
            description: s.description || '',
            targetTime: typeof s.targetTime === 'number' ? s.targetTime : undefined,
            priority: typeof s.priority === 'number' ? s.priority : 5,

          }))
        })
      });
      message.success('Program güncellendi');
      setEditOpen(false);
      setEditing(null);
      fetchPrograms();
    } catch (e: any) {
      message.error(e.message || 'Program güncellenemedi');
    } finally {
      setEditLoading(false);
    }
  };

  const updateSubjectField = (index: number, field: keyof ProgramDetailSubject, value: any) => {
    setEditing(prev => {
      if (!prev) return prev;
      const next = [...prev.subjects];
      const current = { ...(next[index] || {}) } as ProgramDetailSubject;
      (current as any)[field] = value;
      next[index] = current;
      return { ...prev, subjects: next };
    });
  };

  const addSubject = () => {
    setEditing(prev => prev ? ({
      ...prev,
      subjects: [
        ...prev.subjects,
        { subject: 'diger', description: '', targetTime: undefined, priority: 5 }
      ]
    }) : prev);
  };

  // Not: Backend ekstra konuları otomatik silmediği için kaldırma işlemini UI'da göstermiyoruz.

 


  const deleteProgram = async (id: string) => {
    try {
      await apiRequest(`/coach/programs/${id}`, { method: 'DELETE' });
      message.success('Program silindi');
      fetchPrograms();
    } catch (e: any) {
      message.error(e.message || 'Program silinemedi');
    }
  };



  const handleTableChange = (p: TablePaginationConfig) => {
    fetchPrograms(p.current || 1, p.pageSize || 10);
  };

  const applyFilters = () => {
    fetchPrograms(1, pagination.pageSize);
  };

  const resetFilters = () => {
    setFilters({});
    fetchPrograms(1, pagination.pageSize);
  };

  useEffect(() => {
    fetchStudents();
    fetchPrograms(1, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <Card title="Program Yönetimi" style={{ marginBottom: 16 }}>
        <div ref={filtersRef as any}>
        <Form layout="inline">
          <Form.Item label="Öğrenci">
            <Select
              allowClear
              placeholder="Öğrenci seçin"
              options={students}
              value={filters.studentId}
              style={{ minWidth: 220 }}
              onChange={(val) => setFilters(prev => ({ ...prev, studentId: val }))}
            />
          </Form.Item>
          <Form.Item label="Tarih">
            <DatePicker
              allowClear
              placeholder="Tarih seç"
              value={filters.date || null}
              onChange={(val) => setFilters(prev => ({ ...prev, date: val }))}
              style={{ minWidth: 160 }}
              format="DD/MM/YYYY"
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" onClick={applyFilters}>Uygula</Button>
              <Button onClick={resetFilters}>Temizle</Button>
             
          
             
            </Space>
          </Form.Item>
        </Form>
        </div>
      </Card>

      <Card>
        <div ref={tableRef as any}>
        <Table
          rowKey="_id"
          loading={loading}
          columns={columns}
          dataSource={programs}
          pagination={{ current: pagination.current, pageSize: pagination.pageSize, total: pagination.total, showSizeChanger: true }}
          onChange={handleTableChange}
        />
        </div>
      </Card>

      <ProgramManagerTour
        userId={user?._id}
        targets={{
          getFiltersEl: () => (filtersRef.current as any) || null,
          getTableEl: () => (tableRef.current as any) || null,
          getEditModalEl: () => document.querySelector('.ant-modal') as HTMLElement | null,
          getDeleteMockEl: () => (mockBtnRef.current as any) || null,
        }}
      />

      <Modal
        title="Programı Düzenle"
        open={editOpen}
        onCancel={() => { setEditOpen(false); setEditing(null); }}
        onOk={submitEdit}
        confirmLoading={editLoading}
        okText="Kaydet"
        cancelText="İptal"
      >
        {editing && (
          <Form layout="vertical">
            <Form.Item label="Başlık">
              <Input
                placeholder="Program başlığı"
                value={editing.title}
                onChange={(e) => setEditing(prev => prev ? { ...prev, title: e.target.value } : prev)}
              />
            </Form.Item>
            <Form.Item label="Program Tarihi">
              <DatePicker
                value={editing.date}
                onChange={(val) => setEditing(prev => prev ? { ...prev, date: val } : prev)}
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
              />
            </Form.Item>


            <Divider>Ders ve Konular</Divider>

            {(editing.subjects || []).map((s, idx) => (
              <Card key={idx} size="small" style={{ marginBottom: 12 }}>
                <Row gutter={12}>
                  <Col xs={24} md={8}>
                    <Form.Item label="Ders">
                      <Select
                        showSearch
                        placeholder="Ders seçin"
                        optionFilterProp="children"
                        value={s.subject}
                        onChange={(val) => updateSubjectField(idx, 'subject', val)}
                      >
                        {subjectOptions.map(opt => (
                          <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item label="Hedef Süre (dk)">
                      <InputNumber
                        min={5}
                        max={600}
                        style={{ width: '100%' }}
                        value={s.targetTime}
                        onChange={(val) => updateSubjectField(idx, 'targetTime', typeof val === 'number' ? val : undefined)}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item label="Öncelik (1-10)">
                      <InputNumber
                        min={1}
                        max={10}
                        style={{ width: '100%' }}
                        value={s.priority ?? 5}
                        onChange={(val) => updateSubjectField(idx, 'priority', typeof val === 'number' ? val : 5)}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item label="Konu / Açıklama">
                  <Input.TextArea
                    rows={2}
                    placeholder="Örn: Trigonometri - temel oranlar, soru tipi X"
                    value={s.description}
                    onChange={(e) => updateSubjectField(idx, 'description', e.target.value)}
                  />
                </Form.Item>

                {/* Kaldırma backend'de kalıcı olmadığından gizli */}
              </Card>
            ))}

            <Button type="dashed" onClick={addSubject} block>
              + Ders Ekle
            </Button>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default ProgramManager;