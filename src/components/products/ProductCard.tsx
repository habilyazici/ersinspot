import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart, MapPin, Calendar, Shield, Truck, Package as PackageIcon, ChevronLeft, ChevronRight } from 'lucide-react@0.487.0';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { toast } from 'sonner@2.0.3';
import { useCart } from '../../contexts/CartContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import { useAuth } from '../../contexts/AuthContext';
import GuestUserDialog from '../GuestUserDialog';
import { motion, AnimatePresence } from 'motion/react';
import { getConditionLabel } from '../../utils/productHelpers';

interface Product {
  id: number;
  title: string;
  price: number;
  images: string[];
  condition: string;
  category: string;
  brand: string;
  location: string;
  date: string;
  isFavorite: boolean;
  warranty?: string; // Garanti süresi
  deliveryInfo?: string; // Teslimat bilgisi
  stock?: string; // Stok durumu
  status?: string; // Ürün durumu: for_sale, sold, in_warehouse
  features?: Record<string, string>; // Ürün özellikleri
}

interface ProductCardProps {
  product: Product;
  gallery?: boolean;
  disablePopup?: boolean; // Gallery mode için pop-up'ı kapat
  showStockBadge?: boolean; // Stok durumu badge'ini göster/gizle
  isSold?: boolean; // Ürün satıldı mı?
}

export default function ProductCard({ product, gallery = false, disablePopup = false, showStockBadge = false, isSold = false }: ProductCardProps) {
  const [isCartDialogOpen, setIsCartDialogOpen] = useState(false);
  const [isFavoriteDialogOpen, setIsFavoriteDialogOpen] = useState(false);
  const [showImagePopup, setShowImagePopup] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageHovered, setIsImageHovered] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false); // Buton hover state
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const { addToCart, items: cartItems } = useCart();
  const { isFavorite: isInFavorites, toggleFavorite } = useFavorites();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Favoride mi kontrol et
  const isFavoriteProduct = isInFavorites(product.id);

  // Mouse pozisyonunu takip et ve popup pozisyonunu hesapla
  useEffect(() => {
    if (isImageHovered && imageRef.current) {
      // Popup'ı ürün fotoğrafının merkezinden aç
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
    }
  }, [isImageHovered]);

  // 400ms hover sonrası popup aç (sadece fotoğraf hover) - Ana sayfadaki gibi
  useEffect(() => {
    // Gallery mode'da pop-up gösterme
    if (disablePopup) return;
    
    // Buton hover'dayken popup açma
    if (isButtonHovered) {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
      setShowImagePopup(false);
      return;
    }
    
    if (isImageHovered) {
      hoverTimerRef.current = setTimeout(() => {
        setShowImagePopup(true);
      }, 400); // 400ms bekle - Ana sayfadaki gibi
    } else {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
      setShowImagePopup(false);
      setCurrentImageIndex(0); // Reset image index
    }

    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, [isImageHovered, isButtonHovered, disablePopup]);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Misafir kullanıcı kontrolü
    if (!isAuthenticated) {
      setIsCartDialogOpen(true);
      return;
    }

    // Ürün zaten sepette mi kontrol et
    const isInCart = cartItems.some(item => item.id === product.id);
    if (isInCart) {
      toast.warning('Bu ürün zaten sepetinizde!', {
        description: 'Her ürün tek adettir.',
        action: {
          label: 'Sepete Git',
          onClick: () => navigate('/sepet'),
        },
      });
      return;
    }

    // Giriş yapmış kullanıcı için sepete ekle
    addToCart({
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.images[0],
      condition: product.condition,
      category: product.category,
    });
    toast.success('Ürün sepete eklendi!', {
      description: product.title,
      action: {
        label: 'Sepete Git',
        onClick: () => navigate('/sepet'),
      },
    });
  };

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Misafir kullanıcı kontrolü
    if (!isAuthenticated) {
      setIsFavoriteDialogOpen(true);
      return;
    }

    // Backend'e istek gönder
    await toggleFavorite(product.id);
  };

  const handleImageClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex(index);
    setShowImagePopup(true);
  };

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

  return (
    <div className="relative">
      <Card className={`overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1 duration-300 group ${
        isSold ? 'opacity-80 ring-2 ring-red-500/30' : ''
      }`}>
        <div 
          className={`relative overflow-hidden ${gallery ? 'h-80' : 'h-56'}`}
          onMouseEnter={() => setIsImageHovered(true)}
          onMouseLeave={() => setIsImageHovered(false)}
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
          
          <img
            src={product.images[0]}
            alt={product.title}
            className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-300 ${isSold ? 'grayscale-[50%]' : ''}`}
          />
          
          {/* Durum Badge - Sağ Üst */}
          <Badge className="absolute top-3 right-3 bg-[#f59e0b] text-white border-0 z-10">
            {getConditionLabel(product.condition)}
          </Badge>
          
          {/* STOK DURUMU BADGE - SOL ALT - Sadece Satıldı durumunda göster */}
          {showStockBadge && isSold && (
            <Badge 
              className="absolute bottom-3 left-3 z-10 border-0 shadow-lg px-4 py-2 text-sm bg-red-600 text-white animate-pulse"
            >
              ✖ Satıldı
            </Badge>
          )}
          
          {/* Favori Butonu - Sol Üst */}
          <button
            onClick={handleToggleFavorite}
            onMouseEnter={() => setIsButtonHovered(true)}
            onMouseLeave={() => setIsButtonHovered(false)}
            className="absolute top-3 left-3 w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors z-10 shadow-lg"
          >
            <Heart
              className={`w-5 h-5 transition-all ${isFavoriteProduct ? 'fill-red-500 text-red-500' : 'text-gray-600 hover:text-red-500'}`}
            />
          </button>
        </div>

        <CardContent className="p-4">
          <div className="mb-2">
            <span className="text-xs text-gray-500">{product.category} • {product.brand}</span>
          </div>

          {/* Ürün Başlığı - Tıklanabilir Link - SABİT YÜKSEKLİK */}
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

          {/* Yeni Özellikler: Garanti, Konum, Tarih */}
          <div className="space-y-2 mb-3">
            {product.warranty && (
              <div className="flex items-center gap-2 text-xs text-gray-600" title={`Garanti: ${product.warranty}`}>
                <Shield className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                <span className="truncate">{product.warranty} Garanti</span>
              </div>
            )}
            
            {/* Konum Bilgisi */}
            <div className="flex items-center gap-2 text-xs text-gray-600" title={product.location}>
              <MapPin className="w-3.5 h-3.5 text-[#1e3a8a] flex-shrink-0" />
              <span className="truncate">{product.location}</span>
            </div>
            
            {/* Firmaya Geliş Tarihi */}
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Calendar className="w-3.5 h-3.5 text-[#f97316] flex-shrink-0" />
              <span className="truncate">{product.date}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#1e3a8a]">
                {product.price.toLocaleString('tr-TR')} ₺
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleAddToCart}
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
          </div>
        </CardContent>

        {/* Guest User Dialogs */}
        <GuestUserDialog
          open={isCartDialogOpen}
          onOpenChange={setIsCartDialogOpen}
          action="cart"
        />
        
        <GuestUserDialog
          open={isFavoriteDialogOpen}
          onOpenChange={setIsFavoriteDialogOpen}
          action="favorite"
        />

        {/* Hover Popup - Ana sayfadaki gibi - createPortal ile */}
        {showImagePopup && createPortal(
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
                width: '360px'
              }}
              onMouseEnter={() => setIsImageHovered(true)}
              onMouseLeave={() => {
                setIsImageHovered(false);
                setShowImagePopup(false);
              }}
            >
              <Card className="overflow-hidden shadow-lg border border-gray-200 bg-white">
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
                      <img
                        src={product.images[currentImageIndex]}
                        alt={`${product.title} - Görsel ${currentImageIndex + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </motion.div>
                  </AnimatePresence>

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

                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1.5 rounded-full text-xs">
                    {currentImageIndex + 1} / {product.images.length}
                  </div>
                </div>
              </Card>
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
      </Card>
    </div>
  );
}