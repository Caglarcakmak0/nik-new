import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Row, 
  Col, 
  Typography, 
  Tag, 
  Button, 
  Space, 
  Modal,
  message,
  Tabs,
  Form,
  Avatar,
  Progress
} from 'antd';
import { 
  DashboardOutlined,
  UserOutlined,
  BarChartOutlined,
  PlusOutlined,
  EyeOutlined,
  DownloadOutlined,
  GlobalOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';
// removed ReloadOutlined usage moved to AnalyticsTab
import type { ColumnsType } from 'antd/es/table';
import { getAdminUsers, updateUser, deleteUser, getAdminFeedbackSummary, getAdminCoachesStatistics,  type FeedbackSummary, createUser, getAdminMotivation, updateAdminMotivation, getAdminUserPlan, getAdminSystemMetrics, getAdminUserGrowth } from '../../services/api';
// Split components
import OverviewTab from './components/OverviewTab';
import UsersTab from './components/UsersTab';
// Lazy load heavy analytics (recharts) chunk
const AnalyticsTab = React.lazy(() => import('./components/AnalyticsTab'));
import UserDetailsDrawer from './components/UserDetailsDrawer';
import EditUserModal from './components/EditUserModal';
import CreateUserModal from './components/CreateUserModal';
import { User, SystemMetrics, getRoleInfo, getStatusInfo } from './types';
// charts now handled in AnalyticsTab component
import './AdminDashboard.scss';

const { Title, Text } = Typography;
// Option removed; select usage handled in UsersTab component
// Tipler & yardımcılar (her render'da yeniden oluşturulmasını engellemek için komponent dışında)
// Pie colors moved to child components where needed

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDrawer, setUserDrawer] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [feedbackSummary, setFeedbackSummary] = useState<FeedbackSummary | null>(null);
  const [coachesStats, setCoachesStats] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<'' | 'student' | 'coach' | 'admin'>('');
  const [usersPagination, setUsersPagination] = useState<{ current: number; pageSize: number }>({ current: 1, pageSize: 20 });
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm] = Form.useForm();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();
  const [creatingUser, setCreatingUser] = useState(false);
  // Bakım/ayarlar sekmesi kaldırıldı
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    totalUsers: 0,
    totalStudents: 0,
    totalCoaches: 0,
    totalSessions: 0,
    totalQuestions: 0,
    avgSessionTime: 0,
    systemLoad: 0,
    databaseSize: 0,
    activeUsers: 0,
    responseTime: 0
  });
  const [adminCount, setAdminCount] = useState(0);
  const [growthPercent, setGrowthPercent] = useState<number | null>(null);

  // Motivation state
  const [motivationText, setMotivationText] = useState<string>('');
  const [motivationAuthor, setMotivationAuthor] = useState<string>('');
  const [savingMotivation, setSavingMotivation] = useState<boolean>(false);
  const [userPlan, setUserPlan] = useState<any | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);


  // Aktif tab - ağır analitik tabını gereksiz yere mount etmemek için
  const [activeTab, setActiveTab] = useState('overview');

  // Paralel istek çakışmalarını iptal etmek için abort controller referansları
  const usersAbortRef = useRef<AbortController | null>(null);

  // fetchUsers tanımı userColumns'tan önce olmalı (TDZ hatasını önlemek için userColumns aşağı taşındı)

  const fetchUsers = useCallback(async (opts?: { page?: number; pageSize?: number }) => {
    try {
      // Mevcut isteği iptal et
      if (usersAbortRef.current) usersAbortRef.current.abort();
      const controller = new AbortController();
      usersAbortRef.current = controller;
      setLoading(true);
      const page = opts?.page ?? usersPagination.current;
      const pageSize = opts?.pageSize ?? usersPagination.pageSize;
  const res = await getAdminUsers({ q: searchText || undefined, role: roleFilter || undefined, page, limit: pageSize });
      const items = Array.isArray(res?.data) ? res.data : (res?.data?.data || []);
      const pagination = res?.pagination || res?.data?.pagination || undefined;
      const finalList: User[] = items.map((u: any) => ({
        _id: u._id,
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        email: u.email,
        role: u.role,
        profileCompleteness: u.profileCompleteness ?? 0,
        lastActivity: u.lastActivity,
        status: u.status,
        registrationDate: u.registrationDate,
      }));
      setUsers(finalList);
      setUsersTotal(pagination?.total ?? finalList.length);
      setUsersPagination({ current: page, pageSize });
    } catch (e: any) {
      if (e?.name === 'AbortError') return; // iptal edildi
      message.error(e?.message || 'Kullanıcılar yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, searchText, usersPagination.current, usersPagination.pageSize]);

  // Users table columns (fetchUsers artık tanımlandıktan sonra)
  const userColumns: ColumnsType<User> = useMemo(() => [
    {
      title: 'Kullanıcı',
      key: 'user',
      render: (_: any, record: User) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Avatar style={{ backgroundColor: getRoleInfo(record.role).color === 'red' ? '#ff4d4f' : getRoleInfo(record.role).color === 'blue' ? '#1890ff' : '#52c41a' }}>
            {record.firstName.charAt(0)}
          </Avatar>
          <div>
            <Text strong>{record.firstName} {record.lastName}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>{record.email}</Text>
          </div>
        </div>
      )
    },
    {
      title: 'Rol',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const roleInfo = getRoleInfo(role);
        return <Tag color={roleInfo.color}>{roleInfo.text}</Tag>;
      }
    },
    {
      title: 'Durum',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusInfo = getStatusInfo(status);
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      }
    },
    {
      title: 'Profil Tamamlanması',
      key: 'completion',
      render: (_: any, record: User) => (
        <div style={{ minWidth: '120px' }}>
          <Progress
            percent={record.profileCompleteness}
            size="small"
            strokeColor={record.profileCompleteness >= 80 ? '#52c41a' : '#1890ff'}
            format={() => `${record.profileCompleteness}%`}
          />
        </div>
      )
    },
    {
      title: 'Kayıt Tarihi',
      dataIndex: 'registrationDate',
      key: 'registrationDate',
      render: (date: string) => new Date(date).toLocaleDateString('tr-TR'),
      sorter: (a: User, b: User) => new Date(a.registrationDate).getTime() - new Date(b.registrationDate).getTime()
    },
    {
      title: 'Son Aktivite',
      dataIndex: 'lastActivity',
      key: 'lastActivity',
      render: (date: string) => date ? new Date(date).toLocaleString('tr-TR') : '-'
    },
    {
      title: 'İşlemler',
      key: 'actions',
      render: (_: any, record: User) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedUser(record);
              setUserDrawer(true);
            }}
          >
            Görüntüle
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingUser(record);
              setEditModalVisible(true);
              editForm.setFieldsValue({
                firstName: record.firstName,
                lastName: record.lastName,
                email: record.email,
                role: record.role,
                isActive: record.status === 'active'
              });
            }}
          >
            Düzenle
          </Button>
          <Button
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => {
              Modal.confirm({
                title: 'Kullanıcıyı sil',
                content: 'Bu işlem geri alınamaz. Silmek istediğinizden emin misiniz?',
                okText: 'Sil',
                okButtonProps: { danger: true },
                cancelText: 'Vazgeç',
                onOk: async () => {
                  try {
                    await deleteUser(record._id);
                    message.success('Kullanıcı silindi');
                    fetchUsers({ page: usersPagination.current, pageSize: usersPagination.pageSize });
                  } catch (e: any) {
                    message.error(e?.message || 'Silme sırasında hata oluştu');
                  }
                }
              })
            }}
          >
            Sil
          </Button>
        </Space>
      )
    }
  ], [editForm, fetchUsers, usersPagination.current, usersPagination.pageSize]);

  const handleTableChange = (pagination: any) => {
    const { current, pageSize } = pagination;
    fetchUsers({ page: current, pageSize });
  };

  useEffect(() => {
    fetchUsers({ page: 1, pageSize: usersPagination.pageSize });
  }, [fetchUsers, usersPagination.pageSize]);

  // Sistem metriklerini yükle (ilk render)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await getAdminCoachesStatistics();
        const data = (res && res.data) || res;
        if (!data || !isMounted) return;
        setSystemMetrics((prev) => ({
          ...prev,
          totalUsers: data.totalUsers ?? prev.totalUsers,
          totalStudents: data.totalStudents ?? prev.totalStudents,
          totalCoaches: data.totalCoaches ?? prev.totalCoaches,
          totalSessions: data.totalSessions ?? prev.totalSessions,
          totalQuestions: data.totalQuestions ?? prev.totalQuestions,
          avgSessionTime: data.avgSessionTime ?? prev.avgSessionTime,
          databaseSize: data.databaseSize ?? prev.databaseSize,
          activeUsers: data.activeUsers ?? prev.activeUsers,
        }));
        // Fetch live system metrics (load & response time)
        try {
          const sm = await getAdminSystemMetrics();
          const sys = sm?.data;
          if (sys && isMounted) {
            setSystemMetrics(prev => ({
              ...prev,
              systemLoad: sys.systemLoad ?? prev.systemLoad,
              responseTime: sys.responseTime ?? prev.responseTime,
              totalUsers: sys.totalUsers ?? prev.totalUsers,
              totalStudents: sys.totalStudents ?? prev.totalStudents,
              totalCoaches: sys.totalCoaches ?? prev.totalCoaches,
              totalSessions: sys.totalSessions ?? prev.totalSessions,
              activeUsers: sys.activeUsers ?? prev.activeUsers,
            }));
          }
        } catch { /* ignore system metrics errors */ }
        // Backend monthly growth
        try {
          const growth = await getAdminUserGrowth();
          if (growth?.data && isMounted) setGrowthPercent(growth.data.growthPercent);
        } catch { /* ignore */ }
      } catch (e) {
        // sessiz geç
      }
      try {
        const mv = await getAdminMotivation();
        const data = (mv && (mv as any).data) || null;
        if (data && isMounted) {
          setMotivationText(data.text || '');
          setMotivationAuthor(data.author || '');
        }
      } catch (_) {
        // no-op
      }
      // admin count (lightweight request with role filter & limit 1)
      try {
        const resp = await getAdminUsers({ role: 'admin', page: 1, limit: 1 });
        const pagination = resp?.pagination || resp?.data?.pagination;
        if (pagination?.total != null && isMounted) setAdminCount(pagination.total);
      } catch { /* ignore */ }
    })();
    return () => { isMounted = false; };
  }, []);

  // Analytics data fetch (feedback summary + coaches stats)
  const refreshAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const [feedbackRes, coachesRes] = await Promise.all([
        getAdminFeedbackSummary(),
        getAdminCoachesStatistics()
      ]);
      setFeedbackSummary(feedbackRes?.data || null);
      setCoachesStats(Array.isArray(coachesRes?.data) ? coachesRes.data : []);
    } catch (err) {
      // no-op
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => { refreshAnalytics(); }, [refreshAnalytics]);

  // Chart data builders (memoize)
  // Child tab components now handle their own layout
  const derived = useMemo(() => {
    const usersProgress = systemMetrics.totalUsers > 0 ? (systemMetrics.totalStudents / systemMetrics.totalUsers) * 100 : 0;
    const sessionsProgress = systemMetrics.totalUsers > 0 ? (systemMetrics.activeUsers / systemMetrics.totalUsers) * 100 : 0;
    const targetPerUser = 100; // hedef soru/öğrenci
    const questionsPerUser = systemMetrics.totalUsers > 0 ? systemMetrics.totalQuestions / systemMetrics.totalUsers : 0;
    const questionsProgress = Math.min(100, (questionsPerUser / targetPerUser) * 100);
    return { usersProgress, sessionsProgress, questionsProgress };
  }, [systemMetrics]);

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
          <Col>
            <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 500, fontSize: '24px' }}>
              <DashboardOutlined style={{ color: '#ff4d4f' }} />
              Admin Paneli
              <Tag color="red">Administrator</Tag>
            </Title>
          </Col>
          <Col>
            <Space>
              <Button icon={<DownloadOutlined />}>
                Sistem Raporu
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
                Yeni Kullanıcı
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        destroyInactiveTabPane
        size="large"
        items={[
          { key: 'overview', label: (<><BarChartOutlined />Sistem Genel Bakış</>), children: (
            <OverviewTab
              systemMetrics={systemMetrics}
              motivationText={motivationText}
              motivationAuthor={motivationAuthor}
              savingMotivation={savingMotivation}
              derived={derived}
              onChangeMotivation={setMotivationText}
              onChangeAuthor={setMotivationAuthor}
              onSave={async () => {
                try {
                  setSavingMotivation(true);
                  await updateAdminMotivation({ text: motivationText.trim(), author: motivationAuthor.trim() || undefined });
                  message.success('Motivasyon sözü güncellendi');
                } catch (e: any) { message.error(e?.message || 'Güncelleme sırasında hata oluştu'); } finally { setSavingMotivation(false); }
              }}
            />
          ) },
          { key: 'users', label: (<><UserOutlined />Kullanıcı Yönetimi ({usersTotal})</>), children: (
            <UsersTab
              systemMetrics={systemMetrics}
              users={users}
              usersTotal={usersTotal}
              usersPagination={usersPagination}
              loading={loading}
              roleFilter={roleFilter}
              userColumns={userColumns}
              onSearch={(val) => setSearchText(val)}
              onRoleFilterChange={(val) => setRoleFilter(val)}
              onTableChange={handleTableChange}
              adminCount={adminCount}
              growthPercent={growthPercent}
            />
          ) },
          { key: 'analytics', label: (<><GlobalOutlined />Analitik & Raporlar</>), children: (
            <React.Suspense fallback={<div style={{ padding: 24 }}>Analitik bileşenleri yükleniyor...</div>}>
              <AnalyticsTab
                feedbackSummary={feedbackSummary}
                coachesStats={coachesStats}
                analyticsLoading={analyticsLoading}
                refreshAnalytics={refreshAnalytics}
              />
            </React.Suspense>
          ) }
        ]}
      />

      {/* User Details Drawer */}
      <UserDetailsDrawer
        open={userDrawer}
        user={selectedUser}
        onClose={() => { setUserDrawer(false); setSelectedUser(null); }}
        onEdit={(u) => { setEditingUser(u); setEditModalVisible(true); editForm.setFieldsValue({ firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role, isActive: u.status === 'active' }); }}
        refreshUsers={() => fetchUsers({ page: 1, pageSize: usersPagination.pageSize })}
        fetchPlan={async (id: string) => { try { setLoadingPlan(true); const res = await getAdminUserPlan(id); setUserPlan(res?.data || res); } catch { setUserPlan(null); } finally { setLoadingPlan(false); } }}
        loadingPlan={loadingPlan}
        userPlan={userPlan}
        setUserPlan={setUserPlan}
      />

      {/* Edit User Modal */}
      <EditUserModal
        open={editModalVisible}
        user={editingUser}
        form={editForm}
        onCancel={() => { setEditModalVisible(false); setEditingUser(null); }}
        onSave={async () => {
          try {
            const values = await editForm.validateFields();
            if (!editingUser) return;
            await updateUser(editingUser._id, { firstName: values.firstName, lastName: values.lastName, email: values.email, role: values.role, isActive: values.isActive });
            message.success('Kullanıcı güncellendi');
            setEditModalVisible(false);
            setEditingUser(null);
            fetchUsers({ page: usersPagination.current, pageSize: usersPagination.pageSize });
          } catch (e: any) { if (e?.errorFields) return; message.error(e?.message || 'Güncelleme sırasında hata oluştu'); }
        }}
      />

      {/* Create User Modal */}
      <CreateUserModal
        open={createModalVisible}
        form={createForm}
        onCancel={() => { setCreateModalVisible(false); createForm.resetFields(); }}
        confirmLoading={creatingUser}
        onCreate={async () => {
          try {
            const values = await createForm.validateFields();
            setCreatingUser(true);
            await createUser({ firstName: values.firstName?.trim() || undefined, lastName: values.lastName?.trim() || undefined, email: values.email.trim(), password: values.password, role: values.role });
            message.success('Kullanıcı oluşturuldu');
            setCreateModalVisible(false);
            createForm.resetFields();
            fetchUsers({ page: usersPagination.current, pageSize: usersPagination.pageSize });
          } catch (e: any) { if (e?.errorFields) return; message.error(e?.message || 'Oluşturma sırasında hata oluştu'); } finally { setCreatingUser(false); }
        }}
      />
    </div>
  );
};

export default AdminDashboard;