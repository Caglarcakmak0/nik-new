## AI Integration (Simplified - OpenRouter Only)

Bu doküman önceki Ollama + RAG planını değiştirir. Yeni yaklaşım: Minimum eforla OpenRouter üzerinden tek endpoint ve basit kullanıcı bağlamı.

### Amaç
Öğrenciye anında: sınav soruları, çalışma tavsiyesi, motivasyon ve performans özeti sağlayan genel amaçlı chat.

### Mimarinin Özeti
- Sağlayıcı: OpenRouter (çoklu model gateway)
- Model varsayılanı: `openai/gpt-4o` (ENV ile değiştirilebilir)
- Backend Endpoint: `POST /api/ai/chat`
- Kimlik Doğrulama: JWT (mevcut `authenticateToken`)
- Rate Limit: 5dk / 30 istek (in-memory)
- Kullanıcı Bağlamı: Son 7 gün çalışma süreleri + en çok çalışılan 3 ders + hedef alan + sınıf
- Retrieval / Vektör DB: Yok (ileride eklenebilir). Şimdilik sadece internal basic keyword stub.

### Çevre Değişkenleri (.env)
```
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-xxxxxxxxxxxxxxxx
OPENROUTER_MODEL=openai/gpt-4o
# Opsiyonel fallback yerel kullanım için (şu an aktif değilse gerekmiyor):
# AI_PROVIDER=ollama
# AI_MODEL=llama3.1
```

### İstek Örneği
```
POST /api/ai/chat
Authorization: Bearer <JWT>
{
  "message": "Son 1 haftalık çalışma performansımı nasıl geliştiririm?"
}
```

### Yanıt Örneği
```
{
  "response": "Genel olarak sürelerin iyi; matematik ağırlıklı çalışmışsın...",
  "sources": ["(şimdilik boş veya stub)"] ,
  "model": "openai/gpt-4o"
}
```

### Güvenlik & Gizlilik
- API key yalnızca backend `.env` içinde.
- Frontend istekleri sadece JWT taşır; model anahtarı istemciye inmez.
- Loglarda API key maskeleme (gerekirse wrapper eklenebilir) önerilir.

### Hatalar ve Fallback
1. OpenRouter hata → JSON `{ response: 'OpenRouter hata: <mesaj>', model: 'error' }` döner.
2. API key yok → Uyarı + stub yanıt (gerekirse sert 500'e çevrilebilir).

### İzleme (Öneri)
- Kısa vadede: Response süresi + hata oranı console.
- Orta vadede: `/admin` paneline basit AI metrics (count, avg latency) eklenebilir.

### Basitleştirilmiş Yol Haritası
1. (Done) OpenRouter entegrasyonu.
2. (Optional) Streaming (SSE) ile token bazlı akış.
3. (Optional) RAG: Konu özetleri + YKS FAQ markdown indeksleme.
4. (Optional) Kişiselleştirilmiş çalışma planı öneri endpoint'i (`/api/ai/plan`).

### Teknik Notlar
- `aiService.js` içinde sağlayıcı seçimi: `AI_PROVIDER`.
- OpenRouter çağrıları: `openai` SDK `chat.completions.create`.
- Performans: İlk aşamada yeterli; ağırlaşırsa caching/memoization eklenebilir.

### Gelecekte Eklenebilecek Değerler
- Kullanıcı hedeflerine göre otomatik haftalık özet oluşturma.
- Progress gap analizi (en çok çalışılan vs ihmal edilen ders).
- Kaynak linkleri (dahili doküman tabanı eklenince).

---
Bu doküman güncel sade yaklaşımı temsil eder; eski Ollama/RAG planı geçersizdir.