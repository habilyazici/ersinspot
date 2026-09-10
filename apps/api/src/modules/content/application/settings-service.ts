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

import type { z } from 'zod';
import { emailSchema, ibanSchema, phoneSchema } from '@ersinspot/shared';
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
  /** Yönetim ekranındaki alan adı: kısa, isim gibi. */
  readonly label: string;
  /** Alanın altındaki açıklama; söylenecek fazladan bir şey yoksa `null`. */
  readonly hint: string | null;
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
      label: string;
      hint?: string;
      audience: SettingAudience;
      /**
       * Türün ötesinde bir kural varsa buraya konur; değeri doğrular ve
       * KANONİK biçimine çevirir.
       *
       * `valueType` yalnızca girdinin nasıl çizileceğini söyler ("metin",
       * "saat"); "metin" olan her şey serbestti. Telefon alanına yazılan bir
       * yazım hatası doğrudan alt bilgiye ve `tel:` bağlantısına düşüyor,
       * IBAN'daki bir hane hatası ise parayı hiçbir yere göndermiyordu.
       */
      schema?: z.ZodType<string, z.ZodTypeDef, unknown>;
    }
  >
> = {
  'contact.phone': {
    value: '+905071940550',
    valueType: 'string',
    schema: phoneSchema,
    label: 'İletişim telefonu',
    hint: 'Sitenin alt bilgisinde ve iletişim sayfasında görünür. E.164 biçiminde yazın: +905071940550.',
    audience: 'storefront',
  },
  'contact.email': {
    value: 'bilgi@ersinspot.com',
    valueType: 'string',
    schema: emailSchema,
    label: 'İletişim e-postası',
    hint: 'Sitenin alt bilgisinde ve iletişim sayfasında görünür.',
    audience: 'storefront',
  },
  'contact.address': {
    value: 'Menderes Mahallesi, Buca / İzmir',
    valueType: 'string',
    label: 'Mağaza adresi',
    audience: 'storefront',
  },
  'hours.weekday.open': {
    value: '09:00',
    valueType: 'time',
    label: 'Hafta içi açılış',
    audience: 'storefront',
  },
  'hours.weekday.close': {
    value: '18:00',
    valueType: 'time',
    label: 'Hafta içi kapanış',
    audience: 'storefront',
  },
  'hours.saturday.open': {
    value: '09:00',
    valueType: 'time',
    label: 'Cumartesi açılış',
    audience: 'storefront',
  },
  'hours.saturday.close': {
    value: '17:00',
    valueType: 'time',
    label: 'Cumartesi kapanış',
    audience: 'storefront',
  },
  'hours.sunday.closed': {
    value: 'true',
    valueType: 'boolean',
    label: 'Pazar günü kapalı mı?',
    hint: 'Evet seçilirse alt bilgide "Pazar kapalı" yazar ve aşağıdaki pazar saatleri gösterilmez.',
    audience: 'storefront',
  },
  'hours.sunday.open': {
    value: '10:00',
    valueType: 'time',
    label: 'Pazar açılış',
    audience: 'storefront',
  },
  'hours.sunday.close': {
    value: '16:00',
    valueType: 'time',
    label: 'Pazar kapanış',
    audience: 'storefront',
  },
  'banner.text': {
    value: '',
    valueType: 'string',
    label: 'Duyuru metni',
    hint: 'Sitenin en üstünde her sayfada görünür. Boş bırakırsanız duyuru şeridi hiç çizilmez.',
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
    label: 'Banka adı',
    hint: 'Boş bırakırsanız müşteriye hiçbir ödeme bilgisi gösterilmez.',
    audience: 'customer',
  },
  'payment.bank.account_holder': {
    value: '',
    valueType: 'string',
    label: 'Hesap sahibi',
    hint: 'Havale açıklamasında aranan isim.',
    audience: 'customer',
  },
  'payment.bank.iban': {
    value: '',
    valueType: 'string',
    schema: ibanSchema,
    label: 'IBAN',
    hint: 'Yalnızca oturum açmış müşteriye, sipariş detayında gösterilir.',
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

      /*
        Etiket ve açıklama SATIRDAN DEĞİL, buradaki tanımdan okunur.

        Eskiden metin hem burada hem `site_settings.description` sütununda
        duruyor ve okuma sütunu tercih ediyordu — ama güncelleme sorgusu o
        sütunu hiç yazmıyordu. Koddaki metni düzelten biri, kaydı önceden
        oluşmuş kurulumlarda eski metnin sonsuza kadar görünmeye devam
        ettiğini fark edemezdi. Sütun kaldırıldı (0009); metin tektir.
      */
      return {
        key,
        value: row?.value ?? fallback.value,
        valueType: row?.valueType ?? fallback.valueType,
        label: fallback.label,
        hint: fallback.hint ?? null,
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

  /*
    Kanonik değer YAZILIR, kullanıcının yazdığı değil.

    Yönetici telefonu "0507 194 05 50" diye girebilir; vitrin ise E.164
    bekliyor. IBAN da bankadan dörtlü gruplar hâlinde kopyalanır. Normalleştirme
    burada yapılmazsa her okuyan yerin kendi ayrıştırmasını yazması gerekirdi.

    Boş değer, VARSAYILANI DA BOŞ OLAN ayarlarda serbesttir: duyuru metni ve
    havale bilgileri "boşsa gösterilmez" diye tanımlıdır, doldurulmaları zorunlu
    değildir.
  */
  let canonical = value;

  if (known.schema !== undefined && !(value === '' && known.value === '')) {
    const result = known.schema.safeParse(value);

    if (!result.success) {
      throw businessRule(result.error.issues[0]?.message ?? `"${key}" ayarı geçersiz.`);
    }

    canonical = result.data;
  }

  await db
    .insert(siteSettings)
    .values({
      key,
      value: canonical,
      valueType: known.valueType,
      updatedByUserId: staffUserId,
    })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: canonical, updatedAt: new Date(), updatedByUserId: staffUserId },
    });

  logger.info('Site ayarı güncellendi', { key, staffUserId });
}
