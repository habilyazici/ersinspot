/**
 * Sepet ve sipariş sorguları.
 *
 * Backend'deki `ordering` modülünün karşılığı.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Cart,
  CreateOrderInput,
  Order,
  OrderListQuery,
  OrderSummary,
  OrderStatus,
  Paginated,
} from '@ersinspot/shared';
import { apiRequest } from '@/lib/api';

export interface PublicOrderStatus {
  readonly referenceNumber: string;
  readonly status: OrderStatus;
  readonly itemCount: number;
  readonly deliveryDate: string | null;
  readonly createdAt: string;
  readonly timeline: readonly { status: OrderStatus; occurredAt: string }[];
}

export const orderingKeys = {
  cart: ['ordering', 'cart'] as const,
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

/** Başlıktaki rozet için; tam sepeti çekmeye gerek yok. */
export function useCartCount() {
  return useQuery({
    queryKey: orderingKeys.cartCount,
    queryFn: async () => {
      const response = await apiRequest<{ count: number }>('/api/cart/count');
      return response.count;
    },
    // Oturumsuz kullanıcıda 401 döner; hata gösterilmez, sayaç sıfır kalır.
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
// Sipariş
// ---------------------------------------------------------------------------

export interface CreateOrderResult {
  readonly orderId: string;
  readonly referenceNumber: string;
  readonly totalKurus: number;
}

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
