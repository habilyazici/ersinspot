/**
 * Türden bağımsız talep detayı.
 *
 * Müşterinin TEK bir talep listesi vardır; detayı okumak için talebin içeride
 * hangi tabloya yazıldığını bilmesi gerekmemelidir. Liste birleşikken detayın
 * üç ayrı uca bölünmüş olması bir asimetriydi: arayüz, listeden gelen `kind`
 * alanına bakıp hangi adrese gideceğine kendisi karar etmek zorunda kalıyordu.
 *
 * AYRI DOSYADA olmasının sebebi döngüsel bağımlılıktır: üç tür servisi de
 * `request-service` içindeki ortak yardımcıları kullanır. Sevk fonksiyonu
 * oraya konsaydı `request-service → moving-service → request-service` döngüsü
 * oluşurdu. Buradan tek yön vardır.
 */

import type { ServiceRequest } from '@ersinspot/shared';
import { notFound } from '../../../platform/errors/index.ts';
import * as repository from '../infrastructure/request-repository.ts';
import * as movingService from './moving-service.ts';
import * as sellRequestService from './sell-request-service.ts';
import * as technicalService from './technical-service.ts';
import type { Actor } from './request-service.ts';

/**
 * Talebin tam görünümü.
 *
 * Sahiplik denetimi türe özgü fonksiyonların içinde yapılır (hepsi
 * `loadRequestForViewer` çağırır); burada yalnızca hangi tabloya bakılacağı
 * belirlenir.
 */
export async function getRequest(requestId: string, viewer: Actor): Promise<ServiceRequest> {
  const row = await repository.findById(requestId);

  if (row === null) {
    throw notFound('Talep');
  }

  switch (row.kind) {
    case 'moving':
      return movingService.getMovingRequest(requestId, viewer);
    case 'technical_service':
      return technicalService.getTechnicalServiceRequest(requestId, viewer);
    case 'sell_request':
      return sellRequestService.getSellRequest(requestId, viewer);
  }
}
