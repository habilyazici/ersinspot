import { useState } from 'react';
import { Search, Package, Wrench, Truck, ShoppingCart, Calendar, MapPin, User, Phone, CheckCircle, Clock, XCircle } from 'lucide-react@0.487.0';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Separator } from '../components/ui/separator';

export default function OrderTrackingPage() {
  const [trackingCode, setTrackingCode] = useState('');
  const [orderData, setOrderData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Mock sipariş verileri - Gerçek sistemde Supabase'den gelecek
  const mockOrders = {
    'SIP-123456': {
      type: 'shopping',
      code: 'SIP-123456',
      date: '2025-01-15',
      status: 'delivered',
      customer: {
        name: 'Ahmet Yılmaz',
        phone: '0555 123 45 67',
        address: 'Menderes Mah. 1234 Sk. No:5 Buca/İzmir',
        district: 'Buca',
      },
      items: [
        { id: 1, name: 'Samsung Buzdolabı 528 LT', price: 25000 },
        { id: 2, name: 'Arçelik Çamaşır Makinesi 9 KG', price: 12000 },
      ],
      delivery: {
        date: '2025-01-20',
        time: '14:00 - 17:00',
        fee: 0,
      },
      payment: 'bank',
      totalPrice: 37000,
    },
    'SERV-789012': {
      type: 'service',
      code: 'SERV-789012',
      date: '2025-01-10',
      status: 'in_progress',
      customer: {
        name: 'Mehmet Demir',
        phone: '0555 987 65 43',
        address: 'Kazım Dirik Mah. 567 Sk. No:12 Bornova/İzmir',
        district: 'Bornova',
      },
      service: {
        type: 'Buzdolabı Tamiri',
        description: 'Motor sesi geliyor, soğutmuyor',
        date: '2025-01-18',
        time: '10:00 - 12:00',
      },
      estimatedCost: 1500,
    },
    'NAK-345678': {
      type: 'transport',
      code: 'NAK-345678',
      date: '2025-01-12',
      status: 'completed',
      customer: {
        name: 'Ayşe Kaya',
        phone: '0555 456 78 90',
      },
      transport: {
        from: 'Konak, İzmir',
        to: 'Karşıyaka, İzmir',
        date: '2025-01-16',
        time: '09:00 - 12:00',
        items: 'Beyaz eşya taşıma (Buzdolabı, Çamaşır Makinesi)',
      },
      price: 500,
    },
    'SAT-901234': {
      type: 'sell',
      code: 'SAT-901234',
      date: '2025-01-08',
      status: 'pending',
      customer: {
        name: 'Fatma Özkan',
        phone: '0555 234 56 78',
        address: 'Yeşilyurt Mah. 890 Sk. No:8 Buca/İzmir',
        district: 'Buca',
      },
      items: [
        { name: 'Buzdolabı - LG 500 LT', condition: 'İyi Durumda' },
        { name: 'Çamaşır Makinesi - Bosch 8 KG', condition: 'Az Kullanılmış' },
      ],
      appointment: {
        date: '2025-01-22',
        time: '15:00 - 18:00',
      },
      estimatedPrice: 18000,
    },
  };

  const handleSearch = () => {
    setIsLoading(true);
    setError('');
    setOrderData(null);

    // Kod formatını kontrol et
    const codePattern = /^(SIP|SERV|NAK|SAT)-\d{6}$/;
    if (!codePattern.test(trackingCode.trim().toUpperCase())) {
      setError('Geçersiz takip kodu formatı! Örnek: SIP-123456');
      setIsLoading(false);
      return;
    }

    // Simüle edilmiş API çağrısı
    setTimeout(() => {
      const code = trackingCode.trim().toUpperCase();
      const order = mockOrders[code as keyof typeof mockOrders];

      if (order) {
        setOrderData(order);
      } else {
        setError('Bu takip kodu ile ilişkili bir sipariş bulunamadı.');
      }
      setIsLoading(false);
    }, 800);
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock className="w-5 h-5" />,
          label: 'Beklemede',
          color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        };
      case 'in_progress':
        return {
          icon: <Clock className="w-5 h-5" />,
          label: 'İşlemde',
          color: 'text-blue-600 bg-blue-50 border-blue-200',
        };
      case 'completed':
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          label: 'Tamamlandı',
          color: 'text-green-600 bg-green-50 border-green-200',
        };
      case 'delivered':
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          label: 'Teslim Edildi',
          color: 'text-green-600 bg-green-50 border-green-200',
        };
      case 'cancelled':
        return {
          icon: <XCircle className="w-5 h-5" />,
          label: 'İptal Edildi',
          color: 'text-red-600 bg-red-50 border-red-200',
        };
      default:
        return {
          icon: <Clock className="w-5 h-5" />,
          label: 'Bilinmiyor',
          color: 'text-gray-600 bg-gray-50 border-gray-200',
        };
    }
  };

  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'shopping':
        return {
          icon: <ShoppingCart className="w-6 h-6" />,
          label: 'Alışveriş Siparişi',
          color: 'text-[var(--brand-coral-600)]',
          bgColor: 'bg-[var(--brand-coral-50)]',
        };
      case 'service':
        return {
          icon: <Wrench className="w-6 h-6" />,
          label: 'Teknik Servis',
          color: 'text-[var(--brand-teal-600)]',
          bgColor: 'bg-[var(--brand-teal-50)]',
        };
      case 'transport':
        return {
          icon: <Truck className="w-6 h-6" />,
          label: 'Nakliye',
          color: 'text-[var(--brand-coral-600)]',
          bgColor: 'bg-[var(--brand-coral-50)]',
        };
      case 'sell':
        return {
          icon: <Package className="w-6 h-6" />,
          label: 'Ürün Satışı',
          color: 'text-[var(--brand-orange-600)]',
          bgColor: 'bg-[var(--brand-orange-50)]',
        };
      default:
        return {
          icon: <Package className="w-6 h-6" />,
          label: 'Sipariş',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
        };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Başlık */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-[var(--brand-blue-500)] to-[var(--brand-orange-500)] rounded-2xl shadow-lg">
              <Search className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-[var(--brand-blue-600)]">
              Sipariş Takip
            </h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Alışveriş, teknik servis, nakliye veya ürün satış işlemlerinizi takip kodu ile sorgulayın.
          </p>
        </div>

        {/* Arama Formu */}
        <Card className="mb-8 shadow-lg border-2 border-[var(--brand-blue-100)]">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Takip kodunu giriniz (örn: SIP-123456)"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="h-12 text-base border-[var(--brand-blue-200)] focus:border-[var(--brand-blue-400)]"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={isLoading || !trackingCode.trim()}
                className="h-12 px-8 bg-gradient-to-r from-[var(--brand-blue-500)] to-[var(--brand-orange-500)] hover:from-[var(--brand-blue-600)] hover:to-[var(--brand-orange-600)]"
              >
                {isLoading ? (
                  <>
                    <Clock className="w-5 h-5 mr-2 animate-spin" />
                    Sorgulanıyor...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Sorgula
                  </>
                )}
              </Button>
            </div>

            {/* Kod Örnekleri */}
            <div className="mt-4 p-4 bg-[var(--brand-cream-100)] rounded-lg">
              <p className="text-sm text-gray-700 mb-2 font-medium">Örnek takip kodları:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setTrackingCode('SIP-123456')}
                  className="px-3 py-1 text-xs bg-white border border-[var(--brand-coral-200)] text-[var(--brand-coral-700)] rounded-md hover:bg-[var(--brand-coral-50)] transition-colors"
                >
                  SIP-123456 (Alışveriş)
                </button>
                <button
                  onClick={() => setTrackingCode('SERV-789012')}
                  className="px-3 py-1 text-xs bg-white border border-[var(--brand-teal-200)] text-[var(--brand-teal-700)] rounded-md hover:bg-[var(--brand-teal-50)] transition-colors"
                >
                  SERV-789012 (Servis)
                </button>
                <button
                  onClick={() => setTrackingCode('NAK-345678')}
                  className="px-3 py-1 text-xs bg-white border border-[var(--brand-coral-200)] text-[var(--brand-coral-700)] rounded-md hover:bg-[var(--brand-coral-50)] transition-colors"
                >
                  NAK-345678 (Nakliye)
                </button>
                <button
                  onClick={() => setTrackingCode('SAT-901234')}
                  className="px-3 py-1 text-xs bg-white border border-[var(--brand-orange-200)] text-[var(--brand-orange-700)] rounded-md hover:bg-[var(--brand-orange-50)] transition-colors"
                >
                  SAT-901234 (Satış)
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hata Mesajı */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Sipariş Detayları */}
        {orderData && (
          <Card className="shadow-xl border-2 border-[var(--brand-blue-100)]">
            <CardHeader className={`${getTypeInfo(orderData.type).bgColor} border-b-2 border-[var(--brand-blue-100)]`}>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 ${getTypeInfo(orderData.type).bgColor} rounded-xl border-2 border-white shadow-md`}>
                    <div className={getTypeInfo(orderData.type).color}>
                      {getTypeInfo(orderData.type).icon}
                    </div>
                  </div>
                  <div>
                    <CardTitle className="text-xl mb-1">{getTypeInfo(orderData.type).label}</CardTitle>
                    <p className="text-sm text-gray-600">Takip Kodu: <span className="font-mono font-bold text-gray-800">{orderData.code}</span></p>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-full border-2 ${getStatusInfo(orderData.status).color} flex items-center gap-2 font-medium`}>
                  {getStatusInfo(orderData.status).icon}
                  {getStatusInfo(orderData.status).label}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* Müşteri Bilgileri */}
              <div>
                <h3 className="text-gray-700 font-semibold mb-3 flex items-center gap-2">
                  <User className="w-5 h-5 text-[var(--brand-blue-500)]" />
                  Müşteri Bilgileri
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[var(--brand-cream-50)] p-4 rounded-lg border border-[var(--brand-cream-200)]">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Ad Soyad</p>
                    <p className="text-gray-800 font-medium">{orderData.customer.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Telefon</p>
                    <p className="text-gray-800 font-medium">{orderData.customer.phone}</p>
                  </div>
                  {orderData.customer.address && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-gray-500 mb-1">Adres</p>
                      <p className="text-gray-800 font-medium">{orderData.customer.address}</p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Alışveriş Siparişi Detayları */}
              {orderData.type === 'shopping' && (
                <>
                  <div>
                    <h3 className="text-gray-700 font-semibold mb-3 flex items-center gap-2">
                      <Package className="w-5 h-5 text-[var(--brand-coral-500)]" />
                      Sipariş Ürünleri
                    </h3>
                    <div className="space-y-2">
                      {orderData.items.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-[var(--brand-cream-50)] rounded-lg border border-[var(--brand-cream-200)]">
                          <span className="text-gray-800">{item.name}</span>
                          <span className="font-semibold text-[var(--brand-coral-600)]">
                            {item.price.toLocaleString('tr-TR')} ₺
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 p-4 bg-gradient-to-r from-[var(--brand-blue-50)] to-[var(--brand-orange-50)] rounded-lg border-2 border-[var(--brand-blue-200)]">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-800">Toplam Tutar:</span>
                        <span className="text-xl font-bold text-[var(--brand-blue-600)]">
                          {orderData.totalPrice.toLocaleString('tr-TR')} ₺
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-gray-700 font-semibold mb-3 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-[var(--brand-blue-500)]" />
                      Teslimat Bilgileri
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[var(--brand-cream-50)] p-4 rounded-lg border border-[var(--brand-cream-200)]">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Teslimat Tarihi</p>
                        <p className="text-gray-800 font-medium">{new Date(orderData.delivery.date).toLocaleDateString('tr-TR')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Teslimat Saati</p>
                        <p className="text-gray-800 font-medium">{orderData.delivery.time}</p>
                      </div>
                      {orderData.delivery.fee > 0 && (
                        <div className="sm:col-span-2">
                          <p className="text-xs text-gray-500 mb-1">Teslimat Ücreti</p>
                          <p className="text-[var(--brand-coral-600)] font-semibold">{orderData.delivery.fee} ₺</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Teknik Servis Detayları */}
              {orderData.type === 'service' && (
                <div>
                  <h3 className="text-gray-700 font-semibold mb-3 flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-[var(--brand-teal-500)]" />
                    Servis Detayları
                  </h3>
                  <div className="space-y-3 bg-[var(--brand-cream-50)] p-4 rounded-lg border border-[var(--brand-cream-200)]">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Servis Türü</p>
                      <p className="text-gray-800 font-medium">{orderData.service.type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Açıklama</p>
                      <p className="text-gray-800">{orderData.service.description}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Randevu Tarihi</p>
                        <p className="text-gray-800 font-medium">{new Date(orderData.service.date).toLocaleDateString('tr-TR')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Randevu Saati</p>
                        <p className="text-gray-800 font-medium">{orderData.service.time}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Tahmini Maliyet</p>
                      <p className="text-[var(--brand-teal-600)] font-semibold text-lg">{orderData.estimatedCost.toLocaleString('tr-TR')} ₺</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Nakliye Detayları */}
              {orderData.type === 'transport' && (
                <div>
                  <h3 className="text-gray-700 font-semibold mb-3 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-[var(--brand-coral-500)]" />
                    Nakliye Detayları
                  </h3>
                  <div className="space-y-3 bg-[var(--brand-cream-50)] p-4 rounded-lg border border-[var(--brand-cream-200)]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Nereden</p>
                        <p className="text-gray-800 font-medium flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-[var(--brand-blue-500)] mt-0.5 flex-shrink-0" />
                          {orderData.transport.from}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Nereye</p>
                        <p className="text-gray-800 font-medium flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-[var(--brand-coral-500)] mt-0.5 flex-shrink-0" />
                          {orderData.transport.to}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Taşınacak Eşyalar</p>
                      <p className="text-gray-800">{orderData.transport.items}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Nakliye Tarihi</p>
                        <p className="text-gray-800 font-medium">{new Date(orderData.transport.date).toLocaleDateString('tr-TR')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Nakliye Saati</p>
                        <p className="text-gray-800 font-medium">{orderData.transport.time}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Nakliye Ücreti</p>
                      <p className="text-[var(--brand-coral-600)] font-semibold text-lg">{orderData.price.toLocaleString('tr-TR')} ₺</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Ürün Satış Detayları */}
              {orderData.type === 'sell' && (
                <>
                  <div>
                    <h3 className="text-gray-700 font-semibold mb-3 flex items-center gap-2">
                      <Package className="w-5 h-5 text-[var(--brand-orange-500)]" />
                      Satılacak Ürünler
                    </h3>
                    <div className="space-y-2">
                      {orderData.items.map((item: any, index: number) => (
                        <div key={index} className="p-3 bg-[var(--brand-cream-50)] rounded-lg border border-[var(--brand-cream-200)]">
                          <p className="text-gray-800 font-medium">{item.name}</p>
                          <p className="text-sm text-gray-600 mt-1">Durum: {item.condition}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-gray-700 font-semibold mb-3 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-[var(--brand-blue-500)]" />
                      Değerlendirme Randevusu
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[var(--brand-cream-50)] p-4 rounded-lg border border-[var(--brand-cream-200)]">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Randevu Tarihi</p>
                        <p className="text-gray-800 font-medium">{new Date(orderData.appointment.date).toLocaleDateString('tr-TR')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Randevu Saati</p>
                        <p className="text-gray-800 font-medium">{orderData.appointment.time}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-xs text-gray-500 mb-1">Tahmini Değer</p>
                        <p className="text-[var(--brand-orange-600)] font-semibold text-lg">{orderData.estimatedPrice.toLocaleString('tr-TR')} ₺</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* İletişim Notu */}
              <Alert className="bg-[var(--brand-blue-50)] border-[var(--brand-blue-200)]">
                <Phone className="h-4 w-4 text-[var(--brand-blue-600)]" />
                <AlertDescription className="text-[var(--brand-blue-800)]">
                  Sorularınız için: <a href="tel:+905071940550" className="font-semibold hover:underline">0 507 194 05 50</a> numaralı telefondan bize ulaşabilirsiniz.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Bilgi Kutusu */}
        {!orderData && !error && (
          <Card className="bg-gradient-to-br from-[var(--brand-blue-50)] to-[var(--brand-orange-50)] border-2 border-[var(--brand-blue-100)]">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-gray-800 mb-3">Takip Kodu Nasıl Bulunur?</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <ShoppingCart className="w-4 h-4 text-[var(--brand-coral-500)] mt-0.5 flex-shrink-0" />
                  <span><strong>Alışveriş:</strong> Sipariş tamamlandıktan sonra ekranda görüntülenir (SIP-XXXXXX)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Wrench className="w-4 h-4 text-[var(--brand-teal-500)] mt-0.5 flex-shrink-0" />
                  <span><strong>Teknik Servis:</strong> Randevu oluşturduktan sonra SMS ile gönderilir (SERV-XXXXXX)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Truck className="w-4 h-4 text-[var(--brand-coral-500)] mt-0.5 flex-shrink-0" />
                  <span><strong>Nakliye:</strong> Randevu onaylandıktan sonra e-posta ile gönderilir (NAK-XXXXXX)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Package className="w-4 h-4 text-[var(--brand-orange-500)] mt-0.5 flex-shrink-0" />
                  <span><strong>Ürün Satışı:</strong> Değerlendirme randevusu alındıktan sonra ekranda görüntülenir (SAT-XXXXXX)</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}