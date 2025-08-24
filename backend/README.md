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
