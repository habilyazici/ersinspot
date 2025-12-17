import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { projectId } from '../../utils/supabase/info';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { 
  AdminDialog as Dialog,
  AdminDialogContent as DialogContent,
  AdminDialogDescription as DialogDescription,
  AdminDialogHeader as DialogHeader,
  AdminDialogTitle as DialogTitle,
  AdminDialogFooter as DialogFooter,
} from '../../components/ui/admin-dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { 
  Truck, 
  Package, 
  MapPin, 
  Calendar, 
  Banknote, 
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  ArrowUpDown,
  Eye,
  Send,
  TrendingUp,
  User,
  Phone,
  Mail,
  Home,
  MoreVertical,
  Edit,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  FileBarChart,
  Trash2
} from 'lucide-react@0.487.0';
import { toast } from 'sonner@2.0.3';
import { Textarea } from '../../components/ui/textarea';
import { Link } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

interface MovingRequest {
  id: number;
  request_number: string;
  customer_id: number;
  from_address: string;
  from_city?: string;
  from_district?: string;
  to_address: string;
  to_city?: string;
  to_district?: string;
  moving_date: string;
  preferred_time?: string;
  home_size: string;
  floor: number;
  target_floor: number;
  elevator_from: boolean;
  elevator_to: boolean;
  description?: string;
  estimated_price: number;
  admin_offer_price?: number;
  admin_notes?: string;
  distance?: number;
  status: 'reviewing' | 'offer_sent' | 'accepted' | 'rejected' | 'completed';
  created_at: string;
  updated_at: string;
  customer?: {
    id: number;
    name: string;
    email: string;
    phone: string;
  };
  items?: {
    id: number;
    item_name: string;
    quantity: number;
    item_type: string;
  }[];
}

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
  
  if (!itemName || typeof itemName !== 'string') {
    return 'Belirtilmemiş';
  }
  return itemTranslations[itemName.toLowerCase()] || itemName;
};

export default function AdminMovingManagement() {
  const { accessToken } = useAuth();
  
  const [requests, setRequests] = useState<MovingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<MovingRequest | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [isEditDateModalOpen, setIsEditDateModalOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<MovingRequest | null>(null);
  const [editMovingDate, setEditMovingDate] = useState('');
  const [editMovingTime, setEditMovingTime] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const [offerPrice, setOfferPrice] = useState('');
  const [offerNotes, setOfferNotes] = useState('');

  useEffect(() => {
    loadRequests();
  }, [accessToken]);

  const loadRequests = async () => {
    if (!accessToken) return;
    
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/moving/admin/requests`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      } else {
        toast.error('Nakliye talepleri yüklenemedi');
      }
    } catch (error) {
      console.error('Error loading moving requests:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSendOffer = async () => {
    if (!selectedRequest || !offerPrice) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    try {
      console.log('[MOVING] Sending offer:', {
        requestNumber: selectedRequest.request_number,
        offerPrice,
        endpoint: `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/moving/admin/requests/${selectedRequest.request_number}/offer`
      });
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/moving/admin/requests/${selectedRequest.request_number}/offer`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            offerPrice: parseFloat(offerPrice),
            adminNotes: offerNotes,
          }),
        }
      );

      console.log('[MOVING] Response status:', response.status);

      if (response.ok) {
        toast.success('Teklif başarıyla gönderildi');
        setOfferModalOpen(false);
        setOfferPrice('');
        setOfferNotes('');
        loadRequests();
      } else {
        const errorData = await response.json();
        console.error('[MOVING] Error response:', errorData);
        toast.error(errorData.error || 'Teklif gönderilemedi');
      }
    } catch (error) {
      console.error('[MOVING] Error sending offer:', error);
      toast.error(`Bir hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    }
  };

  const handleUpdateStatus = async (requestNumber: string, newStatus: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/moving/admin/requests/${requestNumber}/status`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.ok) {
        toast.success('Durum güncellendi');
        loadRequests();
      } else {
        toast.error('Durum güncellenemedi');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Bir hata oluştu');
    }
  };

  // Nakliye tarih/saat güncelleme
  const handleUpdateMovingDate = async () => {
    if (!selectedRequest || !editMovingDate || !editMovingTime) {
      toast.error('Lütfen tarih ve saat seçin');
      return;
    }

    const toastId = toast.loading('Nakliye tarihi güncelleniyor...');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/moving/admin/requests/${selectedRequest.request_number}/moving-date`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            moving_date: editMovingDate,
            preferred_time: editMovingTime,
          }),
        }
      );

      toast.dismiss(toastId);

      if (response.ok) {
        toast.success('Nakliye tarihi başarıyla güncellendi! ✅');
        setIsEditDateModalOpen(false);
        setEditMovingDate('');
        setEditMovingTime('');
        loadRequests();
      } else {
        toast.error('Nakliye tarihi güncellenemedi!');
      }
    } catch (error) {
      toast.dismiss(toastId);
      console.error('Error updating moving date:', error);
      toast.error('Nakliye tarihi güncellenirken bir hata oluştu');
    }
  };

  // Tek talebi sil
  const handleDeleteRequest = async () => {
    if (!requestToDelete) return;

    const toastId = toast.loading('Talep siliniyor...');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/admin/moving/${requestToDelete.id}`,
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
    if (!accessToken) return;

    const toastId = toast.loading('Tüm talepler siliniyor...');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/admin/moving/delete-all`,
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
        setRequests([]);
        toast.success(`${data.deletedRequests || 'Tüm'} talep başarıyla silindi! 🗑️`);
        setIsDeleteAllModalOpen(false);
      } else {
        toast.error('Talepler silinemedi!');
      }
    } catch (error) {
      toast.dismiss(toastId);
      console.error('Error deleting all requests:', error);
      toast.error('Talepler silinirken bir hata oluştu');
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; className: string; icon: any }> = {
      pending: { label: 'İnceleniyor', className: 'bg-blue-100 text-blue-700', icon: Clock },
      reviewing: { label: 'İnceleniyor', className: 'bg-blue-100 text-blue-700', icon: Clock },
      offer_sent: { label: 'Teklif Gönderildi', className: 'bg-purple-100 text-purple-700', icon: Send },
      accepted: { label: 'Kabul Edildi', className: 'bg-green-100 text-green-700', icon: CheckCircle },
      rejected: { label: 'Reddedildi', className: 'bg-red-100 text-red-700', icon: XCircle },
      completed: { label: 'Tamamlandı', className: 'bg-orange-100 text-orange-700', icon: TrendingUp },
    };
    return configs[status] || { label: status, className: 'bg-gray-100 text-gray-700', icon: Clock };
  };

  // Filter
  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      req.request_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.from_address.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filtresi - reviewing için pending durumunu da dahil et
    const matchesStatus = statusFilter === 'all' || 
                         req.status === statusFilter ||
                         (statusFilter === 'reviewing' && req.status === 'pending');
    
    return matchesSearch && matchesStatus;
  });

  // Sort
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (!sortField) return 0;
    
    let aVal: any, bVal: any;
    
    switch (sortField) {
      case 'request_number':
        aVal = a.request_number;
        bVal = b.request_number;
        break;
      case 'customer':
        aVal = a.customer?.name || '';
        bVal = b.customer?.name || '';
        break;
      case 'created_at':
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
        break;
      case 'moving_date':
        aVal = new Date(a.moving_date).getTime();
        bVal = new Date(b.moving_date).getTime();
        break;
      case 'status':
        aVal = a.status;
        bVal = b.status;
        break;
      default:
        return 0;
    }
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Stats
  const stats = {
    total: requests.length,
    reviewing: requests.filter(r => r.status === 'reviewing' || r.status === 'pending').length,
    offer_sent: requests.filter(r => r.status === 'offer_sent').length,
    accepted: requests.filter(r => r.status === 'accepted').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    completed: requests.filter(r => r.status === 'completed').length,
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-gray-900 flex items-center gap-3">
              <Truck className="w-8 h-8 text-[var(--brand-orange-600)]" />
              Nakliye Talepleri
            </h1>
            <p className="text-gray-600 mt-1">Müşteri nakliye taleplerini görüntüleyin ve yönetin</p>
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

        {/* Stats Cards */}
        <div className="flex flex-wrap gap-3">
          <Card className="bg-gradient-to-br from-[#1e3a8a] to-[#1e3a8a]/80 text-white border-[#1e3a8a] cursor-pointer hover:shadow-xl transition-all" onClick={() => setStatusFilter('all')}>
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Truck className="w-7 h-7 opacity-80 flex-shrink-0" />
                <div>
                  <p className="text-xs text-white/80 uppercase tracking-wide whitespace-nowrap">Toplam</p>
                  <p className="text-xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200 cursor-pointer hover:shadow-lg transition-all" onClick={() => setStatusFilter('reviewing')}>
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

          <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200 cursor-pointer hover:shadow-lg transition-all" onClick={() => setStatusFilter('offer_sent')}>
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

          <Card className="bg-gradient-to-br from-green-50 to-white border-green-200 cursor-pointer hover:shadow-lg transition-all" onClick={() => setStatusFilter('accepted')}>
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

          <Card className="bg-gradient-to-br from-red-50 to-white border-red-200 cursor-pointer hover:shadow-lg transition-all" onClick={() => setStatusFilter('rejected')}>
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

          <Card className="bg-gradient-to-br from-[#f97316] to-[#f97316]/80 text-white border-[#f97316] cursor-pointer hover:shadow-xl transition-all" onClick={() => setStatusFilter('completed')}>
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
              placeholder="Talep no, müşteri, adres ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
        </div>

        {/* Requests List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Nakliye Talepleri ({sortedRequests.length})</CardTitle>
              {!loading && sortedRequests.length > 0 && (
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
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3 animate-spin" />
                <p className="text-gray-500">Yükleniyor...</p>
              </div>
            ) : sortedRequests.length === 0 ? (
              <div className="text-center py-12">
                <Truck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nakliye talebi bulunamadı</p>
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
                        if ((e.target as HTMLElement).closest('button')) {
                          return;
                        }
                        setSelectedRequest(request);
                        setDetailModalOpen(true);
                      }}
                    >
                      <div className="flex gap-4">
                        {/* Icon Section */}
                        <div className="relative flex-shrink-0">
                          <div className="w-28 h-28 bg-gradient-to-br from-[#1e3a8a]/10 to-[#f97316]/10 rounded-xl flex items-center justify-center border-2 border-[#1e3a8a]/20">
                            <Truck className="w-12 h-12 text-[#1e3a8a]" />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="text-gray-900 mb-1.5">Nakliye Talebi</h3>
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
                                <Badge className={`${statusConfig.className} border-0 shadow-md cursor-pointer hover:scale-105 transition-all duration-200 px-2.5 py-1.5 text-sm ${
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
                                    handleUpdateStatus(request.request_number, 'reviewing');
                                  }}
                                  className="cursor-pointer"
                                  disabled={request.status === 'reviewing' || request.status === 'pending'}
                                >
                                  <Clock className="w-4 h-4 mr-2 text-blue-600" />
                                  <span>İnceleniyor</span>
                                  {(request.status === 'reviewing' || request.status === 'pending') && (
                                    <CheckCircle className="w-4 h-4 ml-auto text-blue-600" />
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateStatus(request.request_number, 'offer_sent');
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
                                    handleUpdateStatus(request.request_number, 'accepted');
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
                                    handleUpdateStatus(request.request_number, 'rejected');
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
                                    handleUpdateStatus(request.request_number, 'completed');
                                  }}
                                  className="cursor-pointer"
                                  disabled={request.status === 'completed'}
                                >
                                  <TrendingUp className="w-4 h-4 mr-2 text-orange-600" />
                                  <span>Tamamlandı</span>
                                  {request.status === 'completed' && (
                                    <CheckCircle className="w-4 h-4 ml-auto text-orange-600" />
                                  )}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 text-sm">
                            <div className="bg-gradient-to-br from-gray-50 to-white p-3 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Müşteri</p>
                              </div>
                              <p className="text-gray-900 font-medium truncate" title={request.customer?.name || '-'}>
                                {request.customer?.name || '-'}
                              </p>
                              {request.customer?.phone && (
                                <p className="text-xs text-gray-500 mt-0.5 truncate" title={request.customer.phone}>
                                  {request.customer.phone}
                                </p>
                              )}
                            </div>
                            <div className="bg-gradient-to-br from-gray-50 to-white p-3 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Tarih</p>
                              </div>
                              <p className="text-gray-900 font-medium">{formatDate(request.moving_date)}</p>
                              {request.preferred_time && (
                                <p className="text-xs text-gray-500 mt-0.5">{request.preferred_time}</p>
                              )}
                            </div>
                            <div className="bg-gradient-to-br from-gray-50 to-white p-3 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Home className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Ev Büyüklüğü</p>
                              </div>
                              <p className="text-gray-900 font-medium truncate" title={request.home_size}>
                                {request.home_size}
                              </p>
                              {request.distance && (
                                <p className="text-xs text-gray-500 mt-0.5">{request.distance} km</p>
                              )}
                            </div>
                          </div>

                          {/* Addresses */}
                          <div className="mb-3 bg-gray-50/80 p-3 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Adresler</p>
                            <div className="space-y-2">
                              <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-xs text-gray-500">Başlangıç</p>
                                  <p className="text-sm text-gray-700">{request.from_address}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-xs text-gray-500">Hedef</p>
                                  <p className="text-sm text-gray-700">{request.to_address}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="hover:bg-[#1e3a8a] hover:text-white border-[#1e3a8a]/30 transition-all"
                              onClick={() => {
                                setSelectedRequest(request);
                                setDetailModalOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1.5" />
                              Tüm Detaylar
                            </Button>

                            {(request.status === 'pending' || request.status === 'reviewing' || request.status === 'offer_sent') && (
                              <Button
                                size="sm"
                                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-sm"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setOfferPrice(request.admin_offer_price?.toString() || request.estimated_price?.toString() || '');
                                  setOfferNotes(request.admin_notes || '');
                                  setOfferModalOpen(true);
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
                                onClick={() => handleUpdateStatus(request.request_number, 'completed')}
                              >
                                <CheckCircle className="w-4 h-4 mr-1.5" />
                                Tamamla
                              </Button>
                            )}

                            {request.status === 'completed' && (
                              <Link to={`/admin/raporlar/nakliye/${request.request_number}`}>
                                <Button
                                  size="sm"
                                  className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white shadow-sm"
                                >
                                  <FileBarChart className="w-4 h-4 mr-1.5" />
                                  Raporu Görüntüle
                                </Button>
                              </Link>
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

      {/* Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <Truck className="w-6 h-6 text-[#f97316]" />
                  Nakliye Talebi Detayları
                </DialogTitle>
                <DialogDescription className="mt-2">
                  <span className="inline-flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full text-sm font-medium">
                    <FileText className="w-4 h-4" />
                    {selectedRequest?.request_number}
                  </span>
                </DialogDescription>
              </div>
              {selectedRequest && (
                <Badge className={
                  selectedRequest.status === 'reviewing' ? 'bg-yellow-500' :
                  selectedRequest.status === 'offer_sent' ? 'bg-blue-500' :
                  selectedRequest.status === 'accepted' ? 'bg-green-500' :
                  selectedRequest.status === 'rejected' ? 'bg-red-500' :
                  'bg-orange-500'
                }>
                  {selectedRequest.status === 'reviewing' ? 'İnceleniyor' :
                   selectedRequest.status === 'offer_sent' ? 'Teklif Gönderildi' :
                   selectedRequest.status === 'accepted' ? 'Kabul Edildi' :
                   selectedRequest.status === 'rejected' ? 'Reddedildi' :
                   'Tamamlandı'}
                </Badge>
              )}
            </div>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6 py-4">
              {/* Customer Info */}
              {selectedRequest.customer && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                  <h3 className="font-semibold text-[#1e3a8a] mb-4 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Müşteri Bilgileri
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <div key="customer-name" className="flex items-start gap-3 bg-white p-4 rounded-lg shadow-sm">
                      <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 mb-1">Ad Soyad</p>
                        <p className="text-sm font-medium text-gray-800 break-words">
                          {selectedRequest.customer.name}
                        </p>
                      </div>
                    </div>
                    <div key="customer-phone" className="flex items-start gap-3 bg-white p-4 rounded-lg shadow-sm">
                      <div className="bg-green-100 p-2 rounded-lg flex-shrink-0">
                        <Phone className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 mb-1">Telefon</p>
                        <p className="text-sm font-medium text-gray-800 break-words">{selectedRequest.customer.phone}</p>
                      </div>
                    </div>
                    <div key="customer-email" className="flex items-start gap-3 bg-white p-4 rounded-lg shadow-sm md:col-span-2 xl:col-span-1">
                      <div className="bg-purple-100 p-2 rounded-lg flex-shrink-0">
                        <Mail className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 mb-1">E-posta</p>
                        <p className="text-sm font-medium text-gray-800 break-words">
                          {selectedRequest.customer.email}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Address Info */}
              <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-5 border border-green-100">
                <h3 className="font-semibold text-green-800 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Adres Bilgileri
                </h3>
                <div className="space-y-4">
                  <div key="detail-from-addr" className="bg-white rounded-lg p-4 border-l-4 border-green-500 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="bg-green-100 p-2 rounded-lg mt-1 flex-shrink-0">
                        <MapPin className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-green-600 mb-1">BAŞLANGIÇ ADRESİ</p>
                        <p className="text-sm font-medium text-gray-800 mb-2 break-words">{selectedRequest.from_address}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                          <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                            <Home className="w-3 h-3" />
                            {selectedRequest.floor}. Kat
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded ${selectedRequest.elevator_from ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {selectedRequest.elevator_from ? '✓ Asansörlü' : '✗ Asansörsüz'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div key="detail-to-addr" className="bg-white rounded-lg p-4 border-l-4 border-red-500 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="bg-red-100 p-2 rounded-lg mt-1 flex-shrink-0">
                        <MapPin className="w-4 h-4 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-red-600 mb-1">VARIŞ ADRESİ</p>
                        <p className="text-sm font-medium text-gray-800 mb-2 break-words">{selectedRequest.to_address}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                          <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                            <Home className="w-3 h-3" />
                            {selectedRequest.target_floor}. Kat
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded ${selectedRequest.elevator_to ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {selectedRequest.elevator_to ? '✓ Asansörlü' : '✗ Asansörsüz'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {selectedRequest.distance && (
                    <div key="detail-distance" className="bg-white rounded-lg p-3 shadow-sm flex items-center justify-center gap-2">
                      <Truck className="w-4 h-4 text-gray-600" />
                      <span className="text-sm text-gray-600">Tahmini Mesafe:</span>
                      <span className="text-sm font-bold text-[#f97316]">{selectedRequest.distance} km</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Moving Details */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-5 border border-orange-100">
                <h3 className="font-semibold text-[#f97316] mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Taşınma Detayları
                </h3>
                <div className="flex items-center justify-between mb-3">
                  <div></div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditMovingDate(selectedRequest.moving_date.split('T')[0]);
                      setEditMovingTime(selectedRequest.preferred_time || '');
                      setIsEditDateModalOpen(true);
                    }}
                    className="text-xs"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Tarih Değiştir
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  <div key="moving-date" className="bg-white rounded-lg p-4 shadow-sm min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-[#f97316] flex-shrink-0" />
                      <p className="text-xs text-gray-500">Tarih</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{formatDate(selectedRequest.moving_date)}</p>
                  </div>
                  {selectedRequest.preferred_time && (
                    <div key="moving-time" className="bg-white rounded-lg p-4 shadow-sm min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <p className="text-xs text-gray-500">Saat</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-800">{selectedRequest.preferred_time}</p>
                    </div>
                  )}
                  <div key="home-size" className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Home className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      <p className="text-xs text-gray-500">Ev Büyüklüğü</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 break-words">
                      {selectedRequest.home_size}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items */}
              {selectedRequest.items && selectedRequest.items.length > 0 && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-100">
                  <h3 className="font-semibold text-purple-800 mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Taşınacak Eşyalar ({selectedRequest.items.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {selectedRequest.items.map((item, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="bg-purple-100 p-2 rounded-lg flex-shrink-0">
                              <Package className="w-4 h-4 text-purple-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-800 break-words leading-tight flex-1">
                              {getItemNameInTurkish(item.item_name)}
                            </span>
                          </div>
                          <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 whitespace-nowrap">
                            x{item.quantity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedRequest.description && (
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-5 border border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Açıklama
                  </h3>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <p className="text-sm text-gray-700 leading-relaxed break-words whitespace-pre-wrap">{selectedRequest.description}</p>
                  </div>
                </div>
              )}

              {/* Photos */}
              {selectedRequest.photos && selectedRequest.photos.length > 0 && (
                <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-5 border border-cyan-100">
                  <h3 className="font-semibold text-cyan-800 mb-4 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Eşya Fotoğrafları ({selectedRequest.photos.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                    {selectedRequest.photos.map((photo: any, index: number) => (
                      <div 
                        key={index}
                        className="aspect-square bg-white rounded-lg overflow-hidden border-2 border-transparent hover:border-[#f97316] transition-all cursor-pointer group shadow-md hover:shadow-xl min-w-0"
                        onClick={() => window.open(typeof photo === 'string' ? photo : photo.photo_url, '_blank')}
                      >
                        <img 
                          src={typeof photo === 'string' ? photo : photo.photo_url} 
                          alt={`Eşya ${index + 1}`}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EFoto Yüklenemedi%3C/text%3E%3C/svg%3E'; }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              {selectedRequest.admin_notes && (
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-5 border border-amber-200">
                  <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Admin Notları
                  </h3>
                  <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-amber-500">
                    <p className="text-sm text-gray-700 leading-relaxed break-words whitespace-pre-wrap">{selectedRequest.admin_notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Footer Actions */}
          {selectedRequest && selectedRequest.status === 'reviewing' && (
            <DialogFooter className="border-t pt-4">
              <Button
                onClick={() => {
                  setDetailModalOpen(false);
                  setOfferModalOpen(true);
                }}
                className="bg-[#f97316] hover:bg-[#ea580c] text-white"
              >
                <Send className="w-4 h-4 mr-2" />
                Fiyat Teklifi Gönder
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Offer Modal */}
      <Dialog open={offerModalOpen} onOpenChange={setOfferModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Banknote className="w-5 h-5 text-[#f97316]" />
              {selectedRequest?.admin_offer_price ? 'Teklifi Güncelle' : 'Fiyat Teklifi Gönder'}
            </DialogTitle>
            <DialogDescription className="mt-2">
              <span className="inline-flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full text-sm">
                <FileText className="w-4 h-4" />
                {selectedRequest?.request_number}
              </span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5 py-4">
            <div>
              <Label className="text-sm font-semibold mb-2 block">Teklif Fiyatınız (₺)</Label>
              <Input
                type="number"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
                placeholder="Örn: 5000"
                className="text-lg font-semibold"
              />
            </div>
            <div>
              <Label className="text-sm font-semibold mb-2 block">Açıklama (Opsiyonel)</Label>
              <Textarea
                value={offerNotes}
                onChange={(e) => setOfferNotes(e.target.value)}
                placeholder="Teklif detayları, kapsam, garanti süresi vb..."
                rows={4}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setOfferModalOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleSendOffer} className="bg-[#f97316] hover:bg-[#ea580c]">
              <Send className="w-4 h-4 mr-2" />
              {selectedRequest?.admin_offer_price ? 'Teklifi Güncelle' : 'Teklif Gönder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nakliye Tarihi Değiştirme Modal */}
      <Dialog open={isEditDateModalOpen} onOpenChange={setIsEditDateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Nakliye Tarihi Değiştir
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.request_number} numaralı talebin nakliye tarih ve saatini güncelleyin
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="edit-moving-date">Nakliye Tarihi *</Label>
              <Input
                id="edit-moving-date"
                type="date"
                value={editMovingDate}
                onChange={(e) => setEditMovingDate(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="edit-moving-time">Nakliye Saati *</Label>
              <Input
                id="edit-moving-time"
                type="time"
                value={editMovingTime}
                onChange={(e) => setEditMovingTime(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsEditDateModalOpen(false);
                  setEditMovingDate('');
                  setEditMovingTime('');
                }}
              >
                İptal
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={handleUpdateMovingDate}
                disabled={!editMovingDate || !editMovingTime}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Tarihi Güncelle
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tek Talep Silme Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Talebi Sil
            </DialogTitle>
            <DialogDescription>
              Bu işlem geri alınamaz ve kalıcı olarak silinecektir.
            </DialogDescription>
          </DialogHeader>

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
                  <span className="text-gray-600">Müşteri:</span>
                  <span className="font-medium text-gray-900">{requestToDelete.customer?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tarih:</span>
                  <span className="font-medium text-gray-900">{new Date(requestToDelete.moving_date).toLocaleDateString('tr-TR')}</span>
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
        </DialogContent>
      </Dialog>

      {/* Tüm Talepleri Sil Modal */}
      <Dialog open={isDeleteAllModalOpen} onOpenChange={setIsDeleteAllModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Trash2 className="w-5 h-5" />
              Tüm Talepleri Sil
            </DialogTitle>
            <DialogDescription>
              Bu işlem geri alınamaz! Tüm nakliye talepleri ve ilgili veriler kalıcı olarak silinecek.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700 font-medium">
                ⚠️ Dikkat: {requests.length} adet talep silinecek!
              </p>
              <p className="text-xs text-red-600 mt-2">
                Bu işlem tüm nakliye taleplerini, müşteri bilgilerini ve ilgili verileri kalıcı olarak silecektir.
              </p>
            </div>

            <div className="flex gap-3">
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
                Tümünü Sil
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
