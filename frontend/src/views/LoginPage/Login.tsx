
import { useState, useEffect } from 'react' // useEffect hook'unu ekle
import { Form, Input, Button, Card, Typography, message, Spin, Checkbox } from 'antd' // Checkbox ekle
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { rememberMeService } from '../../services/rememberMe' // Remember Me servisini import et
import { getCurrentMotivation, type Motivation as MotivationType } from '../../services/api'
import logoNik from '../../assets/logoNik.png'
import backgroundImage from '../../assets/ekran.jpeg'

const { Title, Text } = Typography

interface LoginFormData {
  email: string
  password: string
  rememberMe?: boolean // Remember Me checkbox için optional field
}

const Login = () => {
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm() // Ant Design form instance'ı - programmatic form kontrolü için
  const navigate = useNavigate()
  const { login, isAuthenticated, loading: authLoading } = useAuth() // Context'ten gerekli değerleri al
  const [motivation, setMotivation] = useState<MotivationType | null>(null)

  // Component mount olduğunda çalışır - kullanıcı zaten login mi kontrol et ve remember me verilerini yükle
  useEffect(() => {
    // Eğer auth loading tamamlandıysa ve kullanıcı login olmuşsa
    if (!authLoading && isAuthenticated) {
      // Rol bazlı yönlendirme için HomeRoute'a gönder
      navigate('/', { replace: true }) // replace: true -> geri butonu ile login sayfasına dönmesin
    }

    // Remember Me verilerini kontrol et ve formu doldur
    if (!authLoading) {
      loadRememberedCredentials();
    }
  }, [authLoading, isAuthenticated, navigate]) // Bu değerler değiştiğinde useEffect tekrar çalışır

  // Remember Me verilerini yükle ve formu doldur
  const loadRememberedCredentials = () => {
    // Eski remember me verilerini temizle (30+ gün)
    rememberMeService.cleanupOldRememberMe();

    // Kayıtlı remember me verilerini al
    const rememberedData = rememberMeService.getRememberMe();
    
    if (rememberedData && rememberedData.email) {
      // Form alanlarını remembered verilerle doldur
      form.setFieldsValue({
        email: rememberedData.email,
        rememberMe: rememberedData.rememberMe
      });
      
      console.log('Remembered email loaded:', rememberedData.email);
    }
  };

  // Haftalık motivasyon sözünü getir
  useEffect(() => {
    (async () => {
      try {
        const res = await getCurrentMotivation()
        setMotivation(res?.data || null)
      } catch (_) {
        // no-op
      }
    })()
  }, [])

  const onFinish = async (values: LoginFormData) => {
    setLoading(true)

    try {
      // Login işlemini gerçekleştir
      await login(values.email, values.password) // Context login'i kullan
      
      // Login başarılı olduğunda remember me durumunu kaydet
      rememberMeService.setRememberMe(values.email, !!values.rememberMe);
      
      message.success('Giriş başarılı!')
      // Rol bazlı yönlendirme: HomeRoute üzerinden
      navigate('/')
    } catch (error) {
      message.error((error as Error).message || 'Giriş yapılırken bir hata oluştu')
      console.error('Login error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Eğer auth kontrolü devam ediyorsa loading göster
  if (authLoading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f0f2f5'
      }}>
        {/* Merkezi loading spinner */}
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundImage: `url(${backgroundImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      fontFamily: "'Playfair Display', serif"
    }}>
      <Card style={{ 
        width: 400, 
        padding: '20px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ marginBottom: '20px' }}>
            <img src={logoNik} alt="NİK Logo" style={{ width: '190px', height: '150px', marginBottom: '10px' }} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <span style={{ color: '#ff8c00', fontSize: '32px', fontWeight: 'bold', fontFamily: "'Playfair Display', serif" }}>NİK YKS</span>
            <span style={{ color: '#000000', fontSize: '32px', fontWeight: 'bold', marginLeft: '8px', fontFamily: "'Playfair Display', serif" }}>PORTAL</span>
          </div>
          <Text type="secondary" style={{ fontFamily: "'Playfair Display', serif" }}>Hesabınıza giriş yapın</Text>
          {motivation?.text && (
            <div style={{ marginTop: 12, padding: '12px', background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0', textAlign: 'left' }}>
              <Text italic>"{motivation.text}"</Text>
              {motivation.author && (
                <div style={{ marginTop: 6 }}>
                  <Text type="secondary">— {motivation.author}</Text>
                </div>
              )}
            </div>
          )}
        </div>
        
        <Form
          form={form} // Form instance'ını bağla (programmatic control için)
          name="login"
          onFinish={onFinish}
          layout="vertical"
          size="large"
          // Initial values - form ilk yüklendiğinde default değerler
          initialValues={{
            rememberMe: false // Remember me checkbox default olarak kapalı
          }}
        >
          <Form.Item
            name="email"
            label="E-posta"
            rules={[
              { required: true, message: 'E-posta adresinizi girin!' },
              { type: 'email', message: 'Geçerli bir e-posta adresi girin!' }
            ]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="E-posta adresiniz"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Şifre"
            rules={[{ required: true, message: 'Şifrenizi girin!' }]}
          >
            <Input.Password 
              prefix={<LockOutlined />}
              placeholder="Şifreniz"
            />
          </Form.Item>

          {/* Remember Me Checkbox - şifre alanından sonra, button'dan önce */}
          <Form.Item 
            name="rememberMe" 
            valuePropName="checked" // Checkbox için checked prop'unu kullan
            style={{ marginBottom: '16px' }}
          >
            <Checkbox>
              Beni hatırla
              <Text 
                type="secondary" 
                style={{ fontSize: '12px', marginLeft: '8px' }}
              >
                (Bir sonraki gelişinizde email otomatik doldurulur)
              </Text>
            </Checkbox>
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              style={{ width: '100%' }}
            >
              Giriş Yap
            </Button>
          </Form.Item>
        </Form>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Link to="/forgot-password">Şifremi Unuttum</Link>
          <Link to="/register">Kayıt Ol</Link>
        </div>
      </Card>
    </div>
  )
}

export default Login