/**
 * Site ayarları.
 *
 * İletişim bilgileri, çalışma saatleri ve benzeri değerler. Eski kod tabanında
 * bunlar kaynak dosyada sabitti (`BACKEND_CONSTANTS.ts`); telefon numarasını
 * değiştirmek kod değişikliği ve yeniden dağıtım gerektiriyordu.
 *
 * Değerler metin olarak saklanır ama tipi ayrıca bildirilir: tipsiz bir ayar
 * tablosunda "3" değerinin sayı mı metin mi olduğu belirsizdir ve okuyan her
 * yer kendi ayrıştırmasını yazar.
 */

import { db } from '../../../platform/db/client.ts';
import { businessRule } from '../../../platform/errors/index.ts';
import { logger } from '../../../platform/observability/logger.ts';
import { siteSettings } from '../infrastructure/schema.ts';

export type SettingValueType = 'string' | 'number' | 'boolean' | 'time';

/**
 * Ayarın kime açık olduğu.
 *
 *   storefront — vitrinde herkese görünür: iletişim bilgisi, çalışma saatleri,
 *                duyuru. Zaten her sayfanın alt bilgisinde yazan şeyler.
 *   customer   — yalnızca oturum açmış kullanıcıya gösterilir.
 *
 * Ayrım bir sınıflandırma etiketi değil, bir YETKİ KARARIDIR: `GET /settings`
 * yalnızca `storefront` olanları döndürür. Yeni bir ayar eklendiğinde bu alanın
 * yazılması zorunludur; unutulduğunda derleme kırılır.
 */
export type SettingAudience = 'storefront' | 'customer';

export interface Setting {
  readonly key: string;
  readonly value: string;
  readonly valueType: SettingValueType;
  readonly description: string | null;
}

/**
 * Bilinen ayar anahtarları ve varsayılanları.
 *
 * Veritabanında karşılığı yoksa varsayılan kullanılır; böylece yeni bir ayar
 * eklemek migration gerektirmez ve eksik kayıt uygulamayı durdurmaz.
 */
export const DEFAULT_SETTINGS: Readonly<
  Record<
    string,
    {
      value: string;
      valueType: SettingValueType;
      description: string;
      audience: SettingAudience;
    }
  >
> = {
  'contact.phone': {
    value: '+905071940550',
    valueType: 'string',
    description: 'Sitede gösterilen iletişim telefonu (E.164 biçiminde).',
    audience: 'storefront',
  },
  'contact.email': {
    value: 'bilgi@ersinspot.com',
    valueType: 'string',
    description: 'Sitede gösterilen iletişim e-postası.',
    audience: 'storefront',
  },
  'contact.address': {
    value: 'Menderes Mahallesi, Buca / İzmir',
    valueType: 'string',
    description: 'Mağaza adresi.',
    audience: 'storefront',
  },
  'hours.weekday.open': {
    value: '09:00',
    valueType: 'time',
    description: 'Hafta içi açılış.',
    audience: 'storefront',
  },
  'hours.weekday.close': {
    value: '18:00',
    valueType: 'time',
    description: 'Hafta içi kapanış.',
    audience: 'storefront',
  },
  'hours.saturday.open': {
    value: '09:00',
    valueType: 'time',
    description: 'Cumartesi açılış.',
    audience: 'storefront',
  },
  'hours.saturday.close': {
    value: '17:00',
    valueType: 'time',
    description: 'Cumartesi kapanış.',
    audience: 'storefront',
  },
  'hours.sunday.closed': {
    value: 'true',
    valueType: 'boolean',
    description: 'Pazar günü kapalı mı? Kapalıysa alt bilgide "Pazar kapalı" yazar.',
    audience: 'storefront',
  },
  'hours.sunday.open': {
    value: '10:00',
    valueType: 'time',
    description: 'Pazar açılış.',
    audience: 'storefront',
  },
  'hours.sunday.close': {
    value: '16:00',
    valueType: 'time',
    description: 'Pazar kapanış.',
    audience: 'storefront',
  },
  'banner.text': {
    value: '',
    valueType: 'string',
    description: 'Sitenin üstünde gösterilen duyuru. Boşsa gösterilmez.',
    audience: 'storefront',
  },

  /*
    Havale/EFT bilgileri.

    Müşteri ödeme yöntemi olarak havaleyi seçtiğinde parayı NEREYE göndereceğini
    bilmek zorundadır. Bu bilgi hiçbir yerde yoktu: sipariş "ödeme bekleniyor"
    durumunda açılıyor, ödeme süresi içinde bildirim gelmediği için otomatik
    iptal ediliyordu — müşteriye hesap numarası hiç verilmeden.

    Ayar olarak tutulur, koda gömülmez: banka değiştirmek yeniden dağıtım
    gerektirmemelidir.

    GÖRÜNÜRLÜK `customer`. Bu üçü vitrinin parçası değildir: IBAN ile hesap
    sahibinin adı birlikte, kimlik avı için hazır bir şablondur — mağazanın
    adına düzenlenmiş sahte bir ödeme sayfası yapmak için gereken her şeyi
    verir. Üstelik hesap sahibi gerçek bir kişidir ve adı kişisel veridir.
    Bilgiyi görmesi gereken tek kişi siparişini ödeyecek müşteridir ve o
    oturum açmıştır.
  */
  'payment.bank.name': {
    value: '',
    valueType: 'string',
    description: 'Havale/EFT için banka adı. Boşsa ödeme bilgisi gösterilmez.',
    audience: 'customer',
  },
  'payment.bank.account_holder': {
    value: '',
    valueType: 'string',
    description: 'Hesap sahibinin adı (havale açıklamasında aranan isim).',
    audience: 'customer',
  },
  'payment.bank.iban': {
    value: '',
    valueType: 'string',
    description: 'IBAN. Müşteriye sipariş detayında gösterilir.',
    audience: 'customer',
  },
};

/**
 * Tüm ayarları döndürür; veritabanında olmayanlar varsayılanla tamamlanır.
 *
 * YÖNETİCİ İÇİNDİR: görünürlüğü ne olursa olsun her ayar döner. Vitrine giden
 * liste için `getSettingsFor` kullanılır.
 */
export async function getAllSettings(): Promise<Setting[]> {
  return readSettings(() => true);
}

/**
 * Belirli bir izleyiciye açık ayarları döndürür.
 *
 * `storefront` herkese açıktır; `customer` ayarları yalnızca oturum açmış
 * kullanıcıya gönderilir ve bu yüzden onları isteyen uç `requireAuth` ile
 * korunur. Süzme burada yapılır, çağıran tarafta değil: bir ucun yanlışlıkla
 * fazla alan döndürmesi ancak kararın tek yerde verilmesiyle engellenir.
 */
export async function getSettingsFor(audience: SettingAudience): Promise<Setting[]> {
  return readSettings((entry) => entry.audience === 'storefront' || entry.audience === audience);
}

async function readSettings(
  include: (entry: (typeof DEFAULT_SETTINGS)[string]) => boolean,
): Promise<Setting[]> {
  const stored = await db.select().from(siteSettings);
  const storedByKey = new Map(stored.map((row) => [row.key, row]));

  return Object.entries(DEFAULT_SETTINGS)
    .filter(([, fallback]) => include(fallback))
    .map(([key, fallback]) => {
      const row = storedByKey.get(key);

      return {
        key,
        value: row?.value ?? fallback.value,
        valueType: row?.valueType ?? fallback.valueType,
        description: row?.description ?? fallback.description,
      };
    });
}

/** Değerin bildirilen tipe uyduğunu doğrular. */
function validateValue(value: string, valueType: SettingValueType, key: string): void {
  switch (valueType) {
    case 'number':
      if (!/^-?\d+(\.\d+)?$/.test(value)) {
        throw businessRule(`"${key}" ayarı sayı olmalıdır.`);
      }
      return;
    case 'boolean':
      if (value !== 'true' && value !== 'false') {
        throw businessRule(`"${key}" ayarı true veya false olmalıdır.`);
      }
      return;
    case 'time':
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
        throw businessRule(`"${key}" ayarı SS:DD biçiminde olmalıdır.`);
      }
      return;
    case 'string':
      return;
  }
}

export async function updateSetting(
  key: string,
  value: string,
  staffUserId: string,
): Promise<void> {
  const known = DEFAULT_SETTINGS[key];

  if (known === undefined) {
    throw businessRule(`"${key}" tanınmayan bir ayar anahtarı.`);
  }

  validateValue(value, known.valueType, key);

  await db
    .insert(siteSettings)
    .values({
      key,
      value,
      valueType: known.valueType,
      description: known.description,
      updatedByUserId: staffUserId,
    })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value, updatedAt: new Date(), updatedByUserId: staffUserId },
    });

  logger.info('Site ayarı güncellendi', { key, staffUserId });
}
