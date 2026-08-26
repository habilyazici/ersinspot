/**
 * Ürün satış talebi.
 *
 * Müşteri elindeki ürünü işletmeye satmak ister. Ortak yaşam döngüsüne ek
 * olarak bir adım daha var: talep kabul edilip ürün teslim alındığında,
 * katalogda bir ürün kaydına dönüştürülür.
 *
 * Bu dönüşüm `catalog` modülünün sözleşmesi üzerinden yapılır; bu modül
 * `products` tablosuna erişemez.
 */

import type { ConvertToProductInput, CreateSellRequestInput, SellRequest } from '@ersinspot/shared';
import { catalog } from '../../catalog/index.ts';
import { db } from '../../../platform/db/client.ts';
import { generateReferenceNumber } from '../../../platform/db/reference-number.ts';
import { logger } from '../../../platform/observability/logger.ts';
import { businessRule, notFound } from '../../../platform/errors/index.ts';
import * as detailRepository from '../infrastructure/detail-repository.ts';
import * as repository from '../infrastructure/request-repository.ts';
import { assertCanCreateRequest, loadRequestForViewer } from './request-service.ts';
import type { Actor } from './request-service.ts';
import { buildCommonView } from './view-builder.ts';

export interface CreateResult {
  readonly requestId: string;
  readonly referenceNumber: string;
}

export async function createSellRequest(
  userId: string,
  input: CreateSellRequestInput,
): Promise<CreateResult> {
  await assertCanCreateRequest(userId);

  return db.transaction(async (tx) => {
    const referenceNumber = await generateReferenceNumber('sell_request', tx);

    const requestId = await repository.insertRequest(
      {
        referenceNumber,
        kind: 'sell_request',
        userId,
        contactName: input.contact.fullName,
        contactPhone: input.contact.phone,
        customerNote: input.customerNote ?? null,
      },
      tx,
    );

    await detailRepository.insertSellDetail(
      requestId,
      {
        title: input.title,
        categoryId: input.categoryId,
        brand: input.brand,
        model: input.model ?? null,
        condition: input.condition,
        purchaseYear: input.purchaseYear ?? null,
        description: input.description,
        hasBox: input.hasBox,
        hasAccessories: input.hasAccessories,
        hasWarranty: input.hasWarranty,
        askingPriceKurus: input.askingPrice ?? null,
      },
      tx,
    );

    await repository.insertAddresses(
      requestId,
      [
        {
          role: 'pickup',
          district: input.pickupAddress.district,
          neighborhood: input.pickupAddress.neighborhood,
          street: input.pickupAddress.street,
          buildingNo: input.pickupAddress.buildingNo,
          apartmentNo: input.pickupAddress.apartmentNo ?? null,
          directions: input.pickupAddress.directions ?? null,
        },
      ],
      tx,
    );

    await repository.insertPhotos(
      requestId,
      input.photos.map((photo) => ({
        storageKey: photo.storageKey,
        caption: photo.caption ?? null,
      })),
      tx,
    );

    await repository.insertEvent(requestId, 'pending', 'customer', { actorUserId: userId }, tx);

    logger.info('Satış talebi oluşturuldu', { requestId, referenceNumber });

    return { requestId, referenceNumber };
  });
}

export async function getSellRequest(requestId: string, viewer: Actor): Promise<SellRequest> {
  const row = await loadRequestForViewer(requestId, viewer);

  if (row.kind !== 'sell_request') {
    throw notFound('Satış talebi');
  }

  const [common, detail, addresses] = await Promise.all([
    buildCommonView(row, viewer.role),
    detailRepository.findSellDetail(requestId),
    repository.findAddresses(requestId),
  ]);

  if (detail === null) {
    throw new Error(`Satış talebi detayı bulunamadı: ${requestId}`);
  }

  const address = addresses.find((entry) => entry.role === 'pickup');

  if (address === undefined) {
    throw new Error(`Teslim alma adresi eksik: ${requestId}`);
  }

  const category = await lookupCategory(detail.categoryId);

  return {
    ...common,
    kind: 'sell_request',
    title: detail.title,
    category,
    brand: detail.brand,
    model: detail.model,
    condition: detail.condition,
    purchaseYear: detail.purchaseYear,
    description: detail.description,
    hasBox: detail.hasBox,
    hasAccessories: detail.hasAccessories,
    hasWarranty: detail.hasWarranty,
    askingPrice: detail.askingPriceKurus,
    pickupAddress: {
      district: address.district,
      neighborhood: address.neighborhood,
      street: address.street,
      buildingNo: address.buildingNo,
      apartmentNo: address.apartmentNo ?? undefined,
      directions: address.directions ?? undefined,
    },
    resultingProductId: detail.resultingProductId,
  };
}

/**
 * Kategori bilgisini katalog modülünden alır.
 *
 * Satış talebi bir kategoriye bağlıdır ama `categories` tablosuna doğrudan
 * erişilmez; katalog sözleşmesi kullanılır.
 */
async function lookupCategory(
  categoryId: string,
): Promise<{ id: string; name: string; slug: string }> {
  const category = await catalog.getCategoryById(categoryId);

  if (category === null) {
    throw new Error(`Kategori bulunamadı: ${categoryId}`);
  }

  return category;
}

/**
 * Kabul edilen talebi katalog ürününe dönüştürür.
 *
 * Ürün teslim alındıktan sonra çağrılır: katalogda yeni bir kayıt oluşturulur
 * ve talebe bağlanır. Böylece "bu ürün nereden geldi" sorusunun cevabı kayıtlı
 * kalır.
 *
 * Ürün taslak olarak oluşturulur; personel fotoğraf ve açıklamayı düzenledikten
 * sonra satışa açar.
 */
export async function convertToProduct(
  requestId: string,
  input: ConvertToProductInput,
  actor: Actor,
): Promise<{ productId: string }> {
  return db.transaction(async (tx) => {
    const row = await repository.findByIdForUpdate(requestId, tx);

    if (row?.kind !== 'sell_request') {
      throw notFound('Satış talebi');
    }

    if (row.status !== 'accepted' && row.status !== 'scheduled') {
      throw businessRule(
        'Ürün yalnızca teklif kabul edildikten sonra katalog kaydına dönüştürülebilir.',
      );
    }

    const detail = await detailRepository.findSellDetail(requestId, tx);

    if (detail === null) {
      throw new Error(`Satış talebi detayı bulunamadı: ${requestId}`);
    }

    if (detail.resultingProductId !== null) {
      throw businessRule('Bu talep zaten bir ürün kaydına dönüştürülmüş.');
    }

    // Talep fotoğrafları istenirse ürün görseli olarak kopyalanır.
    const photos = input.copyPhotos ? await repository.findPhotos(requestId) : [];

    const productId = await catalog.createProductFromSellRequest(
      {
        title: input.title,
        description: input.description,
        priceKurus: input.price,
        categoryId: input.categoryId,
        brandId: input.brandId,
        condition: input.condition,
        warrantyMonths: input.warrantyMonths,
        imageStorageKeys: photos.map((photo) => photo.storageKey),
      },
      tx,
    );

    await detailRepository.linkResultingProduct(requestId, productId, tx);

    await repository.insertEvent(
      requestId,
      row.status,
      'staff',
      { note: 'Ürün katalog kaydına dönüştürüldü.', actorUserId: actor.id },
      tx,
    );

    logger.info('Satış talebi ürüne dönüştürüldü', { requestId, productId });

    return { productId };
  });
}
