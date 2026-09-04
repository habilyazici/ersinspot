/**
 * Fotoğraf yükleme.
 *
 * Teknik servis ve ürün satma talepleri fotoğraf ister; ürün satmada en az üç
 * fotoğraf zorunludur — personel ürünü görmeden değerleme yapamaz.
 *
 * Dosya seçilir seçilmez yüklenir ve dönen DEPOLAMA ANAHTARI forma yazılır.
 * Adres değil anahtar taşınır: adres yapılandırmadan türetilir, depolama
 * sunucusu değişse kayıtlı adresler kırılırdı.
 *
 * Yükleme başarısız olursa kalem listeden düşer; forma yarım bir anahtar
 * yazılmaz.
 */

import { useId, useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { ALLOWED_IMAGE_TYPES, ApiError, MAX_IMAGE_BYTES } from '@ersinspot/shared';
import type { UploadPurpose } from '@ersinspot/shared';
import { apiRequest, apiUpload } from '@/lib/api';
import { Button } from './button.tsx';
import { describedByFor } from '@/lib/form.ts';

/** Sunucudan dönen yükleme sonucu. */
interface UploadedFile {
  readonly storageKey: string;
  readonly url: string;
}

export interface PhotoUploadProps {
  label: string;
  /** Yüklemenin amacı; sunucu buna göre yetki denetler. */
  purpose: UploadPurpose;
  /** Formdaki mevcut anahtarlar. */
  value: readonly { storageKey: string }[];
  onChange: (photos: { storageKey: string }[]) => void;
  min?: number;
  max?: number;
  hint?: string;
  error?: string | undefined;
}

export function PhotoUpload({
  label,
  purpose,
  value,
  onChange,
  min = 0,
  max = 10,
  hint,
  error,
}: PhotoUploadProps) {
  const inputId = useId();
  const errorId = `${inputId}-hata`;
  const hintId = `${inputId}-yardim`;

  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  /*
    Önizleme adresleri ayrı tutulur.

    Form yalnızca depolama anahtarını taşır; kullanıcıya gösterilecek adres
    yüklemenin yanıtından gelir. Anahtardan adres üretmek istemcinin depolama
    yapılandırmasını bilmesini gerektirirdi.
  */
  const [previews, setPreviews] = useState<Record<string, string>>({});

  async function upload(files: FileList): Promise<void> {
    const remaining = max - value.length;

    if (remaining <= 0) {
      setUploadError(`En fazla ${String(max)} fotoğraf yükleyebilirsiniz.`);
      return;
    }

    const selected = [...files].slice(0, remaining);
    setUploadError(null);

    for (const file of selected) {
      if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
        setUploadError('Yalnızca JPEG, PNG ve WebP fotoğraf yükleyebilirsiniz.');
        continue;
      }

      if (file.size > MAX_IMAGE_BYTES) {
        setUploadError(
          `Fotoğraf en fazla ${String(Math.round(MAX_IMAGE_BYTES / 1024 / 1024))} MB olabilir.`,
        );
        continue;
      }

      setUploading((count) => count + 1);

      try {
        const response = await apiUpload<{ file: UploadedFile }>('/api/uploads', file, { purpose });

        setPreviews((current) => ({ ...current, [response.file.storageKey]: response.file.url }));
        onChange([...value, { storageKey: response.file.storageKey }]);
      } catch (uploadFailure) {
        setUploadError(
          uploadFailure instanceof ApiError
            ? uploadFailure.message
            : 'Fotoğraf yüklenemedi. Lütfen tekrar deneyin.',
        );
      } finally {
        setUploading((count) => count - 1);
      }
    }

    // Aynı dosyanın tekrar seçilebilmesi için girdiyi sıfırla.
    if (inputRef.current !== null) inputRef.current.value = '';
  }

  /**
   * Kaldırılan fotoğrafı depolamadan da siler.
   *
   * Sessizce yapılır ve hatası yutulur: dosya bir kayda bağlıysa sunucu haklı
   * olarak reddeder ve bu bir hata değildir. Silinemeyen dosyayı zaten yetim
   * temizliği görevi topluyor; buradaki çağrı yalnızca gereksiz yer
   * kaplamasını hızlıca önlemek içindir.
   */
  async function discard(storageKey: string): Promise<void> {
    try {
      await apiRequest(`/api/uploads/${storageKey}`, { method: 'DELETE' });
    } catch {
      // Kasıtlı olarak yutulur; kullanıcı için bir sonucu yok.
    }
  }

  const message = uploadError ?? error;

  const describedBy = describedByFor({
    hintId,
    errorId,
    hasHint: hint !== undefined,
    hasError: message !== undefined && message !== null,
  });

  return (
    <div className="space-y-2">
      <p className="block text-sm font-medium text-slate-700">
        {label}
        {min > 0 ? (
          <span className="ml-0.5 text-red-600" aria-hidden="true">
            *
          </span>
        ) : null}
      </p>

      <ul className="flex flex-wrap gap-3">
        {value.map((photo) => (
          <li
            key={photo.storageKey}
            className="relative size-24 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
          >
            {previews[photo.storageKey] === undefined ? null : (
              <img
                src={previews[photo.storageKey]}
                alt=""
                className="size-full object-cover"
                loading="lazy"
              />
            )}

            <button
              type="button"
              onClick={() => {
                onChange(value.filter((item) => item.storageKey !== photo.storageKey));
                void discard(photo.storageKey);
              }}
              className="absolute right-1 top-1 rounded-md bg-white/90 p-1 text-state-danger-fg hover:bg-white"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              <span className="sr-only">Bu fotoğrafı kaldır</span>
            </button>
          </li>
        ))}

        {uploading > 0 ? (
          <li className="flex size-24 items-center justify-center rounded-lg border border-dashed border-slate-300">
            <Loader2 className="size-5 animate-spin text-slate-400" aria-hidden="true" />
            <span className="sr-only">Fotoğraf yükleniyor</span>
          </li>
        ) : null}
      </ul>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(',')}
        multiple
        className="sr-only"
        aria-describedby={describedBy}
        aria-invalid={message !== undefined && message !== null}
        onChange={(event) => {
          if (event.target.files !== null) void upload(event.target.files);
        }}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={value.length >= max}
        onClick={() => inputRef.current?.click()}
      >
        <ImagePlus aria-hidden="true" />
        Fotoğraf ekle
      </Button>

      {message === undefined || message === null ? (
        hint === undefined ? null : (
          <p id={hintId} className="text-sm text-slate-500">
            {hint}
          </p>
        )
      ) : (
        <p id={errorId} className="text-sm text-red-600">
          {message}
        </p>
      )}
    </div>
  );
}
