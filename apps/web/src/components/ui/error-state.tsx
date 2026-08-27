import { AlertCircle, RefreshCw } from 'lucide-react';
import { ApiError } from '@ersinspot/shared';
import { Button } from './button.tsx';

/**
 * Hata durumu.
 *
 * Sunucudan gelen `ApiError` mesajı kullanıcıya gösterilmek üzere yazılmıştır;
 * doğrudan basılabilir. Beklenmeyen hatalarda izleme kodu gösterilir — kullanıcı
 * destek talebinde bu kodu paylaşabilir.
 *
 * Eski kod tabanında `ErrorBoundary`, ham hata mesajını (veritabanı hata metni
 * dahil) satır içi stille ekrana basıyordu.
 */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const isApi = error instanceof ApiError;
  const message = isApi
    ? error.message
    : 'Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.';

  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <AlertCircle className="size-12 text-red-400" aria-hidden="true" />

      <h3 className="text-lg font-semibold text-slate-900">Bir sorun oluştu</h3>
      <p className="max-w-md text-sm text-slate-600">{message}</p>

      {isApi && error.traceId !== undefined ? (
        <p className="text-xs text-slate-400">
          Destek kodu: <span className="font-mono">{error.traceId}</span>
        </p>
      ) : null}

      {onRetry === undefined ? null : (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          <RefreshCw aria-hidden="true" />
          Tekrar dene
        </Button>
      )}
    </div>
  );
}
