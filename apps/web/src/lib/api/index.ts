/**
 * API istemcisi — genel yüzey.
 *
 * Özellik modülleri yalnızca buradan içe aktarır; `client.ts` içindeki ayrıntı
 * dışarıya sızmaz.
 */

export { apiRequest, apiUpload, setSessionExpiredHandler } from './client.ts';
export type { RequestOptions } from './client.ts';
export { queryClient } from './query-client.ts';
