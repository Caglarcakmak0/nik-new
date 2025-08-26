import React from 'react';
import { Drawer, Space, Card, Avatar, Typography, Tag, Row, Col, Progress, Button, Modal, message } from 'antd';
import { EditOutlined, BellOutlined, DeleteOutlined } from '@ant-design/icons';
import { User, getRoleInfo, getStatusInfo } from '../types';
import { updateAdminUserPlan, getAdminUserPlan, updateAdminUserLimits } from '../../../services/api';

const { Title, Text } = Typography;

interface UserDetailsDrawerProps {
  open: boolean;
  user: User | null;
  onClose(): void;
  onEdit(user: User): void;
  refreshUsers(): void;
  fetchPlan(userId: string): Promise<any>;
  loadingPlan: boolean;
  userPlan: any | null;
  setUserPlan(v: any | null): void;
}

const UserDetailsDrawer: React.FC<UserDetailsDrawerProps> = ({ open, user, onClose, onEdit, refreshUsers, fetchPlan, loadingPlan, userPlan, setUserPlan }) => {
  return (
    <Drawer
      title={user ? `${user.firstName} ${user.lastName} - Detaylar` : 'Kullanıcı Detayları'}
      placement="right"
      size="large"
      onClose={onClose}
      open={open}
      afterOpenChange={async (isOpen) => { if (isOpen && user) await fetchPlan(user._id); }}
    >
      {user && (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <Avatar size={64} style={{ backgroundColor: '#1890ff', marginBottom: '12px' }}>
                {user.firstName.charAt(0)}
              </Avatar>
              <Title level={4}>{user.firstName} {user.lastName}</Title>
              <Text type="secondary">{user.email}</Text>
              <br />
              <Tag color={getRoleInfo(user.role).color} style={{ marginTop: '8px' }}>
                {getRoleInfo(user.role).text}
              </Tag>
            </div>
          </Card>
          <Card title="Kullanıcı Bilgileri" size="small">
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>Durum:</Text>
                <br />
                <Tag color={getStatusInfo(user.status).color}>{getStatusInfo(user.status).text}</Tag>
              </Col>
              <Col span={12}>
                <Text strong>Kayıt Tarihi:</Text>
                <br />
                <Text>{new Date(user.registrationDate).toLocaleDateString('tr-TR')}</Text>
              </Col>
              <Col span={24} style={{ marginTop: '12px' }}>
                <Text strong>Profil Tamamlanması:</Text>
                <Progress percent={user.profileCompleteness} style={{ marginTop: '4px' }} />
              </Col>
            </Row>
          </Card>
          <Card title="⚡ Hızlı İşlemler" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button block icon={<EditOutlined />} onClick={() => onEdit(user)}>Kullanıcıyı Düzenle</Button>
              <Button block icon={<BellOutlined />}>Bildirim Gönder</Button>
              <Button
                block
                danger={user.status === 'active'}
                icon={<DeleteOutlined />}
                onClick={() => {
                  if (!user) return;
                  const suspend = user.status === 'active';
                  Modal.confirm({
                    title: suspend ? 'Hesabı askıya al' : 'Hesabı yeniden aktifleştir',
                    content: suspend ? 'Kullanıcı giriş yapamayacak. Devam?' : 'Kullanıcı tekrar giriş yapabilecek. Devam?',
                    okText: suspend ? 'Askıya Al' : 'Aktifleştir',
                    cancelText: 'Vazgeç',
                    onOk: async () => {
                      try {
                        // basit status toggle için updateUser kullan
                        const { updateUser } = await import('../../../services/api');
                        await updateUser(user._id, { isActive: !suspend });
                        message.success(suspend ? 'Kullanıcı askıya alındı' : 'Kullanıcı aktifleştirildi');
                        refreshUsers();
                        onClose();
                      } catch (e: any) {
                        message.error(e?.message || 'İşlem sırasında hata oluştu');
                      }
                    }
                  })
                }}
              >
                {user.status === 'active' ? 'Hesabı Askıya Al' : 'Hesabı Aktifleştir'}
              </Button>
            </Space>
          </Card>
          <Card title="Plan Yönetimi" size="small" loading={loadingPlan}>
            {userPlan ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <span>Plan:</span>
                  <Tag color={userPlan.plan?.tier === 'premium' ? 'gold' : 'default'}>{userPlan.plan?.tier || 'free'}</Tag>
                  <span style={{ marginLeft: 8 }}>Durum:</span>
                  <Tag>{userPlan.plan?.status || 'active'}</Tag>
                </Space>
                <Space>
                  <Button type={userPlan.plan?.tier === 'premium' ? 'default' : 'primary'} onClick={async () => {
                    try {
                      await updateAdminUserPlan(user._id, { tier: 'premium', resetLimits: true });
                      message.success('Kullanıcı premium yapıldı');
                      const res = await getAdminUserPlan(user._id);
                      setUserPlan(res?.data || res);
                    } catch (e: any) { message.error(e?.message || 'Hata'); }
                  }}>Premium Yap</Button>
                  <Button danger={userPlan.plan?.tier === 'premium'} onClick={async () => {
                    try {
                      await updateAdminUserPlan(user._id, { tier: 'free', resetLimits: true });
                      message.success('Kullanıcı free yapıldı');
                      const res = await getAdminUserPlan(user._id);
                      setUserPlan(res?.data || res);
                    } catch (e: any) { message.error(e?.message || 'Hata'); }
                  }}>Free Yap</Button>
                </Space>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <strong>Limitler</strong>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Button size="small" onClick={async () => { try { await updateAdminUserLimits(user._id, { activePlansMax: 1 }); message.success('Limit güncellendi'); } catch (e: any) { message.error(e?.message || 'Hata'); } }}>Plan: 1</Button>
                    <Button size="small" onClick={async () => { try { await updateAdminUserLimits(user._id, { activePlansMax: 5 }); message.success('Limit güncellendi'); } catch (e: any) { message.error(e?.message || 'Hata'); } }}>Plan: 5</Button>
                    <Button size="small" onClick={async () => { try { await updateAdminUserLimits(user._id, { examsPerMonth: 2 }); message.success('Limit güncellendi'); } catch (e: any) { message.error(e?.message || 'Hata'); } }}>Aylık Deneme: 2</Button>
                    <Button size="small" onClick={async () => { try { await updateAdminUserLimits(user._id, { examsPerMonth: 20 }); message.success('Limit güncellendi'); } catch (e: any) { message.error(e?.message || 'Hata'); } }}>Aylık Deneme: 20</Button>
                  </div>
                </Space>
              </Space>
            ) : (
              <span className="ant-typography-secondary">Plan bilgisi yüklenemedi</span>
            )}
          </Card>
        </Space>
      )}
    </Drawer>
  );
};

export default UserDetailsDrawer;
