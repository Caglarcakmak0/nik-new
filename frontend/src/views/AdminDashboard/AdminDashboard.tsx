import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Table, 
  Tag, 
  Button, 
  Space, 
  Statistic, 
  Progress,
  Select,
  Input,
  Modal,
  message,
  Alert,
  Tabs,
  Avatar,
  Drawer,
  Form,
  Switch,
  Empty,
  Rate
} from 'antd';
import { 
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  BarChartOutlined,
  SecurityScanOutlined,
  BellOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
  CloudServerOutlined,
  LineChartOutlined,
  PieChartOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import { ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getAdminUsers, updateUser, deleteUser, getAdminFeedbackSummary, getAdminCoachesStatistics,  type FeedbackSummary, createUser, getAdminMotivation, updateAdminMotivation, getAdminUserPlan, updateAdminUserPlan, updateAdminUserLimits } from '../../services/api';
import { CoachesStatsList } from '../../components/admin';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import './AdminDashboard.scss';

const { Title, Text } = Typography;
const { Option } = Select;
// Tipler & yardımcılar (her render'da yeniden oluşturulmasını engellemek için komponent dışında)
interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'student' | 'coach' | 'admin';
  profileCompleteness: number;
  lastActivity: string;
  status: 'active' | 'inactive' | 'banned';
  registrationDate: string;
}

interface SystemMetrics {
  totalUsers: number;
  totalStudents: number;
  totalCoaches: number;
  totalSessions: number;
  totalQuestions: number;
  avgSessionTime: number;
  systemLoad: number;
  databaseSize: number;
  activeUsers: number;
  responseTime: number;
}

const getRoleInfo = (role: string) => {
  const roleConfig = {
    admin: { color: 'red', text: 'Admin' },
    coach: { color: 'blue', text: 'Koç' },
    student: { color: 'green', text: 'Öğrenci' }
  } as const;
  return roleConfig[role as keyof typeof roleConfig] || { color: 'default', text: role };
};

const getStatusInfo = (status: string) => {
  const statusConfig = {
    active: { color: 'success', text: 'Aktif' },
    inactive: { color: 'warning', text: 'Pasif' },
    banned: { color: 'error', text: 'Yasaklı' }
  } as const;
  return statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };
};

const pieColors = ['#1890ff', '#faad14', '#52c41a', '#722ed1', '#ff4d4f'];

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
  const categoryChartData = useMemo(() => feedbackSummary ? [
    { name: 'İletişim', value: feedbackSummary.categoryAverages.communication },
    { name: 'Program Kalitesi', value: feedbackSummary.categoryAverages.programQuality },
    { name: 'Memnuniyet', value: feedbackSummary.categoryAverages.overallSatisfaction }
  ] : [], [feedbackSummary]);

  const issuesChartData = useMemo(() => feedbackSummary ? [
    { name: 'Aşırı Baskı', value: feedbackSummary.issuesCounts.tooMuchPressure },
    { name: 'Yetersiz Destek', value: feedbackSummary.issuesCounts.notEnoughSupport },
    { name: 'İletişim', value: feedbackSummary.issuesCounts.communicationProblems },
    { name: 'Uygun Değil', value: feedbackSummary.issuesCounts.programNotSuitable }
  ] : [], [feedbackSummary]);

  const statusChartData = useMemo(() => feedbackSummary ? [
    { name: 'Yeni', value: feedbackSummary.statusCounts.new },
    { name: 'Okundu', value: feedbackSummary.statusCounts.read }
  ] : [], [feedbackSummary]);

  const overviewTab = (
    <>
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24}>
              <Card title="Haftalık Motivasyon Sözü" extra={<Text type="secondary">Giriş ekranında gösterilir</Text>}>
                <Form layout="vertical" onFinish={async () => {
                  try {
                    setSavingMotivation(true);
                    await updateAdminMotivation({ text: motivationText.trim(), author: motivationAuthor.trim() || undefined });
                    message.success('Motivasyon sözü güncellendi');
                  } catch (e: any) {
                    message.error(e?.message || 'Güncelleme sırasında hata oluştu');
                  } finally {
                    setSavingMotivation(false);
                  }
                }}>
                  <Form.Item label="Söz" required>
                    <Input.TextArea
                      value={motivationText}
                      onChange={(e) => setMotivationText(e.target.value)}
                      rows={3}
                      maxLength={500}
                      showCount
                      placeholder="Haftalık motivasyon sözünü yazın"
                    />
                  </Form.Item>
                  <Form.Item label="Yazar">
                    <Input
                      value={motivationAuthor}
                      onChange={(e) => setMotivationAuthor(e.target.value)}
                      maxLength={100}
                      placeholder="İsteğe bağlı"
                    />
                  </Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit" loading={savingMotivation} icon={<EditOutlined />}>Kaydet</Button>
                  </Space>
                </Form>
              </Card>
            </Col>
          </Row>
          <Alert
            message="🟢 Sistem Durumu: Sağlıklı"
            description="Tüm servisler normal çalışıyor. Son kontrol: 2 dakika önce"
            type="success"
            showIcon
            style={{ marginBottom: '24px', borderRadius: '8px' }}
          />

          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={12} md={8} lg={6}>
              <Card size="small" className="metric-card users">
                <Statistic
                  title="Toplam Kullanıcı"
                  value={systemMetrics.totalUsers}
                  prefix={<TeamOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
                <Progress percent={78} size="small" showInfo={false} strokeColor="#1890ff" />
                <Text type="secondary" style={{ fontSize: '11px' }}>Bu ay +124</Text>
              </Card>
            </Col>
            <Col xs={12} md={8} lg={6}>
              <Card size="small" className="metric-card sessions">
                <Statistic
                  title="Toplam Oturum"
                  value={systemMetrics.totalSessions}
                  prefix={<LineChartOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
                <Progress percent={85} size="small" showInfo={false} strokeColor="#52c41a" />
                <Text type="secondary" style={{ fontSize: '11px' }}>Bu hafta +567</Text>
              </Card>
            </Col>
            <Col xs={12} md={8} lg={6}>
              <Card size="small" className="metric-card questions">
                <Statistic
                  title="Çözülen Soru"
                  value={systemMetrics.totalQuestions}
                  prefix={<PieChartOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
                <Progress percent={92} size="small" showInfo={false} strokeColor="#faad14" />
                <Text type="secondary" style={{ fontSize: '11px' }}>Bugün +2.4K</Text>
              </Card>
            </Col>
            <Col xs={12} md={8} lg={6}>
              <Card size="small" className="metric-card load">
                <Statistic
                  title="Sistem Yükü"
                  value={systemMetrics.systemLoad}
                  suffix="%"
                  prefix={<CloudServerOutlined />}
                  valueStyle={{ color: systemMetrics.systemLoad > 70 ? '#ff4d4f' : '#52c41a' }}
                />
                <Progress percent={systemMetrics.systemLoad} size="small" showInfo={false} strokeColor={systemMetrics.systemLoad > 70 ? '#ff4d4f' : '#52c41a'} />
                <Text type="secondary" style={{ fontSize: '11px' }}>Optimize edildi</Text>
              </Card>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} lg={16}>
              <Card title="Sistem Performansı">
                <Row gutter={16}>
                  <Col span={12}>
                    <div className="performance-metric">
                      <Text strong>Aktif Kullanıcılar</Text>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>
                        {systemMetrics.activeUsers}
                      </div>
                      <Text type="secondary">Şu anda online</Text>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div className="performance-metric">
                      <Text strong>Yanıt Süresi</Text>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a' }}>
                        {systemMetrics.responseTime}ms
                      </div>
                      <Text type="secondary">Ortalama API yanıtı</Text>
                    </div>
                  </Col>
                  <Col span={12} style={{ marginTop: '16px' }}>
                    <div className="performance-metric">
                      <Text strong>Veritabanı</Text>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#722ed1' }}>
                        {systemMetrics.databaseSize} GB
                      </div>
                      <Text type="secondary">Toplam boyut</Text>
                    </div>
                  </Col>
                  <Col span={12} style={{ marginTop: '16px' }}>
                    <div className="performance-metric">
                      <Text strong>Oturum Süresi</Text>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#faad14' }}>
                        {systemMetrics.avgSessionTime}dk
                      </div>
                      <Text type="secondary">Ortalama süre</Text>
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>
            
          </Row>
    </>
  );

  const usersTab = (
    <>
          <Row gutter={16} style={{ marginBottom: '24px' }}>
            <Col xs={8} md={6}>
              <Card size="small" className="user-stat students">
                <Statistic
                  title="Öğrenciler"
                  value={systemMetrics.totalStudents}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={8} md={6}>
              <Card size="small" className="user-stat coaches">
                <Statistic
                  title="Koçlar"
                  value={systemMetrics.totalCoaches}
                  prefix={<TeamOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={8} md={6}>
              <Card size="small" className="user-stat admins">
                <Statistic
                  title="Adminler"
                  value={16}
                  prefix={<SecurityScanOutlined />}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
            <Col xs={24} md={6}>
              <Card size="small" className="user-stat growth">
                <Statistic
                  title="Aylık Büyüme"
                  value={12.5}
                  suffix="%"
                  prefix={<LineChartOutlined />}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
          </Row>

          <Card 
            title="👥 Tüm Kullanıcılar"
            extra={
              <Space>
                <Input.Search
                  allowClear
                  placeholder="Ada/E-postaya göre ara"
                  style={{ width: 260 }}
                  onSearch={(val) => {
                    setSearchText(val.trim());
                  }}
                />
                <Select
                  value={roleFilter || 'all'}
                  style={{ width: 160 }}
                  onChange={(val) => setRoleFilter(val === 'all' ? '' : (val as any))}
                >
                  <Option value="all">Tüm Roller</Option>
                  <Option value="student">Öğrenci</Option>
                  <Option value="coach">Koç</Option>
                  <Option value="admin">Admin</Option>
                </Select>
              </Space>
            }
          >
            <Table
              columns={userColumns}
              dataSource={users}
              rowKey="_id"
              pagination={{
                current: usersPagination.current,
                pageSize: usersPagination.pageSize,
                total: usersTotal,
                showSizeChanger: true,
                showTotal: (total) => `Toplam ${total} kullanıcı`
              }}
              loading={loading}
              size="middle"
              onChange={handleTableChange}
            />
          </Card>
    </>
  );

  const analyticsTab = (
    <>
          <Space style={{ width: '100%', marginBottom: 12, justifyContent: 'flex-end' }}>
            <Button icon={<ReloadOutlined />} onClick={refreshAnalytics} loading={analyticsLoading}>
              Yenile
            </Button>
          </Space>
          <Row gutter={[24, 24]}>
            <Col xs={24} md={8}>
              <Card title="Ortalama Puan" loading={analyticsLoading}>
                <Statistic
                  title="Genel Ortalama"
                  value={feedbackSummary?.averageRating || 0}
                  precision={1}
                  valueStyle={{ color: '#faad14' }}
                />
                <div style={{ marginTop: 8 }}>
                  <Rate allowHalf disabled value={Number(feedbackSummary?.averageRating || 0)} />
                </div>
                <div style={{ marginTop: 12 }}>
                  <Text type="secondary">
                    Son feedback: {feedbackSummary?.lastFeedbackDate ? new Date(feedbackSummary.lastFeedbackDate).toLocaleDateString('tr-TR') : '-'}
                  </Text>
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Tag color="blue">Yeni: {feedbackSummary?.statusCounts.new ?? 0}</Tag>
                  <Tag color="green">Okundu: {feedbackSummary?.statusCounts.read ?? 0}</Tag>
                  <Tag color="gold">Toplam: {feedbackSummary?.totalFeedbacks ?? 0}</Tag>
                </div>
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card title="📌 Durum Dağılımı" loading={analyticsLoading}>
                {statusChartData.length ? (
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusChartData} dataKey="value" nameKey="name" outerRadius={80} label>
                          {statusChartData.map((_, index) => (
                            <Cell key={`status-${index}`} fill={pieColors[index % pieColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <Empty description="Veri yok" />
                )}
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card title="🧩 Sorun Dağılımı" loading={analyticsLoading}>
                {issuesChartData.length ? (
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={issuesChartData} dataKey="value" nameKey="name" outerRadius={80} label>
                          {issuesChartData.map((_, index) => (
                            <Cell key={`issue-${index}`} fill={pieColors[index % pieColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <Empty description="Veri yok" />
                )}
              </Card>
            </Col>

            <Col span={24}>
              <Card title="Kategori Ortalama Puanları" loading={analyticsLoading}>
                {categoryChartData.length ? (
                  <div style={{ height: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#1890ff" stopOpacity={0.95} />
                            <stop offset="100%" stopColor="#69c0ff" stopOpacity={0.9} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 5]} tickCount={6} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" name="Ortalama" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <Empty description="Veri yok" />
                )}
              </Card>
            </Col>

            <Col span={24}>
              <Card title="👥 Koç Özeti" loading={analyticsLoading}>
                {coachesStats.length ? (
                  <CoachesStatsList
                    items={coachesStats
                      .slice()
                      .sort((a, b) => (b?.feedbackStats?.totalFeedbacks || 0) - (a?.feedbackStats?.totalFeedbacks || 0))
                      .slice(0, 5)}
                  />
                ) : (
                  <Empty description="Koç istatistiği bulunamadı" />
                )}
              </Card>
            </Col>
          </Row>
    </>
  );

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
          { key: 'overview', label: (<><BarChartOutlined />Sistem Genel Bakış</>), children: overviewTab },
          { key: 'users', label: (<><UserOutlined />Kullanıcı Yönetimi ({usersTotal})</>), children: usersTab },
          { key: 'analytics', label: (<><GlobalOutlined />Analitik & Raporlar</>), children: analyticsTab }
        ]}
      />

      {/* User Details Drawer */}
      <Drawer
        title={selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName} - Detaylar` : 'Kullanıcı Detayları'}
        placement="right"
        size="large"
        onClose={() => {
          setUserDrawer(false);
          setSelectedUser(null);
        }}
        open={userDrawer}
        afterOpenChange={async (open) => {
          if (open && selectedUser) {
            try {
              setLoadingPlan(true);
              const res = await getAdminUserPlan(selectedUser._id);
              setUserPlan(res?.data || res);
            } catch (_) {
              setUserPlan(null);
            } finally {
              setLoadingPlan(false);
            }
          }
        }}
      >
        {selectedUser && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <Avatar size={64} style={{ backgroundColor: '#1890ff', marginBottom: '12px' }}>
                  {selectedUser.firstName.charAt(0)}
                </Avatar>
                <Title level={4}>{selectedUser.firstName} {selectedUser.lastName}</Title>
                <Text type="secondary">{selectedUser.email}</Text>
                <br />
                <Tag color={getRoleInfo(selectedUser.role).color} style={{ marginTop: '8px' }}>
                  {getRoleInfo(selectedUser.role).text}
                </Tag>
              </div>
            </Card>

            <Card title="Kullanıcı Bilgileri" size="small">
              <Row gutter={16}>
                <Col span={12}>
                  <Text strong>Durum:</Text>
                  <br />
                  <Tag color={getStatusInfo(selectedUser.status).color}>
                    {getStatusInfo(selectedUser.status).text}
                  </Tag>
                </Col>
                <Col span={12}>
                  <Text strong>Kayıt Tarihi:</Text>
                  <br />
                  <Text>{new Date(selectedUser.registrationDate).toLocaleDateString('tr-TR')}</Text>
                </Col>
                <Col span={24} style={{ marginTop: '12px' }}>
                  <Text strong>Profil Tamamlanması:</Text>
                  <Progress percent={selectedUser.profileCompleteness} style={{ marginTop: '4px' }} />
                </Col>
              </Row>
            </Card>

            <Card title="⚡ Hızlı İşlemler" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button 
                  block 
                  icon={<EditOutlined />}
                  onClick={() => {
                    setEditingUser(selectedUser);
                    setEditModalVisible(true);
                    editForm.setFieldsValue({
                      firstName: selectedUser.firstName,
                      lastName: selectedUser.lastName,
                      email: selectedUser.email,
                      role: selectedUser.role,
                      isActive: selectedUser.status === 'active'
                    });
                  }}
                >
                  Kullanıcıyı Düzenle
                </Button>
                <Button block icon={<BellOutlined />}>
                  Bildirim Gönder
                </Button>
                <Button 
                  block 
                  danger 
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    if (!selectedUser) return;
                    Modal.confirm({
                      title: 'Kullanıcıyı sil',
                      content: 'Bu işlem geri alınamaz. Silmek istediğinizden emin misiniz?',
                      okText: 'Sil',
                      okButtonProps: { danger: true },
                      cancelText: 'Vazgeç',
                      onOk: async () => {
                        try {
                          await deleteUser(selectedUser._id);
                          message.success('Kullanıcı silindi');
                          setUserDrawer(false);
                          setSelectedUser(null);
                          fetchUsers({ page: 1, pageSize: usersPagination.pageSize });
                        } catch (e: any) {
                          message.error(e?.message || 'Silme sırasında hata oluştu');
                        }
                      }
                    })
                  }}
                >
                  Hesabı Askıya Al
                </Button>
              </Space>
            </Card>
            <Card title="Plan Yönetimi" size="small" loading={loadingPlan}>
              {userPlan ? (
                <>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Space>
                      <Text>Plan:</Text>
                      <Tag color={userPlan.plan?.tier === 'premium' ? 'gold' : 'default'}>
                        {userPlan.plan?.tier || 'free'}
                      </Tag>
                      <Text type="secondary">Durum:</Text>
                      <Tag>{userPlan.plan?.status || 'active'}</Tag>
                    </Space>
                    <Space>
                      <Button
                        type={userPlan.plan?.tier === 'premium' ? 'default' : 'primary'}
                        onClick={async () => {
                          try {
                            await updateAdminUserPlan(selectedUser!._id, { tier: 'premium', resetLimits: true });
                            message.success('Kullanıcı premium yapıldı');
                            const res = await getAdminUserPlan(selectedUser!._id);
                            setUserPlan(res?.data || res);
                          } catch (e: any) { message.error(e?.message || 'Hata'); }
                        }}
                      >
                        Premium Yap
                      </Button>
                      <Button
                        danger={userPlan.plan?.tier === 'premium'}
                        onClick={async () => {
                          try {
                            await updateAdminUserPlan(selectedUser!._id, { tier: 'free', resetLimits: true });
                            message.success('Kullanıcı free yapıldı');
                            const res = await getAdminUserPlan(selectedUser!._id);
                            setUserPlan(res?.data || res);
                          } catch (e: any) { message.error(e?.message || 'Hata'); }
                        }}
                      >
                        Free Yap
                      </Button>
                    </Space>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text strong>Limitler</Text>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        <Button size="small" onClick={async () => {
                          try { await updateAdminUserLimits(selectedUser!._id, { activePlansMax: 1 }); message.success('Limit güncellendi'); } catch(e:any){ message.error(e?.message||'Hata'); }
                        }}>Plan: 1</Button>
                        <Button size="small" onClick={async () => {
                          try { await updateAdminUserLimits(selectedUser!._id, { activePlansMax: 5 }); message.success('Limit güncellendi'); } catch(e:any){ message.error(e?.message||'Hata'); }
                        }}>Plan: 5</Button>
                        <Button size="small" onClick={async () => {
                          try { await updateAdminUserLimits(selectedUser!._id, { examsPerMonth: 2 }); message.success('Limit güncellendi'); } catch(e:any){ message.error(e?.message||'Hata'); }
                        }}>Aylık Deneme: 2</Button>
                        <Button size="small" onClick={async () => {
                          try { await updateAdminUserLimits(selectedUser!._id, { examsPerMonth: 20 }); message.success('Limit güncellendi'); } catch(e:any){ message.error(e?.message||'Hata'); }
                        }}>Aylık Deneme: 20</Button>
                      </div>
                    </Space>
                  </Space>
                </>
              ) : (
                <Text type="secondary">Plan bilgisi yüklenemedi</Text>
              )}
            </Card>
          </Space>
        )}
      </Drawer>

      {/* Edit User Modal */}
      <Modal
        title={editingUser ? `${editingUser.firstName} ${editingUser.lastName} - Düzenle` : 'Kullanıcı Düzenle'}
        open={editModalVisible}
        onCancel={() => { setEditModalVisible(false); setEditingUser(null); }}
        okText="Kaydet"
        onOk={async () => {
          try {
            const values = await editForm.validateFields();
            if (!editingUser) return;
            await updateUser(editingUser._id, {
              firstName: values.firstName,
              lastName: values.lastName,
              email: values.email,
              role: values.role,
              isActive: values.isActive,
            });
            message.success('Kullanıcı güncellendi');
            setEditModalVisible(false);
            setEditingUser(null);
            fetchUsers({ page: usersPagination.current, pageSize: usersPagination.pageSize });
          } catch (e: any) {
            if (e?.errorFields) return; // form validation
            message.error(e?.message || 'Güncelleme sırasında hata oluştu');
          }
        }}
      >
        <Form layout="vertical" form={editForm}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="firstName" label="Ad" rules={[{ required: true, message: 'Ad gerekli' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lastName" label="Soyad" rules={[{ required: true, message: 'Soyad gerekli' }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="email" label="E-posta" rules={[{ required: true, type: 'email', message: 'Geçerli bir e-posta girin' }]}>
            <Input />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="role" label="Rol" rules={[{ required: true }]}> 
                <Select>
                  <Option value="student">Öğrenci</Option>
                  <Option value="coach">Koç</Option>
                  <Option value="admin">Admin</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="isActive" label="Durum" valuePropName="checked">
                <Switch checkedChildren="Aktif" unCheckedChildren="Pasif" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Create User Modal */}
      <Modal
        title="Yeni Kullanıcı Oluştur"
        open={createModalVisible}
        onCancel={() => { setCreateModalVisible(false); createForm.resetFields(); }}
        okText="Oluştur"
        confirmLoading={creatingUser}
        onOk={async () => {
          try {
            const values = await createForm.validateFields();
            setCreatingUser(true);
            await createUser({
              firstName: values.firstName?.trim() || undefined,
              lastName: values.lastName?.trim() || undefined,
              email: values.email.trim(),
              password: values.password,
              role: values.role,
            });
            message.success('Kullanıcı oluşturuldu');
            setCreateModalVisible(false);
            createForm.resetFields();
            fetchUsers({ page: usersPagination.current, pageSize: usersPagination.pageSize });
          } catch (e) {
            if ((e as any)?.errorFields) return; // form validation
            message.error((e as any)?.message || 'Oluşturma sırasında hata oluştu');
          } finally {
            setCreatingUser(false);
          }
        }}
      >
        <Form layout="vertical" form={createForm} initialValues={{ role: 'student' }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="firstName" label="Ad">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lastName" label="Soyad">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="email" label="E-posta" rules={[{ required: true, type: 'email', message: 'Geçerli bir e-posta girin' }]}>
            <Input />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="password" label="Şifre" rules={[{ required: true, message: 'Şifre gerekli' }, { min: 6, message: 'En az 6 karakter' }]}>
                <Input.Password />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="role" label="Rol" rules={[{ required: true }]}> 
                <Select>
                  <Option value="student">Öğrenci</Option>
                  <Option value="coach">Koç</Option>
                  <Option value="admin">Admin</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminDashboard;