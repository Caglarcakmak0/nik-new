import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Card,
  Table,
  Tag,
  Button,
  Select,
  DatePicker,
  Space,
  Typography,
  message,
  Tooltip,
  Pagination
} from 'antd';
import {
  BarChartOutlined,
  HistoryOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiRequest } from '../../../../services/api';
import type { ColumnsType, TableProps } from 'antd/es/table';
import './SessionHistory.scss';

const { Text } = Typography;
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

interface SessionHistoryProps {
  refreshTrigger?: number;
}

const SessionHistory: React.FC<SessionHistoryProps> = ({ refreshTrigger = 0 }) => {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month" | "all">("week");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [sorterState, setSorterState] = useState<{ orderBy?: keyof StudySession; orderDirection?: 'ascend' | 'descend' } | undefined>();

  const GRID_STORAGE_KEY = 'grid:sessionHistory';

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

  // Veri getirme
  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await apiRequest("/study-sessions", {
        method: "GET",
      });
      setSessions(response || []);
    } catch (error) {
      console.error("Session geçmişi alınamadı:", error);
      message.error("Oturum geçmişi yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [refreshTrigger]);

  // Başlık + Tooltip bileşeni
  const HeaderWithTooltip: React.FC<{ title: string; tooltip?: string }> = ({ title, tooltip }) => (
    <div className="header-with-tooltip">
      <span>{title}</span>
      {tooltip && (
        <Tooltip title={tooltip} placement="top">
          <InfoCircleOutlined className="header-info-icon" />
        </Tooltip>
      )}
    </div>
  );

  const columnTooltips: Record<string, string> = {
    date: 'Oturum başlangıç tarihi ve saati',
    subject: 'Çalışılan ders/kategori',
    duration: 'Dakika cinsinden çalışma süresi',
    technique: 'Kullanılan çalışma tekniği',
    quality: '1-5 arası oturum kalitesi',
    efficiency: 'Oturum verimlilik yüzdesi',
    mood: 'Oturum sırasındaki ruh hâli',
  };

  const QualityIndicator: React.FC<{ value: number; max?: number }> = ({ value, max = 5 }) => {
    const filledCount = Math.max(0, Math.min(max, value || 0));
    return (
      <span className="quality-indicator" aria-label={`Kalite ${value}/${max}`}>
        {Array.from({ length: max }).map((_, idx) => (
          <span
            key={idx}
            className={`quality-dot${idx < filledCount ? ' filled' : ''}`}
          />
        ))}
      </span>
    );
  };

  // Tablo kolonları
  const sessionColumns: ColumnsType<StudySession> = useMemo(() => [
    {
      title: <HeaderWithTooltip title="Tarih" tooltip={columnTooltips.date} />,
      dataIndex: 'date',
      key: 'date',
      width: 180,
      fixed: 'left',
      render: (date: Date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
      sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      sortOrder: sorterState?.orderBy === 'date' ? sorterState.orderDirection : undefined,
    },
    {
      title: <HeaderWithTooltip title="Ders" tooltip={columnTooltips.subject} />,
      dataIndex: 'subject',
      key: 'subject',
      width: 160,
      render: (subject: string) => (
        <Tag color="blue">{subject.charAt(0).toUpperCase() + subject.slice(1)}</Tag>
      ),
      filters: [
        { text: 'Matematik', value: 'matematik' },
        { text: 'Fizik', value: 'fizik' },
        { text: 'Kimya', value: 'kimya' },
        { text: 'Biyoloji', value: 'biyoloji' },
        { text: 'Türkçe', value: 'turkce' },
        { text: 'Tarih', value: 'tarih' },
        { text: 'Coğrafya', value: 'cografya' },
      ],
      onFilter: (value: any, record: StudySession) => record.subject === value,
    },
    {
      title: <HeaderWithTooltip title="Süre" tooltip={columnTooltips.duration} />,
      dataIndex: 'duration',
      key: 'duration',
      width: 120,
      render: (duration: number) => `${duration} dk`,
      sorter: (a, b) => a.duration - b.duration,
      sortOrder: sorterState?.orderBy === 'duration' ? sorterState.orderDirection : undefined,
      align: 'right',
    },
    {
      title: <HeaderWithTooltip title="Teknik" tooltip={columnTooltips.technique} />,
      dataIndex: 'technique',
      key: 'technique',
      width: 150,
      render: (technique: string) => (
        <Tag color={
          technique === 'Pomodoro'
            ? 'orange'
            : technique === 'Timeblock'
            ? 'green'
            : technique === 'Stopwatch'
            ? 'blue'
            : 'purple'
        }>
          {technique}
        </Tag>
      ),
    },
    {
      title: <HeaderWithTooltip title="Kalite" tooltip={columnTooltips.quality} />,
      dataIndex: 'quality',
      key: 'quality',
      width: 140,
      render: (quality: number) => (
        <div className="quality-cell">
          <QualityIndicator value={quality} />
          <Text type="secondary"> ({quality}/5)</Text>
        </div>
      ),
      sorter: (a, b) => a.quality - b.quality,
      sortOrder: sorterState?.orderBy === 'quality' ? sorterState.orderDirection : undefined,
      align: 'center',
    },
    {
      title: <HeaderWithTooltip title="Verimlilik" tooltip={columnTooltips.efficiency} />,
      dataIndex: 'efficiency',
      key: 'efficiency',
      width: 140,
      render: (efficiency: number) => (
        <Text
          style={{
            color: efficiency >= 80 ? '#52c41a' : efficiency >= 60 ? '#faad14' : '#ff4d4f',
          }}
        >
          %{efficiency}
        </Text>
      ),
      sorter: (a, b) => a.efficiency - b.efficiency,
      sortOrder: sorterState?.orderBy === 'efficiency' ? sorterState.orderDirection : undefined,
      align: 'right',
    },
    {
      title: <HeaderWithTooltip title="Ruh Hali" tooltip={columnTooltips.mood} />,
      dataIndex: 'mood',
      key: 'mood',
      width: 140,
      render: (mood: string) => {
        const moodColors: Record<string, string> = {
          Enerjik: 'green',
          Normal: 'blue',
          Yorgun: 'orange',
          Motivasyonsuz: 'red',
          Stresli: 'volcano',
          Mutlu: 'cyan',
        };
        return <Tag color={moodColors[mood] || 'default'}>{mood}</Tag>;
      },
    },
  ], [sorterState]);

  // Filtrelenmiş oturumlar
  const filteredSessions = useMemo(() => sessions.filter(session => {
    // Subject filter
    if (selectedSubject !== 'all' && session.subject !== selectedSubject) {
      return false;
    }

    // Period filter
    const sessionDate = dayjs(session.date);
    const now = dayjs();
    
    switch (selectedPeriod) {
      case 'week':
        return sessionDate.isAfter(now.subtract(1, 'week'));
      case 'month':
        return sessionDate.isAfter(now.subtract(1, 'month'));
      default:
        return true;
    }
  }), [sessions, selectedSubject, selectedPeriod]);

  // Sıralama: tüm filtreli set üzerinde uygula, sonra sayfala
  const sortedSessions = useMemo(() => {
    if (!sorterState?.orderBy || !sorterState.orderDirection) return filteredSessions;
    const { orderBy, orderDirection } = sorterState;
    const sorted = [...filteredSessions].sort((a, b) => {
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
  }, [filteredSessions, sorterState]);

  // Sayfalama: veriyi böl
  const totalCount = sortedSessions.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pagedSessions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return sortedSessions.slice(start, end);
  }, [sortedSessions, currentPage, pageSize]);

  // Toplamlar (tam filtrelenmiş set üzerinden)
  const totals = useMemo(() => {
    return filteredSessions.reduce(
      (acc, s) => {
        acc.duration += Number(s.duration) || 0;
        acc.quality += Number(s.quality) || 0;
        acc.efficiency += Number(s.efficiency) || 0;
        return acc;
      },
      { duration: 0, quality: 0, efficiency: 0 }
    );
  }, [filteredSessions]);

  // Tablo değişiklikleri (sıralama)
  const handleTableChange: TableProps<StudySession>['onChange'] = useCallback((
    _pagination,
    _filters,
    sorter
  ) => {
    if (!Array.isArray(sorter) && sorter?.field) {
      setSorterState({ orderBy: sorter.field as keyof StudySession, orderDirection: sorter.order || undefined });
    }
  }, []);

  // Grid tercihlerini sakla
  useEffect(() => {
    try {
      localStorage.setItem(
        GRID_STORAGE_KEY,
        JSON.stringify({ page: currentPage, pageSize, sorter: sorterState })
      );
    } catch (_) {}
  }, [currentPage, pageSize, sorterState]);

  return (
    <Card className="session-history">
      {/* Header */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <HistoryOutlined style={{ marginRight: 8 }} />
          <span style={{ fontWeight: 600, fontSize: 16 }}>
            Oturum Geçmişi
          </span>
          <div style={{ marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {filteredSessions.length} oturum listeleniyor
            </Text>
          </div>
        </div>
      </div>

      {/* Filtreler */}
      <div style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            value={selectedPeriod}
            onChange={setSelectedPeriod}
            style={{ width: 120 }}
          >
            <Select.Option value="week">Bu Hafta</Select.Option>
            <Select.Option value="month">Bu Ay</Select.Option>
            <Select.Option value="all">Tümü</Select.Option>
          </Select>

          <Select
            value={selectedSubject}
            onChange={setSelectedSubject}
            style={{ width: 120 }}
            placeholder="Ders seç"
          >
            <Select.Option value="all">Tüm Dersler</Select.Option>
            <Select.Option value="matematik">Matematik</Select.Option>
            <Select.Option value="fizik">Fizik</Select.Option>
            <Select.Option value="kimya">Kimya</Select.Option>
            <Select.Option value="biyoloji">Biyoloji</Select.Option>
            <Select.Option value="turkce">Türkçe</Select.Option>
            <Select.Option value="tarih">Tarih</Select.Option>
            <Select.Option value="cografya">Coğrafya</Select.Option>
          </Select>

          <RangePicker size="small" />

          <Button
            icon={<BarChartOutlined />}
            type="dashed"
            size="small"
            onClick={() => message.info('Analiz özelliği yakında!')}
          >
            Analiz
          </Button>
        </Space>
      </div>

      {/* Sessions Table */}
      <div>
        <Table
          className="session-history-table"
          columns={sessionColumns}
          dataSource={pagedSessions}
          rowKey="_id"
          loading={{ spinning: loading, tip: 'Yükleniyor...' }}
          size="small"
          pagination={false}
          onChange={handleTableChange}
          sticky
          scroll={{ x: 'max-content', y: '75vh' }}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} className="summary-cell">
                  <Text strong>{`Toplam (${filteredSessions.length})`}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} />
                <Table.Summary.Cell index={2} className="summary-cell" align="right">
                  <Text strong>{`${totals.duration} dk`}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} />
                <Table.Summary.Cell index={4} className="summary-cell" align="center">
                  <Text strong>{totals.quality}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} className="summary-cell" align="right">
                  <Text strong>{`%${totals.efficiency}`}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} />
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />

        {/* Custom Pagination */}
        <div className="text-center pagination-wrapper">
          <div className="custom-pagination-controls">
            <Text className="total-text">{`Toplam Kayıt Sayısı: ${totalCount}`}</Text>

            <Pagination
              current={currentPage}
              total={totalCount}
              pageSize={pageSize}
              showSizeChanger={false}
              onChange={(p) => setPage(p)}
            />

            <div className="page-size-select">
              <div className="label">Kayıt Göster:</div>
              <Select
                value={pageSize}
                onChange={(val) => {
                  setPageSize(val);
                  setPage(1);
                }}
                style={{ width: 100 }}
                options={[10, 20, 24, 36].map(v => ({ label: v, value: v }))}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SessionHistory;