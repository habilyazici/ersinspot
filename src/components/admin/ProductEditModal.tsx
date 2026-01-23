import { useState, useEffect } from 'react';
import { X, Upload, Plus, Trash2, Check } from 'lucide-react@0.487.0';
import { AdminDialog as Dialog, AdminDialogContent as DialogContent, AdminDialogHeader as DialogHeader, AdminDialogTitle as DialogTitle, AdminDialogDescription as DialogDescription } from '../ui/admin-dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner@2.0.3';
import { CONDITION_OPTIONS } from '../../utils/conditionHelper';
import { STATUS_OPTIONS } from '../../utils/statusHelper';

interface ProductEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  onSave: (productData: any) => void;
}

export function ProductEditModal({ isOpen, onClose, product, onSave }: ProductEditModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    description: '',
    condition: '',
    warranty: '',
    status: 'in_storage',
  });

  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [specifications, setSpecifications] = useState<Array<{ spec_key: string; spec_value: string }>>([]);
  const [newSpec, setNewSpec] = useState({ key: '', value: '' });

  useEffect(() => {
    if (product) {
      setFormData({
        title: product.title || '',
        price: product.price?.toString() || '',
        description: product.description || '',
        condition: product.condition || '',
        warranty: product.warranty?.toString() || '',
        status: product.status || 'in_storage',
      });
      setImages(product.images?.map((img: any) => img.image_url) || []);
      setSpecifications(product.specifications || []);
    }
  }, [product]);

  const handleAddImage = () => {
    if (!newImageUrl.trim()) {
      toast.error('Lütfen geçerli bir URL girin');
      return;
    }
    setImages([...images, newImageUrl]);
    setNewImageUrl('');
    toast.success('Fotoğraf eklendi');
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    toast.success('Fotoğraf kaldırıldı');
  };

  const handleAddSpecification = () => {
    if (!newSpec.key.trim() || !newSpec.value.trim()) {
      toast.error('Lütfen özellik adı ve değerini girin');
      return;
    }
    setSpecifications([...specifications, { spec_key: newSpec.key, spec_value: newSpec.value }]);
    setNewSpec({ key: '', value: '' });
    toast.success('Özellik eklendi');
  };

  const handleRemoveSpecification = (index: number) => {
    setSpecifications(specifications.filter((_, i) => i !== index));
    toast.success('Özellik kaldırıldı');
  };

  const handleSave = () => {
    // Validasyon
    if (!formData.title.trim()) {
      toast.error('Ürün başlığı gerekli');
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error('Geçerli bir fiyat girin');
      return;
    }

    // Kaydet
    onSave({
      ...formData,
      price: parseFloat(formData.price),
      warranty: formData.warranty || 'Garanti Yok',
      images,
      specifications,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">Ürün Düzenle</span>
            <span className="text-sm text-gray-500">#{product?.id}</span>
          </DialogTitle>
          <DialogDescription>
            Ürün bilgilerini düzenleyin ve güncelleyin
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* TEMEL BİLGİLER */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-4 text-[#1e3a8a]">Temel Bilgiler</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Ürün Başlığı *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Samsung Buzdolabı..."
                />
              </div>
              <div>
                <Label>Fiyat (₺) *</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="15000"
                />
              </div>
              <div>
                <Label>Ürün Durumu</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                >
                  {CONDITION_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Garanti Süresi</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.warranty}
                  onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
                >
                  <option value="Garanti Yok">Garanti Yok</option>
                  <option value="3 Ay">3 Ay</option>
                  <option value="6 Ay">6 Ay</option>
                  <option value="1 Yıl">1 Yıl</option>
                  <option value="2 Yıl">2 Yıl</option>
                  <option value="3 Yıl">3 Yıl</option>
                </select>
              </div>
              <div>
                <Label>Durum</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  {STATUS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <Label>Açıklama</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ürün açıklaması..."
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* FOTOĞRAFLAR */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-4 text-[#1e3a8a] flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Ürün Fotoğrafları ({images.length})
            </h3>

            {/* Mevcut Fotoğraflar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {images.map((imgUrl, index) => (
                <div key={index} className="relative group">
                  <img
                    src={imgUrl}
                    alt={`Ürün ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                  />
                  <button
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-1 left-1 bg-black/70 text-white px-2 py-0.5 rounded text-xs">
                    #{index + 1}
                  </div>
                </div>
              ))}
            </div>

            {/* Yeni Fotoğraf Ekle */}
            <div className="flex gap-2">
              <Input
                placeholder="Fotoğraf URL'si (Unsplash/başka)"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddImage()}
              />
              <Button onClick={handleAddImage} className="bg-[#f97316] hover:bg-[#ea580c]">
                <Plus className="w-4 h-4 mr-1" />
                Ekle
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 Unsplash URL örneği: https://images.unsplash.com/photo-xxx?w=800
            </p>
          </div>

          {/* ÜRÜN ÖZELLİKLERİ */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-4 text-[#1e3a8a] flex items-center gap-2">
              <Check className="w-5 h-5" />
              Teknik Özellikler ({specifications.length})
            </h3>

            {/* Mevcut Özellikler */}
            <div className="space-y-2 mb-4">
              {specifications.map((spec, index) => (
                <div key={index} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div className="text-sm font-medium text-gray-700">{spec.spec_key}</div>
                    <div className="text-sm text-gray-900">{spec.spec_value}</div>
                  </div>
                  <button
                    onClick={() => handleRemoveSpecification(index)}
                    className="text-red-600 hover:bg-red-100 p-1 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Yeni Özellik Ekle */}
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Özellik Adı (örn: Enerji Sınıfı)"
                value={newSpec.key}
                onChange={(e) => setNewSpec({ ...newSpec, key: e.target.value })}
              />
              <Input
                placeholder="Değer (örn: A+++)"
                value={newSpec.value}
                onChange={(e) => setNewSpec({ ...newSpec, value: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && handleAddSpecification()}
              />
            </div>
            <Button
              onClick={handleAddSpecification}
              className="mt-2 bg-[#f97316] hover:bg-[#ea580c] w-full"
            >
              <Plus className="w-4 h-4 mr-1" />
              Özellik Ekle
            </Button>
          </div>

          {/* KAYDET / İPTAL BUTONLARI */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>
              İptal
            </Button>
            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
              <Check className="w-4 h-4 mr-2" />
              Kaydet
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
