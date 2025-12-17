import { useState, useEffect } from 'react';
import { 
  Search, 
  Eye, 
  Calendar,
  Phone, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  User,
  Package,
  Banknote,
  Send,
  Edit3,
  ChevronLeft,
  ChevronRight,
  X as CloseIcon,
  Trash2,
  Ban,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit,
  FileText
} from 'lucide-react@0.487.0';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';
import {
  AdminDialog,
  AdminDialogContent,
  AdminDialogHeader,
  AdminDialogTitle,
  AdminDialogDescription,
} from '../../components/ui/admin-dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { Skeleton } from '../../components/ui/skeleton';
import { getConditionLabel } from '../../utils/conditionHelper';

interface SellRequest {
  id: string;
  request_number: string;
  customer_id: string;
  title: string;
  brand: string;
  model: string;
  year?: number;
  condition: string;
  description: string;
  asking_price: number;
  admin_offer_price?: number;
  admin_notes?: string;
  status: 'reviewing' | 'offer_sent' | 'accepted' | 'rejected' | 'completed';
  pickup_date?: string;
  pickup_time?: string;
  created_at: string;
  updated_at?: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    district?: string;
    city?: string;
  };
  images: Array<{
    id: string;
    image_url: string;
    order_num: number;
  }>;
}

export default function AdminSellRequests() {
  const { accessToken } = useAuth();
  const [requests, setRequests] = useState<SellRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<SellRequest | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerNote, setOfferNote] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isEditDateModalOpen, setIsEditDateModalOpen] = useState(false);
  const [requestToCancel, setRequestToCancel] = useState<SellRequest | null>(null);
  const [requestToDelete, setRequestToDelete] = useState<SellRequest | null>(null);
  const [editPickupDate, setEditPickupDate] = useState('');
  const [editPickupTime, setEditPickupTime] = useState('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Debug: Admin durumunu kontrol et
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!accessToken) return;
      
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/auth/check-admin`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );
        
        const data = await response.json();
        console.log('[ADMIN-CHECK] Admin status:', data);
        
        if (!data.isAdmin) {
          console.warn('[ADMIN-CHECK] ⚠️ User is NOT admin:', data);
          console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.warn('🔧 ADMIN YETKİSİ VERMEK İÇIN:');
          console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.warn('1. Supabase Dashboard\'a gidin');
          console.warn('2. SQL Editor\'ü açın');
          console.warn('3. Aşağıdaki sorguyu çalıştırın:');
          console.warn('');
          console.warn(`UPDATE customers SET is_admin = true WHERE email = '${data.customer?.email || data.email}';`);
          console.warn('');
          console.warn('4. Sayfayı yenileyin');
          console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          
          toast.error('Admin Yetkisi Gerekli', {
            description: 'Console\'da SQL sorgusunu görebilirsiniz (F12 > Console)',
            duration: 10000
          });
        } else {
          console.log('[ADMIN-CHECK] ✅ User is admin');
        }
      } catch (error) {
        console.error('[ADMIN-CHECK] Error:', error);
      }
    };
    
    checkAdminStatus();
  }, [accessToken]);

  // Talepleri yükle
  useEffect(() => {
    if (accessToken) {
      loadRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const loadRequests = async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/admin/sell-requests`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('[ADMIN] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[ADMIN] Sell requests loaded:', data);
        console.log('[ADMIN] Number of requests:', data.requests?.length || 0);
        if (data.requests && data.requests.length > 0) {
          console.log('[ADMIN] First request:', data.requests[0]);
          console.log('[ADMIN] First request images:', data.requests[0].images);
        }
        setRequests(data.requests || []);
      } else {
        const errorData = await response.json();
        console.error('Failed to load requests:', response.status, errorData);
        
        // 403 hatası için özel mesaj
        if (response.status === 403) {
          toast.error('Yetki Hatası', {
            description: errorData.details || 'Admin yetkisi gereklidir',
            duration: 5000
          });
        } else if (response.status === 404) {
          toast.error('Müşteri Kaydı Bulunamadı', {
            description: errorData.details || 'Lütfen sistem yöneticisiyle iletişime geçin',
            duration: 5000
          });
        } else {
          toast.error(`Talepler yüklenemedi: ${errorData.error || 'Bilinmeyen hata'}`);
        }
      }
    } catch (error) {
      console.error('Error loading requests:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Fiyat teklifi gönder
  const handleSendOffer = async () => {
    if (!selectedRequest || !offerPrice) {
      toast.error('Lütfen teklif fiyatını girin');
      return;
    }

    // ID validation - NaN hatası önleme
    const numericId = parseInt(selectedRequest.id);
    if (isNaN(numericId)) {
      console.error('[SELL-REQUESTS] Invalid request ID:', selectedRequest.id);
      toast.error('Geçersiz talep ID\'si');
      return;
    }

    try {
      setSubmitting(true);
      
      console.log('[SELL-REQUESTS] Sending offer:', {
        requestId: numericId,
        offerPrice,
        endpoint: `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/admin/sell-requests/${numericId}/offer`
      });
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/admin/sell-requests/${numericId}/offer`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            offerPrice: parseInt(offerPrice),
            offerNote: offerNote || null,
          }),
        }
      );

      console.log('[SELL-REQUESTS] Response status:', response.status);

      if (response.ok) {
        toast.success('💰 Fiyat teklifi gönderildi!');
        setIsOfferModalOpen(false);
        setOfferPrice('');
        setOfferNote('');
        loadRequests();
      } else {
        const errorData = await response.json();
        console.error('[SELL-REQUESTS] Error response:', errorData);
        toast.error(errorData.error || 'Teklif gönderilemedi');
      }
    } catch (error) {
      console.error('[SELL-REQUESTS] Error sending offer:', error);
      toast.error(`Bir hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Statü değiştir
  const handleUpdateStatus = async (requestId?: string, status?: string) => {
    const targetRequestId = requestId || selectedRequest?.id;
    const targetStatus = status || newStatus;
    
    if (!targetRequestId || !targetStatus) {
      toast.error('Lütfen yeni statüyü seçin');
      return;
    }

    // ID validation - NaN hatası önleme
    const numericId = parseInt(targetRequestId);
    if (isNaN(numericId)) {
      console.error('[SELL-REQUESTS] Invalid request ID:', targetRequestId);
      toast.error('Geçersiz talep ID\'si');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/admin/sell-requests/${numericId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: targetStatus,
            note: statusNote || null,
          }),
        }
      );

      if (response.ok) {
        toast.success('✅ Statü güncellendi!');
        setIsStatusModalOpen(false);
        setNewStatus('');
        setStatusNote('');
        loadRequests();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Statü güncellenemedi');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  // Talebi iptal et
  const handleCancelRequest = async () => {
    if (!requestToCancel) return;

    // ID validation - NaN hatası önleme
    const numericId = parseInt(requestToCancel.id);
    if (isNaN(numericId)) {
      console.error('[SELL-REQUESTS] Invalid request ID:', requestToCancel.id);
      toast.error('Geçersiz talep ID\'si');
      return;
    }

    const toastId = toast.loading('Talep iptal ediliyor...');
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/admin/sell-requests/${numericId}/cancel`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      toast.dismiss(toastId);

      if (response.ok) {
        toast.success('✅ Talep iptal edildi!');
        setIsCancelModalOpen(false);
        setRequestToCancel(null);
        loadRequests();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Talep iptal edilemedi');
      }
    } catch (error) {
      toast.dismiss(toastId);
      console.error('Error cancelling request:', error);
      toast.error('Bir hata oluştu');
    }
  };

  // Alım tarih/saat güncelleme
  const handleUpdatePickupDate = async () => {
    if (!selectedRequest || !editPickupDate || !editPickupTime) {
      toast.error('Lütfen tarih ve saat seçin');
      return;
    }

    const numericId = parseInt(selectedRequest.id);
    if (isNaN(numericId)) {
      console.error('[SELL-REQUESTS] Invalid request ID:', selectedRequest.id);
      toast.error('Geçersiz talep ID\'si');
      return;
    }

    const toastId = toast.loading('Alım tarihi güncelleniyor...');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/admin/sell-requests/${numericId}/pickup-date`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pickup_date: editPickupDate,
            pickup_time: editPickupTime,
          }),
        }
      );

      toast.dismiss(toastId);

      if (response.ok) {
        toast.success('Alım tarihi başarıyla güncellendi! ✅');
        setIsEditDateModalOpen(false);
        setEditPickupDate('');
        setEditPickupTime('');
        loadRequests();
      } else {
        toast.error('Alım tarihi güncellenemedi!');
      }
    } catch (error) {
      toast.dismiss(toastId);
      console.error('Error updating pickup date:', error);
      toast.error('Alım tarihi güncellenirken bir hata oluştu');
    }
  };

  // Tek talebi sil
  const handleDeleteRequest = async () => {
    if (!requestToDelete) return;

    const numericId = parseInt(requestToDelete.id);
    if (isNaN(numericId)) {
      console.error('[SELL-REQUESTS] Invalid request ID:', requestToDelete.id);
      toast.error('Geçersiz talep ID\'si');
      return;
    }

    const toastId = toast.loading('Talep siliniyor...');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/admin/sell-requests/${numericId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      toast.dismiss(toastId);

      if (response.ok) {
        setRequests(requests.filter(r => r.id !== requestToDelete.id));
        toast.success('Talep başarıyla silindi! 🗑️');
        setIsDeleteModalOpen(false);
        setRequestToDelete(null);
      } else {
        toast.error('Talep silinemedi!');
      }
    } catch (error) {
      toast.dismiss(toastId);
      console.error('Error deleting request:', error);
      toast.error('Talep silinirken bir hata oluştu');
    }
  };

  // Tüm talepleri sil
  const handleDeleteAllRequests = async () => {
    const toastId = toast.loading('Tüm talepler siliniyor...');
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/admin/sell-requests/delete-all`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      toast.dismiss(toastId);

      if (response.ok) {
        const data = await response.json();
        toast.success(`✅ ${data.message}`, { duration: 5000, position: 'top-center' });
        setIsDeleteAllModalOpen(false);
        setRequests([]);
        loadRequests();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Talepler silinemedi', { duration: 5000, position: 'top-center' });
      }
    } catch (error) {
      toast.dismiss(toastId);
      console.error('Error deleting all requests:', error);
      toast.error('Talepler silinirken hata oluştu', { duration: 5000, position: 'top-center' });
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; bg: string; icon: any; borderColor: string }> = {
      reviewing: { 
        label: 'İnceleniyor', 
        color: 'text-blue-700', 
        bg: 'bg-blue-50', 
        icon: AlertCircle,
        borderColor: 'border-blue-300'
      },
      offer_sent: { 
        label: 'Teklif Gönderildi', 
        color: 'text-orange-700', 
        bg: 'bg-orange-50', 
        icon: Banknote,
        borderColor: 'border-orange-300'
      },
      accepted: { 
        label: 'Kabul Edildi', 
        color: 'text-green-700', 
        bg: 'bg-green-50', 
        icon: CheckCircle,
        borderColor: 'border-green-400'
      },
      rejected: { 
        label: 'Reddedildi', 
        color: 'text-red-700', 
        bg: 'bg-red-50', 
        icon: XCircle,
        borderColor: 'border-red-400'
      },
      cancelled: { 
        label: 'İptal Edildi', 
        color: 'text-red-700', 
        bg: 'bg-red-50', 
        icon: Ban,
        borderColor: 'border-red-400'
      },
      completed: { 
        label: 'Tamamlandı', 
        color: 'text-green-700', 
        bg: 'bg-green-50', 
        icon: CheckCircle,
        borderColor: 'border-green-400'
      },
    };
    return configs[status] || { 
      label: status, 
      color: 'text-gray-700', 
      bg: 'bg-gray-100', 
      icon: Package,
      borderColor: 'border-gray-300'
    };
  };

  // Frontend filtreleme
  const filteredRequests = requests.filter(req => {
    const matchesSearch = searchQuery === '' || 
      req.request_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: requests.length,
    reviewing: requests.filter(r => r.status === 'reviewing').length,
    offer_sent: requests.filter(r => r.status === 'offer_sent').length,
    accepted: requests.filter(r => r.status === 'accepted').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    completed: requests.filter(r => r.status === 'completed').length,
  };

  // Sorting fonksiyonu
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sıralanmış talepler
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (!sortField) return 0;

    let aValue: any = a[sortField as keyof SellRequest];
    let bValue: any = b[sortField as keyof SellRequest];

    // Özel durumlar
    if (sortField === 'customer') {
      aValue = a.customer?.name || '';
      bValue = b.customer?.name || '';
    } else if (sortField === 'created_at') {
      aValue = new Date(a.created_at).getTime();
      bValue = new Date(b.created_at).getTime();
    }

    if (aValue == null) return 1;
    if (bValue == null) return -1;

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-gray-900 flex items-center gap-3">
              <Package className="w-8 h-8 text-[var(--brand-orange-600)]" />
              Ürün Alım Talepleri
            </h1>
            <p className="text-gray-600 mt-1">
              Müşteri satış taleplerini görüntüleyin ve yönetin
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={() => setIsDeleteAllModalOpen(true)}
            className="bg-red-600 hover:bg-red-700"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Tümünü Sil
          </Button>
        </div>

        {/* Stats Cards - Tıklanabilir Filtreleme */}
        <div className="flex flex-wrap gap-3">
          <Card 
            className="bg-gradient-to-br from-[#1e3a8a] to-[#1e3a8a]/80 text-white border-[#1e3a8a] cursor-pointer hover:shadow-xl transition-all" 
            onClick={() => setStatusFilter('all')}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Package className="w-7 h-7 opacity-80 flex-shrink-0" />
                <div>
                  <p className="text-xs text-white/80 uppercase tracking-wide whitespace-nowrap">Toplam</p>
                  <p className="text-xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-gradient-to-br from-blue-50 to-white border-blue-200 cursor-pointer hover:shadow-lg transition-all" 
            onClick={() => setStatusFilter('reviewing')}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Clock className="w-7 h-7 text-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide whitespace-nowrap">İnceleniyor</p>
                  <p className="text-xl font-bold text-blue-600">{stats.reviewing}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-gradient-to-br from-purple-50 to-white border-purple-200 cursor-pointer hover:shadow-lg transition-all" 
            onClick={() => setStatusFilter('offer_sent')}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Banknote className="w-7 h-7 text-[#f97316] flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide whitespace-nowrap">Teklif Gönderildi</p>
                  <p className="text-xl font-bold text-[#f97316]">{stats.offer_sent}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-gradient-to-br from-green-50 to-white border-green-200 cursor-pointer hover:shadow-lg transition-all" 
            onClick={() => setStatusFilter('accepted')}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-7 h-7 text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide whitespace-nowrap">Kabul Edildi</p>
                  <p className="text-xl font-bold text-green-600">{stats.accepted}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-gradient-to-br from-red-50 to-white border-red-200 cursor-pointer hover:shadow-lg transition-all" 
            onClick={() => setStatusFilter('rejected')}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <XCircle className="w-7 h-7 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide whitespace-nowrap">Reddedildi</p>
                  <p className="text-xl font-bold text-red-600">{stats.rejected}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-gradient-to-br from-[#f97316] to-[#f97316]/80 text-white border-[#f97316] cursor-pointer hover:shadow-xl transition-all" 
            onClick={() => setStatusFilter('completed')}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-7 h-7 opacity-80 flex-shrink-0" />
                <div>
                  <p className="text-xs text-white/80 uppercase tracking-wide whitespace-nowrap">Tamamlandı</p>
                  <p className="text-xl font-bold">{stats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Talep no, müşteri, ürün ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Durum Filtrele" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Talepler</SelectItem>
              <SelectItem value="reviewing">İnceleniyor</SelectItem>
              <SelectItem value="offer_sent">Teklif Gönderildi</SelectItem>
              <SelectItem value="accepted">Kabul Edildi</SelectItem>
              <SelectItem value="rejected">Reddedildi</SelectItem>
              <SelectItem value="completed">Tamamlandı</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Tüm Talepleri Temizle Butonu */}
          {requests.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setIsDeleteAllModalOpen(true)}
              size="default"
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Geçmişi Temizle
            </Button>
          )}
        </div>

        {/* Requests List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Satış Talepleri ({requests.length})</CardTitle>
              {!loading && requests.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSort('created_at')}
                    className={sortField === 'created_at' ? 'bg-gray-100' : ''}
                  >
                    Tarih
                    {sortField === 'created_at' && (
                      sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSort('title')}
                    className={sortField === 'title' ? 'bg-gray-100' : ''}
                  >
                    Ürün
                    {sortField === 'title' && (
                      sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSort('asking_price')}
                    className={sortField === 'asking_price' ? 'bg-gray-100' : ''}
                  >
                    Fiyat
                    {sortField === 'asking_price' && (
                      sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSort('customer')}
                    className={sortField === 'customer' ? 'bg-gray-100' : ''}
                  >
                    Müşteri
                    {sortField === 'customer' && (
                      sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4 p-4 border rounded-lg">
                    <Skeleton className="w-24 h-24 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Satış talebi bulunamadı</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedRequests.map((request) => {
                  const statusConfig = getStatusConfig(request.status);
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <div
                      key={request.id}
                      className={`bg-white border-2 rounded-xl p-5 hover:shadow-xl transition-all duration-200 cursor-pointer ${
                        request.status === 'accepted' 
                          ? 'border-green-400 ring-4 ring-green-100 shadow-lg shadow-green-100' 
                          : request.status === 'offer_sent'
                          ? 'border-purple-400 ring-4 ring-purple-100 shadow-lg shadow-purple-100'
                          : request.status === 'completed'
                          ? 'border-[#f97316] ring-4 ring-orange-100 shadow-lg shadow-orange-100'
                          : request.status === 'rejected'
                          ? 'border-red-300 bg-red-50/30'
                          : request.status === 'reviewing'
                          ? 'border-blue-300 ring-2 ring-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={(e) => {
                        // Buton tıklamalarını engelle
                        if ((e.target as HTMLElement).closest('button')) {
                          return;
                        }
                        setSelectedRequest(request);
                        setIsDetailOpen(true);
                      }}
                    >
                      <div className="flex gap-4">
                        {/* Image */}
                        <div className="relative flex-shrink-0">
                          {request.images && request.images.length > 0 ? (
                            <>
                              <img
                                src={request.images[0]?.image_url}
                                alt={request.title}
                                className="w-28 h-28 object-cover rounded-xl cursor-pointer hover:scale-105 transition-transform duration-200 ring-2 ring-gray-100"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setSelectedImageIndex(0);
                                  setIsGalleryOpen(true);
                                }}
                              />
                              {request.images.length > 1 && (
                                <div className="absolute top-2 right-2 bg-[#1e3a8a] text-white text-xs px-2 py-1 rounded-md shadow-lg">
                                  +{request.images.length - 1}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="w-28 h-28 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
                              <Package className="w-10 h-10 text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="text-gray-900 mb-1.5">{request.title}</h3>
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-mono text-gray-600 bg-gray-50 px-2 py-0.5 rounded">{request.request_number}</span>
                                <span className="text-xs text-gray-500">
                                  {new Date(request.created_at).toLocaleDateString('tr-TR', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </span>
                              </div>
                            </div>
                            {/* STATUS BADGE - CLICKABLE DROPDOWN */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Badge className={`${statusConfig.bg} ${statusConfig.color} border-0 shadow-md cursor-pointer hover:scale-105 transition-all duration-200 px-2.5 py-1.5 text-sm ${
                                  request.status === 'accepted' ? 'ring-1 ring-green-400' : 
                                  request.status === 'offer_sent' ? 'ring-1 ring-purple-400' : 
                                  ''
                                }`}>
                                  <StatusIcon className="w-4 h-4 mr-1.5" />
                                  <span className="font-semibold">{statusConfig.label}</span>
                                </Badge>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateStatus(request.id, 'reviewing');
                                  }}
                                  className="cursor-pointer"
                                  disabled={request.status === 'reviewing'}
                                >
                                  <Clock className="w-4 h-4 mr-2 text-blue-600" />
                                  <span>İnceleniyor</span>
                                  {request.status === 'reviewing' && (
                                    <CheckCircle className="w-4 h-4 ml-auto text-blue-600" />
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateStatus(request.id, 'offer_sent');
                                  }}
                                  className="cursor-pointer"
                                  disabled={request.status === 'offer_sent'}
                                >
                                  <Send className="w-4 h-4 mr-2 text-purple-600" />
                                  <span>Teklif Gönderildi</span>
                                  {request.status === 'offer_sent' && (
                                    <CheckCircle className="w-4 h-4 ml-auto text-purple-600" />
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateStatus(request.id, 'accepted');
                                  }}
                                  className="cursor-pointer"
                                  disabled={request.status === 'accepted'}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                  <span>Kabul Edildi</span>
                                  {request.status === 'accepted' && (
                                    <CheckCircle className="w-4 h-4 ml-auto text-green-600" />
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateStatus(request.id, 'rejected');
                                  }}
                                  className="cursor-pointer"
                                  disabled={request.status === 'rejected'}
                                >
                                  <XCircle className="w-4 h-4 mr-2 text-red-600" />
                                  <span>Reddedildi</span>
                                  {request.status === 'rejected' && (
                                    <CheckCircle className="w-4 h-4 ml-auto text-red-600" />
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateStatus(request.id, 'completed');
                                  }}
                                  className="cursor-pointer"
                                  disabled={request.status === 'completed'}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2 text-orange-600" />
                                  <span>Tamamlandı</span>
                                  {request.status === 'completed' && (
                                    <CheckCircle className="w-4 h-4 ml-auto text-orange-600" />
                                  )}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
                            <div key={`${request.id}-customer`} className="bg-gradient-to-br from-gray-50 to-white p-3 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow">
                              <div className="flex items-center gap-2 mb-2">
                                <User className="w-4 h-4 text-gray-500" />
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Müşteri</p>
                              </div>
                              <p className="text-gray-900 font-medium">{request.customer.name}</p>
                              {request.customer.phone && (
                                <p className="text-xs text-gray-500 mt-0.5">{request.customer.phone}</p>
                              )}
                            </div>
                            <div key={`${request.id}-product`} className="bg-gradient-to-br from-gray-50 to-white p-3 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow">
                              <div className="flex items-center gap-2 mb-2">
                                <Package className="w-4 h-4 text-gray-500" />
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Ürün</p>
                              </div>
                              <p className="text-gray-900 font-medium">{request.brand} {request.model}</p>
                              {request.year && (
                                <p className="text-xs text-gray-500 mt-0.5">{request.year}</p>
                              )}
                            </div>
                            <div key={`${request.id}-asking`} className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-3 rounded-lg border border-blue-200 shadow-sm">
                              <div className="flex items-center gap-2 mb-2">
                                <Banknote className="w-4 h-4 text-blue-600" />
                                <p className="text-xs text-blue-600 uppercase tracking-wide">Talep</p>
                              </div>
                              <p className="text-base font-bold text-blue-600">
                                ₺{(request.asking_price || 0).toLocaleString('tr-TR')}
                              </p>
                            </div>
                            {request.admin_offer_price && (
                              <div key={`${request.id}-offer`} className="bg-gradient-to-br from-purple-50 to-purple-100/50 p-3 rounded-lg border border-purple-200 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                  <Send className="w-4 h-4 text-purple-600" />
                                  <p className="text-xs text-purple-600 uppercase tracking-wide">Teklif</p>
                                </div>
                                <p className="text-base font-bold text-purple-600">
                                  ₺{(request.admin_offer_price || 0).toLocaleString('tr-TR')}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Description preview */}
                          {request.description && (
                            <div className="mb-3 bg-gray-50/80 p-3 rounded-lg border border-gray-100">
                              <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Açıklama</p>
                              <p className="text-sm text-gray-700 line-clamp-2">{request.description}</p>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 mt-3 pt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="hover:bg-[#1e3a8a] hover:text-white border-[#1e3a8a]/30 transition-all"
                              onClick={() => {
                                setSelectedRequest(request);
                                setIsDetailOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1.5" />
                              Tüm Detaylar
                            </Button>

                            {request.status === 'completed' && (
                              <Button
                                size="sm"
                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-sm"
                                onClick={() => window.open(`/admin/raporlar/sell/${request.id}`, '_blank')}
                              >
                                <FileText className="w-4 h-4 mr-1.5" />
                                Satış Raporu
                              </Button>
                            )}

                            {(request.status === 'reviewing' || request.status === 'offer_sent') && (
                              <Button
                                size="sm"
                                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-sm"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setOfferPrice(request.admin_offer_price?.toString() || '');
                                  setOfferNote(request.admin_notes || '');
                                  setIsOfferModalOpen(true);
                                }}
                              >
                                <Send className="w-4 h-4 mr-1.5" />
                                {request.admin_offer_price ? 'Teklifi Güncelle' : 'Teklif Gönder'}
                              </Button>
                            )}

                            {request.status === 'accepted' && (
                              <Button
                                size="sm"
                                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-sm"
                                onClick={() => handleUpdateStatus(request.id, 'completed')}
                              >
                                <CheckCircle className="w-4 h-4 mr-1.5" />
                                Tamamla
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setRequestToDelete(request);
                                setIsDeleteModalOpen(true);
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-1.5" />
                              Sil
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <AdminDialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <AdminDialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <AdminDialogHeader>
            <AdminDialogTitle className="flex items-center gap-3">
              <Package className="w-7 h-7 text-[#f97316]" />
              <div>
                <div className="flex items-center gap-2">
                  Talep Detayları
                  {selectedRequest && (
                    <Badge className={`${getStatusConfig(selectedRequest.status).bg} ${getStatusConfig(selectedRequest.status).color} border-0`}>
                      {getStatusConfig(selectedRequest.status).label}
                    </Badge>
                  )}
                </div>
                {selectedRequest && (
                  <p className="text-sm font-mono text-gray-500 mt-1">{selectedRequest.request_number}</p>
                )}
              </div>
            </AdminDialogTitle>
            <AdminDialogDescription>
              {selectedRequest ? `${selectedRequest.title} - Alım talebi detayları` : 'Talep bilgileri yükleniyor...'}
            </AdminDialogDescription>
          </AdminDialogHeader>
          
          {selectedRequest && (
            <div className="space-y-5 mt-4">
              {/* Images Gallery - Daha görsel */}
              {selectedRequest.images && selectedRequest.images.length > 0 && (
                <Card className="border-2 border-[#f97316]/20 shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-[#f97316] to-[#f97316]/80 p-4">
                    <h3 className="text-white flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Ürün Görselleri ({selectedRequest.images.length})
                    </h3>
                  </div>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-4 gap-3">
                      {selectedRequest.images.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={img.image_url}
                            alt={`Ürün ${idx + 1}`}
                            className="w-full h-28 object-cover rounded-lg cursor-pointer hover:scale-105 transition-all duration-200 ring-2 ring-[#f97316]/20 hover:ring-[#f97316] shadow-md"
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
                  </CardContent>
                </Card>
              )}

              {/* Product Info - Daha detaylı */}
              <Card className="border-2 border-blue-100 shadow-md">
                <div className="bg-gradient-to-r from-blue-50 to-white p-4 border-b">
                  <h3 className="flex items-center gap-2 text-blue-900">
                    <Package className="w-5 h-5 text-blue-600" />
                    Ürün Bilgileri
                  </h3>
                </div>
                <CardContent className="p-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Ürün Başlığı</p>
                      <p className="text-gray-900 break-words">{selectedRequest.title}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Marka</p>
                      <p className="text-gray-900 break-words">{selectedRequest.brand}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Model</p>
                      <p className="text-gray-900 break-words">{selectedRequest.model}</p>
                    </div>
                    {selectedRequest.year && (
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Yıl</p>
                        <p className="text-gray-900">{selectedRequest.year}</p>
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Durum</p>
                      <p className="text-gray-900">{getConditionLabel(selectedRequest.condition)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Talep Tarihi</p>
                      <p className="text-gray-900">{new Date(selectedRequest.created_at).toLocaleDateString('tr-TR', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</p>
                    </div>
                    <div className="col-span-2 bg-gray-50 p-4 rounded-lg space-y-1">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Açıklama</p>
                      <p className="text-gray-900 text-sm leading-relaxed break-words whitespace-pre-wrap">{selectedRequest.description || 'Açıklama girilmemiş'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Price Section */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-2 border-blue-200 shadow-md">
                  <div className="bg-gradient-to-br from-blue-50 to-white p-5">
                    <p className="text-xs text-blue-600 mb-2 uppercase tracking-wide">Müşterinin Talebi</p>
                    <p className="text-3xl text-blue-900">{(selectedRequest.asking_price || 0).toLocaleString('tr-TR')} ₺</p>
                  </div>
                </Card>
                <Card className="border-2 border-purple-200 shadow-md">
                  <div className="bg-gradient-to-br from-purple-50 to-white p-5">
                    <p className="text-xs text-purple-600 mb-2 uppercase tracking-wide">Teklifiniz</p>
                    <p className="text-3xl text-purple-900">
                      {selectedRequest.admin_offer_price 
                        ? `${(selectedRequest.admin_offer_price || 0).toLocaleString('tr-TR')} ₺`
                        : 'Henüz teklif gönderilmedi'
                      }
                    </p>
                  </div>
                </Card>
              </div>

              {/* Customer Info */}
              <Card className="border-2 border-[#f97316]/30 shadow-md">
                <div className="bg-gradient-to-r from-orange-50 to-white p-4 border-b">
                  <h3 className="flex items-center gap-2 text-[#f97316]">
                    <User className="w-5 h-5" />
                    Müşteri Bilgileri
                  </h3>
                </div>
                <CardContent className="p-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Ad Soyad</p>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-[#f97316]" />
                        <p className="text-gray-900">{selectedRequest.customer.name}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Telefon</p>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-[#f97316]" />
                        <a href={`tel:${selectedRequest.customer.phone}`} className="text-gray-900 hover:text-[#f97316] transition-colors">
                          {selectedRequest.customer.phone}
                        </a>
                      </div>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">E-posta</p>
                      <div className="flex items-center gap-2 min-w-0">
                        <Package className="w-4 h-4 text-[#f97316] flex-shrink-0" />
                        <a href={`mailto:${selectedRequest.customer.email}`} className="text-gray-900 hover:text-[#f97316] transition-colors truncate">
                          {selectedRequest.customer.email}
                        </a>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pickup Appointment Info */}
              {(selectedRequest.pickup_date || selectedRequest.pickup_time) && (
                <Card className="border-2 border-green-200 shadow-md">
                  <div className="bg-gradient-to-r from-green-50 to-white p-4 border-b">
                    <div className="flex items-center justify-between">
                      <h3 className="flex items-center gap-2 text-green-900">
                        <Calendar className="w-5 h-5 text-green-600" />
                        Ürün Alım Randevusu
                      </h3>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-300 text-green-700 hover:bg-green-50"
                        onClick={() => {
                          setEditPickupDate(selectedRequest.pickup_date || '');
                          setEditPickupTime(selectedRequest.pickup_time || '');
                          setIsEditDateModalOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Tarih Değiştir
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-5">
                    <div className="grid grid-cols-2 gap-4">
                      {selectedRequest.pickup_date && (
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Alım Tarihi</p>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-green-600" />
                            <p className="text-gray-900">
                              {new Date(selectedRequest.pickup_date).toLocaleDateString('tr-TR', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                      )}
                      {selectedRequest.pickup_time && (
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Alım Saati</p>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-green-600" />
                            <p className="text-gray-900">{selectedRequest.pickup_time}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Admin Notes */}
              {selectedRequest.admin_notes && (
                <Card className="border-2 border-yellow-200 bg-yellow-50/50 shadow-md">
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-yellow-700 mb-1 uppercase tracking-wide">Admin Notu</p>
                        <p className="text-sm text-yellow-900 break-words whitespace-pre-wrap">{selectedRequest.admin_notes}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                {(selectedRequest.status === 'reviewing' || selectedRequest.status === 'offer_sent') && (
                  <Button
                    className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-md"
                    onClick={() => {
                      setOfferPrice(selectedRequest.admin_offer_price?.toString() || '');
                      setOfferNote(selectedRequest.admin_notes || '');
                      setIsDetailOpen(false);
                      setIsOfferModalOpen(true);
                    }}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {selectedRequest.admin_offer_price ? 'Teklifi Güncelle' : 'Teklif Gönder'}
                  </Button>
                )}
                {selectedRequest.status === 'accepted' && (
                  <Button
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-md"
                    onClick={() => {
                      setNewStatus('completed');
                      setIsDetailOpen(false);
                      setIsStatusModalOpen(true);
                    }}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Tamamlandı Olarak İşaretle
                  </Button>
                )}
              </div>
            </div>
          )}
        </AdminDialogContent>
      </AdminDialog>

      {/* Offer Modal */}
      <AdminDialog open={isOfferModalOpen} onOpenChange={setIsOfferModalOpen}>
        <AdminDialogContent className="max-w-lg">
          <AdminDialogHeader>
            <AdminDialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Banknote className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p>Fiyat Teklifi Gönder</p>
                {selectedRequest && (
                  <p className="text-sm font-mono text-gray-500 mt-1">{selectedRequest.request_number}</p>
                )}
              </div>
            </AdminDialogTitle>
            <AdminDialogDescription>
              {selectedRequest ? `${selectedRequest.customer.name} - ${selectedRequest.title} için fiyat teklifi gönderin` : 'Müşteriye fiyat teklifi gönderin'}
            </AdminDialogDescription>
          </AdminDialogHeader>
          
          <div className="space-y-5 mt-2">
            {selectedRequest && (
              <>
                {/* Product Summary */}
                <div className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 p-4 rounded-xl">
                  <div className="flex items-start gap-3">
                    {selectedRequest.images?.[0] ? (
                      <img 
                        src={selectedRequest.images[0].image_url} 
                        alt={selectedRequest.title}
                        className="w-20 h-20 object-cover rounded-lg ring-2 ring-gray-200"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 mb-1">{selectedRequest.title}</p>
                      <p className="text-xs text-gray-500">{selectedRequest.brand} {selectedRequest.model}</p>
                      <p className="text-xs text-gray-500 mt-1">{selectedRequest.customer.name}</p>
                    </div>
                  </div>
                </div>

                {/* Price Comparison */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 rounded-xl border-2 border-blue-200">
                    <p className="text-xs text-blue-600 mb-2 uppercase tracking-wide">Müşterinin Talebi</p>
                    <p className="text-2xl text-blue-900">{(selectedRequest.asking_price || 0).toLocaleString('tr-TR')} ₺</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 p-4 rounded-xl border-2 border-purple-200">
                    <p className="text-xs text-purple-600 mb-2 uppercase tracking-wide">Mevcut Teklif</p>
                    <p className="text-2xl text-purple-900">
                      {selectedRequest.admin_offer_price 
                        ? `${(selectedRequest.admin_offer_price || 0).toLocaleString('tr-TR')} ₺`
                        : '-'
                      }
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Offer Input */}
            <div className="space-y-2">
              <Label htmlFor="offer-price" className="text-sm font-medium">
                Yeni Teklif Fiyatı (₺) *
              </Label>
              <div className="relative">
                <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-500" />
                <Input
                  id="offer-price"
                  type="number"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  placeholder="15000"
                  className="pl-10 text-lg h-12 border-2 border-purple-200 focus:border-purple-500"
                />
              </div>
            </div>

            {/* Note Input */}
            <div className="space-y-2">
              <Label htmlFor="offer-note" className="text-sm font-medium">
                Açıklama / Not (Opsiyonel)
              </Label>
              <Textarea
                id="offer-note"
                value={offerNote}
                onChange={(e) => setOfferNote(e.target.value)}
                placeholder="Fiyat hakkında müşteriye açıklama ekleyebilirsiniz..."
                rows={4}
                className="resize-none border-2"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setIsOfferModalOpen(false)}
                className="flex-1"
              >
                İptal
              </Button>
              <Button 
                onClick={handleSendOffer}
                disabled={submitting || !offerPrice}
                className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-md"
              >
                {submitting ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Gönderiliyor...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Teklif Gönder
                  </>
                )}
              </Button>
            </div>
          </div>
        </AdminDialogContent>
      </AdminDialog>

      {/* Status Modal */}
      <AdminDialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <AdminDialogContent>
          <AdminDialogHeader>
            <AdminDialogTitle className="flex items-center gap-2">
              <Edit3 className="w-6 h-6 text-[#1e3a8a]" />
              Statü Değiştir
            </AdminDialogTitle>
            <AdminDialogDescription>
              {selectedRequest ? `${selectedRequest.request_number} - Talep statüsünü güncelleyin` : 'Talep statüsünü değiştirin'}
            </AdminDialogDescription>
          </AdminDialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-status">Yeni Statü *</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Statü seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reviewing">İnceleniyor</SelectItem>
                  <SelectItem value="accepted">Kabul Edildi</SelectItem>
                  <SelectItem value="rejected">Reddedildi</SelectItem>
                  <SelectItem value="completed">Tamamlandı</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status-note">Not (Opsiyonel)</Label>
              <Textarea
                id="status-note"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Statü değişikliği hakkında not..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsStatusModalOpen(false)}>
                İptal
              </Button>
              <Button 
                onClick={handleUpdateStatus}
                disabled={submitting || !newStatus}
              >
                {submitting ? 'Güncelleniyor...' : 'Statüyü Güncelle'}
              </Button>
            </div>
          </div>
        </AdminDialogContent>
      </AdminDialog>

      {/* Cancel Request Modal */}
      <AdminDialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <AdminDialogContent className="max-w-md">
          <AdminDialogHeader>
            <AdminDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Talebi İptal Et
            </AdminDialogTitle>
            <AdminDialogDescription>
              {requestToCancel ? `${requestToCancel.request_number} numaralı talep iptal edilecek` : 'Seçili talep iptal edilecek'}
            </AdminDialogDescription>
          </AdminDialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Warning Box */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900 mb-1">
                    Bu talep iptal edilecek
                  </p>
                  <p className="text-sm text-red-700">
                    İptal edilen talepler "İptal Edildi" statüsüne geçecek ve müşteri bilgilendirilecektir.
                  </p>
                </div>
              </div>
            </div>

            {requestToCancel && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Talep No:</span>
                  <span className="font-medium text-gray-900">{requestToCancel.request_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Ürün:</span>
                  <span className="font-medium text-gray-900">{requestToCancel.title}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Müşteri:</span>
                  <span className="font-medium text-gray-900">{requestToCancel.customer.name}</span>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsCancelModalOpen(false);
                  setRequestToCancel(null);
                }}
              >
                Vazgeç
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleCancelRequest}
              >
                <Ban className="w-4 h-4 mr-2" />
                İptal Et
              </Button>
            </div>
          </div>
        </AdminDialogContent>
      </AdminDialog>

      {/* Alım Tarihi Değiştirme Modal */}
      <Dialog open={isEditDateModalOpen} onOpenChange={setIsEditDateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-600" />
              Alım Tarihi Değiştir
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.request_id} numaralı talebin alım tarih ve saatini güncelleyin
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="edit-pickup-date">Alım Tarihi *</Label>
              <Input
                id="edit-pickup-date"
                type="date"
                value={editPickupDate}
                onChange={(e) => setEditPickupDate(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="edit-pickup-time">Alım Saati *</Label>
              <Input
                id="edit-pickup-time"
                type="time"
                value={editPickupTime}
                onChange={(e) => setEditPickupTime(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsEditDateModalOpen(false);
                  setEditPickupDate('');
                  setEditPickupTime('');
                }}
              >
                İptal
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleUpdatePickupDate}
                disabled={!editPickupDate || !editPickupTime}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Tarihi Güncelle
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tek Talep Silme Modal */}
      <AdminDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AdminDialogContent className="max-w-md">
          <AdminDialogHeader>
            <AdminDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Talebi Sil
            </AdminDialogTitle>
            <AdminDialogDescription>
              Bu işlem geri alınamaz ve kalıcı olarak silinecektir.
            </AdminDialogDescription>
          </AdminDialogHeader>

          <div className="space-y-4">
            {/* Warning Box */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Trash2 className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900 mb-1">
                    {requestToDelete?.request_number} numaralı talep silinecek
                  </p>
                  <p className="text-sm text-red-700">
                    Bu işlem geri alınamaz.
                  </p>
                </div>
              </div>
            </div>

            {/* Request Details */}
            {requestToDelete && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Talep No:</span>
                  <span className="font-medium text-gray-900">{requestToDelete.request_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Ürün:</span>
                  <span className="font-medium text-gray-900">{requestToDelete.title}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Müşteri:</span>
                  <span className="font-medium text-gray-900">{requestToDelete.customer.name}</span>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setRequestToDelete(null);
                }}
              >
                İptal
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeleteRequest}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Talebi Sil
              </Button>
            </div>
          </div>
        </AdminDialogContent>
      </AdminDialog>

      {/* Delete All Requests Modal */}
      <AdminDialog open={isDeleteAllModalOpen} onOpenChange={setIsDeleteAllModalOpen}>
        <AdminDialogContent className="max-w-md">
          <AdminDialogHeader>
            <AdminDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Tüm Talepleri Temizle
            </AdminDialogTitle>
            <AdminDialogDescription>
              {requests.length > 0 ? `${requests.length} adet talep kalıcı olarak silinecek` : 'Tüm satış talepleri silinecek'}
            </AdminDialogDescription>
          </AdminDialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Warning Box */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900 mb-1">
                    Tüm satış talepleri silinecek
                  </p>
                  <p className="text-sm text-red-700">
                    Bu işlem geri alınamaz ve kalıcı olarak silinecektir. Talepler hem admin panelinden hem de kullanıcı tarafından kalıcı olarak görünmez olacak.
                  </p>
                </div>
              </div>
            </div>

            {/* Request Details */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Toplam Talep:</span>
                <span className="font-medium text-gray-900">{requests.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Beklemede:</span>
                <span className="font-medium text-yellow-600">{stats.pending}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Teklif Gönderildi:</span>
                <span className="font-medium text-purple-600">{stats.offer_sent}</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsDeleteAllModalOpen(false)}
              >
                İptal
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeleteAllRequests}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Tüm Talepleri Sil
              </Button>
            </div>
          </div>
        </AdminDialogContent>
      </AdminDialog>

      {/* Gallery Modal */}
      <AdminDialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
        <AdminDialogContent className="max-w-5xl">
          <AdminDialogHeader>
            <AdminDialogTitle className="flex items-center gap-2">
              <Package className="w-6 h-6 text-purple-600" />
              Ürün Fotoğrafları
            </AdminDialogTitle>
            <AdminDialogDescription>
              {selectedRequest ? `${selectedRequest.title} - ${selectedRequest.images?.length || 0} fotoğraf` : 'Ürün fotoğraflarını görüntüleyin'}
            </AdminDialogDescription>
          </AdminDialogHeader>
          
          {selectedRequest && selectedRequest.images && selectedRequest.images.length > 0 && (
            <div className="space-y-4 mt-2">
              <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden">
                <img
                  src={selectedRequest.images[selectedImageIndex]?.image_url}
                  alt={`Fotoğraf ${selectedImageIndex + 1}`}
                  className="w-full h-[500px] object-contain"
                />
                
                {selectedRequest.images.length > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white shadow-lg hover:scale-110 transition-transform"
                      onClick={() => setSelectedImageIndex((selectedImageIndex - 1 + selectedRequest.images.length) % selectedRequest.images.length)}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white shadow-lg hover:scale-110 transition-transform"
                      onClick={() => setSelectedImageIndex((selectedImageIndex + 1) % selectedRequest.images.length)}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </>
                )}

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#1e3a8a] text-white px-4 py-2 rounded-full shadow-lg">
                  {selectedImageIndex + 1} / {selectedRequest.images.length}
                </div>
              </div>

              {/* Thumbnail Strip */}
              <div className="flex gap-3 overflow-x-auto pb-2">
                {selectedRequest.images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img.image_url}
                    alt={`Küçük ${idx + 1}`}
                    className={`w-24 h-24 object-cover rounded-lg cursor-pointer transition-all duration-200 ${
                      idx === selectedImageIndex 
                        ? 'ring-4 ring-purple-500 scale-105 shadow-lg' 
                        : 'ring-2 ring-gray-200 opacity-60 hover:opacity-100 hover:scale-105'
                    }`}
                    onClick={() => setSelectedImageIndex(idx)}
                  />
                ))}
              </div>
            </div>
          )}
        </AdminDialogContent>
      </AdminDialog>
    </AdminLayout>
  );
}
