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
          message: "Ortam değişkenlerine '@/lib/env' üzerinden erişin.",
        },
      ],
    },
  },

  // env ve migrate modülleri process.env'e erişmek zorundadır.
  {
    files: ['apps/api/src/lib/env.ts', 'apps/api/src/db/migrate.ts', 'apps/api/drizzle.config.ts'],
    rules: { 'no-restricted-properties': 'off' },
  },

  // logger, konsola yazma iznine sahip tek modüldür.
  {
    files: ['apps/api/src/lib/logger.ts', 'apps/api/src/db/migrate.ts', 'apps/api/src/db/seed.ts'],
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
