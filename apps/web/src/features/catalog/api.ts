/**
 * Katalog sorguları.
 *
 * Backend'deki `catalog` modülünün karşılığı. Ağ çağrıları yalnızca burada.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AdminProductListQuery,
  CreateProductInput,
  ProductStatus,
  UpdateProductInput,
  Paginated,
  Product,
  ProductListQuery,
  ProductSummary,
} from '@ersinspot/shared';
import { apiRequest } from '@/lib/api';

export interface CategoryNode {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly displayOrder: number;
  readonly productCount: number;
  readonly children: readonly CategoryNode[];
}

export interface BrandSummary {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly logoUrl: string | null;
  readonly productCount: number;
}

export interface ProductDetail extends Product {
  readonly warrantyLabel: string;
}

export const catalogKeys = {
  all: ['catalog'] as const,
  products: (filters: Partial<ProductListQuery>) => ['catalog', 'products', filters] as const,
  product: (slug: string) => ['catalog', 'product', slug] as const,
  categories: ['catalog', 'categories'] as const,
  brands: ['catalog', 'brands'] as const,
  adminProducts: (filters: Partial<AdminProductListQuery>) =>
    ['catalog', 'admin', 'products', filters] as const,
  adminProduct: (id: string) => ['catalog', 'admin', 'product', id] as const,
};

export function useProducts(filters: Partial<ProductListQuery>) {
  return useQuery({
    queryKey: catalogKeys.products(filters),
    queryFn: () =>
      apiRequest<Paginated<ProductSummary>>('/api/products', {
        query: {
          page: filters.page,
          pageSize: filters.pageSize,
          categorySlug: filters.categorySlug,
          brandSlug: filters.brandSlug,
          condition: filters.condition,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
          search: filters.search,
          sort: filters.sort,
        },
      }),
    // Liste değişirken önceki sonuçlar ekranda kalsın: filtre değiştirince
    // sayfa boşalıp tekrar dolmaz, göz yormaz.
    placeholderData: (previous) => previous,
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: catalogKeys.product(slug),
    queryFn: async () => {
      const response = await apiRequest<{ product: ProductDetail }>(`/api/products/${slug}`);
      return response.product;
    },
    enabled: slug !== '',
  });
}

export function useCategories() {
  return useQuery({
    queryKey: catalogKeys.categories,
    queryFn: async () => {
      const response = await apiRequest<{ categories: CategoryNode[] }>('/api/categories');
      return response.categories;
    },
    // Kategoriler nadiren değişir; uzun süre taze sayılır.
    staleTime: 10 * 60_000,
  });
}

export function useBrands() {
  return useQuery({
    queryKey: catalogKeys.brands,
    queryFn: async () => {
      const response = await apiRequest<{ brands: BrandSummary[] }>('/api/brands');
      return response.brands;
    },
    staleTime: 10 * 60_000,
  });
}

// ---------------------------------------------------------------------------
// Yönetim
// ---------------------------------------------------------------------------

/**
 * Personelin gördüğü ürün listesi.
 *
 * Vitrin yalnızca satıştaki ve rezerve ürünleri gösterir; bu liste taslak,
 * depodaki ve satılmış ürünleri de içerir. Ayrı sorgu anahtarı kullanır ki
 * iki liste birbirinin önbelleğini ezmesin.
 */
export function useAdminProducts(filters: Partial<AdminProductListQuery> = {}) {
  return useQuery({
    queryKey: catalogKeys.adminProducts(filters),
    queryFn: () =>
      apiRequest<Paginated<ProductSummary>>('/api/admin/products', {
        query: {
          page: filters.page,
          pageSize: filters.pageSize,
          status: filters.status,
          categoryId: filters.categoryId,
          brandId: filters.brandId,
          condition: filters.condition,
          search: filters.search,
          sort: filters.sort,
        },
      }),
    placeholderData: (previous) => previous,
  });
}

/** Tek ürünün yönetim görünümü: taslak ve satılmış ürünler de okunabilir. */
export function useAdminProduct(productId: string) {
  return useQuery({
    queryKey: catalogKeys.adminProduct(productId),
    queryFn: async () => {
      const response = await apiRequest<{ product: Product }>(`/api/admin/products/${productId}`);
      return response.product;
    },
    enabled: productId !== '',
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProductInput) => {
      const response = await apiRequest<{ product: { productId: string } }>('/api/admin/products', {
        method: 'POST',
        body: input,
      });
      return response.product;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: catalogKeys.all });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { productId: string; product: UpdateProductInput }) =>
      apiRequest<{ success: boolean }>(`/api/admin/products/${input.productId}`, {
        method: 'PUT',
        body: input.product,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: catalogKeys.all });
    },
  });
}

/**
 * Ürün durumunu değiştirir.
 *
 * Ayrı bir uçtur: geçiş kuralları sunucuda doğrulanır (satılmış bir ürün
 * taslağa geri döndürülemez gibi).
 */
export function useUpdateProductStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { productId: string; status: ProductStatus }) =>
      apiRequest<{ success: boolean }>(`/api/admin/products/${input.productId}/status`, {
        method: 'PATCH',
        body: { status: input.status },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: catalogKeys.all });
    },
  });
}

/** Ürünü siler. Sunucu yumuşak silme yapar; siparişe bağlı ürün silinemez. */
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) =>
      apiRequest<{ success: boolean }>(`/api/admin/products/${productId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: catalogKeys.all });
    },
  });
}
