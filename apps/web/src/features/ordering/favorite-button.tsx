import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth';
import { cn } from '@/lib/utils.ts';
import { useToggleFavorite } from './api.ts';

/**
 * Favori düğmesi.
 *
 * Ürün kartının ve detay sayfasının köşesine yerleşir. Misafirde HİÇ
 * GÖSTERİLMEZ: tıklanınca giriş sayfasına atmak, kullanıcıyı gezindiği
 * listeden koparır; olmayan bir düğme yanlış bir vaatten iyidir.
 *
 * Durum sunucudan gelir ve dışarıdan verilir; bileşen kendi tahminini tutmaz.
 * Liste ekranı sayfadaki tüm ürünlerin durumunu tek istekte sorar, kart başına
 * ayrı istek atılmaz.
 */
export function FavoriteButton({
  productId,
  productTitle,
  isFavorite,
  className,
}: {
  productId: string;
  productTitle: string;
  isFavorite: boolean;
  className?: string;
}) {
  const { isAuthenticated } = useAuth();
  const toggle = useToggleFavorite();

  if (!isAuthenticated) return null;

  const label = isFavorite
    ? `${productTitle} ürününü favorilerden çıkar`
    : `${productTitle} ürününü favorilere ekle`;

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isFavorite}
      disabled={toggle.isPending}
      onClick={() => {
        toggle.mutate(productId, {
          onSuccess: (nowFavorite) => {
            toast.success(nowFavorite ? 'Favorilere eklendi.' : 'Favorilerden çıkarıldı.');
          },
          onError: () => {
            toast.error('Favori güncellenemedi. Lütfen tekrar deneyin.');
          },
        });
      }}
      className={cn(
        /*
          Kartın tamamını kaplayan bağlantı `::after` ile çizilir; düğme onun
          ÜSTÜNDE durmalıdır, yoksa tıklama ürün sayfasına gider.
        */
        'relative z-10 rounded-full bg-white/90 p-2 text-slate-500 shadow-sm transition-colors',
        'hover:bg-white hover:text-state-danger-fg',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange-500',
        'disabled:cursor-not-allowed disabled:opacity-60',
        isFavorite && 'text-state-danger-fg',
        className,
      )}
    >
      <Heart className={cn('size-4', isFavorite && 'fill-current')} aria-hidden="true" />
    </button>
  );
}
