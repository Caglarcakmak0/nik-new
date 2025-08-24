export const PRESET_COLORS = [
  '#ffffff', '#faad14', '#1677ff', '#722ed1', '#e61215', '#595555'
];

export const PRESET_COLORS_DARK = [
  '#1f2937', '#faad14', '#1677ff', '#722ed1', '#e61215', '#6b7280'
];

export const KEYBOARD_COLOR_MAP: Record<string, { color: string; label: string }> = {
  q: { color: '#ffffff', label: 'Beyaz' },
  w: { color: '#faad14', label: 'Turuncu' },
  e: { color: '#1677ff', label: 'Mavi' },
  r: { color: '#722ed1', label: 'Mor' },
  t: { color: '#e61215', label: 'Kırmızı' },
  y: { color: '#52c41a', label: 'Yeşil' },
  u: { color: '#595555', label: 'Gri' }
};

export const KEYBOARD_COLOR_MAP_DARK: Record<string, { color: string; label: string }> = {
  q: { color: '#1f2937', label: 'Koyu Gri' },
  w: { color: '#faad14', label: 'Turuncu' },
  e: { color: '#1677ff', label: 'Mavi' },
  r: { color: '#722ed1', label: 'Mor' },
  t: { color: '#e61215', label: 'Kırmızı' },
  y: { color: '#52c41a', label: 'Yeşil' },
  u: { color: '#6b7280', label: 'Gri' }
};

export const SUBJECT_LABELS: Record<string, string> = {
  turkce: 'Türkçe', tarih: 'Tarih', cografya: 'Coğrafya', felsefe: 'Felsefe',
  din_kultur: 'Din Kültürü', matematik: 'Matematik', geometri: 'Geometri', fizik: 'Fizik',
  kimya: 'Kimya', biyoloji: 'Biyoloji', edebiyat: 'Edebiyat', tarih_ayt: 'Tarih',
  cografya_ayt: 'Coğrafya', felsefe_ayt: 'Felsefe', din_kultur_ayt: 'Din Kültürü',
  matematik_ayt: 'Matematik', fizik_ayt: 'Fizik', kimya_ayt: 'Kimya', biyoloji_ayt: 'Biyoloji',
  ingilizce: 'İngilizce', almanca: 'Almanca', fransizca: 'Fransızca', diger: 'Diğer'
};

export function resolveGroup(key: string): 'TYT' | 'AYT' | 'YDT' | 'Diğer' {
  if (key.endsWith('_ayt')) return 'AYT';
  if (['ingilizce', 'almanca', 'fransizca'].includes(key)) return 'YDT';
  if (key === 'diger') return 'Diğer';
  return 'TYT';
}
