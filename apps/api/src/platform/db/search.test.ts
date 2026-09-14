/**
 * Arama normalleştirmesi.
 *
 * Aramanın iki tarafı iki AYRI yerde normalleştiriliyor: sorgu metni
 * `toAsciiLower` ile JavaScript'te, sütun ise `translate` + `lower` ile
 * PostgreSQL'de. İkisi ayrışırsa arama sessizce sonuç bulamaz — hata da
 * vermez, sadece boş liste döner.
 *
 * Bu dosya ikisini aynı örnekler üzerinde karşılaştırır ve aramanın gerçekten
 * Türkçe harf duyarsız olduğunu doğrular.
 */

import { describe, expect, it } from 'vitest';
import { toAsciiLower } from '@ersinspot/shared';
import { sql } from 'drizzle-orm';
import { db } from './client.ts';
import { contains } from './search.ts';

/** SQL tarafının aynı metni nasıl indirgediğini okur. */
async function sqlNormalize(text: string): Promise<string> {
  const rows = await db.execute<{ value: string }>(
    sql`select lower(translate(${text}::text, 'çÇğĞıIİiöÖşŞüÜ', 'ccggiiiioossuu')) as value`,
  );

  return rows[0]?.value ?? '';
}

describe('arama normalleştirmesi', () => {
  const ornekler = [
    'Arçelik No-Frost Buzdolabı',
    'ÇAMAŞIR MAKİNESİ',
    'Işık Ürünleri',
    'Öztiryakiler Şahin Ğ',
    'BUZDOLABI',
    'iğne İĞNE ığne',
    'Bosch 9 kg',
    '',
  ];

  it('JavaScript ve SQL aynı sonucu verir', async () => {
    for (const ornek of ornekler) {
      expect(await sqlNormalize(ornek)).toBe(toAsciiLower(ornek));
    }
  });

  it('büyük I harfini ı gibi indirger', async () => {
    /*
      `lower('I')` bu kurulumda 'i' verir, Türkçedeki 'ı' değil. Tümü büyük
      harfle yazılmış "BUZDOLABI" başlığı, "buzdolabı" aramasıyla bu yüzden
      eşleşmiyordu.
    */
    expect(await sqlNormalize('BUZDOLABI')).toBe('buzdolabi');
    expect(toAsciiLower('buzdolabı')).toBe('buzdolabi');
  });
});

describe('arama koşulu', () => {
  /** Koşulu tek bir metin üzerinde çalıştırır; tablo gerektirmez. */
  async function eslesiyorMu(metin: string, arama: string): Promise<boolean> {
    const kosul = contains(sql`${metin}::text` as never, arama);
    const rows = await db.execute<{ value: boolean }>(sql`select (${kosul}) as value`);

    return rows[0]?.value ?? false;
  }

  it('Türkçe harf yazılmadan da bulur', async () => {
    /*
      Ölçülen davranış şuydu: "çamaşır" bir sonuç veriyor, "camasir" hiç
      vermiyordu. Türkçe klavyede ı, ş, ğ yazmak tuş değiştirmeyi gerektirir
      ve müşterilerin önemli bir kısmı telefonda bu harfleri hiç yazmaz.
    */
    expect(await eslesiyorMu('Bosch 9 kg Çamaşır Makinesi', 'camasir')).toBe(true);
    expect(await eslesiyorMu('Arçelik No Frost Buzdolabı', 'buzdolabi')).toBe(true);
    expect(await eslesiyorMu('Bulaşık Makinesi', 'bulasik')).toBe(true);
  });

  it('büyük harfle yazılmış başlığı bulur', async () => {
    expect(await eslesiyorMu('BUZDOLABI 520 LİTRE', 'buzdolabı')).toBe(true);
    expect(await eslesiyorMu('ÇAMAŞIR MAKİNESİ', 'çamaşır')).toBe(true);
  });

  it('Türkçe yazımı da bulur', async () => {
    expect(await eslesiyorMu('Bosch 9 kg Çamaşır Makinesi', 'çamaşır')).toBe(true);
  });

  it('eşleşmeyen metni bulmaz', async () => {
    expect(await eslesiyorMu('Bosch 9 kg Çamaşır Makinesi', 'buzdolabi')).toBe(false);
  });

  it('joker karakterleri düz metin sayar', async () => {
    // "%" her kaydı eşleştirseydi arama kutusu süzgeç olmaktan çıkardı.
    expect(await eslesiyorMu('Bosch 9 kg', '%')).toBe(false);
    expect(await eslesiyorMu('%50 indirim', '%50')).toBe(true);
    expect(await eslesiyorMu('a_b', 'a_b')).toBe(true);
    expect(await eslesiyorMu('axb', 'a_b')).toBe(false);
  });
});
