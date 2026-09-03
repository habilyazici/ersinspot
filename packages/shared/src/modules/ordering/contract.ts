/**
 * Sipariş şemaları.
 *
 * KRİTİK TASARIM KARARI: sipariş oluşturma girdisi hiçbir tutar alanı içermez.
 * İstemci yalnızca *hangi ürünü* istediğini bildirir; fiyat, ara toplam,
 * teslimat ücreti ve genel toplam sunucuda veritabanından okunan fiyatlarla
 * hesaplanır.
 *
 * Eski kod tabanında toplam, istemcinin gönderdiği `item.price` değerlerinden
 * hesaplanıyordu (`items.reduce((sum, item) => sum + item.price, 0)`). Bu, herhangi
 * bir ürünün 1 ₺'ye sipariş edilmesine izin veriyordu. Şemanın fiyat alanı
 * içermemesi, aynı hatanın tekrar yazılmasını yapısal olarak engeller.
 */

import { z } from 'zod';
import {
  addressSchema,
  appointmentDateSchema,
  dateOnlySchema,
  fullNameSchema,
  optionalText,
  paginationSchema,
  phoneSchema,
  referenceNumberSchema,
  timeSlotSchema,
  uuidSchema,
} from '../../kernel/validation.ts';
import {
  DELIVERY_METHODS,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PRODUCT_CONDITIONS,
} from '../../kernel/status.ts';
import type { OrderStatus } from '../../kernel/status.ts';

// ---------------------------------------------------------------------------
// Sepet
// ---------------------------------------------------------------------------

/**
 * Sepet kalemi girdisi. Fiyat ve ADET taşımaz.
 *
 * İkinci el ürünler tekildir: bir ürünün stok adedi her zaman 1'dir ve yaşam
 * döngüsü bir sayaç değil, durum makinesidir (`for_sale → reserved → sold`).
 * Aynı buzdolabından "üç adet" diye bir şey yoktur.
 *
 * Şema önceden 1–10 arası adet kabul ediyordu. Arayüzde adet seçici hiç
 * olmadığı için bu alan yalnızca API'ye doğrudan istek atan biri tarafından
 * doldurulabiliyordu ve sonucu şuydu: sipariş kalemi `birim fiyat × adet`
 * tutarıyla yazılıyor, buna karşılık rezerve edilen ve satılan tek bir ürün
 * oluyordu — müşteri bir buzdolabı için üç buzdolabı parası ödüyordu. Alanı
 * kaldırmak, bu hatanın tekrar yazılmasını yapısal olarak engeller.
 */
export const cartItemInputSchema = z.object({
  productId: uuidSchema,
});

/** Sunucudan dönen sepet kalemi: fiyat ve güncel uygunluk bilgisiyle birlikte. */
export const cartItemSchema = z.object({
  productId: uuidSchema,
  slug: z.string(),
  title: z.string(),
  coverImageUrl: z.string().url().nullable(),
  condition: z.enum(PRODUCT_CONDITIONS),
  /** Kuruş cinsinden güncel fiyat. */
  price: z.number().int(),
  /**
   * Ürün sepete eklendikten sonra satıştan kalkmış olabilir. Bu durumda kalem
   * sepette görünmeye devam eder ama sipariş verilemez; arayüz bunu belirtir.
   */
  isAvailable: z.boolean(),
});

export type CartItem = z.infer<typeof cartItemSchema>;

export const cartSchema = z.object({
  items: z.array(cartItemSchema),
  subtotal: z.number().int(),
  /** Sepette artık satışta olmayan kalem var mı? Ödeme adımını engeller. */
  hasUnavailableItems: z.boolean(),
});

export type Cart = z.infer<typeof cartSchema>;

// ---------------------------------------------------------------------------
// Sipariş oluşturma
// ---------------------------------------------------------------------------

/**
 * Teslimat bilgileri.
 *
 * Mağazadan teslim alımda adres ve teslimat tarihi istenmez; ayrık birleşim
 * (discriminated union) sayesinde geçersiz kombinasyon oluşturulamaz.
 */
export const deliveryInputSchema = z.discriminatedUnion('method', [
  z.object({
    method: z.literal(DELIVERY_METHODS[0]), // store_pickup
    /** Müşterinin mağazaya geleceği gün. */
    pickupDate: appointmentDateSchema,
    pickupTimeSlot: timeSlotSchema,
  }),
  z.object({
    method: z.literal(DELIVERY_METHODS[1]), // home_delivery
    address: addressSchema,
    deliveryDate: appointmentDateSchema,
    deliveryTimeSlot: timeSlotSchema,
  }),
]);

/**
 * Sipariş oluşturma girdisi.
 *
 * `contact` alanı, oturum sahibi adına başkası için sipariş verilebilmesi içindir
 * (örneğin bir yakını adına). Kimlik doğrulama yine oturumdan gelir; bu alan
 * yalnızca teslimatta aranacak kişiyi belirtir.
 */
export const createOrderSchema = z.object({
  contact: z.object({
    fullName: fullNameSchema,
    phone: phoneSchema,
  }),
  delivery: deliveryInputSchema,
  paymentMethod: z.enum(PAYMENT_METHODS, {
    errorMap: () => ({ message: 'Lütfen bir ödeme yöntemi seçin.' }),
  }),
  note: optionalText(1000),
  /**
   * İstemcinin ekranda gördüğü toplam tutar (kuruş).
   *
   * Bu alan siparişin tutarını BELİRLEMEZ. Sunucu tutarı kendisi hesaplar ve
   * bu değerle karşılaştırır; uyuşmazsa siparişi reddedip güncel tutarı döndürür.
   * Amaç, kullanıcının onayladığı fiyat ile tahsil edilen fiyatın farklı olmasını
   * engellemektir (ürün fiyatı sepetteyken değişmiş olabilir).
   */
  expectedTotal: z.number().int().nonnegative(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// ---------------------------------------------------------------------------
// Sipariş görünümü
// ---------------------------------------------------------------------------

export const orderItemSchema = z.object({
  id: uuidSchema,
  productId: uuidSchema.nullable(),
  /**
   * Sipariş anındaki ürün bilgisinin kopyası. Ürün sonradan silinse veya
   * değiştirilse bile siparişin geçmişi bozulmaz.
   */
  titleSnapshot: z.string(),
  imageUrlSnapshot: z.string().url().nullable(),
  conditionSnapshot: z.enum(PRODUCT_CONDITIONS),
  /** Sipariş anındaki fiyat. Ürün fiyatı sonradan değişse bile sabit kalır. */
  price: z.number().int(),
});

export const orderStatusEventSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().nullable(),
  occurredAt: z.string().datetime(),
});

export const orderSchema = z.object({
  id: uuidSchema,
  referenceNumber: referenceNumberSchema,
  status: z.enum(ORDER_STATUSES),
  items: z.array(orderItemSchema),

  contactName: z.string(),
  contactPhone: z.string(),

  deliveryMethod: z.enum(DELIVERY_METHODS),
  deliveryAddress: addressSchema.nullable(),
  deliveryDate: z.string().nullable(),
  deliveryTimeSlot: timeSlotSchema.nullable(),

  paymentMethod: z.enum(PAYMENT_METHODS),

  subtotal: z.number().int(),
  deliveryFee: z.number().int(),
  total: z.number().int(),

  note: z.string().nullable(),
  /** Yalnızca yönetim panelinde görünen not. Müşteriye gönderilen yanıtlarda yer almaz. */
  staffNote: z.string().nullable().optional(),

  timeline: z.array(orderStatusEventSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Order = z.infer<typeof orderSchema>;

export const orderSummarySchema = orderSchema
  .pick({
    id: true,
    referenceNumber: true,
    status: true,
    total: true,
    deliveryMethod: true,
    deliveryDate: true,
    createdAt: true,
  })
  .extend({
    itemCount: z.number().int(),
    /** Listede göstermek için ilk kalemin başlığı. */
    previewTitle: z.string(),
    previewImageUrl: z.string().url().nullable(),
  });

export type OrderSummary = z.infer<typeof orderSummarySchema>;

// ---------------------------------------------------------------------------
// Sipariş işlemleri
// ---------------------------------------------------------------------------

export const cancelOrderSchema = z.object({
  reason: optionalText(500),
});

/** Yönetim panelinden durum değiştirme. Geçişin geçerliliği sunucuda doğrulanır. */
export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: optionalText(500),
});

export const orderListQuerySchema = paginationSchema.extend({
  status: z.enum(ORDER_STATUSES).optional(),
});

export type OrderListQuery = z.infer<typeof orderListQuerySchema>;

/**
 * Yönetim paneli sipariş listesi süzgeçleri.
 *
 * Tarih alanları takvim günü şemasından geçer. Serbest metin kabul edildiğinde
 * sunucu bu değeri `new Date(...)` içine koyuyor ve geçersiz bir gün ("dun"
 * gibi) sorgu sürücüsünde `Invalid time value` ile 500'e dönüşüyordu: bir
 * süzgeç parametresi, doğrulanmadığı için hata sayfasına çıkıyordu.
 */
export const adminOrderListQuerySchema = paginationSchema.extend({
  status: z.enum(ORDER_STATUSES).optional(),
  search: z.string().trim().max(120).optional(),
  fromDate: dateOnlySchema.optional(),
  toDate: dateOnlySchema.optional(),
});

export type AdminOrderListQuery = z.infer<typeof adminOrderListQuerySchema>;

/** Sipariş oluşturma ucunun yanıtı. */
export interface CreateOrderResult {
  readonly orderId: string;
  readonly referenceNumber: string;
  readonly totalKurus: number;
}

/**
 * Sipariş takibi sorgusu.
 *
 * Takip numarası TEK BAŞINA yeterli değildir. Numaralar sırayla üretilir
 * ("SIP-2026-000123"); yalnızca numarayla sorgulanabilen bir uç, sayacı
 * artırarak mağazanın tüm siparişlerinin durumunun, tarihinin ve zaman
 * çizelgesinin dışarıdan taranabilmesi demektir. Hız sınırı bunu yavaşlatır
 * ama engellemez.
 *
 * Bu yüzden siparişin iletişim numarası da istenir: müşterinin bildiği,
 * saldırganın numaradan türetemeyeceği ikinci bir bilgi.
 */
export const orderTrackingQuerySchema = z.object({
  reference: referenceNumberSchema,
  phone: phoneSchema,
});

export type OrderTrackingQuery = z.infer<typeof orderTrackingQuerySchema>;

/**
 * Takip numarasıyla sorgulanan sipariş durumu.
 *
 * Oturum gerektirmeyen bir uçtan döndüğü için bilinçli olarak DARDIR: adres,
 * telefon ve kalem fiyatları yer almaz. Sorgulayan kişi siparişin iletişim
 * numarasını bildiğini kanıtlamış olsa da, oturumsuz bir uçta gösterilen
 * kişisel veri en aza indirilir.
 */
export interface PublicOrderStatus {
  readonly referenceNumber: string;
  readonly status: OrderStatus;
  readonly itemCount: number;
  readonly deliveryDate: string | null;
  readonly createdAt: string;
  readonly timeline: readonly { status: OrderStatus; occurredAt: string }[];
}

// ---------------------------------------------------------------------------
// Favoriler
// ---------------------------------------------------------------------------

export const toggleFavoriteSchema = z.object({
  productId: uuidSchema,
});
