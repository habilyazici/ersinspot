/**
 * Kimlik doğrulama ve yetkilendirme middleware'i.
 *
 * MİMARİ KARAR: yetki, handler'ın içinde değil, ROTA TANIMINDA bildirilir.
 *
 * Eski kod tabanında her endpoint kendi yetki kontrolünü elle yazıyordu:
 *
 *     app.delete('/admin/orders/:id', async (c) => {
 *       const token = c.req.header('Authorization')?.split(' ')[1];
 *       const check = await checkAdminAuth(token || '');
 *       if (!check.isAdmin) return c.json({ error: '...' }, 403);
 *       ...
 *     });
 *
 * 98 endpoint'in 58'inde bu blok unutulmuştu. Kontrolün handler'ın içinde olması,
 * onu isteğe bağlı yapar — ve isteğe bağlı güvenlik, er ya da geç atlanır.
 *
 * Buradaki yaklaşım kontrolü zorunlu kılar:
 *
 *     admin.delete('/orders/:id', handler)   // `admin` yönlendiricisi zaten korumalı
 *
 * Yetki, yönlendiricinin kendisine bağlıdır. Bir rotayı korumasız bırakmak için
 * onu bilinçli olarak `publicRoutes` altına yazmak gerekir — unutmakla olmaz.
 */

import type { Context, MiddlewareHandler, Next } from 'hono';
import { hasRoleAtLeast } from '@ersinspot/shared';
import type { UserRole } from '@ersinspot/shared';
import type {
  AuthenticatedUser,
  SessionContext,
} from '../../modules/identity/application/session.ts';
import { resolveSession } from '../../modules/identity/application/session.ts';
import { emailNotVerified, forbidden, unauthenticated } from '../errors/index.ts';

/**
 * Hono bağlamına eklenen değişkenlerin tipi.
 *
 * `Variables` arayüzü sayesinde `c.get('user')` çağrısı tipli olur ve handler
 * içinde `user` alanının varlığı derleyici tarafından garanti edilir.
 */
export interface AuthVariables {
  /** Oturum açık değilse tanımsızdır. `requireAuth` sonrası daima doludur. */
  session: SessionContext | undefined;
  user: AuthenticatedUser | undefined;
}

/**
 * Oturumu çözer ama zorunlu tutmaz.
 *
 * Hem misafir hem giriş yapmış kullanıcıya farklı yanıt veren uçlarda kullanılır:
 * ürün listesinde favori durumunu göstermek gibi.
 */
export const attachSession: MiddlewareHandler<{ Variables: AuthVariables }> = async (
  c: Context<{ Variables: AuthVariables }>,
  next: Next,
) => {
  const session = await resolveSession(c);
  c.set('session', session ?? undefined);
  c.set('user', session?.user ?? undefined);
  await next();
};

/**
 * Oturumu zorunlu kılar.
 *
 * Bu middleware'den sonra `c.get('user')` daima doludur; handler'ların ayrıca
 * null kontrolü yapmasına gerek kalmaz.
 */
export const requireAuth: MiddlewareHandler<{ Variables: AuthVariables }> = async (
  c: Context<{ Variables: AuthVariables }>,
  next: Next,
) => {
  const session = await resolveSession(c);

  if (session === null) {
    throw unauthenticated();
  }

  c.set('session', session);
  c.set('user', session.user);
  await next();
};

/**
 * Belirli bir rol seviyesini zorunlu kılar.
 *
 * Roller hiyerarşiktir: `admin`, `staff` yetkisi gerektiren her yere erişebilir.
 * Karşılaştırma `hasRoleAtLeast` üzerinden yapılır — rol mantığı tek yerdedir.
 *
 * Eski kodda yetki, kaynak dosyaya gömülü bir e-posta listesiyle karşılaştırılıyordu
 * (`ADMIN_EMAILS.includes(user.email)`); yeni yönetici eklemek kod değişikliği
 * gerektiriyor ve hedef adresler saldırgana açıkça bildiriliyordu.
 */
export function requireRole(
  minimumRole: UserRole,
): MiddlewareHandler<{ Variables: AuthVariables }> {
  return async (c: Context<{ Variables: AuthVariables }>, next: Next) => {
    const session = await resolveSession(c);

    if (session === null) {
      throw unauthenticated();
    }

    if (!hasRoleAtLeast(session.user.role, minimumRole)) {
      throw forbidden();
    }

    c.set('session', session);
    c.set('user', session.user);
    await next();
  };
}

/** Personel veya yönetici yetkisi gerektirir. Yönetim paneli uçlarının çoğu bunu kullanır. */
export const requireStaff = requireRole('staff');

/** Yalnızca yönetici. Kullanıcı rolü değiştirme, ayar yönetimi gibi işlemler için. */
export const requireAdmin = requireRole('admin');

/**
 * E-posta doğrulaması zorunlu kılar.
 *
 * Hizmet talepleri (nakliye, teknik servis, ürün satışı) için kullanılır: bu
 * işlerde ekip müşteriyle randevu ve teklif için iletişime geçer, adresin
 * gerçekten kişiye ait olması gerekir.
 *
 * SİPARİŞ VERMEDE UYGULANMAZ. Satın alma yolunu doğrulama adımıyla kesmek
 * mağazanın tercihi değildir; sipariş zaten teslimatta teyit edilen bir
 * telefon numarası taşır. Hesap sayfasındaki uyarı da bu ayrımı aynen
 * anlatır — iki yerin aynı şeyi söylemesi bilinçlidir.
 *
 * `requireAuth`'tan sonra zincirlenir.
 */
export const requireVerifiedEmail: MiddlewareHandler<{ Variables: AuthVariables }> = async (
  c: Context<{ Variables: AuthVariables }>,
  next: Next,
) => {
  const user = c.get('user');

  if (user === undefined) {
    throw unauthenticated();
  }

  if (!user.emailVerified) {
    throw emailNotVerified();
  }

  await next();
};

/**
 * Oturum bilgisini okuyan yardımcılar.
 *
 * Parametre tipi `Context` yerine `{ var: ... }` yapısal biçiminde yazılır:
 * Hono'nun `Context<E>` tipi `set` metodu yüzünden değişmezdir (invariant), bu da
 * daha geniş bir `Variables` tipine sahip bağlamların daraltılmış imzaya
 * geçirilmesini engeller.
 */
interface ReadsAuth {
  readonly var: Partial<AuthVariables>;
}

/**
 * Oturum açmış kullanıcıyı döndürür.
 *
 * `requireAuth` çalıştıktan sonra çağrılmalıdır. Kullanıcı yoksa bu bir programlama
 * hatasıdır (middleware zinciri yanlış kurulmuş) ve istisna fırlatılır — sessizce
 * yetkisiz erişime izin verilmez.
 */
export function currentUser(c: ReadsAuth): AuthenticatedUser {
  const user = c.var.user;

  if (user === undefined) {
    throw new Error(
      "currentUser(), requireAuth middleware'i olmadan çağrıldı. Rota tanımını kontrol edin.",
    );
  }

  return user;
}

/** Oturum bağlamını döndürür. Oturumu sonlandırma gibi işlemlerde kimlik gerekir. */
export function currentSession(c: ReadsAuth): SessionContext {
  const session = c.var.session;

  if (session === undefined) {
    throw new Error(
      "currentSession(), requireAuth middleware'i olmadan çağrıldı. Rota tanımını kontrol edin.",
    );
  }

  return session;
}

/**
 * Kaynak sahipliği kuralları `platform/authorization.ts` içindedir ve HTTP'den
 * bağımsızdır; uygulama katmanı da aynı kontrolü kullanır. Rota tanımlarının
 * tek bir yerden içe aktarabilmesi için buradan yeniden dışa aktarılır.
 */
export { assertCanAccess, isStaff } from '../authorization.ts';
