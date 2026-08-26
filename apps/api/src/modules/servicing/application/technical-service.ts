/**
 * Teknik servis talebi.
 *
 * Ortak yaşam döngüsü `request-service.ts` içindedir; burada cihaz bilgisi,
 * arıza tanımı ve keşif ücreti yönetilir.
 *
 * Keşif ücreti, talep oluşturulduğu andaki tarifeyle sabitlenir. Tarife
 * sonradan değişse bile müşteriye bildirilen tutar geçerli kalır — eski kod
 * tabanında fiyat sabitleri kaynak dosyada duruyordu ve değiştiğinde geçmiş
 * kayıtlar da etkilenmiş gibi görünüyordu.
 */

import type {
  CreateTechnicalServiceRequestInput,
  RecordDiagnosisInput,
  TechnicalServiceRequest,
} from '@ersinspot/shared';
import { INSPECTION_FEE } from '@ersinspot/shared';
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
  /** Keşif ücreti (kuruş). Talep anında sabitlenir. */
  readonly inspectionFee: number;
}

export async function createTechnicalServiceRequest(
  userId: string,
  input: CreateTechnicalServiceRequestInput,
): Promise<CreateResult> {
  await assertCanCreateRequest(userId);

  return db.transaction(async (tx) => {
    const referenceNumber = await generateReferenceNumber('technical_service', tx);

    const requestId = await repository.insertRequest(
      {
        referenceNumber,
        kind: 'technical_service',
        userId,
        contactName: input.contact.fullName,
        contactPhone: input.contact.phone,
        customerNote: input.customerNote ?? null,
      },
      tx,
    );

    await detailRepository.insertTechnicalDetail(
      requestId,
      {
        deviceType: input.deviceType,
        // Veritabanı kısıtı, "diğer" seçildiğinde bu alanın dolu olmasını zorunlu kılar.
        customDeviceType: input.customDeviceType ?? null,
        brand: input.brand,
        model: input.model ?? null,
        warrantyStatus: input.warrantyStatus,
        problemCategory: input.problemCategory,
        problemDescription: input.problemDescription,
        preferredDate: input.preferredDate,
        preferredStartTime: input.preferredTimeSlot?.startTime ?? null,
        preferredEndTime: input.preferredTimeSlot?.endTime ?? null,
        inspectionFeeKurus: INSPECTION_FEE,
      },
      tx,
    );

    await repository.insertAddresses(
      requestId,
      [
        {
          role: 'service_location',
          district: input.address.district,
          neighborhood: input.address.neighborhood,
          street: input.address.street,
          buildingNo: input.address.buildingNo,
          apartmentNo: input.address.apartmentNo ?? null,
          directions: input.address.directions ?? null,
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

    logger.info('Teknik servis talebi oluşturuldu', {
      requestId,
      referenceNumber,
      deviceType: input.deviceType,
    });

    return { requestId, referenceNumber, inspectionFee: INSPECTION_FEE };
  });
}

export async function getTechnicalServiceRequest(
  requestId: string,
  viewer: Actor,
): Promise<TechnicalServiceRequest> {
  const row = await loadRequestForViewer(requestId, viewer);

  if (row.kind !== 'technical_service') {
    throw notFound('Teknik servis talebi');
  }

  const [common, detail, addresses] = await Promise.all([
    buildCommonView(row, viewer.role),
    detailRepository.findTechnicalDetail(requestId),
    repository.findAddresses(requestId),
  ]);

  if (detail === null) {
    throw new Error(`Teknik servis detayı bulunamadı: ${requestId}`);
  }

  const address = addresses.find((entry) => entry.role === 'service_location');

  if (address === undefined) {
    throw new Error(`Servis adresi eksik: ${requestId}`);
  }

  return {
    ...common,
    kind: 'technical_service',
    deviceType: detail.deviceType,
    customDeviceType: detail.customDeviceType,
    brand: detail.brand,
    model: detail.model,
    warrantyStatus: detail.warrantyStatus,
    problemCategory: detail.problemCategory,
    problemDescription: detail.problemDescription,
    address: {
      district: address.district,
      neighborhood: address.neighborhood,
      street: address.street,
      buildingNo: address.buildingNo,
      apartmentNo: address.apartmentNo ?? undefined,
      directions: address.directions ?? undefined,
    },
    preferredDate: detail.preferredDate,
    preferredTimeSlot:
      detail.preferredStartTime === null || detail.preferredEndTime === null
        ? null
        : {
            startTime: detail.preferredStartTime.slice(0, 5),
            endTime: detail.preferredEndTime.slice(0, 5),
          },
    inspectionFee: detail.inspectionFeeKurus,
    diagnosis: detail.diagnosis,
  };
}

/**
 * Teknisyenin keşif sonrası tespitini kaydeder.
 *
 * Talep en az randevu aşamasına gelmiş olmalıdır: keşif yapılmadan tespit
 * girilemez.
 */
export async function recordDiagnosis(
  requestId: string,
  input: RecordDiagnosisInput,
): Promise<void> {
  const row = await repository.findById(requestId);

  if (row?.kind !== 'technical_service') {
    throw notFound('Teknik servis talebi');
  }

  if (row.status !== 'scheduled' && row.status !== 'completed') {
    throw businessRule('Tespit yalnızca randevu planlandıktan sonra kaydedilebilir.');
  }

  await detailRepository.updateDiagnosis(requestId, input.diagnosis);

  logger.info('Teknik servis tespiti kaydedildi', { requestId });
}
