/**
 * Nakliye talebi.
 *
 * Ortak yaşam döngüsü `request-service.ts` içindedir; burada yalnızca nakliyeye
 * özgü olan var: iki adres, bina erişim bilgisi, eşya listesi ve tahmini fiyat.
 *
 * Tahmini fiyat, talep oluşturulurken sunucuda hesaplanır ve kaydedilir.
 * Bağlayıcı değildir — bağlayıcı tutar, personelin gireceği tekliftir. Arayüzde
 * daima "tahmini" ibaresiyle gösterilmelidir.
 */

import type { CreateMovingRequestInput, MovingRequest } from '@ersinspot/shared';
import { estimateMoving } from '@ersinspot/shared';
import { db } from '../../../platform/db/client.ts';
import { generateReferenceNumber } from '../../../platform/db/reference-number.ts';
import { logger } from '../../../platform/observability/logger.ts';
import { notFound } from '../../../platform/errors/index.ts';
import * as detailRepository from '../infrastructure/detail-repository.ts';
import * as repository from '../infrastructure/request-repository.ts';
import { assertCanCreateRequest, loadRequestForViewer, savePhotos } from './request-service.ts';
import type { Actor } from './request-service.ts';
import { buildCommonView } from './view-builder.ts';

export interface CreateResult {
  readonly requestId: string;
  readonly referenceNumber: string;
  /** Tahmini tutar (kuruş). Bağlayıcı değildir. */
  readonly estimatedTotal: number;
}

export async function createMovingRequest(
  userId: string,
  input: CreateMovingRequestInput,
): Promise<CreateResult> {
  await assertCanCreateRequest(userId);

  // Tahmini fiyat sunucuda hesaplanır; istemciden tutar kabul edilmez.
  const estimate = estimateMoving({
    houseSize: input.houseSize,
    fromFloor: input.fromLocation.floor,
    fromHasElevator: input.fromLocation.hasElevator,
    toFloor: input.toLocation.floor,
    toHasElevator: input.toLocation.hasElevator,
    itemCount: input.items.reduce((total, item) => total + item.quantity, 0),
    needsPacking: input.needsPacking,
    needsAssembly: input.needsAssembly,
  });

  return db.transaction(async (tx) => {
    const referenceNumber = await generateReferenceNumber('moving', tx);

    const requestId = await repository.insertRequest(
      {
        referenceNumber,
        kind: 'moving',
        userId,
        contactName: input.contact.fullName,
        contactPhone: input.contact.phone,
        customerNote: input.customerNote ?? null,
      },
      tx,
    );

    await detailRepository.insertMovingDetail(
      requestId,
      {
        houseSize: input.houseSize,
        fromFloor: input.fromLocation.floor,
        fromHasElevator: input.fromLocation.hasElevator,
        toFloor: input.toLocation.floor,
        toHasElevator: input.toLocation.hasElevator,
        preferredDate: input.preferredDate,
        preferredStartTime: input.preferredTimeSlot?.startTime ?? null,
        preferredEndTime: input.preferredTimeSlot?.endTime ?? null,
        needsPacking: input.needsPacking,
        needsAssembly: input.needsAssembly,
        estimatedTotalKurus: estimate.total,
      },
      tx,
    );

    // Çıkış ve varış adresleri; veritabanı tetikleyicisi ikisinin de varlığını
    // zorunlu kılar.
    await repository.insertAddresses(
      requestId,
      [
        {
          role: 'moving_from',
          district: input.fromLocation.address.district,
          neighborhood: input.fromLocation.address.neighborhood,
          street: input.fromLocation.address.street,
          buildingNo: input.fromLocation.address.buildingNo,
          apartmentNo: input.fromLocation.address.apartmentNo ?? null,
          directions: input.fromLocation.address.directions ?? null,
        },
        {
          role: 'moving_to',
          district: input.toLocation.address.district,
          neighborhood: input.toLocation.address.neighborhood,
          street: input.toLocation.address.street,
          buildingNo: input.toLocation.address.buildingNo,
          apartmentNo: input.toLocation.address.apartmentNo ?? null,
          directions: input.toLocation.address.directions ?? null,
        },
      ],
      tx,
    );

    await detailRepository.insertMovingItems(
      requestId,
      input.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        needsDisassembly: item.needsDisassembly,
        note: item.note ?? null,
      })),
      tx,
    );

    await savePhotos(requestId, input.photos, userId, tx);

    await repository.insertEvent(requestId, 'pending', 'customer', { actorUserId: userId }, tx);

    logger.info('Nakliye talebi oluşturuldu', {
      requestId,
      referenceNumber,
      itemCount: input.items.length,
      estimatedTotal: estimate.total,
    });

    return { requestId, referenceNumber, estimatedTotal: estimate.total };
  });
}

/** Nakliye talebinin tam görünümü. Erişim yetkisi denetlenir. */
export async function getMovingRequest(requestId: string, viewer: Actor): Promise<MovingRequest> {
  const row = await loadRequestForViewer(requestId, viewer);

  if (row.kind !== 'moving') {
    throw notFound('Nakliye talebi');
  }

  const [common, detail, items, addresses] = await Promise.all([
    buildCommonView(row, viewer.role),
    detailRepository.findMovingDetail(requestId),
    detailRepository.findMovingItems(requestId),
    repository.findAddresses(requestId),
  ]);

  if (detail === null) {
    // Veritabanı tetikleyicisi bunu imkânsız kılar; yine de sessizce bozuk
    // veri döndürmek yerine hata veriyoruz.
    throw new Error(`Nakliye detayı bulunamadı: ${requestId}`);
  }

  const from = addresses.find((address) => address.role === 'moving_from');
  const to = addresses.find((address) => address.role === 'moving_to');

  if (from === undefined || to === undefined) {
    throw new Error(`Nakliye adresleri eksik: ${requestId}`);
  }

  const toLocation = (address: typeof from, floor: number, hasElevator: boolean) => ({
    address: {
      district: address.district,
      neighborhood: address.neighborhood,
      street: address.street,
      buildingNo: address.buildingNo,
      apartmentNo: address.apartmentNo ?? undefined,
      directions: address.directions ?? undefined,
    },
    floor,
    hasElevator,
  });

  return {
    ...common,
    kind: 'moving',
    houseSize: detail.houseSize,
    fromLocation: toLocation(from, detail.fromFloor, detail.fromHasElevator),
    toLocation: toLocation(to, detail.toFloor, detail.toHasElevator),
    preferredDate: detail.preferredDate,
    preferredTimeSlot:
      detail.preferredStartTime === null || detail.preferredEndTime === null
        ? null
        : {
            startTime: detail.preferredStartTime.slice(0, 5),
            endTime: detail.preferredEndTime.slice(0, 5),
          },
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      needsDisassembly: item.needsDisassembly,
      note: item.note ?? undefined,
    })),
    needsPacking: detail.needsPacking,
    needsAssembly: detail.needsAssembly,
    estimatedTotal: detail.estimatedTotalKurus,
  };
}

/**
 * Nakliye fiyat tahmini — talep oluşturmadan önce.
 *
 * Kullanıcı formu doldururken tutarı görebilsin diye. Kayıt oluşturmaz ve
 * bağlayıcı değildir; talep oluşturulduğunda aynı hesap sunucuda tekrarlanır.
 */
export function estimateMovingPrice(input: {
  houseSize: CreateMovingRequestInput['houseSize'];
  fromFloor: number;
  fromHasElevator: boolean;
  toFloor: number;
  toHasElevator: boolean;
  itemCount: number;
  needsPacking: boolean;
  needsAssembly: boolean;
}) {
  return estimateMoving(input);
}
