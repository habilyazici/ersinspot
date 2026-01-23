import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { projectId } from '../../utils/supabase/info';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
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
  Wrench, 
  Package, 
  MapPin, 
  Calendar, 
  Banknote, 
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Eye,
  Send,
  User,
  Phone,
  Mail,
  MoreVertical,
  Edit,
  Trash2,
  Image as ImageIcon,
  TrendingUp,
  Ban,
  ArrowUp,
  ArrowDown
} from 'lucide-react@0.487.0';
import { toast } from 'sonner@2.0.3';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface TechnicalServiceRequest {
  id: number;
  request_number: string;
  customer_id: string;
  user_id: string;
  product_type: string;
  product_brand?: string;
  product_model?: string;
  purchase_date?: string;
  warranty_status?: string;
  problem_description: string;
  problem_category?: string;
  preferred_date: string;
  preferred_time: string;
  service_address: string;
  service_city?: string;
  service_district?: string;
  service_neighborhood?: string;
  service_street?: string;
  service_building_no?: string;
  service_apartment_no?: string;
  status: 'reviewing' | 'quoted' | 'approved' | 'completed' | 'cancelled';
  estimated_price?: number;
  final_price?: number;
  admin_notes?: string;
  customer_notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  customer?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    district?: string;
  };
  photos?: {
    id: number;
    photo_url: string;
    photo_type: string;
  }[];
  updates?: {
    id: number;
    status: string;
    note: string;
    created_by: string;
    created_at: string;
  }[];
}

export default function AdminTechnicalServiceManagement() {
  const { accessToken } = useAuth();
  
  const [requests, setRequests] = useState<TechnicalServiceRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<TechnicalServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Modal states
  const [selectedRequest, setSelectedRequest] = useState<TechnicalServiceRequest | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [isEditDateModalOpen, setIsEditDateModalOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<TechnicalServiceRequest | null>(null);
  const [editPreferredDate, setEditPreferredDate] = useState('');
  const [editPreferredTime, setEditPreferredTime] = useState('');
  
  // Form states
  const [quotePrice, setQuotePrice] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [finalPrice, setFinalPrice] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tüm talepleri yükle
  useEffect(() => {
    loadRequests();
  }, []);

  // Filtreleme ve sıralama
  useEffect(() => {
    let filtered = requests;

    // Durum filtresi
    if (statusFilter !== 'all') {
      filtered = filtered.filter(req => req.status === statusFilter);
    }

    // Arama filtresi
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(req => 
        req.request_number.toLowerCase().includes(search) ||
        req.customer?.name.toLowerCase().includes(search) ||
        req.customer?.email.toLowerCase().includes(search) ||
        req.customer?.phone.includes(search) ||
        req.product_type.toLowerCase().includes(search) ||
        req.product_brand?.toLowerCase().includes(search)
      );
    }

    // Sıralama
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
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
          case 'preferred_date':
            aVal = new Date(a.preferred_date).getTime();
            bVal = new Date(b.preferred_date).getTime();
            break;
          case 'estimated_price':
            aVal = a.estimated_price || 0;
            bVal = b.estimated_price || 0;
            break;
          default:
            return 0;
        }
        
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredRequests(filtered);
  }, [requests, statusFilter, searchTerm, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const loadRequests = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/technical-service/admin/requests`,
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
        console.log('✅ Technical service requests loaded:', data.requests);
        setRequests(data.requests || []);
      } else {
        toast.error('Talepler yüklenirken hata oluştu');
      }
    } catch (error) {
      console.error('Error loading requests:', error);
      toast.error('Talepler yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  // Fiyat teklifi gönder
  const handleSendQuote = async () => {
    if (!selectedRequest) return;
    
    if (!quotePrice || parseFloat(quotePrice) <= 0) {
      toast.error('Lütfen geçerli bir fiyat girin');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/technical-service/admin/${selectedRequest.id}/quote`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            estimatedPrice: parseFloat(quotePrice),
            adminNotes: quoteNotes
          }),
        }
      );

      if (response.ok) {
        const isUpdate = selectedRequest.estimated_price;
        toast.success(isUpdate ? '✅ Fiyat teklifi güncellendi' : '✅ Fiyat teklifi gönderildi');
        setIsQuoteModalOpen(false);
        setQuotePrice('');
        setQuoteNotes('');
        setSelectedRequest(null);
        loadRequests();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Fiyat teklifi gönderilemedi');
      }
    } catch (error) {
      console.error('Error sending quote:', error);
      toast.error('Fiyat teklifi gönderilemedi');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Durum güncelle
  const handleUpdateStatus = async (requestId?: number, status?: string) => {
    const targetRequestId = requestId || selectedRequest?.id;
    const targetStatus = status || newStatus;
    
    if (!targetRequestId || !targetStatus) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/technical-service/admin/${targetRequestId}/status`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: targetStatus,
            note: statusNote,
            finalPrice: finalPrice ? parseFloat(finalPrice) : undefined
          }),
        }
      );

      if (response.ok) {
        toast.success('✅ Durum güncellendi');
        setIsStatusModalOpen(false);
        setNewStatus('');
        setStatusNote('');
        setFinalPrice('');
        setSelectedRequest(null);
        loadRequests();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Durum güncellenemedi');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Durum güncellenemedi');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Randevu tarih/saat güncelleme
  const handleUpdatePreferredDate = async () => {
    if (!selectedRequest || !editPreferredDate || !editPreferredTime) {
      toast.error('Lütfen tarih ve saat seçin');
      return;
    }

    const toastId = toast.loading('Randevu tarihi güncelleniyor...');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/technical-service/admin/${selectedRequest.id}/preferred-date`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            preferred_date: editPreferredDate,
            preferred_time: editPreferredTime,
          }),
        }
      );

      toast.dismiss(toastId);

      if (response.ok) {
        toast.success('Randevu tarihi başarıyla güncellendi! ✅');
        setIsEditDateModalOpen(false);
        setEditPreferredDate('');
        setEditPreferredTime('');
        loadRequests();
      } else {
        toast.error('Randevu tarihi güncellenemedi!');
      }
    } catch (error) {
      toast.dismiss(toastId);
      console.error('Error updating preferred date:', error);
      toast.error('Randevu tarihi güncellenirken bir hata oluştu');
    }
  };

  // Tek talebi sil
  const handleDeleteRequest = async () => {
    if (!requestToDelete) return;

    const toastId = toast.loading('Talep siliniyor...');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/admin/technical-service/${requestToDelete.id}`,
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
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/admin/technical-service/delete-all`,
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      reviewing: { label: 'İnceleniyor', color: 'bg-yellow-100 text-yellow-800' },
      quoted: { label: 'Teklif Verildi', color: 'bg-blue-100 text-blue-800' },
      approved: { label: 'Onaylandı', color: 'bg-green-100 text-green-800' },
      completed: { label: 'Tamamlandı', color: 'bg-purple-100 text-purple-800' },
      cancelled: { label: 'İptal Edildi', color: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    
    return (
      <Badge className={`${config.color} text-xs`}>
        {config.label}
      </Badge>
    );
  };

  // İstatistikler
  const stats = {
    total: requests.length,
    reviewing: requests.filter(r => r.status === 'reviewing').length,
    quoted: requests.filter(r => r.status === 'quoted').length,
    approved: requests.filter(r => r.status === 'approved').length,
    completed: requests.filter(r => r.status === 'completed').length,
    cancelled: requests.filter(r => r.status === 'cancelled').length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-gray-900 flex items-center gap-3">
              <Wrench className="w-8 h-8 text-[var(--brand-orange-600)]" />
              Teknik Servis Talepleri
            </h1>
            <p className="text-gray-600 mt-1">Teknik servis taleplerini görüntüleyin ve yönetin</p>
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

        {/* İstatistikler */}
        <div className="flex flex-wrap gap-3">
          <Card className="bg-gradient-to-br from-[#1e3a8a] to-[#1e3a8a]/80 text-white border-[#1e3a8a] cursor-pointer hover:shadow-xl transition-all" onClick={() => setStatusFilter('all')}>
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Wrench className="w-7 h-7 opacity-80 flex-shrink-0" />
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

          <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200 cursor-pointer hover:shadow-lg transition-all" onClick={() => setStatusFilter('quoted')}>
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Banknote className="w-7 h-7 text-[#f97316] flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide whitespace-nowrap">Teklif Verildi</p>
                  <p className="text-xl font-bold text-[#f97316]">{stats.quoted}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-white border-green-200 cursor-pointer hover:shadow-lg transition-all" onClick={() => setStatusFilter('approved')}>
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-7 h-7 text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide whitespace-nowrap">Onaylandı</p>
                  <p className="text-xl font-bold text-green-600">{stats.approved}</p>
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

          <Card className="bg-gradient-to-br from-red-50 to-white border-red-200 cursor-pointer hover:shadow-lg transition-all" onClick={() => setStatusFilter('cancelled')}>
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <XCircle className="w-7 h-7 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide whitespace-nowrap">İptal</p>
                  <p className="text-xl font-bold text-red-600">{stats.cancelled}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtreler */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Talep no, müşteri, cihaz ara..."
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
              <SelectItem value="quoted">Teklif Verildi</SelectItem>
              <SelectItem value="approved">Onaylandı</SelectItem>
              <SelectItem value="completed">Tamamlandı</SelectItem>
              <SelectItem value="cancelled">İptal Edildi</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Talepler Listesi */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Teknik Servis Talepleri ({filteredRequests.length})</CardTitle>
              {!isLoading && filteredRequests.length > 0 && (
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSort('estimated_price')}
                    className={sortField === 'estimated_price' ? 'bg-gray-100' : ''}
                  >
                    Fiyat
                    {sortField === 'estimated_price' && (
                      sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3 animate-spin" />
                <p className="text-gray-500">Yükleniyor...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <Wrench className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Teknik servis talebi bulunamadı</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map((request) => {
                  const statusConfig = {
                    reviewing: { label: 'İnceleniyor', className: 'bg-blue-100 text-blue-700', icon: Clock },
                    quoted: { label: 'Teklif Verildi', className: 'bg-purple-100 text-purple-700', icon: Send },
                    approved: { label: 'Onaylandı', className: 'bg-green-100 text-green-700', icon: CheckCircle },
                    completed: { label: 'Tamamlandı', className: 'bg-orange-100 text-orange-700', icon: TrendingUp },
                    cancelled: { label: 'İptal Edildi', className: 'bg-red-100 text-red-700', icon: XCircle },
                  }[request.status] || { label: request.status, className: 'bg-gray-100 text-gray-700', icon: Clock };
                  
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <div
                      key={request.id}
                      className={`bg-white border-2 rounded-xl p-5 hover:shadow-xl transition-all duration-200 cursor-pointer ${
                        request.status === 'approved' 
                          ? 'border-green-400 ring-4 ring-green-100 shadow-lg shadow-green-100' 
                          : request.status === 'quoted'
                          ? 'border-purple-400 ring-4 ring-purple-100 shadow-lg shadow-purple-100'
                          : request.status === 'completed'
                          ? 'border-[#f97316] ring-4 ring-orange-100 shadow-lg shadow-orange-100'
                          : request.status === 'cancelled'
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
                        setIsDetailModalOpen(true);
                      }}
                    >
                      <div className="flex gap-4">
                        {/* Icon Section */}
                        <div className="relative flex-shrink-0">
                          <div className="w-28 h-28 bg-gradient-to-br from-[#1e3a8a]/10 to-[#f97316]/10 rounded-xl flex items-center justify-center border-2 border-[#1e3a8a]/20">
                            <Wrench className="w-12 h-12 text-[#1e3a8a]" />
                          </div>
                          {request.photos && request.photos.length > 0 && (
                            <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
                              <ImageIcon className="w-3 h-3" />
                              {request.photos.length}
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="text-gray-900 mb-1.5">{request.product_type}</h3>
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-mono text-gray-600 bg-gray-50 px-2 py-0.5 rounded">{request.request_number}</span>
                                <span className="text-xs text-gray-500">
                                  {format(new Date(request.created_at), 'dd MMM yyyy', { locale: tr })}
                                </span>
                              </div>
                            </div>
                            {/* STATUS BADGE - CLICKABLE DROPDOWN */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Badge className={`${statusConfig.className} border-0 shadow-md cursor-pointer hover:scale-105 transition-all duration-200 px-2.5 py-1.5 text-sm ${
                                  request.status === 'approved' ? 'ring-1 ring-green-400' : 
                                  request.status === 'quoted' ? 'ring-1 ring-purple-400' : 
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
                                    handleUpdateStatus(request.id, 'quoted');
                                  }}
                                  className="cursor-pointer"
                                  disabled={request.status === 'quoted'}
                                >
                                  <Send className="w-4 h-4 mr-2 text-purple-600" />
                                  <span>Fiyat Teklifi Verildi</span>
                                  {request.status === 'quoted' && (
                                    <CheckCircle className="w-4 h-4 ml-auto text-purple-600" />
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateStatus(request.id, 'approved');
                                  }}
                                  className="cursor-pointer"
                                  disabled={request.status === 'approved'}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                  <span>Onaylandı</span>
                                  {request.status === 'approved' && (
                                    <CheckCircle className="w-4 h-4 ml-auto text-green-600" />
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
                                  <TrendingUp className="w-4 h-4 mr-2 text-orange-600" />
                                  <span>Tamamlandı</span>
                                  {request.status === 'completed' && (
                                    <CheckCircle className="w-4 h-4 ml-auto text-orange-600" />
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateStatus(request.id, 'cancelled');
                                  }}
                                  className="cursor-pointer"
                                  disabled={request.status === 'cancelled'}
                                >
                                  <Ban className="w-4 h-4 mr-2 text-red-600" />
                                  <span>İptal Edildi</span>
                                  {request.status === 'cancelled' && (
                                    <CheckCircle className="w-4 h-4 ml-auto text-red-600" />
                                  )}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
                            <div className="bg-gradient-to-br from-gray-50 to-white p-3 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow">
                              <div className="flex items-center gap-2 mb-2">
                                <User className="w-4 h-4 text-gray-500" />
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Müşteri</p>
                              </div>
                              <p className="text-gray-900 font-medium">{request.customer?.name || '-'}</p>
                              <p className="text-xs text-gray-500 mt-1">{request.customer?.phone || '-'}</p>
                            </div>

                            <div className="bg-gradient-to-br from-gray-50 to-white p-3 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow">
                              <div className="flex items-center gap-2 mb-2">
                                <Package className="w-4 h-4 text-gray-500" />
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Cihaz</p>
                              </div>
                              <p className="text-gray-900 font-medium">{request.product_brand || '-'}</p>
                              <p className="text-xs text-gray-500 mt-1">{request.product_model || '-'}</p>
                            </div>

                            <div className="bg-gradient-to-br from-gray-50 to-white p-3 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow">
                              <div className="flex items-center gap-2 mb-2">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Randevu</p>
                              </div>
                              <p className="text-gray-900 font-medium">
                                {format(new Date(request.preferred_date), 'dd MMM yyyy', { locale: tr })}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">{request.preferred_time}</p>
                            </div>

                            <div className="bg-gradient-to-br from-gray-50 to-white p-3 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow">
                              <div className="flex items-center gap-2 mb-2">
                                <Banknote className="w-4 h-4 text-gray-500" />
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Fiyat</p>
                              </div>
                              {request.estimated_price ? (
                                <>
                                  <p className="text-green-600 font-medium">{request.estimated_price.toLocaleString('tr-TR')} ₺</p>
                                  {request.final_price && (
                                    <p className="text-xs text-gray-500 mt-1">Final: {request.final_price.toLocaleString('tr-TR')} ₺</p>
                                  )}
                                </>
                              ) : (
                                <p className="text-gray-400 text-xs">Teklif yok</p>
                              )}
                            </div>
                          </div>

                          {/* Problem Açıklaması */}
                          {request.problem_description && (
                            <div className="bg-blue-50/50 p-3 rounded-lg mb-4">
                              <div className="flex items-start gap-2">
                                <FileText className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-xs text-blue-600 uppercase tracking-wide mb-1">Problem</p>
                                  <p className="text-sm text-gray-700 line-clamp-2">{request.problem_description}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRequest(request);
                                setIsDetailModalOpen(true);
                              }}
                              className="hover:bg-[#1e3a8a] hover:text-white border-[#1e3a8a]/30 transition-all"
                            >
                              <Eye className="w-4 h-4 mr-1.5" />
                              Tüm Detaylar
                            </Button>

                            {request.status === 'completed' && (
                              <Button
                                size="sm"
                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-sm"
                                onClick={() => window.open(`/admin/raporlar/service/${request.id}`, '_blank')}
                              >
                                <FileText className="w-4 h-4 mr-1.5" />
                                Servis Raporu
                              </Button>
                            )}

                            {(request.status === 'reviewing' || request.status === 'quoted') && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setQuotePrice(request.estimated_price?.toString() || '');
                                  setQuoteNotes(request.admin_notes || '');
                                  setIsQuoteModalOpen(true);
                                }}
                                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-sm"
                              >
                                <Send className="w-4 h-4 mr-1.5" />
                                {request.estimated_price ? 'Teklifi Güncelle' : 'Teklif Gönder'}
                              </Button>
                            )}

                            {request.status === 'approved' && (
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

        {/* Detay Modal */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Teknik Servis Talebi Detayları</DialogTitle>
              <DialogDescription>
                Talep No: {selectedRequest?.request_number}
              </DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                {/* Müşteri Bilgileri */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Müşteri Bilgileri
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600">Ad Soyad</p>
                      <p className="font-medium">{selectedRequest.customer?.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Email</p>
                      <p className="font-medium">{selectedRequest.customer?.email}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Telefon</p>
                      <p className="font-medium">{selectedRequest.customer?.phone}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">İlçe</p>
                      <p className="font-medium">{selectedRequest.customer?.district || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Cihaz Bilgileri */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Wrench className="w-4 h-4" />
                    Cihaz Bilgileri
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600">Cihaz Türü</p>
                      <p className="font-medium">{selectedRequest.product_type}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Marka</p>
                      <p className="font-medium">{selectedRequest.product_brand || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Model</p>
                      <p className="font-medium">{selectedRequest.product_model || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Garanti Durumu</p>
                      <p className="font-medium">{selectedRequest.warranty_status || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Sorun Açıklaması */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Sorun Açıklaması
                  </h4>
                  <p className="text-sm text-gray-800">{selectedRequest.problem_description}</p>
                  {selectedRequest.problem_category && (
                    <p className="text-xs text-gray-600 mt-2">Kategori: {selectedRequest.problem_category}</p>
                  )}
                </div>

                {/* Randevu Bilgileri */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Randevu Bilgileri
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditPreferredDate(selectedRequest.preferred_date.split('T')[0]);
                        setEditPreferredTime(selectedRequest.preferred_time || '');
                        setIsEditDateModalOpen(true);
                      }}
                      className="text-xs"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Randevu Değiştir
                    </Button>
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600">Tercih Edilen Tarih</p>
                      <p className="font-medium">
                        {format(new Date(selectedRequest.preferred_date), 'PPP', { locale: tr })}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Tercih Edilen Saat</p>
                      <p className="font-medium">{selectedRequest.preferred_time}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-600">Servis Adresi</p>
                      <p className="font-medium">{selectedRequest.service_address}</p>
                    </div>
                  </div>
                </div>

                {/* Fotoğraflar */}
                {selectedRequest.photos && selectedRequest.photos.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Cihaz Fotoğrafları ({selectedRequest.photos.length})
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedRequest.photos.map((photo) => (
                        <ImageWithFallback 
                          key={photo.id}
                          src={photo.photo_url}
                          alt="Cihaz fotoğrafı"
                          className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80"
                          onClick={() => window.open(photo.photo_url, '_blank')}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Durum ve Fiyat */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Banknote className="w-4 h-4" />
                    Durum ve Fiyat
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600">Durum</p>
                      <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                    </div>
                    <div>
                      <p className="text-gray-600">Tahmini Fiyat</p>
                      <p className="font-medium text-green-600">
                        {selectedRequest.estimated_price 
                          ? `${selectedRequest.estimated_price.toLocaleString('tr-TR')} ₺`
                          : 'Henüz verilmedi'}
                      </p>
                    </div>
                    {selectedRequest.final_price && (
                      <div>
                        <p className="text-gray-600">Final Fiyat</p>
                        <p className="font-medium text-blue-600">
                          {selectedRequest.final_price.toLocaleString('tr-TR')} ₺
                        </p>
                      </div>
                    )}
                    {selectedRequest.admin_notes && (
                      <div className="col-span-2">
                        <p className="text-gray-600">Admin Notu</p>
                        <p className="font-medium">{selectedRequest.admin_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
                Kapat
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Fiyat Teklifi Modal */}
        <Dialog open={isQuoteModalOpen} onOpenChange={setIsQuoteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedRequest?.estimated_price ? 'Fiyat Teklifini Güncelle' : 'Fiyat Teklifi Gönder'}
              </DialogTitle>
              <DialogDescription>
                {selectedRequest?.request_number} - {selectedRequest?.customer?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="quote-price">Tahmini Fiyat (₺) *</Label>
                <Input
                  id="quote-price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Örn: 500"
                  value={quotePrice}
                  onChange={(e) => setQuotePrice(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="quote-notes">Not (Opsiyonel)</Label>
                <Textarea
                  id="quote-notes"
                  placeholder="Fiyat hakkında açıklama..."
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsQuoteModalOpen(false)}>
                İptal
              </Button>
              <Button onClick={handleSendQuote} disabled={isSubmitting}>
                {isSubmitting 
                  ? (selectedRequest?.estimated_price ? 'Güncelleniyor...' : 'Gönderiliyor...') 
                  : (selectedRequest?.estimated_price ? 'Teklifi Güncelle' : 'Teklif Gönder')
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Durum Güncelleme Modal */}
        <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Durum Güncelle</DialogTitle>
              <DialogDescription>
                {selectedRequest?.request_number} - {selectedRequest?.customer?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-status">Yeni Durum *</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Durum seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Tamamlandı</SelectItem>
                    <SelectItem value="cancelled">İptal Edildi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newStatus === 'completed' && (
                <div>
                  <Label htmlFor="final-price">Final Fiyat (₺)</Label>
                  <Input
                    id="final-price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Örn: 500"
                    value={finalPrice}
                    onChange={(e) => setFinalPrice(e.target.value)}
                  />
                </div>
              )}
              <div>
                <Label htmlFor="status-note">Not (Opsiyonel)</Label>
                <Textarea
                  id="status-note"
                  placeholder="Durum değişikliği hakkında açıklama..."
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsStatusModalOpen(false)}>
                İptal
              </Button>
              <Button onClick={handleUpdateStatus} disabled={isSubmitting || !newStatus}>
                {isSubmitting ? 'Güncelleniyor...' : 'Güncelle'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Randevu Tarihi Değiştirme Modal */}
        <Dialog open={isEditDateModalOpen} onOpenChange={setIsEditDateModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Randevu Tarihi Değiştir
              </DialogTitle>
              <DialogDescription>
                {selectedRequest?.request_number} numaralı talebin randevu tarih ve saatini güncelleyin
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="edit-preferred-date">Randevu Tarihi *</Label>
                <Input
                  id="edit-preferred-date"
                  type="date"
                  value={editPreferredDate}
                  onChange={(e) => setEditPreferredDate(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="edit-preferred-time">Randevu Saati *</Label>
                <Input
                  id="edit-preferred-time"
                  type="time"
                  value={editPreferredTime}
                  onChange={(e) => setEditPreferredTime(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setIsEditDateModalOpen(false);
                    setEditPreferredDate('');
                    setEditPreferredTime('');
                  }}
                >
                  İptal
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleUpdatePreferredDate}
                  disabled={!editPreferredDate || !editPreferredTime}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Randevuyu Güncelle
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
                    <span className="text-gray-600">Cihaz:</span>
                    <span className="font-medium text-gray-900">{requestToDelete.product_type}</span>
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
                Bu işlem geri alınamaz! Tüm teknik servis talepleri ve ilgili veriler kalıcı olarak silinecek.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700 font-medium">
                  ⚠️ Dikkat: {requests.length} adet talep silinecek!
                </p>
                <p className="text-xs text-red-600 mt-2">
                  Bu işlem tüm teknik servis taleplerini, müşteri bilgilerini ve ilgili verileri kalıcı olarak silecektir.
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

      </div>
    </AdminLayout>
  );
}
