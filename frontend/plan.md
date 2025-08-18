
⏺ Detaylı Koç-Öğrenci Yönetim Sistemi Planı

Durum Özeti

Yapılmayanlar (Öncelik)
- [ ] Admin API'leri (istatistikler): GET /api/admin/statistics/coaches, GET /api/admin/statistics/feedback-summary
- [ ] Frontend - Öğrenci Paneli: /student/coach -> ActivePrograms.tsx, ProgramDetail.tsx
- [ ] Frontend - Admin Paneli: CoachesList.tsx, CoachDetail.tsx, AssignmentManager.tsx, Statistics.tsx ve ilgili rotalar
- [ ] Frontend - Koç Paneli: StudentsList.tsx, CreateProgram.tsx, StudentDetail.tsx
- [ ] Rate limiting (login ve API istek limitleri)
- [ ] Test senaryoları (Güvenlik, İşlevsellik, Edge, Performance, E2E, UI/UX)
- [ ] Notification sistemi (ileride)
- [ ] Component hiyerarşisi izolasyonunun tamamlanması (role-specific klasör/komponentler)


YENİ PLAN (Önceliklendirilmiş Yol Haritası)

Sprint 1: Güvenlik Temeli (yüksek öncelik)
- [ ] CORS whitelist ve domain bazlı `credentials: true` desteği (prod’da sadece izinli origin’ler)
- [ ] `helmet` kurulumu (HSTS, frameguard, noSniff, referrerPolicy, xssFilter muadili)
- [ ] `express-rate-limit`: `/users/login` 5/dk, genel API 100/dk, upload 10/saat
- [ ] `express.json` limitini 50MB → 2MB; büyük içerikler için yalnızca upload endpoint’leri
- [ ] Mongoose `strictQuery` aktif ve global hata yakalayıcı middleware
- [ ] İstek doğrulama: `zod`/`joi` ile tüm POST/PUT gövde şemaları

Sprint 2: Kimlik Doğrulama ve Oturum Yönetimi
- [ ] Refresh token’ı HttpOnly + Secure + SameSite cookie’ye taşı (client’ta saklama yok)
- [ ] Access token 1 saat; bellekte/Authorization header’da kullan
- [ ] `/users/logout`: refresh token invalidasyonu (DB temizleme + version artırma)
- [ ] Şifre sıfırlama ve e-posta doğrulama akışları (request-reset, reset, verify-email)
- [ ] Frontend `AuthContext`: hardcoded URL kaldır; `api.ts` tabanını kullan; otomatik refresh hook’u; refresh localStorage’dan çıkar

Sprint 3: API Tasarımı ve Tutarlılık
- [ ] Sayfalama/filtreleme: `GET /study-sessions`, `GET /daily-plans` (page, limit, from, to, status)
- [ ] N+1 giderimi: `leaderboard` için aggregate ile achievements toplama
- [ ] Tutarlı hata formatı `{ message, errors? }` ve i18n mesaj standardı
- [ ] OpenAPI kapsamını tüm rotalara genişlet ve örnek şemalar ekle

Sprint 4: Frontend İyileştirmeleri
- [ ] Servis yanıt tipleri (DTO) ve `any`’lerin kaldırılması
- [ ] Merkezî hata bildirim standardı (App message), boş/skeleton durumları
- [ ] `ProtectedRoute` yetkisiz erişimde anlaşılır redirect mesajı
- [ ] Büyük listelerde performans (gerekirse sanal listeleme)

Sprint 5: Gözlemlenebilirlik
- [ ] `morgan` + `pino/winston` ile yapılandırılmış log ve requestId takibi
- [ ] `/health` ve `/ready` uçları (DB bağlantı kontrolü dahil)
- [ ] Ortam değişkenleri doğrulaması (`envalid`/`zod`)

Sprint 6: Performans
- [ ] `compression` middleware, uygun `ETag`/`Cache-Control`
- [ ] İndeks gözden geçirme; `leaderboard` aggregate optimizasyonu
- [ ] CoachPerformance işinde tek-instance guard ve graceful shutdown

Sprint 7: Test ve CI/CD
- [ ] Backend: Jest + Supertest; Frontend: React Testing Library; E2E: Playwright/Cypress
- [ ] GitHub Actions: lint/test/build; minimum coverage eşikleri
- [ ] ESLint + Prettier + Husky + lint-staged

Sprint 8: DevOps
- [ ] `Dockerfile` + `docker-compose` (backend, mongo, frontend, nginx)
- [ ] Nginx reverse proxy ve TLS sonlandırma
- [ ] Secrets management ve staging ortam

Sprint 9: Upload Güvenliği
- [ ] Dosya imza (magic number) kontrolü (`file-type`/`sharp`) ve uzantı whitelist
- [ ] `image.js` ve `upload.js` konsolidasyonu; gereksiz CORS/statik servis kaldırma
- [ ] Eski avatarların güvenli temizliği ve path doğrulama

Sprint 10: Küçük İyileştirmeler
- [ ] ObjectId karşılaştırmaları (`includes` yerine `String(id)` eşitleme)
- [ ] Kullanılmayan import’ların temizliği
- [ ] Mesaj dilinin TR standardizasyonu

Kabul Kriterleri (DoD)
- [ ] Tüm kritik rotalarda rate limit aktif ve loglanıyor
- [ ] Prod CORS yapılandırması whitelist’li ve güvenli
- [ ] Refresh cookie ve `/users/logout` iptali çalışıyor; XSS durumunda refresh ele geçirilemiyor
- [ ] OpenAPI dokümantasyonu tüm rotalar için mevcut ve örneklerle %80+ kapsam
- [ ] `/health` ve `/ready` OK ve DB’yi doğruluyor
- [ ] CI pipeline yeşil; backend ≥60% ve frontend ≥40% coverage (başlangıç hedefi)
- [ ] `docker-compose up` ile lokal geliştirme ortamı çalışır hale geliyor

  1. Database Schema Tasarımı

  A) CoachStudent Model (Koç-Öğrenci İlişkisi) - MVP

  const coachStudentSchema = {
    coachId: { type: ObjectId, ref: 'Users', required: true },
    studentId: { type: ObjectId, ref: 'Users', required: true },
    assignedAt: { type: Date, default: Date.now },
    assignedBy: { type: ObjectId, ref: 'Users' }, // Admin who assigned
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    notes: String // Admin notları
  }

  B) CoachFeedback Model (Gizli Değerlendirmeler)

  const coachFeedbackSchema = {
    coachId: { type: ObjectId, ref: 'Users', required: true },
    studentId: { type: ObjectId, ref: 'Users', required: true },

    // Değerlendirme detayları (MVP - 3 kategori)   
    categories: {
      communication: {
        type: Number,
        min: 1,
        max: 5,
        required: true
      },
      programQuality: { type: Number, min: 1, max: 5, required: true },
      overallSatisfaction: { type: Number, min: 1, max: 5, required: true }
    },

    overallRating: Number, // Otomatik hesaplanacak
    feedback: { type: String, required: true },

    // Özel sorular
    specificIssues: {
      tooMuchPressure: Boolean,
      notEnoughSupport: Boolean,
      communicationProblems: Boolean,
      programNotSuitable: Boolean,
      other: String
    },

    // Admin yönetimi (Minimal)
    status: {
      type: String,
      enum: ['new', 'read'], // Sadece okundu/okunmadı
      default: 'new'
    },
    readBy: { type: ObjectId, ref: 'Users' }, // Kim okudu
    readAt: Date, // Ne zaman okundu

    createdAt: { type: Date, default: Date.now }
  }

  C) StudyProgram Model (Çalışma Programları) - MVP

  const studyProgramSchema = {
    coachId: { type: ObjectId, ref: 'Users', required: true },
    studentId: { type: ObjectId, ref: 'Users', required: true },
    title: String,
    description: String,

    // Zaman bilgileri
    startDate: Date,
    endDate: Date,
    
    // Günlük planların ID'leri (DailyPlan collection'a referans)
    dailyPlanIds: [{ type: ObjectId, ref: 'DailyPlan' }],

    // Takip
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active'
    },

    createdAt: Date,
    updatedAt: Date
  }

  D) CoachPerformance Model (Koç Performans Özeti)

  const coachPerformanceSchema = {
    coachId: { type: ObjectId, ref: 'Users', required: true },

    // Öğrenci sayıları
    studentStats: {
      total: Number,
      active: Number,
      inactive: Number
    },


    // Gizli feedback özeti (sadece admin görür) - MVP
    feedbackStats: {
      totalFeedbacks: Number,
      averageRating: Number,
      categoryAverages: {
        communication: Number,
        programQuality: Number,
        overallSatisfaction: Number
      },
      issuesCounts: {
        tooMuchPressure: Number,
        notEnoughSupport: Number,
        communicationProblems: Number,
        programNotSuitable: Number
      },
      lastFeedbackDate: Date
    },

    lastUpdated: Date
  }

  2. API Endpoints Detaylı Planı

  Öğrenci API'leri

  // Koçumu görüntüle
  GET /api/student/my-coach
  Response: {
    coach: {
      id, name, email, bio, expertise,
      assignedAt, totalPrograms
    }
  }

  // Aktif programlarım
  GET /api/student/programs
  GET /api/student/programs/:id

  // Koç değerlendirme (GİZLİ)
  POST /api/student/feedback/coach
  Body: {
    categories: { ... },
    feedback: "...",
    specificIssues: { ... }
  }

  Koç API'leri

  // Öğrenci listesi
  GET /api/coach/students
  Query: ?status=active&page=1&limit=10

  // Öğrenci detayı
  GET /api/coach/students/:studentId
  Response: {
    student: { ... },
    programs: [ ... ],
    stats: { ... }
    // Feedback YOK!
  }

  // Program yönetimi
  GET /api/coach/programs
  POST /api/coach/programs
  PUT /api/coach/programs/:id
  DELETE /api/coach/programs/:id

   Not: Koç, öğrenciye gönderildikten sonra da programı güncelleyebilir (PUT). Yetki yalnızca programın koçunda (coachId eşleşmeli) veya admin'de olmalıdır. Güncelleme sonrası DailyPlan senkronizasyonu ve öğrenciye bilgilendirme (ileride) planlanacaktır.


  Admin API'leri

  // Koç yönetimi
  GET /api/admin/coaches
  GET /api/admin/coaches/:id/performance
  GET /api/admin/coaches/:id/students

  // Öğrenci atamaları
  POST /api/admin/assign-coach
  Body: { coachId, studentIds: [...] }

  PUT /api/admin/reassign-student
  Body: { studentId, fromCoachId, toCoachId, reason }

  // GİZLİ feedback yönetimi
  GET /api/admin/feedbacks
  Query: ?status=new

  GET /api/admin/feedbacks/:id
  PUT /api/admin/feedbacks/:id/read
  // Otomatik olarak status: 'read', readBy ve readAt set edilir

  // Toplu istatistikler
  GET /api/admin/statistics/coaches
  GET /api/admin/statistics/feedback-summary


  3. Frontend Sayfaları ve Componentler

  Öğrenci Paneli

  /student/coach
    - CoachProfile.tsx
    - ActivePrograms.tsx
    - ProgramDetail.tsx
    - SecretFeedbackForm.tsx

  Components:
    - ProgramCard
    - DailyPlanList
    - FeedbackModal (gizli)

  Koç Paneli

  /coach/dashboard
    - StudentsList.tsx
    - ProgramManager.tsx
    - CreateProgram.tsx
    - StudentDetail.tsx

  ProgramManager Notu:
    - Mevcut programı düzenleme (öğrenciye gönderildikten sonra da). Öğrenci tarafında plan ekranı otomatik güncellenir.

  Components:
    - StudentCard
    - ProgramBuilder
    - DailyPlanForm

  Admin Paneli

  /admin/coaches
    - CoachesList.tsx
    - CoachDetail.tsx
    - FeedbackManager.tsx
    - AssignmentManager.tsx
    - Statistics.tsx

  /admin/feedback
    - FeedbackList.tsx (Koç feedback listesi)
    - FeedbackDetail.tsx (Feedback detayları - kimin yazdığı görünür)
    
  /admin/coach-management
    - CoachStudentAssignment.tsx (Koç-öğrenci eşleştirme)

  Components:
    - CoachPerformanceCard
    - FeedbackAlert
    - AssignmentModal
    - SimpleStatsList

  4. Güvenlik ve Middleware

  // Role-based access
  const checkRole = (allowedRoles) => {
    return (req, res, next) => {
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Yetkisiz erişim" });
      }
      next();
};
  };

  // Koç feedback erişim engelleme
  const blockCoachFromFeedback = (req, res, next) => {
    if (req.user.role === 'coach' && req.path.includes('feedback')) {
      return res.status(403).json({ message: "Bu alana erişiminiz yok" });
    }
    next();
  };

  // Öğrenci sadece kendi koçunu değerlendirebilir
  const validateOwnCoach = async (req, res, next) => {
    const relation = await CoachStudent.findOne({
      studentId: req.user.userId,
      coachId: req.body.coachId,
      status: 'active'
    });

    if (!relation) {
      return res.status(400).json({ message: "Bu koç size atanmamış" });
    }
    next();
  };

  5. Notification Sistemi (İLERİDE EKLENEBİLİR)

  // Şimdilik notification sistemi yok, basit tutuyoruz
  // Admin feedback'leri dashboard'dan takip edecek
  // Öğrenciler programları kendi panellerinden görecek

  6. Implementation Sırası

  1. Backend Models (1-2 gün)
    - CoachStudent model
    - CoachFeedback model
    - StudyProgram model
    - CoachPerformance model
  2. API Routes (2-3 gün)
    - Authentication middleware'leri
    - Student endpoints
    - Coach endpoints
    - Admin endpoints
  3. Frontend - Öğrenci (2 gün)
    - Koç profil görüntüleme
    - Program görüntüleme
    - Gizli feedback formu
  4. Frontend - Koç (2-3 gün)
    - Öğrenci yönetimi
    - Program oluşturma
    - Dashboard
  5. Frontend - Admin (3 gün)
    - Koç yönetimi
    - Feedback görüntüleme
    - İstatistikler
    - Atama yönetimi
  6. Test & Polish (2 gün)
    - End-to-end testler
    - UI/UX iyileştirmeler
    - Performance optimizasyonu

  7. Portal Temizliği (ÖNCELİKLİ - 1 gün)

  A) Koç Portal Temizliği:
    - CoachDashboard.tsx'ten öğrenci özellikleri kaldırılacak:
      * TrophyOutlined, CheckCircleOutlined, FireOutlined import'ları
      * Öğrenci tamamlanma oranı (completionRate)
      * Öğrenci motivasyon skoru
      * Achievement/gamification referansları
    - Menüden kaldırılacaklar:
      * /education - Eğitim Bilgileri
      * /goals - Hedeflerim  
      * /study-tracker - Çalışma Tracker
      * /study-plan - (öğrenci versiyon)

  B) Admin Portal Temizliği:
    - Admin menüsünden TÜM öğrenci özellikleri kaldırılacak:
      * /study-tracker - Çalışma Tracker
      * /study-plan - Çalışma Programı
      * /goals - Hedeflerim
      * /education - Eğitim Bilgileri
    - routeMenu.tsx'te admin menüsünden studentMenuItems kaldırılacak

  C) Yeni Menü Yapıları:

  Öğrenci Menüsü:
    - Dashboard
    - Profil
    - Eğitim Bilgileri  
    - Hedeflerim
    - Çalışma Tracker
    - Çalışma Programı

  Koç Menüsü:
    - Dashboard (Koç)
    - Öğrenci Yönetimi
    - Program Yönetimi
    - Raporlar
    - Profil (sadece kendi profili)

  Admin Menüsü:
    - Dashboard (Admin)
    - Kullanıcı Yönetimi
    - Koç Yönetimi
    - Sistem İstatistikleri
    - Gizli Feedback'ler
    - Sistem Ayarları

  D) Temizlik Detayları:
    - Her rol sadece kendi işlemleriyle ilgili özelliklere erişebilmeli
    - Öğrenci özellikleri SADECE öğrenci panelinde olmalı
    - Koç sadece öğrenci yönetimi ve program oluşturma yapabilmeli
    - Admin sadece sistem yönetimi ve kullanıcı yönetimi yapabilmeli

  8. Frontend Component Hiyerarşisi

  A) Shared Components (Tüm roller kullanabilir):
    - components/ui/
      - Button, Card, Modal, Input, Select
      - Table, List, Form
      - Alert, Notification, Loading
    - components/layout/
      - Header, Sidebar, Footer
      - PageLayout, ContentWrapper

  B) Role-Specific Components:
    
    Student Components:
    - components/student/
      - StudyTimer/
      - GoalCard/
      - UniversitySelector/
      - ProgramView/
      - FeedbackForm/
    
    Coach Components:
    - components/coach/
      - StudentList/
      - ProgramBuilder/
      - StudentCard/
      - DailyPlanManager/
    
    Admin Components:
    - components/admin/
      - UserTable/
      - CoachCard/
      - FeedbackCard/
      - AssignmentForm/
      - StatsTable/

  C) Component İzolasyonu:
    - Her rol sadece kendi component'lerine erişebilmeli
    - Shared component'ler role-agnostic olmalı
    - Role-specific logic component içinde olmamalı

  9. API Endpoint Güvenlik Kuralları

  A) Endpoint Erişim Matrisi:
    
    Student Endpoints:
    - /api/student/* - Sadece student rolü
    - /api/users/profile - Kendi profilini görüntüle/düzenle
    - /api/study-sessions - Kendi çalışma oturumları
    - /api/daily-plans - Kendi programları
    - /api/feedback/coach - Koç değerlendirme (POST only)
    
    Coach Endpoints:
    - /api/coach/* - Sadece coach rolü
    - /api/coach/students - Sadece kendi öğrencileri
    - /api/coach/programs - Program CRUD (sadece kendi öğrencileri için)
    - /api/coach/reports - Sadece kendi öğrencilerinin raporları
    - ❌ /api/feedback/* - Feedback'lere ERİŞEMEZ
    
    Admin Endpoints:
    - /api/admin/* - Sadece admin rolü
    - /api/admin/users - Tüm kullanıcılar
    - /api/admin/feedback - Tüm feedback'ler (gizli)
    - /api/admin/assignments - Koç-öğrenci atamaları
    - /api/admin/system - Sistem yönetimi

  B) Güvenlik Middleware'leri:
    
    1. Role Check:
    - Her endpoint için rol kontrolü
    - Unauthorized erişimde 403 Forbidden
    
    2. Resource Ownership:
    - Kullanıcı sadece kendi verilerine erişebilir
    - Koç sadece kendi öğrencilerinin verilerine erişebilir
    - Admin tüm verilere erişebilir

     2.1 Program Ownership:
       - PUT / DELETE program işlemlerinde program.coachId === req.user.userId olmalı (veya admin)
       - Öğrenci program içeriğini düzenleyemez; yalnızca kendi progres verilerini günceller
    
    3. Sensitive Data Protection:
    - Feedback'ler koçlardan gizlenir
    - Şifreler hash'lenir ve asla döndürülmez
    - Token'lar güvenli şekilde saklanır
    
    4. Rate Limiting:
    - Login endpoint: 5 deneme/dakika
    - API endpoints: 100 istek/dakika
    - File upload: 10 dosya/saat

  C) Data Filtering:
    - Koç response'larından feedback bilgileri filtrelenir
    - Student response'larından diğer öğrenci bilgileri filtrelenir
    - Hassas alanlar (password, token) otomatik filtrelenir

  10. Test Senaryoları

  A) Güvenlik Testleri:
    1. Rol Erişim Testleri:
       - Student, coach endpoint'lerine erişmeye çalışmalı (403 beklenir)
       - Coach, admin endpoint'lerine erişmeye çalışmalı (403 beklenir)
       - Coach, feedback endpoint'lerine erişmeye çalışmalı (403 beklenir)
    
    2. Veri İzolasyonu:
       - Koç, başka koçun öğrencisini görmeye çalışmalı (404 beklenir)
       - Öğrenci, başka öğrencinin verilerini görmeye çalışmalı (403 beklenir)
       - Koç, öğrenci feedback'lerini görmeye çalışmalı (403 beklenir)

  B) İşlevsellik Testleri:
    1. Koç-Öğrenci İlişkisi:
       - Admin koç-öğrenci ataması yapabilmeli
       - Koç kendi öğrencilerini görebilmeli
       - Öğrenci kendi koçunu görebilmeli
    
    2. Program Yönetimi:
       - Koç program oluşturabilmeli
       - Öğrenci programı görüntüleyebilmeli
       - Öğrenci program onaylayabilmeli
      - Koç, öğrenciye gönderilmiş bir programı (PUT) güncelleyebilmeli; öğrenci güncel halini görmeli
    
    3. Gizli Feedback:
       - Öğrenci koç değerlendirmesi gönderebilmeli
       - Admin feedback'leri görebilmeli (kim yazdığı dahil)
       - Koç feedback'leri GÖREMEMELİ

  C) Edge Case'ler:
    - Koç-öğrenci ilişkisi sonlandırıldığında veri erişimi
    - Çoklu koç ataması senaryoları
    - Boş feedback gönderme denemeleri
    - Aynı öğrenciye çoklu program ataması

  D) Performance Testleri:
    - 100+ öğrencili koç için liste performansı
    - Büyük feedback listesi pagination
    - Concurrent program oluşturma

  E) UI/UX Testleri:
    - Rol bazlı menü görünürlüğü
    - Yetkisiz sayfa erişiminde redirect
    - Form validasyonları
    - Loading state'leri

  11. Mevcut Bug'lar ve Düzeltmeler

  A) Konu Açıklaması Görüntüleme Sorunu:
    Problem: Koç program oluştururken girdiği "description" (konu açıklaması) 
             öğrenci tarafında DailyTable'da görüntülenmiyor.
    
    Sebep: 
    - CoachDashboard'da subjects dizisine description ekleniyor
    - Backend DailyPlan modelinde description field'ı mevcut ✓
    - DailyTable'daki Subject interface'inde description field'ı YOK ✗
    - Table column'larında description render EDİLMİYOR ✗
    
    Çözüm:
    1. Subject interface'ine description: string field'ı ekle
    2. DailyTable'da description'ı görüntüleyecek column ekle veya 
       mevcut subject column'ında tooltip/expandable row ile göster
    3. Description verisinin backend'den geldiğinden emin ol
    
    Etkilenen Dosyalar:
    - src/views/StudyPlanPage/bones/DailyTable/DailyTable.tsx (Subject interface + render)
    - Opsiyonel: CSS düzenlemeleri için DailyTable.scss
