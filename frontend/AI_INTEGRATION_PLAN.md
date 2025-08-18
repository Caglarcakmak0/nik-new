# YKS Portal AI Integration Plan

## Hedef
YKS Portal'a ücretsiz dil modeli entegrasyonu ile akıllı asistan özelliği eklemek.

## Teknoloji Yığını
- **Model**: Ollama (Local, Ücretsiz)
  - Llama 3.1, Qwen, Gemma seçenekleri
- **Yaklaşım**: RAG (Retrieval Augmented Generation)
- **Vektör DB**: Chroma/Pinecone
- **Entegrasyon**: REST API

## Mevcut Veri Kaynakları
Portal'da zaten mevcut:
- Study sessions (çalışma kayıtları)
- User stats (öğrenci istatistikleri)
- Study goals (hedefler)
- Daily plans (günlük planlar)
- Achievements (başarılar)
- Competition data (yarışma verileri)

## Eklenecek Veri Kaynakları
1. **YKS Genel Bilgiler**
   - Sınav formatı (TYT/AYT)
   - Puanlama sistemi
   - Üniversite-bölüm bilgileri
   - Taban puanlar

2. **Çalışma Tavsiyeleri**
   - Konu bazında öneriler
   - Zaman yönetimi
   - Teknik stratejiler

3. **Sık Sorulan Sorular**
   - YKS süreçleri
   - Başvuru prosedürleri
   - Portal kullanımı

## Implementation Plan

### Phase 1: Ollama Setup
- [ ] Ollama kurulumu
- [ ] Model seçimi ve indirme
- [ ] API endpoint testleri

### Phase 2: RAG Infrastructure
- [ ] Vektör veritabanı kurulumu
- [ ] Veri indexleme sistemi
- [ ] Arama fonksiyonları

### Phase 3: Data Preparation
- [ ] YKS temel bilgilerini hazırla
- [ ] Portal verilerini dönüştür
- [ ] Vektör indexleme

### Phase 4: Backend Integration
- [ ] AI endpoint'leri (/api/ai/chat)
- [ ] RAG query sistemi
- [ ] Response formatlama

### Phase 5: Frontend Integration
- [ ] Chat component
- [ ] AI asistan UI
- [ ] Context-aware öneriler

### Phase 6: Advanced Features
- [ ] Kişiselleştirilmiş öneriler
- [ ] Çalışma planı oluşturma
- [ ] Performans analizi

## Örnek Use Cases
- "TYT Matematik kaç soru?"
- "Benim çalışma performansım nasıl?"
- "Hangi konulara odaklanmalıyım?"
- "Boğaziçi İşletme için ne kadar puan gerekli?"
- "Çalışma planımı optimize et"

## Teknik Detaylar
```javascript
// API Structure
POST /api/ai/chat
{
  "message": "TYT kaç dakika sürer?",
  "context": "exam_info" // optional
}

// Response
{
  "response": "TYT sınavı 165 dakika sürer...",
  "sources": ["yks_genel_bilgiler.txt"],
  "confidence": 0.95
}
```

## Avantajları
- ✅ Tamamen ücretsiz
- ✅ Offline çalışabilir
- ✅ Veri gizliliği
- ✅ Özelleştirilebilir
- ✅ Zamanla geliştirilir

## Gereksinimler
- 8GB+ RAM (16GB ideal)
- ~4GB disk alanı
- Ollama kurulumu

## Timeline
- Phase 1-2: 1 hafta
- Phase 3-4: 1 hafta  
- Phase 5-6: 2 hafta

**Toplam süre: ~1 ay**

---
*Bu plan öğrencilere YKS sürecinde akıllı destek sağlamak için hazırlanmıştır.*