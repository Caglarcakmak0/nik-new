# 🎓 YKS Öğrenci Takip Portali

Modern ve kullanıcı dostu YKS (Yükseköğretime Geçiş Sınavı) hazırlık süreci takip platformu. Öğrencilerin hedef üniversitelerini yönetmelerine, çalışma istatistiklerini takip etmelerine ve ilerleme kaydetmelerine yardımcı olur.

## 🚀 Özellikler

### ✨ Ana Özellikler
- **📊 Dashboard** - Kişiselleştirilmiş istatistikler ve hedef takibi
- **🎯 Hedef Yönetimi** - Üniversite ve bölüm hedefleri ekleme/düzenleme
- **👤 Profil Yönetimi** - Kişisel bilgiler ve eğitim durumu
- **🌙 Dark Mode** - Göz yorgunluğunu azaltan karanlık tema
- **📱 Responsive** - Tüm cihazlarda mükemmel görünüm

### 🎨 UI/UX Özellikleri
- Modern slider tasarımı ile hedef üniversite kartları
- Ant Design component library kullanımı
- Smooth animations ve hover effects
- Intuitive navigation ve breadcrumb system

### 📸 Görsel Yönetimi
- Üniversite logoları/görselleri yükleme
- Image preview ve crop işlemleri
- Otomatik image optimization

## 🛠️ Teknoloji Stack

### Frontend
- **⚡ Vite + React 18** - Modern build tool ve UI library
- **📘 TypeScript** - Type-safe development
- **🎨 Ant Design** - Professional UI components
- **🎭 SCSS** - Advanced styling capabilities
- **🌐 React Router** - Client-side routing

### Backend
- **🚀 Node.js + Express** - RESTful API server
- **📊 MongoDB + Mongoose** - NoSQL database
- **🔐 JWT Authentication** - Secure user sessions
- **📦 Multer** - File upload handling
- **🔒 bcrypt** - Password encryption

## 📁 Klasör Yapısı

```
src/
├── components/          # React bileşenleri
│   ├── ui/             # Temel UI bileşenleri (Button, Input, Card)
│   ├── feature/        # Özellik bileşenleri (ActiveGoals, QuickActions)
│   ├── layout/         # Layout bileşenleri (AppLayout, Sidebar, Header)
│   └── Dashboard.tsx   # Ana dashboard komponenti
│
├── views/              # Sayfa komponenti
│   ├── DashboardPage/  # Ana dashboard sayfası
│   ├── GoalsPage/      # Hedef yönetimi sayfası
│   ├── ProfilePage/    # Profil yönetimi sayfası
│   └── LoginPage/      # Giriş sayfası
│
├── contexts/           # React Context providers
│   ├── AuthContext.tsx # Kimlik doğrulama state
│   └── ThemeContext.tsx# Tema yönetimi (light/dark)
│
├── services/           # API çağrıları ve dış servisler
│   ├── api.ts         # Ana API client
│   ├── authStore.ts   # Auth state management
│   └── rememberMe.ts  # Kullanıcı oturumu hatırlama
│
├── types/              # TypeScript type definitions
│   └── auth.ts        # Authentication types
│
├── hooks/              # Custom React hooks
├── utils/              # Helper functions
├── config/            # Configuration files
└── styles/            # SCSS stil dosyaları
```

### Backend Yapısı
```
backend/
├── models/            # MongoDB Mongoose şemaları
│   ├── Users.js      # Kullanıcı modeli
│   ├── StudySession.js # Çalışma oturumu modeli
│   └── StudyGoal.js  # Çalışma hedefi modeli
│
├── routes/            # Express route handlers
│   ├── users.js      # Kullanıcı API endpoints
│   ├── analytics.js  # Dashboard istatistikleri
│   ├── image.js      # Görsel yükleme endpoints
│   └── upload.js     # Dosya yükleme endpoints
│
├── uploads/           # Yüklenen dosyalar
│   └── universities/ # Üniversite görselleri
│
├── auth.js           # JWT middleware
└── server.js         # Ana sunucu dosyası
```

## 🏃‍♂️ Kurulum ve Çalıştırma

### Gereksinimler
- Node.js 18+
- MongoDB
- npm veya yarn

### Backend Kurulum
```bash
cd backend
npm install
npm start  # Port 8000'de çalışır
```

### Frontend Kurulum
```bash
npm install
npm run dev  # Port 3000'de çalışır
```

### Environment Variables
Backend için `.env` dosyası oluşturun:
```env
MONGO_URL=mongodb://localhost:27017/yks-portal
JWT_SECRET=your-secret-key
PORT=8000
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - Kullanıcı girişi
- `POST /api/auth/register` - Kullanıcı kaydı
- `POST /api/auth/refresh` - Token yenileme

### Users
- `GET /api/users/profile` - Kullanıcı profili getir
- `PUT /api/users/:id` - Kullanıcı bilgilerini güncelle

### Analytics
- `GET /api/analytics/dashboard` - Dashboard istatistikleri
- `GET /api/analytics/detailed` - Detaylı analiz verileri
- `GET /api/analytics/goals-progress` - Hedef ilerleme takibi

### File Upload
- `POST /api/image/university-upload` - Üniversite görseli yükle
- `GET /api/image/:filename` - Görsel dosyası getir

## 🎯 Gelecek Özellikler

- [ ] 📅 Çalışma takvimi ve planlayıcı
- [ ] 📈 Detaylı performans grafikleri
- [ ] 🏆 Başarı rozetleri sistemi
- [ ] 👥 Arkadaş sistemi ve liderlik tablosu
- [ ] 📚 Çalışma materyali paylaşımı
- [ ] 🔔 Push notification desteği
- [ ] 📱 Mobile app geliştirmesi

## 🤝 Katkıda Bulunma

1. Fork this repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 📞 İletişim

Proje hakkında sorularınız için:
- 📧 Email: [your-email@example.com](mailto:your-email@example.com)
- 💼 LinkedIn: [your-profile](https://linkedin.com/in/your-profile)

---

⭐ **Bu projeyi beğendiyseniz yıldız vermeyi unutmayın!**