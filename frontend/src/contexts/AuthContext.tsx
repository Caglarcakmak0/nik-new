import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { App } from 'antd'; // Context-aware mesaj API'si için
import { AuthState, AuthContextType, User } from '../types/auth';
import { authService } from '../services/authStore';
import { setTokenExpireCallback, API_BASE_URL } from '../services/api'; // API'den token expire callback'ini import et
const baseURL = API_BASE_URL;

// Context oluştur
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Initial state
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: true
};

// Provider komponenti
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(initialState);
  const { message } = App.useApp();

  // Login fonksiyonu
  const login = async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, loading: true }));

      const response = await authService.login({ email, password });

      // Token, refresh token ve user bilgilerini kaydet
      authService.setAuth(response.token, response.data, response.refreshToken);

      setState({
        isAuthenticated: true,
        user: response.data,
        token: response.token,
        loading: false
      });
    } catch (error) {
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  };

  // Logout fonksiyonu
  const logout = (showMessage: boolean = true) => {
    authService.logout();
    setState({
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false
    });
    
    // Kullanıcıya logout mesajı göster (opsiyonel)
    if (showMessage) {
      message.info('Çıkış yapıldı');
    }
  };

  // Kullanıcı bilgisini (örn. avatar, isim) güncelle ve persist et
  const updateUser = (userData: Partial<User>) => {
    setState(prev => {
      const mergedUser = { ...(prev.user || {}), ...userData } as User;
      try {
        localStorage.setItem('user', JSON.stringify(mergedUser));
      } catch {}
      return { ...prev, user: mergedUser };
    });
  };

  // Token expire durumunda otomatik refresh dene, başarısızsa logout
  const handleTokenExpire = async () => {
    try {
      // Token refresh denemeyi yap
      await refreshTokens();
      
      // Refresh başarılıysa kullanıcıya bilgi ver
      message.info('Oturum otomatik uzatıldı');
    } catch (error) {
      // Refresh token de expire olmuşsa logout yap
      console.error('Token refresh failed:', error);
      message.error('Oturum süreniz doldu. Lütfen tekrar giriş yapın.');
      logout(false);
    }
  };

  // Token refresh fonksiyonu
  const refreshTokens = async () => {
    console.log('🔄 Attempting token refresh...');
    try {
      const response = await authService.refreshTokens();
      
      // Yeni tokenları güncelle
      authService.updateTokens(response.token, response.refreshToken);
      
      // State'i güncelle (user bilgileri aynı kalıyor)
      setState(prev => ({
        ...prev,
        token: response.token
      }));
      
              console.log('Tokens refreshed successfully');
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error; // Error'u yukarı fırlat
    }
  };

  // Sayfa yüklendiğinde auth durumunu kontrol et
  const checkAuth = async () => {
    console.log('🚀 checkAuth function started');
    const token = authService.getToken();
    const user = authService.getUser();
    console.log('📱 Token exists:', !!token);
    console.log('👤 User exists:', !!user);

    if (!token || !user) {
      // Token yoksa direkt logout state
      setState({
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false
      });
      return;
    }

    // JWT decode ile frontend check
    const isExpired = authService.isTokenExpired();
            console.log('JWT token expired (frontend):', isExpired);
    
    if (isExpired) {
              console.log('Token expired by JWT decode, trying refresh first...');
      
      // Expired token için refresh dene
      try {
        await refreshTokens();
        
        // Refresh başarılı - yeni token ile devam et
        const newToken = authService.getToken();
        setState({
          isAuthenticated: true,
          user,
          token: newToken,
          loading: false
        });
        
        message.success('Oturum otomatik uzatıldı');
        return;
        
      } catch (refreshError) {
        // Refresh başarısız - logout yap
        console.log('Refresh failed after JWT expire, logging out');
        message.warning('Oturum süreniz doldu. Lütfen tekrar giriş yapın.');
        authService.logout();
        setState({
          isAuthenticated: false,
          user: null,
          token: null,
          loading: false
        });
        return;
      }
    }

    // Backend validation - gerçek API isteği yap
    console.log('🔍 Checking token with backend API...');
    try {
      // Profile endpoint'i ile token'ı validate et
      await fetch(`${baseURL}/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }).then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      });

      // API isteği başarılı - token geçerli
              console.log('Token valid, user authenticated');
      setState({
        isAuthenticated: true,
        user,
        token,
        loading: false
      });

    } catch (error) {
      console.log('Token validation failed, trying refresh...', error);
      
      // Token geçersiz - refresh token dene
      try {
        await refreshTokens();
        
        // Refresh başarılı
        const newToken = authService.getToken();
        setState({
          isAuthenticated: true,
          user,
          token: newToken,
          loading: false
        });
        
        message.success('Oturum otomatik uzatıldı');
        
      } catch (refreshError) {
        // Refresh de başarısız - logout
        console.error('Refresh failed:', refreshError);
        console.error('Refresh error details:', (refreshError as Error).message);
        message.error('Oturum süreniz doldu. Lütfen tekrar giriş yapın.');
        authService.logout();
        
        setState({
          isAuthenticated: false,
          user: null,
          token: null,
          loading: false
        });
      }
    }
  };

  // Component mount olduğunda auth kontrol et ve token expire callback'ini ayarla
  useEffect(() => {
    checkAuth();
    
    // API servisine token expire callback'ini ver
    // Bu sayede API request'lerde token expire olduğunda otomatik logout olur
    setTokenExpireCallback(handleTokenExpire);
  }, []); // Empty dependency array - sadece component mount olduğunda çalışır

  return (
    <AuthContext.Provider 
      value={{
        ...state,
        login,
        logout,
        checkAuth,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Role-based helper hooks
export const useIsCoach = (): boolean => {
  const { user } = useAuth();
  return user?.role === 'coach';
};

export const useIsStudent = (): boolean => {
  const { user } = useAuth();
  return user?.role === 'student';
};

export const useIsAdmin = (): boolean => {
  const { user } = useAuth();
  return user?.role === 'admin';
};