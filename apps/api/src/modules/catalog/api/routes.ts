/**
 * Katalog HTTP uçları.
 *
 * Yetkilendirme bu dosyada, rota tanımının kendisinde bildirilir. Handler'ların
 * içinde yetki kontrolü YOKTUR — olsaydı unutulabilirdi.
 *
 * Eski kod tabanında ürün oluşturma, güncelleme ve silme uçlarının üçü de
 * korumasızdı: katalog dışarıdan değiştirilebiliyor veya tamamen silinebiliyordu.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { adminProductListQuerySchema, productListQuerySchema, uuidSchema } from '@ersinspot/shared';
import type { AuthVariables } from '../../../platform/http/auth.ts';
import { requireStaff } from '../../../platform/http/auth.ts';
import type { ValidatedVariables } from '../../../platform/http/validate.ts';
import { params, query, validateParams, validateQuery } from '../../../platform/http/validate.ts';
import * as productService from '../application/product-service.ts';
import * as categoryService from '../application/category-service.ts';

type Variables = AuthVariables & ValidatedVariables;

const slugParamSchema = z.object({ slug: z.string().min(1).max(100) });
const idParamSchema = z.object({ id: uuidSchema });

export const catalogRoutes = new Hono<{ Variables: Variables }>();

// ---------------------------------------------------------------------------
// Herkese açık uçlar
// ---------------------------------------------------------------------------
// Ürün vitrini oturum gerektirmez. Yalnızca satıştaki ve rezerve ürünler döner;
// hangi durumların görüneceğine istemci karar veremez.

catalogRoutes.get('/products', validateQuery(productListQuerySchema), async (c) => {
  const filters = query(c, productListQuerySchema);
  return c.json(await productService.listProducts(filters));
});

catalogRoutes.get('/products/:slug', validateParams(slugParamSchema), async (c) => {
  const { slug } = params(c, slugParamSchema);
  return c.json({ product: await productService.getProductBySlug(slug) });
});

catalogRoutes.get('/categories', async (c) => {
  return c.json({ categories: await categoryService.listCategoryTree() });
});

catalogRoutes.get('/brands', async (c) => {
  return c.json({ brands: await categoryService.listBrands() });
});

// ---------------------------------------------------------------------------
// Yönetim uçları
// ---------------------------------------------------------------------------
// `requireStaff` rota tanımında; handler'a hiç ulaşılmadan yetki denetlenir.

catalogRoutes.get(
  '/admin/products',
  requireStaff,
  validateQuery(adminProductListQuerySchema),
  async (c) => {
    const filters = query(c, adminProductListQuerySchema);
    return c.json(await productService.listProductsForAdmin(filters));
  },
);

catalogRoutes.get('/admin/products/:id', requireStaff, validateParams(idParamSchema), async (c) => {
  const { id } = params(c, idParamSchema);
  return c.json({ product: await productService.getProductById(id) });
});
