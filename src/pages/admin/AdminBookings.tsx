import { useState } from 'react';
import { Banknote, Phone, Package, User, Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react@0.487.0';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { AdminDialog, AdminDialogContent, AdminDialogHeader, AdminDialogTitle, AdminDialogDescription } from '../../components/ui/admin-dialog';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { toast } from 'sonner@2.0.3';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { getConditionLabel } from '../../utils/conditionHelper';

export default function AdminBookings() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerNote, setOfferNote] = useState('');
  const [activeTab, setActiveTab] = useState('technical');

  // Mock Data - Teknik Servis Randevuları
  const technicalServices = [
    {
      id: 'TS-001',
      requestNumber: 'TS-001',
      device: 'Buzdolabı - Samsung',
      appointmentDate: '20 Kasım 2025',
      appointmentTime: '10:00 - 11:00',
      status: 'pending',
      issue: 'Buzdolabı soğutmuyor, alt kısımda su birikintisi var.',
      customerName: 'Ahmet Yılmaz',
      customerPhone: '0555 123 45 67',
      customerEmail: 'ahmet@example.com',
      address: 'Menderes Mah., Ankara Cad. No:45, Buca/İzmir',
      deviceBrand: 'Samsung',
      deviceModel: 'RF28R7201SR',
      images: ['https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=400'],
    },
    {
      id: 'TS-002',
      requestNumber: 'TS-002',
      device: 'Çamaşır Makinesi - LG',
      appointmentDate: '18 Kasım 2025',
      appointmentTime: '14:00 - 15:00',
      status: 'price_offered',
      issue: 'Makine sıkma işleminde çok gürültülü ses çıkarıyor.',
      customerName: 'Ahmet Yılmaz',
      customerPhone: '0555 123 45 67',
      customerEmail: 'ahmet@example.com',
      address: 'Kaynaklar Mah., İzmir Cad. No:78, Buca/İzmir',
      deviceBrand: 'LG',
      deviceModel: 'F4V5RGP2T',
      offeredPrice: 600,
      priceNote: 'Rulman değişimi yapılmıştır.',
      images: ['https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=400'],
    },
    {
      id: 'TS-003',
      requestNumber: 'TS-003',
      device: 'Klima - Mitsubishi',
      appointmentDate: '25 Kasım 2025',
      appointmentTime: '11:00 - 12:00',
      status: 'confirmed',
      issue: 'Klima soğutmuyor, dış ünite çalışmıyor',
      customerName: 'Ahmet Yılmaz',
      customerPhone: '0555 123 45 67',
      customerEmail: 'ahmet@example.com',
      address: 'Buca Merkez, Buca/İzmir',
      deviceBrand: 'Mitsubishi',
      deviceModel: 'MSZ-AP35VG',
      offeredPrice: 1200,
      priceNote: 'Kompresör değişimi gerekiyor.',
      images: ['https://images.unsplash.com/photo-1631545806609-47ab6fe2ae58?w=400'],
    },
  ];

  // Mock Data - Ürün Alım Talepleri
  const sellRequests = [
    {
      id: 1,
      requestNumber: '#URN-45782',
      title: 'LG Buzdolabı 450 LT',
      category: 'Beyaz Eşya',
      brand: 'LG',
      model: 'GC-B247SLUV',
      condition: 'Az Kullanılmış',
      requestedPrice: 11000,
      status: 'pending',
      createdAt: '15 Kasım 2025',
      customerName: 'Ahmet Yılmaz',
      customerPhone: '0555 123 45 67',
      customerEmail: 'ahmet@example.com',
      address: 'Adatepe Mah., Ankara Cad. No:123, Buca/İzmir',
      photos: ['https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=400'],
      productDetails: {
        purchaseYear: '2022',
        usageDuration: '2 Yıl',
        defects: 'Yok',
        accessories: 'Tüm raflar ve çekmeceler mevcut',
      }
    },
    {
      id: 2,
      requestNumber: '#URN-45783',
      title: 'Bosch Çamaşır Makinesi 8 KG',
      category: 'Beyaz Eşya',
      brand: 'Bosch',
      model: 'WAT28491TR',
      condition: 'Az Kullanılmış',
      requestedPrice: 8500,
      status: 'counter_offer_sent',
      createdAt: '10 Kasım 2025',
      counterOffer: 7800,
      counterOfferNote: 'Ürünün durumu iyi ancak piyasa fiyatları nedeniyle bu fiyatı önerebiliyoruz.',
      customerName: 'Mehmet Demir',
      customerPhone: '0555 234 56 78',
      customerEmail: 'mehmet@example.com',
      address: 'Kaynaklar Mah., İzmir Cad. No:56, Buca/İzmir',
      photos: ['https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=400'],
      productDetails: {
        purchaseYear: '2021',
        usageDuration: '3 Yıl',
        defects: 'Hafif yıpranma',
        accessories: 'Tüm bağlantı hortumları mevcut',
      }
    },
    {
      id: 3,
      requestNumber: '#URN-45784',
      title: 'Samsung 55" Smart TV',
      category: 'Elektronik',
      brand: 'Samsung',
      model: 'UE55AU7000',
      condition: 'Az Kullanılmış',
      requestedPrice: 9000,
      status: 'approved',
      createdAt: '8 Kasım 2025',
      finalPrice: 8200,
      customerName: 'Ayşe Kaya',
      customerPhone: '0555 345 67 89',
      customerEmail: 'ayse@example.com',
      address: 'Şirinyer Mah., Buca/İzmir',
      photos: ['https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400'],
      productDetails: {
        purchaseYear: '2022',
        usageDuration: '2 Yıl',
        defects: 'Yok',
        accessories: 'Kumanda ve stand mevcut',
      }
    },
  ];

  // Mock Data - Nakliye Randevuları
  const movingBookings = [
    {
      id: 'MV-001',
      from: 'Adatepe Mah., Ankara Cad. No:45, Buca/İzmir',
      to: 'Yeşilova Mah., Gazi Bulvarı No:78, Bornova/İzmir',
      date: '25 Kasım 2025',
      time: '09:00 - 12:00',
      status: 'pending',
      distance: '12 km',
      homeSize: '3+1 Daire',
      floor: '3. Kat (Asansörlü)',
      targetFloor: '5. Kat (Asansörlü)',
      items: ['Buzdolabı', 'Çamaşır Makinesi', 'Yatak Odası Takımı', 'Salon Takımı'],
      customerName: 'Ahmet Yılmaz',
      customerPhone: '0555 123 45 67',
      customerEmail: 'ahmet@example.com',
      estimatedDuration: '3-4 Saat',
      teamSize: '3 Kişi',
    },
    {
      id: 'MV-002',
      from: 'Kaynaklar Mah., İzmir Cad. No:123, Buca/İzmir',
      to: 'Atatürk Mah., Konak Meydanı No:56, Konak/İzmir',
      date: '22 Kasım 2025',
      time: '10:00 - 13:00',
      status: 'price_offered',
      distance: '8 km',
      homeSize: '2+1 Daire',
      floor: '2. Kat (Asansörsüz)',
      targetFloor: '1. Kat',
      items: ['Buzdolabı', 'Çamaşır Makinesi', 'Yatak Odası', 'Koltuk Takımı'],
      customerName: 'Fatma Öz',
      customerPhone: '0555 234 56 78',
      customerEmail: 'fatma@example.com',
      offeredPrice: 2800,
      priceNote: 'Merdiven taşıma, paketleme dahil.',
      estimatedDuration: '2-3 Saat',
      teamSize: '3 Kişi',
    },
    {
      id: 'MV-003',
      from: 'Şirinyer Mah., Fevzi Paşa Cad. No:90, Buca/İzmir',
      to: 'Bostanlı Mah., Cemal Gürsel Cad. No:234, Karşıyaka/İzmir',
      date: '28 Kasım 2025',
      time: '08:00 - 11:00',
      status: 'confirmed',
      distance: '15 km',
      homeSize: '4+1 Daire',
      floor: '4. Kat (Asansörlü)',
      targetFloor: '2. Kat (Asansörlü)',
      items: ['Tüm Ev Eşyaları', 'Beyaz Eşya', 'Mobilya'],
      customerName: 'Ali Veli',
      customerPhone: '0555 345 67 89',
      customerEmail: 'ali@example.com',
      offeredPrice: 4200,
      priceNote: 'Profesyonel paketleme ve sigorta dahil.',
      estimatedDuration: '4-5 Saat',
      teamSize: '4 Kişi',
    },
  ];

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; bg: string; icon: string }> = {
      pending: { label: 'Fiyat Bekleniyor', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: '⏳' },
      price_offered: { label: 'Teklif Gönderildi', color: 'text-blue-700', bg: 'bg-blue-100', icon: '💰' },
      counter_offer_sent: { label: 'Teklif Gönderildi', color: 'text-blue-700', bg: 'bg-blue-100', icon: '💰' },
      confirmed: { label: 'Onaylandı', color: 'text-green-700', bg: 'bg-green-100', icon: '✅' },
      approved: { label: 'Onaylandı', color: 'text-green-700', bg: 'bg-green-100', icon: '✅' },
      completed: { label: 'Tamamlandı', color: 'text-purple-700', bg: 'bg-purple-100', icon: '✔️' },
      rejected: { label: 'Reddedildi', color: 'text-red-700', bg: 'bg-red-100', icon: '❌' },
      cancelled: { label: 'İptal Edildi', color: 'text-red-700', bg: 'bg-red-100', icon: '❌' },
    };
    return configs[status] || { label: status, color: 'text-gray-700', bg: 'bg-gray-100', icon: '•' };
  };

  const handleSendOffer = () => {
    if (!offerPrice) {
      toast.error('Lütfen fiyat teklifi giriniz');
      return;
    }
    toast.success('Fiyat teklifi başarıyla gönderildi!');
    setIsOfferModalOpen(false);
    setOfferPrice('');
    setOfferNote('');
  };

  const handleApprove = (item: any) => {
    toast.success(`${item.requestNumber || item.id} onaylandı!`);
  };

  const handleReject = (item: any) => {
    toast.error(`${item.requestNumber || item.id} reddedildi!`);
  };

  const filterItems = (items: any[]) => {
    if (!searchQuery) return items;
    return items.filter(item => 
      JSON.stringify(item).toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Randevu & Talep Yönetimi</h1>
          <p className="text-gray-600">
            Teknik servis, ürün satış talepleri ve nakliye randevularını yönetin
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="technical" className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Teknik Servis ({filterItems(technicalServices).length})
            </TabsTrigger>
            <TabsTrigger value="sell" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Ürün Satış ({filterItems(sellRequests).length})
            </TabsTrigger>
            <TabsTrigger value="moving" className="flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Nakliye ({filterItems(movingBookings).length})
            </TabsTrigger>
          </TabsList>

          {/* Teknik Servis Tab */}
          <TabsContent value="technical" className="space-y-4">
            {filterItems(technicalServices).map((service) => {
              const statusConfig = getStatusConfig(service.status);
              return (
                <Card key={service.id} className="border-l-4 border-l-orange-500">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row justify-between gap-4">
                      {/* Sol Taraf */}
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{service.device}</h3>
                              <Badge className={`${statusConfig.bg} ${statusConfig.color} border-0`}>
                                {statusConfig.icon} {statusConfig.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">{service.requestNumber}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-gray-400" />
                            <span>{service.customerName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{service.customerPhone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>{service.appointmentDate}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span>{service.appointmentTime}</span>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-600 mb-1 font-medium">Sorun</p>
                          <p className="text-sm text-gray-800">{service.issue}</p>
                        </div>
                      </div>

                      {/* Sağ Taraf - Aksiyonlar */}
                      <div className="flex flex-col gap-2 lg:w-48">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedItem(service)}
                          className="w-full"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Detaylar
                        </Button>
                        
                        {service.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedItem(service);
                              setIsOfferModalOpen(true);
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                          >
                            <Banknote className="w-4 h-4 mr-2" />
                            Fiyat Gönder
                          </Button>
                        )}

                        {service.status === 'price_offered' && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
                            <p className="text-xs text-blue-700 font-medium">Teklif Gönderildi</p>
                            <p className="text-sm font-bold text-blue-900">{service.offeredPrice} ₺</p>
                          </div>
                        )}

                        {service.status === 'confirmed' && (
                          <>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center mb-2">
                              <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-1" />
                              <p className="text-xs text-green-700 font-medium">Müşteri Onayladı</p>
                              <p className="text-sm font-bold text-green-900">{service.offeredPrice} ₺</p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                toast.success('Servis başlatıldı!');
                              }}
                              className="w-full bg-orange-600 hover:bg-orange-700"
                            >
                              <Wrench className="w-4 h-4 mr-2" />
                              Servisi Başlat
                            </Button>
                          </>
                        )}

                        {service.status === 'in_progress' && (
                          <>
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-center mb-2">
                              <Wrench className="w-6 h-6 text-orange-600 mx-auto mb-1" />
                              <p className="text-xs text-orange-700 font-medium">Servis Devam Ediyor</p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                toast.success('Servis tamamlandı!');
                              }}
                              className="w-full bg-purple-600 hover:bg-purple-700"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Tamamla
                            </Button>
                          </>
                        )}

                        {service.status === 'completed' && (
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 text-center">
                            <CheckCircle2 className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                            <p className="text-xs text-purple-700 font-medium">Tamamlandı</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* Ürün Satış Tab */}
          <TabsContent value="sell" className="space-y-4">
            {filterItems(sellRequests).map((request) => {
              const statusConfig = getStatusConfig(request.status);
              return (
                <Card key={request.id} className="border-l-4 border-l-purple-500">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row justify-between gap-4">
                      {/* Sol Taraf */}
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <img 
                              src={request.photos[0]} 
                              alt={request.title}
                              className="w-20 h-20 object-cover rounded-lg"
                            />
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                                <Badge className={`${statusConfig.bg} ${statusConfig.color} border-0`}>
                                  {statusConfig.icon} {statusConfig.label}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">{request.requestNumber}</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-gray-400" />
                            <span>{request.customerName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{request.customerPhone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Package className="w-4 h-4 text-gray-400" />
                            <span>{getConditionLabel(request.condition)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Banknote className="w-4 h-4 text-gray-400" />
                            <span className="font-semibold">{request.requestedPrice.toLocaleString('tr-TR')} ₺</span>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-600 mb-1 font-medium">Ürün Detayları</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div><span className="text-gray-500">Marka:</span> {request.brand}</div>
                            <div><span className="text-gray-500">Model:</span> {request.model}</div>
                            <div><span className="text-gray-500">Kategori:</span> {request.category}</div>
                            <div><span className="text-gray-500">Kullanım:</span> {request.productDetails.usageDuration}</div>
                          </div>
                        </div>
                      </div>

                      {/* Sağ Taraf - Aksiyonlar */}
                      <div className="flex flex-col gap-2 lg:w-48">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedItem(request)}
                          className="w-full"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Detaylar
                        </Button>
                        
                        {request.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedItem(request);
                                setIsOfferModalOpen(true);
                              }}
                              className="w-full bg-blue-600 hover:bg-blue-700"
                            >
                              <Banknote className="w-4 h-4 mr-2" />
                              Teklif Gönder
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReject(request)}
                              className="w-full border-red-500 text-red-600 hover:bg-red-50"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reddet
                            </Button>
                          </>
                        )}

                        {request.status === 'counter_offer_sent' && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
                            <p className="text-xs text-blue-700 font-medium">Teklif Gönderildi</p>
                            <p className="text-sm font-bold text-blue-900">{request.counterOffer?.toLocaleString('tr-TR')} ₺</p>
                          </div>
                        )}

                        {request.status === 'approved' && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
                            <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-1" />
                            <p className="text-xs text-green-700 font-medium">Onaylandı</p>
                            <p className="text-sm font-bold text-green-900">{request.finalPrice?.toLocaleString('tr-TR')} ₺</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* Nakliye Tab */}
          <TabsContent value="moving" className="space-y-4">
            {filterItems(movingBookings).map((booking) => {
              const statusConfig = getStatusConfig(booking.status);
              return (
                <Card key={booking.id} className="border-l-4 border-l-teal-500">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row justify-between gap-4">
                      {/* Sol Taraf */}
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">Nakliye #{booking.id}</h3>
                              <Badge className={`${statusConfig.bg} ${statusConfig.color} border-0`}>
                                {statusConfig.icon} {statusConfig.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">{booking.homeSize}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-gray-400" />
                            <span>{booking.customerName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{booking.customerPhone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>{booking.date}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span>{booking.time}</span>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-green-600 mt-0.5" />
                            <div>
                              <p className="text-xs text-gray-500">Nereden</p>
                              <p className="text-sm text-gray-800">{booking.from}</p>
                              <p className="text-xs text-gray-500">{booking.floor}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-red-600 mt-0.5" />
                            <div>
                              <p className="text-xs text-gray-500">Nereye</p>
                              <p className="text-sm text-gray-800">{booking.to}</p>
                              <p className="text-xs text-gray-500">{booking.targetFloor}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {booking.items.map((item, idx) => (
                            <span key={idx} className="bg-teal-100 text-teal-700 px-2 py-1 rounded text-xs">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Sağ Taraf - Aksiyonlar */}
                      <div className="flex flex-col gap-2 lg:w-48">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedItem(booking)}
                          className="w-full"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Detaylar
                        </Button>
                        
                        {booking.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedItem(booking);
                              setIsOfferModalOpen(true);
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                          >
                            <Banknote className="w-4 h-4 mr-2" />
                            Fiyat Gönder
                          </Button>
                        )}

                        {booking.status === 'price_offered' && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
                            <p className="text-xs text-blue-700 font-medium">Teklif Gönderildi</p>
                            <p className="text-sm font-bold text-blue-900">{booking.offeredPrice?.toLocaleString('tr-TR')} ₺</p>
                          </div>
                        )}

                        {booking.status === 'confirmed' && (
                          <>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center mb-2">
                              <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-1" />
                              <p className="text-xs text-green-700 font-medium">Müşteri Onayladı</p>
                              <p className="text-sm font-bold text-green-900">{booking.offeredPrice?.toLocaleString('tr-TR')} ₺</p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                toast.success('Nakliye başlatıldı!');
                              }}
                              className="w-full bg-orange-600 hover:bg-orange-700"
                            >
                              <Truck className="w-4 h-4 mr-2" />
                              Nakliyeyi Başlat
                            </Button>
                          </>
                        )}

                        {booking.status === 'in_progress' && (
                          <>
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-center mb-2">
                              <Truck className="w-6 h-6 text-orange-600 mx-auto mb-1" />
                              <p className="text-xs text-orange-700 font-medium">Nakliye Devam Ediyor</p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                toast.success('Nakliye tamamlandı!');
                              }}
                              className="w-full bg-purple-600 hover:bg-purple-700"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Tamamla
                            </Button>
                          </>
                        )}

                        {booking.status === 'completed' && (
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 text-center">
                            <CheckCircle2 className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                            <p className="text-xs text-purple-700 font-medium">Tamamlandı</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>

        {/* Fiyat Teklifi Modal */}
        <AdminDialog open={isOfferModalOpen} onOpenChange={setIsOfferModalOpen}>
          <AdminDialogContent className="max-w-md">
            <AdminDialogHeader>
              <AdminDialogTitle className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-blue-600" />
                Fiyat Teklifi Gönder
              </AdminDialogTitle>
              <AdminDialogDescription>
                {selectedItem?.requestNumber || selectedItem?.id} için fiyat teklifi gönderin
              </AdminDialogDescription>
            </AdminDialogHeader>
            
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="price">Teklif Fiyatı (₺)</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="Örn: 5000"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="note">Açıklama (Opsiyonel)</Label>
                <Textarea
                  id="note"
                  placeholder="Teklif detayları, kapsam, garanti süresi vb..."
                  value={offerNote}
                  onChange={(e) => setOfferNote(e.target.value)}
                  rows={4}
                  className="mt-1.5"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSendOffer}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Gönder
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsOfferModalOpen(false);
                    setOfferPrice('');
                    setOfferNote('');
                  }}
                  className="flex-1"
                >
                  İptal
                </Button>
              </div>
            </div>
          </AdminDialogContent>
        </AdminDialog>
      </div>
    </AdminLayout>
  );
}