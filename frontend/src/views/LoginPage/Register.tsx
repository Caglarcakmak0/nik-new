import { useState } from 'react'
import { Card, Form, Input, Button, Typography, message } from 'antd'
import { UserOutlined, MailOutlined, LockOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../../services/authStore'

const { Title, Text } = Typography

const Register = () => {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onFinish = async (values: { firstName?: string; lastName?: string; email: string; password: string; password2: string }) => {
    if (values.password !== values.password2) {
      message.error('Şifreler eşleşmiyor')
      return
    }
    setLoading(true)
    try {
      await authService.register({ email: values.email, password: values.password, firstName: values.firstName, lastName: values.lastName })
      message.success('Kayıt başarılı. Lütfen e‑postanızı doğrulayın.')
      navigate('/login')
    } catch (e: any) {
      message.error(e?.message || 'Kayıt başarısız')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
      <Card style={{ width: 480, padding: 20 }}>
        <div style={{ marginBottom: 24 }}>
          <Title level={3}>Kayıt Ol</Title>
          <Text type="secondary">Bilgilerinizi doldurun ve hesabınızı oluşturun.</Text>
        </div>
        <Form layout="vertical" onFinish={onFinish} size="large">
          <Form.Item name="firstName" label="Ad">
            <Input prefix={<UserOutlined />} placeholder="Adınız" />
          </Form.Item>
          <Form.Item name="lastName" label="Soyad">
            <Input prefix={<UserOutlined />} placeholder="Soyadınız" />
          </Form.Item>
          <Form.Item name="email" label="E‑posta" rules={[{ required: true, message: 'E‑posta girin' }, { type: 'email', message: 'Geçerli e‑posta girin' }]}>
            <Input prefix={<MailOutlined />} placeholder="ornek@eposta.com" />
          </Form.Item>
          <Form.Item name="password" label="Şifre" rules={[{ required: true, message: 'Şifre girin' }, { min: 6, message: 'En az 6 karakter' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Şifreniz" />
          </Form.Item>
          <Form.Item name="password2" label="Şifre (Tekrar)" rules={[{ required: true, message: 'Tekrar şifre girin' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Şifrenizi tekrar girin" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} style={{ width: '100%' }}>Kayıt Ol</Button>
          </Form.Item>
          <div style={{ textAlign: 'center' }}>
            <Link to="/login"><ArrowLeftOutlined /> Zaten hesabım var</Link>
          </div>
        </Form>
      </Card>
    </div>
  )
}

export default Register


