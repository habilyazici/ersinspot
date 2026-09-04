/**
 * catalog özellik modülü — genel sözleşme.
 */

export {
  catalogKeys,
  flattenCategories,
  useAdminProduct,
  useAdminProducts,
  useBrands,
  useCategories,
  useCreateProduct,
  useDeleteProduct,
  useProduct,
  useProducts,
  useUpdateProduct,
  useUpdateProductStatus,
} from './api.ts';
export type { BrandSummary, CategoryNode, ProductDetail } from './api.ts';
export { ProductCard } from './product-card.tsx';
