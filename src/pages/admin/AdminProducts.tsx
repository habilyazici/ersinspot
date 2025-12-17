import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Eye, ArrowLeft, Upload, X, Package, FileText, Info, ChevronLeft, ChevronRight, MapPin, Calendar, ShoppingCart, Heart, Share2, Check, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, Banknote, ChevronDown } from 'lucide-react@0.487.0';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import {
  AdminDialog as Dialog,
  AdminDialogContent as DialogContent,
  AdminDialogDescription as DialogDescription,
  AdminDialogHeader as DialogHeader,
  AdminDialogTitle as DialogTitle,
  AdminDialogTrigger as DialogTrigger,
} from '../../components/ui/admin-dialog';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { toast } from 'sonner@2.0.3';
import { getProducts, getCategories, getBrands, createProduct, updateProduct, deleteProduct } from '../../services/api';
import { getConditionLabel, CONDITION_OPTIONS } from '../../utils/conditionHelper';
import { getStatusLabel, STATUS_OPTIONS } from '../../utils/statusHelper';
import { projectId } from '../../utils/supabase/info';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminProducts() {
  const { accessToken } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [newProduct, setNewProduct] = useState({
    title: '',
    price: '',
    category: '',
    brand: '',
    condition: '',
    description: '',
    status: 'in_storage',
    specifications: {} as Record<string, string>,
  });
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [currentLimit, setCurrentLimit] = useState(15);
  const [totalProducts, setTotalProducts] = useState(0);
  const [newSpecKey, setNewSpecKey] = useState('');
  const [newSpecValue, setNewSpecValue] = useState('');
  const [showNewSpecForm, setShowNewSpecForm] = useState(false);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [editUploadingImages, setEditUploadingImages] = useState<File[]>([]);
  const [productStats, setProductStats] = useState({
    total: 0,
    for_sale: 0,
    in_storage: 0,
    sold: 0
  });

  // Load data on mount
  useEffect(() => {
    if (accessToken) {
      loadProducts();
      loadCategories();
      loadBrands();
      loadProductStats();
    }
  }, [accessToken]);

  const loadProductStats = async () => {
    try {
      console.log('[AdminProducts] 📡 Fetching all products for stats...');
      
      // Tüm ürünleri çek (limit olmadan, sadece sayı için)
      const result = await getProducts({ limit: 10000, showAll: true } as any);
      const allProducts = result.products || [];
      
      console.log('[AdminProducts] 📊 Total products from API:', allProducts.length);
      
      // Status'lere göre say
      const forSale = allProducts.filter((p: any) => 
        p.status === 'for_sale' || p.status === 'available' || p.status === 'active'
      ).length;
      
      const inStorage = allProducts.filter((p: any) => 
        p.status === 'in_storage' || p.status === 'stock'
      ).length;
      
      const sold = allProducts.filter((p: any) => 
        p.status === 'sold'
      ).length;
      
      setProductStats({
        total: allProducts.length,
        for_sale: forSale,
        in_storage: inStorage,
        sold: sold
      });
      
      console.log('[AdminProducts] 📊 İstatistikler hesaplandı:', {
        total: allProducts.length,
        for_sale: forSale,
        in_storage: inStorage,
        sold: sold
      });
    } catch (error) {
      console.error('[AdminProducts] ❌ İstatistik hatası:', error);
    }
  };

  const loadProducts = async (limit?: number) => {
    try {
      setLoading(true);
      console.log('[AdminProducts] 🔄 Ürünler yükleniyor...');
      const result = await getProducts({ limit: limit || currentLimit, showAll: true } as any);
      console.log('[AdminProducts] ✅ Ürünler yüklendi:', result.products?.length, 'Total:', result.total);
      console.log('[AdminProducts] Status breakdown:', {
        for_sale: result.products?.filter((p: any) => p.status === 'for_sale').length,
        in_storage: result.products?.filter((p: any) => p.status === 'in_storage').length,
        sold: result.products?.filter((p: any) => p.status === 'sold').length,
      });
      setProducts(result.products || []);
      setTotalProducts(result.total || 0);
    } catch (error: any) {
      console.error('[AdminProducts] ❌ Hata:', error);
      console.error('[AdminProducts] ❌ Error message:', error.message);
      toast.error('Ürünler yüklenemedi: ' + (error.message || 'Bilinmeyen hata'));
    } finally {
      setLoading(false);
    }
  };

  const loadMoreProducts = () => {
    const newLimit = currentLimit + 15;
    setCurrentLimit(newLimit);
    loadProducts(newLimit);
  };

  const loadCategories = async () => {
    try {
      const result = await getCategories();
      setCategories(result.categories || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadBrands = async () => {
    try {
      const result = await getBrands();
      setBrands(result.brands || []);
    } catch (error) {
      console.error('Error loading brands:', error);
    }
  };

  // Durum (Condition) mapping artık utils/conditionHelper.ts'den geliyor

  // Alt kategori tanımları (hardcoded - backend'den gelebilir)
  const subcategoryOptions: Record<string, Record<string, string>> = {
    '1': { // Beyaz Eşya
      'buzdolabi': 'Buzdolabı',
      'camasir-makinesi': 'Çamaşır Makinesi',
      'bulasik-makinesi': 'Bulaşık Makinesi',
      'firin': 'Fırın',
      'mikrodalga': 'Mikrodalga',
    },
    '2': { // Elektronik
      'televizyon': 'Televizyon',
      'laptop': 'Laptop',
      'telefon': 'Telefon',
      'tablet': 'Tablet',
    },
    '3': { // Mobilya
      'koltuk': 'Koltuk Takımı',
      'yatak': 'Yatak',
      'dolap': 'Dolap',
      'masa': 'Masa',
      'sandalye': 'Sandalye',
    },
  };

  // Alt kategoriye göre özellik alanları
  const getSpecificationFields = (subcategory: string) => {
    const specs: Record<string, Array<{ key: string; label: string; type: string; options?: string[] }>> = {
      'buzdolabi': [
        { key: 'model', label: 'Model', type: 'text' },
        { key: 'kapasite', label: 'Kapasite', type: 'text' },
        { key: 'enerji_sinifi', label: 'Enerji Sınıfı', type: 'select', options: ['A+++', 'A++', 'A+', 'A', 'B', 'C', 'D'] },
        { key: 'no_frost', label: 'No-Frost', type: 'select', options: ['Var', 'Yok'] },
        { key: 'renk', label: 'Renk', type: 'text' },
      ],
      'camasir-makinesi': [
        { key: 'model', label: 'Model', type: 'text' },
        { key: 'kapasite', label: 'Kapasite', type: 'text' },
        { key: 'devir', label: 'Sıkma Hızı (Devir)', type: 'text' },
        { key: 'enerji_sinifi', label: 'Enerji Sınıfı', type: 'select', options: ['A+++', 'A++', 'A+', 'A', 'B', 'C', 'D'] },
        { key: 'renk', label: 'Renk', type: 'text' },
      ],
      'bulasik-makinesi': [
        { key: 'model', label: 'Model', type: 'text' },
        { key: 'kapasite', label: 'Kapasite (Kişi)', type: 'text' },
        { key: 'enerji_sinifi', label: 'Enerji Sınıfı', type: 'select', options: ['A+++', 'A++', 'A+', 'A', 'B', 'C', 'D'] },
        { key: 'renk', label: 'Renk', type: 'text' },
      ],
      'firin': [
        { key: 'model', label: 'Model', type: 'text' },
        { key: 'hacim', label: 'Hacim (Litre)', type: 'text' },
        { key: 'enerji_sinifi', label: 'Enerji Sınıfı', type: 'select', options: ['A+++', 'A++', 'A+', 'A', 'B', 'C', 'D'] },
        { key: 'renk', label: 'Renk', type: 'text' },
      ],
      'mikrodalga': [
        { key: 'model', label: 'Model', type: 'text' },
        { key: 'hacim', label: 'Hacim (Litre)', type: 'text' },
        { key: 'guc', label: 'Güç (Watt)', type: 'text' },
        { key: 'renk', label: 'Renk', type: 'text' },
      ],
      'televizyon': [
        { key: 'model', label: 'Model', type: 'text' },
        { key: 'ekran_boyutu', label: 'Ekran Boyutu', type: 'text' },
        { key: 'cozunurluk', label: 'Çözünürlük', type: 'select', options: ['4K Ultra HD', 'Full HD', 'HD'] },
        { key: 'smart_tv', label: 'Smart TV', type: 'select', options: ['Evet', 'Hayır'] },
      ],
      'laptop': [
        { key: 'model', label: 'Model', type: 'text' },
        { key: 'islemci', label: 'İşlemci', type: 'text' },
        { key: 'ram', label: 'RAM', type: 'text' },
        { key: 'depolama', label: 'Depolama', type: 'text' },
        { key: 'ekran_boyutu', label: 'Ekran Boyutu', type: 'text' },
      ],
      'telefon': [
        { key: 'model', label: 'Model', type: 'text' },
        { key: 'islemci', label: 'İşlemci', type: 'text' },
        { key: 'ram', label: 'RAM', type: 'text' },
        { key: 'depolama', label: 'Depolama', type: 'text' },
        { key: 'ekran_boyutu', label: 'Ekran Boyutu', type: 'text' },
        { key: 'renk', label: 'Renk', type: 'text' },
      ],
      'tablet': [
        { key: 'model', label: 'Model', type: 'text' },
        { key: 'islemci', label: 'İşlemci', type: 'text' },
        { key: 'ram', label: 'RAM', type: 'text' },
        { key: 'depolama', label: 'Depolama', type: 'text' },
        { key: 'ekran_boyutu', label: 'Ekran Boyutu', type: 'text' },
      ],
      'koltuk': [
        { key: 'model', label: 'Model', type: 'text' },
        { key: 'kisi_sayisi', label: 'Kişi Sayısı', type: 'text' },
        { key: 'malzeme', label: 'Malzeme', type: 'select', options: ['Kadife', 'Deri', 'Kumaş'] },
        { key: 'renk', label: 'Renk', type: 'text' },
      ],
      'yatak': [
        { key: 'model', label: 'Model', type: 'text' },
        { key: 'boyut', label: 'Boyut', type: 'select', options: ['90x190 (Tek Kişilik)', '140x200', '160x200 (Çift Kişilik)', '180x200 (King Size)'] },
        { key: 'malzeme', label: 'Malzeme', type: 'select', options: ['Visco', 'Yaylı', 'Lateks', 'Ortopedik'] },
      ],
      'dolap': [
        { key: 'model', label: 'Model', type: 'text' },
        { key: 'kapak_sayisi', label: 'Kapak Sayısı', type: 'text' },
        { key: 'malzeme', label: 'Malzeme', type: 'select', options: ['MDF', 'Masif Ahşap', 'Sunta'] },
        { key: 'renk', label: 'Renk', type: 'text' },
      ],
      'masa': [
        { key: 'model', label: 'Model', type: 'text' },
        { key: 'tip', label: 'Tip', type: 'select', options: ['Yemek Masası', 'Çalışma Masası', 'Sehpa'] },
        { key: 'malzeme', label: 'Malzeme', type: 'select', options: ['Ahşap', 'Cam', 'MDF', 'Metal'] },
        { key: 'renk', label: 'Renk', type: 'text' },
      ],
      'sandalye': [
        { key: 'model', label: 'Model', type: 'text' },
        { key: 'tip', label: 'Tip', type: 'select', options: ['Yemek Sandalyesi', 'Ofis Sandalyesi', 'Ahşap Sandalye'] },
        { key: 'malzeme', label: 'Malzeme', type: 'select', options: ['Ahşap', 'Metal', 'Plastik', 'Kumaş Döşemeli'] },
        { key: 'renk', label: 'Renk', type: 'text' },
      ],
    };
    return specs[subcategory] || [];
  };

  const handleSpecificationChange = (key: string, value: string) => {
    setNewProduct(prev => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [key]: value
      }
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedImages((prev) => [...prev, ...files].slice(0, 15));
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Dosyaları Supabase Storage'a yükle
  const uploadImagesToStorage = async (files: File[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    const toastId = toast.loading(`Fotoğraflar yükleniyor... (0/${files.length})`);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/upload-image`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
            body: formData,
          }
        );
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Fotoğraf ${i + 1} yüklenemedi`);
        }
        
        const data = await response.json();
        uploadedUrls.push(data.url);
        
        toast.loading(`Fotoğraflar yükleniyor... (${i + 1}/${files.length})`, { id: toastId });
      }
      
      toast.dismiss(toastId);
      toast.success(`✅ ${files.length} fotoğraf başarıyla yüklendi!`);
      return uploadedUrls;
    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error('Fotoğraf yükleme hatası: ' + error.message);
      throw error;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      for_sale: { label: 'Satışta', className: 'bg-green-100 text-green-700 border-green-300' },
      in_storage: { label: 'Depoda', className: 'bg-blue-100 text-blue-700 border-blue-300' },
      sold: { label: 'Satıldı', className: 'bg-gray-100 text-gray-700 border-gray-300' },
      // Eski değerleri de destekle (geriye dönük uyumluluk)
      available: { label: 'Satışta', className: 'bg-green-100 text-green-700 border-green-300' },
      active: { label: 'Satışta', className: 'bg-green-100 text-green-700 border-green-300' },
    };
    const config = statusConfig[status?.toLowerCase()] || statusConfig['in_storage'];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  // Satış durumuna göre satır arka plan rengi
  const getRowBackgroundColor = (status: string) => {
    const statusLower = status?.toLowerCase();
    if (statusLower === 'for_sale' || statusLower === 'available' || statusLower === 'active') {
      return 'bg-green-50/30 hover:bg-green-50'; // Satışta - yeşil
    } else if (statusLower === 'sold') {
      return 'bg-gray-50/30 hover:bg-gray-100'; // Satıldı - gri
    } else if (statusLower === 'in_storage' || statusLower === 'stock') {
      return 'bg-blue-50/30 hover:bg-blue-50'; // Depoda - mavi
    }
    return 'hover:bg-gray-50'; // Default
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const toastId = toast.loading('Ürün ekleniyor...');
    
    try {
      // Fotoğrafları Supabase Storage'a yükle
      const imageUrls = uploadedImages.length > 0 
        ? await uploadImagesToStorage(uploadedImages)
        : [];
      
      if (imageUrls.length === 0) {
        toast.dismiss(toastId);
        toast.error('En az 1 fotoğraf yüklemelisiniz!');
        return;
      }
      
      const productData = {
        title: newProduct.title,
        description: newProduct.description,
        price: newProduct.price,
        category_id: newProduct.category,
        brand_id: newProduct.brand || null,
        condition: newProduct.condition,
        location: 'Menderes Mah., No:21A, Buca/İzmir',
        status: newProduct.status || 'in_storage',
        specifications: newProduct.specifications,
        images: imageUrls,
      };
      
      console.log('Creating product:', productData);
      
      const result = await createProduct(productData);
      
      toast.dismiss(toastId);
      
      if (result.success) {
        toast.success('Ürün başarıyla eklendi!');
        setShowAddProduct(false);
        // Reset form
        setNewProduct({
          title: '',
          price: '',
          category: '',
          brand: '',
          condition: '',
          description: '',
          status: 'in_storage',
          specifications: {},
        });
        setUploadedImages([]);
        // Reload products and stats
        loadProducts();
        loadProductStats();
      } else {
        toast.error(result.error || 'Ürün eklenemedi');
      }
    } catch (error: any) {
      toast.dismiss(toastId);
      console.error('Error adding product:', error);
      toast.error('Ürün eklenirken bir hata oluştu: ' + error.message);
    }
  };

  const handleEditProduct = async (productId: number) => {
    const toastId = toast.loading('Ürün güncelleniyor...');
    
    try {
      console.log('[AdminProducts] Updating product:', productId, editingProduct);
      console.log('[AdminProducts] Current images in editingProduct:', editingProduct.images);
      console.log('[AdminProducts] Images count:', editingProduct.images?.length || 0);
      
      // Warranty alanını kaldırıyoruz - eski sistemde olmayabilir
      // Specifications array'den object'e çevir
      const specsObject: Record<string, string> = {};
      if (editingProduct.specifications && Array.isArray(editingProduct.specifications)) {
        editingProduct.specifications.forEach((spec: any) => {
          if (spec.spec_key && spec.spec_value) {
            specsObject[spec.spec_key] = spec.spec_value;
          }
        });
      } else if (editingProduct.features && typeof editingProduct.features === 'object') {
        Object.assign(specsObject, editingProduct.features);
      }
      
      const productData = {
        title: editingProduct.title?.trim() || '',
        description: editingProduct.description?.trim() || '',
        price: parseFloat(editingProduct.price) || 0,
        category_id: editingProduct.category_id || '',
        brand_id: editingProduct.brand_id || '',
        condition: editingProduct.condition || 'good',
        status: editingProduct.status || 'in_storage',
        location: editingProduct.location || 'Menderes Mah., No:21A, Buca/İzmir',
        specifications: specsObject,
        images: editingProduct.images || [], // Fotoğraflar
      };
      
      console.log('[AdminProducts] Product data to update:', productData);
      console.log('[AdminProducts] Images being sent to backend:', productData.images);
      
      const result = await updateProduct(productId, productData);
      
      toast.dismiss(toastId);
      
      if (result.success) {
        toast.success('✅ Ürün başarıyla güncellendi!');
        setEditingProduct(null);
        loadProducts();
        loadProductStats();
      } else {
        console.error('[AdminProducts] Update failed:', result.error);
        toast.error(result.error || 'Ürün güncellenemedi');
      }
    } catch (error: any) {
      toast.dismiss(toastId);
      console.error('Error updating product:', error);
      toast.error('Ürün güncellenirken bir hata oluştu: ' + error.message);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) {
      return;
    }
    
    const toastId = toast.loading('Ürün siliniyor...');
    
    try {
      const result = await deleteProduct(productId);
      
      toast.dismiss(toastId);
      
      if (result.success) {
        toast.success('Ürün başarıyla silindi!');
        loadProducts();
        loadProductStats();
      } else {
        toast.error(result.error || 'Ürün silinemedi');
      }
    } catch (error: any) {
      toast.dismiss(toastId);
      console.error('Error deleting product:', error);
      toast.error('Ürün silinirken bir hata oluştu: ' + error.message);
    }
  };

  const handleStatusChange = async (productId: number, newStatus: string) => {
    const toastId = toast.loading('Durum güncelleniyor...');
    
    try {
      // Ürünü bul
      const product = products.find(p => p.id === productId);
      if (!product) {
        toast.dismiss(toastId);
        toast.error('Ürün bulunamadı');
        return;
      }

      // Specifications formatını düzelt
      const specsObject: Record<string, string> = {};
      if (product.specifications && Array.isArray(product.specifications)) {
        product.specifications.forEach((spec: any) => {
          if (spec.spec_key && spec.spec_value) {
            specsObject[spec.spec_key] = spec.spec_value;
          }
        });
      }

      const productData = {
        title: product.title,
        description: product.description,
        price: product.price,
        category_id: product.category_id,
        brand_id: product.brand_id,
        condition: product.condition,
        status: newStatus,
        specifications: specsObject,
        images: product.images?.map((img: any) => typeof img === 'string' ? img : img.image_url) || [],
      };
      
      const result = await updateProduct(productId, productData);
      
      toast.dismiss(toastId);
      
      if (result.success) {
        toast.success(`✅ Durum "${getStatusLabel(newStatus)}" olarak güncellendi!`);
        loadProducts();
        loadProductStats();
      } else {
        toast.error(result.error || 'Durum güncellenemedi');
      }
    } catch (error: any) {
      toast.dismiss(toastId);
      console.error('Error updating status:', error);
      toast.error('Durum güncellenirken bir hata oluştu: ' + error.message);
    }
  };

  const displayProducts = products.map(p => ({
    id: p.id,
    title: p.title,
    price: p.price,
    image: p.images?.[0]?.image_url || 'https://via.placeholder.com/400',
    images: p.images?.map((img: any) => img.image_url) || [],
    condition: p.condition,
    category: p.category?.name || 'Kategori',
    category_id: p.category_id || '',
    subcategory: p.subcategory || '-',
    subcategory_id: p.subcategory_id || '',
    brand: p.brand?.name || 'Marka',
    brand_id: p.brand_id || '',
    date: `${new Date(p.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })} ${new Date(p.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`,
    warranty: p.warranty || 'Garanti Yok',
    status: p.status,
    description: p.description,
    location: p.location || 'Menderes Mah., No:21A, Buca/İzmir',
    created_at: p.created_at,
    updated_at: p.updated_at,
    favorite_count: p.favorite_count || 0,
    features: p.specifications?.reduce((acc: any, spec: any) => {
      acc[spec.spec_key] = spec.spec_value;
      return acc;
    }, {}) || {},
    specifications: p.specifications || [],
  }));

  const filteredProducts = displayProducts.filter((product) => {
    const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filtreleme - eski değerleri de destekle (geriye dönük uyumluluk)
    let matchesStatus = statusFilter === 'all';
    if (!matchesStatus) {
      if (statusFilter === 'for_sale') {
        matchesStatus = product.status === 'for_sale' || product.status === 'available' || product.status === 'active';
      } else if (statusFilter === 'in_storage') {
        matchesStatus = product.status === 'in_storage' || product.status === 'stock';
      } else {
        matchesStatus = product.status === statusFilter;
      }
    }
    
    return matchesSearch && matchesStatus;
  });

  // Sorting fonksiyonu
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Aynı alana tıklandı, direction değiştir
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Yeni alan, ascending ile başla
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sıralanmış ürünler
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (!sortField) return 0;

    let aValue: any = a[sortField as keyof typeof a];
    let bValue: any = b[sortField as keyof typeof b];

    // Özel durumlar
    if (sortField === 'category') {
      aValue = a.categoryName || '';
      bValue = b.categoryName || '';
    } else if (sortField === 'brand') {
      aValue = a.brandName || '';
      bValue = b.brandName || '';
    } else if (sortField === 'created_at') {
      aValue = new Date(a.created_at).getTime();
      bValue = new Date(b.created_at).getTime();
    }

    // Null/undefined kontrolü
    if (aValue == null) return 1;
    if (bValue == null) return -1;

    // String karşılaştırma
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl mb-2">Ürün Yönetimi</h1>
          <p className="text-gray-600">
            Sistemdeki tüm ürünleri yönetin, yeni ürün ekleyin
          </p>
        </div>

        {/* Stats Cards */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg bg-gradient-to-br from-[#1e3a8a] to-[#1e3a8a]/80 text-white border-[#1e3a8a] ${statusFilter === 'all' ? 'ring-4 ring-[#1e3a8a]/50' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Package className="w-7 h-7 opacity-80 flex-shrink-0" />
                <div>
                  <p className="text-xs text-white/80 uppercase tracking-wide whitespace-nowrap">Toplam</p>
                  <p className="text-xl font-bold">{productStats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg bg-gradient-to-br from-green-50 to-white border-green-200 ${statusFilter === 'for_sale' ? 'ring-2 ring-green-500' : ''}`}
            onClick={() => setStatusFilter('for_sale')}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-7 h-7 text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide whitespace-nowrap">Satışta</p>
                  <p className="text-xl font-bold text-green-600">
                    {productStats.for_sale}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg bg-gradient-to-br from-blue-50 to-white border-blue-200 ${statusFilter === 'in_storage' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setStatusFilter('in_storage')}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Package className="w-7 h-7 text-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide whitespace-nowrap">Depoda</p>
                  <p className="text-xl font-bold text-blue-600">
                    {productStats.in_storage}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg bg-gradient-to-br from-gray-50 to-white border-gray-200 ${statusFilter === 'sold' ? 'ring-2 ring-gray-500' : ''}`}
            onClick={() => setStatusFilter('sold')}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Check className="w-7 h-7 text-gray-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide whitespace-nowrap">Satıldı</p>
                  <p className="text-xl font-bold text-gray-600">
                    {productStats.sold}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Ürün ara..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
            <DialogTrigger asChild>
              <Button className="bg-[#f59e0b] hover:bg-[#d97706]">
                <Plus className="w-5 h-5 mr-2" />
                Yeni Ürün Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-gray-50">
              <DialogHeader className="border-b pb-4 bg-gradient-to-r from-[#f97316]/10 to-[#1e3a8a]/10 -mx-6 px-6 -mt-6 pt-6 rounded-t-lg">
                <DialogTitle className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#f97316] to-[#ea580c] rounded-xl flex items-center justify-center shadow-lg">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-xl font-bold">Yeni Ürün Ekle</div>
                    <p className="text-sm text-gray-600 mt-1">Kataloga eklemek istediğiniz ürünün bilgilerini giriniz</p>
                  </div>
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Yeni ürün eklemek için formu doldurun
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddProduct} className="space-y-6 mt-6">
                {/* 1. GRUP: Temel Bilgiler */}
                <div className="bg-white rounded-xl border-2 border-gray-100 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] rounded-lg flex items-center justify-center shadow-md">
                      <span className="text-white font-bold text-sm">1</span>
                    </div>
                    <h3 className="font-bold text-gray-900">Temel Bilgiler</h3>
                  </div>
                  <div className="space-y-4">
                    
                    <div>
                      <Label htmlFor="title" className="text-gray-700 font-semibold">Ürün Başlığı *</Label>
                      <Input
                        id="title"
                        value={newProduct.title}
                        onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })}
                        required
                        placeholder="Örn: Samsung Buzdolabı 528 LT XL Geniş No-Frost"
                        className="mt-1.5 border-2 focus:border-[#1e3a8a]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="price" className="text-gray-700 font-semibold">Satış Fiyatı (₺) *</Label>
                        <Input
                          id="price"
                          type="number"
                          value={newProduct.price}
                          onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                          required
                          placeholder="25000"
                          className="mt-1.5 border-2 focus:border-[#f97316]"
                        />
                        <p className="text-xs text-gray-500 mt-1">İkinci el ürün - tek fiyat</p>
                      </div>

                      <div>
                        <Label htmlFor="brand" className="text-gray-700 font-semibold">Marka *</Label>
                        <Select
                          value={newProduct.brand}
                          onValueChange={(value) => setNewProduct({ ...newProduct, brand: value })}
                        >
                          <SelectTrigger className="mt-1.5 border-2">
                            <SelectValue placeholder="Seçiniz" />
                          </SelectTrigger>
                          <SelectContent>
                            {brands.map((brand) => (
                              <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. GRUP: Kategori ve Durum */}
                <div className="bg-white rounded-xl border-2 border-gray-100 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center shadow-md">
                      <span className="text-white font-bold text-sm">2</span>
                    </div>
                    <h3 className="font-bold text-gray-900">Kategori ve Durum</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category" className="text-gray-700 font-semibold">Kategori *</Label>
                      <Select
                        value={newProduct.category}
                        onValueChange={(value) => setNewProduct({ ...newProduct, category: value })}
                      >
                        <SelectTrigger className="mt-1.5 border-2">
                          <SelectValue placeholder="Seçiniz" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="condition" className="text-gray-700 font-semibold">Ürün Durumu *</Label>
                      <Select
                        value={newProduct.condition}
                        onValueChange={(value) => setNewProduct({ ...newProduct, condition: value })}
                      >
                        <SelectTrigger className="mt-1.5 border-2">
                          <SelectValue placeholder="Seçiniz" />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDITION_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="status" className="text-gray-700 font-semibold">Durum *</Label>
                      <Select
                        value={newProduct.status}
                        onValueChange={(value) => setNewProduct({ ...newProduct, status: value })}
                      >
                        <SelectTrigger className="mt-1.5 border-2">
                          <SelectValue placeholder="Seçiniz" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* 3. GRUP: Açıklama */}
                <div className="bg-white rounded-xl border-2 border-gray-100 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900">Ürün Açıklaması</h3>
                  </div>
                  <div>
                    <Label htmlFor="description" className="text-gray-700 font-semibold">Detaylı Açıklama *</Label>
                    <Textarea
                      id="description"
                      rows={3}
                      value={newProduct.description}
                      onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                      required
                      placeholder="Ürünün durumu, kullanım süresi ve özelliklerini detaylı şekilde açıklayın..."
                      className="mt-1.5 border-2 focus:border-purple-500 resize-none"
                    />
                  </div>
                </div>

                {/* 4. GRUP: Teknik Özellikler */}
                <div className="bg-white rounded-xl border-2 border-gray-100 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#f97316] to-[#ea580c] rounded-lg flex items-center justify-center shadow-md">
                      <span className="text-white font-bold text-sm">4</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Teknik Özellikler</h3>
                      <p className="text-xs text-gray-500">Model, Renk, Kapasite vb.</p>
                    </div>
                  </div>
                  
                  {/* Mevcut özellikler */}
                  {Object.entries(newProduct.specifications).length > 0 && (
                    <div className="mb-4 grid grid-cols-2 gap-3">
                      {Object.entries(newProduct.specifications).map(([key, value]) => (
                        <div key={key} className="relative bg-white rounded-xl border-2 border-[#f97316]/30 p-4 shadow-sm hover:shadow-md transition-shadow">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newSpecs = { ...newProduct.specifications };
                              delete newSpecs[key];
                              setNewProduct({ ...newProduct, specifications: newSpecs });
                            }}
                            className="absolute top-2 right-2 w-6 h-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                          <div className="pr-6">
                            <p className="text-xs font-bold text-[#f97316] uppercase tracking-wide mb-2">
                              {key}
                            </p>
                            <p className="text-gray-900 font-medium">
                              {value}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Yeni özellik ekleme formu */}
                  {!showNewSpecForm ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowNewSpecForm(true)}
                      className="w-full border-2 border-[#f97316] text-[#f97316] hover:bg-[#f97316] hover:text-white font-semibold"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Teknik Özellik Ekle
                    </Button>
                  ) : (
                    <div className="bg-gradient-to-r from-[#f97316]/10 to-[#ea580c]/10 p-4 rounded-lg border-2 border-[#f97316]/30 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="spec-key" className="text-[#ea580c] font-bold text-xs uppercase">Özellik Adı</Label>
                          <Input
                            id="spec-key"
                            value={newSpecKey}
                            onChange={(e) => setNewSpecKey(e.target.value)}
                            placeholder="Örn: Model, Renk, Kapasite"
                            className="mt-1.5 bg-white border-2 focus:border-[#f97316]"
                          />
                        </div>
                        <div>
                          <Label htmlFor="spec-value" className="text-[#ea580c] font-bold text-xs uppercase">Değer</Label>
                          <Input
                            id="spec-value"
                            value={newSpecValue}
                            onChange={(e) => setNewSpecValue(e.target.value)}
                            placeholder="Örn: iPhone 13, Siyah, 128GB"
                            className="mt-1.5 bg-white border-2 focus:border-[#f97316]"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={() => {
                            if (newSpecKey.trim() && newSpecValue.trim()) {
                              setNewProduct({
                                ...newProduct,
                                specifications: {
                                  ...newProduct.specifications,
                                  [newSpecKey.trim()]: newSpecValue.trim()
                                }
                              });
                              setNewSpecKey('');
                              setNewSpecValue('');
                              setShowNewSpecForm(false);
                              toast.success('Teknik özellik eklendi!');
                            } else {
                              toast.error('Lütfen tüm alanları doldurun');
                            }
                          }}
                          className="flex-1 bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:from-[#ea580c] hover:to-[#f97316] text-white font-semibold"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Ekle
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setNewSpecKey('');
                            setNewSpecValue('');
                            setShowNewSpecForm(false);
                          }}
                          className="flex-1 border-2"
                        >
                          <X className="w-4 h-4 mr-2" />
                          İptal
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. GRUP: Ürün Fotoğrafları */}
                <div className="bg-white rounded-xl border-2 border-gray-100 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                        <span className="text-white font-bold text-sm">5</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">Ürün Fotoğrafları</h3>
                        <p className="text-xs text-gray-500 mt-0.5">En az 1, en fazla 15 fotoğraf yükleyiniz</p>
                      </div>
                    </div>
                    <Badge className={`${uploadedImages.length >= 1 ? 'bg-green-100 text-green-700 border-2 border-green-300' : 'bg-amber-100 text-amber-700 border-2 border-amber-300'}`}>
                      📸 {uploadedImages.length} / 15
                    </Badge>
                  </div>
                  <div className="mt-2">
                    <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-500 transition-colors bg-white">
                      <div className="text-center">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-600">Fotoğraf seçmek için tıklayın</p>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG - En fazla 15 fotoğraf</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                    </label>
                  </div>

                  {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-5 gap-2 mt-4 max-h-[400px] overflow-y-auto p-2">
                      {uploadedImages.map((file, index) => (
                        <div key={index} className="relative aspect-square">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg"
                          />
                          <div className="absolute top-1 left-1 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full font-bold shadow-lg">
                            {index + 1}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit Butonları */}
                <div className="flex flex-col gap-3 pt-6 border-t-2 border-gray-200 -mx-6 px-6 -mb-6 pb-6 bg-gray-50 rounded-b-lg">
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 border-2 hover:bg-gray-100 h-12 font-semibold"
                      onClick={() => setShowAddProduct(false)}
                    >
                      <X className="w-5 h-5 mr-2" />
                      İptal
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] hover:from-[#2563eb] hover:to-[#1e3a8a] h-12 font-bold shadow-lg shadow-blue-500/30"
                      disabled={uploadedImages.length < 1}
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Ürünü Kataloga Ekle
                    </Button>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Products Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th 
                      className="text-left p-4 min-w-[60px] cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleSort('id')}
                    >
                      <div className="flex items-center gap-2">
                        ID
                        {sortField === 'id' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th className="text-left p-4 min-w-[100px]">
                      Fotoğraf
                    </th>
                    <th 
                      className="text-left p-4 min-w-[200px] cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleSort('title')}
                    >
                      <div className="flex items-center gap-2">
                        Ürün Başlığı
                        {sortField === 'title' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-left p-4 min-w-[90px] cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleSort('category')}
                    >
                      <div className="flex items-center gap-2">
                        Kategori
                        {sortField === 'category' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-left p-4 min-w-[80px] cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleSort('brand')}
                    >
                      <div className="flex items-center gap-2">
                        Marka
                        {sortField === 'brand' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-left p-4 min-w-[110px] cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleSort('condition')}
                    >
                      <div className="flex items-center gap-2">
                        Ürün Durumu
                        {sortField === 'condition' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-right p-4 min-w-[120px] cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleSort('price')}
                    >
                      <div className="flex items-center gap-2 justify-end">
                        Fiyat
                        {sortField === 'price' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-left p-4 min-w-[100px] cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleSort('warranty')}
                    >
                      <div className="flex items-center gap-2">
                        Garanti
                        {sortField === 'warranty' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-center p-4 min-w-[100px] cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleSort('favorite_count')}
                    >
                      <div className="flex items-center gap-2 justify-center">
                        Favori Sayısı
                        {sortField === 'favorite_count' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th className="text-left p-4 min-w-[180px]">Özellikler</th>
                    <th 
                      className="text-center p-4 min-w-[90px] cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-2 justify-center">
                        Durum
                        {sortField === 'status' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-left p-4 min-w-[130px] cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center gap-2">
                        Eklenme Tarihi
                        {sortField === 'created_at' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th className="text-right p-4 min-w-[120px]">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedProducts.map((product) => (
                    <tr key={product.id} className={`${getRowBackgroundColor(product.status)} transition-all border-l-4 ${
                      product.status === 'for_sale' || product.status === 'active' || product.status === 'available' 
                        ? 'border-l-green-400' 
                        : product.status === 'sold' 
                        ? 'border-l-gray-400' 
                        : 'border-l-blue-400'
                    }`}>
                      {/* ID */}
                      <td className="p-4">
                        <span className="text-sm font-mono font-bold text-[#1e3a8a] bg-[#1e3a8a]/5 px-2 py-1 rounded">
                          #{product.id}
                        </span>
                      </td>
                      
                      {/* Fotoğraf */}
                      <td className="p-4">
                        <div 
                          className="relative flex-shrink-0 cursor-pointer group"
                          onClick={() => {
                            setSelectedProduct(product);
                            setSelectedImageIndex(0);
                            setIsGalleryOpen(true);
                          }}
                        >
                          <img
                            src={product.image}
                            alt={product.title}
                            className="w-20 h-20 object-cover rounded-xl shadow-md ring-2 ring-gray-100 group-hover:scale-105 transition-transform duration-200"
                          />
                          {product.images && product.images.length > 1 && (
                            <Badge className="absolute -top-1 -right-1 bg-[#1e3a8a] text-white text-xs px-2 py-0.5 shadow-lg">
                              +{product.images.length - 1}
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Ürün Başlığı */}
                      <td className="p-4">
                        <div className="relative group">
                          <p className="text-sm font-semibold text-gray-900 line-clamp-2 cursor-pointer hover:text-[#1e3a8a] transition-colors">
                            {product.title}
                          </p>
                          {/* Tooltip */}
                          <div className="absolute left-0 top-full mt-2 z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200">
                            <div className="bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-xl max-w-sm whitespace-normal">
                              {product.title}
                              <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      {/* Kategori */}
                      <td className="p-4">
                        <Badge className="bg-blue-100 text-blue-800 border border-blue-200">
                          {product.category}
                        </Badge>
                      </td>
                      
                      {/* Marka */}
                      <td className="p-4">
                        <span className="text-sm font-semibold text-gray-900 bg-gray-100 px-2 py-1 rounded">
                          {product.brand}
                        </span>
                      </td>
                      
                      {/* Durum */}
                      <td className="p-4">
                        <Badge className={`text-xs whitespace-nowrap font-semibold border-2 shadow-sm ${
                          product.condition === 'excellent' || product.condition === 'sifir' 
                            ? 'bg-green-100 text-green-800 border-green-300' 
                            : product.condition === 'good' || product.condition === 'cok-iyi'
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : product.condition === 'fair' || product.condition === 'iyi'
                            ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                            : 'bg-gray-100 text-gray-800 border-gray-300'
                        }`}>
                          {getConditionLabel(product.condition)}
                        </Badge>
                      </td>
                      
                      {/* Fiyat */}
                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-1 bg-gradient-to-r from-[#f97316]/10 to-[#f97316]/5 px-3 py-2 rounded-lg">
                          <Banknote className="w-4 h-4 text-[#f97316]" />
                          <span className="text-sm text-[#1e3a8a] font-bold whitespace-nowrap">
                            {product.price.toLocaleString('tr-TR')} ₺
                          </span>
                        </div>
                      </td>
                      
                      {/* Garanti */}
                      <td className="p-4">
                        <Badge className="bg-teal-50 text-teal-700 border border-teal-200 font-medium">
                          ✓ {product.warranty}
                        </Badge>
                      </td>
                      
                      {/* Favori Sayısı */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Heart className={`w-4 h-4 ${(product.favorite_count || 0) > 0 ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                          <span className={`font-semibold ${(product.favorite_count || 0) > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                            {product.favorite_count || 0}
                          </span>
                        </div>
                      </td>
                      
                      {/* Özellikler */}
                      <td className="p-4">
                        <div className="space-y-1">
                          {product.features && Object.entries(product.features).slice(0, 2).map(([key, value], idx) => (
                            <div key={idx} className="flex items-start gap-1">
                              <span className="text-xs text-gray-500 capitalize min-w-[60px]">
                                {key.replace(/_/g, ' ')}:
                              </span>
                              <span className="text-xs text-gray-700 font-medium">
                                {value as string}
                              </span>
                            </div>
                          ))}
                          {product.features && Object.keys(product.features).length > 2 && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-blue-600 hover:text-blue-700 p-0 h-auto text-xs mt-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log('Opening specs modal for:', product.title);
                                setSelectedProduct(product);
                                setIsDetailModalOpen(true);
                              }}
                            >
                              +{Object.keys(product.features).length - 2} özellik daha
                            </Button>
                          )}
                        </div>
                      </td>
                      
                      {/* Durum - Interaktif Dropdown */}
                      <td className="p-4 text-center">
                        <Select
                          value={product.status}
                          onValueChange={(value) => handleStatusChange(product.id, value)}
                        >
                          <SelectTrigger 
                            className={`w-[140px] border-2 font-semibold shadow-sm hover:shadow-md transition-all ${
                              product.status === 'for_sale' || product.status === 'active' || product.status === 'available'
                                ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200'
                                : product.status === 'sold'
                                ? 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                                : 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200'
                            }`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map(option => (
                              <SelectItem 
                                key={option.value} 
                                value={option.value}
                                className="cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  {option.value === 'for_sale' && <span className="w-2 h-2 rounded-full bg-green-500"></span>}
                                  {option.value === 'in_storage' && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                                  {option.value === 'sold' && <span className="w-2 h-2 rounded-full bg-gray-500"></span>}
                                  {option.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      
                      {/* Eklenme Tarihi */}
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-700 whitespace-nowrap">
                            {new Date(product.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-xs text-gray-500 whitespace-nowrap mt-0.5">
                            {new Date(product.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1">
                          {(product.status?.toLowerCase() === 'available' || product.status?.toLowerCase() === 'active') && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50" 
                              title="Ürün Sayfasında Önizle"
                              onClick={() => {
                                window.open(`/urun/${product.id}`, '_blank');
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0" 
                            title="Düzenle"
                            onClick={() => {
                              // Images formatını düzelt: array of objects -> array of strings
                              const formattedProduct = {
                                ...product,
                                images: product.images?.map((img: any) => 
                                  typeof img === 'string' ? img : img.image_url
                                ) || []
                              };
                              setEditingProduct(formattedProduct);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                            title="Sil"
                            onClick={() => handleDeleteProduct(product.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Daha Fazla Yükle Butonu */}
        {products.length < totalProducts && (
          <div className="flex justify-center mt-6">
            <Button
              onClick={loadMoreProducts}
              variant="outline"
              className="px-8 py-6 text-base font-medium border-2 hover:bg-gray-50"
              disabled={loading}
            >
              {loading ? 'Yükleniyor...' : `Daha Fazla Ürün Yükle (${products.length} / ${totalProducts})`}
            </Button>
          </div>
        )}

        {/* Teknik Özellikler Modal - Sadece özellikler gösterilir */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-600" />
                Teknik Özellikler
              </DialogTitle>
              <DialogDescription>
                {selectedProduct ? selectedProduct.title : 'Ürün bilgileri yükleniyor...'}
              </DialogDescription>
            </DialogHeader>
            {selectedProduct && (
              <>

                <div className="space-y-4 mt-4">
                  {/* Teknik Özellikler */}
                  {selectedProduct.features && Object.keys(selectedProduct.features).length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(selectedProduct.features).map(([key, value]) => (
                        <div key={key} className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-200">
                          <p className="text-xs text-orange-700 mb-1 capitalize font-medium">
                            {key.replace(/_/g, ' ')}
                          </p>
                          <p className="text-sm text-gray-900 font-semibold">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Package className="w-16 h-16 mx-auto mb-3 opacity-30" />
                      <p className="text-lg font-medium mb-1">Teknik Özellik Bulunamadı</p>
                      <p className="text-sm">Bu ürün için henüz teknik özellik eklenmemiş</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Fotoğraf Galerisi Modal */}
        <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
          <DialogContent className="max-w-5xl max-h-[95vh] p-0">
            <DialogTitle className="sr-only">Ürün Fotoğraf Galerisi</DialogTitle>
            <DialogDescription className="sr-only">Ürünün fotoğraflarını görüntüleyin</DialogDescription>
            {selectedProduct && selectedProduct.images && (
              <div className="relative">
                {/* Ana Görsel */}
                <div className="relative bg-black">
                  <img
                    src={selectedProduct.images[selectedImageIndex]}
                    alt={`${selectedProduct.title} - Fotoğraf ${selectedImageIndex + 1}`}
                    className="w-full h-[70vh] object-contain"
                  />
                  {/* Navigasyon Okları */}
                  {selectedImageIndex > 0 && (
                    <button
                      onClick={() => setSelectedImageIndex(prev => prev - 1)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white text-gray-900 rounded-full flex items-center justify-center shadow-lg transition-all"
                    >
                      ‹
                    </button>
                  )}
                  {selectedImageIndex < selectedProduct.images.length - 1 && (
                    <button
                      onClick={() => setSelectedImageIndex(prev => prev + 1)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white text-gray-900 rounded-full flex items-center justify-center shadow-lg transition-all"
                    >
                      ›
                    </button>
                  )}
                  {/* Fotoğraf Sayacı */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
                    {selectedImageIndex + 1} / {selectedProduct.images.length}
                  </div>
                </div>

                {/* Thumbnail Grid */}
                <div className="bg-white p-4">
                  <div className="flex gap-2 overflow-x-auto">
                    {selectedProduct.images.map((img: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                          idx === selectedImageIndex
                            ? 'border-blue-600 ring-2 ring-blue-300'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <img
                          src={img}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* DÜZENLEME MODAL - TÜM VERİTABANI BİLGİLERİ */}
        {editingProduct && (
          <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-gray-50">
              <DialogHeader className="border-b pb-4 bg-gradient-to-r from-[#1e3a8a]/5 to-[#f97316]/5 -mx-6 px-6 -mt-6 pt-6 rounded-t-lg">
                <DialogTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                    <Edit className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold">Ürün Düzenle</span>
                      <Badge className="bg-[#1e3a8a] text-white font-mono">#{editingProduct.id}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{editingProduct.title}</p>
                  </div>
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Ürün bilgilerini düzenlemek için formu doldurun
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={(e) => {
                e.preventDefault();
                handleEditProduct(editingProduct.id);
              }} className="space-y-6 mt-6">
                {/* Temel Bilgiler */}
                <div className="bg-white rounded-xl border-2 border-gray-100 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold">1</span>
                    </div>
                    <h3 className="font-bold text-gray-900">Temel Bilgiler</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="edit-title" className="text-gray-700 font-semibold">Ürün Başlığı *</Label>
                      <Input
                        id="edit-title"
                        value={editingProduct.title}
                        onChange={(e) => setEditingProduct({...editingProduct, title: e.target.value})}
                        required
                        className="mt-1.5 border-2 focus:border-[#1e3a8a]"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-price" className="text-gray-700 font-semibold">Fiyat (₺) *</Label>
                      <Input
                        id="edit-price"
                        type="number"
                        value={editingProduct.price}
                        onChange={(e) => setEditingProduct({...editingProduct, price: parseFloat(e.target.value) || 0})}
                        required
                        className="mt-1.5 border-2 focus:border-[#f97316]"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-warranty" className="text-gray-700 font-semibold">Garanti</Label>
                      <Input
                        id="edit-warranty"
                        value={editingProduct.warranty || ''}
                        onChange={(e) => setEditingProduct({...editingProduct, warranty: e.target.value})}
                        placeholder="örn: 2 Yıl Garanti"
                        className="mt-1.5 border-2 focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-condition" className="text-gray-700 font-semibold">Ürün Durumu *</Label>
                      <Select
                        value={editingProduct.condition || 'new'}
                        onValueChange={(value) => setEditingProduct({...editingProduct, condition: value})}
                      >
                        <SelectTrigger id="edit-condition" className="mt-1.5 border-2">
                          <SelectValue placeholder="Durum seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDITION_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit-status" className="text-gray-700 font-semibold">Satış Durumu *</Label>
                      <Select
                        value={editingProduct.status || 'for_sale'}
                        onValueChange={(value) => setEditingProduct({...editingProduct, status: value})}
                      >
                        <SelectTrigger id="edit-status" className="mt-1.5 border-2">
                          <SelectValue placeholder="Durum seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="edit-location" className="text-gray-700 font-semibold">Konum</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="edit-location"
                          value={editingProduct.location || ''}
                          onChange={(e) => setEditingProduct({...editingProduct, location: e.target.value})}
                          placeholder="Menderes Mah., No:21A, Buca/İzmir"
                          className="mt-1.5 border-2 focus:border-orange-500 pl-9"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Açıklama - Daraltılmış */}
                <div className="bg-white rounded-xl border-2 border-gray-100 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900">Açıklama</h3>
                  </div>
                  <Textarea
                    value={editingProduct.description}
                    onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                    rows={3}
                    placeholder="Ürün açıklaması..."
                    className="border-2 focus:border-purple-500 resize-none"
                  />
                </div>

                {/* Kategori Bilgileri - DÜZENLENEBİLİR */}
                <div className="bg-white rounded-xl border-2 border-gray-100 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold">2</span>
                    </div>
                    <h3 className="font-bold text-gray-900">Kategori Bilgileri</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-category" className="text-gray-700 font-semibold">Kategori *</Label>
                      <Select
                        value={editingProduct.category_id || ''}
                        onValueChange={(value) => setEditingProduct({...editingProduct, category_id: value})}
                      >
                        <SelectTrigger id="edit-category" className="mt-1.5 border-2">
                          <SelectValue placeholder="Kategori seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit-brand" className="text-gray-700 font-semibold">Marka *</Label>
                      <Select
                        value={editingProduct.brand_id || ''}
                        onValueChange={(value) => setEditingProduct({...editingProduct, brand_id: value})}
                      >
                        <SelectTrigger id="edit-brand" className="mt-1.5 border-2">
                          <SelectValue placeholder="Marka seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {brands.map((brand) => (
                            <SelectItem key={brand.id} value={brand.id}>
                              {brand.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Teknik Özellikler - DÜZENLENEBİLİR */}
                <div className="bg-white rounded-xl border-2 border-gray-100 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-[#f97316] to-[#ea580c] rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold">3</span>
                      </div>
                      <h3 className="font-bold text-gray-900">Teknik Özellikler</h3>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowNewSpecForm(!showNewSpecForm)}
                      className="text-[#f97316] border-2 border-[#f97316] hover:bg-[#f97316] hover:text-white font-semibold shadow-sm transition-all"
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      Yeni Özellik
                    </Button>
                  </div>
                  
                  {/* Yeni Özellik Ekleme Formu */}
                  {showNewSpecForm && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-[#f97316]/10 to-[#ea580c]/10 rounded-lg border-2 border-[#f97316]/30 shadow-inner">
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <Label className="text-xs text-[#ea580c] font-bold uppercase tracking-wide">Özellik Adı</Label>
                          <Input
                            value={newSpecKey}
                            onChange={(e) => setNewSpecKey(e.target.value)}
                            placeholder="örn: Renk, Model, Kapasite"
                            className="mt-1.5 bg-white border-2 focus:border-[#f97316]"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-[#ea580c] font-bold uppercase tracking-wide">Değer</Label>
                          <Input
                            value={newSpecValue}
                            onChange={(e) => setNewSpecValue(e.target.value)}
                            placeholder="örn: Beyaz, XL, 500 LT"
                            className="mt-1.5 bg-white border-2 focus:border-[#f97316]"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (newSpecKey.trim() && newSpecValue.trim()) {
                                  const cleanKey = newSpecKey.trim().toLowerCase().replace(/\s+/g, '_');
                                  setEditingProduct({
                                    ...editingProduct,
                                    features: {
                                      ...editingProduct.features,
                                      [cleanKey]: newSpecValue.trim()
                                    },
                                    specifications: [
                                      ...(editingProduct.specifications || []),
                                      { spec_key: cleanKey, spec_value: newSpecValue.trim() }
                                    ]
                                  });
                                  setNewSpecKey('');
                                  setNewSpecValue('');
                                  setShowNewSpecForm(false);
                                  toast.success('Özellik eklendi');
                                }
                              }
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            if (newSpecKey.trim() && newSpecValue.trim()) {
                              const cleanKey = newSpecKey.trim().toLowerCase().replace(/\s+/g, '_');
                              setEditingProduct({
                                ...editingProduct,
                                features: {
                                  ...editingProduct.features,
                                  [cleanKey]: newSpecValue.trim()
                                },
                                specifications: [
                                  ...(editingProduct.specifications || []),
                                  { spec_key: cleanKey, spec_value: newSpecValue.trim() }
                                ]
                              });
                              setNewSpecKey('');
                              setNewSpecValue('');
                              setShowNewSpecForm(false);
                              toast.success('Özellik eklendi');
                            } else {
                              toast.error('Lütfen özellik adı ve değerini girin');
                            }
                          }}
                          className="flex-1 bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:from-[#ea580c] hover:to-[#f97316] text-white font-semibold shadow-md"
                        >
                          <Check className="w-4 h-4 mr-1.5" />
                          Ekle
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setNewSpecKey('');
                            setNewSpecValue('');
                            setShowNewSpecForm(false);
                          }}
                          className="flex-1 border-2"
                        >
                          İptal
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(editingProduct.features || {}).map(([key, value]) => (
                      <div key={key} className="bg-gradient-to-r from-[#f97316]/5 to-[#ea580c]/5 p-3 rounded-lg border-2 border-[#f97316]/20 relative group hover:border-[#f97316] hover:shadow-md transition-all">
                        <Label className="text-xs text-[#ea580c] font-bold uppercase tracking-wide">{key.replace(/_/g, ' ')}</Label>
                        <Input
                          value={value as string}
                          onChange={(e) => setEditingProduct({
                            ...editingProduct,
                            features: {
                              ...editingProduct.features,
                              [key]: e.target.value
                            },
                            specifications: Array.isArray(editingProduct.specifications)
                              ? editingProduct.specifications.map((spec: any) => 
                                  spec.spec_key === key ? {...spec, spec_value: e.target.value} : spec
                                )
                              : editingProduct.specifications
                          })}
                          className="mt-1.5 bg-white border-2 focus:border-[#f97316]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const { [key]: removed, ...rest } = editingProduct.features;
                            setEditingProduct({
                              ...editingProduct,
                              features: rest,
                              specifications: Array.isArray(editingProduct.specifications)
                                ? editingProduct.specifications.filter((spec: any) => spec.spec_key !== key)
                                : editingProduct.specifications
                            });
                            toast.success('Özellik silindi');
                          }}
                          className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  {Object.keys(editingProduct.features || {}).length === 0 && !showNewSpecForm && (
                    <div className="text-center py-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                      <Package className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 font-medium">
                        Henüz özellik eklenmemiş
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        "Yeni Özellik" butonuna tıklayarak ekleyin
                      </p>
                    </div>
                  )}
                </div>

                {/* Ürün Görselleri - DÜZENLENEBİLİR */}
                <div className="bg-white rounded-xl border-2 border-gray-100 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold">4</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">Ürün Görselleri</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {editingProduct.images?.length || 0}/15 görsel yüklendi
                        </p>
                      </div>
                    </div>
                    <Badge className={`${
                      (editingProduct.images?.length || 0) >= 1 
                        ? 'bg-green-100 text-green-700 border-2 border-green-300' 
                        : 'bg-amber-100 text-amber-700 border-2 border-amber-300'
                    }`}>
                      📸 {editingProduct.images?.length || 0}/15
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-5 gap-3 mb-4 max-h-[400px] overflow-y-auto p-2">
                    {editingProduct.images?.map((img: string, idx: number) => (
                      <div key={idx} className="aspect-square rounded-xl overflow-hidden border-2 border-purple-200 relative group hover:border-purple-500 transition-all shadow-md">
                        <img src={img} alt={`Görsel ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => {
                              const newImages = editingProduct.images?.filter((_: any, i: number) => i !== idx);
                              setEditingProduct({...editingProduct, images: newImages});
                              toast.success('Görsel silindi');
                            }}
                            className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transform scale-100 hover:scale-110 transition-transform"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full font-bold shadow-lg">
                          {idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Yeni görsel ekle - FILE UPLOAD */}
                  {(!editingProduct.images || editingProduct.images.length < 15) && (
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border-2 border-purple-200">
                      <Label className="text-xs text-purple-700 font-bold uppercase tracking-wide mb-2 block">
                        Yeni Fotoğraf Ekle (Maks: {15 - (editingProduct.images?.length || 0)} fotoğraf)
                      </Label>
                      <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer hover:border-purple-500 transition-colors bg-white">
                        <div className="text-center">
                          <Upload className="w-6 h-6 mx-auto mb-1 text-purple-400" />
                          <p className="text-xs text-purple-600 font-medium">Bilgisayardan fotoğraf seçin</p>
                          <p className="text-xs text-gray-400 mt-0.5">PNG, JPG</p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          multiple
                          accept="image/*"
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length === 0) return;
                            
                            const remainingSlots = 15 - (editingProduct.images?.length || 0);
                            const filesToUpload = files.slice(0, remainingSlots);
                            
                            if (files.length > remainingSlots) {
                              toast.warning(`En fazla ${remainingSlots} fotoğraf ekleyebilirsiniz. İlk ${remainingSlots} fotoğraf yüklenecek.`);
                            }
                            
                            try {
                              const uploadedUrls = await uploadImagesToStorage(filesToUpload);
                              const newImages = [...(editingProduct.images || []), ...uploadedUrls];
                              console.log('[AdminProducts] New images after upload:', newImages);
                              setEditingProduct({...editingProduct, images: newImages});
                              toast.success(`✅ ${uploadedUrls.length} yeni fotoğraf eklendi! Değişiklikleri kaydetmeyi unutmayın.`);
                            } catch (error) {
                              // Error already handled in uploadImagesToStorage
                            }
                            
                            // Reset input
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* Kayıt Bilgileri */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    <h3 className="font-bold text-gray-900">Kayıt Bilgileri</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Ürün ID</p>
                      <p className="text-sm text-gray-900 font-mono font-bold">#{editingProduct.id}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Eklenme Tarihi</p>
                      <div className="flex flex-col">
                        <p className="text-sm text-gray-900 font-semibold">
                          {new Date(editingProduct.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {new Date(editingProduct.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Konum</p>
                      <p className="text-sm text-gray-900 font-semibold">{editingProduct.location}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-6 border-t-2 border-gray-200 -mx-6 px-6 -mb-6 pb-6 bg-gray-50 rounded-b-lg">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-2 hover:bg-gray-100 h-12 font-semibold"
                    onClick={() => setEditingProduct(null)}
                  >
                    <X className="w-5 h-5 mr-2" />
                    İptal
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 h-12 font-bold shadow-lg shadow-blue-500/30"
                  >
                    <Check className="w-5 h-5 mr-2" />
                    Değişiklikleri Kaydet
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Önizleme Modal - Web Sitesi Görünümü */}
        <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
          <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto p-0">
            <DialogTitle className="sr-only">Ürün Önizleme</DialogTitle>
            <DialogDescription className="sr-only">Ürünün web sitesinde nasıl görüneceğini önizleyin</DialogDescription>
            {selectedProduct && (
              <div className="bg-gray-50">
                {/* Breadcrumb */}
                <div className="bg-white border-b px-8 py-4">
                  <div className="text-sm text-gray-600">
                    Ana Sayfa {'>'} Ürünler {'>'} {selectedProduct.category} {'>'}{' '}
                    <span className="text-gray-900">{selectedProduct.title}</span>
                  </div>
                </div>

                <div className="p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Sol - Fotoğraf Galerisi (2 Kolon) */}
                    <div className="lg:col-span-2 space-y-4">
                      {/* Ana Görsel */}
                      <Card className="overflow-hidden">
                        <div className="relative bg-gray-100">
                          <img
                            src={selectedProduct.images?.[selectedImageIndex] || selectedProduct.image}
                            alt={selectedProduct.title}
                            className="w-full h-96 lg:h-[600px] object-contain"
                          />
                          
                          {/* Durum Badge - Sağ Üst */}
                          <Badge className="absolute top-4 right-4 border-0 bg-[#f59e0b] text-white">
                            {getConditionLabel(selectedProduct.condition)}
                          </Badge>
                          
                          {/* Navigasyon Okları */}
                          {selectedProduct.images && selectedProduct.images.length > 1 && (
                            <>
                              <button
                                onClick={() => setSelectedImageIndex(prev => Math.max(0, prev - 1))}
                                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center transition-colors"
                                disabled={selectedImageIndex === 0}
                              >
                                <ChevronLeft className="w-6 h-6" />
                              </button>
                              <button
                                onClick={() => setSelectedImageIndex(prev => Math.min((selectedProduct.images?.length || 1) - 1, prev + 1))}
                                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center transition-colors"
                                disabled={selectedImageIndex === (selectedProduct.images?.length || 1) - 1}
                              >
                                <ChevronRight className="w-6 h-6" />
                              </button>
                            </>
                          )}
                        </div>
                      </Card>

                      {/* Thumbnail Gallery */}
                      {selectedProduct.images && selectedProduct.images.length > 1 && (
                        <div className="grid grid-cols-5 gap-2">
                          {selectedProduct.images.map((img: string, idx: number) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedImageIndex(idx)}
                              className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                                idx === selectedImageIndex
                                  ? 'border-[#1e3a8a] ring-2 ring-[#1e3a8a]/20'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Açıklama */}
                      <Card>
                        <CardContent className="p-6">
                          <h3 className="mb-4">Açıklama</h3>
                          <p className="text-gray-700 whitespace-pre-line">{selectedProduct.description}</p>
                        </CardContent>
                      </Card>

                      {/* Ürün Detayları */}
                      <Card className="border-2 border-[#1e3a8a]/10">
                        <CardContent className="p-8">
                          {/* Başlık */}
                          <div className="mb-6 pb-4 border-b-2 border-[#1e3a8a]/20">
                            <h2 className="text-3xl text-[#1e3a8a]" style={{ fontWeight: 700 }}>
                              Ürün Detayları
                            </h2>
                            <p className="text-gray-500 mt-2">Teknik özellikler ve ürün bilgileri</p>
                          </div>
                          
                          {/* Özellikler */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {selectedProduct.specifications && Object.entries(selectedProduct.specifications).map(([key, value]) => (
                              <div 
                                key={key} 
                                className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-[#1e3a8a]/30 hover:shadow-md transition-all"
                              >
                                <Check className="w-5 h-5 text-white bg-green-500 rounded-full p-1 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <span className="text-sm text-gray-500 block mb-1 capitalize">
                                    {key.replace(/_/g, ' ')}
                                  </span>
                                  <span className="text-[#1e3a8a]" style={{ fontWeight: 600 }}>{value as string}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Sağ - Ürün Bilgileri (1 Kolon) */}
                    <div className="lg:col-span-1">
                      <Card className="sticky top-8">
                        <CardContent className="p-6">
                          {/* Ürün Başlığı */}
                          <h1 className="mb-4">{selectedProduct.title}</h1>
                          
                          <div className="flex items-center gap-2 mb-4">
                            <Badge variant="outline">{selectedProduct.category}</Badge>
                            <Badge variant="outline">{selectedProduct.brand}</Badge>
                          </div>

                          {/* Fiyat */}
                          <div className="bg-[#f0f9ff] p-4 rounded-lg mb-4">
                            <div className="text-2xl text-[#1e3a8a] mb-1" style={{ fontWeight: 700 }}>
                              {selectedProduct.price.toLocaleString('tr-TR')} ₺
                            </div>
                            <div className="text-sm text-gray-600">
                              <span className="text-xs text-gray-500 ml-1">(KDV Dahil)</span>
                            </div>
                          </div>

                          <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-2 text-gray-600">
                              <MapPin className="w-4 h-4 text-[#1e3a8a]" />
                              <div className="text-sm">
                                <span className="font-medium">Mağaza Konumu:</span>{' '}
                                <span className="text-[#1e3a8a]">Ersin Spot - Buca, İzmir</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar className="w-4 h-4 text-[#f97316]" />
                              <div className="text-sm">
                                <span className="font-medium">Firmaya Geliş Tarihi:</span>{' '}
                                <span>{selectedProduct.date}</span>
                              </div>
                            </div>
                            {selectedProduct.warranty && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Package className="w-4 h-4 text-green-600" />
                                <div className="text-sm">
                                  <span className="font-medium">Garanti:</span>{' '}
                                  <span className="text-green-700 font-medium">{selectedProduct.warranty}</span>
                                </div>
                              </div>
                            )}
                            <div className="text-sm text-gray-500">
                              İlan No: #{selectedProduct.id}
                            </div>
                          </div>

                          {/* İnce Separator */}
                          <div className="my-6 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>

                          {/* Satış Durumu Badge */}
                          <div className="text-center mb-4">
                            {selectedProduct.status === 'sold' ? (
                              <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-500 p-4 rounded-xl shadow-lg">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-2xl">✖</span>
                                  </div>
                                  <div className="flex-1 text-left">
                                    <h4 className="text-red-800 mb-1" style={{ fontWeight: 700 }}>Bu Ürün Satıldı</h4>
                                    <p className="text-sm text-red-700">
                                      Benzer ürünlerimize göz atabilirsiniz.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                                  <ShoppingCart className="w-5 h-5 mr-2" />
                                  Sepete Ekle
                                </Button>
                                <Button variant="outline" className="w-full">
                                  <Heart className="w-5 h-5 mr-2" />
                                  Favorilere Ekle
                                </Button>
                                <Button variant="outline" className="w-full border border-gray-300 hover:border-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white transition-all">
                                  <Share2 className="w-5 h-5 mr-2" />
                                  Paylaş
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Teslimat Bilgisi */}
                          {selectedProduct.status !== 'sold' && (
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
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
