import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, Table, Segmented, Space, Typography, Tooltip, Button, Pagination, Select, Tag } from 'antd';
import { InfoCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getAdminFeedbacks, AdminFeedbackListItem } from '../../services/api';
import { FeedbackStatusTag } from '../../components/admin';
import type { ColumnsType, TableProps } from 'antd/es/table';

const { Title } = Typography;

export const FeedbackList: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'new' | 'read' | 'all'>('new');
  const [data, setData] = useState<AdminFeedbackListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [sorterState, setSorterState] = useState<{ orderBy?: keyof AdminFeedbackListItem; orderDirection?: 'ascend' | 'descend' } | undefined>();

  const GRID_STORAGE_KEY = 'grid:feedbackList';

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

  const load = async () => {
    setLoading(true);
    try {
      const res = await getAdminFeedbacks({ status: status === 'all' ? undefined : status, limit: 50, offset: 0 });
      setData(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  const sortedData = useMemo(() => {
    if (!sorterState?.orderBy || !sorterState.orderDirection) return data;
    const { orderBy, orderDirection } = sorterState;
    const sorted = [...data].sort((a, b) => {
      const av = (a as any)[orderBy];
      const bv = (b as any)[orderBy];
      if (av == null && bv == null) return 0;
      if (av == null) return -1;
      if (bv == null) return 1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return av - bv;
      }
      if (av instanceof Date || bv instanceof Date || orderBy === 'createdAt') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return String(av).localeCompare(String(bv));
    });
    return orderDirection === 'ascend' ? sorted : sorted.reverse();
  }, [data, sorterState]);

  const totalCount = sortedData.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pagedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return sortedData.slice(start, end);
  }, [sortedData, currentPage, pageSize]);

  const handleTableChange: TableProps<AdminFeedbackListItem>['onChange'] = useCallback((
    _pagination,
    _filters,
    sorter
  ) => {
    if (!Array.isArray(sorter) && sorter?.field) {
      setSorterState({ orderBy: sorter.field as keyof AdminFeedbackListItem, orderDirection: sorter.order || undefined });
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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
          <Title level={4} style={{ margin: 0 }}>Koç Değerlendirmeleri</Title>
          <Segmented
            value={status}
            onChange={(v) => setStatus(v as any)}
            options={[{ label: 'Yeni', value: 'new' }, { label: 'Okundu', value: 'read' }, { label: 'Tümü', value: 'all' }]}
          />
        </Space>

        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {totalCount} geri bildirim listeleniyor
              </Typography.Text>
            </div>
          </div>

          <Table
            className="feedback-list-table"
            rowKey={(r) => r.id}
            loading={{ spinning: loading, tip: 'Yükleniyor...' }}
            columns={useMemo(() => {
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
                createdAt: 'Geri bildirimin oluşturulma tarihi',
                student: 'Geri bildirimi gönderen öğrenci',
                coach: 'Değerlendirilen koç',
                overallRating: 'Genel memnuniyet puanı',
                status: 'Geri bildirim okuma durumu'
              };

              const columns: ColumnsType<AdminFeedbackListItem> = [
                {
                  title: <HeaderWithTooltip title="Tarih" tooltip={columnTooltips.createdAt} />,
                  dataIndex: 'createdAt',
                  key: 'createdAt',
                  width: 150,
                  fixed: 'left',
                  render: (v: string) => (
                    <span style={{ color: '#666' }}>
                      {new Date(v).toLocaleDateString('tr-TR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  ),
                  sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
                  sortOrder: sorterState?.orderBy === 'createdAt' ? sorterState.orderDirection : undefined,
                },
                {
                  title: <HeaderWithTooltip title="Öğrenci" tooltip={columnTooltips.student} />,
                  dataIndex: ['student', 'name'],
                  key: 'student',
                  width: 150,
                  render: (name: string) => (
                    <Tag color="blue">{name}</Tag>
                  ),
                  sorter: (a, b) => (a.student?.name || '').localeCompare(b.student?.name || ''),
                  sortOrder: sorterState?.orderBy === 'student' ? sorterState.orderDirection : undefined,
                },
                {
                  title: <HeaderWithTooltip title="Koç" tooltip={columnTooltips.coach} />,
                  dataIndex: ['coach', 'name'],
                  key: 'coach',
                  width: 150,
                  render: (name: string) => (
                    <Tag color="green">{name}</Tag>
                  ),
                  sorter: (a, b) => (a.coach?.name || '').localeCompare(b.coach?.name || ''),
                  sortOrder: sorterState?.orderBy === 'coach' ? sorterState.orderDirection : undefined,
                },
                {
                  title: <HeaderWithTooltip title="Ort. Puan" tooltip={columnTooltips.overallRating} />,
                  dataIndex: 'overallRating',
                  key: 'overallRating',
                  width: 100,
                  align: 'center',
                  render: (rating: number) => (
                    <span style={{
                      color: rating >= 4 ? '#52c41a' : rating >= 3 ? '#faad14' : '#ff4d4f',
                      fontWeight: 600
                    }}>
                      {rating ? rating.toFixed(1) : '-'}
                    </span>
                  ),
                  sorter: (a, b) => (a.overallRating || 0) - (b.overallRating || 0),
                  sortOrder: sorterState?.orderBy === 'overallRating' ? sorterState.orderDirection : undefined,
                },
                {
                  title: <HeaderWithTooltip title="Durum" tooltip={columnTooltips.status} />,
                  dataIndex: 'status',
                  key: 'status',
                  width: 100,
                  align: 'center',
                  render: (s: 'new' | 'read') => <FeedbackStatusTag status={s} />,
                  filters: [
                    { text: 'Yeni', value: 'new' },
                    { text: 'Okundu', value: 'read' },
                  ],
                  onFilter: (value: any, record: AdminFeedbackListItem) => record.status === value,
                },
                {
                  title: 'İşlemler',
                  dataIndex: 'id',
                  key: 'actions',
                  width: 120,
                  fixed: 'right',
                  render: (id: string) => (
                    <Button
                      type="link"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => navigate(`/admin/feedback/${id}`)}
                    >
                      Görüntüle
                    </Button>
                  )
                }
              ];
              return columns;
            }, [navigate, sorterState])}
            dataSource={pagedData}
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
      </Space>
    </Card>
  );
};

export default FeedbackList;


