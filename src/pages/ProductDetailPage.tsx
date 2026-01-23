import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getProduct, getSimilarProducts } from '../services/api';
import type { Product as APIProduct } from '../services/api';
import { Skeleton } from '../components/ui/skeleton';
import { getConditionLabel } from '../utils/productHelpers';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ChevronLeft, ChevronRight, ShoppingCart, Heart, Share2, MapPin, Calendar, Check } from 'lucide-react@0.487.0';
import { toast } from 'sonner@2.0.3';
import { useCart } from '../contexts/CartContext';
import { useFavorites } from '../contexts/FavoritesContext';
import GuestUserDialog from '../components/GuestUserDialog';
import { ProductHoverCard } from '../components/ProductHoverCard';
import { AutoCarousel } from '../components/AutoCarousel';

export default function ProductDetailPage() {
  const { id } = useParams();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const navigate = useNavigate();
  const { addToCart, items: cartItems } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();

  // API States
  const [product, setProduct] = useState<APIProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Giriş durumunu kontrol et
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

  // Load product data
  useEffect(() => {
    if (id) {
      loadProductData(id);  // ID'yi doğrudan string olarak kullan
    }
  }, [id]);

  const loadProductData = async (productId: string) => {  // string olarak al
    setLoading(true);
    setError(null);

    console.log('🔍 ProductDetailPage: Loading product with ID:', productId);

    try {
      // Fetch product details
      const productRes = await getProduct(productId);  // string olarak gönder
      console.log('✅ ProductDetailPage: Product loaded:', productRes.product);
      setProduct(productRes.product);

      // Fetch similar products using new smart algorithm
      console.log('🔍 ProductDetailPage: Loading similar products...');
      const similarRes = await getSimilarProducts(productId, 8);
      console.log('✅ ProductDetailPage: Similar products loaded:', similarRes.products.length);
      
      // Transform to ProductHoverCard format
      const transformed = similarRes.products.map(p => ({
        id: p.id,
        title: p.title,
        price: p.price,
        image: p.images?.[0]?.image_url || 'https://via.placeholder.com/400',
        images: p.images?.map(img => img.image_url) || [],
        condition: p.condition,
        category: p.category?.name || 'Kategori',
        warranty: p.warranty,
        deliveryInfo: 'Ücretsiz Kargo',
        isFavorite: false,
        status: p.status,
        isSold: p.status === 'sold',
      }));
      setRelatedProducts(transformed);
    } catch (err: any) {
      console.error('Error loading product:', err);
      setError(err.message || 'Ürün yüklenirken bir hata oluştu');
      toast.error('Ürün yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  // Map API product to display format
  const getProductImages = () => {
    if (!product?.images || product.images.length === 0) {
      // Loading durumunda veya görsel yoksa gri placeholder
      return ['https://via.placeholder.com/1200x800/e5e7eb/6b7280?text=Ürün+Görseli+Yükleniyor...'];
    }
    return product.images.map(img => img.image_url);
  };

  const getProductFeatures = () => {
    const features: Record<string, string> = {};
    
    // 1. Ürünün temel bilgilerini ekle
    if (product?.brand?.name) {
      features['Marka'] = product.brand.name;
    }
    
    if (product?.condition) {
      features['Ürün Durumu'] = getConditionLabel(product.condition);
    }
    
    if (product?.warranty) {
      features['Garanti Durumu'] = product.warranty;
    }
    
    // Konum özelliklerden kaldırıldı - Ayrı section'da gösterilecek
    
    // 2. Veritabanından gelen spec'leri ekle
    if (product?.specifications && product.specifications.length > 0) {
      product.specifications.forEach(spec => {
        const friendlyKey = formatSpecKey(spec.spec_key);
        features[friendlyKey] = spec.spec_value;
      });
    }
    
    // 3. Eğer hiç spec yoksa varsayılan bilgiler ekle
    if (Object.keys(features).length < 5) {
      if (product?.category?.name) {
        features['Kategori'] = product.category.name;
      }
      
      if (product?.subcategory?.name) {
        features['Alt Kategori'] = product.subcategory.name;
      }
      
      if (product?.created_at) {
        features['Firmaya Geliş Tarihi'] = new Date(product.created_at).toLocaleDateString('tr-TR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      }
      
      // Teslimat bilgisi
      features['Teslimat'] = 'Buca içi ücretsiz';
      features['Kurulum'] = 'Buca içi ücretsiz kurulum';
    }
    
    return features;
  };

  // spec_key'leri kullanıcı dostu başlıklara çevir
  const formatSpecKey = (key: string): string => {
    // Önce yaygın spec_key'leri mapping ile çevir
    const keyMappings: Record<string, string> = {
      // Beyaz Eşya
      'energy_class': 'Enerji Sınıfı',
      'energyclass': 'Enerji Sınıfı',
      'energy': 'Enerji Sınıfı',
      'color': 'Renk',
      'colour': 'Renk',
      'capacity': 'Kapasite',
      'warranty': 'Garanti Süresi',
      'garanty': 'Garanti Süresi',
      'brand': 'Marka',
      'model': 'Model',
      'noise_level': 'Gürültü Seviyesi',
      'noiselevel': 'Gürültü Seviyesi',
      'noise': 'Gürültü Seviyesi',
      'freezer_capacity': 'Dondurucu Kapasitesi',
      'fridge_capacity': 'Buzdolabı Kapasitesi',
      'defrost': 'Buz Çözme',
      'no_frost': 'No-Frost',
      'frost_free': 'No-Frost',
      'spin_speed': 'Sıkma Hızı',
      'programs': 'Program Sayısı',
      'program_count': 'Program Sayısı',
      'washing_capacity': 'Yıkama Kapasitesi',
      'drying_capacity': 'Kurutma Kapasitesi',
      'water_consumption': 'Su Tüketimi',
      'annual_energy': 'Yıllık Enerji Tüketimi',
      'temperature': 'Sıcaklık',
      'timer': 'Zamanlayıcı',
      'digital_display': 'Dijital Ekran',
      'display': 'Ekran',
      'door_count': 'Kapı Sayısı',
      'doors': 'Kapı Sayısı',
      
      // Elektronik
      'screen_size': 'Ekran Boyutu',
      'screensize': 'Ekran Boyutu',
      'screen': 'Ekran Boyutu',
      'processor': 'İşlemci',
      'cpu': 'İşlemci',
      'ram': 'RAM',
      'memory': 'RAM',
      'storage': 'Depolama',
      'disk': 'Depolama',
      'harddisk': 'Depolama',
      'hard_disk': 'Depolama',
      'ssd': 'SSD',
      'hdd': 'HDD',
      'gpu': 'Ekran Kartı',
      'graphics': 'Ekran Kartı',
      'graphics_card': 'Ekran Kartı',
      'graphicscard': 'Ekran Kartı',
      'operating_system': 'İşletim Sistemi',
      'operatingsystem': 'İşletim Sistemi',
      'os': 'İşletim Sistemi',
      'resolution': 'Çözünürlük',
      'refresh_rate': 'Yenileme Hızı',
      'refreshrate': 'Yenileme Hızı',
      'panel_type': 'Panel Tipi',
      'panel': 'Panel Tipi',
      'response_time': 'Tepki Süresi',
      'contrast': 'Kontrast',
      'brightness': 'Parlaklık',
      'hdr': 'HDR Desteği',
      'smart_tv': 'Akıllı TV',
      'smart': 'Akıllı Özellikler',
      'battery': 'Pil Ömrü',
      'battery_life': 'Pil Ömrü',
      'batterylife': 'Pil Ömrü',
      'battery_capacity': 'Pil Kapasitesi',
      'camera': 'Kamera',
      'front_camera': 'Ön Kamera',
      'rear_camera': 'Arka Kamera',
      'back_camera': 'Arka Kamera',
      'megapixels': 'Megapiksel',
      'mp': 'Megapiksel',
      'connectivity': 'Bağlantı',
      'connection': 'Bağlantı',
      'wifi': 'Wi-Fi',
      'wireless': 'Kablosuz',
      'bluetooth': 'Bluetooth',
      'nfc': 'NFC',
      'ports': 'Portlar',
      'hdmi': 'HDMI',
      'usb': 'USB',
      'thunderbolt': 'Thunderbolt',
      'audio_jack': 'Kulaklık Girişi',
      'sim': 'SIM Kart',
      'dual_sim': 'Çift SIM',
      'network': 'Ağ',
      '5g': '5G Desteği',
      '4g': '4G Desteği',
      'lte': 'LTE',
      
      // Mobilya
      'material': 'Malzeme',
      'materials': 'Malzeme',
      'fabric': 'Kumaş',
      'wood': 'Ahşap',
      'wood_type': 'Ahşap Türü',
      'leather': 'Deri',
      'metal': 'Metal',
      'dimensions': 'Boyutlar',
      'dimension': 'Boyutlar',
      'size': 'Boyut',
      'width': 'Genişlik',
      'height': 'Yükseklik',
      'depth': 'Derinlik',
      'length': 'Uzunluk',
      'weight': 'Ağırlık',
      'max_weight': 'Maksimum Ağırlık',
      'load_capacity': 'Yük Kapasitesi',
      'assembly': 'Montaj',
      'assembly_required': 'Montaj Gerekli mi',
      'style': 'Stil',
      'design': 'Tasarım',
      'finish': 'Kaplama',
      'coating': 'Kaplama',
      'seating_capacity': 'Oturma Kapasitesi',
      'seats': 'Kişilik',
      'drawer_count': 'Çekmece Sayısı',
      'drawers': 'Çekmece Sayısı',
      'shelf_count': 'Raf Sayısı',
      'shelves': 'Raf Sayısı',
      'adjustable': 'Ayarlanabilir',
      'foldable': 'Katlanabilir',
      'extendable': 'Uzatılabilir',
      'storage_space': 'Depolama Alanı',
      'legs': 'Ayak Sayısı',
      'leg_material': 'Ayak Malzemesi',
      
      // Genel
      'condition': 'Durum',
      'year': 'Üretim Yılı',
      'manufacturing_year': 'Üretim Yılı',
      'manufacture_year': 'Üretim Yılı',
      'production_year': 'Üretim Yılı',
      'age': 'Yaş',
      'location': 'Konum',
      'price': 'Fiyat',
      'stock': 'Stok',
      'availability': 'Müsaitlik',
      'available': 'Müsaitlik',
      'delivery': 'Teslimat',
      'delivery_time': 'Teslimat Süresi',
      'shipping': 'Kargo',
      'description': 'Açıklama',
      'features': 'Özellikler',
      'accessories': 'Aksesuarlar',
      'included': 'Kutuda Neler Var',
      'package_contents': 'Kutu İçeriği',
      'box_contents': 'Kutu İçeriği',
      'power': 'Güç',
      'power_consumption': 'Güç Tüketimi',
      'voltage': 'Voltaj',
      'wattage': 'Watt',
      'watts': 'Watt',
      'efficiency': 'Verimlilik',
      'certification': 'Sertifika',
      'certificates': 'Sertifikalar',
      'guarantee': 'Garanti',
      'origin': 'Menşei',
      'made_in': 'Üretim Yeri',
      'country': 'Ülke',
      'manufacturer': 'Üretici',
      'serial_number': 'Seri Numarası',
      'serial': 'Seri No',
      'barcode': 'Barkod',
      'sku': 'Stok Kodu',
      'product_code': 'Ürün Kodu',
      'item_number': 'Ürün Numarası',
      
      // Ekstra
      'type': 'Tip',
      'category': 'Kategori',
      'subcategory': 'Alt Kategori',
      'version': 'Versiyon',
      'generation': 'Nesil',
      'series': 'Seri',
      'line': 'Hat',
      'collection': 'Koleksiyon',
      'compatible': 'Uyumlu',
      'compatibility': 'Uyumluluk',
      'supported': 'Desteklenen',
      'input': 'Giriş',
      'output': 'Çıkış',
      'interface': 'Arayüz',
      'format': 'Format',
      'speed': 'Hız',
      'rate': 'Oran',
      'frequency': 'Frekans',
      'channels': 'Kanal',
      'band': 'Bant',
      'range': 'Menzil',
      'coverage': 'Kapsama',
      'quality': 'Kalite',
      'grade': 'Kalite Derecesi',
      'level': 'Seviye',
      'mode': 'Mod',
      'settings': 'Ayarlar',
      'options': 'Seçenekler',
      'extras': 'Ekstralar',
      'special_features': 'Özel Özellikler',
      'highlights': 'Öne Çıkanlar',
      'advantages': 'Avantajlar',
      'benefits': 'Faydalar',
      'usage': 'Kullanım',
      'application': 'Uygulama Alanı',
      'suitable_for': 'Uygun Olduğu Alan',
      'recommended_for': 'Tavsiye Edilen'
    };

    // Eğer mapping varsa onu kullan (case-insensitive)
    const lowerKey = key.toLowerCase().trim().replace(/\s+/g, '_');
    if (keyMappings[lowerKey]) {
      return keyMappings[lowerKey];
    }

    // Yoksa key'i formatla: snake_case -> Title Case (Türkçe karakterlerle)
    return key
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => {
        // İlk harfi büyük yap
        const firstChar = word.charAt(0).toUpperCase();
        const restChars = word.slice(1).toLowerCase();
        return firstChar + restChars;
      })
      .join(' ');
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % (product?.images.length || 1));
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + (product?.images.length || 1)) % (product?.images.length || 1));
  };

  const handleAddToCart = () => {
    // Giriş kontrolü - giriş yapmamışsa yönlendir
    if (!isAuthenticated) {
      toast.error('Sepete ürün eklemek için giriş yapmalısınız', {
        action: {
          label: 'Giriş Yap',
          onClick: () => navigate('/giris', { state: { from: location.pathname } }),
        },
      });
      return;
    }

    // İkinci el ürün - zaten sepette mi kontrol et
    const isInCart = cartItems.some(item => item.id === product?.id);
    if (isInCart) {
      toast.warning('Bu ürün zaten sepetinizde!', {
        description: 'İkinci el ürünler tek adettir.',
        action: {
          label: 'Sepete Git',
          onClick: () => navigate('/sepet'),
        },
      });
      return;
    }

    // Giriş yapmış kullanıcı için sepete ekle
    if (product) {
      const productImages = product.images.map(img => img.image_url);
      addToCart({
        id: product.id,
        title: product.title,
        price: product.price,
        image: productImages[0],
        condition: product.condition,
        category: product.category.name,
      });
      toast.success('Ürün sepete eklendi!', {
        description: product.title,
        action: {
          label: 'Sepete Git',
          onClick: () => navigate('/sepet'),
        },
      });
    }
  };

  const handleToggleFavorite = () => {
    if (!product) return;
    
    // Ürün ID kontrolü
    const productId = product.id;
    if (!productId) return;

    // Kullanıcı giriş kontrolü - useFavorites context içinde yapılıyor
    toggleFavorite(productId);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 text-sm text-gray-600">
          <Link to="/" className="hover:text-[#1e3a8a]">Ana Sayfa</Link>
          {' > '}
          <Link to="/urunler" className="hover:text-[#1e3a8a]">Ürünler</Link>
          {' > '}
          <Link to={`/urunler?category=${product?.category?.slug || ''}`} className="hover:text-[#1e3a8a]">{product?.category?.name || 'Kategori'}</Link>
          {' > '}
          <span className="text-gray-900">{product?.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Images */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden mb-4">
              <div className="relative bg-gray-100">
                {/* SATILDI WATERMARK - BÜYÜK VE BELİRGİN */}
                {product?.status === 'sold' && (
                  <>
                    {/* Koyu overlay */}
                    <div className="absolute inset-0 bg-gray-900/50 z-10"></div>
                    
                    {/* BÜYÜK "SATILDI" YAZISI - ORTADA */}
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="bg-red-600 text-white px-16 py-8 rounded-2xl transform -rotate-12 shadow-2xl border-8 border-white">
                        <span className="text-6xl" style={{ fontWeight: 900, letterSpacing: '4px' }}>SATILDI</span>
                      </div>
                    </div>
                  </>
                )}
                
                <img
                  src={getProductImages()[currentImageIndex]}
                  alt={product?.title}
                  className={`w-full h-96 lg:h-[600px] object-contain ${product?.status === 'sold' ? 'grayscale-[60%]' : ''}`}
                />
                
                <Badge className={`absolute top-4 right-4 border-0 z-10 ${
                  product?.status === 'sold' ? 'bg-red-600 text-white' : 'bg-[#f59e0b] text-white'
                }`}>
                  {product?.status === 'sold' ? '✖ SATILDI' : getConditionLabel(product?.condition || '')}
                </Badge>
                
                {/* Navigation Arrows */}
                {getProductImages().length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center transition-colors"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center transition-colors"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}
              </div>
            </Card>

            {/* Thumbnail Gallery */}
            <div className="grid grid-cols-5 gap-2">
              {getProductImages().map((image, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentImageIndex
                      ? 'border-[#1e3a8a] ring-2 ring-[#1e3a8a]/20'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product?.title} - ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>

            {/* Description */}
            <Card className="mt-6">
              <CardContent className="p-6">
                <h3 className="mb-4">Açıklama</h3>
                <p className="text-gray-700 whitespace-pre-line">{product?.description}</p>
              </CardContent>
            </Card>

            {/* Features - GÜZELLEŞTİRİLDİ */}
            <Card className="mt-6 border-2 border-[#1e3a8a]/10">
              <CardContent className="p-8">
                {/* BAŞLIK - DAHA BÜYÜK VE VURGULU */}
                <div className="mb-6 pb-4 border-b-2 border-[#1e3a8a]/20">
                  <h2 className="text-3xl text-[#1e3a8a]" style={{ fontWeight: 700 }}>
                    Ürün Detayları
                  </h2>
                  <p className="text-gray-500 mt-2">Teknik özellikler ve ürün bilgileri</p>
                </div>
                
                {/* ÖZELLİKLER - VURGULU VE MODERN */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(getProductFeatures()).map(([key, value]) => (
                    <div 
                      key={key} 
                      className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-[#1e3a8a]/30 hover:shadow-md transition-all"
                    >
                      <Check className="w-5 h-5 text-white bg-green-500 rounded-full p-1 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="text-sm text-gray-500 block mb-1">{key}</span>
                        <span className="text-[#1e3a8a]" style={{ fontWeight: 600 }}>{value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Info & Actions - ÜST HİZALAMA DÜZELTİLDİ */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardContent className="p-6">
                {/* ÜRÜN BAŞLIĞI - KÜÇÜLTÜLDÜ */}
                <h1 className="mb-4">{product?.title}</h1>
                
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="outline">{product?.category?.name || 'Kategori'}</Badge>
                  <Badge variant="outline">{product?.brand?.name || 'Marka'}</Badge>
                </div>

                {/* FİYAT - KÜÇÜLTÜLDÜ */}
                <div className="bg-[#f0f9ff] p-4 rounded-lg mb-4">
                  <div className="text-2xl text-[#1e3a8a] mb-1" style={{ fontWeight: 700 }}>
                    {product?.price.toLocaleString('tr-TR')} ₺
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="text-xs text-gray-500 ml-1">(KDV Dahil)</span>
                  </div>
                </div>

                {/* STOK BİLGİSİ KALDIRILDI - İkinci el ürünlerde her ürün tekil */}

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4 text-[#1e3a8a]" />
                    <div className="text-sm">
                      <span className="font-medium">Mağaza Konumu:</span>{' '}
                      <a 
                        href="https://www.google.com/maps/search/?api=1&query=Ersin+Spot+Buca+İzmir"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#1e3a8a] hover:text-[#f97316] underline cursor-pointer transition-colors font-medium"
                      >
                        Buca, İzmir
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4 text-[#f97316]" />
                    <div className="text-sm">
                      <span className="font-medium">Firmaya Geliş Tarihi:</span>{' '}
                      <span>{product?.created_at ? formatDate(product.created_at) : '-'}</span>
                    </div>
                  </div>
                </div>

                {/* İNCE VE HAFIF SEPARATOR */}
                <div className="my-6 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>

                {/* SATILDI UYARISI - KIRMIZI BÜYÜK KUTU */}
                {product?.status === 'sold' && (
                  <div className="mb-4 bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-500 p-4 rounded-xl shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
                        <span className="text-white text-2xl">✖</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-red-800 mb-1" style={{ fontWeight: 700 }}>Bu Ürün Satıldı</h4>
                        <p className="text-sm text-red-700">
                          Bu ürün daha önce satılmıştır. Benzer ürünlerimize göz atabilirsiniz.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <Button
                    size="lg"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleAddToCart}
                    disabled={product?.status === 'sold'}
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    {product?.status === 'sold' ? 'Ürün Satıldı' : 'Sepete Ekle'}
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleToggleFavorite}
                    disabled={product?.status === 'sold'}
                  >
                    <Heart className={`w-5 h-5 mr-2 ${product && isFavorite(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
                    {product?.status === 'sold' ? 'Ürün Satıldı' : (product && isFavorite(product.id) ? 'Favorilerden Çıkar' : 'Favorilere Ekle')}
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full border border-gray-300 hover:border-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white transition-all"
                  >
                    <Share2 className="w-5 h-5 mr-2" />
                    Paylaş
                  </Button>
                </div>

                {/* Teslimat Bilgisi - SADECE SATILMAMIŞSA GÖSTER */}
                {!product?.status === 'sold' && (
                  <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800 mb-1">Ücretsiz Teslimat</h4>
                        <p className="text-sm text-gray-600">
                          <strong>Buca içi</strong> teslimat ve kurulum ücretsizdir!
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Buca dışı ilçeler için ek ücret uygulanır.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Related Products - CAROUSEL İLE GÜZELLEŞTİRİLDİ */}
        <div className="mt-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="mb-1">Benzer Ürünler</h2>
              <p className="text-gray-500">Size özel seçtiğimiz benzer ürünler</p>
            </div>
            {product?.category?.slug && (
              <Link to={`/urunler?category=${product.category.slug}`}>
                <Button variant="outline" className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white">
                  Tümünü Gör
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            )}
          </div>
          
          {relatedProducts.length > 0 ? (
            <>
              {/* CAROUSEL - Desktop 3, Tablet 2, Mobile 1 - ANA SAYFA STİLİ */}
              <div className="hidden lg:block">
                <AutoCarousel interval={3000} itemsPerView={3}>
                  {relatedProducts.map((relatedProduct) => (
                    <ProductHoverCard 
                      key={relatedProduct.id}
                      product={relatedProduct}
                      showStockBadge={true}
                      isSold={relatedProduct.isSold}
                    />
                  ))}
                </AutoCarousel>
              </div>

              {/* Tablet - 2 items */}
              <div className="hidden md:block lg:hidden">
                <AutoCarousel interval={3000} itemsPerView={2}>
                  {relatedProducts.map((relatedProduct) => (
                    <ProductHoverCard 
                      key={relatedProduct.id}
                      product={relatedProduct}
                      showStockBadge={true}
                      isSold={relatedProduct.isSold}
                    />
                  ))}
                </AutoCarousel>
              </div>

              {/* Mobile - 1 item */}
              <div className="block md:hidden">
                <AutoCarousel interval={3000} itemsPerView={1}>
                  {relatedProducts.map((relatedProduct) => (
                    <ProductHoverCard 
                      key={relatedProduct.id}
                      product={relatedProduct}
                      showStockBadge={true}
                      isSold={relatedProduct.isSold}
                    />
                  ))}
                </AutoCarousel>
              </div>
            </>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Şu anda benzer ürün bulunmamaktadır.</p>
              <Link to="/urunler">
                <Button className="mt-4 bg-[#f97316] hover:bg-[#ea580c]">
                  Tüm Ürünleri Görüntüle
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}