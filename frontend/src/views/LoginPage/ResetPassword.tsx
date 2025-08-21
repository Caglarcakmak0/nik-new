import { useEffect, useState } from 'react'
import { Card, Form, Input, Button, Typography, message } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { authService } from '../../services/authStore'

const { Title, Text } = Typography

const ResetPassword = () => {
  const [loading, setLoading] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const uid = searchParams.get('uid') || ''
  const token = searchParams.get('token') || ''

  useEffect(() => {
    if (!uid || !token) {
      message.error('Geçersiz bağlantı')
    }
  }, [uid, token])

  const onFinish = async (values: { password: string; password2: string }) => {
    if (!uid || !token) return
    if (values.password !== values.password2) {
      message.error('Şifreler eşleşmiyor')
      return
    }
    setLoading(true)
    try {
      await authService.resetPassword({ uid, token, newPassword: values.password })
      message.success('Şifreniz güncellendi. Lütfen giriş yapın.')
      navigate('/login')
    } catch (e: any) {
      message.error(e?.message || 'Şifre güncellenemedi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
      <Card style={{ width: 420, padding: 20 }}>
        <div style={{ marginBottom: 24 }}>
          <Title level={3}>Yeni Şifre Belirle</Title>
          <Text type="secondary">Güçlü bir şifre seçin.</Text>
        </div>
        <Form layout="vertical" onFinish={onFinish} size="large">
          <Form.Item name="password" label="Yeni Şifre" rules={[{ required: true, message: 'Şifre girin' }, { min: 6, message: 'En az 6 karakter' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Yeni şifreniz" />
          </Form.Item>
          <Form.Item name="password2" label="Yeni Şifre (Tekrar)" dependencies={["password"]} rules={[{ required: true, message: 'Tekrar şifre girin' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Yeni şifrenizi tekrar girin" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} style={{ width: '100%' }}>Şifreyi Güncelle</Button>
          </Form.Item>
          <div style={{ textAlign: 'center' }}>
            <Link to="/login">Girişe dön</Link>
          </div>
        </Form>
      </Card>
    </div>
  )
}

export default ResetPassword


