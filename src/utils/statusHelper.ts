/**
 * Ürün durumu (status) mapping fonksiyonları
 * 
 * Veritabanında İngilizce saklanıyor: for_sale, in_storage, sold
 * Web sitesinde Türkçe gösteriliyor: Satışta, Depoda, Satıldı
 * 
 * NOT: "reserved" durumu kaldırıldı - sadece 3 durum var
 */

// Veritabanı değeri → Türkçe label
export const STATUS_LABELS: Record<string, string> = {
  'for_sale': 'Satışta',
  'in_storage': 'Depoda',
  'sold': 'Satıldı',
};

// Türkçe label → Veritabanı değeri
export const STATUS_VALUES: Record<string, string> = {
  'Satışta': 'for_sale',
  'Depoda': 'in_storage',
  'Satıldı': 'sold',
};

// Veritabanı değerini Türkçe'ye çevir
export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

// Türkçe değeri veritabanı formatına çevir
export function getStatusValue(label: string): string {
  return STATUS_VALUES[label] || label;
}

// Tüm status seçeneklerini döndür (dropdown'lar için)
export const STATUS_OPTIONS = [
  { value: 'for_sale', label: 'Satışta' },
  { value: 'in_storage', label: 'Depoda' },
  { value: 'sold', label: 'Satıldı' },
];

// Status badge renkleri
export const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'for_sale': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  'in_storage': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  'sold': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
};

// Status badge için renk döndür
export function getStatusColor(status: string): { bg: string; text: string; border: string } {
  return STATUS_COLORS[status] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' };
}
