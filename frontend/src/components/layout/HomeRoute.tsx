import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Spin } from 'antd'

/**
 * HomeRoute komponenti - Ana sayfa (/) için akıllı yönlendirme
 * 
 * Kullanıcı durumuna göre otomatik yönlendirme yapar:
 * - Login olmuşsa: Dashboard'a yönlendir
 * - Login olmamışsa: Login sayfasına yönlendir
 * - Auth kontrol ediliyor: Loading göster
 */
const HomeRoute = () => {
  const { isAuthenticated, loading, user } = useAuth()

  // Auth durumu kontrol ediliyor - loading göster
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f0f2f5'
      }}>
        {/* Yükleniyor spinner'ı */}
        <Spin size="large" />
      </div>
    )
  }

  // Kullanıcı login olmuşsa rolüne göre yönlendir
  if (isAuthenticated) {
    // role'u state'den, yoksa localStorage'dan al (yarış durumlarını önlemek için)
    let role = user?.role as 'admin' | 'coach' | 'student' | undefined;
    if (!role) {
      try {
        const raw = localStorage.getItem('user');
        if (raw) {
          const parsed = JSON.parse(raw);
          role = parsed?.role;
        }
      } catch {}
    }

    if (role === 'coach') {
      return <Navigate to="/coach-dashboard" replace />
    }
    if (role === 'admin') {
      return <Navigate to="/admin-dashboard" replace />
    }
    // Student için mevcut dashboard
    return <Navigate to="/dashboard" replace />
  }

  // Kullanıcı login olmamışsa login sayfasına yönlendir
  return <Navigate to="/login" replace />
}

export default HomeRoute