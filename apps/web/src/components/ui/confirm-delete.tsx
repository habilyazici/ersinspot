import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from './button.tsx';
import { cn } from '@/lib/utils.ts';

/**
 * Geri alınamayan silme işlemi için iki adımlı düğme.
 *
 * Yönetim panelindeki silme düğmeleri tek tıkla çalışıyordu ve hiçbirinin
 * onayı yoktu. Blog yazısı ve SSS kaydı veritabanından GERÇEKTEN silinir
 * (`DELETE FROM ...`); yanlış satırdaki çöp kutusuna basmak, yazının metnini
 * kalıcı olarak kaybetmek demekti. Liste satırlarındaki simgeler küçük ve yan
 * yanadır — düzenle ile sil arasındaki mesafe birkaç pikseldir.
 *
 * Onay AYRI BİR PENCEREDE değil, düğmenin yerinde sorulur: sayfanın geri kalanı
 * görünür kalır ve kullanıcı neyi sildiğini okumaya devam eder. Aynı kalıp
 * müşteri tarafında sipariş iptalinde de kullanılıyor.
 */
export interface ConfirmDeleteProps {
  /** Tetikleyicinin erişilebilir adı: "Yazıyı sil" gibi. */
  label: string;
  /** Onay adımında gösterilen kısa uyarı. */
  question: string;
  /** Yalnızca BU kaydın silinmesi sürüyorsa true olmalıdır. */
  isPending?: boolean;
  onConfirm: () => void;
  /** Liste satırlarında simge, form altında metinli düğme kullanılır. */
  appearance?: 'icon' | 'text';
  className?: string;
}

export function ConfirmDelete({
  label,
  question,
  isPending = false,
  onConfirm,
  appearance = 'icon',
  className,
}: ConfirmDeleteProps) {
  const [isConfirming, setConfirming] = useState(false);

  if (!isConfirming) {
    return appearance === 'icon' ? (
      <Button
        variant="ghost"
        size="icon"
        aria-label={label}
        className={cn('text-state-danger-fg', className)}
        onClick={() => {
          setConfirming(true);
        }}
      >
        <Trash2 aria-hidden="true" />
      </Button>
    ) : (
      <Button
        type="button"
        variant="ghost"
        className={cn('text-state-danger-fg', className)}
        onClick={() => {
          setConfirming(true);
        }}
      >
        <Trash2 aria-hidden="true" />
        {label}
      </Button>
    );
  }

  return (
    <div
      role="group"
      aria-label={label}
      className={cn('flex flex-wrap items-center gap-2', className)}
    >
      <span className="text-xs text-state-danger-fg">{question}</span>

      <Button
        type="button"
        variant="danger"
        size="sm"
        isLoading={isPending}
        onClick={() => {
          onConfirm();
          setConfirming(false);
        }}
      >
        Sil
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          setConfirming(false);
        }}
      >
        Vazgeç
      </Button>
    </div>
  );
}
