/**
 * Hizmet talebi sorguları.
 *
 * Backend'deki `servicing` modülünün karşılığı: nakliye, teknik servis ve
 * ürün satma talepleri.
 *
 * Üç talep türü ortak bir yaşam döngüsünü paylaşır (beklemede → inceleniyor →
 * teklif → kabul/ret → randevu → tamamlandı). Listeleme, DETAY OKUMA, iptal ve
 * teklife yanıt verme bu yüzden tek yerde tanımlanır; türe özgü olan yalnızca
 * oluşturmadır.
 *
 * Tür başına ayrı detay hook'ları da yazılabilirdi ama üçü de aynı önbellek
 * anahtarını kullanırdı (`servicingKeys.request(id)`) ve farklı şekiller aynı
 * girdiye yazardı. Tek hook, tek şekil.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateMovingRequestInput,
  CreateSellRequestInput,
  CreateTechnicalServiceRequestInput,
  Paginated,
  RequestListQuery,
  RespondToQuoteInput,
  ServiceRequest,
  ServiceRequestSummary,
} from '@ersinspot/shared';
import { apiRequest } from '@/lib/api';

export const servicingKeys = {
  all: ['servicing'] as const,
  requests: (filters: Partial<RequestListQuery>) => ['servicing', 'requests', filters] as const,
  request: (id: string) => ['servicing', 'request', id] as const,
};

/** Talep oluşturma uçlarının ortak yanıtı. */
export interface CreateRequestResult {
  readonly requestId: string;
  readonly referenceNumber: string;
}

// ---------------------------------------------------------------------------
// Listeleme
// ---------------------------------------------------------------------------

/** Müşterinin kendi talepleri. Üç tür tek listede döner. */
export function useMyRequests(filters: Partial<RequestListQuery> = {}) {
  return useQuery({
    queryKey: servicingKeys.requests(filters),
    queryFn: () =>
      apiRequest<Paginated<ServiceRequestSummary>>('/api/requests', {
        query: { page: filters.page, pageSize: filters.pageSize, status: filters.status },
      }),
  });
}

/**
 * Türden bağımsız talep detayı.
 *
 * Liste üç türü birlikte döndürür; detay da tek adresten okunur. Yanıt `kind`
 * alanıyla ayrışan bir birleşimdir, arayüz hangi alanların mevcut olduğunu o
 * alandan çıkarır.
 */
export function useRequest(requestId: string) {
  return useQuery({
    queryKey: servicingKeys.request(requestId),
    queryFn: async () => {
      const response = await apiRequest<{ request: ServiceRequest }>(`/api/requests/${requestId}`);
      return response.request;
    },
    enabled: requestId !== '',
  });
}

// ---------------------------------------------------------------------------
// Nakliye
// ---------------------------------------------------------------------------

export function useCreateMovingRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMovingRequestInput) => {
      const response = await apiRequest<{ request: CreateRequestResult }>('/api/moving/requests', {
        method: 'POST',
        body: input,
      });
      return response.request;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: servicingKeys.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Teknik servis
// ---------------------------------------------------------------------------

export function useCreateTechnicalServiceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTechnicalServiceRequestInput) => {
      const response = await apiRequest<{ request: CreateRequestResult }>(
        '/api/technical-service/requests',
        { method: 'POST', body: input },
      );
      return response.request;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: servicingKeys.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Ürün satma
// ---------------------------------------------------------------------------

export function useCreateSellRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSellRequestInput) => {
      const response = await apiRequest<{ request: CreateRequestResult }>('/api/sell-requests', {
        method: 'POST',
        body: input,
      });
      return response.request;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: servicingKeys.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Ortak işlemler
// ---------------------------------------------------------------------------

/**
 * Teklife yanıt: kabul veya ret.
 *
 * Kabul edilen teklif talebi randevu aşamasına taşır; reddedilen talep
 * kapanır. Karar sunucuda doğrulanır — teklifin süresi dolmuşsa reddedilir.
 */
export function useRespondToQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { requestId: string; response: RespondToQuoteInput }) =>
      apiRequest<{ success: boolean }>(`/api/requests/${input.requestId}/respond`, {
        method: 'POST',
        body: input.response,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: servicingKeys.all });
    },
  });
}

export function useCancelRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { requestId: string; reason?: string }) =>
      apiRequest<{ success: boolean }>(`/api/requests/${input.requestId}/cancel`, {
        method: 'POST',
        body: { reason: input.reason },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: servicingKeys.all });
    },
  });
}
