import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Banknote, Calendar, CheckCircle, FileText, CheckCircle2, XCircle, TrendingUp, Trash2, AlertTriangle, Clock } from 'lucide-react@0.487.0';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { toast } from 'sonner@2.0.3';
import { useAuth } from '../contexts/AuthContext';
import { projectId } from '../utils/supabase/info';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import { FloatingContactButtons } from '../components/FloatingContactButtons';
import { getConditionLabel } from '../utils/conditionHelper';

interface SellRequest {
  id: number;
  requestNumber: string;
  productName: string;
  brand: string;
  condition: string;
  estimatedPrice: number;
  status: 'reviewing' | 'offer_sent' | 'accepted' | 'rejected' | 'completed';
  statusText: string;
  submittedDate: string;
  images: string[];
  description: string;
  offerPrice?: number;
  offerNote?: string;
  pickup_date?: string;
  pickup_time?: string;
  status_history?: Array<{
    status: string;
    timestamp: string;
    note?: string;
    created_by?: string;
  }>;
}

export default function MySellRequestsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, accessToken, loading: authLoading } = useAuth();
  const [sellRequests, setSellRequests] = useState<SellRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<SellRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // Yeni dialog state'leri
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [clearHistoryDialogOpen, setClearHistoryDialogOpen] = useState(false);
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [selectedRequestForCancel, setSelectedRequestForCancel] = useState<{ id: number; requestNumber: string } | null>(null);
  const [selectedRequestForTimeline, setSelectedRequestForTimeline] = useState<SellRequest | null>(null);
  const [cancellingRequestId, setCancellingRequestId] = useState<number | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    // Auth kontrolü tamamlanana kadar bekle
    if (authLoading) return;
    
    // User yoksa login'e yönlendir
    if (!user) {
      navigate('/giris?redirect=/hesabim/satis-taleplerim', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Backend'den satış taleplerini yükle
  useEffect(() => {
    const loadSellRequests = async () => {
      if (!user || !accessToken) {
        setLoading(false);
        setSellRequests([]); // Giriş yapmayanlar için boş liste
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/user-sell-requests`,
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
          console.log('[SELL REQUESTS] ✅ Backend response:', data);
          
          // Backend'den gelen satış taleplerini formatla
          const formattedRequests = data.sellRequests?.map((req: any) => ({
            id: req.id,
            requestNumber: req.request_number || `#URN-${req.id}`,
            productName: req.title || req.product_name || 'Ürün', // title -> product_name mapping
            brand: req.brand || '',
            condition: req.condition || '',
            estimatedPrice: req.asking_price || req.requested_price || 0, // asking_price -> requested_price mapping
            status: req.status,
            statusText: req.status_text,
            submittedDate: new Date(req.created_at).toLocaleDateString('tr-TR'),
            images: req.images?.map((img: any) => img.image_url) || [],
            description: req.description || '',
            offerPrice: req.admin_offer_price || req.offer_price, // admin_offer_price -> offer_price mapping
            offerNote: req.admin_notes || req.offer_note, // admin_notes -> offer_note mapping
            pickup_date: req.pickup_date,
            pickup_time: req.pickup_time,
          })) || [];

          console.log('[SELL REQUESTS] ✅ Formatted requests:', formattedRequests);
          setSellRequests(formattedRequests);
        } else {
          const errorData = await response.json();
          console.error('Backend hatası - veri alınamadı:', response.status, errorData);
          setSellRequests([]);
        }
      } catch (error) {
        console.error('Satış talepleri yüklenirken hata:', error);
        setSellRequests([]);
      } finally {
        setLoading(false);
      }
    };

    loadSellRequests();
  }, [user, accessToken]);

  // Hash parametresine göre ilgili karta scroll yap
  useEffect(() => {
    if (location.hash && sellRequests.length > 0) {
      const requestNumber = location.hash.substring(1); // # işaretini kaldır
      const element = cardRefs.current[requestNumber];
      
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          // Kısa bir highlight efekti - İnce border + Yuvarlak köşeler
          element.classList.add('ring-2', 'ring-[var(--brand-bronze-500)]', 'rounded-xl');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-[var(--brand-bronze-500)]', 'rounded-xl');
          }, 2000);
        }, 300);
      }
    }
  }, [location.hash, sellRequests]);

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; bg: string; icon: string }> = {
      reviewing: { label: 'İncelemede', color: 'text-blue-700', bg: 'bg-blue-50', icon: '🔎' },
      offer_sent: { label: 'Teklif Geldi', color: 'text-orange-700', bg: 'bg-orange-50', icon: '💰' },
      accepted: { label: 'Kabul Edildi', color: 'text-green-700', bg: 'bg-green-50', icon: '✅' },
      rejected: { label: 'Reddedildi', color: 'text-red-700', bg: 'bg-red-50', icon: '❌' },
      completed: { label: 'Tamamlandı', color: 'text-green-700', bg: 'bg-green-50', icon: '✔️' },
    };

    return configs[status] || { label: status, color: 'text-gray-700', bg: 'bg-gray-100', icon: '•' };
  };

  // Teklif kabul/red fonksiyonu
  const handleRespondToOffer = async (requestId: number, action: 'accept' | 'reject') => {
    if (!accessToken) {
      toast.error('Lütfen giriş yapın');
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/sell-requests/${requestId}/respond`,
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

      // Başarılı - listeyi yenile
      const updatedRequests = sellRequests.map(req => 
        req.id === requestId 
          ? { ...req, status: action === 'accept' ? 'accepted' as const : 'rejected' as const }
          : req
      );
      setSellRequests(updatedRequests);

      setIsModalOpen(false);
      
      if (action === 'accept') {
        toast.success('✅ Teklif onaylandı! Ürününüz için randevu oluşturulacak.');
      } else {
        toast.error('❌ Teklif reddedildi. Satış talebi iptal edildi.');
      }
    } catch (error: any) {
      console.error('Teklif yanıtlanırken hata:', error);
      toast.error(error.message || 'Bir hata oluştu');
    }
  };

  // Talebi iptal et fonksiyonu
  const handleCancelRequest = async (requestId: number, requestNumber: string) => {
    try {
      setCancellingRequestId(requestId);
      setCancelDialogOpen(false);
      console.log('🚫 Cancelling sell request:', requestId);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/user-sell-requests/cancel`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ requestId }),
        }
      );

      const data = await response.json();
      console.log('📥 Cancel response:', { ok: response.ok, status: response.status, data });

      if (!response.ok) {
        console.error('❌ Cancel failed:', data);
        throw new Error(data.message || data.error || 'Talep iptal edilemedi');
      }

      console.log('✅ Sell request cancelled successfully:', data);

      // Talebi listeden güncelle
      setSellRequests(prevRequests => 
        prevRequests.map(req => 
          req.id === requestId 
            ? { ...req, status: 'cancelled' as const }
            : req
        )
      );

      toast.success('Talep İptal Edildi!', {
        description: `${requestNumber} numaralı satış talebiniz başarıyla iptal edildi.`,
      });

    } catch (error: any) {
      console.error('❌ Talep iptal hatası:', error);
      console.error('Error details:', { 
        message: error.message, 
        stack: error.stack,
        name: error.name 
      });
      
      toast.error('İptal Başarısız!', {
        description: error.message || 'Talep iptal edilirken bir hata oluştu. Lütfen tekrar deneyin.',
      });
    } finally {
      setCancellingRequestId(null);
      setSelectedRequestForCancel(null);
    }
  };

  // Talep geçmişini temizle fonksiyonu
  const handleClearHistory = async () => {
    const completedRequests = sellRequests.filter(r => 
      r.status === 'rejected' || r.status === 'completed'
    );
    
    if (completedRequests.length === 0) {
      toast.info('Silinecek talep yok', {
        description: 'Tamamlanmış, kabul edilmiş veya iptal edilmiş talebiniz bulunmuyor.',
      });
      setClearHistoryDialogOpen(false);
      return;
    }

    if (!accessToken) {
      toast.error('Oturum hatası', {
        description: 'Lütfen yeniden giriş yapın.',
      });
      setClearHistoryDialogOpen(false);
      return;
    }
    
    try {
      console.log('[CLEAR HISTORY] Starting deletion of', completedRequests.length, 'requests');
      setClearHistoryDialogOpen(false);
      
      const loadingToast = toast.loading('Talep geçmişi temizleniyor...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/user-sell-requests/clear-history`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      toast.dismiss(loadingToast);
      
      console.log('[CLEAR HISTORY] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[CLEAR HISTORY] Success:', data);
        toast.success('✅ Talep geçmişi temizlendi!', {
          description: `${data.deletedCount || completedRequests.length} satış talebi başarıyla silindi.`,
        });
        
        // State'i güncelle - sadece aktif talepleri tut
        setSellRequests(prevRequests => 
          prevRequests.filter(r => 
            r.status !== 'rejected' && 
            r.status !== 'completed'
          )
        );
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: await response.text() };
        }
        console.error('[CLEAR HISTORY] Error:', errorData);
        toast.error('❌ Talep geçmişi temizlenemedi', {
          description: errorData.error || `Sunucu hatası (${response.status})`,
        });
      }
    } catch (error: any) {
      console.error('[CLEAR HISTORY] Exception:', error);
      toast.error('❌ Talep geçmişi temizlenirken hata oluştu', {
        description: error.message || 'Bağlantı hatası',
      });
    }
  };

  // Talep iptal edilebilir mi kontrol et - Sadece "reviewing" ve "offer_sent" durumlarında iptal edilebilir
  const canCancelRequest = (status: string) => {
    const cancellableStatuses = ['reviewing', 'offer_sent'];
    return cancellableStatuses.includes(status);
  };

  return (
    <div className="bg-gradient-to-b from-gray-50/40 via-white to-gray-50/40 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#f97316]/30 via-[#fb923c]/30 to-[#fdba74]/30 text-white py-10 pt-24">
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
                <Package className="w-7 h-7 text-[var(--brand-orange-600)]" />
              </div>
              <div>
                <h1 className="text-2xl mb-1 drop-shadow-lg font-bold">Ürün Satış Taleplerim</h1>
                <p className="text-white/90 text-sm font-medium drop-shadow">
                  Toplam <span className="font-bold text-white">{sellRequests.length}</span> satış talebiniz bulunmaktadır
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto space-y-6">
          {loading ? (
            <Card className="border-2 border-dashed bg-gradient-to-br from-orange-50 to-white">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-[var(--brand-orange-100)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-10 h-10 text-[var(--brand-orange-600)]" />
                </div>
                <h3 className="text-gray-800 mb-2 font-semibold">Satış talepleri yükleniyor...</h3>
                <p className="text-gray-600 mb-6">
                  Lütfen bir saniye...
                </p>
                <Skeleton className="w-40 h-10 mx-auto" />
              </CardContent>
            </Card>
          ) : sellRequests.length === 0 ? (
            <Card className="border-2 border-dashed bg-gradient-to-br from-orange-50 to-white">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-[var(--brand-orange-100)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-10 h-10 text-[var(--brand-orange-600)]" />
                </div>
                <h3 className="text-gray-800 mb-2 font-semibold">Henüz satış talebiniz yok</h3>
                <p className="text-gray-600 mb-6">
                  Kullanmadığınız ürünleri satarak kazanç elde edin
                </p>
                <Link to="/urun-sat">
                  <Button className="bg-[var(--brand-orange-600)] hover:bg-[var(--brand-orange-700)]">
                    Ürün Sat
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            sellRequests.map((request) => {
              const statusConfig = getStatusConfig(request.status);
              return (
                <div
                  key={request.id}
                  ref={(el) => (cardRefs.current[request.requestNumber] = el)}
                >
                  <Card className={`overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 ${
                    request.status === 'accepted' || request.status === 'completed'
                      ? 'border-green-400 ring-2 ring-green-200 shadow-green-200' 
                      : request.status === 'offer_sent'
                      ? 'border-purple-300 ring-2 ring-purple-100 shadow-purple-200'
                      : 'border-gray-100'
                  }`}>
                    <CardContent className="p-0">
                      <div className={`p-6 border-b relative ${
                        request.status === 'accepted' || request.status === 'completed'
                          ? 'bg-gradient-to-r from-green-50 via-emerald-50 to-green-50'
                          : request.status === 'offer_sent'
                          ? 'bg-gradient-to-r from-purple-50 via-blue-50 to-purple-50'
                          : 'bg-gradient-to-r from-[var(--brand-orange-50)] to-white'
                      }`}>
                        {/* Status Badge - Sağ Üst Köşe - Tıklanabilir (Talep Akışını Gösterir) */}
                        <div className="absolute top-4 right-4">
                          <button 
                            className={`${statusConfig.bg} ${statusConfig.color} px-4 py-2 rounded-full text-sm font-medium shadow-md cursor-pointer hover:scale-105 transition-transform ${
                              request.status === 'accepted' || request.status === 'completed' ? 'ring-2 ring-green-300 scale-110' : 
                              request.status === 'offer_sent' ? 'ring-2 ring-orange-300 animate-pulse' : ''
                            }`}
                            onClick={() => {
                              setSelectedRequestForTimeline(request);
                              setTimelineDialogOpen(true);
                            }}
                            title="Talep akışını görüntülemek için tıklayın"
                          >
                            <span className="text-base mr-1.5">{statusConfig.icon}</span>
                            {statusConfig.label}
                          </button>
                        </div>
                        
                        {/* Durum Mesajları */}
                        {request.status === 'accepted' && (
                          <div className="mb-4 bg-green-100 border-l-4 border-green-500 p-4 rounded-lg">
                            <p className="text-sm text-green-800 flex items-start gap-2.5 mb-2">
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                              <span className="font-semibold">
                                Tebrikler! Teklifiniz onaylandı. Ürününüzü almaya geleceğiz.
                              </span>
                            </p>
                            <p className="text-xs text-green-700 ml-7">
                              En kısa sürede ekibimiz sizinle iletişime geçecektir.
                            </p>
                          </div>
                        )}
                        {request.status === 'completed' && (
                          <div className="mb-4 bg-green-100 border-l-4 border-green-500 p-4 rounded-lg">
                            <p className="text-sm text-green-800 flex items-start gap-2.5 mb-2">
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                              <span className="font-semibold">
                                İşlem Tamamlandı! Ürününüzü teslim aldık.
                              </span>
                            </p>
                            <p className="text-xs text-green-700 ml-7">
                              Satış işleminiz başarıyla tamamlanmıştır. Satış raporunu görüntüleyebilirsiniz.
                            </p>
                          </div>
                        )}
                        {request.status === 'offer_sent' && request.offerPrice && (
                          <div className="mb-4 bg-orange-100 border-l-4 border-orange-500 p-3 rounded">
                            <p className="text-sm text-orange-800 flex items-center gap-2">
                              <Banknote className="w-5 h-5 text-orange-600" />
                              <span>Yeni fiyat teklifi: <span className="font-bold text-lg ml-1">{request.offerPrice} ₺</span></span>
                            </p>
                          </div>
                        )}

                        <div className="flex flex-col lg:flex-row gap-6">
                          {request.images && request.images.length > 0 && (
                            <img 
                              src={request.images[0]}
                              alt={request.productName}
                              className="w-full lg:w-32 h-32 object-cover rounded-xl shadow-lg"
                            />
                          )}
                          <div className="flex-1 pr-32">
                            <div className="mb-4">
                              <h3 className="text-xl mb-2">{request.productName}</h3>
                              <p className="text-sm text-gray-500">Talep No: <span className="font-medium text-gray-700">{request.requestNumber}</span></p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[var(--brand-orange-100)] rounded-lg flex items-center justify-center">
                                  <Package className="w-5 h-5 text-[var(--brand-orange-600)]" />
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Marka</p>
                                  <p className="font-medium text-gray-800">{request.brand}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[var(--brand-orange-100)] rounded-lg flex items-center justify-center">
                                  <Banknote className="w-5 h-5 text-[var(--brand-orange-600)]" />
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Talep Edilen Fiyat</p>
                                  <p className="font-medium text-gray-800">{request.estimatedPrice} ₺</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[var(--brand-orange-100)] rounded-lg flex items-center justify-center">
                                  <Calendar className="w-5 h-5 text-[var(--brand-orange-600)]" />
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Talep Tarihi</p>
                                  <p className="font-medium text-gray-800 text-sm">{request.submittedDate}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[var(--brand-orange-100)] rounded-lg flex items-center justify-center">
                                  <CheckCircle className="w-5 h-5 text-[var(--brand-orange-600)]" />
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Durum</p>
                                  <p className="font-medium text-gray-800">{getConditionLabel(request.condition)}</p>
                                </div>
                              </div>
                            </div>

                            {/* Randevu Bilgileri */}
                            {(request.pickup_date || request.pickup_time) && (
                              <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200">
                                <div className="flex items-center gap-2 mb-2">
                                  <Calendar className="w-5 h-5 text-blue-600" />
                                  <h4 className="font-medium text-blue-900">Ürün Alım Randevusu</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  {request.pickup_date && (
                                    <div>
                                      <p className="text-xs text-blue-700 mb-1">Tarih</p>
                                      <p className="font-medium text-blue-900">
                                        {new Date(request.pickup_date).toLocaleDateString('tr-TR', { 
                                          day: 'numeric', 
                                          month: 'long', 
                                          year: 'numeric',
                                          weekday: 'long'
                                        })}
                                      </p>
                                    </div>
                                  )}
                                  {request.pickup_time && (
                                    <div>
                                      <p className="text-xs text-blue-700 mb-1">Saat</p>
                                      <p className="font-medium text-blue-900">{request.pickup_time}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Durum Detayları ve Aksiyonlar */}
                      <div className="p-6 bg-gray-50 relative">
                        {/* Aksiyonlar - Duruma Göre Basit Butonlar */}
                        <div className="flex flex-wrap gap-2">
                          {/* Talep Detayları - Her Zaman */}
                          <Link to={`/hesabim/satis-taleplerim/talep-detay/${request.id}`}>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-[var(--brand-orange-500)] text-[var(--brand-orange-600)] hover:bg-[var(--brand-orange-50)] h-8 text-xs"
                            >
                              <FileText className="w-3.5 h-3.5 mr-1.5" />
                              Talep Detayları
                            </Button>
                          </Link>

                          {/* Karşı Teklif Var - Teklif Detaylarını Görüntüle */}
                          {request.status === 'offer_sent' && (
                            <Button 
                              size="sm" 
                              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/40 border-0 h-9 text-sm font-medium rounded-lg animate-pulse"
                              onClick={() => {
                                setSelectedRequest(request);
                                setIsModalOpen(true);
                              }}
                            >
                              <Banknote className="w-4 h-4 mr-1.5" />
                              Teklifi İncele & Onayla
                            </Button>
                          )}

                          {/* Completed - Raporu Görüntüle */}
                          {request.status === 'completed' && (
                            <Link to={`/hesabim/raporlarim/sell/${request.id}`}>
                              <Button 
                                size="sm" 
                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/40 h-8 text-xs font-medium rounded-lg"
                              >
                                <FileText className="w-3.5 h-3.5 mr-1.5" />
                                Satış Raporu
                              </Button>
                            </Link>
                          )}
                        </div>
                        
                        {/* Talebi İptal Et - Sağ Alt Köşe (İptal edilebilir durumda ise) */}
                        {canCancelRequest(request.status) && (
                          <div className="absolute bottom-4 right-4">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-[var(--brand-red-500)] text-[var(--brand-red-600)] hover:bg-[var(--brand-red-50)] h-8 text-xs shadow-sm"
                              onClick={() => {
                                setSelectedRequestForCancel({ id: request.id, requestNumber: request.requestNumber });
                                setCancelDialogOpen(true);
                              }}
                              disabled={cancellingRequestId === request.id}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1.5" />
                              Talebi İptal Et
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })
          )}
        </div>
        
        {/* Talep Geçmişini Temizle Butonu - Sadece tamamlanmış talepler varsa göster */}
        {!loading && sellRequests.length > 0 && (() => {
          const completedRequests = sellRequests.filter(r => 
            r.status === 'accepted' || r.status === 'rejected' || r.status === 'cancelled' || r.status === 'completed'
          );
          
          // Sadece tamamlanmış/iptal edilmiş talep varsa göster
          if (completedRequests.length === 0) return null;
          
          return (
            <div className="max-w-5xl mx-auto mt-6">
              <Card className="border-red-200 bg-red-50/50">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5 flex-1">
                      <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-red-900 mb-0.5">Talep Geçmişini Temizle</h4>
                        <p className="text-xs text-red-700">
                          Kabul edilmiş, reddedilmiş ve iptal edilmiş {completedRequests.length} talebi kalıcı olarak silebilirsiniz.
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

      {/* Modal - Karşı Teklif veya Detaylar */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#f97316] to-[#fb923c] rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <div>{selectedRequest?.status === 'offer_sent' ? 'Karşı Teklif Detayları' : 'Talep Detayları'}</div>
                <div className="text-sm text-gray-500 font-normal">{selectedRequest?.requestNumber}</div>
              </div>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Ürün satış talebi detaylarını görüntüleyin ve işlem yapın
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4 mt-4">
              <Card className="border-0 shadow-md">
                <CardContent className="p-6">
                  {/* Karşı Teklif Kartı */}
                  {selectedRequest.status === 'offer_sent' && (
                    <>
                      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 border-2 border-blue-300 rounded-xl p-6 mb-4">
                        <div className="flex items-center justify-center gap-3 mb-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-2xl">💰</span>
                          </div>
                          <h3 className="text-xl font-bold text-blue-900">Karşı Teklif Aldınız!</h3>
                        </div>
                        
                        <p className="text-sm text-blue-700 mb-4 text-center">
                          Ürününüz için alternatif bir fiyat teklifi sunuyoruz
                        </p>
                        
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="bg-white/70 p-4 rounded-lg text-center">
                            <p className="text-xs text-gray-600 mb-1">Talebiniz</p>
                            <p className="text-2xl font-bold text-gray-700 line-through">{selectedRequest.estimatedPrice} ₺</p>
                          </div>
                          <div className="bg-white/70 p-4 rounded-lg text-center">
                            <p className="text-xs text-gray-600 mb-1">Karşı Teklifimiz</p>
                            <p className="text-2xl font-bold text-blue-900">{selectedRequest.offerPrice} ₺</p>
                          </div>
                        </div>
                        
                        {selectedRequest.offerNote && (
                          <div className="bg-white/70 p-4 rounded-lg">
                            <p className="text-xs text-gray-600 mb-1.5 font-medium">Açıklama</p>
                            <p className="text-sm text-gray-700">{selectedRequest.offerNote}</p>
                          </div>
                        )}
                      </div>

                      {/* Bilgilendirme */}
                      <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-xl p-4 mb-4">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">⚡</span>
                          <div>
                            <h4 className="font-semibold text-amber-900 mb-2">Hızlı Karar Verin!</h4>
                            <div className="space-y-2 text-sm text-amber-800">
                              <div className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <p><strong>Onaylarsanız:</strong> Ürününüzü toplamak için randevu oluşturulacak ve ödeme yapılacaktır.</p>
                              </div>
                              <div className="flex items-start gap-2">
                                <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                <p><strong>Reddederseniz:</strong> Satış talebi iptal edilecek ve işlem yapılmayacaktır.</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Aksiyon Butonları */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Button
                          onClick={() => handleRespondToOffer(selectedRequest.id, 'accept')}
                          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-5 shadow-lg h-auto rounded-xl"
                        >
                          <CheckCircle className="w-5 h-5 mr-2" />
                          Teklifi Onayla
                        </Button>
                        <Button
                          onClick={() => handleRespondToOffer(selectedRequest.id, 'reject')}
                          variant="outline"
                          className="border-2 border-red-500 text-red-700 hover:bg-red-50 py-5 h-auto rounded-xl"
                        >
                          <XCircle className="w-5 h-5 mr-2" />
                          Teklifi Reddet
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Talebi İptal Et Onay Dialogu */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Talebi İptal Et
            </DialogTitle>
            <DialogDescription className="pt-4">
              <span className="font-medium text-gray-900">
                {selectedRequestForCancel?.requestNumber}
              </span> numaralı satış talebini iptal etmek istediğinizden emin misiniz?
              <br /><br />
              <span className="text-sm text-gray-600">
                Bu işlem sonrasında talep durumu "İptal Edildi" olarak değişecektir.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCancelDialogOpen(false);
                setSelectedRequestForCancel(null);
              }}
              className="bg-white hover:bg-gray-50"
            >
              Vazgeç
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (selectedRequestForCancel) {
                  handleCancelRequest(selectedRequestForCancel.id, selectedRequestForCancel.requestNumber);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={cancellingRequestId !== null}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Talebi İptal Et
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Talep Geçmişini Temizle Onay Dialogu */}
      <Dialog open={clearHistoryDialogOpen} onOpenChange={setClearHistoryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Talep Geçmişini Temizle
            </DialogTitle>
            <DialogDescription className="pt-4">
              <span className="font-medium text-gray-900">
                {sellRequests.filter(r => r.status === 'accepted' || r.status === 'rejected' || r.status === 'cancelled').length} adet
              </span> tamamlanmış/iptal edilmiş talep <span className="font-semibold text-red-600">KALICI OLARAK</span> silinecek!
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

      {/* Talep Akışı Zaman Çizelgesi Dialogu */}
      <Dialog open={timelineDialogOpen} onOpenChange={setTimelineDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--brand-orange-700)]">
              <TrendingUp className="w-5 h-5" />
              Talep Akışı
            </DialogTitle>
            <DialogDescription className="pt-2">
              <span className="font-medium text-gray-900">
                {selectedRequestForTimeline?.requestNumber}
              </span> numaralı satış talebinizin durum geçmişi
            </DialogDescription>
          </DialogHeader>

          {selectedRequestForTimeline && (
            <div className="space-y-4 py-4">
              {(() => {
                // Backend'den gelen güncel status history'yi kullan
                const statusHistory = selectedRequestForTimeline.status_history || [];
                
                // Eğer history boşsa, en azından oluşturma kaydını göster
                const historyToShow = statusHistory.length > 0 ? statusHistory : [
                  {
                    status: 'reviewing',
                    timestamp: selectedRequestForTimeline.submittedDate,
                    note: 'Satış talebi başarıyla oluşturuldu',
                    created_by: 'system'
                  }
                ];
                
                return historyToShow.length > 0 ? (
                  historyToShow.map((history: any, idx: number) => {
                    const config = getStatusConfig(history.status);
                    const isLatest = idx === historyToShow.length - 1;
                    
                    return (
                      <div key={idx} className="flex gap-3">
                        <div className="relative">
                          <div 
                            className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center shadow-md ${isLatest ? 'ring-2 ring-[var(--brand-orange-400)]' : ''}`}
                          >
                            <span className="text-lg">{config.icon}</span>
                          </div>
                          {idx < historyToShow.length - 1 && (
                            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-gray-300" />
                          )}
                        </div>
                        <div className="flex-1 pb-8">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className={`font-medium ${isLatest ? 'text-[var(--brand-orange-700)]' : 'text-gray-700'}`}>
                              {config.label}
                            </p>
                            {isLatest && (
                              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300 text-xs">
                                Mevcut
                              </Badge>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs mb-2">
                            {history.timestamp ? new Date(history.timestamp).toLocaleDateString('tr-TR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Tarih bilinmiyor'}
                          </Badge>
                          {history.note && (
                            <p className="text-sm text-gray-600 mt-1">{history.note}</p>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Henüz durum güncellemesi yok</p>
                  </div>
                );
              })()}
            </div>
          )}

          <DialogFooter className="sm:justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              onClick={() => setTimelineDialogOpen(false)}
              className="bg-[var(--brand-orange-600)] hover:bg-[var(--brand-orange-700)]"
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