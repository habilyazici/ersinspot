// MERKEZI VERİ YAPILARI - TÜM SİSTEMDE KULLANILACAK

// ============= ÜRÜN VERİ YAPILARI =============
export interface Product {
  id: number | string;
  title: string;
  price: number;
  images: string[];
  condition: 'Az Kullanılmış' | 'İkinci El';
  category: 'Beyaz Eşya' | 'Elektronik' | 'Mobilya';
  brand: string;
  location: string;
  date: string;
  isFavorite: boolean;
  warranty?: string;
  deliveryInfo?: string;
  stock?: string;
  features?: {
    model?: string;
    color?: string;
    energyClass?: string;
    capacity?: string;
    year?: string;
    dimensions?: string;
    [key: string]: string | undefined;
  };
  description?: string;
}

// ============= SİPARİŞ VERİ YAPILARI =============
export interface OrderItem {
  name: string;
  price: number;
  image: string;
  quantity?: number;
  productId?: number | string;
}

export interface Order {
  id: string;
  orderNumber: string;
  orderDate: string;
  deliveryDate?: string;
  items: OrderItem[];
  status: 'payment_pending' | 'payment_received' | 'processing' | 'in_transit' | 'delivered';
  total: number;
  deliveryAddress: string;
  paymentMethod?: string;
  trackingNumber?: string;
}

// ============= TEKNİK SERVİS VERİ YAPILARI =============
export interface TechnicalServiceAppointment {
  id: string;
  appointmentNumber: string;
  deviceType: string;
  brand: string;
  model: string;
  problem: string;
  appointmentDate: string;
  appointmentTime: string;
  status: 'confirmed' | 'completed' | 'pending' | 'cancelled';
  address: string;
  name: string;
  phone: string;
  email: string;
  photos?: string[];
  videos?: string[];
  estimatedPrice?: number;
  finalPrice?: number;
  technicianNotes?: string;
  createdAt: string;
}

// ============= TAŞIMACİLIK VERİ YAPILARI =============
export interface MovingItem {
  name: string;
  quantity: number;
  category?: string;
}

export interface MovingAppointment {
  id: string;
  appointmentNumber: string;
  fromAddress: string;
  fromDistrict?: string;
  toAddress: string;
  toDistrict?: string;
  distance?: number;
  appointmentDate: string;
  appointmentTime: string;
  homeSize: string;
  floor: string;
  hasElevator: boolean;
  items: MovingItem[];
  status: 'confirmed' | 'completed' | 'pending' | 'cancelled';
  name: string;
  phone: string;
  email: string;
  estimatedPrice?: number;
  finalPrice?: number;
  teamSize?: number;
  vehicleType?: string;
  notes?: string;
  createdAt: string;
}

// ============= ÜRÜN SATIŞI VERİ YAPILARI =============
export interface SellProductApplication {
  id: string;
  applicationNumber: string;
  title: string;
  category: 'Beyaz Eşya' | 'Elektronik' | 'Mobilya';
  condition: 'Az Kullanılmış' | 'İkinci El';
  description: string;
  brand: string;
  model: string;
  year?: string;
  warranty?: string;
  expectedPrice: number;
  images: string[];
  status: 'pending' | 'approved' | 'rejected' | 'purchased';
  name: string;
  phone: string;
  email: string;
  address: string;
  estimatedOffer?: number;
  finalOffer?: number;
  adminNotes?: string;
  createdAt: string;
}

// ============= KULLANICI VERİ YAPILARI =============
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  memberSince: string;
  role: 'customer' | 'admin';
}

// ============= RAPOR VERİ YAPILARI =============
export interface Report {
  id: string;
  type: 'order' | 'service' | 'moving';
  referenceNumber: string;
  date: string;
  customerName: string;
  description: string;
  status: string;
  total?: number;
}

// ============= FİLTRE VERİ YAPILARI =============
export interface ProductFilters {
  category: string;
  condition: string;
  priceRange: [number, number];
  brand?: string;
  search?: string;
  sortBy: 'date-desc' | 'date-asc' | 'price-asc' | 'price-desc';
}

// ============= SEPET VERİ YAPILARI =============
export interface CartItem {
  productId: number | string;
  product: Product;
  quantity: number;
  addedAt: string;
}

export interface Cart {
  items: CartItem[];
  total: number;
  itemCount: number;
}

// ============= İSTATİSTİK VERİ YAPILARI =============
export interface CustomerStats {
  totalOrders: number;
  totalServiceRequests: number;
  totalMovingRequests: number;
  totalFavorites: number;
}

export interface AdminStats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingAppointments: number;
  completedServices: number;
  activeUsers: number;
}

// ============= DURUM KONFIGÜRASYONLARI =============
// 5 Aşamalı Sipariş Durumları (Database Snake_Case Format)
// Tutarlı Renk Paleti: blue, orange, green, red
export const ORDER_STATUS_CONFIG = {
  payment_pending: { label: 'Ödeme Bekliyor', color: 'orange', icon: '💳' },
  order_received: { label: 'Sipariş Alındı', color: 'blue', icon: '✅' },
  processing: { label: 'Hazırlanıyor', color: 'blue', icon: '📦' },
  in_transit: { label: 'Taşınıyor', color: 'orange', icon: '🚚' },
  delivered: { label: 'Teslim Edildi', color: 'green', icon: '✔️' },
  cancelled: { label: 'İptal Edildi', color: 'red', icon: '❌' },
} as const;

export const APPOINTMENT_STATUS_CONFIG = {
  confirmed: { label: 'Onaylandı', color: 'green' },
  completed: { label: 'Tamamlandı', color: 'green' },
  pending: { label: 'Beklemede', color: 'blue' },
  cancelled: { label: 'İptal Edildi', color: 'red' },
} as const;

export const APPLICATION_STATUS_CONFIG = {
  pending: { label: 'İnceleniyor', color: 'blue' },
  approved: { label: 'Onaylandı', color: 'green' },
  rejected: { label: 'Reddedildi', color: 'red' },
  purchased: { label: 'Satın Alındı', color: 'green' },
} as const;

// ============= SABİT DEĞERLER =============
export const SITE_STATS = {
  happyCustomers: '5000+',
  yearsOfExperience: '10+',
  completedServices: '5000+',
  satisfactionRate: '%94',
} as const;

export const CATEGORIES = ['Beyaz Eşya', 'Elektronik', 'Mobilya'] as const;
export const CONDITIONS = ['Az Kullanılmış', 'İkinci El'] as const;

export const HOME_SIZES = [
  '1+0 (35-50 m²)',
  '1+1 (50-75 m²)',
  '2+1 (75-100 m²)',
  '3+1 (100-130 m²)',
  '4+1 (130-160 m²)',
  '5+1 ve üzeri (160+ m²)',
] as const;