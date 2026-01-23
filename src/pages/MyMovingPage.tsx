import { 
  Truck, 
  Calendar, 
  Clock, 
  ArrowLeft, 
  XCircle, 
  Trash2, 
  AlertTriangle, 
  TrendingUp,
  Eye,
  Home,
  Banknote,
  CheckCircle2,
  FileText,
  FileBarChart
} from 'lucide-react@0.487.0';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { projectId } from '../utils/supabase/info';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner@2.0.3';
import { FloatingContactButtons } from '../components/FloatingContactButtons';

export default function MyMovingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // Dialog states
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [clearHistoryDialogOpen, setClearHistoryDialogOpen] = useState(false);
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [selectedForCancel, setSelectedForCancel] = useState<{ id: number; requestNumber: string } | null>(null);
  const [selectedForTimeline, setSelectedForTimeline] = useState<any>(null);
  const [selectedBookingForOffer, setSelectedBookingForOffer] = useState<any>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [isRespondingToOffer, setIsRespondingToOffer] = useState(false);
  
  // Filtreleme için aktif tab
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'reviewing' | 'offer_sent' | 'accepted' | 'completed' | 'cancelled'>('all');

  // Randevuları yükle
  useEffect(() => {
    const loadAppointments = async () => {
      if (!user || !accessToken) {
        setIsLoading(false);
        toast.error('Randevularınızı görmek için giriş yapmalısınız');
        navigate('/giris', { state: { from: location.pathname } });
        return;
      }

      try {
        setIsLoading(true);
        console.log('📦 Fetching moving requests from backend...');
        
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/moving/my-requests`,
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
          throw new Error('Randevular yüklenemedi');
        }

        const data = await response.json();
        console.log('✅ Requests loaded:', data);
        if (data.requests && data.requests.length > 0) {
          console.log('📊 FULL First request:', JSON.stringify(data.requests[0], null, 2));
          console.log('📊 admin_offer_price:', data.requests[0].admin_offer_price);
          console.log('📊 admin_offer:', data.requests[0].admin_offer);
          console.log('📊 admin_notes:', data.requests[0].admin_notes);
          console.log('📊 status:', data.requests[0].status);
          console.log('📊 source:', data.requests[0].source);
        }
        
        setBookings(data.requests || []);
        
      } catch (error: any) {
        console.error('Randevular yüklenirken hata:', error);
        toast.error('Randevular yüklenirken bir hata oluştu');
        setBookings([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAppointments();
  }, [user, accessToken, navigate]);

  // Hash parametresine göre ilgili karta scroll yap
  useEffect(() => {
    if (location.hash && bookings.length > 0) {
      const requestNumber = location.hash.substring(1);
      const element = cardRefs.current[requestNumber];
      
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          element.classList.add('ring-2', 'ring-[var(--brand-teal-500)]', 'rounded-xl');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-[var(--brand-teal-500)]', 'rounded-xl');
          }, 2000);
        }, 300);
      }
    }
  }, [location.hash, bookings]);

  const handleCancelRequest = async () => {
    if (!selectedForCancel) return;
    
    try {
      setCancellingId(selectedForCancel.id);
      setCancelDialogOpen(false);
      console.log('🚫 Cancelling request:', selectedForCancel.requestNumber);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/moving/${selectedForCancel.requestNumber}/cancel`,
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
        console.error('Cancel error response:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || 'Talep iptal edilemedi');
        } catch {
          throw new Error('Talep iptal edilemedi');
        }
      }

      const result = await response.json();
      console.log('Cancel result:', result);

      // Listeyi güncelle
      setBookings(prevBookings => 
        prevBookings.map(booking => 
          booking.request_number === selectedForCancel.requestNumber 
            ? { ...booking, status: 'cancelled' }
            : booking
        )
      );

      toast.success('Talep İptal Edildi!', {
        description: `${selectedForCancel.requestNumber} numaralı talebiniz başarıyla iptal edildi.`,
      });

    } catch (error: any) {
      console.error('Talep iptal hatası:', error);
      toast.error('İptal Başarısız!', {
        description: error.message || 'Talep iptal edilirken bir hata oluştu.',
      });
    } finally {
      setCancellingId(null);
      setSelectedForCancel(null);
    }
  };

  const handleClearHistory = async () => {
    const completedRequests = bookings.filter(b => b.status === 'completed' || b.status === 'rejected' || b.status === 'cancelled');
    
    if (completedRequests.length === 0) {
      toast.info('Silinecek talep yok', {
        description: 'Tamamlanmış veya iptal edilmiş talebiniz bulunmuyor.',
      });
      return;
    }
    
    try {
      setClearHistoryDialogOpen(false);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/moving/clear-history`,
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
        toast.success('Talep geçmişi temizlendi!', {
          description: `${data.deletedCount || 0} talep başarıyla silindi.`,
        });
        
        // State'i güncelle - sadece aktif talepleri tut
        setBookings(prevBookings => 
          prevBookings.filter(b => b.status !== 'completed' && b.status !== 'rejected' && b.status !== 'cancelled')
        );
      } else {
        const errorData = await response.json();
        console.error('Clear history error:', errorData);
        toast.error('Talep geçmişi temizlenemedi', {
          description: errorData.error || 'Bir hata oluştu',
        });
      }
    } catch (error) {
      console.error('Error clearing history:', error);
      toast.error('Talep geçmişi temizlenirken hata oluştu');
    }
  };

  const handleRespondToOffer = async (action: 'accept' | 'reject') => {
    if (!selectedBookingForOffer || isRespondingToOffer) return;

    try {
      setIsRespondingToOffer(true);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/moving/${selectedBookingForOffer.request_number}/respond`,
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

      const result = await response.json();
      
      // Success toast
      if (action === 'accept') {
        toast.success('Teklif Kabul Edildi! 🎉', {
          description: 'Nakliye randevunuz onaylandı. Ekibimiz en kısa sürede sizinle iletişime geçecektir.',
        });
      } else {
        toast.success('Teklif Reddedildi', {
          description: 'Nakliye talebi iptal edildi.',
        });
      }
      
      // Listeyi güncelle
      setBookings(prevBookings => 
        prevBookings.map(booking => 
          booking.request_number === selectedBookingForOffer.request_number 
            ? { ...booking, status: action === 'accept' ? 'accepted' : 'rejected' }
            : booking
        )
      );

      // Dialog'u kapat
      setOfferDialogOpen(false);
      setSelectedBookingForOffer(null);

    } catch (error: any) {
      console.error('Error responding to offer:', error);
      toast.error('İşlem Başarısız!', {
        description: error.message || 'Teklif yanıtlanırken bir hata oluştu.',
      });
    } finally {
      setIsRespondingToOffer(false);
    }
  };

  const canCancelRequest = (status: string) => {
    // pending, reviewing, offer_sent durumlarında iptal edilebilir
    const cancellableStatuses = ['pending', 'reviewing', 'offer_sent'];
    return cancellableStatuses.includes(status);
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; bg: string; icon: string }> = {
      pending: { label: 'İnceleniyor', color: 'text-blue-700', bg: 'bg-blue-100 hover:bg-blue-200', icon: '⏳' },
      reviewing: { label: 'İnceleniyor', color: 'text-blue-700', bg: 'bg-blue-100 hover:bg-blue-200', icon: '⏳' },
      offer_sent: { label: 'Teklif Geldi', color: 'text-orange-700', bg: 'bg-orange-100 hover:bg-orange-200', icon: '💰' },
      accepted: { label: 'Kabul Edildi', color: 'text-green-700', bg: 'bg-green-100 hover:bg-green-200', icon: '✅' },
      completed: { label: 'Tamamlandı', color: 'text-green-700', bg: 'bg-green-100 hover:bg-green-200', icon: '✔️' },
      rejected: { label: 'İptal Edildi', color: 'text-red-700', bg: 'bg-red-100 hover:bg-red-200', icon: '❌' },
      cancelled: { label: 'İptal Edildi', color: 'text-red-700', bg: 'bg-red-100 hover:bg-red-200', icon: '❌' },
    };

    return configs[status] || { label: 'Bilinmeyen', color: 'text-gray-700', bg: 'bg-gray-100 hover:bg-gray-200', icon: '•' };
  };

  // Filtrelenmiş randevular - pending ve reviewing aynı kategoride
  const filteredBookings = activeTab === 'all' 
    ? bookings 
    : activeTab === 'pending'
    ? bookings.filter(b => b.status === 'pending' || b.status === 'reviewing')
    : bookings.filter(b => b.status === activeTab);
  
  // Her status için sayı hesapla
  const statusCounts = {
    all: bookings.length,
    pending: bookings.filter(b => b.status === 'pending' || b.status === 'reviewing').length,
    offer_sent: bookings.filter(b => b.status === 'offer_sent').length,
    accepted: bookings.filter(b => b.status === 'accepted').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled' || b.status === 'rejected').length,
  };

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

  // Timeline data generator
  const getTimelineSteps = (booking: any) => {
    const steps = [
      {
        label: 'Talep Oluşturuldu',
        date: booking.created_at,
        completed: true,
        icon: 'FileText',
        color: 'blue'
      },
      {
        label: 'İnceleniyor',
        date: booking.status !== 'reviewing' ? booking.updated_at : null,
        completed: ['offer_sent', 'accepted', 'completed'].includes(booking.status),
        icon: 'Clock',
        color: 'yellow'
      },
      {
        label: 'Fiyat Teklifi Gönderildi',
        date: booking.status === 'offer_sent' || booking.status === 'accepted' || booking.status === 'completed' ? booking.updated_at : null,
        completed: ['accepted', 'completed'].includes(booking.status),
        icon: 'Banknote',
        color: 'purple'
      },
      {
        label: 'Randevu Onaylandı',
        date: booking.status === 'accepted' || booking.status === 'completed' ? booking.updated_at : null,
        completed: booking.status === 'completed',
        icon: 'CheckCircle2',
        color: 'green'
      },
      {
        label: 'Tamamlandı',
        date: booking.status === 'completed' ? booking.updated_at : null,
        completed: booking.status === 'completed',
        icon: 'TrendingUp',
        color: 'orange'
      }
    ];

    return steps;
  };

  return (
    <div className="bg-gradient-to-b from-gray-50/40 via-white to-gray-50/40 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-[var(--brand-teal-600)]/30 via-[var(--brand-teal-700)]/30 to-[var(--brand-teal-800)]/30 text-white py-10 pt-24">
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
                <Truck className="w-7 h-7 text-[var(--brand-teal-600)]" />
              </div>
              <div>
                <h1 className="text-2xl mb-1 drop-shadow-lg font-bold">Nakliye Randevularım</h1>
                <p className="text-white/90 text-sm font-medium drop-shadow">
                  Toplam <span className="font-bold text-white">{bookings.length}</span> nakliye talebiniz bulunmaktadır
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      {!isLoading && bookings.length > 0 && (
        <div className="bg-white border-b sticky top-16 z-20 shadow-sm">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
                <Button
                  variant={activeTab === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  className={activeTab === 'all' ? 'bg-[var(--brand-teal-600)] hover:bg-[var(--brand-teal-700)]' : ''}
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
                  variant={activeTab === 'offer_sent' ? 'default' : 'ghost'}
                  size="sm"
                  className={activeTab === 'offer_sent' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                  onClick={() => setActiveTab('offer_sent')}
                >
                  Teklif Geldi ({statusCounts.offer_sent})
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

      {/* Bookings List */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto space-y-6">
          {isLoading ? (
            <Card className="border-2 border-dashed bg-gradient-to-br from-gray-100 to-gray-50">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-[var(--brand-teal-100)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Truck className="w-10 h-10 text-[var(--brand-teal-600)]" />
                </div>
                <h3 className="text-gray-800 mb-2 font-semibold">Randevular yükleniyor...</h3>
                <p className="text-gray-600 mb-6">
                  Lütfen bir saniye...
                </p>
              </CardContent>
            </Card>
          ) : bookings.length === 0 ? (
            <Card className="border-2 border-dashed bg-gradient-to-br from-gray-100 to-gray-50">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-[var(--brand-teal-100)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Truck className="w-10 h-10 text-[var(--brand-teal-600)]" />
                </div>
                <h3 className="text-gray-800 mb-2 font-semibold">Henüz nakliye talebiniz yok</h3>
                <p className="text-gray-600 mb-6">
                  Taşınma işlemleriniz için randevu oluşturun
                </p>
                <Link to="/nakliye">
                  <Button className="bg-[var(--brand-teal-600)] hover:bg-[var(--brand-teal-700)]">
                    Nakliye Talebi Oluştur
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : filteredBookings.length === 0 ? (
            <Card className="border-2 border-dashed bg-gradient-to-br from-gray-100 to-gray-50">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-[var(--brand-teal-100)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Truck className="w-10 h-10 text-[var(--brand-teal-600)]" />
                </div>
                <h3 className="text-gray-800 mb-2 font-semibold">Bu kategoride talep bulunamadı</h3>
                <p className="text-gray-600 mb-6">
                  Seçtiğiniz duruma ait nakliye talebiniz bulunmuyor
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredBookings.map((booking) => {
              const statusConfig = getStatusConfig(booking.status);
              
              return (
                <div 
                  key={booking.id}
                  ref={(el) => (cardRefs.current[booking.request_number] = el)}
                >
                  <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 border-0">
                    <CardContent className="p-0">
                      <div className="bg-gradient-to-r from-[var(--brand-teal-50)] to-white p-6 border-b relative">
                        {/* Status Button - Sağ Üst Köşe - Tıklanınca Talep Akışı Göster */}
                        <div className="absolute top-4 right-4">
                          <Button
                            onClick={() => {
                              setSelectedForTimeline(booking);
                              setTimelineDialogOpen(true);
                            }}
                            className={`${statusConfig.bg} ${statusConfig.color} shadow-md border-0 px-4 py-2 hover:scale-105 hover:shadow-lg transition-all duration-200 cursor-pointer ${
                              booking.status === 'completed' ? 'ring-2 ring-green-400 scale-105' : ''
                            }`}
                          >
                            <span className="text-xl mr-2">{statusConfig.icon}</span>
                            <span className="font-semibold">{statusConfig.label}</span>
                          </Button>
                        </div>

                        <div className="pr-32">
                          <div className="mb-4">
                            <h3 className="text-xl mb-2">Nakliye Talebi</h3>
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-gray-500">Talep No: <span className="font-medium text-gray-700">{booking.request_number}</span></p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-[var(--brand-teal-100)] rounded-lg flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-[var(--brand-teal-600)]" />
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Talep Tarihi</p>
                                <p className="font-medium text-gray-800">{formatDate(booking.created_at)}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-[var(--brand-teal-100)] rounded-lg flex items-center justify-center">
                                <Clock className="w-5 h-5 text-[var(--brand-teal-600)]" />
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Taşınma Tarihi</p>
                                <p className="font-medium text-gray-800">{formatDate(booking.moving_date)}</p>
                                {booking.preferred_time && (
                                  <p className="text-xs text-gray-600">{formatTime(booking.preferred_time)}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-[var(--brand-teal-100)] rounded-lg flex items-center justify-center">
                                <Home className="w-5 h-5 text-[var(--brand-teal-600)]" />
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Ev Büyüklüğü</p>
                                <p className="font-medium text-gray-800">{booking.home_size}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Aksiyonlar */}
                      <div className="p-6 bg-gradient-to-r from-gray-50 to-white">
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-[var(--brand-teal-500)] text-[var(--brand-teal-600)] hover:bg-[var(--brand-teal-600)] hover:text-white transition-all shadow-sm"
                            onClick={() => navigate(`/hesabim/nakliye/detay/${booking.request_number}`)}
                          >
                            <Eye className="w-4 h-4 mr-1.5" />
                            Tüm Detaylar
                          </Button>

                          {booking.status === 'completed' && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white transition-all shadow-sm"
                              onClick={() => navigate(`/hesabim/raporlarim/nakliye/${booking.request_number}`)}
                            >
                              <FileBarChart className="w-4 h-4 mr-1.5" />
                              Raporu Görüntüle
                            </Button>
                          )}

                          {canCancelRequest(booking.status) && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-red-500 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm ml-auto"
                              onClick={() => {
                                setSelectedForCancel({ id: booking.id, requestNumber: booking.request_number });
                                setCancelDialogOpen(true);
                              }}
                              disabled={cancellingId === booking.id}
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
        
        {/* Geçmişi Temizle Butonu */}
        {!isLoading && bookings.length > 0 && (() => {
          const completedRequests = bookings.filter(b => b.status === 'completed' || b.status === 'rejected' || b.status === 'cancelled');
          
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
                          Tamamlanmış ve iptal edilmiş {completedRequests.length} talebi kalıcı olarak silebilirsiniz.
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

      {/* İptal Onay Dialogu */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Talebi İptal Et
            </DialogTitle>
            <DialogDescription className="pt-4">
              <span className="font-medium text-gray-900">
                {selectedForCancel?.requestNumber}
              </span> numaralı talebi iptal etmek istediğinizden emin misiniz?
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
                setSelectedForCancel(null);
              }}
              className="bg-white hover:bg-gray-50"
            >
              Vazgeç
            </Button>
            <Button
              type="button"
              onClick={handleCancelRequest}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={cancellingId !== null}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Talebi İptal Et
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Geçmişi Temizle Onay Dialogu */}
      <Dialog open={clearHistoryDialogOpen} onOpenChange={setClearHistoryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Talep Geçmişini Temizle
            </DialogTitle>
            <DialogDescription className="pt-4">
              <span className="font-medium text-gray-900">
                {bookings.filter(b => b.status === 'completed' || b.status === 'rejected' || b.status === 'cancelled').length} adet
              </span> tamamlanmış/iptal edilmiş talep <span className="font-semibold text-red-600">KALICI OLARAK</span> silinecek!
              <br /><br />
              <span className="text-sm text-red-600 font-medium">
                Bu işlem geri alınamaz!
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

      {/* Talep Durumu Dialogu - Sadece Mevcut Durum */}
      <Dialog open={timelineDialogOpen} onOpenChange={setTimelineDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--brand-teal-700)]">
              <TrendingUp className="w-5 h-5" />
              Talep Durumu
            </DialogTitle>
            <DialogDescription className="pt-2">
              <span className="font-medium text-gray-900">
                {selectedForTimeline?.request_number}
              </span> numaralı talebinizin mevcut durumu
            </DialogDescription>
          </DialogHeader>
          
          {selectedForTimeline && (() => {
            const currentStatus = selectedForTimeline.status;
            const config = getStatusConfig(currentStatus);
            
            return (
              <div className="py-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className={`w-16 h-16 rounded-full ${config.bg} flex items-center justify-center shadow-lg ring-4 ring-teal-100`}>
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
                      {currentStatus === 'pending' && 'Talebiniz uzmanlarımız tarafından inceleniyor'}
                      {currentStatus === 'reviewing' && 'Talebiniz uzmanlarımız tarafından inceleniyor'}
                      {currentStatus === 'offer_sent' && 'Fiyat teklifimiz size iletildi'}
                      {currentStatus === 'accepted' && 'Talebiniz kabul edildi, randevu oluşturuldu'}
                      {currentStatus === 'completed' && 'Nakliye hizmeti başarıyla tamamlandı'}
                      {currentStatus === 'rejected' && 'Bu talep iptal edildi'}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDateTime(selectedForTimeline.created_at)}
                      </Badge>
                    </div>
                    {selectedForTimeline.estimated_cost && currentStatus === 'offer_sent' && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-3">
                        <p className="text-xs font-medium text-orange-800 mb-1">💰 Tahmini Maliyet:</p>
                        <p className="text-lg font-bold text-orange-900">{selectedForTimeline.estimated_cost.toLocaleString('tr-TR')} ₺</p>
                      </div>
                    )}
                    {selectedForTimeline.appointment_date && currentStatus === 'accepted' && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                        <p className="text-xs font-medium text-green-800 mb-1">📅 Randevu Tarihi:</p>
                        <p className="text-sm font-semibold text-green-900">
                          {formatDate(selectedForTimeline.appointment_date)} - {formatTime(selectedForTimeline.appointment_time)}
                        </p>
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
              className="bg-[var(--brand-teal-600)] hover:bg-[var(--brand-teal-700)]"
            >
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Teklif Dialog'u */}
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
                Talep #{selectedBookingForOffer?.request_number}
              </span>
            </DialogDescription>
          </DialogHeader>
          
          {selectedBookingForOffer && (
            <div className="space-y-6 py-4">
              {/* Teklif Fiyatı */}
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-sm text-green-700 mb-2 font-medium">💰 ErsinSpot Teklif Fiyatı</p>
                    <p className="text-5xl font-bold text-green-600 mb-2">
                      ₺{(selectedBookingForOffer.admin_price || selectedBookingForOffer.admin_offer_price || selectedBookingForOffer.admin_offer || 0).toLocaleString('tr-TR')}
                    </p>
                    <p className="text-xs text-green-700">KDV Dahil</p>
                  </div>
                </CardContent>
              </Card>

              {/* Admin Notları */}
              {selectedBookingForOffer.admin_notes && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-blue-900 mb-1 text-sm">Teklif Notları</h4>
                        <p className="text-sm text-blue-800 whitespace-pre-wrap">{selectedBookingForOffer.admin_notes}</p>
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

      {/* Floating Contact Buttons */}
      <FloatingContactButtons />
    </div>
  );
}
