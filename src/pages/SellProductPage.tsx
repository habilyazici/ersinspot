import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Upload, X, CheckCircle, Package, Image as ImageIcon, User, Settings, Eye, ArrowRight, ArrowLeft, Calendar as CalendarIcon, Clock } from 'lucide-react@0.487.0';
import { format, addDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner@2.0.3';
import { MultiStepForm } from '../components/MultiStepForm';
import { useAuth } from '../contexts/AuthContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export default function SellProductPage() {
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();  // ✅ useAuth hook'u eklendi
  const [currentStep, setCurrentStep] = useState(1);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [applicationNumber, setApplicationNumber] = useState('');
  const [images, setImages] = useState<string[]>([]); // Upload edilmiş fotoğrafların URL'leri
  const [estimatedOffer, setEstimatedOffer] = useState(0);
  const [hasWarranty, setHasWarranty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [date, setDate] = useState<Date>();
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [busySlots, setBusySlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [formData, setFormData] = useState({
    // Adım 1: Ürün Bilgileri
    title: '',
    category: '',
    price: '',
    condition: '',
    description: '',
    // Adım 2: Ürün Özellikleri
    brand: '',
    model: '',
    year: '',
    usageYears: '', // Kullanım Süresi
    warranty: '',
    // Adım 3: Fotoğraflar (images state)
    // Adım 4: Randevu Seçimi (YENİ)
    pickupTime: '',
    // Adım 5: İletişim
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  // ✅ Üye ise bilgilerini otomatik doldur
  useEffect(() => {
    const loadCustomerInfo = async () => {
      if (!user || !accessToken) return;

      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/customers/me`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          
          // Adres bilgilerini birleştir: address, district, city
          const addressParts = [];
          if (data.customer.address) addressParts.push(data.customer.address);
          if (data.customer.district) addressParts.push(data.customer.district);
          if (data.customer.city) addressParts.push(data.customer.city);
          const fullAddress = addressParts.join(', ');
          
          // Form bilgilerini otomatik doldur
          setFormData(prev => ({
            ...prev,
            name: data.customer.name || '',
            phone: data.customer.phone || '',
            email: data.customer.email || user.email || '',
            address: fullAddress || '',
          }));
        }
      } catch (error) {
        console.error('Error loading customer info:', error);
      }
    };

    loadCustomerInfo();
  }, [user, accessToken]);

  // 🕒 Tarih değiştiğinde seçili saatin geçerli olup olmadığını kontrol et
  useEffect(() => {
    if (date && formData.pickupTime) {
      const today = new Date();
      const isToday = date.toDateString() === today.toDateString();
      
      if (isToday) {
        // Saat aralığının başlangıcını al
        const slotStartTime = formData.pickupTime.split(' - ')[0];
        const [hours, minutes] = slotStartTime.split(':').map(Number);
        
        const slotDate = new Date(today);
        slotDate.setHours(hours, minutes, 0, 0);
        
        // Eğer saat geçmişse temizle
        if (slotDate < today) {
          setFormData(prev => ({ ...prev, pickupTime: '' }));
          toast.info('Seçtiğiniz saat geçmiş olduğu için temizlendi. Lütfen yeni bir saat seçin.');
        }
      }
    }
  }, [date]);

  // Tarih seçildiğinde müsait saatleri çek
  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!date || !accessToken) return;

      setLoadingSlots(true);
      try {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/admin/available-slots?date=${dateStr}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setAvailableSlots(data.availableSlots || []);
          setBusySlots(data.busySlots || []);
        } else {
          console.error('Failed to fetch available slots');
          // Hata durumunda tüm saatleri göster
          setAvailableSlots(timeSlots);
          setBusySlots([]);
        }
      } catch (error) {
        console.error('Error fetching available slots:', error);
        // Hata durumunda tüm saatleri göster
        setAvailableSlots(timeSlots);
        setBusySlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchAvailableSlots();
  }, [date, accessToken]);

  // 🕒 Geçmiş saat kontrolü - Bugün seçilmişse geçmiş saatleri devre dışı bırak
  const isTimeSlotDisabled = (slot: string) => {
    if (!date) return false;
    
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    if (!isToday) return false; // Gelecek tarihse tüm saatler aktif
    
    // Saat aralığının BİTİŞ saatini al (örn: "10:00 - 12:00" -> "12:00")
    const slotEndTime = slot.split(' - ')[1];
    const [hours, minutes] = slotEndTime.split(':').map(Number);
    
    const slotEndDate = new Date(today);
    slotEndDate.setHours(hours, minutes, 0, 0);
    
    // Eğer saat aralığının bitişi geçmişse devre dışı bırak
    return slotEndDate < today;
  };

  const steps = [
    { id: 1, title: 'Ürün Bilgileri', icon: Package },
    { id: 2, title: 'Ürün Özellikleri', icon: Settings },
    { id: 3, title: 'Fotoğraflar', icon: ImageIcon },
    { id: 4, title: 'Randevu Seçimi', icon: CalendarIcon },
    { id: 5, title: 'İletişim', icon: User },
    { id: 6, title: 'Önizleme', icon: Eye },
  ];

  const timeSlots = ['09:00 - 11:00', '11:00 - 13:00', '13:00 - 15:00', '15:00 - 17:00', '17:00 - 19:00'];

  // ✅ Fotoğraf upload fonksiyonu - gerçek Supabase Storage'a yükler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Maksimum 10 fotoğraf kontrolü
    const remainingSlots = 10 - images.length;
    if (remainingSlots <= 0) {
      toast.error('En fazla 10 fotoğraf yükleyebilirsiniz');
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setUploadingImages(true);

    try {
      const uploadPromises = filesToUpload.map(async (file) => {
        // Dosyayı base64'e çevir
        const reader = new FileReader();
        return new Promise<string>((resolve, reject) => {
          reader.onload = async (event) => {
            try {
              const base64String = event.target?.result as string;
              
              // Backend'e gönder
              const response = await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/sell-requests/upload-image`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${accessToken || publicAnonKey}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    image: base64String,
                    filename: file.name,
                  }),
                }
              );

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Fotoğraf yüklenemedi');
              }

              const data = await response.json();
              resolve(data.url);
            } catch (error: any) {
              reject(error);
            }
          };
          reader.onerror = () => reject(new Error('Dosya okunamadı'));
          reader.readAsDataURL(file);
        });
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setImages([...images, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} fotoğraf başarıyla yüklendi`);
    } catch (error: any) {
      console.error('Fotoğraf yükleme hatası:', error);
      toast.error(error.message || 'Fotoğraflar yüklenirken hata oluştu');
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const canNavigateToStep = (stepId: number) => {
    if (stepId === 1) return true;
    if (stepId === 2) {
      return formData.title && formData.category && formData.price && formData.condition && formData.description;
    }
    if (stepId === 3) {
      return formData.brand && formData.model;
    }
    if (stepId === 4) {
      return images.length >= 5;
    }
    if (stepId === 5) {
      return date && formData.pickupTime;
    }
    if (stepId === 6) {
      return formData.name && formData.phone && formData.address;
    }
    return false;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.title || !formData.category || !formData.price || !formData.condition || !formData.description) {
        toast.error('Lütfen tüm zorunlu alanları doldurun.');
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.brand || !formData.model) {
        toast.error('Lütfen marka ve model bilgilerini girin.');
        return;
      }
    } else if (currentStep === 3) {
      if (images.length < 5) {
        toast.error('En az 5 fotoğraf eklemeniz gerekiyor!');
        return;
      }
    } else if (currentStep === 4) {
      if (!date || !formData.pickupTime) {
        toast.error('Lütfen randevu tarihi ve saati seçin.');
        return;
      }
    } else if (currentStep === 5) {
      if (!formData.name || !formData.phone || !formData.address) {
        toast.error('Lütfen tüm zorunlu iletişim bilgilerini doldurun.');
        return;
      }
    }
    setCurrentStep(currentStep + 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Randevu tarihi formatı: YYYY-MM-DD
      const pickupDate = date ? format(date, 'yyyy-MM-dd') : null;
      
      // Backend'e gönderilecek data
      const requestData = {
        customer: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          district: '', // Opsiyonel
        },
        product: {
          title: formData.title,
          brand: formData.brand,
          model: formData.model,
          year: formData.year ? parseInt(formData.year) : null,
          condition: formData.condition,
          description: formData.description,
          requestedPrice: parseInt(formData.price) || 0,
        },
        images: images, // Fotoğraf URL'leri
        pickup_date: pickupDate, // Ürün alım randevu tarihi
        pickup_time: formData.pickupTime, // Ürün alım randevu saati
      };

      // Backend'e gönder - AccessToken kullan (user_id için gerekli)
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/sell-requests`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken || publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Backend error response:', errorData);
        
        // Special handling for database issues
        if (errorData.code === 'PGRST204' || errorData.message?.includes('schema cache')) {
          toast.error('Veritabanı hatası', {
            description: 'Lütfen sistem yöneticisiyle iletişime geçin',
            duration: 10000
          });
          
          console.error('⚠️ DATABASE ERROR ⚠️', errorData);
          
          throw new Error('Database setup required - check console for details');
        }
        
        const errorMsg = errorData.details 
          ? `${errorData.error}: ${errorData.details}` 
          : errorData.error || 'Talep gönderilemedi';
        throw new Error(errorMsg);
      }

      const result = await response.json();
      
      // Başarılı - request_number'ı al
      setApplicationNumber(result.request.request_number);
      setStep('success');
      toast.success('Ürün satış başvurunuz alındı!');
    } catch (error: any) {
      console.error('Satış talebi gönderilirken hata:', error);
      toast.error(error.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-gray-50 py-16 pt-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <Card className="mb-6 bg-gradient-to-br from-blue-50 to-sky-50 border-blue-200">
              <CardContent className="p-12 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-sky-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <CheckCircle className="w-16 h-16 text-white" />
                </div>
                <h1 className="text-blue-800 mb-4">📋 Satış Talebiniz Alındı!</h1>
                
                {/* Statü Badge */}
                <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full mb-4">
                  <span className="text-xl">🔎</span>
                  <span className="font-semibold">İncelemede</span>
                </div>

                <div className="inline-block bg-white px-6 py-3 rounded-lg shadow-md mb-6">
                  <p className="text-sm text-gray-600 mb-1">Talep Numaranız</p>
                  <p className="text-2xl font-bold text-[#1e3a8a]">{applicationNumber}</p>
                </div>
                
                {/* Süreç Açıklaması */}
                <div className="bg-orange-50 border-2 border-orange-200 p-8 rounded-lg mb-6 text-left">
                  <h3 className="font-medium text-[#f97316] mb-6 flex items-center gap-2 text-lg">
                    <Package className="w-5 h-5" />
                    📌 Satış Süreci Nasıl İşler?
                  </h3>
                  <div className="space-y-6 text-base text-gray-700 leading-relaxed">
                    <div className="flex gap-4">
                      <span className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                      <p className="pt-1"><strong className="text-gray-900">Talep İnceleme:</strong> Ekibimiz ürününüzün fotoğraflarını, durumunu ve talep ettiğiniz fiyatı detaylı şekilde inceleyecek.</p>
                    </div>
                    <div className="flex gap-4">
                      <span className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                      <p className="pt-1"><strong className="text-gray-900">Karar Aşaması:</strong> İnceleme sonrasında ya talep ettiğiniz fiyatı onaylayıp ürününüzü hemen almaya geleceğiz, ya da size özel farklı bir alım fiyatı teklifi sunacağız.</p>
                    </div>
                    <div className="flex gap-4">
                      <span className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                      <p className="pt-1"><strong className="text-gray-900">Onay Bekleme (Farklı Teklif Durumunda):</strong> Eğer farklı bir fiyat teklifi sunduysak, {user ? (<>belirlenen fiyatı <Link to="/hesabim/satis-taleplerim" className="text-[#f97316] font-bold hover:text-[#ea580c] underline cursor-pointer transition-colors">Hesabım → Ürün Satış Taleplerim</Link> sayfasından görüntüleyip onaylayabilir veya reddedebilirsiniz.</>) : 'belirlenen fiyatı size ilettiğimiz telefon/e-posta ile görüntüleyip onaylayabilir veya reddedebilirsiniz.'}</p>
                    </div>
                    <div className="flex gap-4">
                      <span className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                      <p className="pt-1"><strong className="text-gray-900">Ürün Teslimi:</strong> Talep ettiğiniz fiyatı kabul ettiysek direkt gelip alacağız, farklı teklif sunduysak teklifinizi onaylarsanız ürününüzü adresinizden teslim alacağız ve ödemeyi yapacağız.</p>
                    </div>
                  </div>
                </div>

                <p className="text-gray-700 max-w-xl mx-auto mb-4">
                  En kısa sürede talebinizi inceleyip size geri dönüş yapacağız. İlginiz için teşekkür ederiz! 🙏
                </p>

                {/* Üye olmayanlar için bilgilendirme */}
                {!user && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 p-6 rounded-lg mt-6">
                    <h4 className="font-semibold text-[#1e3a8a] mb-3 flex items-center gap-2">
                      💡 Üyelik Avantajı
                    </h4>
                    <p className="text-gray-700 text-sm leading-relaxed mb-4">
                      Hesap oluşturarak tüm taleplerinizi tek yerden takip edebilir, süreç durumunu anlık olarak görebilir ve hızlıca yeni talepler oluşturabilirsiniz.
                    </p>
                    <Button 
                      onClick={() => navigate('/auth?tab=register')}
                      className="w-full bg-[#1e3a8a] hover:bg-[#1e3a8a]/90"
                      size="sm"
                    >
                      🚀 Ücretsiz Hesap Oluştur
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={() => navigate('/')}
                className="flex-1 bg-[#1e3a8a] hover:bg-[#1e3a8a]/90"
                size="lg"
              >
                🏠 Ana Sayfaya Dön
              </Button>
              
              {/* Sadece üyeler için Taleplerimi Görüntüle butonu */}
              {user && (
                <Button 
                  onClick={() => navigate('/hesabim/satis-taleplerim')}
                  className="flex-1 bg-[#f97316] hover:bg-[#ea580c]"
                  size="lg"
                >
                  📋 Taleplerimi Görüntüle
                </Button>
              )}
              
              <Button 
                variant="outline" 
                onClick={() => {
                  setStep('form');
                  setCurrentStep(1);
                  setHasWarranty(false);
                  setDate(undefined);
                  setFormData({
                    title: '', category: '', price: '', condition: '', description: '',
                    brand: '', model: '', year: '', usageYears: '', warranty: '',
                    pickupTime: '',
                    name: '', phone: '', email: '', address: '',
                  });
                  setImages([]);
                  setApplicationNumber('');
                }}
                className="flex-1"
                size="lg"
              >
                ➕ Yeni Talep Oluştur
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 py-12 pt-24">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-semibold mb-4 text-[#8B6F47]">
              Ürün Sat
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              İkinci el ürününüzü satmak için formu adım adım doldurun
            </p>
          </div>

          <MultiStepForm 
            steps={steps} 
            currentStep={currentStep}
            onStepClick={(stepId) => canNavigateToStep(stepId) && setCurrentStep(stepId)}
            canNavigate={canNavigateToStep}
          >
            {/* ADIM 1: Ürün Bilgileri */}
            {currentStep === 1 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="mb-6">Ürün Bilgileri</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="title" className="mb-2 block">İlan Başlığı *</Label>
                      <Input
                        id="title"
                        placeholder="Örn: Samsung Buzdolabı 500 LT"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="category" className="mb-2 block">Kategori *</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => setFormData({ ...formData, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seçiniz" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Beyaz Eşya">Beyaz Eşya</SelectItem>
                            <SelectItem value="Elektronik">Elektronik</SelectItem>
                            <SelectItem value="Mobilya">Mobilya</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="condition" className="mb-2 block">Durum *</Label>
                        <Select
                          value={formData.condition}
                          onValueChange={(value) => setFormData({ ...formData, condition: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seçiniz" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="like_new">Sıfır Gibi</SelectItem>
                            <SelectItem value="good">İyi</SelectItem>
                            <SelectItem value="lightly_used">Az Kullanılmış</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="price" className="mb-2 block">Fiyat (₺) *</Label>
                      <Input
                        id="price"
                        type="number"
                        placeholder="0"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="description" className="mb-2 block">Açıklama *</Label>
                      <Textarea
                        id="description"
                        rows={6}
                        placeholder="Ürününüz hakkında detaylı bilgi verin..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="min-h-[150px]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end mt-6">
                    <Button onClick={handleNext} className="bg-[#f97316] hover:bg-[#ea580c]">
                      İleri <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ADIM 2: Ürün Özellikleri */}
            {currentStep === 2 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="mb-6">Ürün Özellikleri</h2>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="brand" className="mb-2 block">Marka *</Label>
                        <Input
                          id="brand"
                          placeholder="Örn: Samsung"
                          value={formData.brand}
                          onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="model" className="mb-2 block">Model *</Label>
                        <Input
                          id="model"
                          placeholder="Örn: RF50K5920S8"
                          value={formData.model}
                          onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="year" className="mb-2 block">Üretim Yılı</Label>
                        <Input
                          id="year"
                          type="number"
                          placeholder="2020"
                          value={formData.year}
                          onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="usageYears" className="mb-2 block">Kullanım Süresi (Yıl)</Label>
                        <Select
                          value={formData.usageYears}
                          onValueChange={(value) => setFormData({ ...formData, usageYears: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seçiniz" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Hiç Kullanılmadı</SelectItem>
                            <SelectItem value="1">1 Yıl</SelectItem>
                            <SelectItem value="2">2 Yıl</SelectItem>
                            <SelectItem value="3">3 Yıl</SelectItem>
                            <SelectItem value="4">4 Yıl</SelectItem>
                            <SelectItem value="5">5 Yıl</SelectItem>
                            <SelectItem value="6">6 Yıl</SelectItem>
                            <SelectItem value="7">7 Yıl</SelectItem>
                            <SelectItem value="8">8 Yıl</SelectItem>
                            <SelectItem value="9">9 Yıl</SelectItem>
                            <SelectItem value="10">10 Yıl</SelectItem>
                            <SelectItem value="10+">10+ Yıl</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-1">
                          Ürünü kaç yıl kullandığınızı belirtiniz
                        </p>
                      </div>
                    </div>

                    {/* Garanti checkbox ve input */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="hasWarranty"
                          checked={hasWarranty}
                          onCheckedChange={(checked) => {
                            setHasWarranty(checked as boolean);
                            // Eğer garanti yok seçilirse, garanti süresini temizle
                            if (!checked) {
                              setFormData({ ...formData, warranty: '' });
                            }
                          }}
                        />
                        <Label 
                          htmlFor="hasWarranty" 
                          className="font-medium cursor-pointer"
                        >
                          Ürünün garantisi var
                        </Label>
                      </div>

                      {hasWarranty && (
                        <div className="pl-6">
                          <Label htmlFor="warranty" className="mb-2 block">Garanti Süresi (Ay)</Label>
                          <Input
                            id="warranty"
                            type="number"
                            placeholder="6"
                            value={formData.warranty}
                            onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
                            min="1"
                            max="60"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Garanti süresini ay cinsinden giriniz
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between mt-6">
                    <Button variant="outline" onClick={() => setCurrentStep(1)}>
                      <ArrowLeft className="mr-2 w-4 h-4" /> Geri
                    </Button>
                    <Button onClick={handleNext} className="bg-[#f97316] hover:bg-[#ea580c]">
                      İleri <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ADIM 3: Fotoğraflar */}
            {currentStep === 3 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="mb-6">Fotoğraflar (En az 5, En fazla 10) *</h2>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                    {images.map((image, index) => (
                      <div key={index} className="relative aspect-square group">
                        <img
                          src={image}
                          alt={`Ürün ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {images.length < 10 && (
                    <div>
                      <input
                        type="file"
                        id="images"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploadingImages}
                      />
                      <Label htmlFor="images">
                        <div className={`border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-[#f97316] transition-colors ${uploadingImages ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <Upload className={`w-12 h-12 text-gray-400 mx-auto mb-4 ${uploadingImages ? 'animate-pulse' : ''}`} />
                          <p className="text-gray-600 mb-2">
                            {uploadingImages ? 'Fotoğraflar yükleniyor...' : 'Fotoğraf yüklemek için tıklayın'}
                          </p>
                          <p className="text-sm text-gray-500">{images.length} / 10 fotoğraf eklendi</p>
                        </div>
                      </Label>
                    </div>
                  )}

                  {images.length > 0 && images.length < 5 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-4">
                      <p className="text-sm text-orange-800">
                        ⚠️ En az 5 fotoğraf eklemeniz gerekiyor. Şu anda {images.length} fotoğraf eklenmiş.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between mt-6">
                    <Button variant="outline" onClick={() => setCurrentStep(2)}>
                      <ArrowLeft className="mr-2 w-4 h-4" /> Geri
                    </Button>
                    <Button onClick={handleNext} className="bg-[#f97316] hover:bg-[#ea580c]">
                      İleri <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ADIM 4: Randevu Seçimi */}
            {currentStep === 4 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="mb-6">Ürün Alım Randevusu Seçimi</h2>
                  
                  <div className="space-y-6">
                    {/* Randevu Bilgilendirme */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex gap-3">
                        <CalendarIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-blue-900 font-medium mb-1">
                            Ürün Alım Randevusu
                          </p>
                          <p className="text-sm text-blue-700">
                            Ekibimiz, ürününüzü almak için seçeceğiniz tarih ve saatte adresinize gelecektir.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Tarih Seçimi */}
                    <div>
                      <Label className="mb-2 block">Alım Tarihi *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, 'PPP', { locale: tr }) : <span>Tarih seçin</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            disabled={(date) => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const tomorrow = addDays(today, 1);
                              // Hafta sonu kontrolü (0 = Pazar, 6 = Cumartesi)
                              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                              // Geçmiş tarihler ve bugün disabled, yarından itibaren açık (ama hafta sonu hariç)
                              return date < tomorrow || isWeekend;
                            }}
                            locale={tr}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <p className="text-sm text-gray-500 mt-2">
                        💡 Hafta içi günlerde hizmet veriyoruz. En erken yarın için randevu alabilirsiniz.
                      </p>
                    </div>

                    {/* Saat Seçimi */}
                    {date && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                        <Label className="text-base flex items-center gap-2">
                          <Clock className="w-5 h-5 text-[#f97316]" />
                          Alım Saati Seçin *
                        </Label>
                        {loadingSlots ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#f97316]" />
                            <span className="ml-3 text-sm text-gray-600">Müsait saatler yükleniyor...</span>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-2.5">
                              {timeSlots.map((slot) => {
                                const isPastSlot = isTimeSlotDisabled(slot);
                                const isBusy = busySlots.includes(slot);
                                const isDisabled = isPastSlot || isBusy;
                                
                                return (
                                  <button
                                    key={slot}
                                    type="button"
                                    onClick={() => !isDisabled && setFormData({ ...formData, pickupTime: slot })}
                                    disabled={isDisabled}
                                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                                      isDisabled
                                        ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed opacity-50'
                                        : formData.pickupTime === slot
                                        ? 'bg-gradient-to-br from-[#f97316] to-[#ea580c] border-[#f97316] text-white shadow-lg scale-105'
                                        : 'bg-white border-gray-200 hover:border-[#f97316] hover:bg-orange-50'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                        isDisabled
                                          ? 'bg-gray-200'
                                          : formData.pickupTime === slot
                                          ? 'bg-white/20'
                                          : 'bg-orange-100'
                                      }`}>
                                        <Clock className={`w-5 h-5 ${
                                          isDisabled
                                            ? 'text-gray-400'
                                            : formData.pickupTime === slot ? 'text-white' : 'text-[#f97316]'
                                        }`} />
                                      </div>
                                      <div>
                                        <p className={`text-xs mb-0.5 ${
                                          isDisabled
                                            ? 'text-gray-400'
                                            : formData.pickupTime === slot ? 'text-white/80' : 'text-gray-500'
                                        }`}>
                                          {isPastSlot ? 'Geçmiş Saat' : isBusy ? '❌ Dolu' : 'Saat Aralığı'}
                                        </p>
                                        <p className={`font-bold text-sm ${isDisabled ? 'line-through' : ''}`}>{slot}</p>
                                      </div>
                                      {formData.pickupTime === slot && !isDisabled && (
                                        <div className="ml-auto">
                                          <CheckCircle className="w-5 h-5 text-white" />
                                        </div>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                            {busySlots.length > 0 && (
                              <p className="text-xs text-red-600 mt-2 text-center">
                                ⚠️ Gri saatler firmamızın o sıralarda meşgul olduğu zamanlardır
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between mt-6">
                    <Button variant="outline" onClick={() => setCurrentStep(3)}>
                      <ArrowLeft className="mr-2 w-4 h-4" /> Geri
                    </Button>
                    <Button onClick={handleNext} className="bg-[#f97316] hover:bg-[#ea580c]">
                      İleri <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ADIM 5: İletişim */}
            {currentStep === 5 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="mb-6">İletişim Bilgileri</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="name" className="mb-2 block">Ad Soyad *</Label>
                      <Input
                        id="name"
                        placeholder="Ad Soyad"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone" className="mb-2 block">Telefon *</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="05XX XXX XX XX"
                          value={formData.phone}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            if (value.length <= 11) {
                              setFormData({ ...formData, phone: value });
                            }
                          }}
                          pattern="[0-9]{10,11}"
                          title="Geçerli bir telefon numarası giriniz (10-11 hane, sadece rakam)"
                          maxLength={11}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email" className="mb-2 block">E-posta</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="ornek@email.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                          title="Geçerli bir e-posta adresi giriniz (örn: kullanici@ornek.com)"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="address" className="mb-2 block">Adres (İzmir) *</Label>
                      <Input
                        id="address"
                        placeholder="Örn: Buca, Menderes Mahallesi, 1234 Sokak No:5"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between mt-6">
                    <Button variant="outline" onClick={() => setCurrentStep(4)}>
                      <ArrowLeft className="mr-2 w-4 h-4" /> Geri
                    </Button>
                    <Button onClick={handleNext} className="bg-[#f97316] hover:bg-[#ea580c]">
                      İleri <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ADIM 6: Önizleme & Onay */}
            {currentStep === 6 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="mb-6">Önizleme & Onay</h2>
                  
                  <div className="space-y-6">
                    {/* Ürün Bilgileri */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5 text-[#f97316]" />
                        Ürün Bilgileri
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-gray-600">Başlık:</span> <span className="font-medium">{formData.title}</span></div>
                        <div><span className="text-gray-600">Kategori:</span> <span className="font-medium">{formData.category}</span></div>
                        <div><span className="text-gray-600">Durum:</span> <span className="font-medium">{formData.condition === 'like_new' ? 'Sıfır Gibi' : formData.condition === 'good' ? 'İyi' : formData.condition === 'lightly_used' ? 'Az Kullanılmış' : formData.condition}</span></div>
                        <div><span className="text-gray-600">Fiyat:</span> <span className="font-medium text-[#f97316]">{formData.price} ₺</span></div>
                        <div><span className="text-gray-600">Marka:</span> <span className="font-medium">{formData.brand}</span></div>
                        <div><span className="text-gray-600">Model:</span> <span className="font-medium">{formData.model}</span></div>
                        {formData.year && <div><span className="text-gray-600">Üretim Yılı:</span> <span className="font-medium">{formData.year}</span></div>}
                        {formData.usageYears && <div><span className="text-gray-600">Kullanım Süresi:</span> <span className="font-medium">{formData.usageYears === '0' ? 'Hiç Kullanılmadı' : formData.usageYears === '10+' ? '10+ Yıl' : `${formData.usageYears} Yıl`}</span></div>}
                        {formData.warranty && <div><span className="text-gray-600">Garanti:</span> <span className="font-medium">{formData.warranty} ay</span></div>}
                      </div>
                      <div className="mt-3">
                        <span className="text-gray-600 text-sm">Açıklama:</span>
                        <p className="text-sm mt-1">{formData.description}</p>
                      </div>
                    </div>

                    {/* Fotoğraflar */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="mb-4 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-[#f97316]" />
                        Fotoğraflar ({images.length} adet)
                      </h3>
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                        {images.map((image, index) => (
                          <div key={index} className="aspect-square">
                            <img src={image} alt={`${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Randevu Bilgileri */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="mb-4 flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-[#f97316]" />
                        Ürün Alım Randevusu
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-gray-600">Tarih:</span> <span className="font-medium">{date ? format(date, 'PPP', { locale: tr }) : '-'}</span></div>
                        <div><span className="text-gray-600">Saat:</span> <span className="font-medium">{formData.pickupTime || '-'}</span></div>
                      </div>
                    </div>

                    {/* İletişim */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-[#f97316]" />
                        İletişim Bilgileri
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-gray-600">Ad Soyad:</span> <span className="font-medium">{formData.name}</span></div>
                        <div><span className="text-gray-600">Telefon:</span> <span className="font-medium">{formData.phone}</span></div>
                        {formData.email && <div><span className="text-gray-600">E-posta:</span> <span className="font-medium">{formData.email}</span></div>}
                        <div className="col-span-2"><span className="text-gray-600">Adres:</span> <span className="font-medium">{formData.address}</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between mt-6">
                    <Button variant="outline" onClick={() => setCurrentStep(5)}>
                      <ArrowLeft className="mr-2 w-4 h-4" /> Geri
                    </Button>
                    <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700" disabled={isSubmitting}>
                      <CheckCircle className="mr-2 w-4 h-4" /> {isSubmitting ? 'Gönderiliyor...' : 'Başvuruyu Gönder'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </MultiStepForm>
        </div>
      </div>
    </div>
  );
}