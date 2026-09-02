import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { EmptyState } from '@/components/ui/empty-state.tsx';
import { ErrorState } from '@/components/ui/error-state.tsx';
import { PageContainer, PageHeader } from '@/components/ui/page.tsx';
import { PageSpinner } from '@/components/ui/spinner.tsx';
import { ProductCard } from '@/features/catalog';
import { FavoriteButton, useFavorites } from '@/features/ordering';

/**
 * Favorilerim.
 *
 * Listede yalnızca hâlâ vitrinde olan ürünler görünür: satılmış veya yayından
 * kaldırılmış bir ürünün kartı açılamayacağı için sunucu onu listeye koymaz.
 * Kullanıcı kalbi buradan da kaldırabilir; kart anında listeden düşer.
 */
export default function FavoritesPage() {
  const { data: products, isLoading, isError, error, refetch } = useFavorites();

  if (isLoading) return <PageSpinner label="Favoriler yükleniyor" />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <PageContainer>
      <PageHeader
        title="Favorilerim"
        description="Beğendiğiniz ürünler burada birikir. Satıştan kalkan ürünler listede görünmez."
      />

      {products === undefined || products.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Henüz favoriniz yok"
          description="Ürün kartındaki kalp simgesine dokunarak beğendiklerinizi buraya ekleyebilirsiniz."
          action={
            <Button asChild>
              <Link to="/urunler">Ürünlere göz at</Link>
            </Button>
          }
        />
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard
                product={product}
                action={
                  <FavoriteButton productId={product.id} productTitle={product.title} isFavorite />
                }
              />
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
