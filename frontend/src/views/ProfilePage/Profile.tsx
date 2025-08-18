import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Space, Typography, message, Row, Col, Avatar, Progress, Upload } from 'antd';
import type { UploadProps } from 'antd';
import { UserOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { apiRequest, toAbsoluteUrl, API_BASE_URL } from '../../services/api';

const { Title, Text } = Typography;

interface UserProfile {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;  
  phone?: string;
  bio?: string;
  role: string;
  profileCompleteness?: number;
  avatar?: string | null;
}

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const baseURL = API_BASE_URL;
  
  
  // Profile verilerini backend'den al
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/users/profile');
      
      if (response.data) {
        setProfileData(response.data);
        form.setFieldsValue({
          firstName: response.data.firstName || '',
          lastName: response.data.lastName || '',
          phone: response.data.phone || '',
          bio: response.data.bio || ''
        });
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      message.error('Profil bilgileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  // Profil güncelleme
  const handleUpdate = async (values: any) => {
    try {
      setLoading(true);
      
      if (!user?._id) {
        throw new Error('Kullanıcı bilgisi bulunamadı');
      }
      
      const response = await apiRequest(`/users/${user._id}`, {
        method: 'PUT',
        body: JSON.stringify(values)
      });
      
      message.success('Profil başarıyla güncellendi!');
      setEditMode(false);
      fetchProfile(); // Yeni verileri çek
    } catch (error: any) {
      console.error('Profile update error:', error);
      message.error(error.message || 'Profil güncellenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    // Form'u eski değerlere döndür
    form.setFieldsValue({
      firstName: profileData?.firstName || '',
      lastName: profileData?.lastName || '',
      phone: profileData?.phone || '',
      bio: profileData?.bio || ''
    });
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (!profileData && loading) {
    return <div>Yükleniyor...</div>;
  }

  const uploadProps: UploadProps = {
    name: 'avatar',
    showUploadList: false,
    accept: 'image/*',
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('Sadece resim dosyaları yükleyebilirsiniz');
        return Upload.LIST_IGNORE as any;
      }
      const isLt1M = file.size / 1024 / 1024 < 1;
      if (!isLt1M) {
        message.error('Dosya boyutu 1MB altında olmalı');
        return Upload.LIST_IGNORE as any;
      }
      return true;
    },
    customRequest: async ({ file, onSuccess, onError }) => {
      try {
        const formData = new FormData();
        formData.append('avatar', file as File);
        const token = localStorage.getItem('token');
        const res = await fetch(`${baseURL}/users/avatar`, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: formData
        });
        if (!res.ok) throw new Error('Yükleme başarısız');
        const json = await res.json();
        message.success('Avatar güncellendi');
        await fetchProfile();
        // NavBar avatar'ı da hemen güncelle
        if (json?.avatar) {
          updateUser({ avatar: json.avatar });
        }
        onSuccess && onSuccess(json as any);
      } catch (e) {
        message.error('Avatar yüklenemedi');
        onError && onError(e as any);
      }
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Title level={2}>
        <UserOutlined /> Profil Bilgileri
      </Title>
      
      {/* Profil Tamamlanma Çubuğu */}
      {profileData?.profileCompleteness !== undefined && (
        <Card style={{ marginBottom: '24px' }}>
          <Row align="middle" gutter={16}>
            <Col flex="auto">
              <Text>Profil Tamamlanma Oranı</Text>
              <Progress 
                percent={profileData.profileCompleteness} 
                status={profileData.profileCompleteness < 50 ? 'exception' : 'normal'}
                showInfo={true}
              />
            </Col>
          </Row>
        </Card>
      )}

      <Card>
        <Row gutter={24}>
          {/* Sol Taraf - Avatar ve Temel Bilgiler */}
          <Col xs={24} md={6} style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Upload {...uploadProps}>
              <div style={{ display: 'inline-block', cursor: 'pointer' }}>
                <Avatar size={120} src={toAbsoluteUrl(profileData?.avatar) || undefined} icon={<UserOutlined />} style={{ marginBottom: '8px' }} />
                <div>
                  <Button size="small">Avatarı Değiştir</Button>
                </div>
              </div>
            </Upload>
            <div>
              <Title level={4} style={{ margin: '8px 0' }}>
                {profileData?.firstName && profileData?.lastName 
                  ? `${profileData.firstName} ${profileData.lastName}`
                  : 'İsim Belirtilmemiş'
                }
              </Title>
              <Text type="secondary">{profileData?.email}</Text>
              <br />
              <Text type="secondary">
                {profileData?.role === 'student' ? 'Öğrenci' : 
                 profileData?.role === 'coach' ? 'Koç' : 'Admin'}
              </Text>
            </div>
          </Col>

          {/* Sağ Taraf - Form */}
          <Col xs={24} md={18}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <Title level={4}>Kişisel Bilgiler</Title>
              {!editMode ? (
                <Button 
                  type="primary" 
                  icon={<EditOutlined />}
                  onClick={() => setEditMode(true)}
                >
                  Düzenle
                </Button>
              ) : (
                <Space>
                  <Button onClick={handleCancel}>İptal</Button>
                  <Button 
                    type="primary" 
                    icon={<SaveOutlined />}
                    onClick={() => form.submit()}
                    loading={loading}
                  >
                    Kaydet
                  </Button>
                </Space>
              )}
            </div>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleUpdate}
              disabled={!editMode}
            >
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Ad"
                    name="firstName"
                    rules={[
                      { required: true, message: 'Ad gereklidir' },
                      { max: 50, message: 'Ad en fazla 50 karakter olabilir' }
                    ]}
                  >
                    <Input placeholder="Adınızı girin" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Soyad"
                    name="lastName"
                    rules={[
                      { required: true, message: 'Soyad gereklidir' },
                      { max: 50, message: 'Soyad en fazla 50 karakter olabilir' }
                    ]}
                  >
                    <Input placeholder="Soyadınızı girin" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="Telefon"
                name="phone"
                rules={[
                  { pattern: /^[0-9+\-\s()]+$/, message: 'Geçerli bir telefon numarası girin' }
                ]}
              >
                <Input placeholder="Telefon numaranızı girin" />
              </Form.Item>

              <Form.Item
                label="Hakkında"
                name="bio"
                rules={[
                  { max: 500, message: 'Bio en fazla 500 karakter olabilir' }
                ]}
              >
                <Input.TextArea 
                  rows={4} 
                  placeholder="Kendiniz hakkında kısa bilgi yazın..." 
                  showCount
                  maxLength={500}
                />
              </Form.Item>

              <Form.Item
                label="E-posta"
              >
                <Input value={profileData?.email} disabled />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  E-posta adresi değiştirilemez
                </Text>
              </Form.Item>
            </Form>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default Profile;