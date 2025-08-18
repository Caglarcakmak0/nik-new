# 🎨 Animasyon Sistemi ve Tipografi Kullanım Kılavuzu

## 📋 Tipografi Scale'i

### Heading Hierarchy (Antd Title levels)
```scss
// H1 (32px) - Çok büyük başlıklar (şu anda kullanılmıyor)
@include heading-h1;

// H2 (24px) - Sayfa başlıkları (Çalışma Takip Merkezi, Çalışma Programı)
@include heading-h2;

// H3 (20px) - Alt bölüm başlıkları
@include heading-h3;

// H4 (18px) - Kart başlıkları, modal başlıkları
@include heading-h4;

// H5 (16px) - Kart içi başlıklar, liste başlıkları
@include heading-h5;
```

### Body Text Scale
```scss
// Large Body (16px) - Ana açıklamalar, önemli metinler
@include body-large;

// Medium Body (14px) - Normal paragraflar, açıklamalar
@include body-medium;

// Small Body (12px) - Meta bilgiler, etiketler, küçük açıklamalar
@include body-small;

// Extra Small (10px) - Çok küçük bilgiler, istatistikler
@include body-extra-small;
```

### Özel Kullanım Alanları
```scss
// Stat Numbers - Responsive
font-size: $font-size-stat-desktop; // 24px desktop
font-size: $font-size-stat-tablet;  // 20px tablet
font-size: $font-size-stat-mobile;  // 18px mobile

// Button Text
font-size: $font-size-button;        // 15px genel
font-size: $font-size-button-small;  // 14px küçük butonlar

// Tag Text
font-size: $font-size-tag-desktop;   // 12px desktop
font-size: $font-size-tag-mobile;    // 10px mobile

// Tab Başlıkları
@include tab-title; // 14px + 500px font-weight + 5px margin-right
```

## 🎬 Animasyon Sistemi

### Temel Animasyon Mixin'leri

#### Hover Efektleri (Sadece translateY)
```scss
// Kartlar, butonlar için hover efekti
@include hover-lift;

// Veya CSS class kullanımı
.hover-lift {
  @include hover-lift;
}
```

#### Fade Animasyonları
```scss
// Basit fade in
@include fade-in;

// Fade in up (yukarıdan aşağıya)
@include fade-in-up;

// Slide in from top (yukarıdan kayarak)
@include slide-in-top;

// Veya CSS class kullanımı
.fade-in { @include fade-in; }
.fade-in-up { @include fade-in-up; }
.slide-in-top { @include slide-in-top; }
```

#### Stagger Animasyonları
```scss
// Liste öğeleri için sıralı giriş
.stagger-container {
  > * {
    opacity: 0;
    animation: fadeInUp $transition-normal $ease-out forwards;
    @include stagger-animation;
  }
}
```

#### Tab Active Animasyonu
```scss
// Tab seçildiğinde scale efekti
@include tab-active-animation;

// Veya CSS class kullanımı
.tab-active {
  @include tab-active-animation;
}
```

#### Page Transition
```scss
// Sayfa geçişleri için
@include page-transition;

// Veya CSS class kullanımı
.page-transition {
  @include page-transition;
}
```

### Hardware Acceleration
```scss
// Performans için GPU acceleration
@include gpu-accelerated;

// Veya CSS class kullanımı
.gpu-accelerated {
  @include gpu-accelerated;
}
```

## 📱 Responsive Davranış

### Desktop Only (1280px+)
```scss
@include desktop-only {
  // Sadece masaüstü cihazlarda çalışacak stiller
  .my-component {
    font-size: $font-size-h2; // 24px
  }
}
```

### Mobile Gizleme
```scss
// 1280px altında gizle
@media (max-width: 1279px) {
  .my-component {
    display: none !important;
  }
}
```

## ♿ Erişilebilirlik

### Reduced Motion Support
```scss
// Otomatik olarak tüm animasyonlarda çalışır
@media (prefers-reduced-motion: reduce) {
  // Animasyonlar devre dışı bırakılır
}
```

## 🎯 Kullanım Örnekleri

### Bileşen Örneği
```scss
.my-component {
  // Sayfa başlığı
  .page-title {
    @include heading-h2; // 24px
    color: $text-primary;
  }
  
  // Alt başlık
  .section-title {
    @include heading-h4; // 18px
    margin-bottom: 16px;
  }
  
  // Kartlar
  .card {
    @include hover-lift; // Sadece translateY hover
    border-radius: 12px;
    
    .card-title {
      @include heading-h5; // 16px
    }
    
    .card-content {
      @include body-medium; // 14px
    }
    
    .card-meta {
      @include body-small; // 12px
      color: $text-secondary;
    }
  }
  
  // Liste öğeleri
  .list-container {
    @include stagger-animation;
    
    .list-item {
      opacity: 0;
      animation: fadeInUp $transition-normal $ease-out forwards;
    }
  }
  
  // Tab başlıkları
  .tab-title {
    @include tab-title; // 14px + 500px + 5px margin
  }
}
```

### TypeScript/React Örneği
```tsx
import React from 'react';
import { Typography } from 'antd';

const { Title, Paragraph } = Typography;

const MyComponent: React.FC = () => {
  return (
    <div className="my-component">
      {/* H2 başlık (24px) */}
      <Title level={2} className="page-title">
        Sayfa Başlığı
      </Title>
      
      {/* H4 başlık (18px) */}
      <Title level={4} className="section-title">
        Bölüm Başlığı
      </Title>
      
      {/* Body medium text (14px) */}
      <Paragraph className="body-medium">
        Normal paragraf metni
      </Paragraph>
      
      {/* Body small text (12px) */}
      <Paragraph className="body-small">
        Küçük açıklama metni
      </Paragraph>
    </div>
  );
};
```

## 🚀 Performans İpuçları

1. **Hardware Acceleration**: `@include gpu-accelerated;` kullanın
2. **Minimal Hover**: Sadece `translateY` kullanın, shadow/scale yok
3. **Reduced Motion**: Otomatik olarak desteklenir
4. **Stagger Limit**: Maksimum 6 öğe için optimize edilmiştir

## 📝 Notlar

- Tüm animasyonlar `prefers-reduced-motion: reduce` durumunda devre dışı kalır
- Hover efektleri sadece `translateY(-4px)` kullanır
- Tab başlıkları 500px font-weight + 5px margin-right (emoji için)
- Sadece masaüstü cihazlarda (1280px+) çalışır
- Hardware acceleration otomatik olarak uygulanır
