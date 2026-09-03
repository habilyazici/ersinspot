/**
 * Kimlik doğrulama uçlarının testleri.
 *
 * Elle yazılmış auth katmanında testler isteğe bağlı değildir. Bu dosya, denetimde
 * bulunan açıkların her birinin kapandığını doğrular ve bir gerileme (regression)
 * olduğunda derlemeyi kırar.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '../../../platform/db/client.ts';
import { passwordResetTokens, sessions, users } from '../infrastructure/schema.ts';
import { hashToken } from '../domain/tokens.ts';
import { clearSentEmails, getSentEmails } from '../../../platform/mailer.ts';
import {
  app,
  createTestUser,
  extractCookie,
  loginAs,
  request,
  resetDatabase,
} from '../../../test/helpers.ts';

beforeEach(async () => {
  await resetDatabase();
});

// ---------------------------------------------------------------------------
// Kayıt
// ---------------------------------------------------------------------------

describe('POST /api/auth/register', () => {
  const validPayload = {
    fullName: 'Ayşe Yılmaz',
    email: 'ayse@example.com',
    phone: '0507 194 05 50',
    password: 'cok-guclu-bir-sifre',
    passwordConfirm: 'cok-guclu-bir-sifre',
    acceptedTerms: true,
  };

  it('geçerli bilgilerle hesap oluşturur', async () => {
    const response = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(validPayload),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ success: true });

    const [row] = await db
      .select({ email: users.email, role: users.role })
      .from(users)
      .where(eq(users.email, 'ayse@example.com'));

    expect(row?.email).toBe('ayse@example.com');
    expect(row?.role).toBe('customer');
  });

  /**
   * Kayıt oturum AÇMAZ.
   *
   * Yanıt gövdesi ve çerez davranışı, adresin kayıtlı olup olmadığına göre
   * değişmemelidir: değişseydi saldırgan yanıtın şeklinden hangi adreslerin
   * sistemde olduğunu çıkarırdı. Kullanıcı e-postasını doğrulayıp giriş yapar.
   */
  it('oturum açmaz ve çerez yazmaz', async () => {
    const response = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(validPayload),
    });

    expect(extractCookie(response)).toBeNull();
  });

  it('kayıtlı adrese kayıt denemesinde ayırt edilebilir yanıt vermez', async () => {
    const first = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(validPayload),
    });

    const second = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(validPayload),
    });

    expect(second.status).toBe(first.status);
    expect(await second.json()).toEqual(await first.json());
    expect(extractCookie(second)).toBe(extractCookie(first));

    // İkinci deneme ikinci bir hesap açmamalı.
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, validPayload.email));
    expect(rows).toHaveLength(1);
  });

  it('şifreyi düz metin olarak saklamaz', async () => {
    await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(validPayload),
    });

    const [row] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, 'ayse@example.com'));

    expect(row?.passwordHash).toBeDefined();
    expect(row?.passwordHash).not.toBe(validPayload.password);
    // argon2id biçiminde olmalı.
    expect(row?.passwordHash).toMatch(/^\$argon2id\$/);
  });

  it('telefon numarasını E.164 biçimine normalleştirir', async () => {
    await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(validPayload),
    });

    const [row] = await db
      .select({ phone: users.phone })
      .from(users)
      .where(eq(users.email, 'ayse@example.com'));

    expect(row?.phone).toBe('+905071940550');
  });

  it('e-postayı küçük harfe çevirir', async () => {
    await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...validPayload, email: 'AYSE@Example.COM' }),
    });

    const [row] = await db.select({ email: users.email }).from(users);
    expect(row?.email).toBe('ayse@example.com');
  });

  it('var olan e-posta için hesabın varlığını ele vermez', async () => {
    await createTestUser({ email: 'ayse@example.com' });

    const response = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(validPayload),
    });

    // Kullanıcı numaralandırmayı engellemek için başarı gibi yanıtlanır.
    expect(response.status).toBe(201);

    const payload = (await response.json()) as { success: boolean; user?: unknown };
    expect(payload.success).toBe(true);
    // Ancak oturum açılmaz ve kullanıcı bilgisi dönmez.
    expect(payload.user).toBeUndefined();

    // İkinci bir kayıt oluşmamalı.
    const rows = await db.select({ id: users.id }).from(users);
    expect(rows).toHaveLength(1);
  });

  it('şifre e-posta adresini içeremez', async () => {
    const response = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        ...validPayload,
        password: 'ayse-cok-guvenli-parola',
        passwordConfirm: 'ayse-cok-guvenli-parola',
      }),
    });

    expect(response.status).toBe(400);
  });

  it('şifre adı içeremez', async () => {
    /*
      Bağlama özgü kelimeler saldırganın ilk denediği şeylerdir; NIST SP
      800-63B bunları reddetmeyi önerir. E-posta kontrolü baştan vardı, ad
      kontrolü yorumda yazıyor ama uygulanmıyordu.
    */
    const response = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        ...validPayload,
        email: 'farkli@example.com',
        password: 'yilmaz-parolasi-uzun',
        passwordConfirm: 'yilmaz-parolasi-uzun',
      }),
    });

    expect(response.status).toBe(400);
  });

  it('kısa ad parçası makul şifreyi reddetmez', async () => {
    // "Ayşe" dört harf; eşik altı parçalar rastgele şifrelerde de bulunur.
    const response = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        ...validPayload,
        fullName: 'Ece Can',
        email: 'ece@example.com',
        password: 'kasimpasa-tren-defter',
        passwordConfirm: 'kasimpasa-tren-defter',
      }),
    });

    expect(response.status).toBe(201);
  });

  it('şifreler eşleşmezse reddeder', async () => {
    const response = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...validPayload, passwordConfirm: 'baska-sifre' }),
    });

    expect(response.status).toBe(400);

    const payload = (await response.json()) as {
      error: { code: string; fields: { path: string }[] };
    };
    expect(payload.error.code).toBe('validation_failed');
    expect(payload.error.fields.some((f) => f.path === 'passwordConfirm')).toBe(true);
  });

  it('kısa şifreyi reddeder', async () => {
    const response = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...validPayload, password: 'kisa', passwordConfirm: 'kisa' }),
    });

    expect(response.status).toBe(400);
  });

  it('geçersiz telefon numarasını reddeder', async () => {
    const response = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...validPayload, phone: '0232 123 45 67' }),
    });

    expect(response.status).toBe(400);
  });

  it('kullanım koşulları kabul edilmezse reddeder', async () => {
    const response = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...validPayload, acceptedTerms: false }),
    });

    expect(response.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Giriş
// ---------------------------------------------------------------------------

describe('POST /api/auth/login', () => {
  it('doğru bilgilerle oturum açar', async () => {
    const user = await createTestUser();

    const response = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: user.email, password: user.password }),
    });

    expect(response.status).toBe(200);
    expect(extractCookie(response)).toContain('ersinspot_session=');
  });

  it('yanlış şifreyi reddeder', async () => {
    const user = await createTestUser();

    const response = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: user.email, password: 'yanlis-sifre' }),
    });

    expect(response.status).toBe(401);
  });

  it('var olmayan hesap ile yanlış şifre aynı yanıtı verir', async () => {
    await createTestUser({ email: 'var@example.com' });

    const wrongPassword = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'var@example.com', password: 'yanlis' }),
    });

    const noSuchUser = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'yok@example.com', password: 'yanlis' }),
    });

    // Kullanıcı numaralandırmayı engelle: durum kodu ve mesaj aynı olmalı.
    expect(wrongPassword.status).toBe(noSuchUser.status);

    const a = (await wrongPassword.json()) as { error: { code: string; message: string } };
    const b = (await noSuchUser.json()) as { error: { code: string; message: string } };

    expect(a.error.code).toBe(b.error.code);
    expect(a.error.message).toBe(b.error.message);
  });

  it('oturum jetonunu veritabanında düz metin saklamaz', async () => {
    const user = await createTestUser();
    const cookie = await loginAs(user.email, user.password);

    const token = cookie.replace('ersinspot_session=', '').split('.')[0] ?? '';

    const [row] = await db.select({ tokenHash: sessions.tokenHash }).from(sessions);

    expect(row?.tokenHash).toBeDefined();
    expect(row?.tokenHash).not.toBe(token);
    // Saklanan değer jetonun SHA-256 özeti olmalı.
    expect(row?.tokenHash).toBe(hashToken(token));
  });

  it('art arda başarısız denemelerden sonra hesabı kilitler', async () => {
    const user = await createTestUser();

    // Eşik 8; sekiz başarısız denemeden sonra kilitlenmeli.
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: user.email, password: 'yanlis' }),
      });
    }

    // Doğru şifreyle bile girilemez.
    const response = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: user.email, password: user.password }),
    });

    expect(response.status).toBe(403);

    const payload = (await response.json()) as { error: { code: string } };
    expect(payload.error.code).toBe('account_locked');
    expect(response.headers.get('Retry-After')).not.toBeNull();
  });

  it('başarılı girişte başarısız deneme sayacını sıfırlar', async () => {
    const user = await createTestUser();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: user.email, password: 'yanlis' }),
      });
    }

    await loginAs(user.email, user.password);

    const [row] = await db
      .select({ failedLoginCount: users.failedLoginCount, lockedUntil: users.lockedUntil })
      .from(users)
      .where(eq(users.id, user.id));

    expect(row?.failedLoginCount).toBe(0);
    expect(row?.lockedUntil).toBeNull();
  });

  it('silinmiş hesapla giriş yapılamaz', async () => {
    const user = await createTestUser();
    await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, user.id));

    const response = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: user.email, password: user.password }),
    });

    expect(response.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Oturum
// ---------------------------------------------------------------------------

describe('GET /api/auth/me', () => {
  it('oturum yoksa 401 döner', async () => {
    const response = await request('/api/auth/me');
    expect(response.status).toBe(401);
  });

  it('geçerli oturumla kullanıcı bilgisini döner', async () => {
    const user = await createTestUser();
    const cookie = await loginAs(user.email, user.password);

    const response = await request('/api/auth/me', { cookie });
    expect(response.status).toBe(200);

    const payload = (await response.json()) as { user: { email: string } };
    expect(payload.user.email).toBe(user.email);
  });

  it("şifre hash'ini yanıtta döndürmez", async () => {
    const user = await createTestUser();
    const cookie = await loginAs(user.email, user.password);

    const response = await request('/api/auth/me', { cookie });
    const text = await response.text();

    expect(text).not.toContain('passwordHash');
    expect(text).not.toContain('argon2');
  });

  it('uydurma çerezi reddeder', async () => {
    const response = await request('/api/auth/me', {
      cookie: 'ersinspot_session=uydurma-jeton.uydurma-imza',
    });

    expect(response.status).toBe(401);
  });

  it('imzası bozulmuş çerezi reddeder', async () => {
    const user = await createTestUser();
    const cookie = await loginAs(user.email, user.password);

    // İmzayı boz.
    const tampered = `${cookie.split('.')[0] ?? ''}.bozuk-imza`;

    const response = await request('/api/auth/me', { cookie: tampered });
    expect(response.status).toBe(401);
  });

  it('süresi dolmuş oturumu reddeder ve kaydı siler', async () => {
    const user = await createTestUser();
    const cookie = await loginAs(user.email, user.password);

    await db.update(sessions).set({ expiresAt: new Date(Date.now() - 1000) });

    const response = await request('/api/auth/me', { cookie });
    expect(response.status).toBe(401);

    const rows = await db.select({ id: sessions.id }).from(sessions);
    expect(rows).toHaveLength(0);
  });
});

describe('POST /api/auth/logout', () => {
  it('oturumu sonlandırır', async () => {
    const user = await createTestUser();
    const cookie = await loginAs(user.email, user.password);

    const logout = await request('/api/auth/logout', { method: 'POST', cookie });
    expect(logout.status).toBe(200);

    // Aynı çerezle artık erişilemez.
    const me = await request('/api/auth/me', { cookie });
    expect(me.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Şifre değiştirme
// ---------------------------------------------------------------------------

describe('POST /api/auth/change-password', () => {
  it('mevcut şifre doğruysa değiştirir', async () => {
    const user = await createTestUser();
    const cookie = await loginAs(user.email, user.password);

    const response = await request('/api/auth/change-password', {
      method: 'POST',
      cookie,
      body: JSON.stringify({
        currentPassword: user.password,
        newPassword: 'yepyeni-guclu-sifre',
        newPasswordConfirm: 'yepyeni-guclu-sifre',
      }),
    });

    expect(response.status).toBe(200);

    // Yeni şifreyle giriş yapılabilmeli.
    await expect(loginAs(user.email, 'yepyeni-guclu-sifre')).resolves.toBeTruthy();
  });

  it('mevcut şifre yanlışsa reddeder', async () => {
    const user = await createTestUser();
    const cookie = await loginAs(user.email, user.password);

    const response = await request('/api/auth/change-password', {
      method: 'POST',
      cookie,
      body: JSON.stringify({
        currentPassword: 'yanlis',
        newPassword: 'yepyeni-guclu-sifre',
        newPasswordConfirm: 'yepyeni-guclu-sifre',
      }),
    });

    expect(response.status).toBe(400);
  });

  it('diğer oturumları kapatır ama kendi oturumunu korur', async () => {
    const user = await createTestUser();

    const firstDevice = await loginAs(user.email, user.password);
    const secondDevice = await loginAs(user.email, user.password);

    await request('/api/auth/change-password', {
      method: 'POST',
      cookie: secondDevice,
      body: JSON.stringify({
        currentPassword: user.password,
        newPassword: 'yepyeni-guclu-sifre',
        newPasswordConfirm: 'yepyeni-guclu-sifre',
      }),
    });

    // Şifreyi değiştiren cihaz açık kalmalı.
    const stillOpen = await request('/api/auth/me', { cookie: secondDevice });
    expect(stillOpen.status).toBe(200);

    // Diğer cihaz kapanmalı: şifre ele geçirilmiş olabilir.
    const closed = await request('/api/auth/me', { cookie: firstDevice });
    expect(closed.status).toBe(401);
  });

  it('oturum yoksa reddeder', async () => {
    const response = await request('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: 'x',
        newPassword: 'yepyeni-guclu-sifre',
        newPasswordConfirm: 'yepyeni-guclu-sifre',
      }),
    });

    expect(response.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Şifre sıfırlama
// ---------------------------------------------------------------------------

describe('şifre sıfırlama akışı', () => {
  it('var olmayan adres için de aynı yanıtı verir', async () => {
    await createTestUser({ email: 'var@example.com' });

    const existing = await request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'var@example.com' }),
    });

    const missing = await request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'yok@example.com' }),
    });

    expect(existing.status).toBe(missing.status);
    expect(await existing.text()).toBe(await missing.text());
  });

  it('geçerli jetonla şifreyi sıfırlar', async () => {
    const user = await createTestUser();

    await request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: user.email }),
    });

    // Jetonun kendisi e-postayla gider; testte veritabanından yeni bir tane üretip
    // aynı akışı taklit etmek yerine, üretilen kaydın özetini kullanacak bir jeton
    // oluşturmak mümkün olmadığı için doğrudan yeni jeton yazıyoruz.
    const token = 'a'.repeat(43);
    await db
      .update(passwordResetTokens)
      .set({ tokenHash: hashToken(token) })
      .where(eq(passwordResetTokens.userId, user.id));

    const response = await request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token,
        password: 'sifirlanmis-guclu-sifre',
        passwordConfirm: 'sifirlanmis-guclu-sifre',
      }),
    });

    expect(response.status).toBe(200);
    await expect(loginAs(user.email, 'sifirlanmis-guclu-sifre')).resolves.toBeTruthy();
  });

  it('jeton tek kullanımlıktır', async () => {
    const user = await createTestUser();

    await request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: user.email }),
    });

    const token = 'b'.repeat(43);
    await db
      .update(passwordResetTokens)
      .set({ tokenHash: hashToken(token) })
      .where(eq(passwordResetTokens.userId, user.id));

    const payload = JSON.stringify({
      token,
      password: 'sifirlanmis-guclu-sifre',
      passwordConfirm: 'sifirlanmis-guclu-sifre',
    });

    const first = await request('/api/auth/reset-password', { method: 'POST', body: payload });
    expect(first.status).toBe(200);

    const second = await request('/api/auth/reset-password', { method: 'POST', body: payload });
    expect(second.status).toBe(400);
  });

  it('süresi dolmuş jetonu reddeder', async () => {
    const user = await createTestUser();

    await request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: user.email }),
    });

    const token = 'c'.repeat(43);
    await db
      .update(passwordResetTokens)
      .set({ tokenHash: hashToken(token), expiresAt: new Date(Date.now() - 1000) })
      .where(eq(passwordResetTokens.userId, user.id));

    const response = await request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token,
        password: 'sifirlanmis-guclu-sifre',
        passwordConfirm: 'sifirlanmis-guclu-sifre',
      }),
    });

    expect(response.status).toBe(400);
  });

  it('sıfırlama tüm oturumları kapatır', async () => {
    const user = await createTestUser();
    const cookie = await loginAs(user.email, user.password);

    await request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: user.email }),
    });

    const token = 'd'.repeat(43);
    await db
      .update(passwordResetTokens)
      .set({ tokenHash: hashToken(token) })
      .where(eq(passwordResetTokens.userId, user.id));

    await request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token,
        password: 'sifirlanmis-guclu-sifre',
        passwordConfirm: 'sifirlanmis-guclu-sifre',
      }),
    });

    // Şifre ele geçirilmiş olabileceği için istisnasız tüm oturumlar kapanır.
    const response = await request('/api/auth/me', { cookie });
    expect(response.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// CSRF
// ---------------------------------------------------------------------------

describe('CSRF koruması', () => {
  it('yabancı kaynaktan gelen durum değiştiren isteği reddeder', async () => {
    const user = await createTestUser();
    const cookie = await loginAs(user.email, user.password);

    const response = await app.request('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: {
        Origin: 'https://kotu-site.example.com',
        Cookie: cookie,
      },
    });

    expect(response.status).toBe(403);
  });

  it('okuma isteklerinde kaynak kontrolü yapmaz', async () => {
    const response = await app.request('http://localhost:3000/health', {
      headers: { Origin: 'https://baska-site.example.com' },
    });

    expect(response.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// E-POSTA DOĞRULAMA VE ŞİFRE SIFIRLAMA AKIŞLARI
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Bu iki akışın hiç testi yoktu ve ikisi de e-postadaki bağlantıya bağlıydı.
 * Denetimde, sunucunun yazdığı adreslerin (`/eposta-dogrula`, `/sifre-sifirla`)
 * arayüzde HİÇ SAYFASI OLMADIĞI bulundu: kayıt olan kimse e-postasını
 * doğrulayamıyor, şifresini unutan kimse yenileyemiyordu. Doğrulama üç hizmet
 * talebinin ön koşulu olduğu için üç akış birden kapalıydı.
 *
 * Testler jetonu E-POSTADAN okur — veritabanında yalnızca özeti tutulur ve
 * bu doğrudur. Böylece "e-postada gönderilen şey gerçekten işe yarıyor mu"
 * sorusu da yanıtlanmış olur.
 */
/**
 * Diğer cihazlardan çıkış.
 *
 * Arayüz bu düğmeyi "Diğer cihazlardan çık" diye adlandırır ve kullanıcının
 * kendi oturumunda kalmasını bekler. Uç önceden TÜM oturumları kapatıyordu:
 * kullanıcı düğmeye basar basmaz kendisi de dışarı atılıyor, üstelik yanıt
 * kapatılan oturum sayısını bir fazla bildiriyordu.
 */
describe('POST /api/auth/logout-all', () => {
  it('diğer oturumları kapatır, mevcut oturumu korur', async () => {
    const user = await createTestUser({ email: 'coklu@ornek.com' });

    const first = await loginAs(user.email, user.password);
    await loginAs(user.email, user.password);
    await loginAs(user.email, user.password);

    const response = await request('/api/auth/logout-all', { method: 'POST', cookie: first });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, closedSessions: 2 });

    // Kendi oturumu hâlâ geçerli olmalı.
    const me = await request('/api/auth/me', { cookie: first });
    expect(me.status).toBe(200);

    const rows = await db.select({ id: sessions.id }).from(sessions);
    expect(rows).toHaveLength(1);
  });
});

describe('e-posta doğrulama akışı', () => {
  /** Son gönderilen e-postadaki jetonu çıkarır. */
  function tokenFromLastEmail(pathname: string): string {
    const emails = getSentEmails();
    const last = emails.at(-1);

    if (last === undefined) throw new Error('Hiç e-posta gönderilmedi.');

    const match = new RegExp(`${pathname}\\?token=([A-Za-z0-9_-]+)`).exec(last.text);

    if (match?.[1] === undefined) {
      throw new Error(`E-postada ${pathname} bağlantısı yok:\n${last.text}`);
    }

    return match[1];
  }

  const FRESH_PASSWORD = 'cok-guvenli-parola-123';

  /**
   * Kayıt olur ve ardından giriş yaparak oturum çerezini döndürür.
   *
   * Kayıt oturum açmaz — adresin kayıtlı olup olmadığını yanıtın şeklinden ele
   * vermemek için — bu yüzden çerez ikinci adımda alınır.
   */
  async function registerFresh(email: string): Promise<string> {
    clearSentEmails();

    const response = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Yeni Kullanıcı',
        email,
        phone: '+905071940550',
        password: FRESH_PASSWORD,
        passwordConfirm: FRESH_PASSWORD,
        acceptedTerms: true,
      }),
    });

    expect(response.status).toBe(201);

    return loginAs(email, FRESH_PASSWORD);
  }

  it('kayıt sonrası doğrulama e-postası gönderilir', async () => {
    await registerFresh('yeni@ornek.com');

    const last = getSentEmails().at(-1);

    expect(last?.to).toBe('yeni@ornek.com');
    expect(last?.text).toContain('/eposta-dogrula?token=');
  });

  it('doğrulanmamış hesap hizmet talebi oluşturamaz', async () => {
    const cookie = await registerFresh('dogrulanmamis@ornek.com');

    const response = await request('/api/moving/requests', {
      method: 'POST',
      cookie,
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(403);
  });

  it('e-postadaki jeton hesabı doğrular', async () => {
    const cookie = await registerFresh('dogrulanacak@ornek.com');
    const token = tokenFromLastEmail('/eposta-dogrula');

    const response = await request('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });

    expect(response.status).toBe(200);

    const me = await request('/api/auth/me', { cookie });
    const body = (await me.json()) as { user: { emailVerified: boolean } };

    expect(body.user.emailVerified).toBe(true);
  });

  it('aynı jeton ikinci kez kullanılamaz', async () => {
    await registerFresh('tekkullanim@ornek.com');
    const token = tokenFromLastEmail('/eposta-dogrula');

    await request('/api/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) });

    const second = await request('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });

    expect(second.status).not.toBe(200);
  });
});

describe('şifre sıfırlama akışı', () => {
  function tokenFromLastEmail(): string {
    const last = getSentEmails().at(-1);
    if (last === undefined) throw new Error('Hiç e-posta gönderilmedi.');

    const match = /\/sifre-sifirla\?token=([A-Za-z0-9_-]+)/.exec(last.text);

    if (match?.[1] === undefined) {
      throw new Error(`E-postada sıfırlama bağlantısı yok:\n${last.text}`);
    }

    return match[1];
  }

  it('kayıtlı olmayan adres için de aynı yanıt döner', async () => {
    /*
      Farklı yanıt vermek, hangi e-postaların sisteme kayıtlı olduğunu
      dışarıdan öğrenilebilir kılardı (hesap sayımı). Karşılaştırmanın anlamlı
      olması için biri GERÇEKTEN kayıtlı olmalıdır.
    */
    await createTestUser({ email: 'test@ersinspot.com' });

    const known = await request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@ersinspot.com' }),
    });

    const unknown = await request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'hicbir-zaman-kayitli-olmayan@ornek.com' }),
    });

    expect(known.status).toBe(unknown.status);
    expect(await known.text()).toBe(await unknown.text());
  });

  it('e-postadaki jetonla şifre değiştirilir ve yeni şifreyle giriş yapılır', async () => {
    await createTestUser({ email: 'test@ersinspot.com' });
    clearSentEmails();

    await request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@ersinspot.com' }),
    });

    const token = tokenFromLastEmail();

    const reset = await request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token,
        password: 'yepyeni-bir-sifre-456',
        passwordConfirm: 'yepyeni-bir-sifre-456',
      }),
    });

    expect(reset.status).toBe(200);

    const login = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@ersinspot.com', password: 'yepyeni-bir-sifre-456' }),
    });

    expect(login.status).toBe(200);
  });

  it('sıfırlama jetonu ikinci kez kullanılamaz', async () => {
    await createTestUser({ email: 'test@ersinspot.com' });
    clearSentEmails();

    await request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@ersinspot.com' }),
    });

    const token = tokenFromLastEmail();
    const body = JSON.stringify({
      token,
      password: 'baska-bir-sifre-789',
      passwordConfirm: 'baska-bir-sifre-789',
    });

    await request('/api/auth/reset-password', { method: 'POST', body });

    const second = await request('/api/auth/reset-password', { method: 'POST', body });

    expect(second.status).not.toBe(200);
  });
});
