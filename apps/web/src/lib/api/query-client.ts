/**
 * Sorgu önbelleği yapılandırması.
 *
 * TanStack Query, sunucudan gelen veriyi önbelleğe alır ve yükleme/hata
 * durumlarını yönetir. Eski kod tabanında her sayfa kendi `loading` ve `error`
 * state'ini yazıyordu (24 ve 16 ayrı tanım) ve davranışları tutarsızdı.
 */

import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@ersinspot/shared';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /*
       * Veri bu süre boyunca taze sayılır; sekme değiştirip geri dönüldüğünde
       * gereksiz istek atılmaz. Ürün fiyatları sık değişmediği için bir dakika
       * makul bir denge.
       */
      staleTime: 60_000,

      /*
       * Yeniden deneme yalnızca geçici hatalarda.
       *
       * 401, 403 ve 404 tekrar denemekle düzelmez; denemek hem kullanıcıyı
       * bekletir hem sunucuyu gereksiz yorar.
       */
      retry: (failureCount, error) => {
        if (error instanceof ApiError) {
          return error.isRetryable && failureCount < 2;
        }
        return failureCount < 2;
      },

      refetchOnWindowFocus: false,
    },

    mutations: {
      // Yazma işlemleri tekrarlanmaz: aynı siparişin iki kez oluşması riski var.
      retry: false,
    },
  },
});
