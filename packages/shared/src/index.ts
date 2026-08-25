/**
 * @ersinspot/shared
 *
 * Sunucu ve tarayıcının paylaştığı alan modeli, doğrulama şemaları ve hata sözleşmesi.
 * Bu paket hiçbir çalışma zamanı bağımlılığı taşımaz (zod hariç) ve her iki ortamda da
 * çalışır; içine tarayıcıya veya Node'a özgü kod eklenmemelidir.
 */

export * from './domain/index.ts';
export * from './schemas/index.ts';
export * from './errors.ts';
