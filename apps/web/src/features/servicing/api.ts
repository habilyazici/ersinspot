/**
 * Hizmet talebi sorguları.
 *
 * Backend'deki `servicing` modülünün karşılığı: nakliye, teknik servis ve
 * ürün satma talepleri.
 *
 * Üç talep türü ortak bir yaşam döngüsünü paylaşır (beklemede → inceleniyor →
 * teklif → kabul/ret → randevu → tamamlandı), bu yüzden listeleme, iptal ve
 * teklife yanıt verme tek yerde tanımlanır. Türe özgü olan yalnızca oluşturma
 * ve detay okumadır.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateMovingRequestInput,
  CreateSellRequestInput,
  CreateTechnicalServiceRequestInput,
  MovingRequest,
  Paginated,
  RequestListQuery,
  RespondToQuoteInput,
  SellRequest,
  ServiceRequestSummary,
  TechnicalServiceRequest,
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

export function useMovingRequest(requestId: string) {
  return useQuery({
    queryKey: servicingKeys.request(requestId),
    queryFn: async () => {
      const response = await apiRequest<{ request: MovingRequest }>(
        `/api/moving/requests/${requestId}`,
      );
      return response.request;
    },
    enabled: requestId !== '',
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

export function useTechnicalServiceRequest(requestId: string) {
  return useQuery({
    queryKey: servicingKeys.request(requestId),
    queryFn: async () => {
      const response = await apiRequest<{ request: TechnicalServiceRequest }>(
        `/api/technical-service/requests/${requestId}`,
      );
      return response.request;
    },
    enabled: requestId !== '',
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

export function useSellRequest(requestId: string) {
  return useQuery({
    queryKey: servicingKeys.request(requestId),
    queryFn: async () => {
      const response = await apiRequest<{ request: SellRequest }>(
        `/api/sell-requests/${requestId}`,
      );
      return response.request;
    },
    enabled: requestId !== '',
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
