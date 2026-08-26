/**
 * Tarayıcı testi hazırlığı.
 *
 * jsdom, gerçek bir tarayıcının tüm API'lerini sağlamaz; testlerde kullanılan
 * eksikler burada tamamlanır.
 */

import '@testing-library/jest-dom/vitest';

// jsdom `matchMedia` sağlamaz; duyarlı bileşenler onu okur.
if (typeof window !== 'undefined' && window.matchMedia === undefined) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}
