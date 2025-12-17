import React, { useState, useEffect } from 'react';
import { Grid, List, Image, SlidersHorizontal, Search, Package, X, Home, ChevronRight } from 'lucide-react@0.487.0';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { Label } from '../components/ui/label';
import { Slider } from '../components/ui/slider';
import ProductCard from '../components/products/ProductCard';
import ProductListItem from '../components/products/ProductListItem';
import { Skeleton } from '../components/ui/skeleton';
import { getProducts, getCategories, getBrands } from '../services/api';
import type { Product } from '../services/api';
import { Link } from 'react-router-dom';
import { getConditionLabel as getConditionLabelHelper, getConditionValue, CONDITION_OPTIONS } from '../utils/conditionHelper';

type ViewMode = 'grid' | 'list' | 'gallery';

export default function ProductsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [brandSearchQuery, setBrandSearchQuery] = useState(''); // Marka arama için yeni state
  const [priceRange, setPriceRange] = useState([0, 100000]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [selectedBrands, setSelectedBrands] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState('date-desc');
  const [showAllBrands, setShowAllBrands] = useState(false); // Marka görüntüleme kontrolü
  
  // API States
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Load categories and brands on mount
  useEffect(() => {
    loadFiltersData();
  }, []);

  // Load products when filters change
  useEffect(() => {
    loadProducts();
  }, [searchQuery, selectedCategory, selectedCondition, selectedBrands, sortBy, priceRange]);

  const loadFiltersData = async () => {
    try {
      const [categoriesRes, brandsRes] = await Promise.all([
        getCategories(),
        getBrands(),
      ]);
      
      setCategories(categoriesRes.categories || []);
      setBrands(brandsRes.brands || []);
    } catch (err: any) {
      console.error('Error loading filters:', err);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const filters: any = {
        limit: 1000,
        offset: 0,
      };
      
      if (selectedCategory !== 'all') {
        const category = categories.find(c => c.slug === selectedCategory);
        if (category) filters.category = category.id;
      }
      
      if (selectedCondition !== 'all') {
        // Türkçe değeri İngilizce'ye çevir (veritabanı formatı)
        filters.condition = getConditionValue(selectedCondition);
      }
      
      if (selectedBrands.length > 0) {
        // Note: API currently doesn't support multiple brands, using first one
        filters.brand = selectedBrands[0];
      }
      
      if (priceRange[0] > 0) filters.minPrice = priceRange[0];
      if (priceRange[1] < 100000) filters.maxPrice = priceRange[1];
      if (searchQuery) filters.search = searchQuery;
      
      const response = await getProducts(filters);
      
      // ✅ Ürün yoksa bile hata gösterme - boş liste döndür
      if (!response.products || response.products.length === 0) {
        console.log('[PRODUCTS] No products found');
        setProducts([]);
        setTotal(0);
        setError(null); // Hata yok - sadece ürün yok
        return;
      }
      
      // Transform API data to frontend format
      const transformedProducts = response.products.map((p: Product) => ({
        id: p.id,
        title: p.title,
        price: p.price,
        image: p.images[0]?.image_url || 'https://via.placeholder.com/400',
        images: p.images.map((img: any) => img.image_url),
        condition: getConditionLabelHelper(p.condition),
        category: p.category?.name || 'Genel',
        brand: p.brand?.name || 'Marka Yok',
        location: p.location || 'Menderes Mah., No:21A, Buca/İzmir',
        date: new Date(p.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
        isFavorite: false, // TODO: Load from favorites
        warranty: p.warranty || null,
        deliveryInfo: 'Ücretsiz Kargo',
        stock: p.status === 'for_sale' ? 'Satışta' : p.status === 'sold' ? 'Satıldı' : 'Depoda',
        status: p.status, // Ürün durumu: for_sale, sold, in_warehouse
        features: p.specifications?.reduce((acc: any, spec: any) => {
          acc[spec.spec_key] = spec.spec_value;
          return acc;
        }, {}) || {},
      }));
      
      // Apply sorting
      const sorted = [...transformedProducts].sort((a, b) => {
        switch (sortBy) {
          case 'date-asc':
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          case 'date-desc':
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          case 'price-asc':
            return a.price - b.price;
          case 'price-desc':
            return b.price - a.price;
          default:
            return 0;
        }
      });
      
      setProducts(sorted);
      setTotal(response.total || sorted.length);
    } catch (err: any) {
      console.error('Error loading products:', err);
      setError('Ürünler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleBrand = (brandId: number) => {
    setSelectedBrands(prev =>
      prev.includes(brandId)
        ? prev.filter(id => id !== brandId)
        : [...prev, brandId]
    );
  };

  // Tüm filtreleri temizle
  const clearAllFilters = () => {
    setSelectedCategory('all');
    setSelectedCondition('all');
    setSelectedBrands([]);
    setPriceRange([0, 100000]);
    setSearchQuery('');
  };

  // Aktif filtre sayısını hesapla
  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedCategory !== 'all') count++;
    if (selectedCondition !== 'all') count++;
    if (selectedBrands.length > 0) count += selectedBrands.length;
    if (priceRange[0] > 0 || priceRange[1] < 100000) count++;
    if (searchQuery) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  const FilterSidebar = () => (
    <div className="space-y-6">
      {/* Kategori */}
      <div>
        <Label className="mb-3 block">Kategori</Label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="category"
              value="all"
              checked={selectedCategory === 'all'}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-4 h-4"
            />
            <span className="text-sm">Tümü</span>
          </label>
          {categories.map((cat) => (
            <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="category"
                value={cat.slug}
                checked={selectedCategory === cat.slug}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-4 h-4"
              />
              <span className="text-sm">{cat.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Fiyat Aralığı */}
      <div>
        <Label className="mb-3 block">Fiyat Aralığı</Label>
        
        {/* Slider */}
        <Slider
          value={priceRange}
          onValueChange={setPriceRange}
          max={100000}
          step={5000}
          className="mb-2"
        />
        <div className="flex justify-between text-sm text-gray-600">
          <span>{priceRange[0].toLocaleString('tr-TR')} ₺</span>
          <span>{priceRange[1].toLocaleString('tr-TR')} ₺</span>
        </div>
      </div>

      {/* Durum */}
      <div>
        <Label className="mb-3 block">Durum</Label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="condition"
              value="all"
              checked={selectedCondition === 'all'}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="w-4 h-4"
            />
            <span className="text-sm">Tümü</span>
          </label>
          {['Sıfır Gibi', 'Az Kullanılmış', 'İyi'].map((cond) => (
            <label key={cond} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="condition"
                value={cond}
                checked={selectedCondition === cond}
                onChange={(e) => setSelectedCondition(e.target.value)}
                className="w-4 h-4"
              />
              <span className="text-sm">{cond}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Marka */}
      <div>
        <Label className="mb-3 block">Marka</Label>
        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <Input
            type="text"
            placeholder="Marka ara..."
            value={brandSearchQuery}
            onChange={(e) => setBrandSearchQuery(e.target.value)}
            className="pl-10 mb-2"
          />
          {(showAllBrands ? brands : brands.slice(0, 5)).filter((brand) =>
            brand.name.toLowerCase().includes(brandSearchQuery.toLowerCase())
          ).map((brand) => (
            <label key={brand.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors">
              <input
                type="checkbox"
                checked={selectedBrands.includes(brand.id)}
                onChange={() => toggleBrand(brand.id)}
                className="w-4 h-4 accent-[#f97316] cursor-pointer"
              />
              <span className="text-sm">{brand.name}</span>
            </label>
          ))}
        </div>
        {brands.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAllBrands(!showAllBrands)}
            className="w-full mt-2 text-[#f97316] hover:text-[#ea580c] hover:bg-orange-50 text-sm"
          >
            {showAllBrands ? (
              <>
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                Daha Az
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Daha Fazla
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 pt-20 pb-4">
      {/* Breadcrumb - İyileştirilmiş */}
      <nav className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200" aria-label="Breadcrumb">
        <Link 
          to="/" 
          className="flex items-center gap-1.5 text-gray-600 hover:text-[#f97316] transition-colors px-2 py-1 rounded-md hover:bg-orange-50"
        >
          <Home className="w-4 h-4" />
          <span className="text-sm">Ana Sayfa</span>
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-sm font-medium text-gray-900 px-2 py-1">Ürünler</span>
        {selectedCategory !== 'all' && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-sm font-medium text-[#f97316] bg-orange-50 px-3 py-1 rounded-md">
              {categories.find(c => c.slug === selectedCategory)?.name}
            </span>
          </>
        )}
      </nav>

      {/* Sayfa Başlığı - İyileştirilmiş */}
      <div className="mb-5">
        <h1 className="text-gray-900 mb-1">
          {selectedCategory === 'all' ? 'Tüm Ürünler' : categories.find(c => c.slug === selectedCategory)?.name}
        </h1>
        <p className="text-gray-600">
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-[#f97316]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Ürünler yükleniyor...
            </span>
          ) : (
            `${products.length} ürün listeleniyor`
          )}
        </p>
      </div>

      {/* Aktif Filtreler */}
      {activeFilterCount > 0 && (
        <div className="mb-5 bg-gradient-to-r from-orange-50 to-blue-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-gray-900">Aktif Filtreler</h3>
              <Badge variant="secondary" className="bg-[#f97316] text-white">
                {activeFilterCount}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-[#f97316] hover:text-[#ea580c] hover:bg-orange-100"
            >
              <X className="w-4 h-4 mr-1" />
              Tümünü Temizle
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {searchQuery && (
              <Badge variant="secondary" className="bg-white border border-gray-300 text-gray-700 px-3 py-1 flex items-center gap-2">
                Arama: {searchQuery}
                <button
                  onClick={() => setSearchQuery('')}
                  className="hover:text-red-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            
            {selectedCategory !== 'all' && (
              <Badge variant="secondary" className="bg-white border border-gray-300 text-gray-700 px-3 py-1 flex items-center gap-2">
                Kategori: {categories.find(c => c.slug === selectedCategory)?.name}
                <button
                  onClick={() => setSelectedCategory('all')}
                  className="hover:text-red-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            
            {selectedCondition !== 'all' && (
              <Badge variant="secondary" className="bg-white border border-gray-300 text-gray-700 px-3 py-1 flex items-center gap-2">
                Durum: {selectedCondition}
                <button
                  onClick={() => setSelectedCondition('all')}
                  className="hover:text-red-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            
            {selectedBrands.map((brandId) => {
              const brand = brands.find(b => b.id === brandId);
              return brand ? (
                <Badge key={brandId} variant="secondary" className="bg-white border border-gray-300 text-gray-700 px-3 py-1 flex items-center gap-2">
                  Marka: {brand.name}
                  <button
                    onClick={() => toggleBrand(brandId)}
                    className="hover:text-red-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ) : null;
            })}
            
            {(priceRange[0] > 0 || priceRange[1] < 100000) && (
              <Badge variant="secondary" className="bg-white border border-gray-300 text-gray-700 px-3 py-1 flex items-center gap-2">
                Fiyat: {priceRange[0].toLocaleString('tr-TR')} ₺ - {priceRange[1].toLocaleString('tr-TR')} ₺
                <button
                  onClick={() => {
                    setPriceRange([0, 100000]);
                  }}
                  className="hover:text-red-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar - Desktop */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <Card>
            <CardContent className="p-6">
              <h3 className="mb-4">Filtreler</h3>
              <FilterSidebar />
            </CardContent>
          </Card>
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          {/* Search & Controls */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Ürün ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Mobile Filter Button */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="lg:hidden">
                    <SlidersHorizontal className="w-4 h-4 mr-2" />
                    Filtreler
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Filtreler</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <FilterSidebar />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Sıralama" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">En Yeni</SelectItem>
                  <SelectItem value="date-asc">En Eski</SelectItem>
                  <SelectItem value="price-asc">Fiyat (Düşükten Yükseğe)</SelectItem>
                  <SelectItem value="price-desc">Fiyat (Yüksekten Düşüğe)</SelectItem>
                </SelectContent>
              </Select>

              {/* View Mode */}
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={viewMode === 'list' ? 'bg-[#1e3a8a]' : ''}
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={viewMode === 'grid' ? 'bg-[#1e3a8a]' : ''}
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'gallery' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('gallery')}
                  className={viewMode === 'gallery' ? 'bg-[#1e3a8a]' : ''}
                >
                  <Image className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-48 w-full mb-4" />
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Package className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="mb-2 text-gray-900">Ürün Bulunamadı</h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                {searchQuery || selectedCategory !== 'all' || selectedCondition !== 'all' || selectedBrands.length > 0
                  ? 'Arama kriterlerinize uygun ürün bulunamadı. Filtreleri temizlemeyi veya değiştirmeyi deneyin.'
                  : 'Henüz hiç ürün eklenmemiş. Yeni ürünler eklendiğinde burada görünecek.'}
              </p>
              
              {/* CTA Butonları */}
              {(searchQuery || selectedCategory !== 'all' || selectedCondition !== 'all' || selectedBrands.length > 0) && (
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={clearAllFilters}
                    className="bg-[#f97316] hover:bg-[#ea580c] text-white"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Tüm Filtreleri Temizle
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedCategory('all');
                      setSelectedCondition('all');
                    }}
                    className="border-[#f97316] text-[#f97316] hover:bg-orange-50"
                  >
                    Tüm Ürünleri Göster
                  </Button>
                </div>
              )}
              
              {!searchQuery && selectedCategory === 'all' && selectedCondition === 'all' && selectedBrands.length === 0 && (
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link to="/">
                    <Button className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white">
                      <Home className="w-4 h-4 mr-2" />
                      Ana Sayfaya Dön
                    </Button>
                  </Link>
                  <Link to="/urun-sat">
                    <Button variant="outline" className="border-[#f97316] text-[#f97316] hover:bg-orange-50">
                      Ürün Satışı Yap
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-4">
              {products.map((product) => (
                <ProductListItem 
                  key={product.id} 
                  product={product} 
                  showStockBadge={true}
                  isSold={product.status === 'sold'}
                />
              ))}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  showStockBadge={true}
                  isSold={product.status === 'sold'}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {products.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  gallery 
                  disablePopup 
                  showStockBadge={true}
                  isSold={product.status === 'sold'}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}