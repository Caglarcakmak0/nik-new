import { useEffect, useState } from 'react'
import { Card, Typography, Button } from 'antd'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { authService } from '../../services/authStore'

const { Title, Text } = Typography

const VerifyEmail = () => {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending')
  const [message, setMessage] = useState<string>('E‑posta doğrulamanız yapılıyor...')
  const navigate = useNavigate()

  useEffect(() => {
    const uid = searchParams.get('uid') || ''
    const token = searchParams.get('token') || ''
    if (!uid || !token) {
      setStatus('error')
      setMessage('Geçersiz bağlantı')
      return
    }
    (async () => {
      try {
        await authService.verifyEmail({ uid, token })
        setStatus('success')
        setMessage('E‑posta adresiniz başarıyla doğrulandı.')
      } catch (e: any) {
        setStatus('error')
        setMessage(e?.message || 'Doğrulama başarısız')
      }
    })()
  }, [searchParams])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
      <Card style={{ width: 420, padding: 20, textAlign: 'center' }}>
        <Title level={3}>E‑posta Doğrulama</Title>
        <Text type={status === 'error' ? 'danger' : 'success'}>{message}</Text>
        <div style={{ marginTop: 16 }}>
          <Button type="primary" onClick={() => navigate('/login')}>Girişe Dön</Button>
        </div>
      </Card>
    </div>
  )
}

export default VerifyEmail


