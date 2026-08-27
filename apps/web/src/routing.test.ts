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
 * SUNUCUNUN ÜRETTİĞİ ADRESLER de denetlenir. E-postalarda gönderilen
 * bağlantılar (`${WEB_ORIGIN}/eposta-dogrula?token=...` gibi) arayüz kaynağında
 * hiç geçmez; ilk sürümde iki bağlantının da sayfası yoktu ve bu, kayıt olan
 * hiç kimsenin e-postasını doğrulayamaması demekti — doğrulama üç hizmet
 * talebinin ön koşulu olduğu için üç akış birden kapalıydı.
 *
 * HENÜZ YAZILMAMIŞ SAYFALAR aşağıdaki listede tutulur. Liste bilinçli olarak
 * dar: bir adres buraya eklenmeden bağlantı verilemez, sayfa yazıldığında da
 * buradan çıkarılması gerekir. Yani listenin kendisi kalan işin dökümüdür.
 */

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = path.resolve(import.meta.dirname);
const API_SRC = path.resolve(import.meta.dirname, '../../api/src');

/**
 * Bağlantısı verilmiş ama sayfası henüz yazılmamış adresler.
 *
 * Her biri planlanan bir sayfadır; yazıldığında bu listeden çıkarılır.
 */
const PLANNED_PAGES: readonly string[] = [];

/** Kaynak ağacındaki tüm .ts/.tsx dosyaları (testler hariç). */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    if (!/\.tsx?$/.test(entry.name) || entry.name.includes('.test.')) return [];
    return [full];
  });
}

/**
 * `element={...}` özniteliklerini kaynaktan çıkarır.
 *
 * Öznitelik kendi içinde `<RequireStaff>` gibi JSX taşır; `>` karakterine
 * bakan bir düzenli ifade orada kırılır. Süslü parantezler sayılarak
 * çıkarıldığında geriye yalnızca `<Route path="..." >` iskeleti kalır ve
 * ayrıştırma önemsizleşir.
 */
function stripElementAttributes(source: string): string {
  let result = '';
  let index = 0;

  while (index < source.length) {
    const start = source.indexOf('element={', index);

    if (start === -1) {
      result += source.slice(index);
      break;
    }

    result += source.slice(index, start);

    let depth = 0;
    let cursor = start + 'element='.length;

    do {
      const char = source[cursor];
      if (char === '{') depth += 1;
      else if (char === '}') depth -= 1;
      cursor += 1;
    } while (depth > 0 && cursor < source.length);

    index = cursor;
  }

  return result;
}

/**
 * App.tsx içindeki rota yolları, İÇ İÇE OLANLAR ÇÖZÜLMÜŞ hâlde.
 *
 * `<Route path="/yonetim">` altındaki `<Route path="siparisler">` gerçekte
 * `/yonetim/siparisler` adresine karşılık gelir. Düz bir `path="..."` taraması
 * bunu göremez ve tanımlı bir rotayı "yok" sayar.
 */
function definedRoutes(): string[] {
  const source = stripElementAttributes(readFileSync(path.join(SRC, 'App.tsx'), 'utf8'));

  const routes: string[] = [];
  const parents: string[] = [];

  for (const token of source.matchAll(/<Route\b([^>]*?)(\/?)>|<\/Route>/g)) {
    if (token[0] === '</Route>') {
      parents.pop();
      continue;
    }

    const attributes = token[1] ?? '';
    const selfClosing = token[2] === '/';
    const prefix = parents.at(-1) ?? '';
    const own = /path="([^"]*)"/.exec(attributes)?.[1];

    if (own === undefined) {
      // `<Route index />` — ebeveynin kendi adresi.
      if (/\bindex\b/.test(attributes)) routes.push(prefix === '' ? '/' : prefix);
      if (!selfClosing) parents.push(prefix);
      continue;
    }

    const full = own.startsWith('/') ? own : `${prefix}/${own}`;
    routes.push(full);
    if (!selfClosing) parents.push(full);
  }

  return routes;
}

/**
 * Bağlantıyı karşılaştırılabilir hâle getirir.
 *
 * Sorgu dizesi atılır (rota onu görmez) ve şablon değişkenleri (`${id}`)
 * herhangi bir parça yerine geçen sabit bir simgeye çevrilir.
 */
function normalizeLink(link: string): string {
  return (link.replace(/\$\{[^}]*\}/g, 'X').split('?')[0] ?? '').replace(/\/$/, '') || '/';
}

/** Bir adres tanımlı rotalardan biriyle eşleşiyor mu? */
function isReachable(link: string, routes: readonly string[]): boolean {
  const target = normalizeLink(link);

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

/** Sunucu kaynağında `${env.WEB_ORIGIN}/...` biçiminde üretilen adresler. */
function serverGeneratedLinks(): { link: string; file: string }[] {
  const found: { link: string; file: string }[] = [];

  function walk(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(full);
        continue;
      }

      if (!entry.name.endsWith('.ts') || entry.name.includes('.test.')) continue;

      const source = readFileSync(full, 'utf8');

      for (const match of source.matchAll(/\$\{env\.WEB_ORIGIN\}(\/[\w\-/]*)/g)) {
        const link = match[1];
        if (link !== undefined) found.push({ link, file: path.relative(API_SRC, full) });
      }
    }
  }

  walk(API_SRC);
  return found;
}

describe('Yönlendirme bütünlüğü', () => {
  it('sunucunun e-postada verdiği her adresin bir sayfası vardır', () => {
    const routes = definedRoutes();

    const broken = serverGeneratedLinks()
      .filter(({ link }) => !isReachable(link, routes))
      .map(({ link, file }) => `${link}  (apps/api/src/${file})`);

    expect(broken).toEqual([]);
  });

  it('her iç bağlantının tanımlı bir rotası vardır', () => {
    const routes = definedRoutes();

    /*
      Planlanan bir sayfa ALT ADRESLERİNİ de kapsar: `/yonetim/talepler` henüz
      yazılmadıysa `/yonetim/talepler/:id` de yazılmamış demektir. Aksi hâlde
      liste her alt adres için ayrı satır taşımak zorunda kalırdı.
    */
    const isPlanned = (link: string): boolean => {
      const target = normalizeLink(link);
      return PLANNED_PAGES.some(
        (planned) => target === planned || target.startsWith(`${planned}/`),
      );
    };

    const broken = internalLinks()
      .filter(({ link }) => !isReachable(link, routes) && !isPlanned(link))
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

    /*
      `lazy(() => import('./routes/x.tsx'))` ile yüklenen her sayfa dosyası var mı?
      Yol alt dizin içerebilir (`routes/admin/orders.tsx`); eğik çizgi kalıba
      dahildir, aksi hâlde panel sayfaları hiç denetlenmezdi.
    */
    const imported = [...app.matchAll(/import\('\.\/(routes\/[\w\-/]+\.tsx)'\)/g)].map(
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
