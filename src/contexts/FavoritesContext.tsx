import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface FavoritesContextType {
  favorites: (string | number)[]; // Array of product IDs (UUID veya integer format)
  isFavorite: (productId: string | number) => boolean;
  addToFavorites: (productId: string | number) => Promise<void>;
  removeFromFavorites: (productId: string | number) => Promise<void>;
  toggleFavorite: (productId: string | number) => Promise<void>;
  loading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user, accessToken } = useAuth();
  const [favorites, setFavorites] = useState<(string | number)[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!accessToken) {
      console.log('[FAVORITES] No access token, skipping fetch');
      return;
    }

    console.log('[FAVORITES] Starting fetch for user:', user?.email);

    setLoading(true);
    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/favorites`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[FAVORITES] Response status:', response.status);

      if (!response.ok) {
        console.log('[FAVORITES] Non-OK response, clearing favorites');
        setFavorites([]);
        return;
      }

      const data = await response.json();
      console.log('[FAVORITES] Fetched', data.favorites?.length || 0, 'favorites');
      console.log('[FAVORITES] Raw data:', data.favorites);
      
      // Extract product IDs from favorites - backend Postgres'ten geliyor artık
      // Her favorite objesi: { id, user_id, product_id, created_at, product: {...} }
      const productIds = data.favorites?.map((fav: any) => {
        // product_id direkt alanda var artık
        return fav.product_id || fav.product?.id;
      }).filter(Boolean) || [];
      console.log('[FAVORITES] Extracted product IDs:', productIds);
      setFavorites(productIds);
    } catch (error) {
      // Sessizce devam et - favoriler opsiyonel bir özellik
      console.log('[FAVORITES] Fetch failed, clearing favorites');
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, [user, accessToken]);

  // Fetch favorites when user logs in
  useEffect(() => {
    if (user && accessToken) {
      fetchFavorites();
    } else {
      // Clear favorites when user logs out
      setFavorites([]);
    }
  }, [user, accessToken, fetchFavorites]);

  const isFavorite = useCallback((productId: string | number): boolean => {
    // Hem string hem number karşılaştırması yap (product_id integer olabilir, id UUID olabilir)
    return favorites.some(fav => 
      fav === productId || 
      String(fav) === String(productId) || 
      Number(fav) === Number(productId)
    );
  }, [favorites]);

  const addToFavorites = useCallback(async (productId: string | number) => {
    if (!user || !accessToken) {
      toast.error('Favorilere Eklenemedi', {
        description: 'Favorilere eklemek için giriş yapmalısınız.',
      });
      return;
    }

    // Optimistic update
    setFavorites(prev => [...prev, productId]);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/favorites`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ product_id: productId }),
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add to favorites: ${errorText}`);
      }
      
      toast.success('Favorilere Eklendi!', {
        description: 'Ürün favorilerinize eklendi.',
      });
    } catch (error) {
      console.error('[FAVORITES] Error adding to favorites:', error);
      // Rollback optimistic update
      setFavorites(prev => prev.filter(id => id !== productId));
      toast.error('Hata', {
        description: 'Favorilere eklenirken bir hata oluştu.',
      });
    }
  }, [user, accessToken]);

  const removeFromFavorites = useCallback(async (productId: string | number) => {
    if (!user || !accessToken) {
      toast.error('İşlem Yapılamadı', {
        description: 'Bu işlem için giriş yapmalısınız.',
      });
      return;
    }

    // Optimistic update - tip-safe karşılaştırma
    const previousFavorites = favorites;
    setFavorites(prev => prev.filter(id => {
      // String ve number karşılaştırması yap
      return !(id === productId || String(id) === String(productId) || Number(id) === Number(productId));
    }));

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/favorites/${productId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to remove from favorites: ${errorText}`);
      }
      
      toast.success('Favorilerden Çıkarıldı', {
        description: 'Ürün favorilerinizden çıkarıldı.',
      });
    } catch (error) {
      console.error('[FAVORITES] Error removing from favorites:', error);
      // Rollback optimistic update
      setFavorites(previousFavorites);
      toast.error('Hata', {
        description: 'Favorilerden çıkarılırken bir hata oluştu.',
      });
    }
  }, [user, accessToken, favorites]);

  const toggleFavorite = useCallback(async (productId: string | number) => {
    if (isFavorite(productId)) {
      await removeFromFavorites(productId);
    } else {
      await addToFavorites(productId);
    }
  }, [isFavorite, removeFromFavorites, addToFavorites]);

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        isFavorite,
        addToFavorites,
        removeFromFavorites,
        toggleFavorite,
        loading,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}