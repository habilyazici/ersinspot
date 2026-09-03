/**
 * Sipariş ve sepet HTTP uçları.
 *
 * Yetkilendirme rota tanımında bildirilir. Sepet ve sipariş uçlarının tamamı
 * oturum gerektirir; tek istisna takip numarasıyla sipariş durumu sorgulamadır.
 *
 * Eski kod tabanında `/orders/customer/:email` ucu, URL'deki e-postanın oturum
 * sahibine ait olup olmadığını hiç kontrol etmiyordu — herkes herkesin sipariş
 * geçmişini okuyabiliyordu.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import {
  MAX_PAGE_SIZE,
  addStaffNoteSchema,
  adminOrderListQuerySchema,
  cancelOrderSchema,
  cartItemInputSchema,
  createOrderSchema,
  orderListQuerySchema,
  toggleFavoriteSchema,
  updateOrderStatusSchema,
  uuidSchema,
} from '@ersinspot/shared';
import type { AuthVariables } from '../../../platform/http/auth.ts';
import { currentUser, requireAuth, requireStaff } from '../../../platform/http/auth.ts';
import type { ValidatedVariables } from '../../../platform/http/validate.ts';
import {
  body,
  params,
  query,
  validateBody,
  validateParams,
  validateQuery,
} from '../../../platform/http/validate.ts';
import { rateLimit } from '../../../platform/http/security.ts';
import * as cartService from '../application/cart-service.ts';
import * as favoriteService from '../application/favorite-service.ts';
import * as orderService from '../application/order-service.ts';

type Variables = AuthVariables & ValidatedVariables;

const idParamSchema = z.object({ id: uuidSchema });
const productIdParamSchema = z.object({ productId: uuidSchema });
const referenceParamSchema = z.object({
  reference: z
    .string()
    .regex(/^(SIP|NAK|TSV|SAT)-\d{4}-\d{6}$/, { message: 'Geçersiz takip numarası.' }),
});

/**
 * Tek istekte sorulabilecek en fazla favori durumu.
 *
 * Sayfa boyutunun üst sınırıyla aynıdır: liste ekranı en fazla o kadar ürün
 * gösterir ve daha fazlasını sormasının bir nedeni yoktur.
 */
const MAX_FAVORITE_LOOKUP = MAX_PAGE_SIZE;

export const orderingRoutes = new Hono<{ Variables: Variables }>();

// ---------------------------------------------------------------------------
// Sepet
// ---------------------------------------------------------------------------

orderingRoutes.get('/cart', requireAuth, async (c) => {
  return c.json({ cart: await cartService.getCart(currentUser(c).id) });
});

orderingRoutes.get('/cart/count', requireAuth, async (c) => {
  return c.json({ count: await cartService.getCartCount(currentUser(c).id) });
});

orderingRoutes.post('/cart', requireAuth, validateBody(cartItemInputSchema), async (c) => {
  const input = body(c, cartItemInputSchema);
  const cart = await cartService.addToCart(currentUser(c).id, input.productId, input.quantity);
  return c.json({ cart }, 201);
});

orderingRoutes.delete(
  '/cart/:productId',
  requireAuth,
  validateParams(productIdParamSchema),
  async (c) => {
    const { productId } = params(c, productIdParamSchema);
    return c.json({ cart: await cartService.removeFromCart(currentUser(c).id, productId) });
  },
);

orderingRoutes.delete('/cart', requireAuth, async (c) => {
  return c.json({ cart: await cartService.clearCart(currentUser(c).id) });
});

// ---------------------------------------------------------------------------
// Favoriler
// ---------------------------------------------------------------------------
// Oturum gerektirir: favori kişiye özeldir ve kullanıcıya bağlı saklanır.

orderingRoutes.get('/favorites', requireAuth, async (c) => {
  return c.json({ products: await favoriteService.listFavorites(currentUser(c).id) });
});

/**
 * Favoriye ekler veya çıkarır.
 *
 * Tek uç, iki yön: istemci mevcut durumu bilmek zorunda kalmasın diye. Yanıt
 * işlem sonundaki durumu bildirir; arayüz kalp simgesini ona göre çizer.
 */
orderingRoutes.post('/favorites', requireAuth, validateBody(toggleFavoriteSchema), async (c) => {
  const { productId } = body(c, toggleFavoriteSchema);
  const isFavorite = await favoriteService.toggleFavorite(currentUser(c).id, productId);

  return c.json({ isFavorite });
});

/** Verilen ürünlerden hangileri favoride? Liste ekranı tek istekte sorar. */
const favoriteQuerySchema = z.object({
  productIds: z
    .string()
    .transform((value) => value.split(',').filter((id) => id !== ''))
    .pipe(z.array(uuidSchema).max(MAX_FAVORITE_LOOKUP)),
});

orderingRoutes.get(
  '/favorites/status',
  requireAuth,
  validateQuery(favoriteQuerySchema),
  async (c) => {
    const { productIds } = query(c, favoriteQuerySchema);
    const favorited = await favoriteService.findFavoritedIds(currentUser(c).id, productIds);

    return c.json({ favorited });
  },
);

// ---------------------------------------------------------------------------
// Sipariş oluşturma
// ---------------------------------------------------------------------------

orderingRoutes.post(
  '/orders',
  requireAuth,
  // Sipariş oluşturma pahalı bir işlemdir (kilit, çok tablolu yazma);
  // kötüye kullanıma karşı sınırlanır.
  rateLimit(20, 60 * 60 * 1000, 'siparis-olustur'),
  validateBody(createOrderSchema),
  async (c) => {
    const input = body(c, createOrderSchema);
    const result = await orderService.createOrder(currentUser(c).id, input);
    return c.json({ order: result }, 201);
  },
);

// ---------------------------------------------------------------------------
// Sipariş okuma
// ---------------------------------------------------------------------------

orderingRoutes.get('/orders', requireAuth, validateQuery(orderListQuerySchema), async (c) => {
  const filters = query(c, orderListQuerySchema);
  return c.json(await orderService.listMyOrders(currentUser(c).id, filters));
});

orderingRoutes.get('/orders/:id', requireAuth, validateParams(idParamSchema), async (c) => {
  const { id } = params(c, idParamSchema);
  const user = currentUser(c);

  // Sahiplik denetimi servis katmanında yapılır: müşteri yalnızca kendi
  // siparişini görebilir, personel hepsini.
  return c.json({ order: await orderService.getOrder(id, user) });
});

/**
 * Takip numarasıyla sipariş durumu — oturum gerektirmez.
 *
 * Eski sitede bu özellik vardı ama tamamen sahte veriyle çalışıyordu; gerçek
 * bir müşteri kendi sipariş numarasını girdiğinde "bulunamadı" alıyordu.
 *
 * Dönen bilgi bilinçli olarak dardır: adres, telefon ve fiyat yer almaz.
 * Hız sınırı, takip numarası taraması yapılmasını zorlaştırır.
 */
orderingRoutes.get(
  '/order-tracking/:reference',
  rateLimit(30, 15 * 60 * 1000, 'siparis-takip'),
  validateParams(referenceParamSchema),
  async (c) => {
    const { reference } = params(c, referenceParamSchema);
    return c.json({ order: await orderService.getPublicOrderStatus(reference) });
  },
);

// ---------------------------------------------------------------------------
// Sipariş işlemleri
// ---------------------------------------------------------------------------

orderingRoutes.post(
  '/orders/:id/cancel',
  requireAuth,
  validateParams(idParamSchema),
  validateBody(cancelOrderSchema),
  async (c) => {
    const { id } = params(c, idParamSchema);
    const input = body(c, cancelOrderSchema);

    await orderService.cancelOrder(id, currentUser(c), input.reason);
    return c.json({ success: true });
  },
);

// ---------------------------------------------------------------------------
// Yönetim
// ---------------------------------------------------------------------------

orderingRoutes.get(
  '/admin/orders',
  requireStaff,
  validateQuery(adminOrderListQuerySchema),
  async (c) => {
    const filters = query(c, adminOrderListQuerySchema);
    return c.json(await orderService.listOrdersForAdmin(filters));
  },
);

/**
 * Personel notu.
 *
 * Yalnızca personelin gördüğü serbest metin; müşteri yanıtlarında hiç yer
 * almaz (`buildOrderView` alanı role göre ekler). Hizmet talebiyle aynı
 * sözleşme: boş metin notu siler.
 *
 * Sütun, servis fonksiyonu ve müşteriden gizleme baştan vardı ama notu yazacak
 * bir uç yoktu; personel siparişe not düşemiyordu.
 */
orderingRoutes.put(
  '/admin/orders/:id/staff-note',
  requireStaff,
  validateParams(idParamSchema),
  validateBody(addStaffNoteSchema),
  async (c) => {
    const { id } = params(c, idParamSchema);
    const input = body(c, addStaffNoteSchema);

    await orderService.setStaffNote(id, input.note);
    return c.json({ success: true });
  },
);

orderingRoutes.patch(
  '/admin/orders/:id/status',
  requireStaff,
  validateParams(idParamSchema),
  validateBody(updateOrderStatusSchema),
  async (c) => {
    const { id } = params(c, idParamSchema);
    const input = body(c, updateOrderStatusSchema);

    await orderService.changeOrderStatus(id, input.status, currentUser(c), input.note);
    return c.json({ success: true });
  },
);
