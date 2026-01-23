import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Eye, Shield, Heart, ShoppingCart } from 'lucide-react@0.487.0';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'sonner@2.0.3';
import GuestUserDialog from './GuestUserDialog';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { getConditionLabel } from '../utils/productHelpers';

interface Product {
  id: string | number;  // Hem UUID hem integer ID destekle
  title: string;
  price: number;
  image: string;
  images: string[];
  condition: string;
  category: string;
  warranty?: string;
  deliveryInfo?: string;
  isFavorite?: boolean;
  status?: string; // Ürün durumu: for_sale, sold, in_warehouse
}

interface ProductHoverCardProps {
  product: Product;
  gallery?: boolean; // Gallery mode için opsiyonel prop
  showStockBadge?: boolean; // Stok badge'ini göster/gizle
  isSold?: boolean; // Ürün satıldı mı?
  onAddToCart?: (product: Product) => void; // Sepete ekleme fonksiyonu
}

export function ProductHoverCard({ product, gallery, showStockBadge, isSold, onAddToCart }: ProductHoverCardProps) {
  const [isImageHovered, setIsImageHovered] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showTitleTooltip, setShowTitleTooltip] = useState(false);
  const [isFavoriteDialogOpen, setIsFavoriteDialogOpen] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const { isFavorite: isInFavorites, toggleFavorite: toggleFavoriteContext } = useFavorites();
  
  // Favorite durumunu context'ten al
  const isFavorite = isInFavorites(product.id);

  // Mouse pozisyonunu takip et ve popup pozisyonunu hesapla
  useEffect(() => {
    if (isImageHovered && imageRef.current) {
      // Pozisyon hesaplama fonksiyonu
      const calculatePosition = () => {
        if (!imageRef.current) return;
        
        const popupWidth = 360;
        const popupHeight = 300;
        
        // Ürün fotoğrafının pozisyonunu al
        const imageRect = imageRef.current.getBoundingClientRect();
        const imageCenterX = imageRect.left + imageRect.width / 2;
        const imageCenterY = imageRect.top + imageRect.height / 2;
        
        // Popup'ı fotoğrafın merkezinden konumlandır
        const x = imageCenterX - popupWidth / 2;
        const y = imageCenterY - popupHeight / 2;
        
        // Viewport sınırlarını kontrol et
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Sağa taşarsa sola kaydır
        const finalX = Math.max(10, Math.min(x, viewportWidth - popupWidth - 10));
        // Alta taşarsa yukarı kaydır
        const finalY = Math.max(10, Math.min(y, viewportHeight - popupHeight - 10));
        
        setPopupPosition({ x: finalX, y: finalY });
      };

      // İlk hesaplama
      calculatePosition();
      
      // Biraz gecikmeyle tekrar hesapla (layout shift için)
      const timer = setTimeout(calculatePosition, 50);
      
      return () => clearTimeout(timer);
    }
  }, [isImageHovered]);

  // 600ms hover sonrası popup aç (sadece fotoğraf hover)
  useEffect(() => {
    if (isImageHovered) {
      hoverTimerRef.current = setTimeout(() => {
        // Popup açılmadan hemen önce pozisyonu bir kez daha hesapla
        if (imageRef.current) {
          const popupWidth = 360;
          const popupHeight = 300;
          
          const imageRect = imageRef.current.getBoundingClientRect();
          const imageCenterX = imageRect.left + imageRect.width / 2;
          const imageCenterY = imageRect.top + imageRect.height / 2;
          
          const x = imageCenterX - popupWidth / 2;
          const y = imageCenterY - popupHeight / 2;
          
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          const finalX = Math.max(10, Math.min(x, viewportWidth - popupWidth - 10));
          const finalY = Math.max(10, Math.min(y, viewportHeight - popupHeight - 10));
          
          setPopupPosition({ x: finalX, y: finalY });
        }
        
        setShowPopup(true);
      }, 400); // 400ms bekle - Daha hızlı popup
    } else {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
      setShowPopup(false);
      setCurrentImageIndex(0); // Reset image index
    }

    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, [isImageHovered]);

  // Fare popup'tan çıkınca kapat
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (showPopup && popupRef.current) {
        const rect = popupRef.current.getBoundingClientRect();
        const buffer = 20; // 20px buffer zone
        
        const isOutside = 
          e.clientX < rect.left - buffer ||
          e.clientX > rect.right + buffer ||
          e.clientY < rect.top - buffer ||
          e.clientY > rect.bottom + buffer;

        if (isOutside) {
          setShowPopup(false);
          setIsImageHovered(false);
        }
      }
    };

    if (showPopup) {
      document.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [showPopup]);

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === product.images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? product.images.length - 1 : prev - 1
    );
  };

  const toggleFavorite = async () => {
    if (!isAuthenticated) {
      setIsFavoriteDialogOpen(true);
      return;
    }

    // Context'teki toggleFavorite'ı çağır
    await toggleFavoriteContext(product.id);
    // Toast mesajı context içinde gösterildiği için burada tekrar göstermeye gerek yok
  };

  const addToCart = () => {
    if (!isAuthenticated) {
      setIsFavoriteDialogOpen(true);
      return;
    }

    const cartItem = {
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.image,
      quantity: 1
    };

    addItem(cartItem);
    toast.success('Ürün sepetinize eklendi');
  };

  return (
    <div className="relative">
      {/* Ürün Kartı - Link Kaldırıldı */}
      <Card className={`overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1 duration-300 h-full ${
        isSold ? 'opacity-80 ring-2 ring-red-500/30' : ''
      }`}>
        {/* Fotoğraf - Hover buraya taşındı */}
        <div 
          className="relative group/image"
          onMouseEnter={() => {
            setIsImageHovered(true);
          }}
          onMouseLeave={(e) => {
            setIsImageHovered(false);
          }}
          ref={imageRef}
        >
          {/* Satıldı overlay - DAHA KARANLIK VE BELİRGİN */}
          {showStockBadge && isSold && (
            <>
              {/* Koyu overlay */}
              <div className="absolute inset-0 bg-gray-900/40 z-[5]"></div>
              
              {/* BÜYÜK "SATILDI" YAZISI - ORTADA */}
              <div className="absolute inset-0 flex items-center justify-center z-[6]">
                <div className="bg-red-600 text-white px-8 py-4 rounded-lg transform -rotate-12 shadow-2xl border-4 border-white">
                  <span className="text-2xl" style={{ fontWeight: 900, letterSpacing: '2px' }}>SATILDI</span>
                </div>
              </div>
            </>
          )}
          
          <ImageWithFallback
            src={product.image}
            alt={product.title}
            className={`w-full h-64 object-cover ${isSold ? 'grayscale-[50%]' : ''}`}
          />
          
          {/* Durum Badge - Sağ Üst */}
          <Badge className="absolute top-3 right-3 bg-[#f97316] text-white z-10">
            {getConditionLabel(product.condition)}
          </Badge>
          
          {/* STOK DURUMU BADGE - SOL ALT - SADECE SATILDI GÖSTER */}
          {showStockBadge && isSold && (
            <Badge 
              className="absolute bottom-3 left-3 z-10 border-0 shadow-lg px-4 py-2 text-sm bg-red-600 text-white animate-pulse"
            >
              ✖ Satıldı
            </Badge>
          )}
          
          {/* Favori Butonu - Sol Üst */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite();
            }}
            className="absolute top-3 left-3 w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors z-10 shadow-lg"
          >
            <Heart
              className={`w-5 h-5 transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
            />
          </button>
        </div>
        <CardContent className="p-5">
          <p className="text-sm text-gray-500 mb-1">{product.category}</p>
          {/* Ürün Başlığı - Tıklanabilir Link - 2 Satır Max */}
          <div className="relative mb-3 group/title">
            <Link 
              to={`/urun/${product.id}`}
              className="block"
            >
              <h3 className="line-clamp-2 min-h-[3rem] hover:text-[#f97316] transition-colors cursor-pointer underline decoration-transparent hover:decoration-[#f97316] underline-offset-4">
                {product.title}
              </h3>
            </Link>
            {/* Tooltip - Kaybolmaz, üzerine gelebilirsin - ÜSTTEN AÇILIR */}
            <div className="invisible group-hover/title:visible absolute left-0 bottom-full bg-gray-900 text-white px-3 py-2 text-sm rounded-lg mb-1 z-[60] shadow-2xl whitespace-normal max-w-xs pointer-events-auto">
              {product.title}
              <div className="absolute -bottom-1 left-4 w-2 h-2 bg-gray-900 rotate-45"></div>
            </div>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[#1e3a8a] text-xl">{product.price.toLocaleString('tr-TR')} ₺</span>
          </div>
          
          {/* Minimal Ürün Bilgileri */}
          <div className="space-y-1.5 mb-3">
            {product.warranty && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <Shield className="w-3 h-3 text-green-600 flex-shrink-0" />
                <span className="truncate">{product.warranty}</span>
              </div>
            )}
          </div>
          
          {/* Butonlar - Sepete Ekle (SOL) + Detayları Gör (SAĞ) - ProductCard gibi */}
          <div className="flex gap-2">
            <Button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onAddToCart) {
                  onAddToCart(product);
                } else {
                  addToCart();
                }
              }}
              size="sm"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Sepete Ekle
            </Button>
            <Link to={`/urun/${product.id}`} className="flex-1">
              <Button 
                size="sm"
                variant="outline"
                className="w-full"
              >
                Detayları Gör
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Hover Popup - React Portal ile Body'ye Taşındı - SADE VERSİYON */}
      {showPopup && createPortal(
        <AnimatePresence>
          <motion.div
            ref={popupRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed z-[9999] pointer-events-auto"
            style={{ 
              left: `${popupPosition.x}px`, 
              top: `${popupPosition.y}px`,
              width: '360px' // Biraz daha büyük
            }}
            onMouseEnter={() => {
              setIsImageHovered(true);
            }}
            onMouseLeave={() => {
              setIsImageHovered(false);
            }}
          >
            <Card className="overflow-hidden shadow-lg border border-gray-200 bg-white">
              {/* Sadece Carousel - Kompakt */}
              <div className="relative h-[300px] bg-gray-50">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentImageIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0"
                  >
                    <ImageWithFallback
                      src={product.images[currentImageIndex]}
                      alt={`${product.title} - Görsel ${currentImageIndex + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                </AnimatePresence>

                {/* Navigation Buttons */}
                {product.images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        prevImage();
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-md transition-all hover:scale-105 z-10"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        nextImage();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-md transition-all hover:scale-105 z-10"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Image Counter */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1.5 rounded-full text-xs">
                  {currentImageIndex + 1} / {product.images.length}
                </div>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
      
      {/* Favori Dialog */}
      <GuestUserDialog
        open={isFavoriteDialogOpen}
        onOpenChange={setIsFavoriteDialogOpen}
        action="favorite"
      />
    </div>
  );
}