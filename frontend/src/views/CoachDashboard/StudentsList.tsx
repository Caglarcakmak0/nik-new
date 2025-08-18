import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Table, Avatar, Tag, Space, Button, Input, message } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { UserOutlined, EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { apiRequest, toAbsoluteUrl } from '../../services/api';
import { useAuth, useIsCoach } from '../../contexts/AuthContext';
import StudentsListTour from '../../components/tour/CoachTour/StudentsListTour';

type StudentRow = {
  _id: string;
  fullName: string;
  email: string;
  grade: string;
  lastActivity: string;
  activePlansCount: number;
  avatar?: string | null;
};

type PaginationMeta = { page: number; limit: number; total: number };

const StudentsList: React.FC = () => {
  const isCoach = useIsCoach();
  const { user } = useAuth();
  const searchRef = useRef<HTMLDivElement | null>(null);
  const refreshBtnRef = useRef<HTMLButtonElement | null>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: Number(searchParams.get('page') || 1),
    limit: Number(searchParams.get('limit') || 10),
    total: 0,
  });
  const [query, setQuery] = useState<string>(searchParams.get('q') || '');

  const filteredRows = useMemo(() => {
    if (!query) return rows;
    const q = query.toLowerCase();
    return rows.filter(r =>
      (r.fullName || '').toLowerCase().includes(q) ||
      (r.email || '').toLowerCase().includes(q)
    );
  }, [rows, query]);

  const fetchData = async (page = pagination.page, limit = pagination.limit) => {
    try {
      setLoading(true);
      const res = await apiRequest(`/coach/students?page=${page}&limit=${limit}`);
      setRows(res.data || []);
      setPagination({ page, limit, total: res.pagination?.total || 0 });
    } catch (e: any) {
      message.error(e.message || 'Öğrenci listesi getirilemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const p: Record<string, string> = {
      page: String(pagination.page),
      limit: String(pagination.limit),
    };
    if (query) p.q = query;
    setSearchParams(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit, query]);

  const handleTableChange = (p: TablePaginationConfig) => {
    const nextPage = p.current || 1;
    const nextSize = p.pageSize || 10;
    fetchData(nextPage, nextSize);
  };

  const columns: ColumnsType<StudentRow> = [
    {
      title: 'Öğrenci',
      dataIndex: 'fullName',
      key: 'student',
      render: (_: any, record) => (
        <Space>
          <Avatar src={toAbsoluteUrl(record.avatar || undefined)} icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: 600 }}>{record.fullName}</div>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>{record.email}</div>
          </div>
        </Space>
      )
    },
    {
      title: 'Sınıf',
      dataIndex: 'grade',
      key: 'grade',
      width: 140,
      render: (grade: string) => <Tag color="blue">{grade}</Tag>
    },
    {
      title: 'Son Aktivite',
      dataIndex: 'lastActivity',
      key: 'lastActivity',
      width: 160,
      render: (value: string) => dayjs(value).format('DD/MM/YYYY')
    },
    {
      title: 'Bugünkü Planlar',
      dataIndex: 'activePlansCount',
      key: 'activePlansCount',
      width: 140,
      align: 'center',
      render: (count: number) => <Tag color={count > 0 ? 'green' : 'red'}>{count}</Tag>
    },
    {
      title: 'İşlemler',
      key: 'actions',
      width: 260,
      render: (_: any, record) => (
        <Space>
          <Link to={`/coach/students/${record._id}`}>
            <Button size="small" icon={<EyeOutlined />}>Görüntüle</Button>
          </Link>
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate(`/coach/programs/create?studentId=${record._id}`)}
          >
            Program Oluştur
          </Button>
        </Space>
      )
    }
  ];

  if (!isCoach) {
    return (
      <Card>
        Koç yetkisi gereklidir.
      </Card>
    );
  }

  return (
    <div>
      <Card title="Öğrenci Yönetimi" extra={<Button ref={refreshBtnRef as any} icon={<ReloadOutlined />} onClick={() => fetchData()}>Yenile</Button>} style={{ marginBottom: 16 }}>
        <div ref={searchRef as any}>
          <Input.Search
            placeholder="İsim veya e-posta ile ara"
            allowClear
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ maxWidth: 360 }}
          />
        </div>
      </Card>

      <Card>
        <Table
          rowKey="_id"
          loading={loading}
          columns={columns}
          dataSource={filteredRows}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            showSizeChanger: true,
          }}
          onChange={handleTableChange}
        />
      </Card>

      <StudentsListTour
        userId={user?._id}
        targets={{
          getSearchEl: () => (searchRef.current as any) || document.querySelector('.ant-input-search') as HTMLElement | null,
          getTableEl: () => document.querySelector('.ant-table') as HTMLElement | null,
          getRefreshEl: () => (refreshBtnRef.current as any) || document.querySelector('.ant-card .ant-btn') as HTMLElement | null,
        }}
      />
    </div>
  );
};

export default StudentsList;


