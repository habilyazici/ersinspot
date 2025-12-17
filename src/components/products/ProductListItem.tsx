import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart, MapPin, Calendar, Shield, Truck, ChevronLeft, ChevronRight } from 'lucide-react@0.487.0';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  features?: Record<string, string>;
}

interface ProductListItemProps {
  product: Product;
  showStockBadge?: boolean; // Stok durumu badge'ini göster/gizle
  isSold?: boolean; // Ürün satıldı mı?
}

export default function ProductListItem({ product, showStockBadge = false, isSold = false }: ProductListItemProps) {
  const [isCartDialogOpen, setIsCartDialogOpen] = useState(false);
  const [isFavoriteDialogOpen, setIsFavoriteDialogOpen] = useState(false);
  const [showImagePopup, setShowImagePopup] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageHovered, setIsImageHovered] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const { addToCart } = useCart();
  const { isFavorite: isInFavorites, toggleFavorite } = useFavorites();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Favoride mi kontrol et
  const isFavorite = isInFavorites(product.id);

  // Mouse pozisyonunu takip et ve popup pozisyonunu hesapla
  useEffect(() => {
    if (isImageHovered && imageRef.current) {
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
  }, [isImageHovered]);

  // 400ms hover sonrası popup aç
  useEffect(() => {
    if (isImageHovered) {
      hoverTimerRef.current = setTimeout(() => {
        setShowImagePopup(true);
      }, 400);
    } else {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
      setShowImagePopup(false);
      setCurrentImageIndex(0);
    }

    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, [isImageHovered]);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Misafir kullanıcı kontrolü
    if (!isAuthenticated) {
      setIsCartDialogOpen(true);
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

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Misafir kullanıcı kontrolü
    if (!isAuthenticated) {
      setIsFavoriteDialogOpen(true);
      return;
    }

    // Giriş yapmış kullanıcı için favorilere ekle/çıkar
    toggleFavorite(product);
    toast.success(isFavorite ? 'Favorilerden çıkarıldı' : 'Favorilere eklendi', {
      description: product.title,
    });
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
      <Card className={`overflow-hidden hover:shadow-lg transition-shadow ${
        isSold ? 'opacity-80 ring-2 ring-red-500/30' : ''
      }`}>
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Image */}
            <div 
              className="relative w-full sm:w-64 h-48 flex-shrink-0 cursor-pointer"
              onClick={(e) => handleImageClick(e, 0)}
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
                    <div className="bg-red-600 text-white px-6 py-3 rounded-lg transform -rotate-12 shadow-2xl border-4 border-white">
                      <span className="text-xl" style={{ fontWeight: 900, letterSpacing: '2px' }}>SATILDI</span>
                    </div>
                  </div>
                </>
              )}
              
              <img
                src={product.images[0]}
                alt={product.title}
                className={`w-full h-full object-cover ${isSold ? 'grayscale-[50%]' : ''}`}
              />
              
              {/* Durum Badge - Sağ Üst */}
              <Badge className="absolute top-3 right-3 bg-[#f59e0b] text-white border-0 z-10">
                {getConditionLabel(product.condition)}
              </Badge>
              
              {/* STOK DURUMU BADGE - SOL ALT - Sadece Satıldı durumunda göster */}
              {showStockBadge && isSold && (
                <Badge 
                  className="absolute bottom-3 left-3 z-10 border-0 shadow-lg px-3 py-1.5 text-xs bg-red-600 text-white animate-pulse"
                >
                  ✖ Satıldı
                </Badge>
              )}
              
              {/* Favori Butonu - Sol Üst */}
              <button
                onClick={handleToggleFavorite}
                className="absolute top-3 left-3 w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors z-10"
              >
                <Heart
                  className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
                />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <span className="text-xs text-gray-500 block mb-1">
                      {product.category} • {product.brand}
                    </span>
                    {/* Ürün Başlığı - Tooltip ile */}
                    <div className="relative group/title">
                      <h3 className="transition-colors line-clamp-2 cursor-default hover:text-[#f97316]" title={product.title}>
                        {product.title}
                      </h3>
                      {/* Tooltip - Üzerine gelince tam başlık */}
                      <div className="invisible group-hover/title:visible absolute left-0 bottom-full bg-gray-900 text-white px-3 py-2 text-sm rounded-lg mb-1 z-[60] shadow-2xl whitespace-normal max-w-xs pointer-events-auto">
                        {product.title}
                        <div className="absolute -bottom-1 left-4 w-2 h-2 bg-gray-900 rotate-45"></div>
                      </div>
                    </div>
                  </div>
                  <span className="text-[#1e3a8a] ml-4">
                    {product.price.toLocaleString('tr-TR')} ₺
                  </span>
                </div>

                {/* Features */}
                {product.features && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {Object.entries(product.features).slice(0, 3).map(([key, value]) => (
                      <Badge key={key} variant="outline" className="text-xs">
                        {value}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{product.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{product.date}</span>
                  </div>
                  {product.warranty && (
                    <div className="flex items-center gap-1">
                      <Shield className="w-4 h-4" />
                      <span>{product.warranty}</span>
                    </div>
                  )}
                  {/* STOK BİLGİSİ KALDIRILDI - Her ürün tekil olduğu için stok takibi yok */}
                </div>
              </div>

              <div className="flex gap-2 mt-4">
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