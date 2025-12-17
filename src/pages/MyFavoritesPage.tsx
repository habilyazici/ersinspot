import { Heart, ArrowLeft } from 'lucide-react@0.487.0';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ProductHoverCard } from '../components/ProductHoverCard';
import { useFavorites } from '../contexts/FavoritesContext';
import { useAuth } from '../contexts/AuthContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Skeleton } from '../components/ui/skeleton';

export default function MyFavoritesPage() {
  const { user, accessToken } = useAuth();
  const { favorites: favoriteIds } = useFavorites();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && accessToken) {
      loadFavorites();
    } else {
      setLoading(false);
    }
  }, [user, accessToken, favoriteIds]);

  const loadFavorites = async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/favorites`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[MY FAVORITES] Fetch failed:', response.status, errorData);
        // Sessizce devam et - boş favoriler göster
        setFavorites([]);
        return;
      }

      const data = await response.json();
      console.log('[MY FAVORITES] Fetched favorites:', data);
      console.log('[MY FAVORITES] Favorites count:', data.favorites?.length || 0);
      console.log('[MY FAVORITES] First favorite:', data.favorites?.[0]);
      console.log('[MY FAVORITES] All favorites:', data.favorites);
      
      // Transform favorites to ProductHoverCard format
      const transformedFavorites = data.favorites
        ?.filter((fav: any) => {
          console.log('[MY FAVORITES] Processing favorite:', fav);
          console.log('[MY FAVORITES] Has product?', !!fav.product);
          if (!fav.product) {
            console.log('[MY FAVORITES] ❌ Skipping favorite without product:', fav);
          }
          return fav.product;
        })
        ?.map((fav: any) => {
          const product = fav.product;
          console.log('[MY FAVORITES] Transforming product:', product.id, product.title);
          
          const category = product.category;
          const images = product.images || [];
          
          return {
            id: product.id,
            title: product.title,
            price: product.price,
            image: images[0]?.image_url || images[0] || 'https://images.unsplash.com/photo-1560393464-5c69a73c5770',
            images: images.map((img: any) => typeof img === 'string' ? img : img.image_url),
            condition: product.condition,
            category: category?.name || 'Kategori',
            brand: 'Marka',
            location: 'Bakırköy, İstanbul',
            date: new Date(fav.created_at).toLocaleDateString('tr-TR'),
            isFavorite: true,
            status: product.status,
            isSold: product.status === 'sold',
          };
        }) || [];

      console.log('[MY FAVORITES] Transformed favorites:', transformedFavorites);
      console.log('[MY FAVORITES] Transformed count:', transformedFavorites.length);
      setFavorites(transformedFavorites);
    } catch (error) {
      console.error('[MY FAVORITES] Exception loading favorites:', error);
      // Sessizce devam et - boş favoriler göster
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-gradient-to-b from-gray-50/40 via-white to-gray-50/40 min-h-screen pt-24">
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-md mx-auto border-2">
            <CardContent className="p-12 text-center">
              <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-gray-800 mb-2">Giriş Yapmalısınız</h3>
              <p className="text-gray-600 mb-6">
                Favorilerinizi görmek için lütfen giriş yapın.
              </p>
              <Link to="/giris">
                <Button className="bg-[#f97316] hover:bg-[#ea580c]">
                  Giriş Yap
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-gray-50/40 via-white to-gray-50/40 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-[var(--brand-coral-500)]/30 via-red-500/30 to-pink-600/30 text-white py-8 pt-24">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <Link to="/hesabim">
              <Button variant="ghost" className="text-white hover:bg-white/20 mb-4" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Hesabıma Dön
              </Button>
            </Link>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-white to-gray-100 rounded-xl flex items-center justify-center shadow-xl">
                <Heart className="w-7 h-7 text-[var(--brand-coral-500)] fill-[var(--brand-coral-500)]" />
              </div>
              <div>
                <h1 className="text-2xl mb-1 drop-shadow-lg font-bold">Favorilerim</h1>
                <p className="text-white/90 text-sm font-medium drop-shadow">
                  Toplam <span className="font-bold text-white">{favorites.length}</span> favori ürününüz var
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Favorites Grid */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((index) => (
                <Card key={index} className="border-2 border-dashed bg-gradient-to-br from-red-50 to-pink-50">
                  <CardContent className="p-12 text-center">
                    <Skeleton className="w-20 h-20 bg-[var(--brand-coral-100)] rounded-full flex items-center justify-center mx-auto mb-4" />
                    <Skeleton className="w-40 h-6 bg-gray-200 mx-auto mb-2" />
                    <Skeleton className="w-32 h-4 bg-gray-200 mx-auto" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : favorites.length === 0 ? (
            <Card className="border-2 border-dashed bg-gradient-to-br from-red-50 to-pink-50">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-[var(--brand-coral-100)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-10 h-10 text-[var(--brand-coral-500)]" />
                </div>
                <h3 className="text-gray-800 mb-2 font-semibold">Henüz favori ürününüz yok</h3>
                <p className="text-gray-600 mb-6">
                  Beğendiğiniz ürünleri favorilere ekleyin
                </p>
                <Link to="/urunler">
                  <Button className="bg-[var(--brand-coral-500)] hover:bg-[var(--brand-coral-600)]">
                    Ürünleri İncele
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((item) => (
                <ProductHoverCard 
                  key={item.id} 
                  product={item}
                  showStockBadge={true}
                  isSold={item.status === 'sold'}
                />
              ))}
            </div>
          )}

          {/* CTA Section */}
          {favorites.length > 0 && (
            <Card className="mt-12 bg-gradient-to-br from-[var(--brand-coral-50)] to-pink-50 border-[var(--brand-coral-200)]">
              <CardContent className="p-8 text-center">
                <h3 className="mb-3 text-[var(--brand-coral-700)]">
                  🎉 Daha Fazla Ürün Keşfet!
                </h3>
                <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                  Binlerce ikinci el ürün arasından size uygun olanları bulun ve favorilerinize ekleyin
                </p>
                <div className="flex gap-4 justify-center flex-wrap">
                  <Link to="/urunler">
                    <Button className="bg-[var(--brand-coral-500)] hover:bg-[var(--brand-coral-600)]">
                      Tüm Ürünleri Gör
                    </Button>
                  </Link>
                  <Link to="/urunler?category=beyaz-esya">
                    <Button variant="outline" className="border-[var(--brand-coral-400)] text-[var(--brand-coral-600)] hover:bg-[var(--brand-coral-50)]">
                      Beyaz Eşya
                    </Button>
                  </Link>
                  <Link to="/urunler?category=elektronik">
                    <Button variant="outline" className="border-[var(--brand-coral-400)] text-[var(--brand-coral-600)] hover:bg-[var(--brand-coral-50)]">
                      Elektronik
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}