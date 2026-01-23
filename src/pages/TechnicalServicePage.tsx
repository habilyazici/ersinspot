import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, Upload, CheckCircle, Wrench, Image as ImageIcon, User, CalendarCheck, Eye, ArrowRight, ArrowLeft, X, Clock } from 'lucide-react@0.487.0';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { format, addDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner@2.0.3';
import { MultiStepForm } from '../components/MultiStepForm';
import { useAuth } from '../contexts/AuthContext';  // ✅ useAuth eklendi
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

export default function TechnicalServicePage() {
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();  // ✅ useAuth hook'u eklendi
  const [currentStep, setCurrentStep] = useState(1);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [applicationNumber, setApplicationNumber] = useState('');
  const [date, setDate] = useState<Date>();
  const [images, setImages] = useState<string[]>([]); // Upload edilmiş fotoğrafların URL'leri
  const [uploadingImages, setUploadingImages] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [busySlots, setBusySlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [formData, setFormData] = useState({
    // Adım 1: Cihaz Bilgileri
    deviceType: '',
    customDeviceType: '', // "Diğer" seçildiğinde kullanılacak
    brand: '',
    model: '',
    warrantyStatus: '',
    problem: '',
    problemCategory: '',
    // Adım 3: Randevu
    preferredTime: '',
    // Adım 4: İletişim Bilgileri
    name: '',
    phone: '',
    email: '',
    // ✅ PARÇALI ADRES SİSTEMİ
    district: '',        // İlçe
    neighborhood: '',    // Mahalle
    street: '',         // Sokak
    building_no: '',    // Bina No
    apartment_no: '',   // Daire No
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
          // Form bilgilerini otomatik doldur
          setFormData(prev => ({
            ...prev,
            name: data.customer.name || '',
            phone: data.customer.phone || '',
            email: data.customer.email || user.email || '',
            district: data.customer.district || '',
            neighborhood: data.customer.neighborhood || '',
            street: data.customer.street || '',
            building_no: data.customer.building_no || '',
            apartment_no: data.customer.apartment_no || '',
          }));
        }
      } catch (error) {
        console.error('Error loading customer info:', error);
      }
    };

    loadCustomerInfo();
  }, [user, accessToken]);

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
          const timeSlots = ['09:00 - 11:00', '11:00 - 13:00', '13:00 - 15:00', '15:00 - 17:00', '17:00 - 19:00'];
          setAvailableSlots(timeSlots);
          setBusySlots([]);
        }
      } catch (error) {
        console.error('Error fetching available slots:', error);
        const timeSlots = ['09:00 - 11:00', '11:00 - 13:00', '13:00 - 15:00', '15:00 - 17:00', '17:00 - 19:00'];
        setAvailableSlots(timeSlots);
        setBusySlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchAvailableSlots();
  }, [date, accessToken]);

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

  const steps = [
    { id: 1, title: 'Cihaz Bilgileri', icon: Wrench },
    { id: 2, title: 'Fotoğraf/Video', icon: ImageIcon },
    { id: 3, title: 'Randevu Seçimi', icon: CalendarCheck },
    { id: 4, title: 'İletişim', icon: User },
    { id: 5, title: 'Önizleme', icon: Eye },
  ];

  const deviceTypes = ['Buzdolabı', 'Çamaşır Makinesi', 'Bulaşık Makinesi', 'Fırın', 'Ocak', 'Televizyon', 'Bilgisayar', 'Klima', 'Diğer'];
  const timeSlots = ['09:00 - 11:00', '11:00 - 13:00', '13:00 - 15:00', '15:00 - 17:00', '17:00 - 19:00'];
  
  // 🕒 Geçmiş saat kontrolü - Bugün seçilmişse geçmiş saatleri devre dışı bırak
  const isTimeSlotDisabled = (slot: string) => {
    if (!date) return false;
    
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    if (!isToday) return false; // Gelecek tarihse tüm saatler aktif
    
    // Saat aralığının BİTİŞ saatini al (örn: "09:00 - 11:00" -> "11:00")
    const slotEndTime = slot.split(' - ')[1];
    const [hours, minutes] = slotEndTime.split(':').map(Number);
    
    const slotEndDate = new Date(today);
    slotEndDate.setHours(hours, minutes, 0, 0);
    
    // Eğer saat aralığının bitişi geçmişse devre dışı bırak
    return slotEndDate < today;
  };
  const warrantyStatuses = ['Garantili', 'Garanti Dışı', 'Bilmiyorum'];
  const problemCategories = ['Çalışmıyor', 'Ses Yapıyor', 'Sızdırıyor', 'Isınmıyor', 'Soğutmuyor', 'Diğer'];

  // ✅ Fotoğraf upload fonksiyonu - gerçek Supabase Storage'a yükler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    console.log('[IMAGE UPLOAD] 📤 Starting upload for', files.length, 'files');

    // Maksimum 10 fotoğraf kontrolü
    const remainingSlots = 10 - images.length;
    if (remainingSlots <= 0) {
      toast.error('En fazla 10 fotoğraf yükleyebilirsiniz');
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    console.log('[IMAGE UPLOAD] 📊 Will upload', filesToUpload.length, 'files (remaining slots:', remainingSlots, ')');
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
                `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/technical-service/upload-image`,
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
                console.error('[IMAGE UPLOAD] ❌ Upload failed:', response.status, errorData);
                throw new Error(errorData.error || errorData.details || 'Fotoğraf yüklenemedi');
              }

              const data = await response.json();
              console.log('[IMAGE UPLOAD] ✅ Upload response:', data);
              
              if (!data.url) {
                throw new Error('URL not received from server');
              }
              
              resolve(data.url);
            } catch (error: any) {
              console.error('Upload error:', error);
              reject(error);
            }
          };
          reader.readAsDataURL(file);
        });
      });

      const urls = await Promise.all(uploadPromises);
      console.log('[IMAGE UPLOAD] ✅ All uploads completed. URLs:', urls);
      console.log('[IMAGE UPLOAD] 📊 Total images after upload:', images.length + urls.length);
      setImages([...images, ...urls]);
      toast.success(`${urls.length} fotoğraf başarıyla yüklendi`, {
        description: 'Fotoğraflar görüntüleniyor...'
      });
    } catch (error: any) {
      console.error('[IMAGE UPLOAD] ❌ Upload error:', error);
      toast.error('Fotoğraflar yüklenirken bir hata oluştu', {
        description: error.message || 'Lütfen tekrar deneyin veya konsolu kontrol edin'
      });
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
    if (stepId === 2) return formData.deviceType && formData.brand && formData.problem;
    if (stepId === 3) return formData.deviceType && formData.brand && formData.problem; // Step 1 tamamlanmalı
    if (stepId === 4) return formData.deviceType && formData.brand && formData.problem && date && formData.preferredTime;
    if (stepId === 5) return formData.deviceType && formData.brand && formData.problem && date && formData.preferredTime && formData.name && formData.phone && formData.district && formData.street;
    return false;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.deviceType || !formData.brand || !formData.problem) {
        toast.error('Lütfen cihaz bilgilerini doldurun.');
        return;
      }
      // "Diğer" seçildiyse custom device type zorunlu
      if (formData.deviceType === 'Diğer' && !formData.customDeviceType.trim()) {
        toast.error('Lütfen cihaz türünü belirtin.');
        return;
      }
    } else if (currentStep === 3) {
      if (!date || !formData.preferredTime) {
        toast.error('Lütfen randevu bilgilerini seçin.');
        return;
      }
    } else if (currentStep === 4) {
      if (!formData.name || !formData.phone || !formData.district || !formData.street) {
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
      toast.error('Lütfen randevu tarihi seçiniz');
      return;
    }
    
    if (!formData.preferredTime) {
      toast.error('Lütfen randevu saati seçiniz');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // GİRİŞ KONTROLÜ - Kullanıcı giriş yapmış mı?
      if (!user || !accessToken) {
        toast.error('Teknik servis talebi oluşturmak için lütfen giriş yapın');
        setIsSubmitting(false);
        return;
      }
      
      // ✅ Fotoğraflar zaten yüklenmiş durumda (images state'inde URL'ler var)
      console.log('[TECHNICAL SERVICE] 📸 Photos in state:', images);
      console.log('[TECHNICAL SERVICE] 📸 Number of photos:', images.length);
      
      // 🏠 Adres bilgilerini customer tablosuna kaydet (eğer boşsa)
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
          
          // Boş olan adres alanlarını güncelle
          const updateData: any = {};
          
          if (!customer.district && formData.district) {
            updateData.district = formData.district;
          }
          if (!customer.neighborhood && formData.neighborhood) {
            updateData.neighborhood = formData.neighborhood;
          }
          if (!customer.street && formData.street) {
            updateData.street = formData.street;
          }
          if (!customer.building_no && formData.building_no) {
            updateData.building_no = formData.building_no;
          }
          if (!customer.apartment_no && formData.apartment_no) {
            updateData.apartment_no = formData.apartment_no;
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
            console.log('[TECHNICAL SERVICE] Customer address updated:', updateData);
          }
        }
      } catch (error) {
        console.error('[TECHNICAL SERVICE] Error updating customer address:', error);
        // Hata olsa bile devam et, adres güncellemesi critical değil
      }
      
      // Teknik servis talebi verilerini hazırla
      const fullAddress = [
        formData.neighborhood,
        formData.street,
        formData.building_no && `No: ${formData.building_no}`,
        formData.apartment_no && `Daire: ${formData.apartment_no}`
      ].filter(Boolean).join(', ');

      const serviceData = {
        productType: formData.deviceType === 'Diğer' ? formData.customDeviceType : formData.deviceType,
        productBrand: formData.brand,
        productModel: formData.model || '',
        warrantyStatus: formData.warrantyStatus || '',
        problemDescription: formData.problem,
        problemCategory: formData.problemCategory || '',
        preferredDate: format(date, 'yyyy-MM-dd'),
        preferredTime: formData.preferredTime,
        serviceAddress: fullAddress,
        serviceCity: 'İzmir',
        serviceDistrict: formData.district,
        serviceNeighborhood: formData.neighborhood || '',
        serviceStreet: formData.street || '',
        serviceBuildingNo: formData.building_no || '',
        serviceApartmentNo: formData.apartment_no || '',
        customerNotes: '',
        photos: images,
      };
      
      // Backend'e gönder (YENİ ENDPOINT)
      console.log('[TECHNICAL SERVICE] 📤 Sending request to backend:', serviceData);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/technical-service/request`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`, // User token ile
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(serviceData),
        }
      );
      
      console.log('[TECHNICAL SERVICE] 📥 Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[TECHNICAL SERVICE] ❌ Error response:', errorData);
        throw new Error(errorData.details || errorData.error || 'Teknik servis talebi oluşturulamadı');
      }
      
      const result = await response.json();
      console.log('[TECHNICAL SERVICE] ✅ Success response:', result);
      
      if (result.success && result.requestNumber) {
        // Talep numarasını kaydet
        setApplicationNumber(result.requestNumber);
        
        // Başarı ekranına geç
        setStep('success');
        window.scrollTo(0, 0);
        setTimeout(() => window.scrollTo(0, 0), 100);
        
        toast.success('✅ Teknik servis talebiniz başarıyla oluşturuldu!', {
          description: 'Talebiniz inceleniyor. Kısa süre içinde size fiyat teklifi göndereceğiz.',
        });
      } else {
        throw new Error('Teknik servis talebi oluşturulamadı');
      }
    } catch (error: any) {
      console.error('Teknik servis talebi oluşturma hatası:', error);
      toast.error(error.message || 'Teknik servis talebi oluşturulurken bir hata oluştu');
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
                <h1 className="text-blue-800 mb-4">🔧 Randevu Talebiniz Alındı!</h1>
                <div className="inline-block bg-white px-6 py-3 rounded-lg shadow-md mb-6">
                  <p className="text-sm text-gray-600 mb-1">Randevu Numaranız</p>
                  <p className="text-2xl font-bold text-[#1e3a8a]">{applicationNumber}</p>
                </div>
                
                {/* Süreç Açıklaması */}
                <div className="bg-orange-50 border-2 border-orange-200 p-8 rounded-lg mb-6 text-left">
                  <h3 className="font-medium text-[#f97316] mb-6 flex items-center gap-2 text-lg">
                    <Wrench className="w-5 h-5" />
                    📌 Randevu Süreci Nasıl İşler?
                  </h3>
                  <div className="space-y-6 text-base text-gray-700 leading-relaxed">
                    <div className="flex gap-4">
                      <span className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                      <p className="pt-1"><strong className="text-gray-900">Randevu İnceleme:</strong> Ekibimiz cihazınızın durumunu ve arızasını değerlendirecek.</p>
                    </div>
                    <div className="flex gap-4">
                      <span className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                      <p className="pt-1"><strong className="text-gray-900">Fiyat Teklifi:</strong> Size özel bir fiyat teklifi hazırlanacak ve tarafınıza sunulacak.</p>
                    </div>
                    <div className="flex gap-4">
                      <span className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                      <p className="pt-1"><strong className="text-gray-900">Onay Aşaması:</strong> Belirlenen fiyatı <Link to="/hesabim/teknik-servis" className="text-[#f97316] font-bold hover:text-[#ea580c] underline cursor-pointer transition-colors">Profil → Teknik Servis Taleplerim</Link> sayfasından görüntüleyip onaylayabilir veya reddedebilirsiniz.</p>
                    </div>
                    <div className="flex gap-4">
                      <span className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                      <p className="pt-1"><strong className="text-gray-900">Teknik Servis Gerçekleştirme:</strong> Teklifinizi onaylarsanız, belirlediğiniz tarih ve saatte profesyonel teknisyenimiz adresinize gelecek ve cihazınızı tamir edecektir.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-5 rounded-lg mb-6">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Önemli:</strong> Fiyat teklifimiz hazırlandıktan sonra size bildirim gönderilecektir. 
                    Randevunuzun durumunu profil sayfanızdan takip edebilirsiniz.
                  </p>
                </div>
                
                <p className="text-gray-700 max-w-xl mx-auto">
                  En kısa sürede size fiyat teklifi hazırlayıp bildirim göndereceğiz. İlginiz için teşekkür ederiz! 🙏
                </p>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={() => navigate('/')} className="flex-1 bg-[#1e3a8a] hover:bg-[#1e3a8a]/90" size="lg">
                Ana Sayfaya Dön
              </Button>
              <Button onClick={() => navigate('/hesabim/teknik-servis')} className="flex-1 bg-[#f97316] hover:bg-[#ea580c]" size="lg">
                Randevularımı Görüntüle
              </Button>
              <Button variant="outline" onClick={() => { setStep('form'); setCurrentStep(1); }} className="flex-1" size="lg">
                Yeni Randevu Al
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
            <h1 className="text-3xl md:text-4xl font-semibold mb-4 text-[#1e3a8a]">
              Teknik Servis Randevusu
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Cihazınız için hızlı ve profesyonel teknik servis hizmeti alın
            </p>
          </div>

          <MultiStepForm 
            steps={steps} 
            currentStep={currentStep}
            onStepClick={(stepId) => canNavigateToStep(stepId) && setCurrentStep(stepId)}
            canNavigate={canNavigateToStep}
          >
            {/* ADIM 1: Cihaz Bilgileri */}
            {currentStep === 1 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="mb-6">Cihaz Bilgileri</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="deviceType" className="mb-2 block">Cihaz Türü *</Label>
                      <Select value={formData.deviceType} onValueChange={(value) => setFormData({ ...formData, deviceType: value, customDeviceType: value === 'Diğer' ? formData.customDeviceType : '' })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seçiniz" />
                        </SelectTrigger>
                        <SelectContent>
                          {deviceTypes.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* "Diğer" seçilirse custom input göster */}
                    {formData.deviceType === 'Diğer' && (
                      <div>
                        <Label htmlFor="customDeviceType" className="mb-2 block">Cihaz Türünü Belirtin *</Label>
                        <Input 
                          id="customDeviceType" 
                          placeholder="Cihaz türünü giriniz..." 
                          value={formData.customDeviceType} 
                          onChange={(e) => setFormData({ ...formData, customDeviceType: e.target.value })}
                          className="transition-all"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="brand" className="mb-2 block">Marka *</Label>
                        <Input id="brand" placeholder="Örn: Samsung" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor="model" className="mb-2 block">Model</Label>
                        <Input id="model" placeholder="Örn: WW90" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="warrantyStatus" className="mb-2 block">Garanti Durumu</Label>
                        <Select value={formData.warrantyStatus} onValueChange={(value) => setFormData({ ...formData, warrantyStatus: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seçiniz" />
                          </SelectTrigger>
                          <SelectContent>
                            {warrantyStatuses.map((status) => (
                              <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="problemCategory" className="mb-2 block">Sorun Kategorisi</Label>
                        <Select value={formData.problemCategory} onValueChange={(value) => setFormData({ ...formData, problemCategory: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seçiniz" />
                          </SelectTrigger>
                          <SelectContent>
                            {problemCategories.map((category) => (
                              <SelectItem key={category} value={category}>{category}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="problem" className="mb-2 block">Sorun Açıklaması *</Label>
                      <Textarea id="problem" rows={6} placeholder="Cihazınızdaki sorunu detaylı açıklayın..." value={formData.problem} onChange={(e) => setFormData({ ...formData, problem: e.target.value })} className="min-h-[150px]" />
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

            {/* ADIM 2: Fotoğraf/Video */}
            {currentStep === 2 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="mb-6">Cihaz Fotoğrafları (Opsiyonel)</h2>
                  <p className="text-sm text-gray-600 mb-6">
                    Cihazınızın ve sorunun fotoğraflarını yükleyerek daha hızlı ve doğru fiyat teklifi alabilirsiniz.
                  </p>
                  
                  <div className="space-y-4">
                    {/* Yüklü Fotoğraflar */}
                    {images.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {images.map((url, index) => (
                          <div key={index} className="relative group">
                            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
                              <ImageWithFallback 
                                src={url} 
                                alt={`Fotoğraf ${index + 1}`} 
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <button 
                              onClick={() => removeImage(index)} 
                              className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                              type="button"
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
                          id="files" 
                          accept="image/*" 
                          multiple 
                          onChange={handleImageUpload} 
                          className="hidden" 
                          disabled={uploadingImages}
                        />
                        <Label htmlFor="files">
                          <div className={`border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-[#f97316] hover:bg-orange-50 transition-all ${uploadingImages ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <Upload className={`w-12 h-12 text-gray-400 mx-auto mb-4 ${uploadingImages ? 'animate-pulse' : ''}`} />
                            <p className="text-gray-700 mb-2 font-medium">
                              {uploadingImages ? 'Fotoğraflar yükleniyor...' : 'Fotoğraf yüklemek için tıklayın'}
                            </p>
                            <p className="text-sm text-gray-500 mb-1">PNG, JPG - Maksimum 10 fotoğraf</p>
                            <p className="text-sm font-medium text-[#f97316]">{images.length} / 10 fotoğraf yüklendi</p>
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

            {/* ADIM 3: Randevu Seçimi */}
            {currentStep === 3 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="mb-6">Randevu Bilgileri</h2>
                  
                  <div className="space-y-8">
                    {/* Tarih Seçimi */}
                    <div className="space-y-3">
                      <Label className="text-base flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-[#f97316]" />
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
                                const isDisabled = isPastSlot || isBusy;
                                
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

            {/* ADIM 4: İletişim */}
            {currentStep === 4 && (
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
                      <Label htmlFor="address" className="mb-2 block">Servis Adresi *</Label>
                      <Input id="address" placeholder="İzmir içi adresiniz" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                    </div>

                    {/* ✅ PARÇALI ADRES SİSTEMİ */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="district" className="mb-2 block">İlçe *</Label>
                        <Input 
                          id="district" 
                          placeholder="Örn: Buca"
                          value={formData.district} 
                          onChange={(e) => setFormData({ ...formData, district: e.target.value })} 
                        />
                      </div>
                      <div>
                        <Label htmlFor="neighborhood" className="mb-2 block">Mahalle</Label>
                        <Input 
                          id="neighborhood" 
                          placeholder="Örn: Kestel"
                          value={formData.neighborhood} 
                          onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })} 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="street" className="mb-2 block">Sokak *</Label>
                        <Input 
                          id="street" 
                          placeholder="Örn: 100. Yıl Mahallesi"
                          value={formData.street} 
                          onChange={(e) => setFormData({ ...formData, street: e.target.value })} 
                        />
                      </div>
                      <div>
                        <Label htmlFor="building_no" className="mb-2 block">Bina No</Label>
                        <Input 
                          id="building_no" 
                          placeholder="Örn: 10"
                          value={formData.building_no} 
                          onChange={(e) => setFormData({ ...formData, building_no: e.target.value })} 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="apartment_no" className="mb-2 block">Daire No</Label>
                        <Input 
                          id="apartment_no" 
                          placeholder="Örn: 10"
                          value={formData.apartment_no} 
                          onChange={(e) => setFormData({ ...formData, apartment_no: e.target.value })} 
                        />
                      </div>
                    </div>
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

            {/* ADIM 5: Önizleme */}
            {currentStep === 5 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="mb-6">Önizleme & Onay</h2>
                  
                  <div className="space-y-6">
                    {/* Cihaz Bilgileri */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="mb-4 flex items-center gap-2">
                        <Wrench className="w-5 h-5 text-[#f97316]" />
                        Cihaz Bilgileri
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div><span className="text-gray-600">Cihaz:</span> <span className="font-medium">{formData.deviceType === 'Diğer' ? formData.customDeviceType : formData.deviceType}</span></div>
                        <div><span className="text-gray-600">Marka:</span> <span className="font-medium">{formData.brand}</span></div>
                        {formData.model && <div><span className="text-gray-600">Model:</span> <span className="font-medium">{formData.model}</span></div>}
                        <div><span className="text-gray-600">Sorun:</span> <p className="text-sm mt-1">{formData.problem}</p></div>
                      </div>
                    </div>

                    {/* Randevu */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="mb-4 flex items-center gap-2">
                        <CalendarCheck className="w-5 h-5 text-[#f97316]" />
                        Randevu Bilgileri
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div><span className="text-gray-600">Tarih:</span> <span className="font-medium">{date ? format(date, 'PPP', { locale: tr }) : '-'}</span></div>
                        <div><span className="text-gray-600">Saat:</span> <span className="font-medium">{formData.preferredTime}</span></div>
                      </div>
                    </div>

                    {/* İletişim */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-[#f97316]" />
                        İletişim Bilgileri
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div><span className="text-gray-600">Ad Soyad:</span> <span className="font-medium">{formData.name}</span></div>
                        <div><span className="text-gray-600">Telefon:</span> <span className="font-medium">{formData.phone}</span></div>
                        {formData.email && <div><span className="text-gray-600">E-posta:</span> <span className="font-medium">{formData.email}</span></div>}
                        <div><span className="text-gray-600">Adres:</span> <span className="font-medium">{formData.address}</span></div>
                      </div>
                    </div>

                    {images.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="mb-4 flex items-center gap-2">
                          <ImageIcon className="w-5 h-5 text-[#f97316]" />
                          Yüklenen Fotoğraflar ({images.length} adet)
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                          {images.map((url, i) => (
                            <div key={i} className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                              <ImageWithFallback src={url} alt={`Fotoğraf ${i + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between mt-6">
                    <Button variant="outline" onClick={() => setCurrentStep(4)} disabled={isSubmitting}>
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