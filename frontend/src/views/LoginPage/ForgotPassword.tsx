import { useState } from 'react'
import { Card, Form, Input, Button, Typography, message } from 'antd'
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import { authService } from '../../services/authStore'

const { Title, Text } = Typography

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const navigate = useNavigate()

  const onFinish = async (values: { email: string }) => {
    setLoading(true)
    try {
      await authService.requestPasswordReset(values.email)
      setSent(true)
      message.success('Eğer kayıtlı bir e‑posta ise, sıfırlama bağlantısı gönderildi.')
    } catch (e: any) {
      // Uniform response; yine de kullanıcıya genel mesaj
      setSent(true)
      message.info('Eğer kayıtlı bir e‑posta ise, sıfırlama bağlantısı gönderildi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
      <Card style={{ width: 420, padding: 20 }}>
        <div style={{ marginBottom: 24 }}>
          <Title level={3}>Şifremi Unuttum</Title>
          <Text type="secondary">E‑posta adresinizi girin, size bir sıfırlama bağlantısı gönderelim.</Text>
        </div>

        {sent ? (
          <div>
            <Text>
              Eğer girdiğiniz e‑posta sistemimizde kayıtlıysa, şifre sıfırlama bağlantısı gönderildi. Gelen kutunuzu ve spam klasörünüzü kontrol edin.
            </Text>
            <div style={{ marginTop: 16 }}>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/login')}>Girişe Dön</Button>
            </div>
          </div>
        ) : (
          <Form layout="vertical" onFinish={onFinish} size="large">
            <Form.Item name="email" label="E‑posta" rules={[{ required: true, message: 'E‑posta girin' }, { type: 'email', message: 'Geçerli e‑posta girin' }]}>
              <Input prefix={<MailOutlined />} placeholder="ornek@eposta.com" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} style={{ width: '100%' }}>Bağlantı Gönder</Button>
            </Form.Item>
            <div style={{ textAlign: 'center' }}>
              <Link to="/login">Geri dön</Link>
            </div>
          </Form>
        )}
      </Card>
    </div>
  )
}

export default ForgotPassword


