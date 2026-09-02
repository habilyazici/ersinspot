/**
 * Ürün kataloğu şemaları.
 *
 * Eski kod tabanında ürün fiyatı `parseFloat` ile ondalıklı sayı olarak alınıyor ve
 * ürün oluşturma ucu yetki kontrolü olmadan herkese açık duruyordu. Burada fiyat
 * kuruş cinsinden tam sayı olarak doğrulanır; yetkilendirme ise şemanın değil,
 * sunucudaki rota tanımının sorumluluğundadır.
 */

import { z } from 'zod';
import {
  MAX_IMAGES_PER_REQUEST,
  MIN_PRODUCT_IMAGES,
  optionalText,
  paginationSchema,
  positiveKurusSchema,
  requiredText,
  uuidSchema,
} from '../../kernel/validation.ts';
import { PRODUCT_CONDITIONS, PRODUCT_STATUSES } from '../../kernel/status.ts';

// ---------------------------------------------------------------------------
// Kategori ve marka
// ---------------------------------------------------------------------------

export const slugSchema = z
  .string()
  .min(1, { message: 'Bağlantı adı zorunludur.' })
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Bağlantı adı yalnızca küçük harf, rakam ve tire içerebilir.',
  });

/**
 * Ürünün içinde taşınan kısa kategori/marka göndermesi.
 *
 * Tam kayıt değil, yalnızca bağlantı kurmaya yetecek alanlar: liste yanıtları
 * her ürünle birlikte bunu da taşır ve fazlası ağ trafiğini şişirir.
 */
export const categoryRefSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  slug: slugSchema,
});

export const brandRefSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  slug: slugSchema,
});

/**
 * Vitrin menüsündeki kategori ağacının bir düğümü.
 *
 * `GET /api/categories` yanıtının biçimidir. Sunucu ve tarayıcı AYNI tipi
 * kullanır; önceden ikisi de kendi kopyasını tanımlıyordu ve alan eklendiğinde
 * birinin unutulması işten değildi.
 *
 * Şema değil arayüz olarak tanımlıdır: yalnızca yanıt biçimidir, hiçbir yerde
 * gelen veri olarak doğrulanmaz. Özyinelemeli bir zod şeması burada karşılığı
 * olmayan bir karmaşıklık getirirdi.
 */
export interface CategoryNode {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly displayOrder: number;
  /** Bu kategoride ve alt kategorilerinde satıştaki ürün sayısı. */
  readonly productCount: number;
  readonly children: readonly CategoryNode[];
}

/** `GET /api/brands` yanıtının biçimi. Ürünü olmayan markalar listelenmez. */
export interface BrandSummary {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  /** Depolama anahtarından türetilen görüntüleme adresi. */
  readonly logoUrl: string | null;
  readonly productCount: number;
}

// ---------------------------------------------------------------------------
// Ürün
// ---------------------------------------------------------------------------

export const productImageSchema = z.object({
  id: uuidSchema,
  url: z.string().url(),
  /**
   * Görselin kalıcı depolama anahtarı.
   *
   * Yönetim panelindeki düzenleme formu ürünü yeniden gönderirken bu anahtarı
   * kullanır; adresten geri çıkarmak, istemcinin depolama yapılandırmasını
   * bilmesini gerektirirdi. Anahtar zaten adresin içinde göründüğü için ayrıca
   * bir bilgi sızdırmaz.
   */
  storageKey: z.string(),
  /** Erişilebilirlik için görsel açıklaması. */
  altText: z.string(),
  displayOrder: z.number().int(),
});

/** Ürüne özgü teknik bilgiler: "Enerji Sınıfı: A++", "Kapasite: 9 kg" gibi. */
export const productSpecSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export const productSchema = z.object({
  id: uuidSchema,
  slug: slugSchema,
  title: z.string(),
  description: z.string(),
  /** Kuruş cinsinden. Arayüzde `money.format` ile gösterilir. */
  price: z.number().int(),
  condition: z.enum(PRODUCT_CONDITIONS),
  status: z.enum(PRODUCT_STATUSES),
  /** Garanti süresi (ay). 0 ise garanti yok. */
  warrantyMonths: z.number().int().min(0),
  category: categoryRefSchema,
  brand: brandRefSchema.nullable(),
  images: z.array(productImageSchema),
  specs: z.array(productSpecSchema),
  viewCount: z.number().int().nonnegative(),
  favoriteCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Product = z.infer<typeof productSchema>;

/**
 * Ürün detay ucunun yanıtı.
 *
 * `warrantyLabel`, garanti ayının okunabilir karşılığıdır ("2 Yıl Garanti").
 * Sunucuda üretilir: aynı metni iki tarafta ayrı hesaplamak, bir gün ikisinin
 * ayrışması demektir.
 */
export interface ProductDetail extends Product {
  readonly warrantyLabel: string;
}

/** Liste görünümünde taşınan hafif ürün özeti. Ağ trafiğini gereksiz büyütmemek için. */
export const productSummarySchema = productSchema
  .pick({
    id: true,
    slug: true,
    title: true,
    price: true,
    condition: true,
    status: true,
    category: true,
    brand: true,
    createdAt: true,
  })
  .extend({
    /** Yalnızca kapak görseli. */
    coverImage: productImageSchema.nullable(),
    favoriteCount: z.number().int().nonnegative(),
  });

export type ProductSummary = z.infer<typeof productSummarySchema>;

// ---------------------------------------------------------------------------
// Ürün oluşturma / güncelleme
// ---------------------------------------------------------------------------

const productImageInputSchema = z.object({
  /** Yükleme ucundan dönen kalıcı depolama anahtarı. */
  storageKey: z.string().min(1),
  altText: optionalText(200),
});

export const createProductSchema = z.object({
  title: requiredText('Ürün başlığı', 5, 160),
  description: requiredText('Ürün açıklaması', 20, 5000),
  price: positiveKurusSchema,
  condition: z.enum(PRODUCT_CONDITIONS, {
    errorMap: () => ({ message: 'Lütfen ürün durumunu seçin.' }),
  }),
  status: z.enum(PRODUCT_STATUSES).default('draft'),
  warrantyMonths: z.number().int().min(0).max(60).default(0),
  categoryId: uuidSchema,
  brandId: uuidSchema.nullable().default(null),
  images: z
    .array(productImageInputSchema)
    .min(MIN_PRODUCT_IMAGES, {
      message: `En az ${MIN_PRODUCT_IMAGES} fotoğraf yüklemelisiniz.`,
    })
    .max(MAX_IMAGES_PER_REQUEST, {
      message: `En fazla ${MAX_IMAGES_PER_REQUEST} fotoğraf yükleyebilirsiniz.`,
    }),
  specs: z
    .array(
      z.object({
        key: requiredText('Özellik adı', 1, 60),
        value: requiredText('Özellik değeri', 1, 200),
      }),
    )
    .max(30, { message: 'En fazla 30 özellik ekleyebilirsiniz.' })
    .default([]),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

/** Güncellemede tüm alanlar isteğe bağlıdır; yalnızca gönderilenler değiştirilir. */
export const updateProductSchema = createProductSchema.partial();

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

/** Durum değişikliği ayrı bir uçtur: geçiş kuralları sunucuda ayrıca doğrulanır. */
export const updateProductStatusSchema = z.object({
  status: z.enum(PRODUCT_STATUSES),
});

// ---------------------------------------------------------------------------
// Listeleme ve filtreleme
// ---------------------------------------------------------------------------

export const PRODUCT_SORT_OPTIONS = [
  'newest',
  'oldest',
  'price_asc',
  'price_desc',
  'most_viewed',
  'most_favorited',
] as const;

export type ProductSort = (typeof PRODUCT_SORT_OPTIONS)[number];

export const PRODUCT_SORT_LABELS: Readonly<Record<ProductSort, string>> = {
  newest: 'En Yeni',
  oldest: 'En Eski',
  price_asc: 'Fiyat: Düşükten Yükseğe',
  price_desc: 'Fiyat: Yüksekten Düşüğe',
  most_viewed: 'En Çok Görüntülenen',
  most_favorited: 'En Çok Favorilenen',
};

/**
 * Ürün listesi filtreleri.
 *
 * `status` alanı bilinçli olarak yoktur: hangi durumdaki ürünlerin görüneceğine
 * sunucu karar verir. Müşteri yalnızca satıştaki ürünleri görür; yönetim panelinin
 * kendi ayrı ucu vardır. Eski kodda `showAll=true` parametresiyle taslak ürünler
 * dışarıdan listelenebiliyordu.
 */
export const productListQuerySchema = paginationSchema
  .extend({
    categorySlug: slugSchema.optional(),
    brandSlug: slugSchema.optional(),
    condition: z.enum(PRODUCT_CONDITIONS).optional(),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    search: z.string().trim().max(120).optional(),
    sort: z.enum(PRODUCT_SORT_OPTIONS).default('newest'),
  })
  .refine(
    (query) =>
      query.minPrice === undefined ||
      query.maxPrice === undefined ||
      query.minPrice <= query.maxPrice,
    { message: 'En düşük fiyat, en yüksek fiyattan büyük olamaz.', path: ['minPrice'] },
  );

export type ProductListQuery = z.infer<typeof productListQuerySchema>;

/** Yönetim panelinin ürün listesi: durum filtresine izin verir. */
export const adminProductListQuerySchema = paginationSchema.extend({
  categoryId: uuidSchema.optional(),
  brandId: uuidSchema.optional(),
  condition: z.enum(PRODUCT_CONDITIONS).optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  search: z.string().trim().max(120).optional(),
  sort: z.enum(PRODUCT_SORT_OPTIONS).default('newest'),
});

export type AdminProductListQuery = z.infer<typeof adminProductListQuerySchema>;
