/**
 * Remember Me servis - Login bilgilerini güvenli şekilde hatırlamak için
 * 
 * Güvenlik notları:
 * - Şifreleri plaintext olarak saklamıyoruz
 * - Sadece email ve remember durumunu saklıyoruz
 * - localStorage kullanıyoruz (session değil, kalıcı olması için)
 */

// Remember me için veri tipi
export interface RememberMeData {
  email: string;
  rememberMe: boolean;
  lastLogin?: string; // Son login tarihi (opsiyonel)
}

// LocalStorage key'i
const REMEMBER_ME_KEY = 'portal_remember_me';

export const rememberMeService = {
  /**
   * Remember me bilgilerini kaydet
   * @param email - Kullanıcının email adresi
   * @param rememberMe - Remember me checkbox durumu
   */
  setRememberMe: (email: string, rememberMe: boolean) => {
    if (rememberMe) {
      // Remember me aktifse email'i kaydet
      const data: RememberMeData = {
        email: email.toLowerCase().trim(), // Email'i normalize et
        rememberMe: true,
        lastLogin: new Date().toISOString() // Son login tarihini kaydet
      };
      
      localStorage.setItem(REMEMBER_ME_KEY, JSON.stringify(data));
    } else {
      // Remember me kapalıysa kayıtlı veriyi sil
      localStorage.removeItem(REMEMBER_ME_KEY);
    }
  },

  /**
   * Kayıtlı remember me bilgilerini al
   * @returns RememberMeData | null
   */
  getRememberMe: (): RememberMeData | null => {
    try {
      const data = localStorage.getItem(REMEMBER_ME_KEY);
      
      if (!data) return null;
      
      const parsed: RememberMeData = JSON.parse(data);
      
      // Veri geçerliliği kontrolü
      if (!parsed.email || typeof parsed.rememberMe !== 'boolean') {
        // Bozuk veri varsa sil
        localStorage.removeItem(REMEMBER_ME_KEY);
        return null;
      }

      return parsed;
    } catch (error) {
      // JSON parse hatası varsa veriyi temizle
      console.error('Remember me data parse error:', error);
      localStorage.removeItem(REMEMBER_ME_KEY);
      return null;
    }
  },

  /**
   * Remember me bilgilerini temizle
   */
  clearRememberMe: () => {
    localStorage.removeItem(REMEMBER_ME_KEY);
  },

  /**
   * Belirtilen email için remember me var mı kontrol et
   * @param email - Kontrol edilecek email
   * @returns boolean
   */
  isEmailRemembered: (email: string): boolean => {
    const data = rememberMeService.getRememberMe();
    return data ? data.email === email.toLowerCase().trim() : false;
  },

  /**
   * Remember me verilerinin ne kadar eski olduğunu kontrol et
   * @returns number - Gün sayısı, veri yoksa -1
   */
  getDaysSinceLastLogin: (): number => {
    const data = rememberMeService.getRememberMe();
    
    if (!data || !data.lastLogin) return -1;

    const lastLogin = new Date(data.lastLogin);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastLogin.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  },

  /**
   * Eski remember me verilerini temizle (30 günden eski)
   * Güvenlik için çok eski remember me verilerini otomatik sil
   */
  cleanupOldRememberMe: () => {
    const days = rememberMeService.getDaysSinceLastLogin();
    
    // 30 günden eski remember me verilerini sil
    if (days > 30) {
      console.log('Cleaning up old remember me data:', days, 'days old');
      rememberMeService.clearRememberMe();
      return true;
    }
    
    return false;
  }
};