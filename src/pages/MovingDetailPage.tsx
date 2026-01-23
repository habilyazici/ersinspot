import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Truck, 
  Calendar, 
  MapPin, 
  Banknote, 
  CheckCircle2, 
  Clock, 
  User, 
  Home, 
  Phone, 
  Mail, 
  FileText, 
  Loader2, 
  XCircle, 
  Package,
  Building2,
  Send,
  AlertCircle,
  Image as ImageIcon,
  FileBarChart
} from 'lucide-react@0.487.0';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../utils/supabase/info';
import { Badge } from '../components/ui/badge';
import MovingReportModal from '../components/MovingReportModal';

// Eşya isimlerini Türkçeye çeviren fonksiyon
const getItemNameInTurkish = (itemName: string): string => {
  const itemTranslations: Record<string, string> = {
    // Mobilyalar
    'bed': 'Yatak',
    'sofa': 'Kanepe',
    'table': 'Masa',
    'chair': 'Sandalye',
    'wardrobe': 'Gardırop',
    'bookshelf': 'Kitaplık',
    'tv_stand': 'TV Ünitesi',
    'dining_table': 'Yemek Masası',
    'coffee_table': 'Sehpa',
    'armchair': 'Koltuk',
    'desk': 'Çalışma Masası',
    'dresser': 'Şifonyer',
    'nightstand': 'Komodin',
    
    // Beyaz Eşya
    'fridge': 'Buzdolabı',
    'washing': 'Çamaşır Makinesi', // KV Store'da washing olarak kaydedilmiş
    'washing_machine': 'Çamaşır Makinesi',
    'dishwasher': 'Bulaşık Makinesi',
    'oven': 'Fırın',
    'microwave': 'Mikrodalga',
    'dryer': 'Kurutma Makinesi',
    
    // Elektronik
    'tv': 'Televizyon',
    'computer': 'Bilgisayar',
    'laptop': 'Laptop',
    'monitor': 'Monitör',
    
    // Diğer
    'box': 'Koli/Kutu',
    'mirror': 'Ayna',
    'lamp': 'Lamba',
    'carpet': 'Halı',
    'curtain': 'Perde',
    'painting': 'Tablo',
    'plant': 'Bitki',
    'bicycle': 'Bisiklet',
    'other': 'Diğer',
  };
  
  return itemTranslations[itemName.toLowerCase()] || itemName;
};

export default function MovingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  
  const [request, setRequest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [isRespondingToOffer, setIsRespondingToOffer] = useState(false);

  // Backend'den nakliye detayını yükle
  useEffect(() => {
    const loadRequestDetail = async () => {
      if (!user || !accessToken) {
        setIsLoading(false);
        toast.error('Nakliye detaylarını görmek için giriş yapmalısınız');
        navigate('/giris');
        return;
      }

      try {
        setIsLoading(true);
        console.log('🚚 Loading moving request detail:', id);
        
        // ID requestNumber olarak kullanılıyor
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/moving/request/${id}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Talep bulunamadı');
          }
          throw new Error('Talep yüklenemedi');
        }

        const data = await response.json();
        console.log('✅ Request loaded:', data);
        console.log('📊 Request details:', JSON.stringify(data.request, null, 2));
        
        if (!data.request) {
          throw new Error('Talep bulunamadı');
        }
        
        setRequest(data.request);
        
      } catch (error: any) {
        console.error('[MOVING DETAIL] Talep detay yükleme hatası:', error);
        toast.error(error.message || 'Nakliye detayları yüklenirken bir hata oluştu');
        setRequest(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadRequestDetail();
  }, [id, user, accessToken, navigate]);

  // Yükleniyor durumu
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-24">
        <Card className="p-8 text-center max-w-md">
          <Loader2 className="w-16 h-16 text-[var(--brand-teal-600)] mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Yükleniyor...</h2>
          <p className="text-gray-600">Nakliye detayları getiriliyor</p>
        </Card>
      </div>
    );
  }

  // Talep bulunamadı
  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-24">
        <Card className="p-8 text-center max-w-md">
          <Truck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Talep Bulunamadı</h2>
          <p className="text-gray-600 mb-1">Aradığınız nakliye talebi bulunamadı.</p>
          <p className="text-sm text-gray-500 mb-6">Talep ID: {id || 'Belirtilmedi'}</p>
          <Link to="/hesabim/nakliye">
            <Button className="bg-[var(--brand-teal-600)] hover:bg-[var(--brand-teal-700)]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Nakliye Randevularıma Dön
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Tarihleri formatla
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('tr-TR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '-';
    try {
      return timeString.substring(0, 5); // HH:MM format
    } catch {
      return timeString;
    }
  };

  // Talebi iptal et
  const handleCancelRequest = async () => {
    if (isCancelling) return;
    
    try {
      setIsCancelling(true);
      setCancelDialogOpen(false);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/moving/${id}/cancel`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        toast.success('Nakliye talebi başarıyla iptal edildi.');
        setRequest({ ...request, status: 'rejected', updatedAt: new Date().toISOString() });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Bir hata oluştu');
      }
    } catch (error: any) {
      console.error('Error cancelling request:', error);
      toast.error(error.message || 'Bir hata oluştu');
    } finally {
      setIsCancelling(false);
    }
  };

  // İptal edilebilir mi kontrol et
  const canCancelRequest = (status: string) => {
    return status === 'pending' || status === 'reviewing' || status === 'offer_sent';
  };

  // Teklif kabul/red fonksiyonu
  const handleRespondToOffer = async (action: 'accept' | 'reject') => {
    if (isRespondingToOffer) return;

    try {
      setIsRespondingToOffer(true);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/moving/${id}/respond`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'İşlem başarısız');
      }

      // Başarılı - request'i güncelle
      setRequest({ 
        ...request, 
        status: action === 'accept' ? 'accepted' : 'rejected',
        updated_at: new Date().toISOString()
      });

      setOfferDialogOpen(false);
      
      if (action === 'accept') {
        toast.success('✅ Teklif onaylandı! Nakliye randevunuz kesinleştirildi.');
      } else {
        toast.error('❌ Teklif reddedildi. Talep iptal edildi.');
      }
    } catch (error: any) {
      console.error('Teklif yanıtlanırken hata:', error);
      toast.error(error.message || 'Bir hata oluştu');
    } finally {
      setIsRespondingToOffer(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; color: string; bg: string; icon: any }> = {
      pending: { label: 'İnceleniyor', color: 'text-blue-700', bg: 'bg-blue-100', icon: Clock },
      reviewing: { label: 'İnceleniyor', color: 'text-blue-700', bg: 'bg-blue-100', icon: Clock },
      offer_sent: { label: 'Teklif Geldi', color: 'text-purple-700', bg: 'bg-purple-100', icon: Banknote },
      accepted: { label: 'Kabul Edildi', color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle2 },
      completed: { label: 'Tamamlandı', color: 'text-orange-700', bg: 'bg-orange-100', icon: CheckCircle2 },
      rejected: { label: 'İptal Edildi', color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
    };

    const config = configs[status] || { label: 'Bilinmeyen', color: 'text-gray-700', bg: 'bg-gray-100', icon: Clock };
    const Icon = config.icon;

    return (
      <div className={`${config.bg} ${config.color} px-4 py-2 rounded-xl font-medium flex items-center gap-2`}>
        <Icon className="w-5 h-5" />
        {config.label}
      </div>
    );
  };

  // Nakliye takibi timeline'ı render et
  const renderMovingTimeline = () => {
    // İptal edilmiş talep için özel görünüm
    if (request.status === 'rejected') {
      return (
        <Card className="shadow-lg border-0 bg-red-50">
          <CardHeader className="bg-gradient-to-r from-red-100 to-red-50 border-b p-4">
            <CardTitle className="flex items-center gap-2 text-red-700 text-base">
              <XCircle className="w-5 h-5" />
              Talep Durumu
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-red-900 mb-2">Talep İptal Edildi</h3>
              <p className="text-red-700 text-sm mb-2">Bu nakliye talebi iptal edilmiştir.</p>
              {request.updated_at && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-100 rounded-full mt-2">
                  <Calendar className="w-3.5 h-3.5 text-red-700" />
                  <span className="text-xs text-red-700 font-medium">{formatDateTime(request.updated_at)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    // Normal talep akışı (5 aşama)
    const stages = [
      { key: 'pending', label: 'Talep Alındı', icon: FileText, description: 'Talebiniz alındı' },
      { key: 'reviewing', label: 'İnceleniyor', icon: Clock, description: 'Talebiniz inceleniyor' },
      { key: 'offer_sent', label: 'Teklif Gönderildi', icon: Banknote, description: 'Fiyat teklifi hazırlandı' },
      { key: 'accepted', label: 'Randevu Onaylandı', icon: CheckCircle2, description: 'Randevu kesinleşti' },
      { key: 'completed', label: 'Tamamlandı', icon: Truck, description: 'Taşınma tamamlandı' },
    ];

    const currentStageIndex = stages.findIndex(s => s.key === request.status);
    console.log('📍 Current status:', request.status, 'Stage index:', currentStageIndex);
    
    return (
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-[var(--brand-teal-50)] to-white border-b p-4">
          <CardTitle className="flex items-center gap-2 text-[var(--brand-teal-700)] text-base">
            <Truck className="w-5 h-5" />
            Talep Takibi
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="relative">
            {/* Timeline çizgisi */}
            <div className="absolute top-8 left-8 w-1 bg-gray-200" style={{ height: 'calc(100% - 4rem)' }}>
              <div 
                className="w-full bg-gradient-to-b from-[var(--brand-teal-600)] to-[var(--brand-orange-600)] transition-all duration-500"
                style={{ 
                  height: currentStageIndex >= 0 
                    ? `${(currentStageIndex / (stages.length - 1)) * 100}%` 
                    : '0%'
                }}
              ></div>
            </div>

            {/* Aşamalar */}
            <div className="space-y-6 relative">
              {stages.map((stage, index) => {
                const isPast = index < currentStageIndex;
                const isCurrent = index === currentStageIndex;
                const isFuture = index > currentStageIndex;
                const Icon = stage.icon;

                return (
                  <div key={stage.key} className="flex items-start gap-4 relative">
                    {/* İkon */}
                    <div className={`
                      w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all duration-300 shadow-lg
                      ${isPast ? 'bg-gradient-to-br from-green-500 to-green-600 scale-100' : ''}
                      ${isCurrent ? 'bg-gradient-to-br from-[var(--brand-teal-600)] to-[var(--brand-orange-600)] scale-110 ring-4 ring-[var(--brand-orange-200)] animate-pulse' : ''}
                      ${isFuture ? 'bg-gray-200 scale-90' : ''}
                    `}>
                      <Icon className={`w-7 h-7 ${isPast || isCurrent ? 'text-white' : 'text-gray-400'}`} />
                    </div>

                    {/* Bilgi */}
                    <div className="flex-1 pt-3">
                      <h4 className={`font-semibold mb-1 ${isCurrent ? 'text-[var(--brand-teal-700)]' : isPast ? 'text-gray-700' : 'text-gray-400'}`}>
                        {stage.label}
                      </h4>
                      <p className={`text-sm ${isPast || isCurrent ? 'text-gray-600' : 'text-gray-400'}`}>
                        {stage.description}
                      </p>
                      {(isPast || isCurrent) && request.updated_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDateTime(request.updated_at)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="bg-gradient-to-b from-gray-50 via-white to-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-[var(--brand-orange-600)]/30 via-[var(--brand-orange-500)]/30 to-[var(--brand-coral-500)]/30 text-white py-10 pt-24">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            {/* Üst Navigasyon Butonları */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Link to="/hesabim">
                <Button variant="ghost" className="text-white hover:bg-white/20" size="sm">
                  <Home className="w-4 h-4 mr-2" />
                  Hesabıma Dön
                </Button>
              </Link>
              <Link to="/hesabim/nakliye">
                <Button variant="ghost" className="text-white hover:bg-white/20" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Nakliye Randevularıma Dön
                </Button>
              </Link>
            </div>
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-white to-gray-100 rounded-xl flex items-center justify-center shadow-xl">
                  <Truck className="w-7 h-7 text-[var(--brand-orange-600)]" />
                </div>
                <div>
                  <h1 className="text-2xl mb-1 drop-shadow-lg font-bold">Nakliye Detayları</h1>
                  <p className="text-white/90 text-sm font-medium drop-shadow">
                    Talep #{request.request_number}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-start lg:items-end gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {getStatusBadge(request.status)}
                  {request.status === 'offer_sent' && (
                    <Button
                      onClick={() => setOfferDialogOpen(true)}
                      size="sm"
                      className="bg-white text-[var(--brand-orange-600)] hover:bg-white/90 shadow-lg"
                    >
                      <Banknote className="w-4 h-4 mr-1.5" />
                      Teklifi Görüntüle
                    </Button>
                  )}
                  {request.status === 'completed' && (
                    <Button
                      onClick={() => setReportDialogOpen(true)}
                      size="sm"
                      className="bg-white text-green-600 hover:bg-white/90 shadow-lg"
                    >
                      <FileBarChart className="w-4 h-4 mr-1.5" />
                      Raporu Görüntüle
                    </Button>
                  )}
                </div>
                {(request.admin_offer || request.admin_offer_price) && (
                  <div className="text-left lg:text-right">
                    <p className="text-xs text-white/80">Teklif Tutarı</p>
                    <p className="text-xl font-bold">
                      {(request.admin_offer || request.admin_offer_price)?.toLocaleString('tr-TR')} ₺
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sol Kolon - Detaylar */}
            <div className="lg:col-span-2 space-y-6">
              {/* Nakliye Takibi */}
              {renderMovingTimeline()}

              {/* Taşınma Bilgileri */}
              <Card className="shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-[var(--brand-teal-50)] to-white border-b p-4">
                  <CardTitle className="flex items-center gap-2 text-[var(--brand-teal-700)] text-base">
                    <Calendar className="w-5 h-5" />
                    Taşınma Bilgileri
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Taşınma Tarihi
                      </p>
                      <p className="font-medium">{formatDate(request.moving_date)}</p>
                    </div>
                    {request.preferred_time && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Tercih Edilen Saat
                        </p>
                        <p className="font-medium">{formatTime(request.preferred_time)}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                        <Home className="w-3.5 h-3.5" />
                        Ev Büyüklüğü
                      </p>
                      <p className="font-medium">{request.home_size}</p>
                    </div>
                    {request.distance && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          Mesafe
                        </p>
                        <p className="font-medium">{request.distance} km</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Adres Bilgileri */}
              <Card className="shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-[var(--brand-teal-50)] to-white border-b p-4">
                  <CardTitle className="flex items-center gap-2 text-[var(--brand-teal-700)] text-base">
                    <MapPin className="w-5 h-5" />
                    Adres Bilgileri
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <p className="text-sm font-medium text-green-700">Başlangıç Adresi</p>
                    </div>
                    <p className="text-gray-800 mb-1">{request.from_address}</p>
                    {(request.from_district || request.from_city) && (
                      <p className="text-sm text-gray-600 mb-1">
                        {[request.from_district, request.from_city].filter(Boolean).join(', ')}
                      </p>
                    )}
                    <p className="text-sm text-gray-600">
                      {request.floor}. Kat - {request.elevator_from ? '✅ Asansör var' : '❌ Asansör yok'}
                    </p>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <p className="text-sm font-medium text-red-700">Varış Adresi</p>
                    </div>
                    <p className="text-gray-800 mb-1">{request.to_address}</p>
                    {(request.to_district || request.to_city) && (
                      <p className="text-sm text-gray-600 mb-1">
                        {[request.to_district, request.to_city].filter(Boolean).join(', ')}
                      </p>
                    )}
                    <p className="text-sm text-gray-600">
                      {request.target_floor}. Kat - {request.elevator_to ? '✅ Asansör var' : '❌ Asansör yok'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Taşınacak Eşyalar */}
              {request.items && request.items.length > 0 && (
                <Card className="shadow-lg border-0">
                  <CardHeader className="bg-gradient-to-r from-[var(--brand-teal-50)] to-white border-b p-4">
                    <CardTitle className="flex items-center gap-2 text-[var(--brand-teal-700)] text-base">
                      <Package className="w-5 h-5" />
                      Taşınacak Eşyalar ({request.items.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-2">
                      {request.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Package className="w-5 h-5 text-[var(--brand-teal-600)]" />
                            <div>
                              <p className="font-medium text-gray-800">
                                {item.item_type === 'custom' ? item.item_name : getItemNameInTurkish(item.item_name)}
                              </p>
                              {item.item_type && (
                                <p className="text-xs text-gray-500">
                                  {item.item_type === 'custom' ? '✏️ Özel Eşya' : '📦 Standart'}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-white">
                            x{item.quantity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Açıklama */}
              {request.description && (
                <Card className="shadow-lg border-0">
                  <CardHeader className="bg-gradient-to-r from-[var(--brand-teal-50)] to-white border-b p-4">
                    <CardTitle className="flex items-center gap-2 text-[var(--brand-teal-700)] text-base">
                      <FileText className="w-5 h-5" />
                      Açıklama
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="text-gray-700 whitespace-pre-wrap">{request.description}</p>
                  </CardContent>
                </Card>
              )}

              {/* Fotoğraflar */}
              {request.photos && request.photos.length > 0 && (
                <Card className="shadow-lg border-0">
                  <CardHeader className="bg-gradient-to-r from-[var(--brand-orange-50)] to-white border-b p-4">
                    <CardTitle className="flex items-center gap-2 text-[var(--brand-orange-700)] text-base">
                      <ImageIcon className="w-5 h-5" />
                      Eşya Fotoğrafları ({request.photos.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {request.photos.map((photo: any, index: number) => (
                        <div 
                          key={index}
                          className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-[var(--brand-orange-400)] transition-all cursor-pointer group"
                          onClick={() => window.open(photo.photo_url, '_blank')}
                        >
                          <img 
                            src={photo.photo_url} 
                            alt={`Eşya fotoğrafı ${index + 1}`}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-3 text-center">
                      Fotoğrafları büyütmek için tıklayın
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Admin Notları */}
              {request.admin_notes && (
                <Card className="shadow-lg border-0 bg-blue-50">
                  <CardHeader className="bg-gradient-to-r from-blue-100 to-blue-50 border-b p-4">
                    <CardTitle className="flex items-center gap-2 text-blue-700 text-base">
                      <AlertCircle className="w-5 h-5" />
                      Admin Notları
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="text-blue-900 whitespace-pre-wrap">{request.admin_notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Güncelleme Geçmişi */}
              {request.updates && request.updates.length > 0 && (
                <Card className="shadow-lg border-0">
                  <CardHeader className="bg-gradient-to-r from-[var(--brand-orange-50)] to-white border-b p-4">
                    <CardTitle className="flex items-center gap-2 text-[var(--brand-orange-700)] text-base">
                      <Clock className="w-5 h-5" />
                      Güncelleme Geçmişi
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {request.updates.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((update: any) => (
                        <div key={update.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-2 h-2 bg-[var(--brand-orange-500)] rounded-full mt-2"></div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-800 font-medium">{update.note}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {format(new Date(update.created_at), 'PPp', { locale: tr })}
                              {update.created_by && ` • ${update.created_by === 'admin' ? 'Admin' : update.created_by === 'customer' ? 'Müşteri' : 'Sistem'}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sağ Kolon - Fiyat ve İletişim */}
            <div className="space-y-6">
              {/* Fiyat Bilgileri */}
              <Card className="shadow-lg border-0 sticky top-24">
                <CardHeader className="bg-gradient-to-r from-[var(--brand-orange-50)] to-white border-b p-4">
                  <CardTitle className="flex items-center gap-2 text-[var(--brand-orange-700)] text-base">
                    <Banknote className="w-5 h-5" />
                    Fiyat Bilgileri
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {(request.admin_offer_price || request.admin_offer) ? (
                    <>
                      <div>
                        <p className="text-sm text-green-600 mb-1">💰 ErsinSpot Teklifi</p>
                        <p className="text-3xl font-bold text-green-600">
                          ₺{(request.admin_offer_price || request.admin_offer || 0).toLocaleString('tr-TR')}
                        </p>
                      </div>
                      
                      {request.status === 'offer_sent' && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                          <p className="text-sm text-yellow-800">
                            ⏳ Fiyat teklifimiz beklemede. Yukarıdaki "Teklifi Görüntüle" butonuna tıklayarak onaylayabilir veya reddedebilirsiniz.
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-500 italic">
                        ErsinSpot teklifi henüz hazırlanmadı
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* İletişim Bilgileri */}
              <Card className="shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-gray-100 to-white border-b p-4">
                  <CardTitle className="flex items-center gap-2 text-gray-700 text-base">
                    <User className="w-5 h-5" />
                    Müşteri Bilgileri
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-3">
                  {(request.customer || request.customer_name) && (
                    <>
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-gray-500" />
                        <p className="text-sm text-gray-700">
                          {request.customer?.name || request.customer_name || 'Bilgi yok'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <p className="text-sm text-gray-700">
                          {request.customer?.phone || request.customer_phone || 'Bilgi yok'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <p className="text-sm text-gray-700">
                          {request.customer?.email || request.customer_email || 'Bilgi yok'}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>


          </div>
        </div>
      </div>

      {/* Teklif Detayları Dialog'u */}
      <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Banknote className="w-6 h-6 text-[var(--brand-orange-600)]" />
              ErsinSpot Teklifi
            </DialogTitle>
            <DialogDescription className="mt-2">
              <span className="inline-flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full text-sm font-medium">
                <FileText className="w-4 h-4" />
                Talep #{request?.request_number}
              </span>
            </DialogDescription>
          </DialogHeader>
          
          {request && (
            <div className="space-y-6 py-4">
              {/* Teklif Fiyatı */}
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-sm text-green-700 mb-2 font-medium">💰 ErsinSpot Teklif Fiyatı</p>
                    <p className="text-5xl font-bold text-green-600 mb-2">
                      ₺{(request.admin_offer_price || request.admin_offer || 0).toLocaleString('tr-TR')}
                    </p>
                    <p className="text-xs text-green-700">KDV Dahil</p>
                  </div>
                </CardContent>
              </Card>

              {/* Admin Notları */}
              {request.admin_notes && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-blue-900 mb-1 text-sm">Teklif Notları</h4>
                        <p className="text-sm text-blue-800 whitespace-pre-wrap">{request.admin_notes}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Bilgilendirme */}
              <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚡</span>
                    <div>
                      <h4 className="font-semibold text-amber-900 mb-2">Hızlı Karar Verin!</h4>
                      <div className="space-y-2 text-sm text-amber-800">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <p><strong>Onaylarsanız:</strong> Nakliye randevunuz kesinleştirilecek ve taşınma işleminiz planlanacaktır.</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <p><strong>Reddederseniz:</strong> Nakliye talebi iptal edilecek ve işlem yapılmayacaktır.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Aksiyon Butonları */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Button
                  onClick={() => handleRespondToOffer('accept')}
                  disabled={isRespondingToOffer}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-6 shadow-lg h-auto rounded-xl"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  {isRespondingToOffer ? 'İşlem Yapılıyor...' : 'Teklifi Onayla'}
                </Button>
                <Button
                  onClick={() => handleRespondToOffer('reject')}
                  disabled={isRespondingToOffer}
                  variant="outline"
                  className="border-2 border-red-500 text-red-700 hover:bg-red-50 py-6 h-auto rounded-xl"
                >
                  <XCircle className="w-5 h-5 mr-2" />
                  {isRespondingToOffer ? 'İşlem Yapılıyor...' : 'Teklifi Reddet'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* İptal Onay Dialog'u */}
      {cancelDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <XCircle className="w-6 h-6" />
                Talebi İptal Et
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-6">
                <strong>#{request.request_number}</strong> numaralı nakliye talebinizi iptal etmek istediğinizden emin misiniz? 
                Bu işlem geri alınamaz.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCancelDialogOpen(false)}
                  className="flex-1"
                  disabled={isCancelling}
                >
                  Vazgeç
                </Button>
                <Button
                  onClick={handleCancelRequest}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  disabled={isCancelling}
                >
                  {isCancelling ? 'İptal Ediliyor...' : 'Talebi İptal Et'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rapor Modal */}
      <MovingReportModal
        open={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        request={request}
      />
    </div>
  );
}
