/**
 * ═══════════════════════════════════════════════════════════════════════
 * 🔑 ERSİN SPOT - BACKEND SABIT DEĞERLERİ
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Backend entegrasyonunda kullanılacak tüm sabit değerler
 * 
 * ⚠️ Bu değerleri değiştirmeden önce tüm projeyi kontrol et!
 * ═══════════════════════════════════════════════════════════════════════
 */

/**
 * 📊 İSTATİSTİK SABİTLERİ
 * Tüm sitede tutarlı kullanılmalı
 */
export const SITE_STATS = {
  HAPPY_CUSTOMERS: '5000+',
  YEARS_EXPERIENCE: '10+',
  COMPLETED_SERVICES: '5000+',
  SATISFACTION_RATE: '%94',
} as const;

/**
 * 🏢 FİRMA BİLGİLERİ
 */
export const COMPANY_INFO = {
  NAME: 'Ersin Spot',
  FOUNDER: 'Ersin Yılmaz',
  FOUNDING_YEAR: 2015,
  EXPERIENCE_YEARS: 10,
  LOCATION: {
    DISTRICT: 'Menderes Mahallesi',
    CITY: 'Buca',
    PROVINCE: 'İzmir',
    FULL_ADDRESS: 'Menderes Mahallesi, Buca/İzmir',
  },
} as const;

/**
 * 🎨 RENK PALETİ
 */
export const COLORS = {
  PRIMARY: {
    ORANGE: '#f97316',
    NAVY: '#1e3a8a',
  },
  SECONDARY: {
    BRONZE: '#8B6F47',
    TEAL: '#7FA99B',
    CREAM: '#F1EDE3',
    CORAL: '#FF8A6B',
  },
} as const;

/**
 * 📦 ÜRÜN SABİTLERİ
 */
export const PRODUCT_CONSTANTS = {
  // ❌ ASLA "Sıfır" kullanma!
  CONDITIONS: {
    LIKE_NEW: 'Az Kullanılmış',
    SECOND_HAND: 'İkinci El',
  },
  CATEGORIES: {
    APPLIANCES: 'Beyaz Eşya',
    ELECTRONICS: 'Elektronik',
    FURNITURE: 'Mobilya',
  },
  MIN_PHOTOS: 5, // Minimum fotoğraf sayısı
  STATUSES: {
    ACTIVE: 'active',
    SOLD: 'sold',
    PENDING: 'pending',
  },
} as const;

/**
 * 🚚 KARGO ÜCRETLERİ
 */
export const DELIVERY_FEES = {
  INSIDE_BUCA: 0, // Buca içi ücretsiz
  OUTSIDE_BUCA: 500, // Buca dışı +500₺
} as const;

/**
 * 🏘️ İZMİR İLÇELERİ
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

/**
 * 🔧 TEKNİK SERVİS SABİTLERİ
 */
export const TECHNICAL_SERVICE = {
  DEVICE_TYPES: [
    'Buzdolabı',
    'Çamaşır Makinesi',
    'Bulaşık Makinesi',
    'Fırın',
    'Ocak',
    'Televizyon',
    'Bilgisayar',
    'Klima',
    'Diğer',
  ],
  TIME_SLOTS: [
    '10:00 - 11:00',
    '11:00 - 12:00',
    '12:00 - 13:00',
    '14:00 - 15:00',
    '15:00 - 16:00',
    '16:00 - 17:00',
    '17:00 - 18:00',
  ],
  STATUSES: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    IN_PROGRESS: 'in-progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  },
  BOOKING_PREFIX: 'TS-', // Booking number prefix
} as const;

/**
 * 🚛 NAKLİYE SABİTLERİ
 */
export const MOVING_SERVICE = {
  HOUSE_SIZES: ['1+1', '2+1', '3+1', '4+1', 'Villa'],
  FURNITURE_ITEMS: [
    'Buzdolabı',
    'Çamaşır Makinesi',
    'Bulaşık Makinesi',
    'Fırın',
    'Ocak',
    'Televizyon',
    'Koltuk Takımı',
    'Yatak',
    'Dolap',
    'Masa',
    'Sandalye',
    'Kitaplık',
    'Kutu',
  ],
  TIME_SLOTS: [
    '09:00 - 11:00',
    '11:00 - 13:00',
    '13:00 - 15:00',
    '15:00 - 17:00',
  ],
  STATUSES: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  },
  BOOKING_PREFIX: 'MV-', // Booking number prefix
} as const;

/**
 * 📝 SİPARİŞ SABİTLERİ
 */
export const ORDER_CONSTANTS = {
  STATUSES: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
  },
  ORDER_PREFIX: 'ORD-', // Order number prefix
} as const;

/**
 * 👤 KULLANICI ROLLERİ
 */
export const USER_ROLES = {
  CUSTOMER: 'customer',
  ADMIN: 'admin',
} as const;

/**
 * 📸 MEDYA SABİTLERİ
 */
export const MEDIA_CONSTANTS = {
  // Supabase Storage Bucket İsimleri
  BUCKETS: {
    PRODUCT_IMAGES: 'product-images',
    USER_AVATARS: 'user-avatars',
    TECHNICAL_SERVICE_MEDIA: 'technical-service-media',
    BLOG_IMAGES: 'blog-images',
  },
  // Maksimum dosya boyutları (MB)
  MAX_FILE_SIZES: {
    IMAGE: 5, // 5MB
    VIDEO: 50, // 50MB
  },
  // İzin verilen dosya tipleri
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/quicktime'],
} as const;

/**
 * 📱 İLETİŞİM BİLGİLERİ
 * ⚠️ Backend'de gerçek değerleri kullan!
 */
export const CONTACT_INFO = {
  PHONE: '0 507 194 05 50',
  EMAIL: 'info@ersinspot.com', // Gerçek email eklenecek
  ADDRESS: 'Menderes Mahallesi, Buca/İzmir',
  WORKING_HOURS: {
    WEEKDAYS: '09:00 - 18:00',
    SATURDAY: '09:00 - 17:00',
    SUNDAY: 'Kapalı',
  },
} as const;

/**
 * 📊 PAGİNATION SABİTLERİ
 */
export const PAGINATION = {
  PRODUCTS_PER_PAGE: 12,
  ORDERS_PER_PAGE: 10,
  BLOG_POSTS_PER_PAGE: 9,
  BOOKINGS_PER_PAGE: 10,
} as const;

/**
 * 🔍 ARAMA VE FİLTRELEME
 */
export const FILTERS = {
  SORT_OPTIONS: {
    DATE_DESC: 'date-desc',
    DATE_ASC: 'date-asc',
    PRICE_ASC: 'price-asc',
    PRICE_DESC: 'price-desc',
    POPULAR: 'popular',
  },
  PRICE_RANGE: {
    MIN: 0,
    MAX: 100000,
  },
} as const;

/**
 * ⏰ TARİH VE SAAT SABİTLERİ
 */
export const DATE_TIME = {
  // Randevu için minimum kaç gün önceden alınabilir
  MIN_BOOKING_DAYS_AHEAD: 1,
  // Randevu için maksimum kaç gün ileri alınabilir
  MAX_BOOKING_DAYS_AHEAD: 30,
  // Teslimat için minimum kaç gün sonrası
  MIN_DELIVERY_DAYS: 2,
} as const;

/**
 * 🎯 API ENDPOINT'LERİ
 * Backend'de kullanılacak route isimleri
 */
export const API_ROUTES = {
  // Products
  PRODUCTS: '/api/products',
  PRODUCT_DETAIL: '/api/products/:id',
  
  // Orders
  ORDERS: '/api/orders',
  ORDER_DETAIL: '/api/orders/:id',
  
  // Technical Service
  TECHNICAL_SERVICE_BOOKINGS: '/api/technical-service/bookings',
  TECHNICAL_SERVICE_BOOKING_DETAIL: '/api/technical-service/bookings/:id',
  
  // Moving Service
  MOVING_BOOKINGS: '/api/moving/bookings',
  MOVING_BOOKING_DETAIL: '/api/moving/bookings/:id',
  
  // Blog
  BLOG_POSTS: '/api/blog/posts',
  BLOG_POST_DETAIL: '/api/blog/posts/:slug',
  
  // User
  USER_PROFILE: '/api/user/profile',
  USER_ORDERS: '/api/user/orders',
  USER_FAVORITES: '/api/user/favorites',
  USER_BOOKINGS: '/api/user/bookings',
  
  // Cart
  CART: '/api/cart',
  
  // Auth
  AUTH_LOGIN: '/api/auth/login',
  AUTH_REGISTER: '/api/auth/register',
  AUTH_LOGOUT: '/api/auth/logout',
} as const;

/**
 * 💰 FİYATLANDIRMA FORMÜLLERI
 * 
 * Nakliye fiyat hesaplama örneği:
 * basePrice + (distance * distanceRate) + houseSizeMultiplier + furnitureCount * itemRate
 */
export const PRICING = {
  MOVING: {
    BASE_PRICE: 500, // Temel fiyat
    DISTANCE_RATE: 10, // KM başına ücret
    HOUSE_SIZE_MULTIPLIERS: {
      '1+1': 1.0,
      '2+1': 1.3,
      '3+1': 1.6,
      '4+1': 2.0,
      'Villa': 2.5,
    },
    FURNITURE_ITEM_RATE: 50, // Her eşya için ek ücret
  },
} as const;

/**
 * ⚠️ HATA MESAJLARI
 */
export const ERROR_MESSAGES = {
  GENERIC: 'Bir hata oluştu. Lütfen tekrar deneyin.',
  NETWORK: 'Bağlantı hatası. İnternet bağlantınızı kontrol edin.',
  NOT_FOUND: 'Aradığınız sayfa bulunamadı.',
  UNAUTHORIZED: 'Bu işlem için giriş yapmalısınız.',
  FORBIDDEN: 'Bu işlemi yapmaya yetkiniz yok.',
  VALIDATION: 'Lütfen tüm alanları doğru şekilde doldurun.',
} as const;

/**
 * ✅ BAŞARI MESAJLARI
 */
export const SUCCESS_MESSAGES = {
  ORDER_CREATED: 'Siparişiniz başarıyla oluşturuldu!',
  BOOKING_CREATED: 'Randevunuz başarıyla alındı!',
  PRODUCT_ADDED: 'Ürün başarıyla eklendi!',
  PRODUCT_UPDATED: 'Ürün başarıyla güncellendi!',
  PROFILE_UPDATED: 'Profiliniz başarıyla güncellendi!',
  ADDED_TO_CART: 'Ürün sepete eklendi!',
  ADDED_TO_FAVORITES: 'Ürün favorilere eklendi!',
} as const;

// Type exports
export type ProductCondition = typeof PRODUCT_CONSTANTS.CONDITIONS[keyof typeof PRODUCT_CONSTANTS.CONDITIONS];
export type ProductCategory = typeof PRODUCT_CONSTANTS.CATEGORIES[keyof typeof PRODUCT_CONSTANTS.CATEGORIES];
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
export type OrderStatus = typeof ORDER_CONSTANTS.STATUSES[keyof typeof ORDER_CONSTANTS.STATUSES];
export type TechnicalServiceStatus = typeof TECHNICAL_SERVICE.STATUSES[keyof typeof TECHNICAL_SERVICE.STATUSES];
export type MovingStatus = typeof MOVING_SERVICE.STATUSES[keyof typeof MOVING_SERVICE.STATUSES];
