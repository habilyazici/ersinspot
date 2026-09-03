/**
 * Sepet ve sipariş sorguları.
 *
 * Backend'deki `ordering` modülünün karşılığı.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AdminOrderListQuery,
  Cart,
  CreateOrderInput,
  Order,
  OrderListQuery,
  CreateOrderResult,
  OrderSummary,
  OrderStatus,
  Paginated,
  ProductSummary,
  PublicOrderStatus,
} from '@ersinspot/shared';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/features/auth';

export type { CreateOrderResult, PublicOrderStatus };

export const orderingKeys = {
  adminOrders: (filters: Partial<AdminOrderListQuery>) =>
    ['ordering', 'admin', 'orders', filters] as const,
  cart: ['ordering', 'cart'] as const,
  favorites: ['ordering', 'favorites'] as const,
  favoriteStatus: (productIds: readonly string[]) =>
    ['ordering', 'favorites', 'status', [...productIds].sort()] as const,
  cartCount: ['ordering', 'cart', 'count'] as const,
  orders: (filters: Partial<OrderListQuery>) => ['ordering', 'orders', filters] as const,
  order: (id: string) => ['ordering', 'order', id] as const,
  tracking: (reference: string) => ['ordering', 'tracking', reference] as const,
};

// ---------------------------------------------------------------------------
// Sepet
// ---------------------------------------------------------------------------

export function useCart() {
  return useQuery({
    queryKey: orderingKeys.cart,
    queryFn: async () => {
      const response = await apiRequest<{ cart: Cart }>('/api/cart');
      return response.cart;
    },
    // Sepet fiyatları güncel olmalı; ürün fiyatı değişmiş olabilir.
    staleTime: 0,
  });
}

/**
 * Başlıktaki rozet için; tam sepeti çekmeye gerek yok.
 *
 * Yalnızca oturum açıkken sorulur. Misafirde sepet zaten yoktur ve istek
 * atmak her sayfa açılışında gereksiz bir 401 üretirdi.
 */
export function useCartCount() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: orderingKeys.cartCount,
    queryFn: async () => {
      const response = await apiRequest<{ count: number }>('/api/cart/count');
      return response.count;
    },
    enabled: isAuthenticated,
    retry: false,
    staleTime: 30_000,
  });
}

function useCartInvalidation() {
  const queryClient = useQueryClient();

  return (cart?: Cart) => {
    if (cart !== undefined) {
      queryClient.setQueryData(orderingKeys.cart, cart);
      queryClient.setQueryData(orderingKeys.cartCount, cart.items.length);
    } else {
      void queryClient.invalidateQueries({ queryKey: orderingKeys.cart });
      void queryClient.invalidateQueries({ queryKey: orderingKeys.cartCount });
    }
  };
}

export function useAddToCart() {
  const syncCart = useCartInvalidation();

  return useMutation({
    mutationFn: (input: { productId: string; quantity?: number }) =>
      apiRequest<{ cart: Cart }>('/api/cart', {
        method: 'POST',
        body: { productId: input.productId, quantity: input.quantity ?? 1 },
      }),
    onSuccess: (data) => syncCart(data.cart),
  });
}

export function useRemoveFromCart() {
  const syncCart = useCartInvalidation();

  return useMutation({
    mutationFn: (productId: string) =>
      apiRequest<{ cart: Cart }>(`/api/cart/${productId}`, { method: 'DELETE' }),
    onSuccess: (data) => syncCart(data.cart),
  });
}

export function useClearCart() {
  const syncCart = useCartInvalidation();

  return useMutation({
    mutationFn: () => apiRequest<{ cart: Cart }>('/api/cart', { method: 'DELETE' }),
    onSuccess: (data) => syncCart(data.cart),
  });
}

// ---------------------------------------------------------------------------
// Favoriler
// ---------------------------------------------------------------------------

/** Kullanıcının favorilerindeki ürünler, en yeniden eskiye. */
export function useFavorites() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: orderingKeys.favorites,
    queryFn: async () => {
      const response = await apiRequest<{ products: ProductSummary[] }>('/api/favorites');
      return response.products;
    },
    enabled: isAuthenticated,
  });
}

/**
 * Listedeki ürünlerden hangileri favoride?
 *
 * Kart başına ayrı istek yerine sayfadaki tüm ürünler tek istekte sorulur.
 * Misafirde hiç sorulmaz: favori kişiye özeldir.
 */
export function useFavoriteStatus(productIds: readonly string[]) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: orderingKeys.favoriteStatus(productIds),
    queryFn: async () => {
      const response = await apiRequest<{ favorited: string[] }>('/api/favorites/status', {
        query: { productIds: productIds.join(',') },
      });
      return new Set(response.favorited);
    },
    enabled: isAuthenticated && productIds.length > 0,
  });
}

/** Ürünü favorilere ekler veya çıkarır. */
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      const response = await apiRequest<{ isFavorite: boolean }>('/api/favorites', {
        method: 'POST',
        body: { productId },
      });
      return response.isFavorite;
    },

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderingKeys.favorites });
      // Favori sayacı ürün kartında ve sıralamasında görünür.
      void queryClient.invalidateQueries({ queryKey: ['catalog'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Sipariş
// ---------------------------------------------------------------------------

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateOrderInput) => {
      const response = await apiRequest<{ order: CreateOrderResult }>('/api/orders', {
        method: 'POST',
        body: input,
      });
      return response.order;
    },

    onSuccess: () => {
      // Sepet boşaldı, sipariş listesi değişti.
      void queryClient.invalidateQueries({ queryKey: orderingKeys.cart });
      void queryClient.invalidateQueries({ queryKey: orderingKeys.cartCount });
      void queryClient.invalidateQueries({ queryKey: ['ordering', 'orders'] });
      // Ürün rezerve edildi; vitrindeki durumu değişti.
      void queryClient.invalidateQueries({ queryKey: ['catalog'] });
    },
  });
}

export function useMyOrders(filters: Partial<OrderListQuery> = {}) {
  return useQuery({
    queryKey: orderingKeys.orders(filters),
    queryFn: () =>
      apiRequest<Paginated<OrderSummary>>('/api/orders', {
        query: { page: filters.page, pageSize: filters.pageSize, status: filters.status },
      }),
  });
}

export function useOrder(orderId: string) {
  return useQuery({
    queryKey: orderingKeys.order(orderId),
    queryFn: async () => {
      const response = await apiRequest<{ order: Order }>(`/api/orders/${orderId}`);
      return response.order;
    },
    enabled: orderId !== '',
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { orderId: string; reason?: string }) =>
      apiRequest<{ success: boolean }>(`/api/orders/${input.orderId}/cancel`, {
        method: 'POST',
        body: { reason: input.reason },
      }),

    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: orderingKeys.order(variables.orderId) });
      void queryClient.invalidateQueries({ queryKey: ['ordering', 'orders'] });
      void queryClient.invalidateQueries({ queryKey: ['catalog'] });
    },
  });
}

/**
 * Takip numarasıyla sipariş durumu — oturum gerektirmez.
 *
 * Eski sitede bu özellik tamamen sahte veriyle çalışıyordu.
 */
export function useOrderTracking(reference: string, enabled: boolean) {
  return useQuery({
    queryKey: orderingKeys.tracking(reference),
    queryFn: async () => {
      const response = await apiRequest<{ order: PublicOrderStatus }>(
        `/api/order-tracking/${reference}`,
      );
      return response.order;
    },
    enabled: enabled && reference !== '',
    retry: false,
  });
}

// ---------------------------------------------------------------------------
// Yönetim
// ---------------------------------------------------------------------------

/**
 * Personelin gördüğü sipariş listesi.
 *
 * Müşterinin listesinden ayrı bir sorgu anahtarı kullanır: aynı anahtarı
 * paylaşsalardı personel kendi siparişlerini görürken önbellekteki tüm
 * siparişler listesiyle karışırdı.
 */
export function useAdminOrders(filters: Partial<AdminOrderListQuery> = {}) {
  return useQuery({
    queryKey: orderingKeys.adminOrders(filters),
    queryFn: () =>
      apiRequest<Paginated<OrderSummary>>('/api/admin/orders', {
        query: {
          page: filters.page,
          pageSize: filters.pageSize,
          status: filters.status,
          search: filters.search,
          fromDate: filters.fromDate,
          toDate: filters.toDate,
        },
      }),
    placeholderData: (previous) => previous,
  });
}

/**
 * Yalnızca personelin gördüğü not. Müşteriye giden yanıtlarda yer almaz.
 *
 * Boş metin notu siler; hizmet talebindeki not kutusuyla aynı sözleşme.
 */
export function useSetOrderStaffNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { orderId: string; note: string }) =>
      apiRequest<{ success: boolean }>(`/api/admin/orders/${input.orderId}/staff-note`, {
        method: 'PUT',
        body: { note: input.note },
      }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: orderingKeys.order(variables.orderId) });
    },
  });
}

/** Sipariş durumunu ilerletir. Geçişin geçerliliği sunucuda doğrulanır. */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { orderId: string; status: OrderStatus; note?: string }) =>
      apiRequest<{ success: boolean }>(`/api/admin/orders/${input.orderId}/status`, {
        method: 'PATCH',
        body: { status: input.status, note: input.note },
      }),

    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: orderingKeys.order(variables.orderId) });
      void queryClient.invalidateQueries({ queryKey: ['ordering', 'orders'] });
      void queryClient.invalidateQueries({ queryKey: ['ordering', 'admin'] });
      // Durum değişimi envanteri etkiler: teslim edilen ürün satıldı sayılır.
      void queryClient.invalidateQueries({ queryKey: ['catalog'] });
    },
  });
}
