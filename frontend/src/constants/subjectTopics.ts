  // Ders -> Konu bankası (şimdilik boş diziler). Siz konu listelerini verdiğinizde dolduracağız.
// Anahtarlar backend'de kullanılan subject/branchSubject değerleriyle uyumludur.
export const SUBJECT_TOPIC_BANK: Record<string, string[]> = {
  // TYT
  turkce: [
    'Paragraf',
    'Ses Bilgisi',
    'Noktalama İşaretleri',
    'Yazım Kuralları',
    'Sözcükte Yapı',
    'İsimler',
    'Sıfatlar',
    'Zamirler',
    'Zarflar',
    'Edat Bağlaç Ünlem',
    'Fiiller Fiilimsi',
    'Fiilde Çatı',
    'Cümlenin Öğeleri',
    'Cümle Türleri',
    'Anlatım Bozuklukları'
  ],
  tarih: [],
  cografya: [],
  felsefe: [],
  din_kultur: [],
  matematik: [
    'Temel Kavramlar Sayı Bas.',
    'Bölme Bölünebilme',
    'Ebob Ekok',
    'Rasyonel Sayılar',
    'Birinci Dereceden Denklemler',
    'Mutlak Değer',
    'Üslü Köklü',
    'OranOrantı',
    'Çarpanlara Ayırma',
    'Problemler',
    'Kümeler Kartezyen',
    'Permütasyon',
    'Kombinasyon',
    'Binom',
    'Olasılık',
    'İstatistik',
    'Mantık'
  ],
  geometri: [
    'Doğruda Üçgende Açı',
    'Üçgenler',
    'Açıortay',
    'Kenarortay',
    'Üçgende Eşlik Benzerlik',
    'Açı Kenar Bağıntıları',
    'Üçgende Alan',
    'Çokgenler',
    'Dörtgenler',
    'Yamuk',
    'Paralelkenar',
    'Eşkenar Dörtgen',
    'Deltoid',
    'Dikdörtgen',
    'Kare',
    'Çember',
    'Dairenin Alanı',
    'Noktanın ve Doğrunun Analitiği',
    'Katı Cisimler'
  ],
  fizik: [
    'Fizik Bilimine Giriş',
    'Madde ve Özellikleri',
    'Hareket',
    'Basınç',
    'Kaldırma Kuvveti',
    'İş-Güç-Enerji',
    'Isı-Sıcaklık-Genleşme',
    'Dalgalar',
    'Elektrik Manyetizma',
    'Optik'
  ],
  kimya: [
    'Kimya Bilimine Giriş',
    'Atom ve Periyodik Sistem',
    'Kimyasal Türler Arası Etkileşimler',
    'Maddenin Halleri',
    'Kimya Yasaları',
    'Kimyasal Hesaplamalar',
    'Karışımlar',
    'Asit Baz Tuz',
    'Kimya Her Yerde'
  ],
  biyoloji: [
    'Canlıların Ortak Özellikleri',
    'Canlıların Temel Bileşenleri',
    'Hücre',
    'Madde Geçişleri',
    'Mitoz Mayoz Üreme',
    'Canlıların Sınıflandırılması',
    'Kalıtım',
    'Ekosistem Çevre'
  ],

  // AYT
  edebiyat: [],
  tarih_ayt: [],
  cografya_ayt: [],
  felsefe_ayt: [],
  din_kultur_ayt: [],
  matematik_ayt: [
    'Fonksiyonlar',
    'Polinomlar',
    'İkinci Dereceden Denklemler',
    'Parabol',
    'Eşitsizlikler',
    'Trigonometri',
    'Logaritma',
    'Diziler',
    'Limit',
    'Türev',
    'İntegral'
  ],
  fizik_ayt: [
    'Vektörler',
    'Bağıl Hareket Nehir',
    'Tork Denge',
    'Kütle ve Ağırlık Merkezi',
    'Basit Makineler',
    'Newton\'un Hareket Yasaları',
    'İş Güç Enerji',
    'Atışlar',
    'İtme Momentum',
    'Elektrik',
    'Manyetizma',
    'Çembersel Hareket',
    'Kütle Çekimi Kepler',
    'Basit Harmonik Hareket',
    'Dalgalar',
    'Atom Fiziği',
    'Modern Fizik ve Uygulamaları'
  ],
  kimya_ayt: [],
  biyoloji_ayt: [
    'Sinir Sistemi',
    'Endokrin Sistem',
    'Duyu Organları',
    'Destek ve Hareket Sistemi',
    'Sindirim Sistemi',
    'Dolaşım Bağışıklık Sistemi',
    'Solunum Sistemi',
    'Boşaltım Sistemi',
    'Üreme Sistemi',
    'Ekoloji',
    'Genden proteine',
    'Canlılarda Enerji Dönüşümleri',
    'Bitki',
    'Canlılar ve Çevre'
  ],

  // YDT
  ingilizce: [],
  almanca: [],
  fransizca: [],

  // Diğer
  diger: []
};

// Basit normalizasyon: Görünen bölüm adını backend anahtarına çevirmek için yardımcı
export function normalizeSubjectKey(name: string): string {
  const map: Record<string, string> = {
    'türkçe': 'turkce',
    'turkce': 'turkce',
    'matematik': 'matematik',
    'geometri': 'geometri',
    'fizik': 'fizik',
    'kimya': 'kimya',
    'biyoloji': 'biyoloji',
    'edebiyat': 'edebiyat',
    'tarih': 'tarih',
    'coğrafya': 'cografya',
    'cografya': 'cografya',
    'felsefe': 'felsefe',
    'din kültürü': 'din_kultur',
    'din_kulturu': 'din_kultur',
    'ingilizce': 'ingilizce',
    'almanca': 'almanca',
    'fransızca': 'fransizca',
    'fransizca': 'fransizca'
  };
  const lower = name
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
  return map[lower] || 'diger';
}


