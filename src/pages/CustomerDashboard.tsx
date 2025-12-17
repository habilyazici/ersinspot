import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Package, Calendar, Wrench, Truck, ShoppingBag, Clock, MapPin, User, Phone, Mail, Settings, Heart, FileText, Banknote, Eye, ArrowRight, AlertCircle, LogOut, Tag, Zap, ChevronDown, ChevronRight } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { FloatingContactButtons } from '../components/FloatingContactButtons';
import { useAuth } from '../contexts/AuthContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { useNavigate } from 'react-router-dom';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { ORDER_STATUS_CONFIG, APPOINTMENT_STATUS_CONFIG } from '../types';

// Hesabım Ana Sayfa - Aktif İşlemler ve Özet
export default function CustomerDashboard() {
  const navigate = useNavigate();
  const { favorites } = useFavorites();
  const { user, accessToken, signOut } = useAuth();
  
  // Backend'den verileri yükle
  const [orders, setOrders] = useState<any[]>([]);
  const [sellRequests, setSellRequests] = useState<any[]>([]);
  const [serviceAppointments, setServiceAppointments] = useState<any[]>([]);
  const [movingAppointments, setMovingAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    memberSince: '',
    profile_photo_url: null as string | null,
  });

  useEffect(() => {
    const loadData = async () => {
      if (!user || !accessToken) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Profil bilgilerini yükle
        const profileResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/customers/me`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setProfileData({
            name: profileData.customer.name || 'Kullanıcı',
            email: profileData.customer.email || user.email || '',
            phone: profileData.customer.phone || '',
            memberSince: profileData.customer.created_at 
              ? new Date(profileData.customer.created_at).toLocaleDateString('tr-TR', { 
                  day: 'numeric',
                  month: 'long', 
                  year: 'numeric' 
                })
              : '',
            profile_photo_url: profileData.customer.profile_photo_url || null,
          });
        }

        // Siparişleri yükle
        const ordersResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/user-orders`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (ordersResponse.ok) {
          const ordersData = await ordersResponse.json();
          setOrders(ordersData.orders || []);
        }

        // Satış taleplerini yükle
        const sellRequestsResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/user-sell-requests`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (sellRequestsResponse.ok) {
          const sellRequestsData = await sellRequestsResponse.json();
          console.log('[DASHBOARD] Sell requests data:', sellRequestsData);
          setSellRequests(sellRequestsData.sellRequests || []);
        } else {
          console.error('[DASHBOARD] Failed to load sell requests:', sellRequestsResponse.status);
        }

        // Teknik servis randevularını yükle
        const serviceResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/technical-service/my-requests`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (serviceResponse.ok) {
          const serviceData = await serviceResponse.json();
          console.log('[DASHBOARD] Technical service data:', serviceData);
          setServiceAppointments(serviceData.requests || []);
        } else {
          console.error('[DASHBOARD] Failed to load technical service:', serviceResponse.status);
        }

        // Nakliye randevularını yükle
        const movingResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/moving/my-requests`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (movingResponse.ok) {
          const movingData = await movingResponse.json();
          console.log('[DASHBOARD] Moving data:', movingData);
          setMovingAppointments(movingData.requests || []);
        } else {
          console.error('[DASHBOARD] Failed to load moving:', movingResponse.status);
        }

      } catch (error) {
        console.error('Veriler yüklenirken hata:', error);
        toast.error('Veriler yüklenirken bir hata oluştu');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, accessToken]);

  // Status badge yapılandırması - Merkezi config kullanıyoruz
  const getStatusConfig = (status: string) => {
    type OrderStatusKey = keyof typeof ORDER_STATUS_CONFIG;
    type AppointmentStatusKey = keyof typeof APPOINTMENT_STATUS_CONFIG;
    
    // Önce ORDER_STATUS_CONFIG kontrol et
    if (status in ORDER_STATUS_CONFIG) {
      const config = ORDER_STATUS_CONFIG[status as OrderStatusKey];
      return {
        label: config.label,
        color: `text-${config.color}-700`,
        bg: `bg-${config.color}-100`
      };
    }
    
    // Sonra APPOINTMENT_STATUS_CONFIG kontrol et
    if (status in APPOINTMENT_STATUS_CONFIG) {
      const config = APPOINTMENT_STATUS_CONFIG[status as AppointmentStatusKey];
      return {
        label: config.label,
        color: `text-${config.color}-700`,
        bg: `bg-${config.color}-100`
      };
    }
    
    // Satış talepleri için özel durumlar
    const sellRequestConfigs: Record<string, { label: string; color: string; bg: string }> = {
      'offer_sent': { label: 'Teklif Geldi', color: 'text-blue-700', bg: 'bg-blue-100' }, // Backend status
      'counter_offer_sent': { label: 'Teklif Geldi', color: 'text-blue-700', bg: 'bg-blue-100' }, // Legacy support
      'rejected': { label: 'Reddedildi', color: 'text-red-700', bg: 'bg-red-100' },
      'accepted': { label: 'Kabul Edildi', color: 'text-green-700', bg: 'bg-green-100' }, // Backend status
      'approved': { label: 'Onaylandı', color: 'text-green-700', bg: 'bg-green-100' }, // Legacy support
      'completed': { label: 'Tamamlandı', color: 'text-gray-700', bg: 'bg-gray-100' },
      'cancelled': { label: 'İptal Edildi', color: 'text-gray-700', bg: 'bg-gray-200' },
    };
    
    if (status in sellRequestConfigs) {
      return sellRequestConfigs[status];
    }

    // Fallback
    return { label: status, color: 'text-gray-700', bg: 'bg-gray-100' };
  };

  // Aktif siparişleri filtrele (Snake_Case database format) - payment_received aşaması kaldırıldı
  const activeOrders = orders.filter(order => 
    ['payment_pending', 'processing', 'in_transit'].includes(order.status)
  );

  // Aktif satış taleplerini filtrele (pending, offer_sent, counter_offer_sent)
  const activeSellRequests = sellRequests.filter(request =>
    ['pending', 'offer_sent', 'counter_offer_sent', 'reviewing'].includes(request.status)
  );

  // Aktif teknik servis randevularını filtrele (pending, reviewing, offer_sent, accepted)
  const activeServiceAppointments = serviceAppointments.filter(appointment =>
    ['pending', 'reviewing', 'offer_sent', 'accepted', 'approved'].includes(appointment.status)
  );

  // Aktif nakliye randevularını filtrele (pending, reviewing, offer_sent, accepted)
  const activeMovingAppointments = movingAppointments.filter(appointment =>
    ['pending', 'reviewing', 'offer_sent', 'accepted', 'approved'].includes(appointment.status)
  );

  // Toplam aktif işlem sayısı
  const totalActiveItems = 
    activeOrders.length + 
    activeSellRequests.length + 
    activeServiceAppointments.length + 
    activeMovingAppointments.length;

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#2563eb]/60 via-[#3b82f6]/50 to-[#f97316]/50 text-white py-8 pt-24">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <div className="flex items-center gap-5">
              {profileData.profile_photo_url ? (
                <img 
                  src={profileData.profile_photo_url} 
                  alt="Profil Fotoğrafı" 
                  className="w-20 h-20 rounded-full object-cover shadow-xl ring-4 ring-white/20"
                />
              ) : (
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl ring-4 ring-white/20">
                  <User className="w-10 h-10 text-[#1e3a8a]" />
                </div>
              )}
              <div>
                <h1 className="mb-1.5 drop-shadow-lg text-2xl">{profileData.name}</h1>
                <p className="text-gray-100 flex items-center gap-2 text-sm">
                  <span>📧</span> {profileData.email}
                </p>
              </div>
            </div>
            <Link to="/cikis">
              <Button 
                variant="ghost" 
                className="text-white hover:text-white hover:bg-white/20 border border-white/30"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Çıkış Yap
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        <div className="max-w-5xl mx-auto">
          {/* Hesap Özeti Kartları */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-7">
            <Link to="/hesabim/profil" key="profile-link">
              <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 hover:border-[var(--brand-orange-400)] group min-h-[180px]">
                <CardContent className="p-5 text-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-[var(--brand-orange-500)] to-[var(--brand-orange-700)] rounded-full flex items-center justify-center mx-auto mb-3.5 group-hover:scale-110 transition-transform shadow-lg">
                    <User className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="mb-1 text-base h-12 flex items-center justify-center">Profilim</h3>
                  <p className="text-xl font-bold text-[var(--brand-orange-600)]">✓</p>
                  <p className="text-xs text-gray-500 mt-1">Bilgilerim</p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/hesabim/siparislerim" key="orders-link">
              <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 hover:border-[var(--brand-navy-400)] group min-h-[180px]">
                <CardContent className="p-5 text-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-[var(--brand-navy-500)] to-[var(--brand-navy-700)] rounded-full flex items-center justify-center mx-auto mb-3.5 group-hover:scale-110 transition-transform shadow-lg">
                    <Package className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="mb-1 text-base h-12 flex items-center justify-center">Siparişlerim</h3>
                  <p className="text-xl font-bold text-[var(--brand-navy-600)]">{orders.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Toplam Sipariş</p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/hesabim/nakliye" key="moving-link">
              <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 hover:border-[var(--brand-teal-400)] group min-h-[180px]">
                <CardContent className="p-5 text-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-[var(--brand-teal-500)] to-[var(--brand-teal-700)] rounded-full flex items-center justify-center mx-auto mb-3.5 group-hover:scale-110 transition-transform shadow-lg">
                    <Truck className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="mb-1 text-base h-12 flex items-center justify-center">Nakliye Randevularım</h3>
                  <p className="text-xl font-bold text-[var(--brand-teal-600)]">{movingAppointments.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Randevu</p>
                </CardContent>
              </Card>
            </Link>
            
            <Link to="/hesabim/satis-taleplerim" key="sell-requests-link">
              <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 hover:border-[var(--brand-bronze-400)] group min-h-[180px]">
                <CardContent className="p-5 text-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-[var(--brand-bronze-500)] to-[var(--brand-bronze-700)] rounded-full flex items-center justify-center mx-auto mb-3.5 group-hover:scale-110 transition-transform shadow-lg">
                    <Tag className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="mb-1 text-base h-12 flex items-center justify-center">Ürün Satış Taleplerim</h3>
                  <p className="text-xl font-bold text-[var(--brand-bronze-600)]">{sellRequests.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Talep</p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/hesabim/teknik-servis" key="service-link">
              <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 hover:border-[var(--brand-orange-400)] group min-h-[180px]">
                <CardContent className="p-5 text-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-[var(--brand-orange-500)] to-[var(--brand-orange-700)] rounded-full flex items-center justify-center mx-auto mb-3.5 group-hover:scale-110 transition-transform shadow-lg">
                    <Wrench className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="mb-1 text-base h-12 flex items-center justify-center">Teknik Servis Randevularım</h3>
                  <p className="text-xl font-bold text-[var(--brand-orange-600)]">{serviceAppointments.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Randevu</p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/hesabim/favorilerim" key="favorites-link">
              <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 hover:border-[var(--brand-coral-400)] group min-h-[180px]">
                <CardContent className="p-5 text-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-[var(--brand-coral-500)] to-red-600 rounded-full flex items-center justify-center mx-auto mb-3.5 group-hover:scale-110 transition-transform shadow-lg">
                    <Heart className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="mb-1 text-base h-12 flex items-center justify-center">Favorilerim</h3>
                  <p className="text-xl font-bold text-[var(--brand-coral-600)]">{favorites.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Ürün</p>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Aktif İşlemlerim - YENI TASARIM */}
          <Card className="shadow-xl border-0 overflow-hidden">
            <CardHeader className="bg-gradient-to-br from-[var(--brand-orange-50)] via-white to-[var(--brand-teal-50)] border-b py-4">
              <CardTitle className="flex items-center gap-2.5 text-[var(--brand-navy-700)] text-lg">
                <Zap className="w-5 h-5 text-[var(--brand-orange-600)]" />
                Aktif İşlemlerim
              </CardTitle>
              <p className="text-xs text-gray-600 mt-1.5">
                {totalActiveItems > 0 
                  ? `${totalActiveItems} adet devam eden işleminiz var`
                  : 'Henüz aktif işleminiz bulunmuyor'
                }
              </p>
            </CardHeader>
            <CardContent className="p-6">
              
              {/* 1. AKTİF SİPARİŞLER */}
              {activeOrders.length > 0 && (
                <div className="mb-10 last:mb-0">
                  <div className="flex items-center gap-2 mb-4">
                    <Package className="w-5 h-5 text-[var(--brand-navy-600)]" />
                    <h4 className="font-semibold text-[var(--brand-navy-700)]">
                      Aktif Siparişler ({activeOrders.length})
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {activeOrders.map((order) => {
                      const statusConfig = getStatusConfig(order.status);

                      return (
                        <Link 
                          key={order.order_number}
                          to={`/hesabim/siparislerim/detay/${order.id}`}
                          className="block"
                        >
                          <Card className="border border-[var(--brand-navy-200)] hover:border-[var(--brand-orange-500)] hover:shadow-lg transition-all overflow-hidden rounded-xl shadow-sm cursor-pointer group">
                            <CardContent className="p-3.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                  <div className="w-10 h-10 bg-gradient-to-br from-[var(--brand-navy-100)] to-[var(--brand-navy-200)] rounded-lg flex items-center justify-center group-hover:from-[var(--brand-orange-100)] group-hover:to-[var(--brand-orange-200)] transition-all">
                                    <Package className="w-5 h-5 text-[var(--brand-navy-700)] group-hover:text-[var(--brand-orange-700)] transition-colors" />
                                  </div>
                                  <div className="text-left flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="font-semibold text-gray-900 text-sm">{order.order_number}</span>
                                      <Badge className={`${statusConfig.bg} ${statusConfig.color} border-0 text-xs px-2 py-0.5`}>
                                        {statusConfig.label}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-gray-600">
                                      {new Date(order.created_at).toLocaleDateString('tr-TR')}
                                    </p>
                                  </div>
                                  <div className="text-right flex items-center gap-2">
                                    <p className="font-bold text-[var(--brand-navy-700)]">
                                      {order.total?.toLocaleString('tr-TR')} ₺
                                    </p>
                                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[var(--brand-orange-600)] transition-colors" />
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. AKTİF SATIŞ TALEPLERİ */}
              {activeSellRequests.length > 0 && (
                <div className="mb-10 last:mb-0">
                  <div className="flex items-center gap-2 mb-4">
                    <Package className="w-5 h-5 text-[var(--brand-bronze-600)]" />
                    <h4 className="font-semibold text-[var(--brand-bronze-700)]">
                      Bekleyen Satış Talepleri ({activeSellRequests.length})
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {activeSellRequests.map((request) => {
                      const statusConfig = getStatusConfig(request.status);
                      const requestNumber = request.request_number || request.requestNumber || `req-${request.id}`;

                      return (
                        <Link 
                          key={requestNumber}
                          to={`/hesabim/satis-taleplerim/detay/${request.id}`}
                          className="block"
                        >
                          <Card className="border border-[var(--brand-bronze-200)] hover:border-[var(--brand-orange-500)] hover:shadow-lg transition-all overflow-hidden rounded-xl shadow-sm cursor-pointer group">
                            <CardContent className="p-3.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                  <div className="w-10 h-10 bg-gradient-to-br from-[var(--brand-bronze-100)] to-[var(--brand-bronze-200)] rounded-lg flex items-center justify-center group-hover:from-[var(--brand-orange-100)] group-hover:to-[var(--brand-orange-200)] transition-all">
                                    <Banknote className="w-5 h-5 text-[var(--brand-bronze-700)] group-hover:text-[var(--brand-orange-700)] transition-colors" />
                                  </div>
                                  <div className="text-left flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="font-semibold text-gray-900 text-sm">{requestNumber}</span>
                                      <Badge className={`${statusConfig.bg} ${statusConfig.color} border-0 text-xs px-2 py-0.5`}>
                                        {statusConfig.label}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-gray-600">{request.product_name || request.title || 'Ürün'}</p>
                                  </div>
                                  <div className="text-right flex items-center gap-2">
                                    {(request.admin_offer_price || request.counterOffer) && (
                                      <div className="text-right">
                                        <p className="font-bold text-[var(--brand-bronze-700)]">
                                          {(request.admin_offer_price || request.counterOffer).toLocaleString('tr-TR')} ₺
                                        </p>
                                      </div>
                                    )}
                                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[var(--brand-orange-600)] transition-colors" />
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. AKTİF TEKNİK SERVİS RANDEVULARI */}
              {activeServiceAppointments.length > 0 && (
                <div className="mb-10 last:mb-0">
                  <div className="flex items-center gap-2 mb-4">
                    <Wrench className="w-5 h-5 text-[var(--brand-orange-600)]" />
                    <h4 className="font-semibold text-[var(--brand-orange-700)]">
                      Yaklaşan Teknik Servis Randevuları ({activeServiceAppointments.length})
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {activeServiceAppointments.map((appointment) => {
                      const statusConfig = getStatusConfig(appointment.status);
                      const appointmentNumber = appointment.appointment_number || appointment.appointmentNumber || `service-${appointment.id}`;

                      return (
                        <Link 
                          key={appointmentNumber}
                          to={`/hesabim/teknik-servis/detay/${appointment.id}`}
                          className="block"
                        >
                          <Card className="border border-[var(--brand-orange-200)] hover:border-[var(--brand-orange-500)] hover:shadow-lg transition-all overflow-hidden rounded-xl shadow-sm cursor-pointer group">
                            <CardContent className="p-3.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                  <div className="w-10 h-10 bg-gradient-to-br from-[var(--brand-orange-100)] to-[var(--brand-orange-200)] rounded-lg flex items-center justify-center group-hover:from-[var(--brand-orange-200)] group-hover:to-[var(--brand-orange-300)] transition-all">
                                    <Wrench className="w-5 h-5 text-[var(--brand-orange-700)] transition-colors" />
                                  </div>
                                  <div className="text-left flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="font-semibold text-gray-900 text-sm">{appointmentNumber}</span>
                                      <Badge className={`${statusConfig.bg} ${statusConfig.color} border-0 text-xs px-2 py-0.5`}>
                                        {statusConfig.label}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-gray-600">{appointment.device}</p>
                                  </div>
                                  <div className="text-right flex items-center gap-2">
                                    <div className="text-right">
                                      <p className="text-xs text-gray-500">{appointment.date || appointment.appointment_date}</p>
                                      <p className="text-xs text-gray-600 font-medium">{appointment.time || appointment.appointment_time}</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[var(--brand-orange-600)] transition-colors" />
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. AKTİF NAKLİYE RANDEVULARI */}
              {activeMovingAppointments.length > 0 && (
                <div className="mb-10 last:mb-0">
                  <div className="flex items-center gap-2 mb-4">
                    <Truck className="w-5 h-5 text-[var(--brand-teal-600)]" />
                    <h4 className="font-semibold text-[var(--brand-teal-700)]">
                      Yaklaşan Nakliye Randevuları ({activeMovingAppointments.length})
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {activeMovingAppointments.map((appointment) => {
                      const statusConfig = getStatusConfig(appointment.status);
                      const appointmentNumber = appointment.appointment_number || appointment.appointmentNumber || `moving-${appointment.id}`;

                      return (
                        <Link 
                          key={appointmentNumber}
                          to={`/hesabim/nakliye/detay/${appointment.id}`}
                          className="block"
                        >
                          <Card className="border border-[var(--brand-teal-200)] hover:border-[var(--brand-orange-500)] hover:shadow-lg transition-all overflow-hidden rounded-xl shadow-sm cursor-pointer group">
                            <CardContent className="p-3.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                  <div className="w-10 h-10 bg-gradient-to-br from-[var(--brand-teal-100)] to-[var(--brand-teal-200)] rounded-lg flex items-center justify-center group-hover:from-[var(--brand-orange-100)] group-hover:to-[var(--brand-orange-200)] transition-all">
                                    <Truck className="w-5 h-5 text-[var(--brand-teal-700)] group-hover:text-[var(--brand-orange-700)] transition-colors" />
                                  </div>
                                  <div className="text-left flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="font-semibold text-gray-900 text-sm">{appointmentNumber}</span>
                                      <Badge className={`${statusConfig.bg} ${statusConfig.color} border-0 text-xs px-2 py-0.5`}>
                                        {statusConfig.label}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-gray-600">{appointment.date || appointment.appointment_date}</p>
                                  </div>
                                  <div className="text-right flex items-center gap-2">
                                    {(appointment.total_price || appointment.totalPrice) && (
                                      <p className="font-bold text-[var(--brand-teal-700)]">
                                        {(appointment.total_price || appointment.totalPrice)?.toLocaleString('tr-TR')} ₺
                                      </p>
                                    )}
                                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[var(--brand-orange-600)] transition-colors" />
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* BOŞ DURUM - Aktif işlem yoksa */}
              {totalActiveItems === 0 && (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Aktif İşlem Bulunmuyor</h3>
                  <p className="text-gray-500 mb-6">
                    Henüz devam eden siparişiniz veya randevunuz yok
                  </p>
                  <div className="flex gap-3 justify-center flex-wrap">
                    <Link to="/urunler">
                      <Button className="bg-[var(--brand-navy-600)] hover:bg-[var(--brand-navy-700)]">
                        <Package className="w-4 h-4 mr-2" />
                        Alışverişe Başla
                      </Button>
                    </Link>
                    <Link to="/urun-sat">
                      <Button variant="outline" className="border-[var(--brand-bronze-500)] text-[var(--brand-bronze-600)] hover:bg-[var(--brand-bronze-50)]">
                        <Tag className="w-4 h-4 mr-2" />
                        Ürün Sat
                      </Button>
                    </Link>
                    <Link to="/teknik-servis">
                      <Button variant="outline" className="border-[var(--brand-orange-500)] text-[var(--brand-orange-600)] hover:bg-[var(--brand-orange-50)]">
                        <Wrench className="w-4 h-4 mr-2" />
                        Teknik Servis
                      </Button>
                    </Link>
                    <Link to="/nakliye">
                      <Button variant="outline" className="border-[var(--brand-teal-500)] text-[var(--brand-teal-600)] hover:bg-[var(--brand-teal-50)]">
                        <Truck className="w-4 h-4 mr-2" />
                        Nakliye
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}