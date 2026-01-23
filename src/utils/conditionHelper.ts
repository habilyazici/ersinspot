/**
 * Ürün durumu (condition) mapping fonksiyonları
 * 
 * Veritabanında İngilizce saklanıyor: like_new, good, lightly_used
 * Web sitesinde Türkçe gösteriliyor: Sıfır Gibi, İyi, Az Kullanılmış
 * 
 * ✅ 3 DURUM: Sıfır Gibi → İyi → Az Kullanılmış
 */

// Veritabanı değeri → Türkçe label
export const CONDITION_LABELS: Record<string, string> = {
  'like_new': 'Sıfır Gibi',
  'good': 'İyi',
  'lightly_used': 'Az Kullanılmış',
};

// Türkçe label → Veritabanı değeri
export const CONDITION_VALUES: Record<string, string> = {
  'Sıfır Gibi': 'like_new',
  'İyi': 'good',
  'Az Kullanılmış': 'lightly_used',
};

// Veritabanı değerini Türkçe'ye çevir
export function getConditionLabel(condition: string): string {
  return CONDITION_LABELS[condition] || condition;
}

// Türkçe değeri veritabanı formatına çevir
export function getConditionValue(label: string): string {
  return CONDITION_VALUES[label] || label;
}

// Tüm condition seçeneklerini döndür (dropdown'lar için - Kalite sırası: En iyi → En kötü)
export const CONDITION_OPTIONS = [
  { value: 'like_new', label: 'Sıfır Gibi' },
  { value: 'good', label: 'İyi' },
  { value: 'lightly_used', label: 'Az Kullanılmış' },
];

// Condition badge renkleri
export const CONDITION_COLORS: Record<string, { bg: string; text: string }> = {
  'like_new': { bg: 'bg-green-100', text: 'text-green-700' },
  'good': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'lightly_used': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
};

// Condition badge için renk döndür
export function getConditionColor(condition: string): { bg: string; text: string } {
  return CONDITION_COLORS[condition] || { bg: 'bg-gray-100', text: 'text-gray-700' };
}
