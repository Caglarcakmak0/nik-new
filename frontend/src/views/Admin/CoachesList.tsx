import React from 'react';
import { Card, Table, Input, Button, Space, Avatar, Tag, Typography, Tooltip, Select, Pagination } from 'antd';
import { TeamOutlined, EyeOutlined, ReloadOutlined, UserOutlined, InfoCircleOutlined } from '@ant-design/icons';
import type { ColumnsType, TableProps } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { getAdminCoaches, type AdminCoachListItem } from '../../services/api';

const { Title, Text } = Typography;

type ApiResponse<T> = { message: string; data: T; pagination?: { page: number; limit: number; total: number } };

const CoachesList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState<AdminCoachListItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [q, setQ] = React.useState('');
  const [sorterState, setSorterState] = React.useState<{ orderBy?: keyof AdminCoachListItem; orderDirection?: 'ascend' | 'descend' } | undefined>();

  const GRID_STORAGE_KEY = 'grid:coachesList';

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(GRID_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.pageSize) setLimit(parsed.pageSize);
        if (parsed?.page) setPage(parsed.page);
        if (parsed?.sorter) setSorterState(parsed.sorter);
      }
    } catch (_) {}
  }, []);

  const fetchCoaches = React.useCallback(async (pageNum = page, pageSize = limit, search = q) => {
    setLoading(true);
    try {
      const res: ApiResponse<AdminCoachListItem[]> = await getAdminCoaches({ q: search, page: pageNum, limit: pageSize });
      setItems(res.data || []);
      setTotal(res.pagination?.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, q]);

  const handleTableChange: TableProps<AdminCoachListItem>['onChange'] = React.useCallback((
    _pagination,
    _filters,
    sorter
  ) => {
    if (!Array.isArray(sorter) && sorter?.field) {
      setSorterState({ orderBy: sorter.field as keyof AdminCoachListItem, orderDirection: sorter.order || undefined });
    }
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem(
        GRID_STORAGE_KEY,
        JSON.stringify({ page, pageSize: limit, sorter: sorterState })
      );
    } catch (_) {}
  }, [page, limit, sorterState]);

  React.useEffect(() => {
    fetchCoaches();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    name: 'Koç adı ve e-posta bilgileri',
    city: 'Koçun bulunduğu şehir',
    createdAt: 'Sisteme kayıt tarihi',
    lastActivity: 'Son aktivite tarihi'
  };

  const columns: ColumnsType<AdminCoachListItem> = React.useMemo(() => [
    {
      title: <HeaderWithTooltip title="Koç" tooltip={columnTooltips.name} />,
      key: 'name',
      width: 280,
      fixed: 'left',
      render: (_, record) => (
        <Space>
          <Avatar src={record.avatar || undefined} icon={<UserOutlined />} />
          <div>
            <Text strong>{record.name}</Text>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{record.email}</div>
          </div>
        </Space>
      ),
      sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
      sortOrder: sorterState?.orderBy === 'name' ? sorterState.orderDirection : undefined,
    },
    {
      title: <HeaderWithTooltip title="Şehir" tooltip={columnTooltips.city} />,
      dataIndex: 'city',
      key: 'city',
      width: 120,
      render: (value?: string) => (
        <Tag color={value ? 'blue' : 'default'}>{value || 'Belirtilmemiş'}</Tag>
      ),
      sorter: (a, b) => (a.city || '').localeCompare(b.city || ''),
      sortOrder: sorterState?.orderBy === 'city' ? sorterState.orderDirection : undefined,
    },
    {
      title: <HeaderWithTooltip title="Kayıt Tarihi" tooltip={columnTooltips.createdAt} />,
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 130,
      render: (date: string) => (
        <span style={{ color: '#666' }}>
          {new Date(date).toLocaleDateString('tr-TR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric'
          })}
        </span>
      ),
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      sortOrder: sorterState?.orderBy === 'createdAt' ? sorterState.orderDirection : undefined,
    },
    {
      title: 'İşlemler',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button 
            icon={<EyeOutlined />} 
            type="link" 
            size="small" 
            onClick={() => navigate(`/admin/coaches/${record._id}`)}
          >
            Detay
          </Button>
        </Space>
      )
    }
  ], [navigate, sorterState]);

  return (
    <div>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space>
          <TeamOutlined style={{ color: '#1890ff' }} />
          <Title level={4} style={{ margin: 0 }}>Koç Yönetimi</Title>
          <Tag color="blue">Admin</Tag>
        </Space>
        <Space>
          <Input.Search
            placeholder="İsim veya e-posta ara"
            allowClear
            onSearch={(value) => { setQ(value); setPage(1); fetchCoaches(1, limit, value); }}
            onChange={(e) => setQ(e.target.value)}
            style={{ width: 280 }}
          />
          <Button icon={<ReloadOutlined />} onClick={() => fetchCoaches()}>
            Yenile
          </Button>
        </Space>
      </Space>

      <Card>
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {total} koç listeleniyor
              </Text>
            </div>
          </div>

          <Table
            className="coaches-list-table"
            columns={columns}
            dataSource={items}
            rowKey="_id"
            loading={{ spinning: loading, tip: 'Yükleniyor...' }}
            size="small"
            pagination={false}
            onChange={handleTableChange}
            sticky
            scroll={{ x: 'max-content', y: '70vh' }}
          />

          {/* Custom Pagination */}
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <Text style={{ color: '#666', fontSize: '13px' }}>
                Toplam Kayıt Sayısı: {total}
              </Text>

              <Pagination
                current={page}
                total={total}
                pageSize={limit}
                showSizeChanger={false}
                onChange={(p, ps) => {
                  setPage(p);
                  if (ps) setLimit(ps);
                  fetchCoaches(p, ps || limit);
                }}
                size="small"
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#666', fontSize: '13px' }}>Kayıt Göster:</span>
                <Select
                  value={limit}
                  onChange={(val) => {
                    setLimit(val);
                    setPage(1);
                    fetchCoaches(1, val);
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
    </div>
  );
};

export default CoachesList;


