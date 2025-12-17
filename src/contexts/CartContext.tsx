import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export interface CartItem {
  id: string | number;  // Hem UUID hem integer ID destekle
  title: string;
  price: number;
  image: string;
  quantity: number;
  condition?: string;
  category?: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (id: string | number) => void;  // Hem UUID hem integer ID destekle
  updateQuantity: (id: string | number, quantity: number) => void;  // Hem UUID hem integer ID destekle
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);

  // Kullanıcı değiştiğinde sepeti yükle veya temizle
  useEffect(() => {
    if (user?.id) {
      // Kullanıcı giriş yapmış - sepeti yükle
      try {
        const storageKey = `ersinspot-cart-${user.id}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          setItems(Array.isArray(parsed) ? parsed : []);
        } else {
          setItems([]);
        }
      } catch (error) {
        console.error('Failed to load cart from localStorage:', error);
        setItems([]);
      }
    } else {
      // Kullanıcı çıkış yapmış - sepeti temizle
      setItems([]);
    }
  }, [user?.id]);

  // Sepet değiştiğinde LocalStorage'a kaydet (sadece giriş yapmış kullanıcı için)
  useEffect(() => {
    if (user?.id) {
      const storageKey = `ersinspot-cart-${user.id}`;
      localStorage.setItem(storageKey, JSON.stringify(items));
    }
  }, [items, user?.id]);

  const addToCart = (item: Omit<CartItem, 'quantity'>) => {
    // Sadece giriş yapmış kullanıcılar sepete ekleyebilir
    if (!user?.id) {
      console.warn('Sepete ekleme için giriş yapmalısınız');
      return;
    }

    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        // İkinci el ürün - zaten sepette varsa tekrar ekleme
        return prev;
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string | number) => {
    if (!user?.id) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string | number, quantity: number) => {
    if (!user?.id) return;
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => {
    setItems([]);
    // LocalStorage'dan da temizle
    if (user?.id) {
      const storageKey = `ersinspot-cart-${user.id}`;
      localStorage.removeItem(storageKey);
    }
  };

  // İkinci el ürünler - her ürün 1 adet
  const totalItems = items.length;
  const totalPrice = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}