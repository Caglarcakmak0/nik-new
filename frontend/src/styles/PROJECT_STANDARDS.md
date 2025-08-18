# 🎯 YKS Öğrenci Takip Portalı - Proje Standartları

## 📋 Proje Genel Bilgileri
- **Proje**: YKS Öğrenci Takip Portalı
- **Teknoloji**: React + TypeScript + Ant Design
- **Hedef Cihaz**: Sadece masaüstü (1280px+)
- **Mobil**: Gizlenir (gradient arkaplan + bilgilendirme mesajı)

## 🎨 Tipografi Scale'i

### Heading Hierarchy (Antd Title levels)
| Seviye | Font Size | Kullanım Alanı |
|--------|-----------|----------------|
| H1 | 32px | Çok büyük başlıklar (şu anda kullanılmıyor) |
| **H2** | **24px** | **Sayfa başlıkları** (Çalışma Takip Merkezi, Çalışma Programı) |
| H3 | 20px | Alt bölüm başlıkları |
| H4 | 18px | Kart başlıkları, modal başlıkları |
| H5 | 16px | Kart içi başlıklar, liste başlıkları |

### Body Text Scale
| Tip | Font Size | Kullanım Alanı |
|-----|-----------|----------------|
| Large Body | 16px | Ana açıklamalar, önemli metinler |
| Medium Body | 14px | Normal paragraflar, açıklamalar |
| Small Body | 12px | Meta bilgiler, etiketler, küçük açıklamalar |
| Extra Small | 10px | Çok küçük bilgiler, istatistikler |

### Özel Kullanım Alanları
| Alan | Desktop | Tablet | Mobile | Açıklama |
|------|---------|--------|--------|----------|
| Stat Numbers | 24px | 20px | 18px | İstatistik sayıları |
| Button Text | 15px | 15px | 14px | Genel butonlar |
| Button Small | 14px | 14px | 12px | Küçük butonlar |
| Tag Text | 12px | 12px | 10px | Etiketler |
| Tab Başlıkları | 14px | 14px | 14px | 500px font-weight + 5px margin-right |

## 🎬 Animasyon Sistemi

### Yaklaşım
- **Antd + CSS Hibrit**: Antd'nin built-in animasyonları + custom CSS
- **Performans odaklı**: Transform ve opacity kullanımı
- **Erişilebilirlik**: Reduced motion support

### Animasyon Değişkenleri
```scss
$transition-fast: 0.15s;    // Buton hover, input focus
$transition-normal: 0.3s;   // Kart hover, modal açılma  
$transition-slow: 0.5s;     // Sayfa geçişleri

$ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);  // Genel kullanım
$ease-out: cubic-bezier(0.0, 0, 0.2, 1);     // Giriş animasyonları
$ease-in: cubic-bezier(0.4, 0, 1, 1);        // Çıkış animasyonları

$transform-hover-y: translateY(-4px);         // Hover efekti
```

### Animasyon Türleri
- **Hover Efektleri**: Sadece translateY (shadow/scale yok)
- **Tab Animasyonları**: Antd built-in + custom CSS
- **Stagger Animasyonları**: Sıralı giriş efektleri
- **Page Transitions**: Fade in/out, slide in/out

### Keyframe Animasyonları
```scss
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideInFromTop {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes tabActive {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}
```

## 📱 Responsive Davranış

### Desktop Only (1280px+)
- Uygulama sadece masaüstü cihazlarda çalışır
- 1280px altında gizlenir
- Gradient arkaplan + bilgilendirme mesajı

### Mobile Gizleme
```scss
@media (max-width: 1280) {
  #root {
    display: none !important;
  }
  
  body {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    // Bilgilendirme mesajı
  }
}
```

## 🚀 Kullanım Kuralları

### 1. Tipografi
- **Sayfa başlıkları**: H2 (24px) kullan
- **Alt başlıklar**: H3 (20px) veya H4 (18px)
- **Kart başlıkları**: H5 (16px)
- **Normal metin**: Body Medium (14px)
- **Küçük metin**: Body Small (12px)

### 2. Animasyonlar
- **Hover efektleri**: Sadece translateY kullan
- **Shadow/scale**: Kullanma
- **Hardware acceleration**: Otomatik uygulanır
- **Reduced motion**: Desteklenir

### 3. Tab Başlıkları
- **Font-weight**: 500px
- **Margin-right**: 5px (emoji için)
- **Font-size**: 14px

### 4. Responsive
- **Sadece masaüstü**: 1280px+
- **Mobile gizleme**: Otomatik
- **Reduced motion**: Erişilebilirlik

### 5. Performans
- **Hardware acceleration**: GPU kullanımı
- **Minimal animasyonlar**: Sadece gerekli efektler
- **Stagger limit**: Maksimum 6 öğe

### 6. Erişilebilirlik
- **Reduced motion**: Otomatik destek
- **Keyboard navigation**: Antd built-in
- **Screen reader**: Antd built-in

## 📁 Dosya Yapısı

```
frontend/src/
├── styles/
│   ├── _variables.scss     # Animasyon değişkenleri + Tipografi scale
│   ├── _mixins.scss        # Animasyon mixin'leri + Tipografi mixin'leri
│   ├── main.scss          # Global stiller + Keyframe animasyonları
│   ├── ANIMATION_GUIDE.md  # Detaylı kullanım kılavuzu
│   └── PROJECT_STANDARDS.md # Bu dosya
├── views/
│   └── StudyPlanPage/
│       ├── StudyPlan.scss  # Sayfa animasyonları
│       └── bones/
│           └── StudyRecommendations/
│               └── StudyRecommendations.scss  # Bileşen stilleri
```

## 🎯 Uygulanan Bileşenler

### ✅ Tamamlanan
- **StudyRecommendations**: Tipografi scale'i + animasyonlar
- **StudyPlan**: Tab başlıkları + animasyonlar
- **Global Styles**: Keyframe animasyonları + tipografi stilleri

### 🔄 Devam Eden
- Diğer bileşenlerin güncellenmesi
- Yeni bileşenlerin standartlara uygun oluşturulması

## 📝 Geliştirici Notları

### Yeni Bileşen Oluştururken
1. **Tipografi**: Uygun heading level'ı seç
2. **Animasyonlar**: Minimal hover efektleri kullan
3. **Responsive**: Desktop only (1280px+)
4. **Performans**: Hardware acceleration kullan
5. **Erişilebilirlik**: Reduced motion support ekle

### Mevcut Bileşen Güncellerken
1. **Font size'ları**: Değişkenlerle değiştir
2. **Animasyonları**: Mixin'lerle güncelle
3. **Hover efektleri**: Sadece translateY kullan
4. **Tab başlıkları**: 500px font-weight + 5px margin

### Test Edilmesi Gerekenler
- [ ] 1280px altında gizlenme
- [ ] Reduced motion desteği
- [ ] Hardware acceleration
- [ ] Tab başlık stilleri
- [ ] Tipografi scale'i
- [ ] Hover efektleri

## 🔗 İlgili Dosyalar

- [ANIMATION_GUIDE.md](./ANIMATION_GUIDE.md) - Detaylı animasyon kılavuzu
- [_variables.scss](./_variables.scss) - Değişkenler
- [_mixins.scss](./_mixins.scss) - Mixin'ler
- [main.scss](./main.scss) - Global stiller
