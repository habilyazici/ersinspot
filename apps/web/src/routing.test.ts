/**
 * Yönlendirme bütünlüğü.
 *
 * Ölü bağlantı, tarayıcıda tıklanana kadar görünmeyen bir hatadır: tip
 * denetimi yakalamaz, lint yakalamaz, bileşen testi yakalamaz. Denetimde
 * ödeme sayfasının başarı sonrası yönlendirdiği adresin (`/hesabim/
 * siparislerim/:orderId`) hiç tanımlı olmadığı böyle bulundu — sipariş veren
 * kullanıcı doğrudan 404 sayfasına düşüyordu.
 *
 * Bu test kaynak kodu tarar: `<Link to>`, `navigate()` ve `href` ile verilen
 * her iç adresin `App.tsx` içinde bir karşılığı olmasını şart koşar.
 *
 * HENÜZ YAZILMAMIŞ SAYFALAR aşağıdaki listede tutulur. Liste bilinçli olarak
 * dar: bir adres buraya eklenmeden bağlantı verilemez, sayfa yazıldığında da
 * buradan çıkarılması gerekir. Yani listenin kendisi kalan işin dökümüdür.
 */

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = path.resolve(import.meta.dirname);

/**
 * Bağlantısı verilmiş ama sayfası henüz yazılmamış adresler.
 *
 * Her biri planlanan bir sayfadır; yazıldığında bu listeden çıkarılır.
 */
const PLANNED_PAGES = [] as const;

/** Kaynak ağacındaki tüm .ts/.tsx dosyaları (testler hariç). */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    if (!/\.tsx?$/.test(entry.name) || entry.name.includes('.test.')) return [];
    return [full];
  });
}

/** App.tsx içindeki `path="..."` tanımları. */
function definedRoutes(): string[] {
  const app = readFileSync(path.join(SRC, 'App.tsx'), 'utf8');
  return [...app.matchAll(/path="([^"]*)"/g)].map((match) => match[1] ?? '');
}

/** Bir adres tanımlı rotalardan biriyle eşleşiyor mu? */
function isReachable(link: string, routes: readonly string[]): boolean {
  // Şablon değişkenleri (`${id}`) herhangi bir parça yerine geçer.
  const target = (link.replace(/\$\{[^}]*\}/g, 'X').split('?')[0] ?? '').replace(/\/$/, '') || '/';

  return routes.some((route) => {
    if (route === '*') return false; // 404 yakalayıcı; ulaşılabilirlik saymaz
    const pattern = `^${(route.replace(/\/$/, '') || '/').replace(/:[A-Za-z_]\w*/g, '[^/]+')}$`;
    return new RegExp(pattern).test(target);
  });
}

/** Kaynakta geçen iç bağlantılar: [adres, dosya]. */
function internalLinks(): { link: string; file: string }[] {
  const patterns = [
    /\bto=\{?[`'"]([^`'"]+)[`'"]/g,
    /navigate\(\s*[`'"]([^`'"]+)[`'"]/g,
    /href=[`'"](\/[^`'"]*)[`'"]/g,
  ];

  const found: { link: string; file: string }[] = [];

  for (const file of sourceFiles(SRC)) {
    const source = readFileSync(file, 'utf8');

    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern)) {
        const link = match[1];
        if (link?.startsWith('/') === true) {
          found.push({ link, file: path.relative(SRC, file) });
        }
      }
    }
  }

  return found;
}

describe('Yönlendirme bütünlüğü', () => {
  it('her iç bağlantının tanımlı bir rotası vardır', () => {
    const routes = definedRoutes();
    const planned = new Set<string>(PLANNED_PAGES);

    const broken = internalLinks()
      .filter(({ link }) => !isReachable(link, routes) && !planned.has(link))
      .map(({ link, file }) => `${link}  (${file})`);

    expect(broken).toEqual([]);
  });

  it('yazılmayı bekleyen sayfa listesi güncel tutulur', () => {
    const routes = definedRoutes();

    // Sayfa yazıldıysa listeden çıkarılmalı; aksi halde liste yalan söyler.
    const alreadyBuilt = PLANNED_PAGES.filter((link) => isReachable(link, routes));

    expect(alreadyBuilt).toEqual([]);
  });

  it('her rota bir sayfa bileşenine bağlıdır', () => {
    const app = readFileSync(path.join(SRC, 'App.tsx'), 'utf8');

    // `lazy(() => import('./routes/x.tsx'))` ile yüklenen her sayfa dosyası var mı?
    const imported = [...app.matchAll(/import\('\.\/(routes\/[\w-]+\.tsx)'\)/g)].map(
      (match) => match[1] ?? '',
    );

    expect(imported.length).toBeGreaterThan(0);

    const missing = imported.filter((file) => {
      try {
        readFileSync(path.join(SRC, file), 'utf8');
        return false;
      } catch {
        return true;
      }
    });

    expect(missing).toEqual([]);
  });
});
