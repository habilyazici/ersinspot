/**
 * Tipli API istemcisi.
 *
 * Uygulamadaki TEK ağ erişim noktası. ESLint, bu dizin dışında `fetch`
 * kullanılmasını engeller.
 *
 * Eski kod tabanında 109 dağınık `fetch` çağrısı vardı; 36 dosya API adresini
 * elle tekrar tanımlıyor, 12 yer yetkilendirme başlığını elle kuruyordu. API
 * yolunu değiştirmek 36 dosyaya dokunmayı gerektiriyordu ve her sayfa kendi
 * hata yönetimini yazdığı için davranış tutarsızdı.
 */

import { ApiError, isApiErrorBody } from '@ersinspot/shared';

/**
 * API taban adresi.
 *
 * Geliştirmede Vite vekili sayesinde aynı kaynaktan sunulur (`/api`), bu yüzden
 * çerezler sorunsuz çalışır. Üretimde farklı bir alan adı kullanılacaksa
 * `VITE_API_URL` ile bildirilir.
 */
const BASE_URL = import.meta.env.VITE_API_URL ?? '';

export interface RequestOptions {
  readonly method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly body?: unknown;
  readonly query?: Record<string, string | number | boolean | undefined>;
  readonly signal?: AbortSignal;
}

/** Sorgu parametrelerini adrese ekler; tanımsız değerler atlanır. */
function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${BASE_URL}${path}`;

  if (query === undefined) return url;

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') {
      params.append(key, String(value));
    }
  }

  const queryString = params.toString();
  return queryString === '' ? url : `${url}?${queryString}`;
}

/**
 * Sunucu "oturum yok" dediğinde çağrılır.
 *
 * Bu geri çağrı YÖNLENDİRME YAPMAZ; yalnızca uygulamanın oturum önbelleğini
 * "misafir" durumuna çeker. Yönlendirme kararı rota koruyucularınındır
 * (`RequireAuth`): korumalı bir sayfadaysa kullanıcı girişe gider, herkese
 * açık bir sayfadaysa hiçbir şey olmaz.
 *
 * Önceki hâlinde istemci doğrudan `/giris` adresine yönlendiriyordu. Ama
 * misafir bir ziyaretçide de 401 dönen uçlar var — başlıktaki sepet sayacı ve
 * oturum sorgusu her sayfada çalışır — ve bu, ANASAYFAYI AÇAN HERKESİN giriş
 * sayfasına atılması demekti. Yönlendirmeyi tek bir yerde, zaten oturum
 * durumuna bakan koruyucuda tutmak bu sınıf hatayı yapısal olarak kapatır.
 */
let onUnauthenticated: (() => void) | null = null;

export function setUnauthenticatedHandler(handler: () => void): void {
  onUnauthenticated = handler;
}

/**
 * İsteği gönderir ve yanıtı çözer.
 *
 * Başarısız yanıtlar `ApiError` olarak fırlatılır; arayüz serbest metne değil
 * makine tarafından okunabilir `code` alanına bakarak karar verir.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal } = options;

  const headers: Record<string, string> = {};

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;

  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      // Oturum çerezinin gönderilmesi için zorunlu.
      credentials: 'include',
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      ...(signal === undefined ? {} : { signal }),
    });
  } catch (error) {
    // Ağ hatası: sunucuya hiç ulaşılamadı.
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }

    throw new ApiError(
      {
        error: {
          code: 'internal_error',
          message: 'Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edin.',
        },
      },
      0,
    );
  }

  // 204 gibi gövdesiz yanıtlar.
  if (response.status === 204) {
    return undefined as T;
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (isApiErrorBody(payload)) {
      const apiError = new ApiError(payload, response.status);

      // Oturum yoksa veya düştüyse önbellekteki kullanıcı bilgisini düşür.
      if (apiError.requiresLogin) {
        onUnauthenticated?.();
      }

      throw apiError;
    }

    // Sunucu beklenen biçimde yanıt vermedi (vekil hatası, ağ geçidi vb.).
    throw new ApiError(
      {
        error: {
          code: 'internal_error',
          message: 'Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
        },
      },
      response.status,
    );
  }

  return payload as T;
}

/**
 * Dosya yükler.
 *
 * JSON gövdesi yerine çok parçalı form verisi gönderir; `Content-Type`
 * başlığını tarayıcı sınır dizesiyle birlikte kendisi kurar.
 */
export async function apiUpload<T>(
  path: string,
  file: File,
  fields: Record<string, string> = {},
): Promise<T> {
  const form = new FormData();
  form.append('file', file);

  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value);
  }

  let response: Response;

  /*
    Ağ hatası burada da `ApiError`'a çevrilir.

    Arayüz hataları `ApiError` olarak ele alır (`code` alanına bakar); ham
    `TypeError` sızdığında yükleme bileşeni anlaşılır mesaj yerine genel bir
    hata gösteriyordu. İstek yolu ile yükleme yolunun aynı sözleşmeyi
    döndürmesi gerekir.
  */
  try {
    response = await fetch(buildUrl(path), {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
  } catch {
    throw new ApiError(
      {
        error: {
          code: 'internal_error',
          message: 'Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edin.',
        },
      },
      0,
    );
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (isApiErrorBody(payload)) {
      const apiError = new ApiError(payload, response.status);
      if (apiError.requiresLogin) onUnauthenticated?.();
      throw apiError;
    }

    throw new ApiError(
      { error: { code: 'internal_error', message: 'Dosya yüklenemedi.' } },
      response.status,
    );
  }

  return payload as T;
}
