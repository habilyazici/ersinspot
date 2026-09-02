/**
 * Ortam değişkenlerinin doğrulanması.
 *
 * Uygulama başlarken tüm yapılandırma bir kez doğrulanır. Eksik veya hatalı bir
 * değer varsa süreç anlaşılır bir mesajla durur — yarım yapılandırmayla çalışıp
 * ilk isteği aldığında çökmez.
 *
 * Eski kod tabanında yapılandırma yoktu: anahtarlar kaynak dosyaya gömülüydü ve
 * `Deno.env.get('X')!` ifadesindeki ünlem, değer yokken çalışma anında `undefined`
 * sızmasına yol açıyordu.
 */

import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    DATABASE_URL: z
      .string()
      .min(1, 'DATABASE_URL tanımlı olmalıdır.')
      .refine((value) => value.startsWith('postgres'), {
        message: 'DATABASE_URL bir PostgreSQL bağlantı adresi olmalıdır.',
      }),

    API_PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    API_ORIGIN: z.string().url('API_ORIGIN geçerli bir adres olmalıdır.'),
    WEB_ORIGIN: z.string().url('WEB_ORIGIN geçerli bir adres olmalıdır.'),

    /**
     * Oturum çerezini imzalar. Kısa bir anahtar, imzanın kaba kuvvetle
     * kırılabilmesi anlamına gelir; alt sınır bilinçli olarak yüksektir.
     */
    SESSION_SECRET: z.string().min(32, 'SESSION_SECRET en az 32 karakter olmalıdır.'),

    /**
     * Uygulama bir ters vekilin (nginx, Cloudflare, yük dengeleyici) arkasında mı?
     *
     * Hız sınırı ve denetim kaydı istemcinin IP adresine dayanır. `X-Forwarded-For`
     * başlığını İSTEMCİ de gönderebilir: doğrudan internete açık bir sunucuda bu
     * başlığa güvenmek, saldırganın her istekte farklı bir adres uydurup giriş
     * denemesi sınırını tamamen atlaması demektir.
     *
     * Bu yüzden başlık yalnızca burası açıkken okunur. Kapalıyken adres TCP
     * bağlantısından alınır ve uydurulamaz. Vekil arkasında çalışıyorsanız
     * açın — vekil başlığı kendisi yazar ve istemcininkini ezer.
     */
    TRUST_PROXY: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),

    STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
    STORAGE_LOCAL_DIR: z.string().default('./.storage'),
    STORAGE_PUBLIC_URL: z.string().url('STORAGE_PUBLIC_URL geçerli bir adres olmalıdır.'),

    S3_ENDPOINT: z.string().url().optional(),
    S3_REGION: z.string().optional(),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),

    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    MAIL_FROM: z.string().default('Ersin Spot <bilgi@ersinspot.com>'),
  })
  .superRefine((env, ctx) => {
    if (env.STORAGE_DRIVER === 's3') {
      const required = [
        'S3_ENDPOINT',
        'S3_BUCKET',
        'S3_ACCESS_KEY_ID',
        'S3_SECRET_ACCESS_KEY',
      ] as const;
      for (const key of required) {
        if (env[key] === undefined || env[key] === '') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `STORAGE_DRIVER=s3 seçildiğinde ${key} zorunludur.`,
          });
        }
      }
    }

    // Üretimde geliştirme değerlerinin kalması ciddi bir güvenlik açığıdır.
    if (env.NODE_ENV === 'production') {
      if (env.SESSION_SECRET.includes('gelistirme')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['SESSION_SECRET'],
          message: 'Üretimde geliştirme anahtarı kullanılamaz. Yeni bir anahtar üretin.',
        });
      }
      /*
        Her iki kaynak da https olmalıdır. WEB_ORIGIN yalnızca CORS listesi
        değil: oturum çerezi `Secure` bayrağıyla yazıldığı için http bir
        arayüz kaynağı çerezi hiç alamaz ve giriş sessizce çalışmaz.
      */
      for (const key of ['API_ORIGIN', 'WEB_ORIGIN'] as const) {
        const origin = env[key];
        if (origin.startsWith('http://') && !origin.includes('localhost')) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `Üretimde ${key} https olmalıdır.`,
          });
        }
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    // Bu, süreç başlamadan önce çalışır; logger henüz kurulmadığı için doğrudan yazılır.
    console.error(`\nOrtam yapılandırması geçersiz:\n\n${issues}\n`);
    console.error('.env.example dosyasını .env olarak kopyalayıp değerleri doldurun.\n');
    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
