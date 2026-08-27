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
  AddStaffNoteInput,
  AdminRequestListQuery,
  CreateMovingRequestInput,
  ConvertToProductInput,
  CreateQuoteInput,
  RecordDiagnosisInput,
  RequestStatus,
  ScheduleAppointmentInput,
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
  adminRequests: (filters: Partial<AdminRequestListQuery>) =>
    ['servicing', 'admin', 'requests', filters] as const,
  appointments: (date: string) => ['servicing', 'admin', 'appointments', date] as const,
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

// ---------------------------------------------------------------------------
// Yönetim
// ---------------------------------------------------------------------------

/** Personelin gördüğü talep listesi; müşteri listesinden ayrı önbellek. */
export function useAdminRequests(filters: Partial<AdminRequestListQuery> = {}) {
  return useQuery({
    queryKey: servicingKeys.adminRequests(filters),
    queryFn: () =>
      apiRequest<Paginated<ServiceRequestSummary>>('/api/admin/requests', {
        query: {
          page: filters.page,
          pageSize: filters.pageSize,
          status: filters.status,
          kind: filters.kind,
          search: filters.search,
          fromDate: filters.fromDate,
          toDate: filters.toDate,
        },
      }),
    placeholderData: (previous) => previous,
  });
}

/** Belirli bir gündeki randevular. Personelin günlük planı için. */
export function useAppointmentsOnDate(date: string) {
  return useQuery({
    queryKey: servicingKeys.appointments(date),
    queryFn: async () => {
      const response = await apiRequest<{
        appointments: {
          requestId: string;
          referenceNumber: string;
          kind: ServiceRequestSummary['kind'];
          startTime: string;
          endTime: string;
        }[];
      }>('/api/admin/appointments', { query: { date } });

      return response.appointments;
    },
    enabled: date !== '',
  });
}

/**
 * Fiyat teklifi verir.
 *
 * Teklif oluşturulunca talep "teklif verildi" durumuna geçer; ayrıca durum
 * değiştirmeye gerek yoktur. Var olan bir teklif üzerine yeni teklif vermek
 * eskisini geçersiz kılar.
 */
export function useCreateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { requestId: string; quote: CreateQuoteInput }) =>
      apiRequest<{ success: boolean }>(`/api/admin/requests/${input.requestId}/quote`, {
        method: 'POST',
        body: input.quote,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: servicingKeys.all });
    },
  });
}

/** Randevu verir. Talep "randevu verildi" durumuna geçer. */
export function useScheduleAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { requestId: string; appointment: ScheduleAppointmentInput }) =>
      apiRequest<{ success: boolean }>(`/api/admin/requests/${input.requestId}/appointment`, {
        method: 'POST',
        body: input.appointment,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: servicingKeys.all });
    },
  });
}

/**
 * Talebin durumunu değiştirir.
 *
 * Sunucu iki şeyi denetler: geçişin durum makinesine uygunluğu ve ÖN KOŞULLAR
 * (teklif olmadan "kabul edildi", randevu olmadan "randevu verildi" olamaz).
 */
export function useUpdateRequestStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { requestId: string; status: RequestStatus; note?: string }) =>
      apiRequest<{ success: boolean }>(`/api/admin/requests/${input.requestId}/status`, {
        method: 'PATCH',
        body: { status: input.status, note: input.note },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: servicingKeys.all });
    },
  });
}

/** Yalnızca personelin gördüğü not. Müşteriye giden yanıtlarda yer almaz. */
export function useSetStaffNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { requestId: string; note: AddStaffNoteInput['note'] }) =>
      apiRequest<{ success: boolean }>(`/api/admin/requests/${input.requestId}/staff-note`, {
        method: 'PUT',
        body: { note: input.note },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: servicingKeys.all });
    },
  });
}

/** Teknisyenin keşif sonrası girdiği tespit. */
export function useRecordDiagnosis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { requestId: string; diagnosis: RecordDiagnosisInput['diagnosis'] }) =>
      apiRequest<{ success: boolean }>(
        `/api/admin/technical-service/${input.requestId}/diagnosis`,
        { method: 'PUT', body: { diagnosis: input.diagnosis } },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: servicingKeys.all });
    },
  });
}

/**
 * Kabul edilen satış talebini katalog ürününe çevirir.
 *
 * Ürün TASLAK olarak oluşturulur: personel görselleri ve açıklamayı gözden
 * geçirdikten sonra satışa açar.
 */
export function useConvertSellRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { requestId: string; product: ConvertToProductInput }) => {
      const response = await apiRequest<{ product: { productId: string } }>(
        `/api/admin/sell-requests/${input.requestId}/convert`,
        { method: 'POST', body: input.product },
      );
      return response.product;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: servicingKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['catalog'] });
    },
  });
}
