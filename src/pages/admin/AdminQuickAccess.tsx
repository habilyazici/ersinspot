import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Eye, 
  Handshake, 
  Truck, 
  Wrench, 
  BarChart3, 
  Calendar as CalendarIcon,
  Package,
  ShoppingCart,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Mail,
  ChevronLeft,
  ChevronRight,
  ShoppingBag
} from 'lucide-react@0.487.0';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner@2.0.3';

interface BusySlot {
  startTime: string;
  endTime: string;
  type: 'order' | 'moving' | 'technical_service' | 'sell_request';
  id: string;
  customer: string;
  details: string;
}

interface AvailabilityData {
  busySlots: Record<string, BusySlot[]>;
  workingHours: {
    start: string;
    end: string;
  };
  weekendClosed: boolean;
}

export default function AdminQuickAccess() {
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availabilityData, setAvailabilityData] = useState<AvailabilityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [todayStats, setTodayStats] = useState({
    todayOrders: 0,
    pendingMoving: 0,
    todaySellRequests: 0,
    todayTechService: 0
  });
  
  // Seçili günün string formatı (YYYY-MM-DD)
  const getSelectedDateStr = () => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const quickLinks = [
    {
      icon: Plus,
      label: 'Yeni Ürün Ekle',
      path: '/admin/urunler',
      color: 'from-[#f97316] to-[#ea580c]',
      description: 'Sisteme yeni ürün ekleyin'
    },
    {
      icon: Eye,
      label: 'Siparişleri Görüntüle',
      path: '/admin/siparisler',
      color: 'from-[#1e3a8a] to-[#1e40af]',
      description: 'Tüm siparişleri görüntüleyin'
    },
    {
      icon: Handshake,
      label: 'Alım Talepleri',
      path: '/admin/satis-talepleri',
      color: 'from-teal-600 to-teal-700',
      description: 'Müşteri alım taleplerini yönetin'
    },
    {
      icon: Truck,
      label: 'Nakliye Yönetimi',
      path: '/admin/nakliye',
      color: 'from-blue-600 to-blue-700',
      description: 'Nakliye randevularını yönetin'
    },
    {
      icon: Wrench,
      label: 'Teknik Servis',
      path: '/admin/teknik-servis',
      color: 'from-purple-600 to-purple-700',
      description: 'Servis taleplerini görüntüleyin'
    },
    {
      icon: BarChart3,
      label: 'Dashboard',
      path: '/admin/dashboard',
      color: 'from-green-600 to-green-700',
      description: 'İstatistikleri görüntüleyin'
    },
  ];

  // API'den meşguliyet verilerini çek
  const fetchAvailability = async (date: Date) => {
    setLoading(true);
    try {
      const year = date.getFullYear();
      const month = date.getMonth();
      
      // Ayın ilk ve son günü
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      const formatDate = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/admin/availability?startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Meşguliyet verileri yüklenemedi');
      }

      const data = await response.json();
      setAvailabilityData(data);
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast.error('Meşguliyet takvimi yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Bugünkü istatistikleri çek
  const fetchTodayStats = async () => {
    setLoadingStats(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/admin/today-stats`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('İstatistikler yüklenemedi');
      }

      const data = await response.json();
      console.log('[TODAY-STATS] Fetched:', data);
      setTodayStats({
        todayOrders: data.todayOrders || 0,
        pendingMoving: data.pendingMoving || 0,
        todaySellRequests: data.todaySellRequests || 0,
        todayTechService: data.todayTechService || 0,
      });
    } catch (error) {
      console.error('Error fetching today stats:', error);
      toast.error('Bugünkü istatistikler yüklenirken hata oluştu');
    } finally {
      setLoadingStats(false);
    }
  };

  // Component mount olduğunda bugünkü istatistikleri çek
  useEffect(() => {
    if (accessToken) {
      fetchTodayStats();
    }
  }, [accessToken]);

  // Component mount olduğunda ve ay değiştiğinde verileri çek
  useEffect(() => {
    if (accessToken) {
      fetchAvailability(selectedDate);
    }
  }, [selectedDate.getMonth(), selectedDate.getFullYear(), accessToken]);

  // Basit takvim oluşturma
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(selectedDate);
  const today = new Date();
  const isCurrentMonth = 
    selectedDate.getMonth() === today.getMonth() && 
    selectedDate.getFullYear() === today.getFullYear();

  const monthNames = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  const changeMonth = (delta: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setSelectedDate(newDate);
  };

  // Belirli bir günün meşgul olup olmadığını kontrol et
  const isDayBusy = (day: number): boolean => {
    if (!availabilityData) return false;
    
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateKey = `${year}-${month}-${dayStr}`;
    
    return !!availabilityData.busySlots[dateKey] && availabilityData.busySlots[dateKey].length > 0;
  };

  // Gün hafta sonu mu?
  const isWeekend = (day: number): boolean => {
    const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Pazar veya Cumartesi
  };

  // Seçili günün meşguliyetlerini al
  const getSelectedDaySlots = (): BusySlot[] => {
    if (!availabilityData) return [];
    const dateStr = getSelectedDateStr();
    return availabilityData.busySlots[dateStr] || [];
  };

  // İş tipine göre icon ve renk
  const getEventTypeInfo = (type: BusySlot['type']) => {
    switch (type) {
      case 'order':
        return { 
          icon: ShoppingCart, 
          color: 'text-green-600 bg-green-50', 
          label: 'Sipariş Teslimatı',
          borderColor: 'border-l-green-500'
        };
      case 'moving':
        return { 
          icon: Truck, 
          color: 'text-blue-600 bg-blue-50', 
          label: 'Nakliye Randevusu',
          borderColor: 'border-l-blue-500'
        };
      case 'technical_service':
        return { 
          icon: Wrench, 
          color: 'text-purple-600 bg-purple-50', 
          label: 'Teknik Servis',
          borderColor: 'border-l-purple-500'
        };
      case 'sell_request':
        return { 
          icon: ShoppingBag, 
          color: 'text-teal-600 bg-teal-50', 
          label: 'Ürün Alımı',
          borderColor: 'border-l-teal-500'
        };
      default:
        return { 
          icon: CalendarIcon, 
          color: 'text-gray-600 bg-gray-50', 
          label: 'Etkinlik',
          borderColor: 'border-l-gray-500'
        };
    }
  };

  // Detay sayfasına yönlendir
  const navigateToDetail = (slot: BusySlot) => {
    switch (slot.type) {
      case 'order':
        navigate(`/admin/siparisler`);
        break;
      case 'moving':
        navigate(`/admin/nakliye`);
        break;
      case 'technical_service':
        navigate(`/admin/teknik-servis`);
        break;
      case 'sell_request':
        navigate(`/admin/satis-talepleri`);
        break;
    }
  };

  // Tarih formatla
  const formatSelectedDate = () => {
    return selectedDate.toLocaleDateString('tr-TR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-gray-900">Hızlı Erişim</h1>
            <p className="text-gray-600 mt-1">Günlük işlemleriniz ve kısayollarınız</p>
          </div>
        </div>

        {/* Günlük İstatistikler - Gizli */}
        <div className="hidden">
          {/* Kartlar gizli ama fonksiyonlar çalışıyor */}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Takvim */}
          <Card className="lg:col-span-2">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle>Firma Meşguliyet Takvimi</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => changeMonth(-1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-semibold min-w-[120px] text-center">
                    {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => changeMonth(1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f97316]" />
                </div>
              ) : (
                <>
                  {/* Takvim Grid */}
                  <div className="grid grid-cols-7 gap-2">
                    {/* Gün İsimleri */}
                    {['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'].map((day) => (
                      <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                        {day}
                      </div>
                    ))}
                    
                    {/* Boş Günler */}
                    {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                      <div key={`empty-${i}`} className="aspect-square" />
                    ))}
                    
                    {/* Günler */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const isToday = isCurrentMonth && day === today.getDate();
                      const hasBusySlots = isDayBusy(day);
                      const isWeekendDay = isWeekend(day);
                      
                      const year = selectedDate.getFullYear();
                      const month = selectedDate.getMonth();
                      const clickedDate = new Date(year, month, day);
                      
                      return (
                        <button
                          key={day}
                          onClick={() => setSelectedDate(clickedDate)}
                          className={`aspect-square rounded-lg flex items-center justify-center text-sm transition-all relative ${
                            isToday
                              ? 'bg-[#f97316] text-white font-bold shadow-md'
                              : isWeekendDay
                              ? 'bg-red-50 text-red-400 cursor-not-allowed'
                              : hasBusySlots
                              ? 'bg-orange-50 text-[#1e3a8a] font-semibold hover:bg-orange-100'
                              : 'hover:bg-gray-100 text-gray-700'
                          }`}
                          disabled={isWeekendDay}
                        >
                          {day}
                          {hasBusySlots && !isToday && (
                            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#f97316] rounded-full" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="mt-6 flex flex-wrap items-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-[#f97316] rounded" />
                      <span className="text-gray-600">Bugün</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-orange-50 border border-orange-200 rounded relative">
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#f97316] rounded-full" />
                      </div>
                      <span className="text-gray-600">Meşgul Gün</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-50 border border-red-200 rounded" />
                      <span className="text-gray-600">Hafta Sonu (Kapalı)</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Detaylı Program - Seçili Günün İşlemleri */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-base">Detaylı Program</CardTitle>
              <p className="text-xs text-gray-500 mt-1">{formatSelectedDate()}</p>
            </CardHeader>
            <CardContent className="p-4">
              {isWeekend(selectedDate.getDate()) ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                  </div>
                  <p className="font-semibold text-gray-900">Firma Tatilde</p>
                  <p className="text-sm text-gray-600 mt-1">Hafta sonları kapalıyız</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {getSelectedDaySlots().length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                      </div>
                      <p className="font-semibold text-gray-900">Gün Boş</p>
                      <p className="text-sm text-gray-600 mt-1">Bu gün için planlanmış iş yok</p>
                    </div>
                  ) : (
                    getSelectedDaySlots().map((slot, index) => {
                      const { icon: Icon, color, label, borderColor } = getEventTypeInfo(slot.type);
                      return (
                        <div
                          key={index}
                          className={`p-3 bg-white border-l-4 ${borderColor} rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
                          onClick={() => navigateToDetail(slot)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Clock className="w-3 h-3 text-gray-500" />
                                <p className="text-xs font-semibold text-gray-900">
                                  {slot.startTime} - {slot.endTime}
                                </p>
                              </div>
                              <p className="text-xs text-[#f97316] font-medium mb-1">{label}</p>
                              <p className="text-xs text-gray-600 mb-0.5">👤 {slot.customer}</p>
                              <p className="text-xs text-gray-500 line-clamp-1">{slot.details}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Hızlı Kısayollar */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Hızlı Kısayollar</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="group"
                  >
                    <div className="relative overflow-hidden rounded-xl bg-white border border-gray-200 hover:border-transparent hover:shadow-xl transition-all duration-300">
                      <div className={`absolute inset-0 bg-gradient-to-br ${link.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                      <div className="relative p-6">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 bg-gradient-to-br ${link.color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 group-hover:text-white transition-colors">
                              {link.label}
                            </h3>
                            <p className="text-sm text-gray-600 group-hover:text-white/90 transition-colors mt-1">
                              {link.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
