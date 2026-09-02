/**
 * Hizmet bölgesi tanımları.
 *
 * İşletme Buca merkezlidir. Teslimat ücreti ve nakliye fiyatlandırması ilçeye göre
 * değiştiği için ilçe listesi serbest metin değil, kapalı bir kümedir. Eski kodda
 * ilçe adı elle yazılıyordu; "Buca" ile "buca" farklı kabul edildiği için ücretsiz
 * teslimat kuralı bazen çalışmıyordu.
 */

export const IZMIR_DISTRICTS = [
  'Aliağa',
  'Balçova',
  'Bayındır',
  'Bayraklı',
  'Bergama',
  'Beydağ',
  'Bornova',
  'Buca',
  'Çeşme',
  'Çiğli',
  'Dikili',
  'Foça',
  'Gaziemir',
  'Güzelbahçe',
  'Karabağlar',
  'Karaburun',
  'Karşıyaka',
  'Kemalpaşa',
  'Kınık',
  'Kiraz',
  'Konak',
  'Menderes',
  'Menemen',
  'Narlıdere',
  'Ödemiş',
  'Seferihisar',
  'Selçuk',
  'Tire',
  'Torbalı',
  'Urla',
] as const;

export type IzmirDistrict = (typeof IZMIR_DISTRICTS)[number];

/** İşletmenin bulunduğu ilçe. Ücretsiz teslimat bölgesi. */
export const HOME_DISTRICT: IzmirDistrict = 'Buca';

/**
 * Hizmet verilmeyen ilçeler. Şehir merkezine uzak oldukları için nakliye ve
 * teknik servis talebi bu ilçelerden kabul edilmez; kullanıcıya form aşamasında bildirilir.
 */
export const UNSERVICED_DISTRICTS: readonly IzmirDistrict[] = [
  'Bergama',
  'Dikili',
  'Kınık',
  'Kiraz',
  'Beydağ',
  'Ödemiş',
  'Tire',
  'Karaburun',
];

export function isServiced(district: IzmirDistrict): boolean {
  return !UNSERVICED_DISTRICTS.includes(district);
}

/** Hizmet verilen ilçeler — form seçeneklerini üretmek için. */
export const SERVICED_DISTRICTS: readonly IzmirDistrict[] = IZMIR_DISTRICTS.filter(isServiced);
