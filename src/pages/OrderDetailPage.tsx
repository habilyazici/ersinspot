import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Calendar, MapPin, Banknote, Truck, CheckCircle2, Clock, CreditCard, User, Home, Phone, Mail, FileText, Loader2, XCircle, Box, StickyNote } from 'lucide-react@0.487.0';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { FloatingContactButtons } from '../components/FloatingContactButtons';
import { ORDER_STATUS_CONFIG } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../utils/supabase/info';

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Backend'den sipariş detayını yükle
  useEffect(() => {
    const loadOrderDetail = async () => {
      if (!user || !accessToken) {
        setIsLoading(false);
        toast.error('Sipariş detaylarını görmek için giriş yapmalısınız');
        navigate('/giris');
        return;
      }

      try {
        setIsLoading(true);
        console.log('📦 Loading order detail:', id);
        
        // Önce tüm siparişleri çek
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/user-orders`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (!response.ok) {
          throw new Error('Siparişler yüklenemedi');
        }

        const data = await response.json();
        console.log('✅ Orders loaded:', data);
        
        // İlgili siparişi bul
        const foundOrder = data.orders?.find((o: any) => o.id === id);
        
        if (!foundOrder) {
          throw new Error('Sipariş bulunamadı');
        }
        
        setOrder(foundOrder);
        
      } catch (error: any) {
        console.error('Sipariş detay yükleme hatası:', error);
        toast.error('Sipariş detayları yüklenirken bir hata oluştu');
        setOrder(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadOrderDetail();
  }, [id, user, accessToken, navigate]);

  // Yükleniyor durumu
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-24">
        <Card className="p-8 text-center max-w-md">
          <Loader2 className="w-16 h-16 text-[var(--brand-navy-600)] mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Yükleniyor...</h2>
          <p className="text-gray-600">Sipariş detayları getiriliyor</p>
        </Card>
      </div>
    );
  }

  // Sipariş bulunamadı
  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-24">
        <Card className="p-8 text-center max-w-md">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Sipariş Bulunamadı</h2>
          <p className="text-gray-600 mb-1">Aradığınız sipariş bulunamadı.</p>
          <p className="text-sm text-gray-500 mb-6">Sipariş ID: {id || 'Belirtilmedi'}</p>
          <Link to="/hesabim/siparislerim">
            <Button className="bg-[var(--brand-navy-600)] hover:bg-[var(--brand-navy-700)]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Siparişlerime Dön
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Backend'den gelen order verisi - customer_info içinde tüm snapshot var
  const customerInfo = order.customer_info || {};
  const items = order.items || [];
  
  // Tarihleri formatla
  const orderDate = order.created_at 
    ? new Date(order.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) 
    : '-';
  const deliveryDate = order.delivery_date 
    ? new Date(order.delivery_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) 
    : '-';
  const deliveryTime = order.delivery_time || '-';
  
  // Teslimat adresi - address varsa kullan, yoksa sadece district göster
  const deliveryAddress = customerInfo.address 
    ? `${customerInfo.address}, ${customerInfo.district || ''} / ${customerInfo.city || 'İzmir'}`
    : `${customerInfo.district || 'Belirtilmemiş'} / ${customerInfo.city || 'İzmir'}`;
  
  // Müşteri bilgileri
  const customerName = customerInfo.name || '-';
  const customerPhone = customerInfo.phone || '-';
  const customerEmail = customerInfo.email || '-';
  
  // Ödeme yöntemi
  const paymentMethodLabels: { [key: string]: string } = {
    'cash': 'Kapıda Ödeme',
    'bank': 'Banka Havalesi',
    'online': 'Online Ödeme'
  };
  const paymentMethod = paymentMethodLabels[order.payment_method] || 'Belirtilmemiş';
  
  // Teslimat yöntemi
  const deliveryMethodLabels: { [key: string]: string } = {
    'store_pickup': 'Mağazadan Teslim Alma',
    'standard': 'Standart Kargo',
    'express': 'Hızlı Kargo'
  };
  const deliveryMethod = deliveryMethodLabels[order.delivery_method] || 'Standart Kargo';
  
  const total = order.total || 0;
  const subtotal = order.subtotal || 0;
  const deliveryFee = order.delivery_fee || 0;

  // Status badge helper
  const getStatusBadge = (status: string) => {
    type StatusKey = keyof typeof ORDER_STATUS_CONFIG;
    
    if (status in ORDER_STATUS_CONFIG) {
      const config = ORDER_STATUS_CONFIG[status as StatusKey];
      
      const iconMap: Record<string, any> = {
        payment_pending: Clock,
        processing: Box,
        in_transit: Truck,
        delivered: CheckCircle2,
        cancelled: XCircle,
      };
      
      const Icon = iconMap[status] || Clock;
      const colorClasses = `text-${config.color}-700`;
      const bgClasses = `bg-${config.color}-100`;
      
      return (
        <div className={`${bgClasses} ${colorClasses} px-4 py-2 rounded-xl font-medium flex items-center gap-2`}>
          <Icon className="w-5 h-5" />
          {config.label}
        </div>
      );
    }
    
    return (
      <div className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-medium flex items-center gap-2">
        <Clock className="w-5 h-5" />
        {status}
      </div>
    );
  };

  // Sipariş akışı timeline'ı render et
  const renderOrderTimeline = () => {
    // İptal edilmiş sipariş için özel görünüm
    if (order.status === 'cancelled') {
      // İptal tarihi
      const cancelHistory = order.statusHistory?.find((h: any) => h.new_status === 'cancelled');
      const cancelDate = cancelHistory?.changed_at ? new Date(cancelHistory.changed_at).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : null;
      
      return (
        <Card className="shadow-lg border-0 bg-red-50">
          <CardHeader className="bg-gradient-to-r from-red-100 to-red-50 border-b p-4">
            <CardTitle className="flex items-center gap-2 text-red-700 text-base">
              <XCircle className="w-5 h-5" />
              Sipariş Durumu
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-red-900 mb-2">Sipariş İptal Edildi</h3>
              <p className="text-red-700 text-sm mb-2">Bu sipariş iptal edilmiştir.</p>
              {cancelDate && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-100 rounded-full mt-2">
                  <Calendar className="w-3.5 h-3.5 text-red-700" />
                  <span className="text-xs text-red-700 font-medium">{cancelDate}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    // Normal sipariş akışı (5 aşama)
    const stages = [
      { key: 'payment_pending', label: 'Ödeme Bekliyor', icon: Clock, description: 'Ödeme bekleniyor' },
      { key: 'order_received', label: 'Sipariş Alındı', icon: CheckCircle2, description: 'Siparişiniz alındı' },
      { key: 'processing', label: 'Hazırlanıyor', icon: Box, description: 'Ürününüz hazırlanıyor' },
      { key: 'in_transit', label: 'Taşınıyor', icon: Truck, description: 'Ürününüz yolda' },
      { key: 'delivered', label: 'Teslim Edildi', icon: CheckCircle2, description: 'Teslim edildi' },
    ];

    const currentStageIndex = stages.findIndex(s => s.key === order.status);
    
    // Her aşama için tarihleri statusHistory'den al
    const getStageDate = (stageKey: string) => {
      const history = order.statusHistory?.find((h: any) => h.new_status === stageKey);
      if (history?.changed_at) {
        return new Date(history.changed_at).toLocaleDateString('tr-TR', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      // İlk aşama için sipariş oluşturma tarihini kullan
      if (stageKey === 'payment_pending' && order.created_at) {
        return new Date(order.created_at).toLocaleDateString('tr-TR', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      return null;
    };
    
    return (
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-[var(--brand-navy-50)] to-white border-b p-4">
          <CardTitle className="flex items-center gap-2 text-[var(--brand-navy-700)] text-base">
            <Truck className="w-5 h-5" />
            Sipariş Takibi
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
                        {/* Tarih Badge */}
                        {(() => {
                          const stageDate = getStageDate(stage.key);
                          if (stageDate && (isPast || isCurrent)) {
                            return (
                              <div className={`
                                inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                                ${isPast ? 'bg-green-50 text-green-700' : ''}
                                ${isCurrent ? 'bg-gradient-to-r from-[var(--brand-navy-50)] to-[var(--brand-orange-50)] text-[var(--brand-navy-700)]' : ''}
                              `}>
                                <Calendar className="w-3 h-3" />
                                {stageDate}
                              </div>
                            );
                          }
                          return null;
                        })()}
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
                      
                      {/* Admin Notu */}
                      {(() => {
                        const history = order.statusHistory?.find((h: any) => h.new_status === stage.key);
                        if (history?.note && (isPast || isCurrent) && 
                            !history.note.includes('Admin tarafından') && 
                            !history.note.includes('Sipariş durumu güncellendi')) {
                          return (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
                              <div className="flex items-start gap-2">
                                <StickyNote className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-sm text-amber-900">{history.note}</p>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
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
              <Link to="/hesabim/siparislerim">
                <Button variant="ghost" className="text-white hover:bg-white/20" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Siparişlerime Dön
                </Button>
              </Link>
            </div>
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-white to-gray-100 rounded-xl flex items-center justify-center shadow-xl">
                  <Package className="w-7 h-7 text-[var(--brand-navy-600)]" />
                </div>
                <div>
                  <h1 className="text-2xl mb-1 drop-shadow-lg font-bold">Sipariş Detayları</h1>
                  <p className="text-white/90 text-sm font-medium drop-shadow">
                    Sipariş #{order.order_number}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-start lg:items-end gap-1.5">
                {getStatusBadge(order.status)}
                <div className="text-left lg:text-right">
                  <p className="text-xs text-white/80">Toplam Tutar</p>
                  <p className="text-xl font-bold">{total.toLocaleString('tr-TR')} ₺</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-4">
          
          {/* Sipariş Takibi Timeline - EN ÜSTTE */}
          {renderOrderTimeline()}

          {/* Sipariş Bilgileri */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-[var(--brand-navy-50)] to-white border-b p-4">
              <CardTitle className="flex items-center gap-2 text-[var(--brand-navy-700)] text-base">
                <Calendar className="w-5 h-5" />
                Sipariş Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-[var(--brand-navy-100)] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-[var(--brand-navy-600)]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Sipariş Tarihi</p>
                    <p className="font-medium text-sm text-gray-800">{orderDate}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Truck className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Teslimat Tarihi</p>
                    <p className="font-medium text-sm text-gray-800">{deliveryDate}</p>
                    {deliveryTime && deliveryTime !== '-' && (
                      <p className="text-xs text-gray-600">{deliveryTime}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-[var(--brand-orange-100)] rounded-lg flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-5 h-5 text-[var(--brand-orange-600)]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Ödeme Yöntemi</p>
                    <p className="font-medium text-sm text-gray-800">{paymentMethod}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ürünler */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-[var(--brand-navy-50)] to-white border-b p-4">
              <CardTitle className="flex items-center gap-2 text-[var(--brand-navy-700)] text-base">
                <Package className="w-5 h-5" />
                Sipariş Edilen Ürünler ({items.length} adet)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {items.map((item: any, idx: number) => {
                  const snapshot = item.product_snapshot || {};
                  const productName = snapshot.name || snapshot.title || 'Ürün';
                  const productImage = snapshot.image || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200';
                  const productCondition = snapshot.condition || 'İkinci El';
                  const hasProductId = item.product_id;
                  
                  const content = (
                    <>
                      <img 
                        src={productImage} 
                        alt={productName}
                        className="w-full sm:w-20 h-20 object-cover rounded-lg shadow-sm group-hover:scale-105 transition-transform"
                      />
                      <div className="flex-1 space-y-2">
                        <div>
                          <h3 className={`font-semibold text-sm ${hasProductId ? 'text-[var(--brand-navy-700)] group-hover:underline' : 'text-gray-800'}`}>
                            {productName}
                          </h3>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            <span className="px-2 py-0.5 bg-[var(--brand-navy-100)] text-[var(--brand-navy-700)] rounded-full text-xs font-medium">
                              {productCondition}
                            </span>
                            {!hasProductId && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                Artık mevcut değil
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                          <p className="text-xs text-gray-600">Adet: <span className="font-semibold">{item.quantity || 1}</span></p>
                          <p className="text-sm font-bold text-[var(--brand-navy-600)]">
                            {(item.price || 0).toLocaleString('tr-TR')} ₺
                          </p>
                        </div>
                      </div>
                    </>
                  );
                  
                  return hasProductId ? (
                    <Link 
                      key={`item-${item.id || idx}`} 
                      to={`/urun/${item.product_id}`}
                      className="flex flex-col sm:flex-row gap-3 p-3 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 hover:shadow-lg transition-all cursor-pointer group"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div 
                      key={`item-${item.id || idx}`} 
                      className="flex flex-col sm:flex-row gap-3 p-3 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 opacity-60 cursor-not-allowed group"
                    >
                      {content}
                    </div>
                  );
                })}
              </div>

              {/* Toplam */}
              <div className="mt-4 space-y-2">
                {deliveryFee > 0 && (
                  <>
                    <div className="flex justify-between items-center px-4 py-2 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Ara Toplam</p>
                      <p className="font-medium text-gray-800">{subtotal.toLocaleString('tr-TR')} ₺</p>
                    </div>
                    <div className="flex justify-between items-center px-4 py-2 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Teslimat Ücreti</p>
                      <p className="font-medium text-gray-800">{deliveryFee.toLocaleString('tr-TR')} ₺</p>
                    </div>
                  </>
                )}
                <div className="p-4 bg-gradient-to-r from-[var(--brand-navy-600)] to-[var(--brand-navy-700)] rounded-lg text-white">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-gray-200 mb-0.5 text-sm">Toplam Tutar</p>
                      <p className="text-xs text-gray-300">{items.length} ürün</p>
                    </div>
                    <p className="text-xl font-bold">{total.toLocaleString('tr-TR')} ₺</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Teslimat ve İletişim Bilgileri */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Teslimat Adresi */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-[var(--brand-navy-50)] to-white border-b p-4">
                <CardTitle className="flex items-center gap-2 text-[var(--brand-navy-700)] text-base">
                  <MapPin className="w-5 h-5" />
                  Teslimat Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-[var(--brand-navy-100)] rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-[var(--brand-navy-600)]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Teslimat Adresi</p>
                      <p className="font-medium text-sm text-gray-800">{deliveryAddress}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-[var(--brand-navy-100)] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Truck className="w-5 h-5 text-[var(--brand-navy-600)]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Teslimat Yöntemi</p>
                      <p className="font-medium text-sm text-gray-800">{deliveryMethod}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Müşteri Bilgileri */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-[var(--brand-navy-50)] to-white border-b p-4">
                <CardTitle className="flex items-center gap-2 text-[var(--brand-navy-700)] text-base">
                  <User className="w-5 h-5" />
                  Müşteri Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-[var(--brand-navy-100)] rounded-lg flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-[var(--brand-navy-600)]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Ad Soyad</p>
                      <p className="font-medium text-sm text-gray-800">{customerName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-[var(--brand-navy-100)] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-[var(--brand-navy-600)]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Telefon</p>
                      <p className="font-medium text-sm text-gray-800">{customerPhone}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-[var(--brand-navy-100)] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-[var(--brand-navy-600)]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">E-posta</p>
                      <p className="font-medium text-sm text-gray-800">{customerEmail}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Aksiyonlar - Tamamlanmış Siparişler İçin Rapor */}
          {order.status === 'delivered' && (
            <Card className="shadow-lg border-0 bg-gradient-to-br from-[var(--brand-teal-50)] to-white">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[var(--brand-teal-500)] rounded-xl flex items-center justify-center shadow-lg">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Sipariş Raporu</h3>
                      <p className="text-sm text-gray-600">Teslim edilen siparişinizin detaylı raporunu görüntüleyin</p>
                    </div>
                  </div>
                  <Link to={`/hesabim/raporlarim/siparis/${order.id}`}>
                    <Button className="bg-[var(--brand-teal-500)] hover:bg-[var(--brand-teal-600)] text-white shadow-lg hover:shadow-xl transition-all">
                      <FileText className="w-4 h-4 mr-2" />
                      Raporu Görüntüle
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Müşteri Notu - EN ALTTA */}
          {order.notes && (
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-[var(--brand-navy-50)] to-white border-b p-4">
                <CardTitle className="flex items-center gap-2 text-[var(--brand-navy-700)] text-base">
                  <StickyNote className="w-5 h-5" />
                  Sipariş Notunuz
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{order.notes}</p>
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      {/* Floating Contact Buttons */}
      <FloatingContactButtons />
    </div>
  );
}