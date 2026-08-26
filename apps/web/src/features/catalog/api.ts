/**
 * Katalog sorguları.
 *
 * Backend'deki `catalog` modülünün karşılığı. Ağ çağrıları yalnızca burada.
 */

import { useQuery } from '@tanstack/react-query';
import type { Paginated, Product, ProductListQuery, ProductSummary } from '@ersinspot/shared';
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
  products: (filters: Partial<ProductListQuery>) => ['catalog', 'products', filters] as const,
  product: (slug: string) => ['catalog', 'product', slug] as const,
  categories: ['catalog', 'categories'] as const,
  brands: ['catalog', 'brands'] as const,
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
