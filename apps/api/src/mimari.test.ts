/**
 * Mimari sözleşmesinin doğrulanması.
 *
 * `docs/MIMARI.md` bir niyet beyanı değil, uyulması gereken bir sözleşmedir.
 * Ama belge kodla birlikte güncellenmezse tam tersi olur: yanlış bir haritaya
 * bakan kişi yanlış yere yazar. Denetimde tam olarak bu görüldü — jsonb'den
 * ilişkisele geçişte eklenen altı tablo (`customer_addresses`,
 * `order_addresses`, `request_addresses`, `payments`, `tags`,
 * `blog_post_tags`) belgedeki sahiplik haritasına hiç işlenmemişti.
 *
 * Bu test belgeyi kaynak kabul eder ve koda karşı doğrular. Sınır ihlallerini
 * ESLint zaten engelliyor; buradaki kontrol tamamlayıcıdır: ESLint "yanlış
 * modülden içe aktarma" yakalar, bu test "belge yalan söylüyor" yakalar.
 */

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');
const MODULES_DIR = path.resolve(import.meta.dirname, 'modules');

/** MIMARI.md'deki sahiplik tablosu: tablo adı -> modül. */
function ownershipFromDocs(): Map<string, string> {
  const doc = readFileSync(path.join(REPO_ROOT, 'docs/MIMARI.md'), 'utf8');
  const owners = new Map<string, string>();

  for (const line of doc.split('\n')) {
    const row = /^\|\s*`(\w+)`\s*\|(.*)\|/.exec(line);
    if (row === null) continue;

    const [, moduleName = '', tableCell = ''] = row;
    if (!knownModules().includes(moduleName)) continue;

    for (const match of tableCell.matchAll(/`(\w+)`/g)) {
      const table = match[1];
      if (table !== undefined) owners.set(table, moduleName);
    }
  }

  return owners;
}

/** Modül dizinlerinin adları. */
function knownModules(): string[] {
  return readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

/** Modül şemalarındaki `pgTable('ad', ...)` tanımları: tablo adı -> modül. */
function ownershipFromCode(): Map<string, string> {
  const owners = new Map<string, string>();

  for (const moduleName of knownModules()) {
    const schemaPath = path.join(MODULES_DIR, moduleName, 'infrastructure/schema.ts');

    let source: string;
    try {
      source = readFileSync(schemaPath, 'utf8');
    } catch {
      continue; // Her modülün kendi tablosu olmak zorunda değil.
    }

    for (const match of source.matchAll(/pgTable\(\s*'(\w+)'/g)) {
      const table = match[1];
      if (table !== undefined) owners.set(table, moduleName);
    }
  }

  return owners;
}

describe('Mimari sözleşmesi', () => {
  it('belgedeki sahiplik haritası kodla birebir aynıdır', () => {
    const docs = ownershipFromDocs();
    const code = ownershipFromCode();

    const sorted = (map: Map<string, string>): string[] =>
      [...map.entries()].map(([table, owner]) => `${owner}: ${table}`).sort();

    expect(sorted(docs)).toEqual(sorted(code));
  });

  it('hiçbir tablo iki modülde birden tanımlanmaz', () => {
    const seen = new Map<string, string[]>();

    for (const moduleName of knownModules()) {
      const schemaPath = path.join(MODULES_DIR, moduleName, 'infrastructure/schema.ts');

      let source: string;
      try {
        source = readFileSync(schemaPath, 'utf8');
      } catch {
        continue;
      }

      for (const match of source.matchAll(/pgTable\(\s*'(\w+)'/g)) {
        const table = match[1];
        if (table === undefined) continue;
        seen.set(table, [...(seen.get(table) ?? []), moduleName]);
      }
    }

    const duplicated = [...seen.entries()]
      .filter(([, modules]) => modules.length > 1)
      .map(([table, modules]) => `${table}: ${modules.join(', ')}`);

    expect(duplicated).toEqual([]);
  });

  it('her modül genel sözleşmesini index.ts üzerinden verir', () => {
    // Kural 1: modüller arası erişim yalnızca genel sözleşme üzerinden.
    const withoutContract = knownModules().filter((moduleName) => {
      try {
        readFileSync(path.join(MODULES_DIR, moduleName, 'index.ts'), 'utf8');
        return false;
      } catch {
        return true;
      }
    });

    expect(withoutContract).toEqual([]);
  });

  it('yönetim uçlarının tamamı rota tanımında yetki bildirir', () => {
    /*
      Kural 3: yetkilendirme rota tanımında bildirilir, handler içinde değil.
      Eski kod tabanında ürün yazma uçlarının üçü de korumasızdı; bu testin
      varlık sebebi odur.
    */
    const unguarded: string[] = [];

    for (const moduleName of knownModules()) {
      const routesPath = path.join(MODULES_DIR, moduleName, 'api/routes.ts');

      let source: string;
      try {
        source = readFileSync(routesPath, 'utf8');
      } catch {
        continue;
      }

      // Her rota tanımını handler gövdesine kadar olan kısmıyla incele.
      const definitions = source.split(/(?=^\w+Routes\.(?:get|post|put|patch|delete)\()/m);

      for (const definition of definitions.slice(1)) {
        const header = /^\w+Routes\.(\w+)\(\s*'([^']*)'/.exec(definition);
        if (header === null) continue;

        const [, method = '', routePath = ''] = header;
        if (!routePath.startsWith('/admin/')) continue;

        const handlerStart = definition.indexOf('async (c)');
        const args = definition.slice(0, handlerStart > 0 ? handlerStart : 900);

        if (!/\b(requireStaff|requireAdmin)\b/.test(args)) {
          unguarded.push(`${method.toUpperCase()} ${routePath} (${moduleName})`);
        }
      }
    }

    expect(unguarded).toEqual([]);
  });
});
