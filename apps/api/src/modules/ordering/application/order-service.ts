/**
 * Sipariş oluşturma ve yönetimi.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BU DOSYA, DENETİMDEKİ EN CİDDİ MALİ AÇIĞIN KAPANDIĞI YERDİR.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Eski kod tabanında sipariş toplamı istemcinin gönderdiği fiyatlardan
 * hesaplanıyordu:
 *
 *     const subtotal = items.reduce((sum, item) => sum + item.price, 0);
 *     const deliveryFee = delivery.fee || 0;
 *     const total = subtotal + deliveryFee;
 *
 * Bu, herhangi bir ürünün 1 TL'ye sipariş edilmesine izin veriyordu. Ayrıca
 * `quantity` hesaba katılmıyordu: üç adet ürün bir adet fiyatına gidiyordu.
 *
 * Yeni tasarımda bu hatayı tekrar yazmak yapısal olarak zordur:
 *
 *  1. `createOrderSchema` hiçbir fiyat alanı içermez — istemci yalnızca hangi
 *     ürünü ve kaç adet istediğini bildirir.
 *  2. Bu modül `products` tablosuna erişemez (ESLint sınır kuralı); fiyatı
 *     `catalog` modülünün sözleşmesinden ister.
 *  3. Tutar `@ersinspot/shared` içindeki saf fonksiyonla hesaplanır.
 *  4. Veritabanı kısıtı toplamın bileşenlerine eşit olmasını zorunlu kılar.
 *
 * İstemcinin ekranda gördüğü tutar (`expectedTotal`) yalnızca DOĞRULAMA için
 * kullanılır: sunucunun hesabıyla uyuşmazsa sipariş reddedilir ve güncel tutar
 * döndürülür. Amaç, kullanıcının onayladığı fiyattan farklı bir tutarın tahsil
 * edilmemesidir — ürün fiyatı sepetteyken değişmiş olabilir.
 */

import type {
  CreateOrderInput,
  CreateOrderResult,
  IzmirDistrict,
  Order,
  OrderListQuery,
  OrderStatus,
  OrderSummary,
  Paginated,
  PublicOrderStatus,
  UserRole,
} from '@ersinspot/shared';
import { calculateOrderTotals, money, paginate } from '@ersinspot/shared';
import { catalog } from '../../catalog/index.ts';
import { db } from '../../../platform/db/client.ts';
import { generateReferenceNumber } from '../../../platform/db/reference-number.ts';
import { resolveStorageUrl } from '../../../platform/storage.ts';
import { assertCanAccess, isStaff } from '../../../platform/authorization.ts';
import { logger } from '../../../platform/observability/logger.ts';
import {
  businessRule,
  conflict,
  invalidTransition,
  notFound,
} from '../../../platform/errors/index.ts';
import {
  canCancelOrder,
  canTransitionOrder,
  completesSale,
  initialOrderStatus,
  releasesReservation,
  requiresUpfrontPayment,
} from '../domain/order-rules.ts';
import * as cartRepository from '../infrastructure/cart-repository.ts';
import * as repository from '../infrastructure/order-repository.ts';
import type { OrderItemRow, OrderRow } from '../infrastructure/order-repository.ts';

// ---------------------------------------------------------------------------
// Sipariş oluşturma
// ---------------------------------------------------------------------------

/**
 * Sepetteki ürünlerden sipariş oluşturur.
 *
 * Tümü tek işlemde yapılır: ürünler kilitlenir, tutar hesaplanır, sipariş ve
 * kalemleri yazılır, ürünler rezerve edilir, sepet boşaltılır. Herhangi biri
 * başarısız olursa hiçbiri kalıcı olmaz.
 */
export async function createOrder(
  userId: string,
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  return db.transaction(async (tx) => {
    // 1) Sepeti oku.
    const cartRows = await cartRepository.findByUser(userId, tx);

    if (cartRows.length === 0) {
      throw businessRule('Sepetiniz boş. Sipariş oluşturmak için önce ürün ekleyin.');
    }

    /*
     * 2) Ürün bilgilerini KATALOG MODÜLÜNDEN al.
     *
     * Bu çağrı satırları `FOR UPDATE` ile kilitler: iki müşteri aynı tekil
     * ürünü aynı anda sipariş etmeye çalışırsa ikincisi ilkinin işlemi bitene
     * kadar bekler ve ardından ürünü rezerve durumda görüp reddedilir.
     */
    const products = await catalog.getPurchasableProducts(
      cartRows.map((row) => row.productId),
      tx,
    );

    const productsById = new Map(products.map((product) => [product.id, product]));

    // 3) Her kalemin hâlâ satın alınabilir olduğunu doğrula.
    for (const row of cartRows) {
      const product = productsById.get(row.productId);

      if (product === undefined) {
        throw businessRule(
          'Sepetinizdeki bir ürün artık mevcut değil. Lütfen sepetinizi gözden geçirin.',
        );
      }

      if (!product.isPurchasable) {
        throw conflict(`"${product.title}" artık satışta değil. Lütfen sepetinizden çıkarın.`);
      }
    }

    // 4) Tutarı SUNUCUDA, veritabanından okunan fiyatlarla hesapla.
    const lines = cartRows.map((row) => {
      const product = productsById.get(row.productId);
      if (product === undefined) {
        throw new Error('Ürün eşleşmesi kayboldu.');
      }
      return {
        unitPrice: money.fromKurus(product.unitPrice),
        quantity: row.quantity,
      };
    });

    /*
     * Teslimat bilgilerini ayrık birleşimden çöz.
     *
     * Tek yerde daraltma yapılır ve sonrası düz alanlarla ilerler; her kullanım
     * noktasında tekrar daraltmak hem tekrarlı hem hataya açıktır.
     */
    const delivery =
      input.delivery.method === 'home_delivery'
        ? {
            method: 'home_delivery' as const,
            district: input.delivery.address.district,
            address: input.delivery.address,
            date: input.delivery.deliveryDate,
            timeSlot: input.delivery.deliveryTimeSlot,
          }
        : {
            method: 'store_pickup' as const,
            // Mağazadan teslim alımda teslimat ücreti yoktur; ilçe yalnızca
            // hesaplama imzasını doldurur ve sonucu etkilemez.
            district: 'Buca' as IzmirDistrict,
            address: null,
            date: input.delivery.pickupDate,
            timeSlot: input.delivery.pickupTimeSlot,
          };

    const totals = calculateOrderTotals(lines, {
      method: delivery.method,
      district: delivery.district,
    });

    /*
     * 5) İstemcinin gördüğü tutarla karşılaştır.
     *
     * Bu bir güvenlik kontrolü DEĞİLDİR — tutarı zaten sunucu belirledi.
     * Amaç, kullanıcının onayladığı fiyat ile tahsil edilecek fiyatın farklı
     * olmasını engellemektir: ürün fiyatı sepetteyken değişmiş olabilir.
     */
    if (input.expectedTotal !== totals.total) {
      throw conflict(
        `Sepetinizdeki ürünlerin fiyatı güncellendi. Yeni tutar: ${money.format(totals.total)}. ` +
          'Lütfen sepetinizi kontrol edip tekrar deneyin.',
      );
    }

    // 6) Siparişi yaz.
    const referenceNumber = await generateReferenceNumber('order', tx);
    const status = initialOrderStatus(input.paymentMethod);

    const orderId = await repository.insertOrder(
      {
        referenceNumber,
        userId,
        status,
        contactName: input.contact.fullName,
        contactPhone: input.contact.phone,
        deliveryMethod: delivery.method,
        deliveryDate: delivery.date,
        deliveryStartTime: delivery.timeSlot.startTime,
        deliveryEndTime: delivery.timeSlot.endTime,
        paymentMethod: input.paymentMethod,
        subtotalKurus: totals.subtotal,
        deliveryFeeKurus: totals.deliveryFee,
        totalKurus: totals.total,
        note: input.note ?? null,
      },
      tx,
    );

    // 7) Kalemleri, ürün bilgisinin o anki kopyasıyla yaz.
    await repository.insertItems(
      cartRows.map((row) => {
        const product = productsById.get(row.productId);
        if (product === undefined) {
          throw new Error('Ürün eşleşmesi kayboldu.');
        }

        return {
          orderId,
          productId: product.id,
          titleSnapshot: product.title,
          imageStorageKeySnapshot: product.coverStorageKey,
          conditionSnapshot: product.condition,
          unitPriceKurus: product.unitPrice,
          quantity: row.quantity,
          lineTotalKurus: product.unitPrice * row.quantity,
        };
      }),
      tx,
    );

    // 8) Adrese teslimatta adresi yaz. Veritabanı tetikleyicisi, adrese
    //    teslimatta adres kaydının varlığını ayrıca zorunlu kılar.
    if (delivery.address !== null) {
      await repository.insertAddress(
        orderId,
        {
          district: delivery.address.district,
          neighborhood: delivery.address.neighborhood,
          street: delivery.address.street,
          buildingNo: delivery.address.buildingNo,
          apartmentNo: delivery.address.apartmentNo ?? null,
          directions: delivery.address.directions ?? null,
        },
        tx,
      );
    }

    // 9) Zaman çizelgesinin ilk kaydı.
    await repository.insertEvent(orderId, status, 'customer', { actorUserId: userId }, tx);

    // 10) Havale bekleniyorsa ödeme kaydını açık olarak oluştur.
    if (requiresUpfrontPayment(input.paymentMethod)) {
      await repository.insertPayment(
        {
          orderId,
          method: input.paymentMethod,
          amountKurus: totals.total,
          status: 'pending',
          confirmedAt: null,
          recordedByUserId: null,
          reference: null,
        },
        tx,
      );
    }

    // 11) Ürünleri rezerve et.
    await catalog.reserveProducts(products, tx);

    // 12) Sepeti boşalt.
    await cartRepository.clear(userId, tx);

    logger.info('Sipariş oluşturuldu', {
      orderId,
      referenceNumber,
      itemCount: cartRows.length,
      totalKurus: totals.total,
    });

    return { orderId, referenceNumber, totalKurus: totals.total };
  });
}

// ---------------------------------------------------------------------------
// Görünüme dönüştürme
// ---------------------------------------------------------------------------

function toOrderItem(row: OrderItemRow) {
  return {
    id: row.id,
    productId: row.productId,
    titleSnapshot: row.titleSnapshot,
    imageUrlSnapshot:
      row.imageStorageKeySnapshot === null ? null : resolveStorageUrl(row.imageStorageKeySnapshot),
    conditionSnapshot: row.conditionSnapshot,
    unitPrice: row.unitPriceKurus,
    quantity: row.quantity,
    lineTotal: row.lineTotalKurus,
  };
}

function toSummary(row: OrderRow, items: readonly OrderItemRow[]): OrderSummary {
  const first = items[0];

  return {
    id: row.id,
    referenceNumber: row.referenceNumber,
    status: row.status,
    total: row.totalKurus,
    deliveryMethod: row.deliveryMethod,
    deliveryDate: row.deliveryDate,
    createdAt: row.createdAt.toISOString(),
    itemCount: items.length,
    previewTitle: first?.titleSnapshot ?? 'Ürün bilgisi yok',
    previewImageUrl:
      first?.imageStorageKeySnapshot == null
        ? null
        : resolveStorageUrl(first.imageStorageKeySnapshot),
  };
}

/**
 * Tam sipariş görünümü.
 *
 * @param includeStaffNote Personel notu yalnızca yönetim panelinde döner;
 *   müşteri yanıtlarında asla yer almaz.
 */
async function buildOrderView(row: OrderRow, includeStaffNote: boolean): Promise<Order> {
  const [items, address, events] = await Promise.all([
    repository.findItems(row.id),
    repository.findAddress(row.id),
    repository.findEvents(row.id),
  ]);

  return {
    id: row.id,
    referenceNumber: row.referenceNumber,
    status: row.status,
    items: items.map(toOrderItem),

    contactName: row.contactName,
    contactPhone: row.contactPhone,

    deliveryMethod: row.deliveryMethod,
    deliveryAddress:
      address === null
        ? null
        : {
            district: address.district,
            neighborhood: address.neighborhood,
            street: address.street,
            buildingNo: address.buildingNo,
            apartmentNo: address.apartmentNo ?? undefined,
            directions: address.directions ?? undefined,
          },
    deliveryDate: row.deliveryDate,
    deliveryTimeSlot:
      row.deliveryStartTime === null || row.deliveryEndTime === null
        ? null
        : {
            startTime: row.deliveryStartTime.slice(0, 5),
            endTime: row.deliveryEndTime.slice(0, 5),
          },

    paymentMethod: row.paymentMethod,

    subtotal: row.subtotalKurus,
    deliveryFee: row.deliveryFeeKurus,
    total: row.totalKurus,

    note: row.note,
    ...(includeStaffNote ? { staffNote: row.staffNote } : {}),

    timeline: events.map((event) => ({
      status: event.status,
      note: event.note,
      occurredAt: event.createdAt.toISOString(),
    })),

    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Okuma
// ---------------------------------------------------------------------------

/**
 * Siparişi kimliğe göre getirir ve erişim yetkisini denetler.
 *
 * IDOR koruması: müşteri yalnızca kendi siparişini görebilir. Eski kodda
 * `/orders/customer/:email` ve `/report/order/:orderId` uçları sahiplik
 * kontrolü hiç yapmıyordu.
 */
export async function getOrder(
  orderId: string,
  viewer: { id: string; role: UserRole },
): Promise<Order> {
  const row = await repository.findById(orderId);

  if (row === null) {
    throw notFound('Sipariş');
  }

  assertCanAccess(viewer, row.userId);

  return buildOrderView(row, isStaff(viewer.role));
}

/**
 * Takip numarasıyla sipariş durumu.
 *
 * Oturum gerektirmez: müşteri sipariş takip formuna numarasını girerek durumunu
 * görebilir. Bu yüzden dönen bilgi bilinçli olarak dardır — adres, telefon ve
 * kalem fiyatları yer almaz. Takip numarası tahmin edilemez olsa da, kişisel
 * veriyi oturumsuz bir uçta açmak doğru değildir.
 */
export async function getPublicOrderStatus(reference: string): Promise<PublicOrderStatus> {
  const row = await repository.findByReferenceNumber(reference);

  if (row === null) {
    throw notFound('Bu takip numarasıyla bir sipariş');
  }

  const [items, events] = await Promise.all([
    repository.findItems(row.id),
    repository.findEvents(row.id),
  ]);

  return {
    referenceNumber: row.referenceNumber,
    status: row.status,
    itemCount: items.length,
    deliveryDate: row.deliveryDate,
    createdAt: row.createdAt.toISOString(),
    timeline: events.map((event) => ({
      status: event.status,
      occurredAt: event.createdAt.toISOString(),
    })),
  };
}

export async function listMyOrders(
  userId: string,
  query: OrderListQuery,
): Promise<Paginated<OrderSummary>> {
  const { rows, totalCount } = await repository.listForUser(userId, query);
  const itemsByOrder = await repository.findItemsForOrders(rows.map((row) => row.id));

  const summaries = rows.map((row) => toSummary(row, itemsByOrder.get(row.id) ?? []));

  return paginate(summaries, totalCount, query);
}

export async function listOrdersForAdmin(
  query: Parameters<typeof repository.listForAdmin>[0],
): Promise<Paginated<OrderSummary>> {
  const { rows, totalCount } = await repository.listForAdmin(query);
  const itemsByOrder = await repository.findItemsForOrders(rows.map((row) => row.id));

  const summaries = rows.map((row) => toSummary(row, itemsByOrder.get(row.id) ?? []));

  return paginate(summaries, totalCount, query);
}

// ---------------------------------------------------------------------------
// Durum değişikliği
// ---------------------------------------------------------------------------

/**
 * Siparişin durumunu değiştirir ve envanteri buna göre günceller.
 *
 * Sipariş satırı kilitlenerek okunur: iki personel aynı anda durum değiştirmeye
 * çalışırsa ikincisi ilkinin sonucunu görür ve geçersiz geçiş yapamaz.
 */
export async function changeOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  actor: { id: string; role: UserRole },
  note?: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const row = await repository.findByIdForUpdate(orderId, tx);

    if (row === null) {
      throw notFound('Sipariş');
    }

    if (!canTransitionOrder(row.status, newStatus)) {
      throw invalidTransition(row.status, newStatus, 'Sipariş');
    }

    const items = await repository.findItems(orderId, tx);
    const productIds = items
      .map((item) => item.productId)
      .filter((id): id is string => id !== null);

    await repository.updateStatus(orderId, newStatus, tx);

    // Envanteri duruma göre güncelle.
    if (completesSale(newStatus)) {
      await catalog.markProductsAsSold(productIds, tx);
    } else if (releasesReservation(newStatus)) {
      await catalog.releaseProducts(productIds, tx);
    }

    await repository.insertEvent(
      orderId,
      newStatus,
      'staff',
      { note: note ?? null, actorUserId: actor.id },
      tx,
    );

    logger.info('Sipariş durumu değişti', {
      orderId,
      from: row.status,
      to: newStatus,
      actorUserId: actor.id,
    });
  });
}

/**
 * Siparişi iptal eder.
 *
 * Müşteri yalnızca hazırlığa geçmeden önce iptal edebilir; personel her aşamada.
 * İptal edilen siparişin ürünleri satışa geri döner.
 */
export async function cancelOrder(
  orderId: string,
  actor: { id: string; role: UserRole },
  reason?: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const row = await repository.findByIdForUpdate(orderId, tx);

    if (row === null) {
      throw notFound('Sipariş');
    }

    // IDOR koruması: müşteri yalnızca kendi siparişini iptal edebilir.
    assertCanAccess(actor, row.userId);

    const byStaff = isStaff(actor.role);

    if (!canCancelOrder(row.status, actor.role)) {
      throw businessRule('Bu sipariş artık iptal edilemez. Lütfen bizimle iletişime geçin.');
    }

    const items = await repository.findItems(orderId, tx);
    const productIds = items
      .map((item) => item.productId)
      .filter((id): id is string => id !== null);

    await repository.updateStatus(orderId, 'cancelled', tx);
    await catalog.releaseProducts(productIds, tx);

    await repository.insertEvent(
      orderId,
      'cancelled',
      byStaff ? 'staff' : 'customer',
      { note: reason ?? null, actorUserId: actor.id },
      tx,
    );

    logger.info('Sipariş iptal edildi', {
      orderId,
      previousStatus: row.status,
      byStaff,
    });
  });
}

// ---------------------------------------------------------------------------
// Bakım
// ---------------------------------------------------------------------------

/**
 * Ödemesi gelmeyen siparişlerin iptali.
 *
 * Süre, katalogdaki rezervasyon süresiyle aynı olmalıdır: rezervasyon
 * çözülürken siparişin açık kalması, aynı ürünün ikinci kez satılabilmesi
 * demektir. Değer katalog sözleşmesinden okunur; iki yerde ayrı yazıldığında
 * biri değişince diğeri sessizce ayrışırdı.
 */
const PAYMENT_GRACE_MS = catalog.RESERVATION_DURATION_MS;

/** Tek bakım turunda işlenecek en fazla sipariş. */
const CANCELLATION_BATCH_SIZE = 100;

/**
 * Süresi geçmiş ödeme bekleyen siparişleri iptal eder.
 *
 * Zamanlanmış bakım görevinden çağrılır. İptal normal yoldan yapılır: durum
 * değişir, ürünler satışa döner, zaman çizelgesine kayıt düşülür. Kataloğun
 * rezervasyon temizliği tek başına ürünü serbest bırakıyor ama siparişi açık
 * bırakıyordu — ürün yeniden satılabilir hâle gelirken sipariş hâlâ onu
 * bekliyordu.
 *
 * @returns İptal edilen sipariş sayısı.
 */
export async function cancelExpiredUnpaidOrders(): Promise<number> {
  const cutoff = new Date(Date.now() - PAYMENT_GRACE_MS);
  const orderIds = await repository.findExpiredPendingPayment(cutoff, CANCELLATION_BATCH_SIZE);

  let cancelled = 0;

  for (const orderId of orderIds) {
    /*
      Her sipariş kendi işleminde iptal edilir.

      Biri hata verirse — araya giren bir personel işlemi durumu değiştirmiş
      olabilir — diğerleri etkilenmez ve tur devam eder.
    */
    try {
      await db.transaction(async (tx) => {
        const row = await repository.findByIdForUpdate(orderId, tx);

        // Kilidi beklerken durum değişmiş olabilir.
        if (row?.status !== 'pending_payment') return;

        const items = await repository.findItems(orderId, tx);
        const productIds = items
          .map((item) => item.productId)
          .filter((id): id is string => id !== null);

        await repository.updateStatus(orderId, 'cancelled', tx);
        await catalog.releaseProducts(productIds, tx);

        await repository.insertEvent(
          orderId,
          'cancelled',
          'system',
          { note: 'Ödeme süresi içinde bildirilmediği için otomatik iptal edildi.' },
          tx,
        );

        cancelled += 1;
      });
    } catch (error) {
      logger.error('Süresi geçmiş sipariş iptal edilemedi', {
        orderId,
        error: error instanceof Error ? error : String(error),
      });
    }
  }

  return cancelled;
}

/** Yönetim panelinden personel notu ekler. Müşteri yanıtlarında görünmez. */
export async function setStaffNote(orderId: string, note: string): Promise<void> {
  const row = await repository.findById(orderId);

  if (row === null) {
    throw notFound('Sipariş');
  }

  await repository.updateStaffNote(orderId, note);
}
