/**
 * Arayüz tutarlılığı.
 *
 * Sayfalar aynı çerçeveyi paylaşmalıdır: aynı genişlik ölçüleri, aynı başlık
 * biçimi, aynı kart görünümü. İçerik sayfadan sayfaya değişir, çerçeve
 * değişmez.
 *
 * Denetimde on bir sayfada SEKİZ farklı kapsayıcı ölçüsü ve üç farklı kart
 * dolgusu bulundu; aynı işi yapan iki ekran farklı görünüyordu. Bu test o
 * durumun geri dönmesini engeller: yeni bir sayfa ortak bileşenleri
 * kullanmazsa düşer.
 */

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROUTES = path.resolve(import.meta.dirname, '../../routes');
const UI = path.resolve(import.meta.dirname);

function pageFiles(): { name: string; source: string }[] {
  return readdirSync(ROUTES)
    .filter((name) => name.endsWith('.tsx') && !name.includes('.test.'))
    .map((name) => ({ name, source: readFileSync(path.join(ROUTES, name), 'utf8') }));
}

describe('Arayüz tutarlılığı', () => {
  it('hiçbir sayfa kendi kapsayıcı ölçüsünü yazmaz', () => {
    const offenders = pageFiles()
      .filter(({ source }) => /mx-auto\s+max-w-/.test(source))
      .map(({ name }) => name);

    expect(offenders).toEqual([]);
  });

  it('her sayfa PageContainer kullanır', () => {
    const offenders = pageFiles()
      .filter(({ source }) => !source.includes('<PageContainer'))
      .map(({ name }) => name);

    expect(offenders).toEqual([]);
  });

  it('sayfa başlığı elle yazılmaz', () => {
    /*
      `h1` normalde yalnızca `PageHeader` içinde bulunur. İki sayfa bilinçli
      istisnadır ve başlıkları kendi düzenlerinin parçasıdır:

        home.tsx           — kahraman başlığı bir pazarlama metnidir; koyu
                             zemin üzerinde ve diğer sayfaların başlığından
                             büyüktür.
        product-detail.tsx — ürün adı galerinin yanındaki sütunda, fiyat ve
                             rozetlerle birlikte durur; sayfanın üstüne
                             alınırsa düzen bozulur.

      Liste bilinçli olarak kısa: üçüncü bir istisna eklenecekse önce
      `PageHeader`ın o durumu karşılayıp karşılayamayacağı sorulmalıdır.
    */
    const EXEMPT = ['home.tsx', 'product-detail.tsx'];

    const offenders = pageFiles()
      .filter(({ name }) => !EXEMPT.includes(name))
      .filter(({ source }) => source.includes('<h1'))
      .map(({ name }) => name);

    expect(offenders).toEqual([]);
  });

  it('kart görünümü elle yazılmaz', () => {
    const cardClass = /rounded-(?:xl|lg|2xl)\s+border\s+border-slate-200\s+bg-white/;

    const offenders = pageFiles()
      .filter(({ source }) => cardClass.test(source))
      .map(({ name }) => name);

    expect(offenders).toEqual([]);
  });

  it('ortak bileşenler tek bir kart ölçü kümesi tanımlar', () => {
    // Ölçüler `card.tsx` içinde bir kez tanımlanır; başka bir ui dosyası
    // kendi kart stilini yazarsa iki kaynak oluşur.
    const cardClass = /rounded-(?:xl|lg|2xl)\s+border\s+border-slate-200\s+bg-white/;

    const offenders = readdirSync(UI)
      .filter((name) => name.endsWith('.tsx') && name !== 'card.tsx')
      .filter((name) => cardClass.test(readFileSync(path.join(UI, name), 'utf8')));

    expect(offenders).toEqual([]);
  });
});
