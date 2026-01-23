import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowLeft, ArrowRight, CheckCircle, Calendar, Clock, User, MapPin, FileText, CreditCard } from 'lucide-react@0.487.0';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Textarea } from '../components/ui/textarea';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { MultiStepForm } from '../components/MultiStepForm';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { getConditionLabel } from '../utils/productHelpers';

export default function CartPage() {
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const { items: cartItems, removeFromCart, totalPrice } = useCart();
  const [deliveryDate, setDeliveryDate] = useState<Date>();
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [isOutsideBuca, setIsOutsideBuca] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'online' | 'cash'>('bank');
  const [orderNumber, setOrderNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrderTotal, setCompletedOrderTotal] = useState(0); // Tamamlanan sipariş tutarı
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [busySlots, setBusySlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
    city: 'İzmir',
    district: '',
    neighborhood: '',
    street: '',
    building_no: '',
    apartment_no: '',
    notes: '',
    deliveryTime: '',
  });

  const [addressError, setAddressError] = useState('');

  // Giriş kontrolü - giriş yapmamışsa login sayfasına yönlendir
  useEffect(() => {
    if (!user) {
      toast.error('Sepete erişmek için giriş yapmalısınız');
      navigate('/giris', { state: { from: '/sepet' } });
    }
  }, [user, navigate]);

  // Üye ise bilgilerini otomatik doldur
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
          setCustomerInfo({
            name: data.customer.name || '',
            phone: data.customer.phone || '',
            email: data.customer.email || user.email || '',
            city: data.customer.city || 'İzmir',
            district: data.customer.district || '',
            neighborhood: data.customer.neighborhood || '',
            street: data.customer.street || '',
            building_no: data.customer.building_no || '',
            apartment_no: data.customer.apartment_no || '',
            notes: '',
            deliveryTime: '',
          });
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
      if (!deliveryDate || !accessToken) return;

      setLoadingSlots(true);
      try {
        const year = deliveryDate.getFullYear();
        const month = String(deliveryDate.getMonth() + 1).padStart(2, '0');
        const day = String(deliveryDate.getDate()).padStart(2, '0');
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
  }, [deliveryDate, accessToken]);

  const timeSlots = [
    '09:00 - 11:00',
    '11:00 - 13:00',
    '13:00 - 15:00',
    '15:00 - 17:00',
    '17:00 - 19:00',
  ];

  // 🕒 Geçmiş saat kontrolü - Bugün seçilmişse geçmiş saatleri devre dışı bırak
  const isTimeSlotDisabled = (slot: string) => {
    if (!deliveryDate) return false;
    
    const today = new Date();
    const isToday = deliveryDate.toDateString() === today.toDateString();
    
    if (!isToday) return false; // Gelecek tarihse tüm saatler aktif
    
    // Saat aralığının BİTİŞ saatini al (örn: "09:00 - 11:00" -> "11:00")
    const slotEndTime = slot.split(' - ')[1];
    const [hours, minutes] = slotEndTime.split(':').map(Number);
    
    const slotEndDate = new Date(today);
    slotEndDate.setHours(hours, minutes, 0, 0);
    
    // Eğer saat aralığının bitişi geçmişse devre dışı bırak
    return slotEndDate < today;
  };

  // İzmir ilçeleri
  const izmirDistricts = [
    'Buca',
    'Konak',
    'Karşıyaka',
    'Bornova',
    'Çiğli',
    'Gaziemir',
    'Balçova',
    'Narlıdere',
    'Bayraklı',
    'Karabağlar',
    'Güzelbahçe',
    'Menderes',
    'Seferihisar',
    'Urla',
    'Çeşme',
    'Foça',
    'Menemen',
    'Aliağa',
    'Tire',
    'Torbalı',
    'Ödemiş',
  ];

  // Buca dışı taşıma ücreti hesaplama - Mesafeye göre değişken ücret
  const calculateDeliveryFee = (district: string) => {
    if (district === 'Buca') {
      setIsOutsideBuca(false);
      setDeliveryFee(0);
      return;
    }
    
    setIsOutsideBuca(true);
    
    // Mesafeye göre ücretlendirme
    const deliveryFees: Record<string, number> = {
      // Çok yakın ilçeler (500 TL)
      'Karabağlar': 500,
      'Konak': 500,
      'Bornova': 500,
      
      // Yakın ilçeler (700 TL)
      'Gaziemir': 700,
      'Balçova': 700,
      'Narlıdere': 700,
      'Karşıyaka': 700,
      'Bayraklı': 700,
      
      // Orta mesafe ilçeler (900 TL)
      'Çiğli': 900,
      'Güzelbahçe': 900,
      'Menderes': 900,
      'Seferihisar': 900,
      
      // Uzak ilçeler (1100 TL)
      'Torbalı': 1100,
      'Urla': 1100,
      'Kemalpaşa': 1100,
      
      // Çok uzak ilçeler (1300 TL)
      'Çeşme': 1300,
      'Foça': 1300,
      'Menemen': 1300,
      'Aliağa': 1300,
      'Tire': 1300,
      'Ödemiş': 1300,
    };
    
    // İlçeye özel ücret varsa onu kullan, yoksa varsayılan 700 TL
    const fee = deliveryFees[district] || 700;
    setDeliveryFee(fee);
  };

  // Adres validasyonu - Tüm alanlar dolu mu?
  const validateAddress = (): boolean => {
    if (!customerInfo.district) {
      setAddressError('İlçe seçimi zorunludur');
      return false;
    }
    if (!customerInfo.neighborhood || customerInfo.neighborhood.trim().length < 3) {
      setAddressError('Mahalle en az 3 karakter olmalıdır');
      return false;
    }
    if (!customerInfo.street || customerInfo.street.trim().length < 5) {
      setAddressError('Sokak/Cadde en az 5 karakter olmalıdır');
      return false;
    }
    if (!customerInfo.building_no) {
      setAddressError('Bina numarası zorunludur');
      return false;
    }
    setAddressError('');
    return true;
  };

  const steps = [
    { id: 1, title: 'Sepet', icon: ShoppingBag },
    { id: 2, title: 'İletişim', icon: User },
    { id: 3, title: 'Tarih Seçimi', icon: Calendar },
    { id: 4, title: 'Teslimat', icon: MapPin },
    { id: 5, title: 'Onay', icon: CreditCard },
  ];

  const handleNextStep = () => {
    if (currentStep === 1 && cartItems.length === 0) return;
    if (currentStep === 2 && (!customerInfo.name || !customerInfo.phone || !customerInfo.email)) {
      alert('Lütfen tüm zorunlu alanları doldurun');
      return;
    }
    if (currentStep === 3) {
      if (!deliveryDate || !customerInfo.deliveryTime) {
        alert('Lütfen tarih ve saat seçiniz');
        return;
      }
    }
    if (currentStep === 4) {
      // Adres validasyonu kontrolü
      if (!validateAddress()) {
        alert(addressError || 'Lütfen tüm teslimat bilgilerini doldurun');
        return;
      }
    }
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmitOrder = async () => {
    if (isSubmitting) return;
    
    // Validasyon - try bloğundan ÖNCE
    if (!deliveryDate) {
      toast.error('Lütfen teslimat tarihi seçiniz');
      return;
    }
    
    if (!customerInfo.deliveryTime) {
      toast.error('Lütfen teslimat saati seçiniz');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Sipariş verilerini hazırla
      const orderData = {
        customer: {
          name: customerInfo.name,
          phone: customerInfo.phone,
          email: customerInfo.email,
          city: customerInfo.city,
          district: customerInfo.district,
          neighborhood: customerInfo.neighborhood,
          street: customerInfo.street,
          building_no: customerInfo.building_no,
          apartment_no: customerInfo.apartment_no,
        },
        items: cartItems.map(item => ({
          id: item.id,
          name: item.title,
          price: item.price,
          image: item.image,
          condition: item.condition || 'İkinci El',
          category: item.category || '',
          brand: '',
        })),
        delivery: {
          method: isOutsideBuca ? 'Buca Dışı' : 'Buca İçi',
          date: format(deliveryDate, 'yyyy-MM-dd'),
          time: customerInfo.deliveryTime,
          fee: deliveryFee,
        },
        payment: {
          method: paymentMethod, // 'cash', 'bank' veya 'online' olarak backend'e gönder
        },
        notes: customerInfo.notes || '',
      };
      
      // Backend'e gönder
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/orders`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orderData),
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Backend error response:', errorData);
        console.error('❌ Error details:', JSON.stringify(errorData.details, null, 2));
        console.error('❌ Attempted status:', errorData.attemptedStatus);
        throw new Error(errorData.error || 'Sipariş oluşturulamadı');
      }
      
      const result = await response.json();
      
      if (result.success && result.order) {
        // Sipariş numarasını kaydet
        setOrderNumber(result.order.orderNumber);
        
        // LocalStorage'a da kaydet (yedek)
        // Status ödeme metoduna göre belirlenir:
        // - cash (Kapıda Ödeme): order_received (Sipariş Alındı)
        // - bank/online: payment_pending (Ödeme Bekliyor)
        const localOrderStatus = paymentMethod === 'cash' ? 'order_received' : 'payment_pending';
        
        const localOrder = {
          id: result.order.id,
          orderNumber: result.order.orderNumber,
          items: cartItems.map(item => ({
            id: item.id,
            name: item.title,
            price: item.price,
            image: item.image,
            quantity: 1,
          })),
          customer: customerInfo,
          delivery: {
            date: format(deliveryDate, 'yyyy-MM-dd'),
            time: customerInfo.deliveryTime,
            fee: deliveryFee,
          },
          payment: {
            method: paymentMethod,
            total: result.order.total,
          },
          status: localOrderStatus,
          createdAt: new Date().toISOString(),
        };
        
        const existingOrders = JSON.parse(localStorage.getItem('ersinspot-orders') || '[]');
        existingOrders.unshift(localOrder);
        localStorage.setItem('ersinspot-orders', JSON.stringify(existingOrders));
        
        // Toplam tutarı kaydet (sepet temizlenmeden önce)
        setCompletedOrderTotal(totalPrice + deliveryFee);
        
        // Sepeti temizle
        cartItems.forEach(item => removeFromCart(item.id));
        
        // Başarı ekranını göster
        setShowSuccess(true);
        
        // Scroll to top
        window.scrollTo(0, 0);
        setTimeout(() => window.scrollTo(0, 0), 100);
        
        // Toast göster
        toast.success('Siparişiniz başarıyla oluşturuldu!');
      } else {
        throw new Error('Sipariş oluşturulamadı');
      }
    } catch (error: any) {
      console.error('Sipariş oluşturma hatası:', error);
      toast.error(error.message || 'Sipariş oluşturulurken bir hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canNavigateToStep = (stepId: number) => {
    if (stepId === 1) return true;
    if (stepId === 2) return cartItems.length > 0;
    if (stepId === 3) return cartItems.length > 0 && customerInfo.name && customerInfo.phone && customerInfo.email;
    if (stepId === 4) return cartItems.length > 0 && customerInfo.name && customerInfo.phone && customerInfo.email && deliveryDate && customerInfo.deliveryTime;
    if (stepId === 5) return cartItems.length > 0 && customerInfo.name && customerInfo.phone && customerInfo.email && deliveryDate && customerInfo.deliveryTime && customerInfo.district && customerInfo.neighborhood && customerInfo.street && customerInfo.building_no;
    return false;
  };

  // Success screen
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-gray-50 py-16 pt-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {/* Ana Kart - Gradient Border */}
            <Card className="mb-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-12 text-center">
                {/* Success Icon - Gradient */}
                <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <CheckCircle className="w-16 h-16 text-white" />
                </div>

                {/* Title */}
                <h1 className="text-green-800 mb-4">🎉 Siparişiniz Alındı!</h1>

                {/* Sipariş Numarası - Beyaz Kutu */}
                <div className="inline-block bg-white px-6 py-3 rounded-lg shadow-md mb-6">
                  <p className="text-sm text-gray-600 mb-1">Sipariş Numaranız</p>
                  <p className="text-2xl text-[#1e3a8a]">#{orderNumber}</p>
                </div>

                {/* Toplam Tutar - Beyaz Kutu */}
                <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                  <p className="text-sm text-gray-600 mb-2">Toplam Tutar</p>
                  <p className="text-3xl text-[#f97316]">{completedOrderTotal.toLocaleString('tr-TR')} ₺</p>
                  <p className="text-xs text-gray-500 mt-2">KDV Dahil</p>
                </div>

                {/* Açıklama */}
                <div className="text-gray-700 max-w-xl mx-auto mb-8">
                  <p className="mb-2">
                    Siparişiniz başarıyla alındı.
                  </p>
                  {paymentMethod === 'cash' && (
                    <p className="text-sm">
                      Ürünleriniz hazırlanacak ve seçtiğiniz tarihte adresinize teslim edilecektir. <strong className="text-[#f97316]">Ödemeniz teslimat sırasında kapıda alınacaktır.</strong>
                    </p>
                  )}
                  {paymentMethod === 'bank' && (
                    <p className="text-sm">
                      Ödemenizi yaptıktan sonra ürünleriniz hazırlanacak ve seçtiğiniz tarihte tarafınıza teslim edilecektir.
                    </p>
                  )}
                  {paymentMethod === 'online' && (
                    <p className="text-sm">
                      Ödemeniz tamamlandıktan sonra ürünleriniz hazırlanacak ve seçtiğiniz tarihte tarafınıza teslim edilecektir.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Teslimat & Ödeme Bilgileri - Grid */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Teslimat Bilgileri */}
              <Card className="border-[var(--brand-cream-300)]">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-5 h-5 text-[var(--brand-coral-500)]" />
                    <h3 className="text-[var(--brand-bronze-700)]">Teslimat Bilgileri</h3>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-500">Tarih</p>
                        <p className="text-gray-800">{deliveryDate && format(deliveryDate, 'dd MMMM yyyy, EEEE', { locale: tr })}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-500">Saat</p>
                        <p className="text-gray-800">{customerInfo.deliveryTime}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-500">Adres</p>
                        <p className="text-gray-800">
                          {customerInfo.neighborhood}, {customerInfo.street}
                          {customerInfo.building_no && ` No: ${customerInfo.building_no}`}
                          {customerInfo.apartment_no && ` D: ${customerInfo.apartment_no}`}
                        </p>
                        <p className="text-sm text-gray-600">{customerInfo.district} / {customerInfo.city}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ödeme Bilgileri */}
              <Card className="border-[var(--brand-cream-300)]">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="w-5 h-5 text-[var(--brand-coral-500)]" />
                    <h3 className="text-[var(--brand-bronze-700)]">Ödeme Bilgileri</h3>
                  </div>
                  
                  {paymentMethod === 'bank' && (
                    <div className="space-y-3 text-sm">
                      <div className="bg-[var(--brand-cream-50)] p-3 rounded border border-[var(--brand-cream-200)]">
                        <p className="text-xs text-gray-500 mb-1">IBAN:</p>
                        <p className="text-sm text-[var(--brand-bronze-700)]">TR00 0000 0000 0000 0000 0000 00</p>
                        <p className="text-xs text-gray-500 mt-1">Ersin Spot - İş Bankası</p>
                      </div>
                      <p className="text-xs text-gray-600">
                        Açıklama: <strong>#{orderNumber}</strong>
                      </p>
                    </div>
                  )}

                  {paymentMethod === 'online' && (
                    <div className="space-y-3 text-sm">
                      <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                        <p className="text-xs text-blue-600 mb-1">💳 Ödeme Yöntemi:</p>
                        <p className="text-sm text-blue-800">Online Ödeme (Kredi/Banka Kartı)</p>
                        <p className="text-xs text-blue-600 mt-2">Ödeme linki e-postanıza gönderildi.</p>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'cash' && (
                    <div className="space-y-3 text-sm">
                      <div className="bg-green-50 border border-green-200 p-3 rounded">
                        <p className="text-xs text-green-600 mb-1">💵 Ödeme Yöntemi:</p>
                        <p className="text-sm text-green-800">Kapıda Ödeme</p>
                        <p className="text-xs text-green-600 mt-2">Teslimat sırasında nakit ödeme.</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Butonlar */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={() => navigate('/')}
                className="flex-1 bg-[#1e3a8a] hover:bg-[#1e3a8a]/90"
                size="lg"
              >
                Ana Sayfaya Dön
              </Button>
              <Button 
                onClick={() => navigate('/hesabim/siparislerim')}
                className="flex-1 bg-[#f97316] hover:bg-[#ea580c]"
                size="lg"
              >
                Siparişlerim
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--brand-cream-100)] to-white pt-24 pb-12">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* SEPET BAŞLIĞI */}
          <div className="mb-8">
            <h1 className="text-2xl text-[#1e3a8a]">
              🛒 Sepetim
            </h1>
            <p className="text-gray-600 mt-2">Sepetinizdeki ürünleri görüntüleyin ve siparişinizi tamamlayın</p>
          </div>

          {/* SEPET BOŞ - Sadece boş mesaj */}
          {cartItems.length === 0 ? (
            <Card className="border-[var(--brand-cream-300)]">
              <CardContent className="p-12">
                <div className="text-center py-12">
                  <ShoppingBag className="w-20 h-20 text-[var(--brand-cream-400)] mx-auto mb-6" />
                  <h2 className="mb-3 text-[var(--brand-bronze-700)]">Sepetiniz Boş</h2>
                  <p className="text-gray-600 mb-8 text-lg">Henüz sepetinize ürün eklemediniz.</p>
                  <Link to="/urunler">
                    <Button variant="teal" size="lg">
                      <ShoppingBag className="w-5 h-5 mr-2" />
                      Ürünleri İncele
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* SEPET DOLU - Tüm adımlar ve sipariş özeti */
            <>
              {/* Multi-Step Progress */}
              <MultiStepForm
                steps={steps}
                currentStep={currentStep}
                onStepClick={setCurrentStep}
                canNavigate={canNavigateToStep}
              >
                {/* Step Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                  <div className="lg:col-span-2">
                    <Card className="border-[var(--brand-cream-300)]">
                      <CardContent className="p-6">
                        {/* STEP 1: Sepet */}
                        {currentStep === 1 && (
                          <div>
                            <h3 className="mb-6 text-[var(--brand-bronze-700)]">Sepetinizdeki Ürünler</h3>
                            {cartItems.length === 0 ? (
                              <div className="text-center py-12">
                                <ShoppingBag className="w-16 h-16 text-[var(--brand-cream-400)] mx-auto mb-4" />
                                <h3 className="mb-2 text-[var(--brand-bronze-700)]">Sepetiniz Boş</h3>
                                <p className="text-gray-600 mb-6">Henüz sepetinize ürün eklemediniz.</p>
                                <Link to="/urunler">
                                  <Button variant="teal">Ürünleri İncele</Button>
                                </Link>
                              </div>
                            ) : (
                              <div className="space-y-6">
                                {cartItems.map((item) => (
                                  <div key={item.id} className="flex gap-6 pb-6 border-b border-[var(--brand-cream-200)] last:border-b-0">
                                    <img
                                      src={item.image}
                                      alt={item.title}
                                      className="w-32 h-32 object-cover rounded-lg border border-[var(--brand-cream-200)]"
                                    />
                                    <div className="flex-1">
                                      <div className="flex justify-between items-start mb-2">
                                        <div>
                                          <Link to={`/urun/${item.id}`}>
                                            <h3 className="hover:text-[var(--brand-coral-600)] transition-colors line-clamp-2 text-gray-800">
                                              {item.title}
                                            </h3>
                                          </Link>
                                          <p className="text-sm text-gray-500 mt-1">{getConditionLabel(item.condition || '')}</p>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeFromCart(item.id)}
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                      <div className="flex items-center justify-between mt-4">
                                        <div className="text-sm text-gray-600">
                                          Adet: <span className="font-medium text-gray-800">1</span>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-xs text-gray-500">Fiyat</p>
                                          <span className="text-[var(--brand-coral-600)]">
                                            {item.price.toLocaleString('tr-TR')} ₺
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}

                                {/* BUTONLAR - GÖRSELDEKİ GİBİ: JUSTIFY-BETWEEN + SIZE-SM */}
                                <div className="flex justify-between items-center mt-8">
                                  <Link to="/urunler">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                                    >
                                      <ArrowLeft className="w-4 h-4 mr-2" />
                                      Alışverişe Devam Et
                                    </Button>
                                  </Link>
                                  <Button
                                    onClick={handleNextStep}
                                    size="sm"
                                    className="bg-[#f97316] hover:bg-[#ea580c] text-white"
                                    disabled={cartItems.length === 0}
                                  >
                                    İleri
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* STEP 2: İletişim Bilgileri */}
                        {currentStep === 2 && (
                          <div>
                            <h3 className="mb-6 text-[var(--brand-bronze-700)]">İletişim Bilgileri</h3>

                            <div className="space-y-6">
                              <div>
                                <Label htmlFor="name" className="mb-2 block">Ad Soyad *</Label>
                                <Input
                                  id="name"
                                  value={customerInfo.name}
                                  onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                                  placeholder="Ad Soyad"
                                  required
                                />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <Label htmlFor="phone" className="mb-2 block">Telefon *</Label>
                                  <Input
                                    id="phone"
                                    type="tel"
                                    placeholder="05XX XXX XX XX"
                                    value={customerInfo.phone}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/\D/g, '');
                                      if (value.length <= 11) {
                                        setCustomerInfo({ ...customerInfo, phone: value });
                                      }
                                    }}
                                    pattern="[0-9]{10,11}"
                                    title="Geçerli bir telefon numarası giriniz (10-11 hane, sadece rakam)"
                                    maxLength={11}
                                    required
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="email" className="mb-2 block">E-posta *</Label>
                                  <Input
                                    id="email"
                                    type="email"
                                    placeholder="ornek@email.com"
                                    value={customerInfo.email}
                                    onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                                    pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                                    title="Geçerli bir e-posta adresi giriniz (örn: kullanici@ornek.com)"
                                    required
                                  />
                                </div>
                              </div>

                              <Alert className="bg-[var(--brand-cream-50)] border-[var(--brand-cream-300)]">
                                <AlertDescription className="text-gray-700 text-sm">
                                  📧 Sipariş durumunuz hakkında bilgilendirmeler bu iletişim bilgilerine gönderilecektir.
                                </AlertDescription>
                              </Alert>

                              {/* BUTONLAR - GÖRSELDEKİ GİBİ */}
                              <div className="flex justify-between items-center mt-8">
                                <Button
                                  onClick={handlePrevStep}
                                  variant="outline"
                                  size="sm"
                                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                                >
                                  <ArrowLeft className="w-4 h-4 mr-2" />
                                  Geri
                                </Button>
                                <Button
                                  onClick={handleNextStep}
                                  size="sm"
                                  className="bg-[#f97316] hover:bg-[#ea580c] text-white"
                                  disabled={!customerInfo.name || !customerInfo.phone || !customerInfo.email}
                                >
                                  İleri
                                  <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* STEP 3: Tarih Seçimi */}
                        {currentStep === 3 && (
                          <div>
                            <h3 className="mb-6 text-[var(--brand-bronze-700)]">Teslimat Tarihi ve Saati</h3>
                            
                            <div className="space-y-8">
                              {/* Tarih Seçimi - BÜYÜK TAKVİM */}
                              <div className="space-y-3">
                                <Label className="text-base flex items-center gap-2">
                                  <Calendar className="w-5 h-5 text-[#f97316]" />
                                  Teslimat Tarihi *
                                </Label>
                                <div className="border-2 border-gray-200 rounded-xl p-4 bg-gradient-to-br from-orange-50/50 to-white hover:border-[#f97316] transition-colors">
                                  <CalendarComponent 
                                    mode="single" 
                                    selected={deliveryDate} 
                                    onSelect={setDeliveryDate}
                                    locale={tr}
                                    disabled={(date) => {
                                      const day = date.getDay();
                                      const today = new Date();
                                      today.setHours(0, 0, 0, 0);
                                      
                                      // Geçmiş tarihler
                                      const isPastDate = date < today;
                                      
                                      // Gelecek 1 aydan sonraki tarihler
                                      const oneMonthLater = new Date();
                                      oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
                                      oneMonthLater.setHours(23, 59, 59, 999);
                                      const isTooFarInFuture = date > oneMonthLater;
                                      
                                      // Hafta sonu
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
                                  {deliveryDate && (
                                    <div className="mt-3 p-3 bg-green-100 border-2 border-green-300 rounded-lg text-center">
                                      <p className="text-sm text-green-700">
                                        ✅ Seçilen Tarih: <span className="font-bold">{format(deliveryDate, 'PPP', { locale: tr })}</span>
                                      </p>
                                    </div>
                                  )}
                                  <p className="text-xs text-gray-500 mt-3 text-center">
                                    ⚠️ Cumartesi ve Pazar günleri çalışmıyoruz • 📅 Önümüzdeki 1 ay içinde tarih seçebilirsiniz
                                  </p>
                                </div>
                              </div>

                              {/* Saat Seçimi - Sadece tarih seçildiğinde göster */}
                              {deliveryDate && (
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
                                              onClick={() => {
                                                if (!isDisabled) {
                                                  setCustomerInfo({ ...customerInfo, deliveryTime: slot });
                                                }
                                              }}
                                              disabled={isDisabled}
                                              className={`p-3 rounded-xl border-2 transition-all text-left ${
                                                isDisabled
                                                  ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-50'
                                                  : customerInfo.deliveryTime === slot
                                                  ? 'bg-gradient-to-br from-[#f97316] to-[#ea580c] border-[#f97316] text-white shadow-lg scale-105'
                                                  : 'bg-white border-gray-200 hover:border-[#f97316] hover:bg-orange-50'
                                              }`}
                                            >
                                              <div className="flex items-center gap-2.5">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                                  isDisabled
                                                    ? 'bg-gray-200'
                                                    : customerInfo.deliveryTime === slot
                                                    ? 'bg-white/20'
                                                    : 'bg-orange-100'
                                                }`}>
                                                  <Clock className={`w-5 h-5 ${
                                                    isDisabled
                                                      ? 'text-gray-400'
                                                      : customerInfo.deliveryTime === slot 
                                                      ? 'text-white' 
                                                      : 'text-[#f97316]'
                                                  }`} />
                                                </div>
                                                <div>
                                                  <p className={`text-xs mb-0.5 ${
                                                    isDisabled
                                                      ? 'text-gray-400'
                                                      : customerInfo.deliveryTime === slot 
                                                      ? 'text-white/80' 
                                                      : 'text-gray-500'
                                                  }`}>
                                                    {isPastSlot ? 'Geçmiş Saat' : isBusy ? '❌ Dolu' : 'Saat Aralığı'}
                                                  </p>
                                                  <p className={`font-bold text-sm ${isDisabled ? 'text-gray-500 line-through' : ''}`}>
                                                    {slot}
                                                  </p>
                                                </div>
                                                {customerInfo.deliveryTime === slot && !isDisabled && (
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

                            {/* BUTONLAR */}
                            <div className="flex justify-between items-center mt-8">
                              <Button
                                onClick={handlePrevStep}
                                variant="outline"
                                size="sm"
                                className="border-gray-300 text-gray-700 hover:bg-gray-50"
                              >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Geri
                              </Button>
                              <Button
                                onClick={handleNextStep}
                                size="sm"
                                className="bg-[#f97316] hover:bg-[#ea580c] text-white"
                                disabled={!deliveryDate || !customerInfo.deliveryTime}
                              >
                                İleri
                                <ArrowRight className="w-4 h-4 ml-2" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* STEP 4: Teslimat Bilgileri */}
                        {currentStep === 4 && (
                          <div>
                            <h3 className="mb-6 text-[var(--brand-bronze-700)]">Teslimat Bilgileri</h3>
                            <div className="space-y-6">
                              {/* İL - SABIT İZMİR */}
                              <div>
                                <Label htmlFor="city" className="mb-2 block text-base">İl</Label>
                                <Input
                                  id="city"
                                  value={customerInfo.city}
                                  disabled
                                  className="bg-gray-100"
                                />
                              </div>

                              {/* İLÇE */}
                              <div>
                                <Label htmlFor="district" className="mb-2 block text-base">İlçe *</Label>
                                <Select
                                  value={customerInfo.district}
                                  onValueChange={(value) => {
                                    setCustomerInfo({ ...customerInfo, district: value });
                                    calculateDeliveryFee(value);
                                  }}
                                  required
                                >
                                  <SelectTrigger className="border-[var(--brand-cream-300)] hover:bg-[var(--brand-cream-50)] h-12">
                                    <SelectValue placeholder="İlçe seçin" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {izmirDistricts.map((district) => (
                                      <SelectItem key={district} value={district}>
                                        {district}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* MAHALLE */}
                              <div>
                                <Label htmlFor="neighborhood" className="mb-2 block text-base">Mahalle *</Label>
                                <Input
                                  id="neighborhood"
                                  value={customerInfo.neighborhood}
                                  onChange={(e) => setCustomerInfo({ ...customerInfo, neighborhood: e.target.value })}
                                  placeholder="Örn: Kazım Dirik Mahallesi"
                                  required
                                />
                              </div>

                              {/* SOKAK/CADDE */}
                              <div>
                                <Label htmlFor="street" className="mb-2 block text-base">Sokak / Cadde *</Label>
                                <Input
                                  id="street"
                                  value={customerInfo.street}
                                  onChange={(e) => setCustomerInfo({ ...customerInfo, street: e.target.value })}
                                  placeholder="Örn: Atatürk Caddesi"
                                  required
                                />
                              </div>

                              {/* BİNA NO & DAİRE NO */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="building_no" className="mb-2 block text-base">Bina No *</Label>
                                  <Input
                                    id="building_no"
                                    value={customerInfo.building_no}
                                    onChange={(e) => setCustomerInfo({ ...customerInfo, building_no: e.target.value })}
                                    placeholder="Örn: 45"
                                    required
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="apartment_no" className="mb-2 block text-base">Daire No</Label>
                                  <Input
                                    id="apartment_no"
                                    value={customerInfo.apartment_no}
                                    onChange={(e) => setCustomerInfo({ ...customerInfo, apartment_no: e.target.value })}
                                    placeholder="Örn: 8"
                                  />
                                </div>
                              </div>

                              {/* SİPARİŞ NOTLARI */}
                              <div>
                                <Label htmlFor="notes" className="mb-2 block text-base">Adres Tarifi / Sipariş Notları (Opsiyonel)</Label>
                                <Textarea
                                  id="notes"
                                  placeholder="Örn: Evin kapısı kırmızı, zil çalışmıyor kapıyı çalın"
                                  value={customerInfo.notes}
                                  onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
                                  rows={3}
                                  className="resize-none"
                                />
                              </div>

                              {addressError && (
                                <Alert className="bg-red-50 border-red-300">
                                  <AlertDescription className="text-red-700 text-sm">
                                    ⚠️ {addressError}
                                  </AlertDescription>
                                </Alert>
                              )}

                              <Alert className="bg-[var(--brand-cream-50)] border-[var(--brand-cream-300)]">
                                <MapPin className="h-4 w-4 text-[var(--brand-coral-500)]" />
                                <AlertDescription className="text-gray-700 text-sm">
                                  Ürünleriniz seçtiğiniz tarih ve saatte bu adrese teslim edilecek ve gerekirse kurulumu yapılacaktır.
                                </AlertDescription>
                              </Alert>

                              {/* BUTONLAR */}
                              <div className="flex justify-between items-center mt-8">
                                <Button
                                  onClick={handlePrevStep}
                                  variant="outline"
                                  size="sm"
                                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                                >
                                  <ArrowLeft className="w-4 h-4 mr-2" />
                                  Geri
                                </Button>
                                <Button
                                  onClick={handleNextStep}
                                  size="sm"
                                  className="bg-[#f97316] hover:bg-[#ea580c] text-white"
                                >
                                  İleri
                                  <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* STEP 5: Onay & Ödeme */}
                        {currentStep === 5 && (
                          <div>
                            <h3 className="mb-6 text-[var(--brand-bronze-700)]">Sipariş Onayı</h3>
                            <div className="space-y-6">
                              {/* Ödeme Yöntemi Seçimi */}
                              <div className="bg-[var(--brand-cream-50)] p-4 rounded-lg border border-[var(--brand-cream-200)]">
                                <div className="flex items-center gap-2 mb-3">
                                  <CreditCard className="w-5 h-5 text-[var(--brand-coral-500)]" />
                                  <h4 className="text-[var(--brand-bronze-700)]">Ödeme Yöntemi</h4>
                                </div>
                                <div className="space-y-3">
                                  <button
                                    onClick={() => setPaymentMethod('bank')}
                                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                      paymentMethod === 'bank'
                                        ? 'border-[var(--brand-coral-500)] bg-white shadow-md'
                                        : 'border-[var(--brand-cream-300)] bg-white hover:border-[var(--brand-coral-300)]'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                        paymentMethod === 'bank' ? 'border-[var(--brand-coral-500)]' : 'border-gray-300'
                                      }`}>
                                        {paymentMethod === 'bank' && (
                                          <div className="w-3 h-3 rounded-full bg-[var(--brand-coral-500)]"></div>
                                        )}
                                      </div>
                                      <div>
                                        <p className="text-sm text-gray-800">Banka Transferi / EFT</p>
                                        <p className="text-xs text-gray-500">IBAN ile ödeme yapın</p>
                                      </div>
                                    </div>
                                  </button>

                                  <button
                                    onClick={() => setPaymentMethod('online')}
                                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                      paymentMethod === 'online'
                                        ? 'border-[var(--brand-coral-500)] bg-white shadow-md'
                                        : 'border-[var(--brand-cream-300)] bg-white hover:border-[var(--brand-coral-300)]'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-3 opacity-50">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                          paymentMethod === 'online' ? 'border-[var(--brand-coral-500)]' : 'border-gray-300'
                                        }`}>
                                          {paymentMethod === 'online' && (
                                            <div className="w-3 h-3 rounded-full bg-[var(--brand-coral-500)]"></div>
                                          )}
                                        </div>
                                        <div>
                                          <p className="text-sm text-gray-800">Online Ödeme</p>
                                          <p className="text-xs text-gray-500">Kredi/Banka kartı ile güvenli ödeme</p>
                                        </div>
                                      </div>
                                      <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">Yakında</span>
                                    </div>
                                  </button>

                                  <button
                                    onClick={() => setPaymentMethod('cash')}
                                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                      paymentMethod === 'cash'
                                        ? 'border-[var(--brand-coral-500)] bg-white shadow-md'
                                        : 'border-[var(--brand-cream-300)] bg-white hover:border-[var(--brand-coral-300)]'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                        paymentMethod === 'cash' ? 'border-[var(--brand-coral-500)]' : 'border-gray-300'
                                      }`}>
                                        {paymentMethod === 'cash' && (
                                          <div className="w-3 h-3 rounded-full bg-[var(--brand-coral-500)]"></div>
                                        )}
                                      </div>
                                      <div>
                                        <p className="text-sm text-gray-800">Kapıda Ödeme</p>
                                        <p className="text-xs text-gray-500">Teslimat sırasında nakit ödeme</p>
                                      </div>
                                    </div>
                                  </button>
                                </div>
                              </div>

                              {/* İletişim Özeti */}
                              <div className="bg-[var(--brand-cream-50)] p-4 rounded-lg border border-[var(--brand-cream-200)]">
                                <div className="flex items-center gap-2 mb-3">
                                  <User className="w-5 h-5 text-[var(--brand-coral-500)]" />
                                  <h4 className="text-[var(--brand-bronze-700)]">İletişim Bilgileri</h4>
                                </div>
                                <div className="space-y-2 text-sm text-gray-700">
                                  <p><strong>Ad Soyad:</strong> {customerInfo.name}</p>
                                  <p><strong>Telefon:</strong> {customerInfo.phone}</p>
                                  <p><strong>E-posta:</strong> {customerInfo.email}</p>
                                </div>
                              </div>

                              {/* Teslimat Özeti */}
                              <div className="bg-[var(--brand-cream-50)] p-4 rounded-lg border border-[var(--brand-cream-200)]">
                                <div className="flex items-center gap-2 mb-3">
                                  <MapPin className="w-5 h-5 text-[var(--brand-coral-500)]" />
                                  <h4 className="text-[var(--brand-bronze-700)]">Teslimat Bilgileri</h4>
                                </div>
                                <div className="space-y-2 text-sm text-gray-700">
                                  <p><strong>Adres:</strong> {customerInfo.address}</p>
                                  <p><strong>İlçe:</strong> {customerInfo.district}</p>
                                  <p><strong>Teslimat Tarihi:</strong> {deliveryDate && format(deliveryDate, 'dd MMMM yyyy, EEEE', { locale: tr })}</p>
                                  <p><strong>Teslimat Saati:</strong> {customerInfo.deliveryTime}</p>
                                  {customerInfo.notes && (
                                    <p><strong>Notlar:</strong> {customerInfo.notes}</p>
                                  )}
                                </div>
                              </div>

                              {/* Ürünler Özeti */}
                              <div className="bg-[var(--brand-cream-50)] p-4 rounded-lg border border-[var(--brand-cream-200)]">
                                <div className="flex items-center gap-2 mb-3">
                                  <ShoppingBag className="w-5 h-5 text-[var(--brand-coral-500)]" />
                                  <h4 className="text-[var(--brand-bronze-700)]">Ürünler</h4>
                                </div>
                                <div className="space-y-3">
                                  {cartItems.map((item) => (
                                    <div key={item.id} className="flex gap-3 bg-white p-3 rounded border border-[var(--brand-cream-200)]">
                                      <img
                                        src={item.image}
                                        alt={item.title}
                                        className="w-16 h-16 object-cover rounded"
                                      />
                                      <div className="flex-1">
                                        <p className="text-sm text-gray-800 line-clamp-2">{item.title}</p>
                                        <p className="text-sm text-[var(--brand-coral-600)]">
                                          {item.price.toLocaleString('tr-TR')} ₺
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <Alert className="bg-[var(--brand-cream-50)] border-[var(--brand-cream-300)]">
                                <AlertDescription className="text-gray-700 text-sm">
                                  {paymentMethod === 'cash' && (
                                    <>💵 Ödemeniz teslimat sırasında kapıda alınacaktır.</>
                                  )}
                                  {paymentMethod === 'bank' && (
                                    <>💳 Siparişiniz onaylandıktan sonra ödeme bilgileri (IBAN) e-posta adresinize gönderilecektir.</>
                                  )}
                                  {paymentMethod === 'online' && (
                                    <>💳 Online ödeme linki siparişiniz onaylandıktan sonra e-posta adresinize gönderilecektir.</>
                                  )}
                                </AlertDescription>
                              </Alert>

                              {/* BUTONLAR - Normal Sistem */}
                              <div className="flex justify-between items-center mt-8">
                                <Button
                                  onClick={handlePrevStep}
                                  variant="outline"
                                  size="sm"
                                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                                >
                                  <ArrowLeft className="w-4 h-4 mr-2" />
                                  Geri
                                </Button>
                                <Button
                                  onClick={handleSubmitOrder}
                                  size="sm"
                                  className="bg-[#f97316] hover:bg-[#ea580c] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                  disabled={paymentMethod === 'online' || isSubmitting}
                                >
                                  {!isSubmitting && <CheckCircle className="w-4 h-4 mr-2" />}
                                  {isSubmitting ? 'Sipariş Oluşturuluyor...' : 'Siparişi Onayla'}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Sağ Sidebar - Sipariş Özeti */}
                  <div>
                    <Card className="sticky top-24 border-[var(--brand-cream-300)]">
                      <CardContent className="p-6">
                        <h3 className="mb-4 text-[var(--brand-bronze-700)]">Sipariş Özeti</h3>
                        <div className="space-y-4">
                          {cartItems.map((item) => (
                            <div key={item.id} className="flex gap-3">
                              <img
                                src={item.image}
                                alt={item.title}
                                className="w-16 h-16 object-cover rounded border border-[var(--brand-cream-200)]"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm line-clamp-2 text-gray-800">{item.title}</p>
                                <p className="text-sm text-[var(--brand-coral-600)]">
                                  {item.price.toLocaleString('tr-TR')} ₺
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <Separator className="my-4 bg-[var(--brand-cream-200)]" />

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Ara Toplam</span>
                            <span className="text-gray-800">{totalPrice.toLocaleString('tr-TR')} ₺</span>
                          </div>
                          {isOutsideBuca && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Buca Dışı Teslimat</span>
                              <span className="text-orange-600 font-medium">{deliveryFee.toLocaleString('tr-TR')} ₺</span>
                            </div>
                          )}
                          {!isOutsideBuca && customerInfo.district === 'Buca' && (
                            <div className="flex justify-between text-sm">
                              <span className="text-green-600">Teslimat Ücreti</span>
                              <span className="text-green-600 font-medium">Ücretsiz</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">KDV</span>
                            <span className="text-gray-800">Dahil</span>
                          </div>
                          <Separator className="bg-[var(--brand-cream-200)]" />
                          <div className="flex justify-between">
                            <span className="text-[var(--brand-bronze-700)]">Toplam</span>
                            <span className="text-[var(--brand-coral-600)]">
                              {(totalPrice + deliveryFee).toLocaleString('tr-TR')} ₺
                            </span>
                          </div>
                        </div>

                        {/* Taşıma Bilgilendirmesi */}
                        {!customerInfo.district ? (
                          <Alert className="mt-4 bg-[var(--brand-teal-50)] border-[var(--brand-teal-300)]">
                            <AlertDescription className="text-sm text-[var(--brand-teal-700)]">
                              📦 <strong>Teslimat Bilgisi:</strong> Adres seçtikten sonra teslimat ücreti hesaplanacaktır. Buca içi ücretsiz!
                            </AlertDescription>
                          </Alert>
                        ) : customerInfo.district === 'Buca' ? (
                          <Alert className="mt-4 bg-green-50 border-green-300">
                            <AlertDescription className="text-sm text-green-700">
                              🎉 <strong>Müjde!</strong> Buca içi teslimat ücretsizdir!
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <Alert className="mt-4 bg-orange-50 border-orange-300">
                            <AlertDescription className="text-sm text-orange-700">
                              📍 <strong>Buca dışı teslimat ücretlidir.</strong><br/>
                              {customerInfo.district && `${customerInfo.district} için teslimat ücreti: ${deliveryFee.toLocaleString('tr-TR')} ₺`}
                            </AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </MultiStepForm>
            </>
          )}
        </div>
      </div>
    </div>
  );
}