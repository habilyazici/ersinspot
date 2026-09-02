/**
 * Alan durumlarının tek kaynağı.
 *
 * Eski kod tabanında durum mantığı 19 ayrı dosyada tekrar tanımlanmıştı; listeler
 * birbirini tutmadığı için hiçbir zaman doğru olamayacak karşılaştırmalar oluşmuştu
 * (örn. 'pending' içermeyen bir birleşimde `status === 'pending'`). Burada her durum
 * kümesi bir kez tanımlanıyor, etiketleri ve izin verilen geçişleri yanında duruyor.
 *
 * Kural: durum değeri hiçbir yerde düz metin olarak yazılmaz. Kullanıcıya gösterilecek
 * karşılığı için daima ilgili `*_LABELS` haritası kullanılır.
 */

/** Arayüzde durumun nasıl renklendirileceğini belirler. Marka renginden bağımsızdır. */
export type StatusTone = 'neutral' | 'pending' | 'progress' | 'success' | 'danger';

export interface StatusMeta {
  /** Kullanıcıya gösterilen Türkçe etiket. */
  readonly label: string;
  /** Etiketin altında gösterilebilecek kısa açıklama. */
  readonly description: string;
  readonly tone: StatusTone;
}

// ---------------------------------------------------------------------------
// Ürün durumu
// ---------------------------------------------------------------------------

/**
 * İkinci el ürünler tekildir: bir ürünün stok adedi her zaman 1'dir. Bu yüzden
 * sipariş verildiğinde ürün `reserved` olur; sipariş iptal edilirse `for_sale`
 * durumuna geri döner, teslim edilirse `sold` olur.
 */
export const PRODUCT_STATUSES = ['draft', 'in_storage', 'for_sale', 'reserved', 'sold'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_STATUS_LABELS: Readonly<Record<ProductStatus, StatusMeta>> = {
  draft: {
    label: 'Taslak',
    description: 'Henüz yayınlanmadı, yalnızca yönetim panelinde görünür.',
    tone: 'neutral',
  },
  in_storage: {
    label: 'Depoda',
    description: 'Envanterde kayıtlı, henüz satışa açılmadı.',
    tone: 'neutral',
  },
  for_sale: {
    label: 'Satışta',
    description: 'Sitede yayında ve sipariş edilebilir.',
    tone: 'success',
  },
  reserved: {
    label: 'Rezerve',
    description: 'Bir siparişe bağlandı, teslimat bekleniyor.',
    tone: 'progress',
  },
  sold: {
    label: 'Satıldı',
    description: 'Teslim edildi, artık satışta değil.',
    tone: 'neutral',
  },
};

/** Yalnızca bu durumdaki ürünler site vitrininde listelenir. */
export const PUBLICLY_VISIBLE_PRODUCT_STATUSES = ['for_sale', 'reserved'] as const;

/** Sepete eklenebilecek tek durum. */
export const PURCHASABLE_PRODUCT_STATUS: ProductStatus = 'for_sale';

// ---------------------------------------------------------------------------
// Ürün kondisyonu
// ---------------------------------------------------------------------------

/**
 * İş kuralı: bu bir spot mağazasıdır, "Sıfır" seçeneği bilinçli olarak yoktur.
 * Ölçek en iyiden en kötüye doğru sıralıdır.
 */
export const PRODUCT_CONDITIONS = ['like_new', 'good', 'fair', 'worn'] as const;
export type ProductCondition = (typeof PRODUCT_CONDITIONS)[number];

export const PRODUCT_CONDITION_LABELS: Readonly<Record<ProductCondition, StatusMeta>> = {
  like_new: {
    label: 'Az Kullanılmış',
    description: 'Kullanım izi yok denecek kadar az.',
    tone: 'success',
  },
  good: {
    label: 'İyi',
    description: 'Hafif kullanım izleri var, işlevi tam.',
    tone: 'success',
  },
  fair: {
    label: 'Orta',
    description: 'Görünür kullanım izleri var, işlevi sorunsuz.',
    tone: 'pending',
  },
  worn: {
    label: 'Yıpranmış',
    description: 'Belirgin yıpranma var, fiyatına yansıtılmıştır.',
    tone: 'neutral',
  },
};

// ---------------------------------------------------------------------------
// Sipariş durumu
// ---------------------------------------------------------------------------

export const ORDER_STATUSES = [
  'pending_payment',
  'received',
  'preparing',
  'shipped',
  'delivered',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Readonly<Record<OrderStatus, StatusMeta>> = {
  pending_payment: {
    label: 'Ödeme Bekleniyor',
    description: 'Havale/EFT bildiriminiz bekleniyor.',
    tone: 'pending',
  },
  received: {
    label: 'Sipariş Alındı',
    description: 'Siparişiniz bize ulaştı, hazırlığa alınacak.',
    tone: 'progress',
  },
  preparing: {
    label: 'Hazırlanıyor',
    description: 'Ürününüz teslimata hazırlanıyor.',
    tone: 'progress',
  },
  shipped: {
    label: 'Yola Çıktı',
    description: 'Ürününüz teslimat için yola çıktı.',
    tone: 'progress',
  },
  delivered: {
    label: 'Teslim Edildi',
    description: 'Siparişiniz teslim edildi.',
    tone: 'success',
  },
  cancelled: {
    label: 'İptal Edildi',
    description: 'Sipariş iptal edildi.',
    tone: 'danger',
  },
};

/**
 * İzin verilen sipariş durumu geçişleri. Boş dizi, o durumun uç nokta olduğunu
 * (artık değiştirilemeyeceğini) belirtir.
 */
export const ORDER_STATUS_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  pending_payment: ['received', 'cancelled'],
  received: ['preparing', 'cancelled'],
  preparing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

/** Müşterinin kendi siparişini iptal edebileceği durumlar. */
export const CUSTOMER_CANCELLABLE_ORDER_STATUSES = ['pending_payment', 'received'] as const;

// ---------------------------------------------------------------------------
// Hizmet talebi durumu (nakliye, teknik servis, satış talebi ortak yaşam döngüsü)
// ---------------------------------------------------------------------------

/**
 * Üç hizmet türü de aynı akışı izler: talep gelir, incelenir, teklif verilir,
 * müşteri kabul veya reddeder, randevu planlanır, iş tamamlanır.
 * Tek bir durum kümesi kullanmak, üç modülün arayüzünün tutarlı kalmasını sağlar.
 */
export const REQUEST_STATUSES = [
  'pending',
  'reviewing',
  'quoted',
  'accepted',
  'scheduled',
  'completed',
  'rejected',
  'cancelled',
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const REQUEST_STATUS_LABELS: Readonly<Record<RequestStatus, StatusMeta>> = {
  pending: {
    label: 'Talep Alındı',
    description: 'Talebiniz bize ulaştı, en kısa sürede incelenecek.',
    tone: 'pending',
  },
  reviewing: {
    label: 'İnceleniyor',
    description: 'Talebiniz değerlendiriliyor.',
    tone: 'progress',
  },
  quoted: {
    label: 'Teklif Verildi',
    description: 'Fiyat teklifimiz hazır, onayınızı bekliyoruz.',
    tone: 'progress',
  },
  accepted: {
    label: 'Teklif Kabul Edildi',
    description: 'Teklifi onayladınız, randevu planlanacak.',
    tone: 'progress',
  },
  scheduled: {
    label: 'Randevu Planlandı',
    description: 'Randevunuz oluşturuldu.',
    tone: 'progress',
  },
  completed: {
    label: 'Tamamlandı',
    description: 'Hizmet tamamlandı.',
    tone: 'success',
  },
  rejected: {
    label: 'Teklif Reddedildi',
    description: 'Teklifimiz kabul edilmedi.',
    tone: 'danger',
  },
  cancelled: {
    label: 'İptal Edildi',
    description: 'Talep iptal edildi.',
    tone: 'danger',
  },
};

export const REQUEST_STATUS_TRANSITIONS: Readonly<Record<RequestStatus, readonly RequestStatus[]>> =
  {
    pending: ['reviewing', 'cancelled'],
    reviewing: ['quoted', 'cancelled'],
    quoted: ['accepted', 'rejected', 'cancelled'],
    accepted: ['scheduled', 'cancelled'],
    scheduled: ['completed', 'cancelled'],
    completed: [],
    rejected: [],
    cancelled: [],
  };

/** Müşterinin kendi talebini iptal edebileceği durumlar. */
export const CUSTOMER_CANCELLABLE_REQUEST_STATUSES = [
  'pending',
  'reviewing',
  'quoted',
  'accepted',
  'scheduled',
] as const;

/** Müşterinin teklife yanıt verebileceği tek durum. */
export const RESPONDABLE_REQUEST_STATUS: RequestStatus = 'quoted';

// ---------------------------------------------------------------------------
// Ödeme ve teslimat
// ---------------------------------------------------------------------------

export const PAYMENT_METHODS = ['cash_on_delivery', 'bank_transfer'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Readonly<Record<PaymentMethod, StatusMeta>> = {
  cash_on_delivery: {
    label: 'Kapıda Ödeme',
    description: 'Teslimat sırasında nakit veya kartla ödeyin.',
    tone: 'neutral',
  },
  bank_transfer: {
    label: 'Havale / EFT',
    description: 'Sipariş sonrası banka bilgileri paylaşılır.',
    tone: 'neutral',
  },
};

/**
 * Ödeme yöntemi siparişin başlangıç durumunu belirler: kapıda ödemede tahsilat
 * teslimatta yapılacağı için sipariş doğrudan alınmış sayılır.
 */
export const INITIAL_ORDER_STATUS_BY_PAYMENT: Readonly<Record<PaymentMethod, OrderStatus>> = {
  cash_on_delivery: 'received',
  bank_transfer: 'pending_payment',
};

export const DELIVERY_METHODS = ['store_pickup', 'home_delivery'] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

export const DELIVERY_METHOD_LABELS: Readonly<Record<DeliveryMethod, StatusMeta>> = {
  store_pickup: {
    label: 'Mağazadan Teslim',
    description: 'Ürünü mağazamızdan kendiniz teslim alın.',
    tone: 'neutral',
  },
  home_delivery: {
    label: 'Adrese Teslimat',
    description: 'Ürün belirttiğiniz adrese teslim edilir.',
    tone: 'neutral',
  },
};

// ---------------------------------------------------------------------------
// Kullanıcı rolü
// ---------------------------------------------------------------------------

export const USER_ROLES = ['customer', 'staff', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_ROLE_LABELS: Readonly<Record<UserRole, StatusMeta>> = {
  customer: { label: 'Müşteri', description: 'Site kullanıcısı.', tone: 'neutral' },
  staff: {
    label: 'Personel',
    description: 'Talepleri ve siparişleri yönetebilir.',
    tone: 'progress',
  },
  admin: {
    label: 'Yönetici',
    description: 'Tam yetki: kullanıcı ve ayar yönetimi dahil.',
    tone: 'success',
  },
};

/** Rol hiyerarşisi: büyük sayı, küçük sayının tüm yetkilerini kapsar. */
export const ROLE_RANK: Readonly<Record<UserRole, number>> = {
  customer: 0,
  staff: 1,
  admin: 2,
};

// ---------------------------------------------------------------------------
// Hizmet türü
// ---------------------------------------------------------------------------

export const SERVICE_KINDS = ['moving', 'technical_service', 'sell_request'] as const;
export type ServiceKind = (typeof SERVICE_KINDS)[number];

export const SERVICE_KIND_LABELS: Readonly<Record<ServiceKind, StatusMeta>> = {
  moving: { label: 'Nakliye', description: 'Evden eve nakliyat talebi.', tone: 'neutral' },
  technical_service: {
    label: 'Teknik Servis',
    description: 'Beyaz eşya ve elektronik onarımı.',
    tone: 'neutral',
  },
  sell_request: {
    label: 'Ürün Satış Talebi',
    description: 'Ürününüzü bize satma talebi.',
    tone: 'neutral',
  },
};

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

/** Verilen geçişin durum makinesinde tanımlı olup olmadığını söyler. */
export function canTransition<T extends string>(
  transitions: Readonly<Record<T, readonly T[]>>,
  from: T,
  to: T,
): boolean {
  return transitions[from].includes(to);
}

/**
 * Bir rolün gerekli yetki seviyesini karşılayıp karşılamadığını söyler.
 * Yetkilendirme kararları yalnızca bu fonksiyon üzerinden verilir.
 */
export function hasRoleAtLeast(role: UserRole, required: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}
