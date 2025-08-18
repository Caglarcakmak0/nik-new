import { apiRequest } from './api';

interface LoginData {
  email: string;
  password: string;
}

interface LoginResponse {
  message: string;
  data: any;
  token: string; // Access token (1 saat)
  refreshToken: string; // Refresh token (7 gün)
}

interface RefreshResponse {
  message: string;
  token: string; // Yeni access token
  refreshToken: string; // Yeni refresh token
}

export const authService = {
  login: async (loginData: LoginData): Promise<LoginResponse> => {
    return apiRequest('/users/login', {
      method: 'POST',
      body: JSON.stringify(loginData),
    });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken'); // Refresh token'ı da sil
    localStorage.removeItem('user');
  },

  getToken: () => localStorage.getItem('token'),
  
  getRefreshToken: () => localStorage.getItem('refreshToken'),

  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // JWT token'ının expire olup olmadığını kontrol et
  isTokenExpired: () => {
    const token = localStorage.getItem('token');
    if (!token) return true;

    try {
      // JWT token'ı decode et (base64)
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      // Expire time'ı kontrol et (saniye cinsinden)
      const currentTime = Date.now() / 1000;
      
      // Token expire olmuşsa true döndür
      return payload.exp < currentTime;
    } catch (error) {
      // Token decode edilemiyorsa expire kabul et
      console.error('Token decode error:', error);
      return true;
    }
  },

  setAuth: (token: string, user: any, refreshToken?: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    // Refresh token varsa kaydet
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
  },

  // Token refresh fonksiyonu
  refreshTokens: async (): Promise<RefreshResponse> => {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      throw new Error('Refresh token bulunamadı');
    }

    return apiRequest('/users/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },

  // Access token'ı yenile ve güncelle
  updateTokens: (newToken: string, newRefreshToken: string) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('refreshToken', newRefreshToken);
  }
};