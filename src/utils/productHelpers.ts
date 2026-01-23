// ✅ Ürün durumu (condition) çevirisi - SADECE 3 DURUM
export const conditionMap: Record<string, string> = {
  // Yeni sistem (veritabanında İngilizce)
  'like_new': 'Sıfır Gibi',
  'good': 'İyi',
  'lightly_used': 'Az Kullanılmış',
  // Eski değerler için fallback (geriye dönük uyumluluk)
  'new': 'Sıfır Gibi',
  'like-new': 'Sıfır Gibi',
  'excellent': 'Sıfır Gibi',
  'very_good': 'İyi',
  'fair': 'Az Kullanılmış',
  'poor': 'Az Kullanılmış',
};

export const getConditionLabel = (condition: string): string => {
  return conditionMap[condition] || condition;
};

// Garanti süresi formatlama
export const formatWarranty = (months: number | null): string => {
  if (!months || months === 0) return 'Belirtilmemiş Garanti';
  if (months === 12) return '1 Yıl Garanti';
  if (months === 24) return '2 Yıl Garanti';
  if (months === 36) return '3 Yıl Garanti';
  if (months < 12) return `${months} Ay Garanti`;
  return `${Math.floor(months / 12)} Yıl Garanti`;
};

// Firma konum bilgisi (tüm ürünler için sabit)
export const COMPANY_LOCATION = {
  address: 'Cumhuriyet Bulvarı No:142',
  district: 'Alsancak',
  city: 'İzmir',
  fullAddress: 'Cumhuriyet Bulvarı No:142, Alsancak, İzmir'
};