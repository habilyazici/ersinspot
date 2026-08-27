import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

/**
 * ESLint yapılandırması.
 *
 * Kurallar, eski kod tabanında en sık görülen hata sınıflarına göre seçildi:
 *
 *  - 414 adet `any` kullanımı → `no-explicit-any` ve `no-unsafe-*` hata seviyesinde
 *  - 1.473 adet `console.*` → `no-console` hata seviyesinde (logger üzerinden yazılır)
 *  - 109 dağınık `fetch` çağrısı → doğrudan `fetch` kullanımı yasak
 *  - Beklenmeyen sözler (promise) → `no-floating-promises` hata seviyesinde
 */
export default tseslint.config(
  {
    ignores: [
      'dist',
      'build',
      'node_modules',
      'legacy',
      '**/db/migrations/**',
      'coverage',
      '*.config.js',
      '**/*.config.ts',
    ],
  },

  // ---------------------------------------------------------------------------
  // Tüm TypeScript kaynakları için ortak kurallar
  // ---------------------------------------------------------------------------
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',

      // Beklenmeyen söz: hata sessizce yutulur, işlem yarım kalır.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',

      // Tip içe aktarımları ayrı yazılır — çalışma zamanı paketine sızmaz.
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],

      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],

      // Nullish birleştirme, mantıksal VEYA'dan daha güvenlidir: 0 ve '' değerlerini korur.
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',

      'no-console': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'error',
      'object-shorthand': 'error',
    },
  },

  // ---------------------------------------------------------------------------
  // Sunucu kodu
  // ---------------------------------------------------------------------------
  {
    files: ['apps/api/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      // Yapılandırmaya doğrudan erişim yalnızca env modülünde yapılır.
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message: "Ortam değişkenlerine '@/platform/config/env' üzerinden erişin.",
        },
      ],
    },
  },

  // Yalnızca yapılandırma modülü ve migration betiği process.env'e erişebilir.
  {
    files: [
      'apps/api/src/platform/config/env.ts',
      'apps/api/src/platform/db/migrate.ts',
      'apps/api/src/platform/db/migrate-test.ts',
      'apps/api/drizzle.config.ts',
    ],
    rules: { 'no-restricted-properties': 'off' },
  },

  // logger, konsola yazma iznine sahip tek modüldür. Migration ve tohumlama
  // betikleri komut satırından çalıştığı için doğrudan yazabilir.
  {
    files: [
      'apps/api/src/platform/observability/logger.ts',
      'apps/api/src/platform/db/migrate.ts',
      'apps/api/src/platform/db/migrate-test.ts',
      // Tohumlama bileşim kökündedir: birden çok modüle dokunduğu için
      // platform katmanında duramaz.
      'apps/api/src/seed.ts',
    ],
    rules: { 'no-console': 'off' },
  },

  // ---------------------------------------------------------------------------
  // Tarayıcı kodu
  // ---------------------------------------------------------------------------
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Ağ çağrıları tipli API istemcisi üzerinden yapılır.
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: "Ağ çağrıları için '@/lib/api' istemcisini kullanın." },
      ],
    },
  },

  // API istemcisinin kendisi fetch kullanmak zorundadır.
  {
    files: ['apps/web/src/lib/api/**/*.ts'],
    rules: { 'no-restricted-globals': 'off' },
  },


  // ---------------------------------------------------------------------------
  // Modüler monolit sınırları
  // ---------------------------------------------------------------------------
  // Bu kurallar docs/MIMARI.md içindeki sözleşmeyi zorunlu kılar. Belge tavsiye
  // verir; burası derlemeyi kırar.

  {
    files: ['apps/api/src/modules/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // Başka bir modülün iç dosyalarına erişim yasak.
              // Modül içinde göreli yol (./domain/x.ts) kullanılır; modüller arası
              // erişim yalnızca @/modules/<ad> genel sözleşmesi üzerinden yapılır.
              group: ['@/modules/*/*', '@/modules/*/**'],
              message:
                'Modüller arası erişim yalnızca genel sözleşme üzerinden yapılır: ' +
                "import { catalog } from '@/modules/catalog'. " +
                'Ayrıntı için docs/MIMARI.md, Kural 1.',
            },
            {
              // Göreli yolla modül sınırını aşmak da yasak.
              group: ['../../*/infrastructure/*', '../../*/application/*', '../../*/domain/*', '../../*/api/*'],
              message:
                'Başka bir modülün iç katmanına göreli yolla erişilemez. ' +
                'Genel sözleşmeyi kullanın: @/modules/<ad>. Ayrıntı için docs/MIMARI.md.',
            },
            {
              // Şema birleştiricisi modüllerin tablolarını toplar; iş kodu ondan
              // tablo çekemez, kendi modülünün şemasını kullanır.
              group: ['**/platform/db/schema.ts'],
              message:
                'platform/db/schema.ts yalnızca Drizzle Kit içindir. ' +
                'Kendi modülünüzün infrastructure/schema.ts dosyasını kullanın.',
            },
          ],
        },
      ],
    },
  },

  {
    // Platform katmanı altyapıdır: iş kuralı içermez ve modüllere bağımlı olmaz.
    // Tek istisna, kimlik doğrulama middleware'inin oturum çözümlemesidir.
    files: ['apps/api/src/platform/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/modules/*/api/*', '**/modules/*/domain/*'],
              message:
                'Platform katmanı modüllerin iş mantığına bağımlı olamaz. ' +
                'Bağımlılık yönü daima modüllerden platforma doğrudur.',
            },
          ],
        },
      ],
    },
  },

  {
    // Şema birleştiricisi ve ilişki tanımları, modüllerin tablolarını toplamak
    // zorundadır: Drizzle Kit tek bir giriş noktası bekler. Bilinçli istisna.
    files: [
      'apps/api/src/platform/db/schema.ts',
      'apps/api/src/platform/db/relations.ts',
      'apps/api/src/platform/http/auth.ts',
      'apps/api/src/platform/http/security.ts',
    ],
    rules: { 'no-restricted-imports': 'off' },
  },

  {
    // Şema dosyaları, modül sınırını geçen yabancı anahtarlar için diğer modüllerin
    // tablolarına referans vermek zorundadır (orders.user_id → users.id gibi).
    // docs/MIMARI.md, Kural 2: tek veritabanı kullandığımız için referans
    // bütünlüğünü veritabanına bırakmak bilinçli bir tercihtir.
    //
    // Bu istisna YALNIZCA şema tanımları içindir. İş mantığı (application, api,
    // domain) başka modülün tablosuna erişemez — veriyi genel sözleşmeden ister.
    files: ['apps/api/src/modules/*/infrastructure/schema.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },

  {
    // Testler kurulum için modüllerin içine erişebilir.
    files: ['apps/api/src/test/**/*.ts', 'apps/api/**/*.test.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },

  {
    // Yapılandırma doğrulaması logger kurulmadan önce çalışır; hatayı doğrudan
    // yazmak zorundadır.
    files: ['apps/api/src/platform/config/env.ts'],
    rules: { 'no-console': 'off' },
  },

  {
    // Tarayıcı tarafında da aynı modül sınırları geçerli.
    //
    // Özellik modülleri (features/) backend modüllerini birebir yansıtır ve
    // birbirlerinin iç dosyalarına erişemez; yalnızca index.ts sözleşmesini
    // kullanır. Bu, backend'deki kuralın aynısıdır.
    files: ['apps/web/src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*/*', '@/features/*/**'],
              message:
                'Özellik modülleri arasında erişim yalnızca genel sözleşme üzerinden yapılır: ' +
                "import { useAuth } from '@/features/auth'. Ayrıntı için docs/MIMARI.md.",
            },
            {
              group: ['../*/api.ts', '../*/use-*.ts', '../*/components/*'],
              message:
                'Başka bir özellik modülünün iç dosyasına göreli yolla erişilemez. ' +
                'Genel sözleşmeyi kullanın: @/features/<ad>.',
            },
          ],
        },
      ],
    },
  },

  {
    // Sayfalar özellik modüllerinin sözleşmesini kullanır; iç dosyalarına
    // erişemez.
    files: ['apps/web/src/routes/**/*.tsx', 'apps/web/src/components/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*/*', '@/features/*/**'],
              message:
                'Özellik modülüne yalnızca sözleşmesinden erişin: ' +
                "import { useAuth } from '@/features/auth'.",
            },
          ],
        },
      ],
    },
  },

  {
    // Paylaşılan paketin çekirdeği hiçbir modüle bağımlı olamaz.
    files: ['packages/shared/src/kernel/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../modules/**', '**/modules/**'],
              message:
                'Çekirdek modüllere bağımlı olamaz. Bağımlılık yönü daima ' +
                'modüllerden çekirdeğe doğrudur.',
            },
          ],
        },
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // Testler
  // ---------------------------------------------------------------------------
  {
    files: ['**/*.test.{ts,tsx}', '**/test/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': 'off',
    },
  },
);
