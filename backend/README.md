# Habit (Alışkanlık) Sistemi Özeti

Endpointler (auth gerekli /api prefix):
- POST /habits/routines (name, schedule.timeStart, recurrence) -> rutin oluşturur
- GET /habits/routines -> aktif rutin listesi + bugün log durumu
- POST /habits/routines/:id/logs { action: done|skip } -> işaretleme
- GET /habits/summary?days=30 -> durum sayıları
- GET /habit-analytics/overview | /risk | /heatmap | /trends
- GET /habits/heatmap (temel) (ileride kaldırılabilir – analytics versiyonu tercih)
- GET /habits/stream (SSE) -> event: habit_completed, habit_auto_complete, habit_risk_snapshot

Model Özetleri:
- HabitRoutine: schedule (recurrence, timeStart, daysOfWeek), behavior (toleranceMinutes, autoCompleteByStudySession, minSessionMinutes, decayProtection), metrics (streak, protectionUsed), gamification (xpOnComplete)
- HabitLog: status (pending|done|late|missed|skipped|auto), latenessMinutes, streakAfter, autoCaptured

Cron (habitJobs):
- 00 UTC: planlanan gün için pending log seed
- 23 UTC: pending kalanları missed yap; decayProtection varsa ilk miss affedilir

Risk Hesabı (özet):
successRate7, successRate14, volatility, resistance, missedYesterday birleşik ağırlıklandırma + streak koruma indirimi.

Auto-Complete:
Study session başlangıç saati planlanan habit saatine toleranceMinutes içinde ise ve süre >= minSessionMinutes ise log status 'auto'.

Rate Limiting:
Basit in-memory; üretimde dağıtık store (Redis) önerilir.

Testler:
- habits.flow.test.js (temel akış)
- habits.decay.test.js (decayProtection)
- habits.analytics.test.js (risk & heatmap servis)

SSE Örnek (fetch EventSource):
const es = new EventSource('/api/habits/stream', { withCredentials:true });
es.addEventListener('habit_completed', e => console.log(JSON.parse(e.data)));

# Backend

## YouTube API Anahtarı Hatası Nasıl Çözülür?
"YouTube API anahtarı yapılandırılmamış (YOUTUBE_API_KEY)." hatası alıyorsanız backend `.env` dosyanızda `YOUTUBE_API_KEY` tanımlı değildir.

### Adımlar
1. `backend/.env.example` dosyasını kopyalayın:
   - Kopya adı: `backend/.env`
2. Aşağıdaki satırı API anahtarınızla doldurun:
```
YOUTUBE_API_KEY=AIza...gerçek_anahtar
```
3. Sunucuyu yeniden başlatın:
```
# PowerShell içinde
cd backend
npm run dev
```
4. Test edin:
   - Tarayıcı: `http://localhost:8000/api/youtube/playlist-items?playlistId=PLpqRb1jUJ0bWZcq_o1pD7opiwO6ReqIYP`
   - JSON içinde `data.videos` geliyorsa çalışıyor.

### Notlar
- Anahtarı istemci (frontend) tarafına vermiyoruz; sadece proxy endpoint kullanılıyor.
- Kota hatalarında Google Cloud Console > APIs & Services > Quotas bölümünü kontrol edin.
- CORS açıktır; gerekli görülürse domain kısıtlaması eklenebilir.

### Güvenlik
`.env` dosyası `.gitignore` içinde. Anahtarı asla repoya commit etmeyin.

---

## AI (Yerel LLM) Entegrasyonu

Yeni eklenen `/api/ai/chat` endpoint'i ile öğrenciler AI asistana soru sorabilir.

### Kurulum
1. Ollama yükle: https://ollama.com (Windows için installer)
2. Örnek model indir:
   - `ollama pull llama3.1`
3. Backend `.env` içine opsiyonel model adı:
```
AI_MODEL=llama3.1
AI_PROVIDER=ollama
```
4. Backend bağımlılıklarını güncelle:
```
cd backend
npm install
```
5. (İsteğe bağlı) Doküman kaynakları ekle: `backend/ai-data/` klasörü oluşturup `.md` / `.txt` dosyaları koyun. Sunucu restart edildiğinde yüklenir.

### İstek Örneği
```
POST /api/ai/chat
Authorization: Bearer <JWT>
{ "message": "Son 1 haftalık performansımı nasıl geliştiririm?" }
```

Yanıt:
```
{ "response": "...", "sources": ["yks_genel_bilgiler.md"], "model": "llama3.1" }
```

### Notlar / Roadmap
- Şu an basit anahtar kelime tabanlı retrieval var. Chroma/Pinecone entegrasyonu için `aiService.js` güncellenecek.
- Rate limit: 5dk pencerede 30 istek (`middlewares/rateLimiter.js`).
- Gelişmiş kişiselleştirme için ek veri agregasyon servisleri planlanıyor.

### OpenRouter (Bulut Modeller) Kullanımı
Yerel model yerine çoklu sağlayıcıyı OpenRouter ile kullanmak için:
```
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-xxxx
OPENROUTER_MODEL=openai/gpt-4o
```
Environment değişince sunucuyu yeniden başlatın. İstekler şimdi OpenRouter'a yönlenir.

### AI Asistan Güncel Yetenekler (Snapshot)
Mevcut implementasyon öğrenciye koçluk amaçlı yanıt üretirken aşağıdaki veri özetlerini kullanır (prompt içine gömülü özet şeklinde, ham veritabanı dökümü değil):

Erişilen / Özetlenen Veriler:
- Profil: `grade`, `targetFieldType`, ilk 2 hedef üniversite adı.
- Çalışma Oturumları (son 7 gün): Toplam süre (dakika), ortalama kalite, en çok çalışılan ilk 5 ders ve süreleri, toplam dikkat dağınıklığı sayısı, teknik dağılımı (Stopwatch/Pomodoro/Timeblock/Freeform frekans), Pomodoro kullanım adedi.
- Aktif Hedefler (`StudyGoal`): Ders, günlük & haftalık hedef dakika, completionRate (yüzde), basit öncelik yansıtması.
- Günlük Plan (bugün `DailyPlan`): Planlanan ders sayısı, tamamlanan ders sayısı, completionRate, kalan tahmini süre (dakika).
- Deneme Sınavları (son 30 gün `ExamAttempt`): Sınav tarihi, tür (TYT/AYT), net, accuracy, her sınav için en zayıf 2 ders etiketi, toplu olarak ısrarla yanlış yapılan (>=2 wrong) konu başlıklarının ilk 8 tanesi.
- Başarımlar (`Achievement`): Son 5 unlock edilen başlık.
- Gamification (`UserStats`): Seviye, toplam XP, streak.

İsim / Kimlik:
- Asistan adı: `AI_NAME` (varsayılan "Nik AI"). İsim sorularında sabit hızlı yanıt.

Rate Limit:
- 5 dakika penceresinde kullanıcı başına 30 istek (in-memory). Ölçeklendirme için Redis önerilir.

Güvenlik / Gizlilik:
- API key istemciye gönderilmez; yalnızca backend kullanır.
- Prompt’a yalnızca özet metrikler gider; ham kişisel metinler (notlar, uzun açıklamalar) şu an gönderilmiyor.

Limitasyonlar (Şu Anda Yok):
- Vektör tabanlı bağlam (RAG) yok.
- Alışkanlık (habit) analitiği ve mood dağılımı eklenmedi.
- Konu bazlı derin öneri (topic mastery gap) sınırlı; sadece yanlış yoğunluğu.
- Streaming (SSE) veya token bazlı erken yanıt yok.
- Uzun cevap truncation / token yönetimi sadece `OPENROUTER_MAX_TOKENS` ayarı ile sınırlı.

Kısa Vadeli Roadmap Önerileri:
1. Streaming cevap (SSE) + kullanıcı arayüzünde canlı yazım.
2. Habit & mood analitiği ekleyip çalışma motivasyonu önerileri.
3. RAG: YKS FAQ & kaynak dokümanlarını indeksleyip kaynaklı cevap.
4. Otomatik haftalık özet / gelişim raporu endpoint (`/api/ai/weekly-report`).
5. Hedef boşluk analizi (goals vs gerçek süre) ve öneri puanlama.

Konfig Özet (ENV):
```
AI_PROVIDER=openrouter | ollama
OPENROUTER_MODEL=openai/gpt-4o (veya openai/gpt-4o-mini)
OPENROUTER_MAX_TOKENS=512
AI_NAME=Nik AI
```



