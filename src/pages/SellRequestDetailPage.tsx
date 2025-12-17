import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Package, MapPin, Calendar, ArrowLeft, Phone, Mail, User, CheckCircle2, Clock, Home, Banknote, Tag, Search, Truck, XCircle, FileCheck, ChevronLeft, ChevronRight, Eye } from 'lucide-react@0.487.0';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { useAuth } from '../contexts/AuthContext';
import { projectId } from '../utils/supabase/info';
import { getConditionLabel } from '../utils/conditionHelper';

interface SellRequestDetail {
  id: number;
  requestNumber: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  condition: string;
  description: string;
  requestedPrice: number;
  offerPrice?: number;
  offerNote?: string;
  status: string;
  statusText: string;
  createdAt: string;
  images: string[];
  customerInfo: {
    name: string;
    phone: string;
    email: string;
    address: string;
  };
}

export default function SellRequestDetailPage() {
  const { id } = useParams();
  const { user, accessToken } = useAuth();
  const [request, setRequest] = useState<SellRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    const loadRequestDetail = async () => {
      if (!user || !accessToken || !id) {
        setLoading(false);
        setError('Giriş yapmanız gerekiyor');
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/user-sell-requests/${id}`,
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
          console.log('[SELL REQUEST DETAIL] ✅ Backend response:', data);
          setRequest(data.request);
        } else {
          const errorData = await response.json();
          console.error('[SELL REQUEST DETAIL] ❌ Error:', response.status, errorData);
          setError(errorData.error || 'Talep bulunamadı');
        }
      } catch (error: any) {
        console.error('[SELL REQUEST DETAIL] Talep detay yükleme hatası:', error);
        setError('Ürün satış detayları yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    loadRequestDetail();
  }, [user, accessToken, id]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
      pending: { label: 'Beklemede', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: Clock },
      reviewing: { label: 'İnceleniyor', color: 'text-blue-700', bg: 'bg-blue-100', icon: Clock },
      offer_sent: { label: 'Teklif Geldi', color: 'text-blue-700', bg: 'bg-blue-100', icon: Banknote },
      accepted: { label: 'Onaylandı', color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle2 },
      rejected: { label: 'Reddedildi', color: 'text-red-700', bg: 'bg-red-100', icon: Clock },
      completed: { label: 'Tamamlandı', color: 'text-purple-700', bg: 'bg-purple-100', icon: CheckCircle2 },
      cancelled: { label: 'İptal Edildi', color: 'text-gray-700', bg: 'bg-gray-100', icon: Clock },
    };

    const config = statusConfig[status] || { label: status, color: 'text-gray-700', bg: 'bg-gray-100', icon: Clock };
    const Icon = config.icon;
    
    return (
      <div className={`${config.bg} ${config.color} px-4 py-2 rounded-xl font-medium flex items-center gap-2`}>
        <Icon className="w-5 h-5" />
        {config.label}
      </div>
    );
  };

  // Süreç takibi timeline'ı
  const renderProcessTimeline = () => {
    // İptal/Red durumu için özel görünüm
    if (request?.status === 'cancelled' || request?.status === 'rejected') {
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
              <h3 className="text-xl font-semibold text-red-900 mb-2">
                {request.status === 'cancelled' ? 'Talep İptal Edildi' : 'Teklif Reddedildi'}
              </h3>
              <p className="text-red-700 text-sm">
                {request.status === 'cancelled' 
                  ? 'Bu talep iptal edilmiştir.' 
                  : 'Teklifi reddettiniz. Yeni bir talep oluşturabilirsiniz.'}
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Satış süreci aşamaları
    const stages = [
      { key: 'pending', label: 'Talep Alındı', icon: Clock, description: 'Talebiniz başarıyla alındı' },
      { key: 'reviewing', label: 'İncelemede', icon: Search, description: 'Ürününüz değerlendiriliyor' },
      { key: 'offer_sent', label: 'Teklif Gönderildi', icon: Banknote, description: 'Fiyat teklifimiz gönderildi' },
      { key: 'accepted', label: 'Onaylandı', icon: CheckCircle2, description: 'Teklif onaylandı' },
      { key: 'completed', label: 'Tamamlandı', icon: FileCheck, description: 'Satış tamamlandı' },
    ];

    const currentStageIndex = stages.findIndex(s => s.key === request?.status);
    
    return (
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-[var(--brand-orange-50)] to-white border-b p-4">
          <CardTitle className="flex items-center gap-2 text-[var(--brand-orange-700)] text-base">
            <Package className="w-5 h-5" />
            Süreç Takibi
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="relative">
            {/* Timeline çizgisi */}
            <div className="absolute top-8 left-8 w-1 bg-gray-200" style={{ height: 'calc(100% - 4rem)' }}>
              <div 
                className="w-full bg-gradient-to-b from-[var(--brand-navy-600)] to-[var(--brand-orange-600)] transition-all duration-500"
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
                      ${isCurrent ? 'bg-gradient-to-br from-[var(--brand-navy-600)] to-[var(--brand-orange-600)] scale-110 ring-4 ring-[var(--brand-orange-200)] animate-pulse' : ''}
                      ${isFuture ? 'bg-gray-200 scale-90' : ''}
                    `}>
                      <Icon className={`
                        w-8 h-8 transition-all
                        ${isPast ? 'text-white' : ''}
                        ${isCurrent ? 'text-white' : ''}
                        ${isFuture ? 'text-gray-400' : ''}
                      `} />
                    </div>

                    {/* Metin */}
                    <div className="flex-1 pt-2">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className={`
                          font-semibold transition-all
                          ${isPast ? 'text-green-700' : ''}
                          ${isCurrent ? 'text-[var(--brand-navy-700)] text-lg' : ''}
                          ${isFuture ? 'text-gray-400' : ''}
                        `}>
                          {stage.label}
                        </h4>
                        {/* Tarih badge - sadece talep oluşturma için */}
                        {stage.key === 'pending' && request?.createdAt && (
                          <div className={`
                            inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                            ${isPast ? 'bg-green-50 text-green-700' : ''}
                            ${isCurrent ? 'bg-gradient-to-r from-[var(--brand-navy-50)] to-[var(--brand-orange-50)] text-[var(--brand-navy-700)]' : ''}
                          `}>
                            <Calendar className="w-3 h-3" />
                            {request.createdAt}
                          </div>
                        )}
                      </div>
                      <p className={`
                        text-sm
                        ${isPast ? 'text-green-600' : ''}
                        ${isCurrent ? 'text-[var(--brand-orange-600)] font-medium' : ''}
                        ${isFuture ? 'text-gray-400' : ''}
                      `}>
                        {isCurrent && '🔄 '}{stage.description}
                      </p>
                      
                      {/* Tamamlandı işareti */}
                      {isPast && (
                        <div className="flex items-center gap-1 mt-1">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-xs text-green-600 font-medium">Tamamlandı</span>
                        </div>
                      )}
                      
                      {/* Mevcut aşama bilgisi */}
                      {isCurrent && (
                        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-[var(--brand-navy-50)] to-[var(--brand-orange-50)] rounded-full">
                          <div className="w-2 h-2 bg-[var(--brand-orange-600)] rounded-full animate-pulse"></div>
                          <span className="text-xs text-[var(--brand-navy-700)] font-semibold">Şu anda bu aşamada</span>
                        </div>
                      )}
                      
                      {/* Özel mesajlar */}
                      {isCurrent && stage.key === 'offer_sent' && request?.offerPrice && (
                        <div className="mt-3 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-900 font-medium mb-1">💰 Teklif: {request.offerPrice.toLocaleString('tr-TR')} ₺</p>
                          <p className="text-xs text-blue-700">Lütfen teklifi değerlendirin ve yanıt verin</p>
                        </div>
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

  // Loading durumu
  if (loading) {
    return (
      <div className="bg-gradient-to-b from-gray-50 via-white to-gray-50 min-h-screen">
        <div className="bg-gradient-to-br from-[var(--brand-orange-600)]/30 via-[var(--brand-orange-500)]/30 to-[var(--brand-coral-500)]/30 text-white py-10 pt-24">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <Skeleton className="w-40 h-10 mb-4" />
              <div className="flex items-center gap-4">
                <Skeleton className="w-14 h-14 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="w-48 h-8" />
                  <Skeleton className="w-32 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto space-y-4">
            <Card className="shadow-lg">
              <CardContent className="p-8">
                <Skeleton className="w-full h-40" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Hata durumu
  if (error || !request) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-24">
        <Card className="p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-gray-800 mb-2 font-semibold">{error || 'Talep bulunamadı'}</h3>
          <p className="text-gray-600 mb-6 text-sm">
            Bu talebe erişim yetkiniz olmayabilir veya talep mevcut olmayabilir.
          </p>
          <Link to="/hesabim/satis-taleplerim">
            <Button className="bg-[var(--brand-orange-600)] hover:bg-[var(--brand-orange-700)]">
              Satış Taleplerime Dön
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

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
              <Link to="/hesabim/satis-taleplerim">
                <Button variant="ghost" className="text-white hover:bg-white/20" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Satış Taleplerime Dön
                </Button>
              </Link>
            </div>
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-white to-gray-100 rounded-xl flex items-center justify-center shadow-xl">
                  <Package className="w-7 h-7 text-[var(--brand-orange-600)]" />
                </div>
                <div>
                  <h1 className="text-2xl mb-1 drop-shadow-lg font-bold">Talep Detayları</h1>
                  <p className="text-white/90 text-sm font-medium drop-shadow">
                    Talep {request.requestNumber}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-start lg:items-end gap-1.5">
                {getStatusBadge(request.status)}
                <div className="text-left lg:text-right">
                  <p className="text-xs text-gray-300">Talep Edilen Fiyat</p>
                  <p className="text-xl font-bold">{request.requestedPrice?.toLocaleString('tr-TR')} ₺</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-4">
          
          {/* Süreç Takibi Timeline */}
          {renderProcessTimeline()}

          {/* Talep Bilgileri */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-[var(--brand-orange-50)] to-white border-b p-4">
              <CardTitle className="flex items-center gap-2 text-[var(--brand-orange-700)] text-base">
                <Calendar className="w-5 h-5" />
                Talep Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-[var(--brand-orange-100)] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-[var(--brand-orange-600)]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Talep Tarihi</p>
                    <p className="font-medium text-sm text-gray-800">{request.createdAt}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-[var(--brand-orange-100)] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Tag className="w-5 h-5 text-[var(--brand-orange-600)]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Durum</p>
                    <p className="font-medium text-sm text-gray-800">{request.statusText}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-[var(--brand-orange-100)] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Banknote className="w-5 h-5 text-[var(--brand-orange-600)]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Talep Edilen Fiyat</p>
                    <p className="font-medium text-sm text-gray-800">{request.requestedPrice.toLocaleString('tr-TR')} ₺</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Teklif Geldi - Özel Bilgilendirme */}
          {request.status === 'offer_sent' && request.offerPrice && (
            <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-2xl">💰</span>
                  </div>
                  <h3 className="text-xl font-bold text-blue-900">Karşı Teklif Aldınız!</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-white/70 p-4 rounded-lg text-center">
                    <p className="text-xs text-gray-600 mb-1">Talebiniz</p>
                    <p className="text-2xl font-bold text-gray-700 line-through">{request.requestedPrice.toLocaleString('tr-TR')} ₺</p>
                  </div>
                  <div className="bg-white/70 p-4 rounded-lg text-center">
                    <p className="text-xs text-gray-600 mb-1">Karşı Teklifimiz</p>
                    <p className="text-2xl font-bold text-blue-900">{request.offerPrice.toLocaleString('tr-TR')} ₺</p>
                  </div>
                </div>
                
                {request.offerNote && (
                  <div className="bg-white/70 p-4 rounded-lg mb-4">
                    <p className="text-xs text-gray-600 mb-1.5 font-medium">Açıklama</p>
                    <p className="text-sm text-gray-700">{request.offerNote}</p>
                  </div>
                )}

                <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    <strong>Not:</strong> Teklifi kabul etmek veya reddetmek için{' '}
                    <Link to="/hesabim/satis-taleplerim" className="underline font-semibold">
                      Satış Taleplerim
                    </Link>
                    {' '}sayfasına gidin ve "Teklif Detayları" butonuna tıklayın.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ürün Detayları */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-[var(--brand-orange-50)] to-white border-b p-4">
              <CardTitle className="flex items-center gap-2 text-[var(--brand-orange-700)] text-base">
                <Package className="w-5 h-5" />
                Ürün Detayları
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3 p-3 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200">
                  {request.images && request.images.length > 0 && (
                    <div className="relative group">
                      <img 
                        src={request.images[0]} 
                        alt={request.title}
                        className="w-full sm:w-32 h-32 object-cover rounded-lg shadow-sm cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => {
                          setSelectedImageIndex(0);
                          setIsGalleryOpen(true);
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-all duration-200 flex items-center justify-center">
                        <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <div>
                      <h3 className="font-semibold text-sm text-gray-800">{request.title}</h3>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <span className="px-2 py-0.5 bg-[var(--brand-orange-100)] text-[var(--brand-orange-700)] rounded-full text-xs font-medium">
                          {request.brand}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs font-medium">
                          {request.model}
                        </span>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          {getConditionLabel(request.condition)}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t text-xs">
                      <div>
                        <p className="text-gray-500 mb-0.5">Ürün Yılı</p>
                        <p className="font-medium">{request.year}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-0.5">Marka</p>
                        <p className="font-medium">{request.brand}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-0.5">Model</p>
                        <p className="font-medium">{request.model}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ürün Fotoğrafları */}
              {request.images && request.images.length > 1 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-600 mb-2 font-medium">Ürün Fotoğrafları ({request.images.length})</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {request.images.map((photo: string, idx: number) => (
                      <div key={idx} className="relative group">
                        <img 
                          src={photo}
                          alt={`${request.title} - ${idx + 1}`}
                          className="w-full h-32 object-cover rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer hover:scale-105"
                          onClick={() => {
                            setSelectedImageIndex(idx);
                            setIsGalleryOpen(true);
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-all duration-200 flex items-center justify-center">
                          <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ürün Açıklaması - Ayrı Card */}
          {request.description && (
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-[var(--brand-orange-50)] to-white border-b p-4">
                <CardTitle className="flex items-center gap-2 text-[var(--brand-orange-700)] text-base">
                  <Package className="w-5 h-5" />
                  Ürün Açıklaması
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="p-5 bg-gradient-to-br from-gray-50 to-white rounded-xl border-l-4 border-[var(--brand-orange-500)] shadow-sm">
                  <p className="text-gray-800 leading-relaxed">{request.description}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* İletişim Bilgileri */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-[var(--brand-orange-50)] to-white border-b p-4">
              <CardTitle className="flex items-center gap-2 text-[var(--brand-orange-700)] text-base">
                <User className="w-5 h-5" />
                İletişim Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-[var(--brand-orange-100)] rounded-lg flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-[var(--brand-orange-600)]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Ad Soyad</p>
                    <p className="font-medium text-sm text-gray-800">{request.customerInfo.name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-[var(--brand-orange-100)] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-[var(--brand-orange-600)]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Telefon</p>
                    <p className="font-medium text-sm text-gray-800">{request.customerInfo.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-[var(--brand-orange-100)] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-[var(--brand-orange-600)]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">E-posta</p>
                    <p className="font-medium text-sm text-gray-800">{request.customerInfo.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-[var(--brand-orange-100)] rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-[var(--brand-orange-600)]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Adres</p>
                    <p className="font-medium text-sm text-gray-800">{request.customerInfo.address}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Gallery Modal - Görselleri Büyütme */}
      <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-6 h-6 text-[var(--brand-orange-600)]" />
              Ürün Fotoğrafları
            </DialogTitle>
            <DialogDescription>
              Ürün fotoğraflarını büyük boyutta görüntüleyin
            </DialogDescription>
          </DialogHeader>
          
          {request && request.images && request.images.length > 0 && (
            <div className="space-y-4 mt-2">
              <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden">
                <img
                  src={request.images[selectedImageIndex]}
                  alt={`Fotoğraf ${selectedImageIndex + 1}`}
                  className="w-full h-[500px] object-contain"
                />
                
                {request.images.length > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white shadow-lg hover:scale-110 transition-transform"
                      onClick={() => setSelectedImageIndex((selectedImageIndex - 1 + request.images.length) % request.images.length)}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white shadow-lg hover:scale-110 transition-transform"
                      onClick={() => setSelectedImageIndex((selectedImageIndex + 1) % request.images.length)}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </>
                )}

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[var(--brand-navy-600)] text-white px-4 py-2 rounded-full shadow-lg">
                  {selectedImageIndex + 1} / {request.images.length}
                </div>
              </div>

              {/* Thumbnail Strip */}
              <div className="flex gap-3 overflow-x-auto pb-2">
                {request.images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`Küçük ${idx + 1}`}
                    className={`w-24 h-24 object-cover rounded-lg cursor-pointer transition-all duration-200 ${
                      idx === selectedImageIndex 
                        ? 'ring-4 ring-[var(--brand-orange-500)] scale-105 shadow-lg' 
                        : 'ring-2 ring-gray-200 opacity-60 hover:opacity-100 hover:scale-105'
                    }`}
                    onClick={() => setSelectedImageIndex(idx)}
                  />
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
