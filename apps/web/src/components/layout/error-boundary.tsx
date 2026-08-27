import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';

/**
 * Uygulama hata sınırı.
 *
 * Bir bileşen çökerse tüm sayfanın beyaz kalması yerine anlaşılır bir mesaj
 * gösterir. Eski kod tabanında hata sınırı ham hata mesajını (veritabanı hata
 * metni dahil) satır içi stille ekrana basıyordu.
 *
 * Hata ayrıntısı yalnızca geliştirmede gösterilir; üretimde kullanıcıya sistem
 * içi bilgi sızdırmaz.
 */

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Üretimde bu, hata toplama servisine gönderilir.
    // eslint-disable-next-line no-console
    console.error('Bileşen hatası:', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <AlertTriangle className="size-14 text-brand-orange-500" aria-hidden="true" />

        <h1 className="text-2xl font-bold text-slate-900">Bir şeyler ters gitti</h1>
        <p className="max-w-md text-slate-600">
          Beklenmeyen bir hata oluştu. Sayfayı yenilemek genellikle sorunu çözer.
        </p>

        {import.meta.env.DEV && this.state.error !== null ? (
          <pre className="max-w-2xl overflow-x-auto rounded-lg bg-slate-100 p-4 text-left text-xs text-slate-700">
            {this.state.error.message}
          </pre>
        ) : null}

        <Button onClick={() => window.location.reload()} className="mt-2">
          Sayfayı yenile
        </Button>
      </div>
    );
  }
}
