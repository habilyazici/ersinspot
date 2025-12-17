import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Package, ArrowLeft, Calendar, Clock, Banknote, Eye, FileText, XCircle, Trash2, AlertTriangle, TrendingUp } from 'lucide-react@0.487.0';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { FloatingContactButtons } from '../components/FloatingContactButtons';
import { useAuth } from '../contexts/AuthContext';
import { ORDER_STATUS_CONFIG } from '../types';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../utils/supabase/info';

export default function MyOrdersPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // Dialog states
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [clearHistoryDialogOpen, setClearHistoryDialogOpen] = useState(false);
  const [selectedOrderForCancel, setSelectedOrderForCancel] = useState<{ id: string; orderNumber: string } | null>(null);
  
  // Timeline Dialog
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [selectedOrderForTimeline, setSelectedOrderForTimeline] = useState<any>(null);
  
  // Filtreleme için aktif tab
  const [activeTab, setActiveTab] = useState<'all' | 'payment_pending' | 'order_received' | 'processing' | 'in_transit' | 'delivered' | 'cancelled'>('all');
  
  // Siparişleri backend'den yükle
  useEffect(() => {
    const loadOrders = async () => {
      if (!user || !accessToken) {
        setIsLoading(false);
        toast.error('Siparişlerinizi görmek için giriş yapmalısınız');
        // Mevcut sayfayı returnUrl olarak kaydet
        navigate('/giris', { state: { from: location.pathname } });
        return;
      }

      try {
        setIsLoading(true);
        console.log('📦 Fetching orders from backend...');
        
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
          const errorText = await response.text();
          console.error('Backend error:', errorText);
          throw new Error('Siparişler yüklenemedi');
        }

        const data = await response.json();
        console.log('✅ Orders loaded:', data);
        
        setOrders(data.orders || []);
        
      } catch (error: any) {
        console.error('Siparişler yüklenirken hata:', error);
        toast.error('Siparişler yüklenirken bir hata oluştu');
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadOrders();
  }, [user, accessToken, navigate]);

  // Hash parametresine göre ilgili karta scroll yap
  useEffect(() => {
    if (location.hash && orders.length > 0) {
      const orderNumber = location.hash.substring(1); // # işaretini kaldır
      const element = cardRefs.current[orderNumber];
      
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          // Kısa bir highlight efekti - İnce border + Yuvarlak köşeler
          element.classList.add('ring-2', 'ring-[var(--brand-navy-500)]', 'rounded-xl');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-[var(--brand-navy-500)]', 'rounded-xl');
          }, 2000);
        }, 300);
      }
    }
  }, [location.hash, orders]);

  // Sipariş iptal fonksiyonu
  const handleCancelOrder = async (orderId: string, orderNumber: string) => {
    try {
      setCancellingOrderId(orderId);
      setCancelDialogOpen(false); // Dialog'u kapat
      console.log('🚫 Cancelling order:', orderId);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/cancel-order`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ orderId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Sipariş iptal edilemedi');
      }

      const data = await response.json();
      console.log('✅ Order cancelled:', data);

      // Siparişi listeden güncelle
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: 'cancelled' }
            : order
        )
      );

      toast.success('Sipariş İptal Edildi!', {
        description: `${orderNumber} numaralı siparişiniz başarıyla iptal edildi.`,
      });

    } catch (error: any) {
      console.error('Sipariş iptal hatası:', error);
      toast.error('İptal Başarısız!', {
        description: error.message || 'Sipariş iptal edilirken bir hata oluştu.',
      });
    } finally {
      setCancellingOrderId(null);
      setSelectedOrderForCancel(null);
    }
  };
  
  // Sipariş geçmişini temizle fonksiyonu
  const handleClearHistory = async () => {
    const completedOrders = orders.filter(o => o.status === 'delivered' || o.status === 'cancelled');
    
    if (completedOrders.length === 0) {
      toast.info('Silinecek sipariş yok', {
        description: 'Teslim edilmiş veya iptal edilmiş siparişiniz bulunmuyor.',
      });
      return;
    }
    
    try {
      setClearHistoryDialogOpen(false); // Dialog'u kapat
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/clear-order-history`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        toast.success('Sipariş geçmişi temizlendi!', {
          description: `${data.deletedCount || 0} sipariş başarıyla silindi.`,
        });
        
        // State'i güncelle - sadece aktif siparişleri tut
        setOrders(prevOrders => 
          prevOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled')
        );
      } else {
        const errorData = await response.json();
        console.error('Clear history error:', errorData);
        toast.error('Sipariş geçmişi temizlenemedi', {
          description: errorData.error || 'Bir hata oluştu',
        });
      }
    } catch (error) {
      console.error('Error clearing order history:', error);
      toast.error('Sipariş geçmişi temizlenirken hata oluştu');
    }
  };

  // Sipariş iptal edilebilir mi kontrol et
  const canCancelOrder = (status: string) => {
    // 'in_transit' (taşıma aşaması) ve sonrası iptal edilemez
    const nonCancellableStatuses = ['in_transit', 'delivered', 'cancelled'];
    return !nonCancellableStatuses.includes(status);
  };

  // Status badge helper - Snake_Case database format kullanıyoruz
  const getStatusConfig = (status: string) => {
    type StatusKey = keyof typeof ORDER_STATUS_CONFIG;
    
    // Direkt mapping için ORDER_STATUS_CONFIG kullan
    if (status in ORDER_STATUS_CONFIG) {
      const config = ORDER_STATUS_CONFIG[status as StatusKey];
      return {
        label: config.label,
        color: `text-${config.color}-700`,
        bg: `bg-${config.color}-100`,
        icon: config.icon
      };
    }
    
    // Fallback - bilinmeyen status değerleri için
    return { 
      label: status, 
      color: 'text-gray-700', 
      bg: 'bg-gray-100', 
      icon: '•' 
    };
  };

  // Filtrelenmiş siparişler
  const filteredOrders = activeTab === 'all' 
    ? orders 
    : orders.filter(order => order.status === activeTab);
  
  // Her status için sayı hesapla
  const statusCounts = {
    all: orders.length,
    payment_pending: orders.filter(o => o.status === 'payment_pending').length,
    order_received: orders.filter(o => o.status === 'order_received').length,
    processing: orders.filter(o => o.status === 'processing').length,
    in_transit: orders.filter(o => o.status === 'in_transit').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  return (
    <div className="bg-gradient-to-b from-gray-50/40 via-white to-gray-50/40 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#2563eb]/30 via-[#3b82f6]/30 to-[#60a5fa]/30 text-white py-10 pt-24">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <Link to="/hesabim">
              <Button variant="ghost" className="text-white hover:bg-white/20 mb-4" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Hesabıma Dön
              </Button>
            </Link>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-white to-gray-100 rounded-xl flex items-center justify-center shadow-xl">
                <Package className="w-7 h-7 text-[var(--brand-navy-600)]" />
              </div>
              <div>
                <h1 className="text-2xl mb-1 drop-shadow-lg font-bold">Siparişlerim</h1>
                <p className="text-white/90 text-sm font-medium drop-shadow">
                  Toplam <span className="font-bold text-white">{orders.length}</span> siparişiniz bulunmaktadır
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      {!isLoading && orders.length > 0 && (
        <div className="bg-white border-b sticky top-16 z-20 shadow-sm">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
                <Button
                  variant={activeTab === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  className={activeTab === 'all' ? 'bg-[var(--brand-navy-600)] hover:bg-[var(--brand-navy-700)]' : ''}
                  onClick={() => setActiveTab('all')}
                >
                  Tümü ({statusCounts.all})
                </Button>
                <Button
                  variant={activeTab === 'payment_pending' ? 'default' : 'ghost'}
                  size="sm"
                  className={activeTab === 'payment_pending' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                  onClick={() => setActiveTab('payment_pending')}
                >
                  Ödemede ({statusCounts.payment_pending})
                </Button>
                <Button
                  variant={activeTab === 'order_received' ? 'default' : 'ghost'}
                  size="sm"
                  className={activeTab === 'order_received' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                  onClick={() => setActiveTab('order_received')}
                >
                  Sipariş Alındı ({statusCounts.order_received})
                </Button>
                <Button
                  variant={activeTab === 'processing' ? 'default' : 'ghost'}
                  size="sm"
                  className={activeTab === 'processing' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                  onClick={() => setActiveTab('processing')}
                >
                  Hazırlanıyor ({statusCounts.processing})
                </Button>
                <Button
                  variant={activeTab === 'in_transit' ? 'default' : 'ghost'}
                  size="sm"
                  className={activeTab === 'in_transit' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                  onClick={() => setActiveTab('in_transit')}
                >
                  Taşınıyor ({statusCounts.in_transit})
                </Button>
                <Button
                  variant={activeTab === 'delivered' ? 'default' : 'ghost'}
                  size="sm"
                  className={activeTab === 'delivered' ? 'bg-green-500 hover:bg-green-600' : ''}
                  onClick={() => setActiveTab('delivered')}
                >
                  Teslim Edildi ({statusCounts.delivered})
                </Button>
                <Button
                  variant={activeTab === 'cancelled' ? 'default' : 'ghost'}
                  size="sm"
                  className={activeTab === 'cancelled' ? 'bg-red-500 hover:bg-red-600' : ''}
                  onClick={() => setActiveTab('cancelled')}
                >
                  İptal Edildi ({statusCounts.cancelled})
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Orders List */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto space-y-6">
          {isLoading ? (
            <Card className="border-2 border-dashed bg-gradient-to-br from-gray-100 to-gray-50">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-[var(--brand-navy-100)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-10 h-10 text-[var(--brand-navy-600)]" />
                </div>
                <h3 className="text-gray-800 mb-2 font-semibold">Siparişler yükleniyor...</h3>
                <p className="text-gray-600 mb-6">
                  Lütfen bir saniye...
                </p>
              </CardContent>
            </Card>
          ) : orders.length === 0 ? (
            <Card className="border-2 border-dashed bg-gradient-to-br from-gray-100 to-gray-50">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-[var(--brand-navy-100)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-10 h-10 text-[var(--brand-navy-600)]" />
                </div>
                <h3 className="text-gray-800 mb-2 font-semibold">Henüz siparişiniz yok</h3>
                <p className="text-gray-600 mb-6">
                  Ürünlerimize göz atın ve ilk siparişinizi verin
                </p>
                <Link to="/urunler">
                  <Button className="bg-[var(--brand-navy-600)] hover:bg-[var(--brand-navy-700)]">
                    Ürünleri İncele
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : filteredOrders.length === 0 ? (
            <Card className="border-2 border-dashed bg-gradient-to-br from-gray-100 to-gray-50">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-[var(--brand-navy-100)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-10 h-10 text-[var(--brand-navy-600)]" />
                </div>
                <h3 className="text-gray-800 mb-2 font-semibold">Bu kategoride sipariş bulunamadı</h3>
                <p className="text-gray-600 mb-6">
                  Diğer kategorilere göz atabilirsiniz
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order, idx) => {
              const statusConfig = getStatusConfig(order.status);
              
              // Backend'den gelen order_items ve product_snapshot'tan veri çek
              const items = (order.items || []).map((item: any) => {
                const snapshot = item.product_snapshot || {};
                return {
                  id: item.id,
                  product_id: item.product_id, // Ürün detay sayfası için
                  name: snapshot.name || snapshot.title || 'Ürün',
                  image: snapshot.image || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200',
                  price: item.price || 0,
                  quantity: item.quantity || 1
                };
              });
              
              // İlk ürünün resmini ana resim olarak kullan
              const mainImage = items[0]?.image || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200';
              const mainProductName = items.length > 1 
                ? `${items[0].name} + ${items.length - 1} ürün daha`
                : items[0]?.name || 'Ürün';
              
              // Tarih formatla
              const orderDate = order.created_at ? new Date(order.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';
              const deliveryDate = order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';
              const deliveryTime = order.delivery_time || '-';
              
              const total = order.total || 0;
              const deliveryFee = order.delivery_fee || 0;

              return (
                <div 
                  key={`order-${order.id}-${order.order_number || idx}`}
                  ref={(el) => (cardRefs.current[order.order_number] = el)}
                >
                  <Card className={`overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 ${
                    order.status === 'delivered' 
                      ? 'border-green-400 ring-4 ring-green-100 shadow-lg shadow-green-100' 
                      : order.status === 'preparing'
                      ? 'border-blue-300 ring-2 ring-blue-50'
                      : order.status === 'cancelled'
                      ? 'border-red-300 bg-red-50/30'
                      : 'border-gray-200 hover:border-[#1e3a8a]/30'
                  }`}>
                    <CardContent className="p-0">
                      <div className="bg-gradient-to-r from-[#1e3a8a]/5 to-[#f97316]/5 p-6 border-b relative">
                        {/* Status Button - Sağ Üst Köşe - Tıklanınca Sipariş Akışı Göster */}
                        <div className="absolute top-4 right-4">
                          <Button
                            onClick={() => {
                              setSelectedOrderForTimeline(order);
                              setTimelineDialogOpen(true);
                            }}
                            className={`${statusConfig.bg} ${statusConfig.color} shadow-md border-0 px-4 py-2 hover:scale-105 hover:shadow-lg transition-all duration-200 cursor-pointer ${
                              order.status === 'delivered' ? 'ring-2 ring-green-400 scale-105' : ''
                            }`}
                          >
                            <span className="text-xl mr-2">{statusConfig.icon}</span>
                            <span className="font-semibold">{statusConfig.label}</span>
                          </Button>
                        </div>

                        <div className="flex flex-col lg:flex-row gap-6">
                          <div className="relative flex-shrink-0">
                            <img 
                              src={mainImage}
                              alt={mainProductName}
                              className="w-full lg:w-36 h-36 object-cover rounded-xl shadow-lg ring-2 ring-gray-100 hover:scale-105 transition-transform duration-200"
                            />
                            {items.length > 1 && (
                              <div className="absolute top-2 right-2 bg-[#1e3a8a] text-white text-xs px-2.5 py-1 rounded-md shadow-lg font-semibold">
                                {items.length} Ürün
                              </div>
                            )}
                          </div>
                          <div className="flex-1 lg:pr-32">
                            <div className="mb-5">
                              <h3 className="text-xl mb-2 text-gray-900">{mainProductName}</h3>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-md">
                                  {order.order_number}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="bg-gradient-to-br from-blue-50 to-white p-3 rounded-lg border border-blue-100 hover:shadow-sm transition-shadow">
                                <div className="flex items-center gap-2 mb-2">
                                  <Calendar className="w-4 h-4 text-blue-600" />
                                  <p className="text-xs text-blue-600 uppercase tracking-wide">Sipariş Tarihi</p>
                                </div>
                                <p className="font-semibold text-gray-900 text-sm">{orderDate}</p>
                              </div>

                              <div className="bg-gradient-to-br from-purple-50 to-white p-3 rounded-lg border border-purple-100 hover:shadow-sm transition-shadow">
                                <div className="flex items-center gap-2 mb-2">
                                  <Clock className="w-4 h-4 text-purple-600" />
                                  <p className="text-xs text-purple-600 uppercase tracking-wide">Teslimat</p>
                                </div>
                                <p className="font-semibold text-gray-900 text-sm">{deliveryDate}</p>
                                <p className="text-xs text-gray-600 mt-0.5">{deliveryTime}</p>
                              </div>

                              <div className="bg-gradient-to-br from-[#f97316]/10 to-white p-3 rounded-lg border border-[#f97316]/30 hover:shadow-sm transition-shadow">
                                <div className="flex items-center gap-2 mb-2">
                                  <Banknote className="w-4 h-4 text-[#f97316]" />
                                  <p className="text-xs text-[#f97316] uppercase tracking-wide">Toplam</p>
                                </div>
                                <p className="font-bold text-[#1e3a8a] text-lg">{total.toLocaleString('tr-TR')} ₺</p>
                                {deliveryFee > 0 && (
                                  <p className="text-xs text-gray-600 mt-0.5">+ {deliveryFee.toLocaleString('tr-TR')} ₺ kargo</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Ürünler Listesi */}
                      {items.length > 0 && (
                        <div className="p-6 bg-white border-b">
                          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                            <Package className="w-4 h-4 text-[var(--brand-navy-600)]" />
                            Sipariş İçeriği ({items.length} Ürün)
                          </h4>
                          <div className="space-y-2">
                            {items.map((item, itemIdx) => {
                              // Eğer product_id yoksa, link yerine normal div göster
                              const hasProductId = item.product_id && item.product_id !== 'undefined';
                              
                              const content = (
                                <>
                                  <img 
                                    src={item.image} 
                                    alt={item.name}
                                    className="w-16 h-16 object-cover rounded-md shadow-sm group-hover:scale-105 transition-transform duration-200"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 group-hover:text-[var(--brand-navy-600)]">{item.name}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">Adet: {item.quantity}</p>
                                    {!hasProductId && (
                                      <p className="text-xs text-red-500 mt-0.5">Ürün artık mevcut değil</p>
                                    )}
                                  </div>
                                  <p className="font-bold text-[var(--brand-navy-600)] whitespace-nowrap">
                                    {item.price.toLocaleString('tr-TR')} ₺
                                  </p>
                                </>
                              );
                              
                              return hasProductId ? (
                                <Link 
                                  key={`${order.order_number}-item-${item.id || itemIdx}`}
                                  to={`/urun/${item.product_id}`}
                                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-blue-50 hover:shadow-md transition-all duration-200 cursor-pointer group"
                                >
                                  {content}
                                </Link>
                              ) : (
                                <div 
                                  key={`${order.order_number}-item-${item.id || itemIdx}`}
                                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg opacity-60 cursor-not-allowed group"
                                >
                                  {content}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Firma Notu */}
                      {(() => {
                        const statusHistory = order.statusHistory || [];
                        const latestHistory = statusHistory.length > 0 ? statusHistory[statusHistory.length - 1] : null;
                        
                        if (latestHistory && latestHistory.note && 
                            !latestHistory.note.includes('Admin tarafından') && 
                            !latestHistory.note.includes('Sipariş durumu güncellendi')) {
                          return (
                            <div className="p-6 bg-white border-b">
                              <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 shadow-sm">
                                <div className="flex items-start gap-3">
                                  <div className="flex-shrink-0 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center">
                                    <span className="text-white font-bold">💬</span>
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm text-amber-900 leading-relaxed">{latestHistory.note}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Aksiyonlar */}
                      <div className="p-6 bg-gradient-to-r from-gray-50 to-white">
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white transition-all shadow-sm"
                            onClick={() => navigate(`/hesabim/siparislerim/detay/${order.id}`)}
                          >
                            <Eye className="w-4 h-4 mr-1.5" />
                            Tüm Detaylar
                          </Button>
                          {order.status === 'delivered' && (
                            <Link to={`/hesabim/raporlarim/siparis/${order.id}`}>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white transition-all shadow-sm"
                              >
                                <FileText className="w-4 h-4 mr-1.5" />
                                Raporu Görüntüle
                              </Button>
                            </Link>
                          )}
                          {canCancelOrder(order.status) && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-red-500 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm ml-auto"
                              onClick={() => {
                                setSelectedOrderForCancel({ id: order.id, orderNumber: order.order_number });
                                setCancelDialogOpen(true);
                              }}
                              disabled={cancellingOrderId === order.id}
                            >
                              <XCircle className="w-4 h-4 mr-1.5" />
                              İptal Et
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })
          )}
        </div>
        
        {/* Sipariş Geçmişini Temizle Butonu - Sadece sipariş varsa göster */}
        {!isLoading && orders.length > 0 && (() => {
          const completedOrders = orders.filter(o => o.status === 'delivered' || o.status === 'cancelled');
          
          // Sadece tamamlanmış/iptal edilmiş sipariş varsa göster
          if (completedOrders.length === 0) return null;
          
          return (
            <div className="max-w-5xl mx-auto mt-6">
              <Card className="border-red-200 bg-red-50/50">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5 flex-1">
                      <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-red-900 mb-0.5">Sipariş Geçmişini Temizle</h4>
                        <p className="text-xs text-red-700">
                          Teslim edilmiş ve iptal edilmiş {completedOrders.length} siparişi kalıcı olarak silebilirsiniz.
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 whitespace-nowrap h-8 text-xs"
                      onClick={() => setClearHistoryDialogOpen(true)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Geçmişi Temizle
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })()}
      </div>

      {/* Sipariş İptal Onay Dialogu */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Siparişi İptal Et
            </DialogTitle>
            <DialogDescription className="pt-4">
              <span className="font-medium text-gray-900">
                {selectedOrderForCancel?.orderNumber}
              </span> numaralı siparişi iptal etmek istediğinizden emin misiniz?
              <br /><br />
              <span className="text-sm text-gray-600">
                Bu işlem sonrasında sipariş durumu "İptal Edildi" olarak değişecektir.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCancelDialogOpen(false);
                setSelectedOrderForCancel(null);
              }}
              className="bg-white hover:bg-gray-50"
            >
              Vazgeç
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (selectedOrderForCancel) {
                  handleCancelOrder(selectedOrderForCancel.id, selectedOrderForCancel.orderNumber);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={cancellingOrderId !== null}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Siparişi İptal Et
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sipariş Geçmişini Temizle Onay Dialogu */}
      <Dialog open={clearHistoryDialogOpen} onOpenChange={setClearHistoryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Sipariş Geçmişini Temizle
            </DialogTitle>
            <DialogDescription className="pt-4">
              <span className="font-medium text-gray-900">
                {orders.filter(o => o.status === 'delivered' || o.status === 'cancelled').length} adet
              </span> tamamlanmış/iptal edilmiş sipariş <span className="font-semibold text-red-600">KALICI OLARAK</span> silinecek!
              <br /><br />
              <span className="text-sm text-red-600 font-medium">
                ⚠️ Bu işlem geri alınamaz.
              </span>
              <br />
              <span className="text-sm text-gray-600">
                Devam etmek istiyor musunuz?
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setClearHistoryDialogOpen(false)}
              className="bg-white hover:bg-gray-50"
            >
              Vazgeç
            </Button>
            <Button
              type="button"
              onClick={handleClearHistory}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Evet, Temizle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sipariş Durumu Dialogu - Sadece Mevcut Durum */}
      <Dialog open={timelineDialogOpen} onOpenChange={setTimelineDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--brand-navy-700)]">
              <TrendingUp className="w-5 h-5" />
              Sipariş Durumu
            </DialogTitle>
            <DialogDescription className="pt-2">
              <span className="font-medium text-gray-900">
                {selectedOrderForTimeline?.order_number}
              </span> numaralı siparişinizin mevcut durumu
            </DialogDescription>
          </DialogHeader>

          {selectedOrderForTimeline && (() => {
            const currentStatus = selectedOrderForTimeline.status;
            const config = getStatusConfig(currentStatus);
            
            // En son status history kaydını bul
            const statusHistory = selectedOrderForTimeline.statusHistory || [];
            const latestHistory = statusHistory.length > 0 
              ? statusHistory[statusHistory.length - 1]
              : {
                  new_status: currentStatus,
                  changed_at: selectedOrderForTimeline.created_at,
                  note: null,
                  changed_by: 'System'
                };
            
            return (
              <div className="py-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className={`w-16 h-16 rounded-full ${config.bg} flex items-center justify-center shadow-lg ring-4 ring-[var(--brand-navy-100)]`}>
                      <span className="text-2xl">{config.icon}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-[var(--brand-navy-700)]">
                        {config.label}
                      </h3>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-xs whitespace-nowrap">
                        Mevcut
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {latestHistory.changed_at ? new Date(latestHistory.changed_at).toLocaleDateString('tr-TR', { 
                          day: 'numeric', 
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : '-'}
                      </Badge>
                    </div>
                    {latestHistory.note && latestHistory.note.trim() !== '' && 
                     !latestHistory.note.includes('Admin tarafından') && 
                     !latestHistory.note.includes('Sipariş durumu güncellendi') && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
                        <p className="text-sm text-amber-900">{latestHistory.note}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          <DialogFooter className="sm:justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              onClick={() => setTimelineDialogOpen(false)}
              className="bg-[var(--brand-navy-600)] hover:bg-[var(--brand-navy-700)]"
            >
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Contact Buttons */}
      <FloatingContactButtons />
    </div>
  );
}