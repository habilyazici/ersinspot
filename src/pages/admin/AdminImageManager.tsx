import { useState, useEffect, useCallback } from 'react';
import { Upload, Trash2, Copy, CheckCircle2, Image as ImageIcon, AlertCircle } from 'lucide-react@0.487.0';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner@2.0.3';
import { uploadProductImage, deleteProductImage, listProductImages } from '../../lib/imageUpload';
import { AdminLayout } from '../../components/admin/AdminLayout';

interface UploadedImage {
  name: string;
  path: string;
  url: string;
  size: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminImageManager() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Load images on mount
  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    setLoading(true);
    try {
      const result = await listProductImages();
      if (result.success && result.images) {
        setImages(result.images);
        console.log(`✅ Loaded ${result.images.length} images`);
      } else {
        console.error('Failed to load images:', result.error);
        toast.error('Görseller yüklenemedi: ' + result.error);
      }
    } catch (error: any) {
      console.error('Error loading images:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isValidType = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type);
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
      
      if (!isValidType) {
        toast.error(`${file.name}: Sadece JPEG, PNG ve WebP dosyaları yüklenebilir`);
        return false;
      }
      if (!isValidSize) {
        toast.error(`${file.name}: Dosya boyutu 5MB'dan küçük olmalı`);
        return false;
      }
      return true;
    });
    
    setSelectedFiles(validFiles);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Lütfen dosya seçin');
      return;
    }

    setUploading(true);
    const toastId = toast.loading(`${selectedFiles.length} görsel yükleniyor...`);
    let successCount = 0;

    for (const file of selectedFiles) {
      try {
        const result = await uploadProductImage(file);
        if (result.success) {
          successCount++;
        } else {
          console.error(`${file.name} upload failed:`, result.error);
        }
      } catch (error: any) {
        console.error('Upload error:', error);
      }
    }

    setUploading(false);
    setSelectedFiles([]);
    
    // Reset file input
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';

    toast.dismiss(toastId);

    if (successCount > 0) {
      toast.success(`${successCount} görsel başarıyla yüklendi`);
      loadImages(); // Reload images
    } else {
      toast.error('Görseller yüklenemedi');
    }
  };

  const handleDelete = async (image: UploadedImage) => {
    if (!confirm(`"${image.name}" silinsin mi?`)) return;

    const toastId = toast.loading('Görsel siliniyor...');

    try {
      const result = await deleteProductImage(image.path);
      
      toast.dismiss(toastId);
      
      if (result.success) {
        toast.success('Görsel silindi');
        loadImages(); // Reload images
      } else {
        toast.error('Silme başarısız: ' + result.error);
      }
    } catch (error: any) {
      toast.dismiss(toastId);
      console.error('Delete error:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    toast.success('URL kopyalandı');
    
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl text-[#1e3a8a] mb-2">Görsel Yönetimi</h1>
            <p className="text-gray-600">
              Ürün görselleri yükleyin ve yönetin. Yüklenen görsellerin URL'lerini kopyalayarak ürün eklerken kullanabilirsiniz.
            </p>
          </div>
        </div>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Yeni Görsel Yükle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#f97316] transition-colors">
              <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">
                Görselleri sürükleyip bırakın veya seçmek için tıklayın
              </p>
              <p className="text-sm text-gray-500 mb-4">
                JPEG, PNG, WebP • Maksimum 5MB
              </p>
              <input
                id="file-input"
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => document.getElementById('file-input')?.click()}
                variant="outline"
              >
                Dosya Seç
              </Button>
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium text-gray-700">Seçilen Dosyalar ({selectedFiles.length}):</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200">
                      <ImageIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm truncate flex-1">{file.name}</span>
                      <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full bg-[#f97316] hover:bg-[#ea580c]"
                >
                  {uploading ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Yükleniyor...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      {selectedFiles.length} Görseli Yükle
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Images Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Yüklü Görseller ({images.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin text-4xl mb-4">⏳</div>
                <p className="text-gray-600">Görseller yükleniyor...</p>
              </div>
            ) : images.length === 0 ? (
              <div className="text-center py-12">
                <ImageIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">Henüz görsel yüklenmemiş</p>
                <p className="text-sm text-gray-500">Yukarıdaki bölümden görsel yükleyebilirsiniz</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {images.map((image) => (
                  <Card key={image.path} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative aspect-square bg-gray-100">
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <CardContent className="p-3 space-y-2">
                      <div>
                        <p className="text-sm font-medium truncate" title={image.name}>
                          {image.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(image.size)} • {formatDate(image.createdAt)}
                        </p>
                      </div>
                      
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyUrl(image.url)}
                          className="flex-1 text-xs"
                        >
                          {copiedUrl === image.url ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Kopyalandı
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 mr-1" />
                              URL
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(image)}
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>

                      <div className="pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-600 break-all font-mono bg-gray-50 p-2 rounded">
                          {image.url}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm text-blue-900">
                <p className="font-medium">Nasıl Kullanılır?</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Yukarıdaki bölümden ürün görsellerini yükleyin</li>
                  <li>Görsellerin URL'lerini kopyalayın (URL butonu ile)</li>
                  <li>Ürün eklerken veya düzenlerken bu URL'leri kullanın</li>
                  <li>Artık kullanılmayan görselleri silebilirsiniz</li>
                </ol>
                <p className="text-xs text-blue-700 mt-2">
                  💡 <strong>İpucu:</strong> Görselleri açıklayıcı isimlerle yükleyin (örn: samsung-tv-55inch.jpg)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}