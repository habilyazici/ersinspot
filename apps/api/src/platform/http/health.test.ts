/**
 * Canlılık ve hazırlık uçları.
 *
 * İkisi FARKLI soruları yanıtlar ve karıştırıldıklarında ikisi de yanlış
 * cevap verir:
 *
 *   /health — süreç ayakta mı? Yeniden başlatma kararı buna bakar. Veritabanı
 *             erişilemezken API'yi yeniden başlatmak veritabanını geri
 *             getirmez, yalnızca bir döngü üretir.
 *   /ready  — istek karşılayabilir mi? İzleme ve trafik yönlendirme buna bakar.
 *
 * Tek uç varken veritabanı düştüğünde de 200 dönüyordu: site her isteğe 500
 * verirken izleme yemyeşil görünüyor, arızayı ilk fark eden müşteri oluyordu.
 */

import { describe, expect, it } from 'vitest';
import { request } from '../../test/helpers.ts';

describe('canlılık ucu', () => {
  it('süreç ayaktayken ok döner', async () => {
    const response = await request('/health');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  it('sistem bilgisi sızdırmaz', async () => {
    /*
      Sürüm, ortam adı ve bağımlılık durumu saldırgana yardımcı olur; dışarıya
      açık, kimlik doğrulaması olmayan bir uçta yerleri yoktur.
    */
    const text = await (await request('/health')).text();

    expect(text).not.toMatch(/version|sürüm|node|postgres|env/i);
    expect(text.length).toBeLessThan(60);
  });
});

describe('hazırlık ucu', () => {
  it('veritabanına erişilebiliyorken hazır döner', async () => {
    const response = await request('/ready');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ready' });
  });

  it('yanıtı bağlantı ayrıntısı taşımaz', async () => {
    // Başarısızlık durumunda da yalnızca "hazır değil" denir; sürücü hatası değil.
    const text = await (await request('/ready')).text();

    expect(text).not.toMatch(/postgres|5432|ECONN|connect/i);
  });

  it('oturum gerektirmez', async () => {
    // Yük dengeleyici ve izleme aracı kimlik doğrulamaz.
    expect((await request('/health')).status).toBe(200);
    expect((await request('/ready')).status).toBe(200);
  });
});
