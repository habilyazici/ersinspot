import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin, Home, Package, Truck, CheckCircle, Clock, Eye, ArrowRight, ArrowLeft, User, Banknote, Calendar as CalendarIcon, Upload, X, Image as ImageIcon, Plus } from 'lucide-react@0.487.0';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { format, addDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner@2.0.3';
import { MultiStepForm } from '../components/MultiStepForm';
import { useAuth } from '../contexts/AuthContext';  // ✅ useAuth eklendi
import { projectId, publicAnonKey } from '../utils/supabase/info';

export default function MovingServicePage() {
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();  // ✅ useAuth hook'u eklendi
  const [currentStep, setCurrentStep] = useState(1);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [applicationNumber, setApplicationNumber] = useState('');
  const [date, setDate] = useState<Date>();
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [distance, setDistance] = useState(0);
  const [images, setImages] = useState<string[]>([]); // Upload edilmiş fotoğrafların URL'leri
  const [uploadingImages, setUploadingImages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [busySlots, setBusySlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [formData, setFormData] = useState({
    // Adım 1: Taşınma Bilgileri
    fromAddress: '',
    fromFloor: '',
    fromHasElevator: false,
    toAddress: '',
    toFloor: '',
    toHasElevator: false,
    homeSize: '',
    // Adım 2: Eşya Envanteri
    selectedItems: [] as string[],
    customItems: [] as Array<{ name: string; quantity: number }>, // ✅ Özel eşyalar için
    // Adım 3: Fotoğraf (YENİ)
    // Adım 4: Randevu
    preferredTime: '',
    // Adım 5: İletişim
    name: '',
    phone: '',
    email: '',
    notes: ''
  });

  // ✅ Özel eşya ekleme için state
  const [showCustomItemDialog, setShowCustomItemDialog] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemQuantity, setCustomItemQuantity] = useState(1);

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
          // Form bilgilerini otomatik doldur
          setFormData(prev => ({
            ...prev,
            name: data.customer.name || '',
            phone: data.customer.phone || '',
            email: data.customer.email || user.email || '',
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
    if (date && formData.preferredTime) {
      const today = new Date();
      const isToday = date.toDateString() === today.toDateString();
      
      if (isToday) {
        // Saat aralığının başlangıcını al
        const slotStartTime = formData.preferredTime.split(' - ')[0];
        const [hours, minutes] = slotStartTime.split(':').map(Number);
        
        const slotDate = new Date(today);
        slotDate.setHours(hours, minutes, 0, 0);
        
        // Eğer saat geçmişse temizle
        if (slotDate < today) {
          setFormData(prev => ({ ...prev, preferredTime: '' }));
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

  const steps = [
    { id: 1, title: 'Taşınma Bilgileri', icon: MapPin },
    { id: 2, title: 'Eşya Envanteri', icon: Package },
    { id: 3, title: 'Eşya Fotoğrafları', icon: ImageIcon },
    { id: 4, title: 'Randevu Seçimi', icon: CalendarIcon },
    { id: 5, title: 'İletişim', icon: User },
    { id: 6, title: 'Özet', icon: Eye },
  ];

  const homeSizes = ['1+0', '1+1', '2+1', '3+1', '4+1', '5+1'];
  const timeSlots = ['09:00 - 11:00', '11:00 - 13:00', '13:00 - 15:00', '15:00 - 17:00', '17:00 - 19:00'];
  
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
  const furnitureItems = [
    { id: 'fridge', name: 'Buzdolabı', price: 300 },
    { id: 'washing', name: 'Çamaşır Makinesi', price: 200 },
    { id: 'sofa', name: 'Kanepe Takımı', price: 400 },
    { id: 'bed', name: 'Yatak (Çift Kişilik)', price: 250 },
    { id: 'wardrobe', name: 'Gardırop', price: 350 },
    { id: 'table', name: 'Yemek Masası', price: 200 },
    { id: 'tv', name: 'Televizyon', price: 150 },
    { id: 'bookshelf', name: 'Kitaplık', price: 180 },
  ];

  // Fiyat hesaplama
  useEffect(() => {
    let basePrice = 1500; // Temel fiyat
    
    // Ev büyüklüğüne göre
    if (formData.homeSize) {
      const sizeIndex = homeSizes.indexOf(formData.homeSize);
      basePrice += sizeIndex * 500;
    }

    // Kat sayısına göre (asansör yoksa)
    if (!formData.fromHasElevator && formData.fromFloor) {
      const floorNum = parseInt(formData.fromFloor);
      basePrice += floorNum * 100;
    }

    // Eşyalara göre
    const itemsPrice = formData.selectedItems.reduce((total, itemId) => {
      const item = furnitureItems.find(f => f.id === itemId);
      return total + (item?.price || 0);
    }, 0);

    // Mesafe simülasyonu (gerçekte Google Maps API kullanılacak)
    const simulatedDistance = Math.floor(Math.random() * 50) + 10; // 10-60 km arası
    setDistance(simulatedDistance);
    
    // Mesafe başına fiyat
    const distancePrice = simulatedDistance * 15; // km başına 15 TL

    setCalculatedPrice(basePrice + itemsPrice + distancePrice);
  }, [formData.homeSize, formData.fromFloor, formData.fromHasElevator, formData.selectedItems]);

  const toggleItem = (itemId: string) => {
    setFormData({
      ...formData,
      selectedItems: formData.selectedItems.includes(itemId)
        ? formData.selectedItems.filter(id => id !== itemId)
        : [...formData.selectedItems, itemId]
    });
  };

  // ✅ Özel eşya ekleme
  const handleAddCustomItem = () => {
    if (!customItemName.trim()) {
      toast.error('Lütfen eşya adını girin');
      return;
    }
    if (customItemQuantity < 1) {
      toast.error('Miktar en az 1 olmalıdır');
      return;
    }

    setFormData({
      ...formData,
      customItems: [...formData.customItems, { name: customItemName.trim(), quantity: customItemQuantity }]
    });

    // Reset ve kapat
    setCustomItemName('');
    setCustomItemQuantity(1);
    setShowCustomItemDialog(false);
    toast.success('Özel eşya eklendi');
  };

  // ✅ Özel eşya silme
  const removeCustomItem = (index: number) => {
    setFormData({
      ...formData,
      customItems: formData.customItems.filter((_, i) => i !== index)
    });
    toast.success('Eşya silindi');
  };

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
          reader.onerror = () => {
            console.error('[MOVING UPLOAD] FileReader error:', reader.error);
            reject(new Error('Dosya okunamadı'));
          };
          
          reader.onload = async (event) => {
            try {
              const base64String = event.target?.result as string;
              
              if (!base64String) {
                throw new Error('Base64 dönüşümü başarısız');
              }
              
              console.log('[MOVING UPLOAD] Uploading file:', file.name, 'Size:', file.size);
              
              // Backend'e gönder
              const response = await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/moving/upload-image`,
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
                const errorMessage = errorData.details 
                  ? `${errorData.error}: ${errorData.details}` 
                  : errorData.error || 'Fotoğraf yüklenemedi';
                console.error('[MOVING UPLOAD] Error response:', errorData);
                throw new Error(errorMessage);
              }

              const data = await response.json();
              console.log('[MOVING UPLOAD] ✅ Uploaded:', data.url);
              resolve(data.url);
            } catch (error: any) {
              console.error('[MOVING UPLOAD] Upload error:', error);
              reject(error);
            }
          };
          reader.readAsDataURL(file);
        });
      });

      const urls = await Promise.all(uploadPromises);
      setImages([...images, ...urls]);
      toast.success(`${urls.length} fotoğraf başarıyla yüklendi`);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Fotoğraflar yüklenirken bir hata oluştu');
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    toast.success('Fotoğraf silindi');
  };

  const canNavigateToStep = (stepId: number) => {
    if (stepId === 1) return true;
    if (stepId === 2) return formData.fromAddress && formData.toAddress;
    if (stepId === 3) return formData.homeSize && (formData.selectedItems.length > 0 || formData.customItems.length > 0);
    if (stepId === 4) return images.length > 0; // ✅ images kullanılıyor
    if (stepId === 5) return date && formData.preferredTime;
    if (stepId === 6) return formData.name && formData.phone;
    return false;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.fromAddress || !formData.toAddress) {
        toast.error('Lütfen adres bilgilerini doldurun.');
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.homeSize) {
        toast.error('Lütfen ev büyüklüğünü seçin.');
        return;
      }
      if (formData.selectedItems.length === 0 && formData.customItems.length === 0) {
        toast.error('Lütfen en az bir eşya seçin veya özel eşya ekleyin.');
        return;
      }
    } else if (currentStep === 3) {
      if (images.length === 0) {
        toast.error('Lütfen eşya fotoğraflarınızı yükleyin.');
        return;
      }
    } else if (currentStep === 4) {
      if (!date || !formData.preferredTime) {
        toast.error('Lütfen randevu bilgilerini seçin.');
        return;
      }
    } else if (currentStep === 5) {
      if (!formData.name || !formData.phone) {
        toast.error('Lütfen iletişim bilgilerini doldurun.');
        return;
      }
    }
    setCurrentStep(currentStep + 1);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    // Validasyon - try bloğundan ÖNCE
    if (!date) {
      toast.error('Lütfen taşıma tarihi seçiniz');
      return;
    }
    
    if (!formData.preferredTime) {
      toast.error('Lütfen taşıma saati seçiniz');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // GİRİŞ KONTROLÜ - Kullanıcı giriş yapmış mı?
      if (!user || !accessToken) {
        toast.error('Nakliye talebi oluşturmak için lütfen giriş yapın');
        setIsSubmitting(false);
        return;
      }
      
      // ✅ Fotoğraflar zaten yüklenmiş durumda (images state'inde URL'ler var)
      // Artık base64'e çevirmeye gerek yok
      
      // 🏠 İletişim bilgilerini customer tablosuna kaydet (eğer boşsa)
      try {
        // Önce mevcut customer bilgilerini çek
        const customerResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/customers/me`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (customerResponse.ok) {
          const customerData = await customerResponse.json();
          const customer = customerData.customer;
          
          // Boş olan alanları güncelle
          const updateData: any = {};
          
          if (!customer.name && formData.name) {
            updateData.name = formData.name;
          }
          if (!customer.phone && formData.phone) {
            updateData.phone = formData.phone;
          }
          if (!customer.address && formData.fromAddress) {
            // fromAddress'i kaydet (çıkış adresi)
            updateData.address = formData.fromAddress;
          }
          
          // Eğer güncellenecek alan varsa, customer'ı güncelle
          if (Object.keys(updateData).length > 0) {
            await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/customers/me`,
              {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
              }
            );
            console.log('[MOVING SERVICE] Customer info updated:', updateData);
          }
        }
      } catch (error) {
        console.error('[MOVING SERVICE] Error updating customer info:', error);
        // Hata olsa bile devam et, bilgi güncellemesi critical değil
      }
      
      // Nakliye verilerini hazırla (YENİ FORMAT)
      // ✅ Hem hazır eşyalar hem özel eşyalar birleştirildi
      const allItems = [
        // Hazır eşyalar
        ...formData.selectedItems.map(item => ({
          name: item,
          quantity: 1,
          type: 'furniture'
        })),
        // Özel eşyalar
        ...formData.customItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          type: 'custom'
        }))
      ];

      const movingData = {
        fromAddress: formData.fromAddress,
        fromFloor: formData.fromFloor,
        fromHasElevator: formData.fromHasElevator,
        toAddress: formData.toAddress,
        toFloor: formData.toFloor,
        toHasElevator: formData.toHasElevator,
        homeSize: formData.homeSize,
        selectedItems: formData.selectedItems,
        customItems: formData.customItems,
        images: images,
        date: date ? format(date, 'yyyy-MM-dd') : '',
        preferredTime: formData.preferredTime,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        notes: formData.notes || '',
        calculatedPrice: calculatedPrice,
        distance: distance,
      };
      
      // Backend'e gönder (YENİ ENDPOINT)
      console.log('[MOVING FORM] 📤 Sending request with data:', movingData);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/moving/request`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`, // User token ile
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(movingData),
        }
      );
      
      console.log('[MOVING FORM] 📥 Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[MOVING FORM] ❌ Error response:', errorData);
        const errorMessage = errorData.details 
          ? `${errorData.error}: ${errorData.details}` 
          : errorData.error || 'Nakliye talebi oluşturulamadı';
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      
      if (result.success && result.requestNumber) {
        // Talep numarasını kaydet
        setApplicationNumber(result.requestNumber);
        
        // Başarı ekranına geç
        setStep('success');
        window.scrollTo(0, 0);
        setTimeout(() => window.scrollTo(0, 0), 100);
        
        toast.success('✅ Nakliye talebiniz başarıyla oluşturuldu!', {
          description: 'Talebiniz inceleniyor. Kısa süre içinde size fiyat teklifi göndereceğiz.',
        });
      } else {
        throw new Error('Nakliye talebi oluşturulamadı');
      }
    } catch (error: any) {
      console.error('Nakliye talebi oluşturma hatası:', error);
      toast.error(error.message || 'Nakliye talebi oluşturulurken bir hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-gray-50 py-16 pt-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <Card className="mb-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-12 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <CheckCircle className="w-16 h-16 text-white" />
                </div>
                <h1 className="text-green-800 mb-4">📦 Nakliye Talebiniz Alındı!</h1>
                <div className="inline-block bg-white px-6 py-3 rounded-lg shadow-md mb-6">
                  <p className="text-sm text-gray-600 mb-1">Talep Numaranız</p>
                  <p className="text-2xl font-bold text-[#1e3a8a]">{applicationNumber}</p>
                </div>
                
                {/* Süreç Açıklaması */}
                <div className="bg-orange-50 border-2 border-orange-200 p-8 rounded-lg mb-6 text-left">
                  <h3 className="font-medium text-[#f97316] mb-6 flex items-center gap-2 text-lg">
                    <Truck className="w-5 h-5" />
                    📌 Nakliye Süreci Nasıl İşler?
                  </h3>
                  <div className="space-y-6 text-base text-gray-700 leading-relaxed">
                    <div className="flex gap-4">
                      <span className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                      <p className="pt-1"><strong className="text-gray-900">Talep İnceleme:</strong> Ekibimiz talebinizi, eşya fotoğraflarınızı, taşınma detaylarınızı ve randevu bilgilerinizi detaylı şekilde inceleyecek.</p>
                    </div>
                    <div className="flex gap-4">
                      <span className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                      <p className="pt-1"><strong className="text-gray-900">Fiyat Teklifi:</strong> İnceleme sonrasında size özel bir nakliye fiyatı belirlenecek ve talebinize eklenecektir.</p>
                    </div>
                    <div className="flex gap-4">
                      <span className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                      <p className="pt-1"><strong className="text-gray-900">Onay Aşaması:</strong> Belirlenen fiyatı <Link to="/hesabim/nakliye" className="text-[#f97316] font-bold hover:text-[#ea580c] underline cursor-pointer transition-colors">Profil → Nakliye Taleplerim</Link> sayfasından görüntüleyip onaylayabilir veya reddedebilirsiniz.</p>
                    </div>
                    <div className="flex gap-4">
                      <span className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                      <p className="pt-1"><strong className="text-gray-900">Nakliye Gerçekleştirme:</strong> Teklifinizi onaylarsanız, belirlediğiniz tarih ve saatte profesyonel ekibimiz adresinize gelecek ve nakliyenizi gerçekleştirecektir.</p>
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-700 max-w-xl mx-auto">
                  En kısa sürede talebinizi inceleyip fiyat teklifi sunacağız. İlginiz için teşekkür ederiz! 🙏
                </p>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={() => navigate('/')} className="flex-1 bg-[#1e3a8a] hover:bg-[#1e3a8a]/90" size="lg">
                Ana Sayfaya Dön
              </Button>
              <Button onClick={() => navigate('/hesabim/nakliye')} className="flex-1 bg-[#f97316] hover:bg-[#ea580c]" size="lg">
                Taleplerimi Görüntüle
              </Button>
              <Button variant="outline" onClick={() => { setStep('form'); setCurrentStep(1); }} className="flex-1" size="lg">
                Yeni Talep Oluştur
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
            <h1 className="text-3xl md:text-4xl font-semibold mb-4 text-[#7FA99B]">
              Nakliye Hizmeti
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Profesyonel ekibimiz ile güvenli ve hızlı taşıma hizmeti
            </p>
          </div>

          <MultiStepForm 
            steps={steps} 
            currentStep={currentStep}
            onStepClick={(stepId) => canNavigateToStep(stepId) && setCurrentStep(stepId)}
            canNavigate={canNavigateToStep}
          >
            {/* ADIM 1: Taşınma Bilgileri */}
            {currentStep === 1 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="mb-6">Taşınma Bilgileri</h2>
                  
                  <div className="space-y-8">
                    {/* NEREDEN (Mevcut Adres) */}
                    <div className="border-2 border-orange-200 rounded-lg p-5 bg-orange-50/30">
                      <h3 className="font-medium text-[#f97316] mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        Nereden (Mevcut Adres)
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="fromAddress" className="mb-2 block">Adres *</Label>
                          <Input
                            id="fromAddress"
                            placeholder="Başlangıç adresiniz"
                            value={formData.fromAddress}
                            onChange={(e) => setFormData({ ...formData, fromAddress: e.target.value })}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="fromFloor" className="mb-2 block">Kat</Label>
                            <Input
                              id="fromFloor"
                              type="number"
                              placeholder="0"
                              value={formData.fromFloor}
                              onChange={(e) => setFormData({ ...formData, fromFloor: e.target.value })}
                            />
                          </div>
                          <div className="flex items-end">
                            <div className="flex items-center space-x-2 pb-2">
                              <Checkbox
                                id="fromElevator"
                                checked={formData.fromHasElevator}
                                onCheckedChange={(checked) => setFormData({ ...formData, fromHasElevator: checked as boolean })}
                              />
                              <Label htmlFor="fromElevator" className="cursor-pointer text-sm">
                                Asansör var
                              </Label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* NEREYE (Yeni Adres) */}
                    <div className="border-2 border-blue-200 rounded-lg p-5 bg-blue-50/30">
                      <h3 className="font-medium text-[#1e3a8a] mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        Nereye (Yeni Adres)
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="toAddress" className="mb-2 block">Adres *</Label>
                          <Input
                            id="toAddress"
                            placeholder="Taşınacağınız adres"
                            value={formData.toAddress}
                            onChange={(e) => setFormData({ ...formData, toAddress: e.target.value })}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="toFloor" className="mb-2 block">Kat</Label>
                            <Input
                              id="toFloor"
                              type="number"
                              placeholder="0"
                              value={formData.toFloor}
                              onChange={(e) => setFormData({ ...formData, toFloor: e.target.value })}
                            />
                          </div>
                          <div className="flex items-end">
                            <div className="flex items-center space-x-2 pb-2">
                              <Checkbox
                                id="toElevator"
                                checked={formData.toHasElevator}
                                onCheckedChange={(checked) => setFormData({ ...formData, toHasElevator: checked as boolean })}
                              />
                              <Label htmlFor="toElevator" className="cursor-pointer text-sm">
                                Asansör var
                              </Label>
                            </div>
                          </div>
                        </div>
                      </div>
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

            {/* ADIM 2: Eşya Envanteri */}
            {currentStep === 2 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="mb-6">Eşya Envanteri</h2>
                  
                  {/* EV BÜYÜKLÜĞÜ - Taşınma Bilgileri'nden buraya taşındı */}
                  <div className="mb-6 pb-6 border-b">
                    <Label htmlFor="homeSize" className="mb-2 block">Ev Büyüklüğü *</Label>
                    <Select value={formData.homeSize} onValueChange={(value) => setFormData({ ...formData, homeSize: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seçiniz" />
                      </SelectTrigger>
                      <SelectContent>
                        {homeSizes.map((size) => (
                          <SelectItem key={size} value={size}>{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">Taşınacak eşyalarınızı seçin</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {furnitureItems.map((item) => (
                      <div
                        key={item.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          formData.selectedItems.includes(item.id)
                            ? 'border-[#f97316] bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => toggleItem(item.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={formData.selectedItems.includes(item.id)}
                            onCheckedChange={() => toggleItem(item.id)}
                          />
                          <p className="font-medium">{item.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ✅ ÖZEL EŞYA EKLE BUTONU */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Listede bulamadınız mı?</p>
                        <p className="text-sm text-gray-600 mt-1">Özel eşyalarınızı buradan ekleyebilirsiniz</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCustomItemDialog(true)}
                        className="border-[#f97316] text-[#f97316] hover:bg-orange-50"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Özel Eşya Ekle
                      </Button>
                    </div>
                  </div>

                  {/* ✅ EKLENEN ÖZEL EŞYALAR LİSTESİ */}
                  {formData.customItems.length > 0 && (
                    <div className="mt-6">
                      <p className="font-medium text-gray-900 mb-3">Eklediğiniz Özel Eşyalar:</p>
                      <div className="space-y-2">
                        {formData.customItems.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-orange-50 border border-[#f97316] rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Package className="w-5 h-5 text-[#f97316]" />
                              <div>
                                <p className="font-medium text-gray-900">{item.name}</p>
                                <p className="text-sm text-gray-600">Miktar: {item.quantity}</p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCustomItem(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ✅ ÖZEL EŞYA EKLE DİYALOGU */}
                  {showCustomItemDialog && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-lg">Özel Eşya Ekle</h3>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowCustomItemDialog(false);
                              setCustomItemName('');
                              setCustomItemQuantity(1);
                            }}
                          >
                            <X className="w-5 h-5" />
                          </Button>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="customItemName">Eşya Adı *</Label>
                            <Input
                              id="customItemName"
                              type="text"
                              placeholder="Örn: Tek kişilik baza, Kitap rafı, vb."
                              value={customItemName}
                              onChange={(e) => setCustomItemName(e.target.value)}
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor="customItemQuantity">Miktar *</Label>
                            <Input
                              id="customItemQuantity"
                              type="number"
                              min="1"
                              value={customItemQuantity}
                              onChange={(e) => setCustomItemQuantity(parseInt(e.target.value) || 1)}
                              className="mt-1"
                            />
                          </div>

                          <div className="flex gap-3 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setShowCustomItemDialog(false);
                                setCustomItemName('');
                                setCustomItemQuantity(1);
                              }}
                              className="flex-1"
                            >
                              İptal
                            </Button>
                            <Button
                              type="button"
                              onClick={handleAddCustomItem}
                              className="flex-1 bg-[#f97316] hover:bg-[#ea580c]"
                            >
                              Ekle
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

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

            {/* ADIM 3: Fotoğraf */}
            {currentStep === 3 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="mb-6">Eşya Fotoğrafları</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Eşyalarınızın fotoğraflarını yükleyin. Admin bu fotoğraflara göre fiyat belirleyecektir. (En fazla 10 fotoğraf)
                  </p>
                  
                  <div className="space-y-4">
                    {/* Yüklenen Fotoğraflar */}
                    {images.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {images.map((url, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={url}
                              alt={`Fotoğraf ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Yükleme Alanı */}
                    {images.length < 10 && (
                      <div>
                        <input
                          type="file"
                          id="photoUpload"
                          multiple
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={uploadingImages}
                        />
                        <Label htmlFor="photoUpload">
                          <div className={`border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-[#f97316] transition-colors ${uploadingImages ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <Upload className={`w-12 h-12 text-gray-400 mx-auto mb-4 ${uploadingImages ? 'animate-pulse' : ''}`} />
                            <p className="text-gray-600 mb-2">
                              {uploadingImages ? 'Fotoğraflar yükleniyor...' : 'Fotoğraf yüklemek için tıklayın'}
                            </p>
                            <p className="text-sm text-gray-500">{images.length} / 10 fotoğraf yüklendi</p>
                          </div>
                        </Label>
                      </div>
                    )}
                    
                    {images.length >= 10 && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                        <p className="text-sm text-orange-800">✅ Maksimum fotoğraf sayısına ulaştınız (10/10)</p>
                      </div>
                    )}
                  </div>

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

            {/* ADIM 4: Randevu */}
            {currentStep === 4 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="mb-6">Randevu Bilgileri</h2>
                  
                  <div className="space-y-8">
                    {/* Tarih Seçimi */}
                    <div className="space-y-3">
                      <Label className="text-base flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-[#f97316]" />
                        Randevu Tarihi *
                      </Label>
                      <div className="border-2 border-gray-200 rounded-xl p-4 bg-gradient-to-br from-orange-50/50 to-white hover:border-[#f97316] transition-colors">
                        <CalendarComponent 
                          mode="single" 
                          selected={date} 
                          onSelect={setDate}
                          locale={tr}
                          disabled={(date) => {
                            const day = date.getDay();
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const isPastDate = date < today;
                            
                            // Gelecek 1 aydan sonraki tarihler
                            const oneMonthLater = new Date();
                            oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
                            oneMonthLater.setHours(23, 59, 59, 999);
                            const isTooFarInFuture = date > oneMonthLater;
                            
                            const isWeekend = day === 0 || day === 6; // 0 = Pazar, 6 = Cumartesi
                            return isPastDate || isWeekend || isTooFarInFuture;
                          }}
                          className="mx-auto"
                          classNames={{
                            months: "flex flex-col sm:flex-row gap-3",
                            month: "flex flex-col gap-4",
                            caption: "flex justify-center pt-1 relative items-center mb-3",
                            caption_label: "text-lg font-bold text-[#1e3a8a]",
                            nav: "flex items-center gap-2",
                            nav_button: "h-8 w-8 bg-white border-2 border-gray-200 hover:bg-[#f97316] hover:text-white hover:border-[#f97316] transition-all rounded-lg",
                            nav_button_previous: "absolute left-1",
                            nav_button_next: "absolute right-1",
                            table: "w-full border-collapse",
                            head_row: "flex w-full mb-1",
                            head_cell: "text-gray-600 rounded-md w-10 h-10 font-semibold text-sm flex items-center justify-center",
                            row: "flex w-full mt-1",
                            cell: "relative p-0 text-center focus-within:relative focus-within:z-20 w-10 h-10",
                            day: "h-10 w-10 p-0 font-medium text-sm rounded-lg hover:bg-[#f97316] hover:text-white transition-all aria-selected:bg-[#f97316] aria-selected:text-white",
                            day_selected: "bg-[#f97316] text-white font-bold shadow-lg hover:bg-[#ea580c]",
                            day_today: "bg-blue-100 text-[#1e3a8a] font-bold",
                            day_outside: "text-gray-400 opacity-50",
                            day_disabled: "text-gray-300 opacity-30 line-through cursor-not-allowed",
                            day_hidden: "invisible",
                          }}
                        />
                        {date && (
                          <div className="mt-3 p-3 bg-green-100 border-2 border-green-300 rounded-lg text-center">
                            <p className="text-sm text-green-700">
                              ✅ Seçilen Tarih: <span className="font-bold">{format(date, 'PPP', { locale: tr })}</span>
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-3 text-center">
                          ⚠️ Cumartesi ve Pazar günleri çalışmıyoruz • 📅 Önümüzdeki 1 ay içinde tarih seçebilirsiniz
                        </p>
                      </div>
                    </div>

                    {/* Saat Seçimi - Sadece tarih seçildiğinde göster */}
                    {date && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                        <Label className="text-base flex items-center gap-2">
                          <Clock className="w-5 h-5 text-[#f97316]" />
                          Saat Aralığı Seçin *
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
                                const isAvailable = availableSlots.includes(slot);
                                const isDisabled = isPastSlot || isBusy || !isAvailable;
                                
                                return (
                                  <button
                                    key={slot}
                                    onClick={() => !isDisabled && setFormData({ ...formData, preferredTime: slot })}
                                    disabled={isDisabled}
                                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                                      isDisabled
                                        ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed opacity-50'
                                        : formData.preferredTime === slot
                                        ? 'bg-gradient-to-br from-[#f97316] to-[#ea580c] border-[#f97316] text-white shadow-lg scale-105'
                                        : 'bg-white border-gray-200 hover:border-[#f97316] hover:bg-orange-50'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                        isDisabled
                                          ? 'bg-gray-200'
                                          : formData.preferredTime === slot
                                          ? 'bg-white/20'
                                          : 'bg-orange-100'
                                      }`}>
                                        <Clock className={`w-5 h-5 ${
                                          isDisabled
                                            ? 'text-gray-400'
                                            : formData.preferredTime === slot ? 'text-white' : 'text-[#f97316]'
                                        }`} />
                                      </div>
                                      <div>
                                        <p className={`text-xs mb-0.5 ${
                                          isDisabled
                                            ? 'text-gray-400'
                                            : formData.preferredTime === slot ? 'text-white/80' : 'text-gray-500'
                                        }`}>
                                          {isPastSlot ? 'Geçmiş Saat' : isBusy ? '❌ Dolu' : 'Saat Aralığı'}
                                        </p>
                                        <p className={`font-bold text-sm ${isDisabled ? 'line-through' : ''}`}>{slot}</p>
                                      </div>
                                      {formData.preferredTime === slot && !isDisabled && (
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
                      <Label htmlFor="notes" className="mb-2 block">Notlar (Opsiyonel)</Label>
                      <Input
                        id="notes"
                        placeholder="Örneğin: Özel bir istek veya not"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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

            {/* ADIM 6: Özet */}
            {currentStep === 6 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="mb-6">Randevu Özeti</h2>
                  <p className="text-sm text-gray-600 mb-6">
                    Lütfen bilgilerinizi kontrol edin. Fiyat bilgisi admin tarafından randevu onaylandıktan sonra profil sayfanızda görüntülenebilecektir.
                  </p>
                  
                  <div className="space-y-6">
                    {/* Özet */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-[#f97316]" />
                        Taşınma Bilgileri
                      </h3>
                      <div className="space-y-3">
                        <div className="bg-orange-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Nereden (Mevcut Adres)</p>
                          <p className="font-medium text-sm">{formData.fromAddress}</p>
                          <div className="flex gap-4 mt-1 text-xs text-gray-600">
                            {formData.fromFloor && <span>Kat: {formData.fromFloor}</span>}
                            <span>Asansör: {formData.fromHasElevator ? 'Var' : 'Yok'}</span>
                          </div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Nereye (Yeni Adres)</p>
                          <p className="font-medium text-sm">{formData.toAddress}</p>
                          <div className="flex gap-4 mt-1 text-xs text-gray-600">
                            {formData.toFloor && <span>Kat: {formData.toFloor}</span>}
                            <span>Asansör: {formData.toHasElevator ? 'Var' : 'Yok'}</span>
                          </div>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600">Ev Büyüklüğü:</span> <span className="font-medium">{formData.homeSize}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5 text-[#f97316]" />
                        Taşınacak Eşyalar ({formData.selectedItems.length + formData.customItems.length} adet)
                      </h3>
                      
                      {/* Hazır Eşyalar */}
                      {formData.selectedItems.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs text-gray-500 mb-2 font-medium">Standart Eşyalar:</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {formData.selectedItems.map(id => {
                              const item = furnitureItems.find(f => f.id === id);
                              return item ? <div key={id}>• {item.name}</div> : null;
                            })}
                          </div>
                        </div>
                      )}

                      {/* Özel Eşyalar */}
                      {formData.customItems.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 mb-2 font-medium">Özel Eşyalar:</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {formData.customItems.map((item, index) => (
                              <div key={index}>• {item.name} ({item.quantity} adet)</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="mb-4 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-[#f97316]" />
                        Yüklenen Fotoğraflar ({images.length} adet)
                      </h3>
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                        {images.map((imageUrl, index) => (
                          <img
                            key={index}
                            src={imageUrl}
                            alt={`Fotoğraf ${index + 1}`}
                            className="w-full h-20 object-cover rounded-lg border border-gray-200"
                          />
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="mb-4 flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-[#f97316]" />
                        Randevu
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div><span className="text-gray-600">Tarih:</span> <span className="font-medium">{date ? format(date, 'PPP', { locale: tr }) : '-'}</span></div>
                        <div><span className="text-gray-600">Saat:</span> <span className="font-medium">{formData.preferredTime}</span></div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-[#f97316]" />
                        İletişim
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div><span className="text-gray-600">Ad Soyad:</span> <span className="font-medium">{formData.name}</span></div>
                        <div><span className="text-gray-600">Telefon:</span> <span className="font-medium">{formData.phone}</span></div>
                        {formData.email && <div><span className="text-gray-600">E-posta:</span> <span className="font-medium">{formData.email}</span></div>}
                        {formData.notes && <div><span className="text-gray-600">Notlar:</span> <span className="font-medium">{formData.notes}</span></div>}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between mt-6">
                    <Button variant="outline" onClick={() => setCurrentStep(5)} disabled={isSubmitting}>
                      <ArrowLeft className="mr-2 w-4 h-4" /> Geri
                    </Button>
                    <Button 
                      onClick={handleSubmit} 
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      {!isSubmitting && <CheckCircle className="mr-2 w-4 h-4" />}
                      {isSubmitting ? 'Randevu Oluşturuluyor...' : 'Randevuyu Onayla'}
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