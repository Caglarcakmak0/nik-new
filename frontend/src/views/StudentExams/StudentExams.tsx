import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Calendar, Button, Modal, Form, DatePicker, Select, Input, InputNumber, Space, Table, Typography, Popconfirm, message, Divider, Pagination, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { createStudentExam, deleteStudentExam, getStudentExams, PracticeExam, PracticeExamSection, updateStudentExam } from '../../services/api';
import { SUBJECT_TOPIC_BANK, normalizeSubjectKey } from '../../constants/subjectTopics';
import type { ColumnsType, TableProps } from 'antd/es/table';
import './StudentExams.scss';

const { Title, Text } = Typography;

type Category = 'TYT_GENEL' | 'AYT_GENEL' | 'BRANS';

const BRANCH_SUBJECTS = [
  { label: 'TYT - Türkçe', value: 'turkce' },
  { label: 'TYT - Tarih', value: 'tarih' },
  { label: 'TYT - Coğrafya', value: 'cografya' },
  { label: 'TYT - Felsefe', value: 'felsefe' },
  { label: 'TYT - Din Kültürü', value: 'din_kultur' },
  { label: 'TYT - Matematik', value: 'matematik' },
  { label: 'TYT - Geometri', value: 'geometri' },
  { label: 'TYT - Fizik', value: 'fizik' },
  { label: 'TYT - Kimya', value: 'kimya' },
  { label: 'TYT - Biyoloji', value: 'biyoloji' },
  { label: 'AYT - Edebiyat', value: 'edebiyat' },
  { label: 'AYT - Tarih', value: 'tarih_ayt' },
  { label: 'AYT - Coğrafya', value: 'cografya_ayt' },
  { label: 'AYT - Felsefe', value: 'felsefe_ayt' },
  { label: 'AYT - Din Kültürü', value: 'din_kultur_ayt' },
  { label: 'AYT - Matematik', value: 'matematik_ayt' },
  { label: 'AYT - Fizik', value: 'fizik_ayt' },
  { label: 'AYT - Kimya', value: 'kimya_ayt' },
  { label: 'AYT - Biyoloji', value: 'biyoloji_ayt' },
  { label: 'YDT - İngilizce', value: 'ingilizce' },
  { label: 'YDT - Almanca', value: 'almanca' },
  { label: 'YDT - Fransızca', value: 'fransizca' },
  { label: 'Diğer', value: 'diger' }
];

const CATEGORY_OPTIONS = [
  { label: 'TYT Genel Deneme', value: 'TYT_GENEL' },
  { label: 'AYT Genel Deneme', value: 'AYT_GENEL' },
  { label: 'Branş Denemesi', value: 'BRANS' },
];

function calcNet(correct?: number, wrong?: number): number {
  const c = Number(correct || 0);
  const w = Number(wrong || 0);
  const net = c - w / 4;
  return Math.max(Math.round(net * 100) / 100, 0);
}

function resolveTopicBankKey(sectionName: string, category: Category): string {
  const base = normalizeSubjectKey(sectionName || '');
  if (category === 'AYT_GENEL') {
    // AYT eşlemeleri
    const aytMap: Record<string, string> = {
      matematik: 'matematik_ayt',
      fizik: 'fizik_ayt',
      kimya: 'kimya_ayt',
      biyoloji: 'biyoloji_ayt',
      tarih: 'tarih_ayt',
      cografya: 'cografya_ayt',
      felsefe: 'felsefe_ayt',
      din_kultur: 'din_kultur_ayt',
      edebiyat: 'edebiyat', // edebiyat zaten AYT kapsamında
      turkce: 'turkce' // AYT'de yok ama boş kalmasın
    };
    return aytMap[base] || base;
  }
  return base; // TYT_GENEL veya BRANS
}

const StudentExams: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [items, setItems] = useState<PracticeExam[]>([]);
  const [monthlyMap, setMonthlyMap] = useState<Record<string, { count: number; labels: string[] }>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<PracticeExam | null>(null);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [sorterState, setSorterState] = useState<{ orderBy?: keyof PracticeExam; orderDirection?: 'ascend' | 'descend' } | undefined>();

  const [form] = Form.useForm();
  const GRID_STORAGE_KEY = 'grid:studentExams';

  useEffect(() => {
    try {
      const raw = localStorage.getItem(GRID_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.pageSize) setPageSize(parsed.pageSize);
        if (parsed?.page) setPage(parsed.page);
        if (parsed?.sorter) setSorterState(parsed.sorter);
      }
    } catch (_) {}
  }, []);

  const dayRange = useMemo(() => ({
    from: selectedDate.startOf('day').toDate().toISOString(),
    to: selectedDate.endOf('day').toDate().toISOString(),
  }), [selectedDate]);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getStudentExams({ from: dayRange.from, to: dayRange.to, limit: 100 });
      setItems(res?.data || []);
    } catch (e: any) {
      message.error(e?.message || 'Denemeler alınamadı');
    } finally {
      setLoading(false);
    }
  }, [dayRange]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const monthKey = useMemo(() => selectedDate.format('YYYY-MM'), [selectedDate]);
  const fetchMonthly = useCallback(async (baseDate: Dayjs) => {
    try {
      const start = baseDate.startOf('month').toDate().toISOString();
      const end = baseDate.endOf('month').toDate().toISOString();
      const res = await getStudentExams({ from: start, to: end, limit: 500 });
      const list: PracticeExam[] = res?.data || [];
      const map: Record<string, { count: number; labels: string[] }> = {};
      const toLabel = (e: PracticeExam): string => {
        if (e.category === 'TYT_GENEL') return 'TYT';
        if (e.category === 'AYT_GENEL') return 'AYT';
        if (e.category === 'BRANS') {
          const bs = (e.branchSubject || '').toString();
          if (!bs) return 'Branş';
          const pretty = bs
            .replace(/_/g, ' ')
            .replace(/\bayt\b/i, 'AYT')
            .trim();
          const cap = pretty
            .split(' ')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
          return `Branş - ${cap}`;
        }
        return 'Deneme';
      };
      list.forEach((e) => {
        const key = dayjs(e.date).format('YYYY-MM-DD');
        const label = toLabel(e);
        if (!map[key]) map[key] = { count: 0, labels: [] };
        map[key].count += 1;
        if (map[key].labels.length < 3 && !map[key].labels.includes(label)) {
          map[key].labels.push(label);
        }
      });
      setMonthlyMap(map);
    } catch (_) {
      setMonthlyMap({});
    }
  }, []);

  useEffect(() => {
    fetchMonthly(selectedDate);
  }, [fetchMonthly, monthKey]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      date: selectedDate,
      category: 'TYT_GENEL',
      sections: [{ name: 'Bölüm', totalQuestions: 0, correctAnswers: 0, wrongAnswers: 0, blankAnswers: 0 }]
    });
    setModalOpen(true);
  };

  const openEdit = (record: PracticeExam) => {
    setEditing(record);
    form.resetFields();
    form.setFieldsValue({
      date: dayjs(record.date),
      category: record.category,
      branchSubject: record.branchSubject || undefined,
      title: record.title || '',
      examDuration: record.examDuration || undefined,
      notes: record.notes || '',
      sections: record.sections?.map(s => ({
        name: s.name,
        totalQuestions: s.totalQuestions || 0,
        correctAnswers: s.correctAnswers || 0,
        wrongAnswers: s.wrongAnswers || 0,
        blankAnswers: s.blankAnswers || 0,
      })) || []
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteStudentExam(id);
      message.success('Deneme silindi');
      fetchItems();
    } catch (e: any) {
      message.error(e?.message || 'Silme işlemi başarısız');
    }
  };

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        date: (values.date as Dayjs).toDate().toISOString(),
        category: values.category as Category,
        branchSubject: values.category === 'BRANS' ? values.branchSubject : undefined,
        title: values.title?.trim(),
        examDuration: values.examDuration,
        notes: values.notes?.trim(),
        sections: (values.sections as PracticeExamSection[]).map((s) => ({
          name: String(s.name || '').trim() || 'Bölüm',
          totalQuestions: Number(s.totalQuestions || 0),
          correctAnswers: Number(s.correctAnswers || 0),
          wrongAnswers: Number(s.wrongAnswers || 0),
          blankAnswers: Number(s.blankAnswers || 0)
        }))
      };
      if (editing) {
        await updateStudentExam(editing._id, payload);
        message.success('Deneme güncellendi');
      } else {
        await createStudentExam(payload as any);
        message.success('Deneme eklendi');
      }
      setModalOpen(false);
      setEditing(null);
      fetchItems();
    } catch (e: any) {
      if (e?.errorFields) return; // form hataları
      message.error(e?.message || 'Kaydetme başarısız');
    }
  };

  const HeaderWithTooltip: React.FC<{ title: string; tooltip?: string }> = ({ title, tooltip }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span>{title}</span>
      {tooltip && (
        <Tooltip title={tooltip} placement="top">
          <InfoCircleOutlined style={{ color: '#999', fontSize: '12px' }} />
        </Tooltip>
      )}
    </div>
  );

  const columnTooltips: Record<string, string> = {
    date: 'Denemenn yapıldığı tarih',
    category: 'TYT/AYT/Branş deneme türü',
    title: 'Yayın veya deneme adı',
    correct: 'Doğru cevap sayısı',
    wrong: 'Yanlış cevap sayısı',
    blank: 'Boş bırakılan soru sayısı',
    net: 'Net puan (doğru - yanlış/4)',
  };

  const columns: ColumnsType<PracticeExam> = useMemo(() => [
    {
      title: <HeaderWithTooltip title="Tarih" tooltip={columnTooltips.date} />,
      dataIndex: 'date',
      key: 'date',
      width: 120,
      fixed: 'left',
      render: (v: string) => dayjs(v).format('DD.MM.YYYY'),
      sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      sortOrder: sorterState?.orderBy === 'date' ? sorterState.orderDirection : undefined,
    },
    {
      title: <HeaderWithTooltip title="Tür" tooltip={columnTooltips.category} />,
      dataIndex: 'category',
      key: 'category',
      width: 150,
      render: (v: Category, record: PracticeExam) => {
        const text = v === 'TYT_GENEL' ? 'TYT Genel' : v === 'AYT_GENEL' ? 'AYT Genel' : `Branş${record.branchSubject ? ` - ${record.branchSubject}` : ''}`;
        return <span>{text}</span>;
      },
      filters: [
        { text: 'TYT Genel', value: 'TYT_GENEL' },
        { text: 'AYT Genel', value: 'AYT_GENEL' },
        { text: 'Branş', value: 'BRANS' },
      ],
      onFilter: (value: any, record: PracticeExam) => record.category === value,
    },
    {
      title: <HeaderWithTooltip title="Başlık" tooltip={columnTooltips.title} />,
      dataIndex: 'title',
      key: 'title',
      width: 200,
      render: (v?: string) => v || '-',
      sorter: (a, b) => (a.title || '').localeCompare(b.title || ''),
      sortOrder: sorterState?.orderBy === 'title' ? sorterState.orderDirection : undefined,
    },
    {
      title: <HeaderWithTooltip title="Doğru" tooltip={columnTooltips.correct} />,
      dataIndex: ['totals', 'correctAnswers'],
      key: 'correct',
      width: 80,
      align: 'right',
      render: (v: number) => <span style={{ color: '#52c41a', fontWeight: 500 }}>{v || 0}</span>,
      sorter: (a, b) => (a.totals?.correctAnswers || 0) - (b.totals?.correctAnswers || 0),
      sortOrder: sorterState?.orderBy === 'correctAnswers' ? sorterState.orderDirection : undefined,
    },
    {
      title: <HeaderWithTooltip title="Yanlış" tooltip={columnTooltips.wrong} />,
      dataIndex: ['totals', 'wrongAnswers'],
      key: 'wrong',
      width: 80,
      align: 'right',
      render: (v: number) => <span style={{ color: '#ff4d4f', fontWeight: 500 }}>{v || 0}</span>,
      sorter: (a, b) => (a.totals?.wrongAnswers || 0) - (b.totals?.wrongAnswers || 0),
      sortOrder: sorterState?.orderBy === 'wrongAnswers' ? sorterState.orderDirection : undefined,
    },
    {
      title: <HeaderWithTooltip title="Boş" tooltip={columnTooltips.blank} />,
      dataIndex: ['totals', 'blankAnswers'],
      key: 'blank',
      width: 80,
      align: 'right',
      render: (v: number) => <span style={{ color: '#faad14', fontWeight: 500 }}>{v || 0}</span>,
      sorter: (a, b) => (a.totals?.blankAnswers || 0) - (b.totals?.blankAnswers || 0),
      sortOrder: sorterState?.orderBy === 'blankAnswers' ? sorterState.orderDirection : undefined,
    },
    {
      title: <HeaderWithTooltip title="Net" tooltip={columnTooltips.net} />,
      dataIndex: ['totals', 'net'],
      key: 'net',
      width: 80,
      align: 'right',
      render: (v: number) => {
        const net = v || 0;
        return (
          <span style={{ 
            color: net >= 10 ? '#52c41a' : net >= 5 ? '#faad14' : '#ff4d4f',
            fontWeight: 600
          }}>
            {net.toFixed(1)}
          </span>
        );
      },
      sorter: (a, b) => (a.totals?.net || 0) - (b.totals?.net || 0),
      sortOrder: sorterState?.orderBy === 'net' ? sorterState.orderDirection : undefined,
    },
    {
      title: 'İşlemler',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_: any, record: PracticeExam) => (
        <Space size="small">
          <Button size="small" type="link" onClick={() => openEdit(record)}>Düzenle</Button>
          <Popconfirm title="Silinsin mi?" okText="Evet" cancelText="Hayır" onConfirm={() => handleDelete(record._id)}>
            <Button size="small" danger type="link">Sil</Button>
          </Popconfirm>
        </Space>
      )
    }
  ], [sorterState]);

  const sortedItems = useMemo(() => {
    if (!sorterState?.orderBy || !sorterState.orderDirection) return items;
    const { orderBy, orderDirection } = sorterState;
    const sorted = [...items].sort((a, b) => {
      const av = (a as any)[orderBy];
      const bv = (b as any)[orderBy];
      if (av == null && bv == null) return 0;
      if (av == null) return -1;
      if (bv == null) return 1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return av - bv;
      }
      if (av instanceof Date || bv instanceof Date || orderBy === 'date') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      return String(av).localeCompare(String(bv));
    });
    return orderDirection === 'ascend' ? sorted : sorted.reverse();
  }, [items, sorterState]);

  const totalCount = sortedItems.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return sortedItems.slice(start, end);
  }, [sortedItems, currentPage, pageSize]);

  const handleTableChange: TableProps<PracticeExam>['onChange'] = useCallback((
    _pagination,
    _filters,
    sorter
  ) => {
    if (!Array.isArray(sorter) && sorter?.field) {
      setSorterState({ orderBy: sorter.field as keyof PracticeExam, orderDirection: sorter.order || undefined });
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        GRID_STORAGE_KEY,
        JSON.stringify({ page: currentPage, pageSize, sorter: sorterState })
      );
    } catch (_) {}
  }, [currentPage, pageSize, sorterState]);

  // Calendar cell custom render, monthlyMap ile dolduruluyor

  return (
    <div className="student-exams-container">
      <Card title="Denemeler Takvimi" extra={<Button type="primary" onClick={openCreate}>Deneme Ekle</Button>}>
        <Calendar
          value={selectedDate}
          onSelect={(d) => setSelectedDate(d)}
          onPanelChange={(val) => fetchMonthly(val)}
          cellRender={(current, info) => {
            if (info.type === 'date') {
              const key = current.format('YYYY-MM-DD');
              const dayData = monthlyMap[key];
              if (dayData) {
                const labels = dayData.labels;
                const more = Math.max(dayData.count - labels.length, 0);
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 14, fontWeight: 'bold' }}>
                    <span style={{ color: '#555' }}>N: {dayData.count}</span>
                    <span style={{ color: '#888', textAlign: 'center' }}>
                      {labels.join(', ')}{more > 0 ? ` +${more}` : ''}
                    </span>
                  </div>
                );
              }
              return null;
            }
            return info.originNode;
          }}
          headerRender={({ value }) => (
            <div style={{ padding: '8px 0', display: 'flex', justifyContent: 'center' }}>
              <Title level={4} style={{ margin: 0 }}>{value.format('MMMM YYYY')}</Title>
            </div>
          )}
        />
        <div style={{ marginTop: 12 }}>
          <Text type="secondary">Seçilen gün: {selectedDate.format('DD.MM.YYYY')}</Text>
          <Button style={{ marginLeft: 8 }} onClick={fetchItems}>
            Yenile
          </Button>
        </div>
      </Card>

      <Card title="Günlük Denemeler">
        <div>
          <Table
            className="student-exams-table"
            rowKey="_id"
            loading={{ spinning: loading, tip: 'Yükleniyor...' }}
            dataSource={pagedItems}
            columns={columns}
            size="small"
            pagination={false}
            onChange={handleTableChange}
            sticky
            scroll={{ x: 'max-content', y: '60vh' }}
          />

          {/* Custom Pagination */}
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <Typography.Text style={{ color: '#666', fontSize: '13px' }}>
                Toplam Kayıt Sayısı: {totalCount}
              </Typography.Text>

              <Pagination
                current={currentPage}
                total={totalCount}
                pageSize={pageSize}
                showSizeChanger={false}
                showQuickJumper
                onChange={(p) => setPage(p)}
                size="small"
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#666', fontSize: '13px' }}>Kayıt Göster:</span>
                <Select
                  value={pageSize}
                  onChange={(val) => {
                    setPageSize(val);
                    setPage(1);
                  }}
                  style={{ width: 80 }}
                  size="small"
                  options={[10, 20, 50, 100].map(v => ({ label: v, value: v }))}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        onOk={onSubmit}
        okText={editing ? 'Güncelle' : 'Kaydet'}
        title={editing ? 'Denemeyi Düzenle' : 'Yeni Deneme'}
        width={800}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="date" label="Tarih" rules={[{ required: true, message: 'Tarih gerekli' }]}>
            <DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="category" label="Deneme Türü" rules={[{ required: true, message: 'Tür gerekli' }]}>
            <Select options={CATEGORY_OPTIONS} />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.category !== cur.category}>
            {({ getFieldValue }) => getFieldValue('category') === 'BRANS' ? (
              <Form.Item name="branchSubject" label="Branş" rules={[{ required: true, message: 'Branş gerekli' }]}>
                <Select options={BRANCH_SUBJECTS} showSearch optionFilterProp="label" />
              </Form.Item>
            ) : null}
          </Form.Item>
          <Form.Item name="title" label="Başlık (Yayın/Deneme Adı)">
            <Input maxLength={120} placeholder="Örn: XYZ Yayınları 3. Deneme" />
          </Form.Item>
          <Form.Item name="examDuration" label="Süre (dk)">
            <InputNumber min={0} max={600} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="Notlar">
            <Input.TextArea maxLength={1000} rows={3} />
          </Form.Item>

          <Divider> Bölümler </Divider>
          <Form.List name="sections">
            {(fields, { add, remove }) => (
              <div>
                {fields.map((field) => (
                  <Card key={field.key} size="small" style={{ marginBottom: 8 }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Space wrap>
                        <Form.Item {...field} name={[field.name, 'name']} label="Ad" rules={[{ required: true, message: 'Bölüm adı gerekli' }]}>
                          <Select
                            showSearch
                            style={{ width: 220 }}
                            placeholder="Örn: Türkçe"
                            options={[
                              { label: 'Türkçe', value: 'Türkçe' },
                              { label: 'Matematik', value: 'Matematik' },
                              { label: 'Geometri', value: 'Geometri' },
                              { label: 'Fizik', value: 'Fizik' },
                              { label: 'Kimya', value: 'Kimya' },
                              { label: 'Biyoloji', value: 'Biyoloji' },
                              { label: 'Edebiyat', value: 'Edebiyat' },
                              { label: 'Tarih', value: 'Tarih' },
                              { label: 'Coğrafya', value: 'Coğrafya' },
                            ]}
                          />
                        </Form.Item>
                        <Form.Item {...field} name={[field.name, 'totalQuestions']} label="Toplam" initialValue={0}>
                          <InputNumber min={0} max={200} />
                        </Form.Item>
                        <Form.Item {...field} name={[field.name, 'correctAnswers']} label="Doğru" initialValue={0}>
                          <InputNumber min={0} max={200} />
                        </Form.Item>
                        <Form.Item {...field} name={[field.name, 'wrongAnswers']} label="Yanlış" initialValue={0}>
                          <InputNumber min={0} max={200} />
                        </Form.Item>
                        <Form.Item {...field} name={[field.name, 'blankAnswers']} label="Boş" initialValue={0}>
                          <InputNumber min={0} max={200} />
                        </Form.Item>
                        <Form.Item noStyle shouldUpdate={(prev, cur) => (
                          prev?.category !== cur?.category ||
                          prev?.sections?.[field.name]?.name !== cur?.sections?.[field.name]?.name
                        )}>
                          {() => {
                            const sectionName: string = form.getFieldValue(['sections', field.name, 'name']);
                            const category: Category = form.getFieldValue(['category']);
                            const key = resolveTopicBankKey(sectionName || '', category);
                            const topics = SUBJECT_TOPIC_BANK[key] || [];
                            const options = topics.map((t) => ({ label: t, value: t }));
                            return (
                              <Form.Item {...field} name={[field.name, 'wrongTopics']} label="Yanlış Konular" tooltip="Yanlış yapılan konu başlıklarını yazın (Enter ile ekleyin)">
                                <Select
                                  mode="tags"
                                  style={{ minWidth: 260 }}
                                  placeholder={options.length ? 'Önerilerden seç veya yaz' : 'Öneri bulunamadı, lütfen yazın'}
                                  options={options}
                                  onChange={(vals) => {
                                    const nextWrong = Array.isArray(vals) ? vals.length : 0;
                                    const currentWrong = Number(form.getFieldValue(['sections', field.name, 'wrongAnswers'])) || 0;
                                    if (nextWrong > currentWrong) {
                                      form.setFieldValue(['sections', field.name, 'wrongAnswers'], nextWrong);
                                    }
                                  }}
                                />
                              </Form.Item>
                            );
                          }}
                        </Form.Item>
                      </Space>
                      <Form.Item noStyle shouldUpdate>
                        {({ getFieldValue }) => {
                          const section = getFieldValue(['sections', field.name]);
                          const net = calcNet(section?.correctAnswers, section?.wrongAnswers);
                          return <Text type="secondary">Net: {net.toFixed(2)} (yanlış x 0.25)</Text>;
                        }}
                      </Form.Item>
                      <Button danger onClick={() => remove(field.name)}>Bölümü Kaldır</Button>
                    </Space>
                  </Card>
                ))}
                <Button type="dashed" onClick={() => add({ name: 'Bölüm', totalQuestions: 0, correctAnswers: 0, wrongAnswers: 0, blankAnswers: 0 })} block>
                  Bölüm Ekle
                </Button>
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
};

export default StudentExams;


