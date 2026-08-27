/**
 * Sipariş şemaları.
 *
 * KRİTİK TASARIM KARARI: sipariş oluşturma girdisi hiçbir tutar alanı içermez.
 * İstemci yalnızca *hangi ürünü* ve *kaç adet* istediğini bildirir; birim fiyat,
 * ara toplam, teslimat ücreti ve genel toplam sunucuda veritabanından okunan
 * fiyatlarla hesaplanır.
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

// ---------------------------------------------------------------------------
// Sepet
// ---------------------------------------------------------------------------

/**
 * Sepet kalemi girdisi. Fiyat taşımaz.
 *
 * İkinci el ürünler tekil olduğu için adet üst sınırı düşüktür; model ileride
 * çok adetli ürünleri desteklesin diye alan korunmuştur.
 */
export const cartItemInputSchema = z.object({
  productId: uuidSchema,
  quantity: z
    .number()
    .int({ message: 'Adet tam sayı olmalıdır.' })
    .min(1, { message: 'Adet en az 1 olmalıdır.' })
    .max(10, { message: 'Bu üründen en fazla 10 adet alabilirsiniz.' })
    .default(1),
});

export type CartItemInput = z.infer<typeof cartItemInputSchema>;

/** Sunucudan dönen sepet kalemi: fiyat ve güncel uygunluk bilgisiyle birlikte. */
export const cartItemSchema = z.object({
  productId: uuidSchema,
  slug: z.string(),
  title: z.string(),
  coverImageUrl: z.string().url().nullable(),
  condition: z.enum(PRODUCT_CONDITIONS),
  /** Kuruş cinsinden güncel birim fiyat. */
  unitPrice: z.number().int(),
  quantity: z.number().int(),
  lineTotal: z.number().int(),
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

export type DeliveryInput = z.infer<typeof deliveryInputSchema>;

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
  unitPrice: z.number().int(),
  quantity: z.number().int(),
  lineTotal: z.number().int(),
});

export type OrderItem = z.infer<typeof orderItemSchema>;

export const orderStatusEventSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().nullable(),
  occurredAt: z.string().datetime(),
});

export type OrderStatusEvent = z.infer<typeof orderStatusEventSchema>;

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

export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;

/** Yönetim panelinden durum değiştirme. Geçişin geçerliliği sunucuda doğrulanır. */
export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: optionalText(500),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const orderListQuerySchema = paginationSchema.extend({
  status: z.enum(ORDER_STATUSES).optional(),
});

export type OrderListQuery = z.infer<typeof orderListQuerySchema>;

export const adminOrderListQuerySchema = paginationSchema.extend({
  status: z.enum(ORDER_STATUSES).optional(),
  search: z.string().trim().max(120).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

export type AdminOrderListQuery = z.infer<typeof adminOrderListQuerySchema>;

// ---------------------------------------------------------------------------
// Favoriler
// ---------------------------------------------------------------------------

export const toggleFavoriteSchema = z.object({
  productId: uuidSchema,
});

export type ToggleFavoriteInput = z.infer<typeof toggleFavoriteSchema>;
