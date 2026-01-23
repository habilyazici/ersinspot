import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Wrench, Calendar, Clock, MapPin, ArrowLeft, FileText, Eye, XCircle, AlertTriangle, TrendingUp, Banknote, CheckCircle2 } from 'lucide-react@0.487.0';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../utils/supabase/info';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

export default function MyTechnicalServicePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null);
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // Dialog states
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedRequestForCancel, setSelectedRequestForCancel] = useState<{ id: string; requestNumber: string } | null>(null);
  
  // Timeline Dialog
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [selectedRequestForTimeline, setSelectedRequestForTimeline] = useState<any>(null);
  
  // Filtreleme için aktif tab
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'quoted' | 'accepted' | 'completed' | 'cancelled'>('all');

  // Talepleri yükle
  useEffect(() => {
    const loadRequests = async () => {
      if (!user || !accessToken) {
        setIsLoading(false);
        toast.error('Taleplerinizi görmek için giriş yapmalısınız');
        navigate('/giris', { state: { from: location.pathname } });
        return;
      }

      try {
        setIsLoading(true);
        console.log('🔧 Fetching technical service requests from backend...');
        
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/technical-service/my-requests`,
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
          throw new Error('Talepler yüklenemedi');
        }

        const data = await response.json();
        console.log('✅ Technical service requests loaded:', data);
        
        setRequests(data.requests || []);
        
      } catch (error: any) {
        console.error('Talepler yüklenirken hata:', error);
        toast.error('Talepler yüklenirken bir hata oluştu');
        setRequests([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadRequests();
  }, [user, accessToken, navigate, location.pathname]);

  // Hash parametresine göre ilgili karta scroll yap
  useEffect(() => {
    if (location.hash && requests.length > 0) {
      const requestNumber = location.hash.substring(1); // # işaretini kaldır
      const element = cardRefs.current[requestNumber];
      
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          // Kısa bir highlight efekti
          element.classList.add('ring-2', 'ring-[#f97316]', 'rounded-xl');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-[#f97316]', 'rounded-xl');
          }, 2000);
        }, 300);
      }
    }
  }, [location.hash, requests]);

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; bg: string; icon: string }> = {
      pending: { label: 'İnceleniyor', color: 'text-blue-700', bg: 'bg-blue-100 hover:bg-blue-200', icon: '⏳' },
      reviewing: { label: 'İnceleniyor', color: 'text-blue-700', bg: 'bg-blue-100 hover:bg-blue-200', icon: '⏳' },
      quoted: { label: 'Fiyat Teklifi Verildi', color: 'text-purple-700', bg: 'bg-purple-100 hover:bg-purple-200', icon: '💰' },
      accepted: { label: 'Kabul Edildi', color: 'text-green-700', bg: 'bg-green-100 hover:bg-green-200', icon: '✅' },
      approved: { label: 'Onaylandı', color: 'text-green-700', bg: 'bg-green-100 hover:bg-green-200', icon: '✅' },
      completed: { label: 'Tamamlandı', color: 'text-green-700', bg: 'bg-green-100 hover:bg-green-200', icon: '✔️' },
      cancelled: { label: 'İptal Edildi', color: 'text-red-700', bg: 'bg-red-100 hover:bg-red-200', icon: '❌' },
    };
    return configs[status] || { label: status, color: 'text-gray-700', bg: 'bg-gray-100 hover:bg-gray-200', icon: '📋' };
  };

  const canCancelRequest = (status: string) => {
    const cancellableStatuses = ['pending', 'reviewing', 'quoted'];
    return cancellableStatuses.includes(status);
  };

  // Filtrelenmiş talepler - pending ve reviewing aynı kategoride
  const filteredRequests = activeTab === 'all' 
    ? requests 
    : activeTab === 'pending'
    ? requests.filter(r => r.status === 'pending' || r.status === 'reviewing')
    : activeTab === 'accepted'
    ? requests.filter(r => r.status === 'accepted' || r.status === 'approved')
    : requests.filter(r => r.status === activeTab);
  
  // Her status için sayı hesapla
  const statusCounts = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending' || r.status === 'reviewing').length,
    quoted: requests.filter(r => r.status === 'quoted').length,
    accepted: requests.filter(r => r.status === 'accepted' || r.status === 'approved').length,
    completed: requests.filter(r => r.status === 'completed').length,
    cancelled: requests.filter(r => r.status === 'cancelled').length,
  };

  // İptal işlemi - Dialog açma
  const openCancelDialog = (request: any) => {
    setSelectedRequestForCancel({
      id: request.id,
      requestNumber: request.request_number
    });
    setCancelDialogOpen(true);
  };

  // İptal işlemi - Onaylama
  const handleCancelRequest = async () => {
    if (!selectedRequestForCancel || !accessToken) return;

    try {
      setCancellingRequestId(selectedRequestForCancel.id);
      console.log('🚫 Cancelling request:', selectedRequestForCancel.requestNumber);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/technical-service/${selectedRequestForCancel.id}/cancel`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('İptal hatası:', errorText);
        throw new Error('İptal işlemi başarısız oldu');
      }

      const data = await response.json();
      console.log('✅ Request cancelled:', data);

      // Listeyi güncelle
      setRequests(prevRequests =>
        prevRequests.map(req =>
          req.id === selectedRequestForCancel.id
            ? { ...req, status: 'cancelled' }
            : req
        )
      );

      toast.success('Talep başarıyla iptal edildi');
      setCancelDialogOpen(false);
      setSelectedRequestForCancel(null);

    } catch (error: any) {
      console.error('İptal hatası:', error);
      toast.error(error.message || 'İptal işlemi sırasında bir hata oluştu');
    } finally {
      setCancellingRequestId(null);
    }
  };

  return (
    <div className="bg-gradient-to-b from-gray-50/40 via-white to-gray-50/40 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#fb923c]/30 via-[#f97316]/30 to-[#ea580c]/30 text-white py-10 pt-24">
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
                <Wrench className="w-7 h-7 text-[#f97316]" />
              </div>
              <div>
                <h1 className="text-2xl mb-1 drop-shadow-lg font-bold">Teknik Servis Randevularım</h1>
                <p className="text-white/90 text-sm font-medium drop-shadow">
                  Toplam <span className="font-bold text-white">{requests.length}</span> talebiniz bulunmaktadır
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      {!isLoading && requests.length > 0 && (
        <div className="bg-white border-b sticky top-16 z-20 shadow-sm">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
                <Button
                  variant={activeTab === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  className={activeTab === 'all' ? 'bg-[#f97316] hover:bg-[#ea580c]' : ''}
                  onClick={() => setActiveTab('all')}
                >
                  Tümü ({statusCounts.all})
                </Button>
                <Button
                  variant={activeTab === 'pending' ? 'default' : 'ghost'}
                  size="sm"
                  className={activeTab === 'pending' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                  onClick={() => setActiveTab('pending')}
                >
                  İnceleniyor ({statusCounts.pending})
                </Button>
                <Button
                  variant={activeTab === 'quoted' ? 'default' : 'ghost'}
                  size="sm"
                  className={activeTab === 'quoted' ? 'bg-purple-500 hover:bg-purple-600' : ''}
                  onClick={() => setActiveTab('quoted')}
                >
                  Teklif Verildi ({statusCounts.quoted})
                </Button>
                <Button
                  variant={activeTab === 'accepted' ? 'default' : 'ghost'}
                  size="sm"
                  className={activeTab === 'accepted' ? 'bg-green-500 hover:bg-green-600' : ''}
                  onClick={() => setActiveTab('accepted')}
                >
                  Kabul Edildi ({statusCounts.accepted})
                </Button>
                <Button
                  variant={activeTab === 'completed' ? 'default' : 'ghost'}
                  size="sm"
                  className={activeTab === 'completed' ? 'bg-green-600 hover:bg-green-700' : ''}
                  onClick={() => setActiveTab('completed')}
                >
                  Tamamlandı ({statusCounts.completed})
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

      {/* Requests List */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto space-y-6">
          {isLoading ? (
            <Card className="border-2 border-dashed bg-gradient-to-br from-orange-50 to-white">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wrench className="w-10 h-10 text-[#f97316]" />
                </div>
                <h3 className="text-gray-800 mb-2 font-semibold">Talepler yükleniyor...</h3>
                <p className="text-gray-600 mb-6">
                  Lütfen bir saniye...
                </p>
              </CardContent>
            </Card>
          ) : requests.length === 0 ? (
            <Card className="border-2 border-dashed bg-gradient-to-br from-orange-50 to-white">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wrench className="w-10 h-10 text-[#f97316]" />
                </div>
                <h3 className="text-gray-800 mb-2 font-semibold">Henüz talebiniz yok</h3>
                <p className="text-gray-600 mb-6">
                  Beyaz eşyalarınız için teknik servis talebi oluşturun
                </p>
                <Link to="/teknik-servis">
                  <Button className="bg-[#f97316] hover:bg-[#ea580c]">
                    Yeni Talep Oluştur
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : filteredRequests.length === 0 ? (
            <Card className="border-2 border-dashed bg-gradient-to-br from-orange-50 to-white">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wrench className="w-10 h-10 text-[#f97316]" />
                </div>
                <h3 className="text-gray-800 mb-2 font-semibold">Bu kategoride talep bulunamadı</h3>
                <p className="text-gray-600 mb-6">
                  Seçtiğiniz duruma ait teknik servis talebiniz bulunmuyor
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map((request, idx) => {
              const statusConfig = getStatusConfig(request.status);
              const hasPhoto = request.photos && request.photos.length > 0;
              const photoUrl = hasPhoto ? request.photos[0].photo_url : null;
              
              // Tarih formatla
              const requestDate = request.created_at ? new Date(request.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';
              const preferredDate = request.preferred_date ? format(new Date(request.preferred_date), 'PP', { locale: tr }) : '-';
              const preferredTime = request.preferred_time || '-';
              
              return (
                <div 
                  key={`request-${request.id}-${request.request_number || idx}`}
                  ref={(el) => (cardRefs.current[request.request_number] = el)}
                >
                  <Card className={`overflow-hidden hover:shadow-2xl transition-all duration-300 border-0 ${
                    request.status === 'completed' 
                      ? 'ring-2 ring-green-400 shadow-green-200' 
                      : request.status === 'approved'
                      ? 'ring-2 ring-green-300'
                      : request.status === 'quoted'
                      ? 'ring-2 ring-purple-300 shadow-purple-200'
                      : request.status === 'cancelled'
                      ? 'ring-2 ring-red-300 bg-red-50/30'
                      : ''
                  }`}>
                    <CardContent className="p-0">
                      <div className="bg-gradient-to-r from-[#f97316]/10 to-white p-6 border-b relative">
                        {/* Status Button - Sağ Üst Köşe - Tıklanınca Talep Akışı Göster */}
                        <div className="absolute top-4 right-4">
                          <Button
                            onClick={() => {
                              setSelectedRequestForTimeline(request);
                              setTimelineDialogOpen(true);
                            }}
                            className={`${statusConfig.bg} ${statusConfig.color} shadow-md border-0 px-4 py-2 hover:scale-105 hover:shadow-lg transition-all duration-200 cursor-pointer ${
                              request.status === 'completed' ? 'ring-2 ring-green-400 scale-105' : ''
                            }`}
                          >
                            <span className="text-xl mr-2">{statusConfig.icon}</span>
                            <span className="font-semibold">{statusConfig.label}</span>
                          </Button>
                        </div>

                        {/* Teklif Geldiğinde Banner */}
                        {request.status === 'quoted' && request.estimated_price && (
                          <div className="mb-4 bg-orange-100 border-l-4 border-orange-500 p-3 rounded">
                            <p className="text-sm text-orange-800 flex items-center gap-2">
                              <Banknote className="w-5 h-5 text-orange-600" />
                              <span>Fiyat teklifi: <span className="font-bold text-lg ml-1">{request.estimated_price.toLocaleString('tr-TR')} ₺</span></span>
                            </p>
                          </div>
                        )}

                        <div className="flex flex-col lg:flex-row gap-6">
                          {/* Ürün Resmi - İlk fotoğraf */}
                          {hasPhoto && (
                            <ImageWithFallback 
                              src={photoUrl}
                              alt={request.product_type}
                              className="w-full lg:w-32 h-32 object-cover rounded-xl shadow-lg cursor-pointer hover:opacity-80"
                              onClick={() => window.open(photoUrl, '_blank')}
                            />
                          )}
                          
                          <div className="flex-1 pr-32">
                            <div className="mb-4">
                              <h3 className="text-xl mb-2">
                                {request.product_type} {request.product_brand && `- ${request.product_brand}`}
                              </h3>
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-gray-500">Talep No: <span className="font-medium text-gray-700">{request.request_number}</span></p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {/* Ürün Bilgisi */}
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#f97316]/10 rounded-lg flex items-center justify-center">
                                  <Wrench className="w-5 h-5 text-[#f97316]" />
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Cihaz</p>
                                  <p className="font-medium text-gray-800">{request.product_type}</p>
                                  {request.product_model && (
                                    <p className="text-xs text-gray-600">{request.product_model}</p>
                                  )}
                                </div>
                              </div>

                              {/* Talep Tarihi */}
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#f97316]/10 rounded-lg flex items-center justify-center">
                                  <Calendar className="w-5 h-5 text-[#f97316]" />
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Talep Tarihi</p>
                                  <p className="font-medium text-gray-800 text-sm">{requestDate}</p>
                                </div>
                              </div>

                              {/* Tercih Edilen Tarih/Saat */}
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#f97316]/10 rounded-lg flex items-center justify-center">
                                  <Clock className="w-5 h-5 text-[#f97316]" />
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Tercih Edilen</p>
                                  <p className="font-medium text-gray-800 text-sm">{preferredDate}</p>
                                  {preferredTime !== '-' && (
                                    <p className="text-xs text-gray-600">{preferredTime}</p>
                                  )}
                                </div>
                              </div>

                              {/* Fiyat Teklifi veya Lokasyon */}
                              {request.estimated_price ? (
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-[#f97316]/10 rounded-lg flex items-center justify-center">
                                    <Banknote className="w-5 h-5 text-[#f97316]" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Fiyat Teklifi</p>
                                    <p className="font-medium text-gray-800">{request.estimated_price.toLocaleString('tr-TR')} ₺</p>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-[#f97316]/10 rounded-lg flex items-center justify-center">
                                    <MapPin className="w-5 h-5 text-[#f97316]" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Lokasyon</p>
                                    <p className="font-medium text-gray-800">
                                      {[
                                        request.service_neighborhood,
                                        request.service_district,
                                        request.service_city
                                      ].filter(Boolean).join(', ') || '-'}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Sorun Açıklaması - Ürün Alım Taleplerine Benzer Stil */}
                      {request.problem_description && (
                        <div className="px-6 py-4 bg-gray-50/50 border-b">
                          <div className="flex items-start gap-2">
                            <FileText className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs text-gray-500 mb-1">Sorun Açıklaması</p>
                              <p className="text-sm text-gray-700 leading-relaxed">{request.problem_description}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Fotoğraflar - Ürün Sat Mantığıyla Aynı */}
                      {hasPhoto && request.photos.length > 1 && (
                        <div className="px-6 py-4 bg-gray-50/50 border-b">
                          <div className="mb-2">
                            <p className="text-xs text-gray-500 font-medium">Ürün Fotoğrafları ({request.photos.length})</p>
                          </div>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                            {request.photos.map((photo: any, photoIdx: number) => (
                              <ImageWithFallback 
                                key={`photo-${request.id}-${photoIdx}`}
                                src={photo.photo_url}
                                alt={`${request.product_type} fotoğraf ${photoIdx + 1}`}
                                className="w-full h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity shadow-sm"
                                onClick={() => window.open(photo.photo_url, '_blank')}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Aksiyonlar */}
                      <div className="p-6 bg-gradient-to-r from-gray-50 to-white relative">
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-[#f97316] text-[#f97316] hover:bg-[#f97316] hover:text-white transition-all shadow-sm"
                            onClick={() => navigate(`/hesabim/teknik-servis/detay/${request.id}`)}
                          >
                            <Eye className="w-4 h-4 mr-1.5" />
                            Tüm Detaylar
                          </Button>

                          {request.status === 'quoted' && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white transition-all shadow-sm"
                              onClick={() => navigate(`/hesabim/teknik-servis/detay/${request.id}`)}
                            >
                              <Banknote className="w-4 h-4 mr-1.5" />
                              Teklifi Görüntüle
                            </Button>
                          )}

                          {request.status === 'completed' && (
                            <Link to={`/hesabim/raporlarim/service/${request.id}`}>
                              <Button 
                                size="sm" 
                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-sm"
                              >
                                <FileText className="w-4 h-4 mr-1.5" />
                                Servis Raporu
                              </Button>
                            </Link>
                          )}
                        </div>
                        
                        {/* İptal Et - Sağ Alt Köşe (İptal edilebilir durumda ise) */}
                        {canCancelRequest(request.status) && (
                          <div className="absolute bottom-4 right-4">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-red-500 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                              onClick={() => openCancelDialog(request)}
                              disabled={cancellingRequestId === request.id}
                            >
                              <XCircle className="w-4 h-4 mr-1.5" />
                              İptal Et
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
      </div>

      {/* İptal Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Talebi İptal Et
            </DialogTitle>
            <DialogDescription>
              {selectedRequestForCancel ? (
                <>
                  <span className="font-semibold text-gray-900">{selectedRequestForCancel.requestNumber}</span> numaralı talebi iptal etmek istediğinizden emin misiniz?
                  <br />
                  <span className="text-red-600 font-medium">Bu işlem geri alınamaz.</span>
                </>
              ) : (
                'Talep bilgileri yükleniyor...'
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setCancelDialogOpen(false);
                setSelectedRequestForCancel(null);
              }}
              disabled={!!cancellingRequestId}
            >
              Vazgeç
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelRequest}
              disabled={!!cancellingRequestId}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancellingRequestId ? 'İptal Ediliyor...' : 'Evet, İptal Et'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Talep Durumu Dialogu - Sadece Mevcut Durum */}
      <Dialog open={timelineDialogOpen} onOpenChange={setTimelineDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#f97316]" />
              Talep Durumu
            </DialogTitle>
            <DialogDescription>
              {selectedRequestForTimeline ? (
                <>Talep No: <span className="font-semibold text-gray-900">{selectedRequestForTimeline.request_number}</span> - Mevcut durum</>
              ) : (
                'Talep bilgileri yükleniyor...'
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedRequestForTimeline && (() => {
            const currentStatus = selectedRequestForTimeline.status;
            
            // Status'e göre config
            const statusConfig: Record<string, { icon: string; label: string; description: string; bg: string }> = {
              reviewing: {
                icon: '⏳',
                label: 'Talep İnceleniyor',
                description: 'Talebiniz alındı ve uzmanlarımız tarafından inceleniyor',
                bg: 'bg-blue-100'
              },
              quoted: {
                icon: '💰',
                label: 'Fiyat Teklifi Verildi',
                description: selectedRequestForTimeline.estimated_price 
                  ? `${selectedRequestForTimeline.estimated_price.toLocaleString('tr-TR')} ₺ fiyat teklifi verildi`
                  : 'Fiyat teklifi bekleniyor',
                bg: 'bg-orange-100'
              },
              approved: {
                icon: '✅',
                label: 'Talep Onaylandı',
                description: 'Randevunuz oluşturuldu',
                bg: 'bg-green-100'
              },
              completed: {
                icon: '✔️',
                label: 'Servis Tamamlandı',
                description: 'Teknik servis hizmeti başarıyla tamamlandı',
                bg: 'bg-green-500'
              },
              cancelled: {
                icon: '❌',
                label: 'Talep İptal Edildi',
                description: 'Bu talep iptal edildi',
                bg: 'bg-red-100'
              }
            };

            const config = statusConfig[currentStatus] || statusConfig.reviewing;
            
            return (
              <div className="py-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className={`w-16 h-16 rounded-full ${config.bg} flex items-center justify-center shadow-lg ring-4 ring-orange-100`}>
                      <span className="text-2xl">{config.icon}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {config.label}
                      </h3>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-xs whitespace-nowrap">
                        Mevcut
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {config.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {selectedRequestForTimeline.created_at ? format(new Date(selectedRequestForTimeline.created_at), 'PPp', { locale: tr }) : '-'}
                      </Badge>
                    </div>
                    {selectedRequestForTimeline.estimated_price && currentStatus === 'quoted' && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-3">
                        <p className="text-xs font-medium text-orange-800 mb-1">💰 Fiyat Teklifi:</p>
                        <p className="text-lg font-bold text-orange-900">{selectedRequestForTimeline.estimated_price.toLocaleString('tr-TR')} ₺</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
