import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  Package, Clock, Truck, CheckCircle, XCircle, Banknote, Search, 
  Filter, MoreVertical, Eye, Edit, FileText, MapPin, Calendar, User, Phone, Check, Trash2, ExternalLink, AlertTriangle, StickyNote, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react@0.487.0';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  AdminDialog as Dialog,
  AdminDialogContent as DialogContent,
  AdminDialogDescription as DialogDescription,
  AdminDialogHeader as DialogHeader,
  AdminDialogTitle as DialogTitle,
  AdminDialogTrigger as DialogTrigger,
  AdminDialogFooter as DialogFooter,
} from '../../components/ui/admin-dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { ORDER_STATUS_CONFIG } from '../../types';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminOrders() {
  const { accessToken } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditStatusModalOpen, setIsEditStatusModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditDateModalOpen, setIsEditDateModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<any>(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [editDeliveryDate, setEditDeliveryDate] = useState('');
  const [editDeliveryTime, setEditDeliveryTime] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);

  // Backend'den siparişleri yükle
  useEffect(() => {
    if (accessToken) {
      loadOrders();
    }
  }, [accessToken]);

  const loadOrders = async () => {
    if (!accessToken) {
      console.error('❌ No access token - cannot load orders');
      toast.error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
      return;
    }

    try {
      setLoading(true);
      console.log('📦 Loading admin orders with access token...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/admin/orders`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('📦 Admin Orders Data:', data);
        console.log('📦 Orders Array:', data.orders);
        console.log('📦 Orders Count:', data.orders?.length || 0);
        
        // Her siparişin detaylarını logla
        if (data.orders && data.orders.length > 0) {
          data.orders.forEach((order: any, index: number) => {
            console.log(`📦 Order #${index + 1}:`, {
              id: order.id,
              order_number: order.order_number,
              customer: order.customer,
              items: order.items,
              itemsCount: order.items?.length,
              firstItem: order.items?.[0]
            });
          });
        }
        
        setOrders(data.orders || []);
        
        if (!data.orders || data.orders.length === 0) {
          toast.info('Henüz hiç sipariş yok');
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Backend error response status:', response.status);
        console.error('❌ Backend error body:', errorText);
        
        // Parse error message if JSON
        try {
          const errorData = JSON.parse(errorText);
          toast.error(errorData.error || `Siparişler yüklenemedi (${response.status})`);
          console.error('❌ Error details:', errorData.details);
        } catch {
          toast.error(`Siparişler yüklenemedi (${response.status}): ${errorText}`);
        }
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Siparişler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Status Options - Snake_Case database formatını kullan
  const statusOptions = [
    { value: 'payment_pending', label: 'Ödeme Bekliyor', icon: Clock, color: 'bg-amber-100 text-amber-700' },
    { value: 'order_received', label: 'Sipariş Alındı', icon: CheckCircle, color: 'bg-blue-100 text-blue-700' },
    { value: 'processing', label: 'Hazırlanıyor', icon: Package, color: 'bg-yellow-100 text-yellow-700' },
    { value: 'in_transit', label: 'Taşınıyor', icon: Truck, color: 'bg-orange-100 text-orange-700' },
    { value: 'delivered', label: 'Teslim Edildi', icon: CheckCircle, color: 'bg-purple-100 text-purple-700' },
    { value: 'cancelled', label: 'İptal Edildi', icon: XCircle, color: 'bg-red-100 text-red-700' },
  ];

  const getStatusConfig = (status: string) => {
    const config = statusOptions.find(opt => opt.value === status);
    return config || { value: status, label: status, icon: Package, color: 'bg-gray-100 text-gray-700' };
  };

  // Payment method label helper
  const getPaymentMethodLabel = (method: string) => {
    const methodMap: Record<string, string> = {
      'cash': 'Kapıda Ödeme',
      'bank': 'Havale/EFT',
      'online': 'Online Ödeme',
    };
    return methodMap[method] || method;
  };

  // Tam adres oluşturucu fonksiyon
  const getFullAddress = (order: any) => {
    const customer = order.customer;
    if (!customer) return 'N/A';
    
    // customer_info'dan tam adres bilgilerini al
    const customerInfo = order.customer_info || customer;
    
    const parts = [];
    if (customerInfo.neighborhood) parts.push(customerInfo.neighborhood);
    if (customerInfo.street) parts.push(customerInfo.street);
    if (customerInfo.building_no) parts.push(`No: ${customerInfo.building_no}`);
    if (customerInfo.apartment_no) parts.push(`Daire: ${customerInfo.apartment_no}`);
    
    const addressLine = parts.length > 0 ? parts.join(', ') : 'Adres bilgisi yok';
    const location = `${customerInfo.district || customer.district || 'N/A'} / ${customerInfo.city || customer.city || 'İzmir'}`;
    
    return `${addressLine}, ${location}`;
  };

  // Kısa adres (tablo için)
  const getShortAddress = (order: any) => {
    const customer = order.customer;
    if (!customer) return 'N/A';
    
    const customerInfo = order.customer_info || customer;
    
    const parts = [];
    if (customerInfo.neighborhood) parts.push(customerInfo.neighborhood);
    if (customerInfo.street) parts.push(customerInfo.street);
    
    if (parts.length > 0) {
      return parts.join(', ');
    }
    
    return `${customerInfo.district || customer.district || 'N/A'}`;
  };

  // Filtered Orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      (order.order_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customer?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customer?.phone || '').includes(searchQuery);
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Sorting fonksiyonu
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sıralanmış siparişler
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (!sortField) return 0;

    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    // Özel durumlar
    if (sortField === 'customer') {
      aValue = a.customer?.name || '';
      bValue = b.customer?.name || '';
    } else if (sortField === 'delivery_date') {
      aValue = new Date(a.delivery_date).getTime();
      bValue = new Date(b.delivery_date).getTime();
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

  // Status Stats - Snake_Case database format
  const statusStats = {
    all: orders.length,
    'payment_pending': orders.filter(o => o.status === 'payment_pending').length,
    'order_received': orders.filter(o => o.status === 'order_received').length,
    'processing': orders.filter(o => o.status === 'processing').length,
    'in_transit': orders.filter(o => o.status === 'in_transit').length,
    'delivered': orders.filter(o => o.status === 'delivered').length,
    'cancelled': orders.filter(o => o.status === 'cancelled').length,
  };

  // Status Update
  const handleStatusUpdate = async (orderId?: string, status?: string, skipModal: boolean = false) => {
    const targetOrderId = orderId || selectedOrder?.id;
    const targetStatus = status || newStatus;
    
    if (!targetOrderId || !targetStatus || !accessToken) return;

    console.log('[ADMIN-ORDERS] Updating status:', { targetOrderId, targetStatus });

    const toastId = toast.loading('Sipariş durumu güncelleniyor...');

    try {
      // Backend'e güncelleme isteği gönder
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/orders/${targetOrderId}/status`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: targetStatus,
            note: statusNote || 'Admin tarafından durum güncellendi',
            changedBy: 'Admin'
          }),
        }
      );

      toast.dismiss(toastId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Status update error:', errorText);
        console.error('❌ Failed order ID:', targetOrderId);
        toast.error('Sipariş durumu güncellenemedi!');
        return;
      }

      // Başarılı güncelleme sonrası local state güncelle
      setOrders(orders.map(order => {
        if (order.id === targetOrderId) {
          return {
            ...order,
            status: targetStatus,
            statusHistory: [
              ...(order.statusHistory || []),
              {
                status: targetStatus,
                date: new Date().toISOString(),
                note: statusNote || 'Durum güncellendi',
              },
            ],
          };
        }
        return order;
      }));

      toast.success('Sipariş durumu başarıyla güncellendi! ✅');
      
      if (!skipModal) {
        setIsEditStatusModalOpen(false);
        setNewStatus('');
        setStatusNote('');
      }
      
      // Detail Modal Update
      const updatedOrder = orders.find(o => o.id === targetOrderId);
      if (updatedOrder) {
        setSelectedOrder({
          ...updatedOrder,
          status: targetStatus,
        });
      }
    } catch (error) {
      toast.dismiss(toastId);
      console.error('Error updating status:', error);
      toast.error('Sipariş durumu güncellenirken bir hata oluştu');
    }
  };

  // Teslimat tarih/saat güncelleme
  const handleUpdateDeliveryDate = async () => {
    if (!selectedOrder || !editDeliveryDate || !editDeliveryTime || !accessToken) {
      toast.error('Lütfen tarih ve saat seçin');
      return;
    }

    const toastId = toast.loading('Teslimat tarihi güncelleniyor...');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/admin/orders/${selectedOrder.id}/delivery-date`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            delivery_date: editDeliveryDate,
            delivery_time: editDeliveryTime,
          }),
        }
      );

      toast.dismiss(toastId);

      if (response.ok) {
        toast.success('Teslimat tarihi başarıyla güncellendi! ✅');
        setIsEditDateModalOpen(false);
        setEditDeliveryDate('');
        setEditDeliveryTime('');
        loadOrders();
        if (isDetailModalOpen) {
          // Refresh selected order
          const updatedOrder = orders.find(o => o.id === selectedOrder.id);
          if (updatedOrder) {
            setSelectedOrder(updatedOrder);
          }
        }
      } else {
        toast.error('Teslimat tarihi güncellenemedi!');
      }
    } catch (error) {
      toast.dismiss(toastId);
      console.error('Error updating delivery date:', error);
      toast.error('Teslimat tarihi güncellenirken bir hata oluştu');
    }
  };

  // Tek sipariş silme
  const handleDeleteOrder = async () => {
    if (!orderToDelete || !accessToken) return;

    const toastId = toast.loading('Sipariş siliniyor...');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/admin/orders/${orderToDelete.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      toast.dismiss(toastId);

      if (!response.ok) {
        toast.error('Sipariş silinemedi!');
        return;
      }

      setOrders(orders.filter(o => o.id !== orderToDelete.id));
      toast.success('Sipariş başarıyla silindi! 🗑️');
      setIsDeleteModalOpen(false);
      setOrderToDelete(null);
    } catch (error) {
      toast.dismiss(toastId);
      console.error('Error deleting order:', error);
      toast.error('Sipariş silinirken bir hata oluştu');
    }
  };



  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl mb-2">Siparişler</h1>
          <p className="text-gray-600">Tüm siparişleri yönetin ve durumlarını güncelleyin</p>
        </div>

        {/* Statistic Cards */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* TÜMÜ - Lacivert */}
          <Card 
            className={`cursor-pointer transition-all hover:shadow-xl bg-gradient-to-br from-[#1e3a8a] to-[#1e3a8a]/80 text-white border-[#1e3a8a] ${statusFilter === 'all' ? 'ring-4 ring-[#1e3a8a]/30' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Package className="w-7 h-7 opacity-80 flex-shrink-0" />
                <div>
                  <p className="text-xs text-white/80 uppercase tracking-wide whitespace-nowrap">Tümü</p>
                  <p className="text-xl font-bold">{statusStats.all}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ÖDEME BEKLİYOR - Sarı/Amber */}
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg bg-gradient-to-br from-amber-50 to-white border-amber-200 ${statusFilter === 'payment_pending' ? 'ring-2 ring-amber-500' : ''}`}
            onClick={() => setStatusFilter('payment_pending')}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Clock className="w-7 h-7 text-amber-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide whitespace-nowrap">Ödeme Bek.</p>
                  <p className="text-xl font-bold text-amber-600">{statusStats.payment_pending || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SİPARİŞ ALINDI - Mavi */}
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg bg-gradient-to-br from-blue-50 to-white border-blue-200 ${statusFilter === 'order_received' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setStatusFilter('order_received')}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-7 h-7 text-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide whitespace-nowrap">Sipariş Alındı</p>
                  <p className="text-xl font-bold text-blue-600">{statusStats.order_received || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* HAZIRLANIYOR - Mor/Purple */}
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg bg-gradient-to-br from-purple-50 to-white border-purple-200 ${statusFilter === 'processing' ? 'ring-2 ring-purple-500' : ''}`}
            onClick={() => setStatusFilter('processing')}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Package className="w-7 h-7 text-purple-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide whitespace-nowrap">Hazırlanıyor</p>
                  <p className="text-xl font-bold text-purple-600">{statusStats.processing || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* TAŞINIYOR - Teal */}
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg bg-gradient-to-br from-teal-50 to-white border-teal-200 ${statusFilter === 'in_transit' ? 'ring-2 ring-teal-500' : ''}`}
            onClick={() => setStatusFilter('in_transit')}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Truck className="w-7 h-7 text-teal-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide whitespace-nowrap">Taşınıyor</p>
                  <p className="text-xl font-bold text-teal-600">{statusStats.in_transit || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* TESLİM EDİLDİ - Yeşil */}
          <Card 
            className={`cursor-pointer transition-all hover:shadow-xl bg-gradient-to-br from-green-600 to-green-500 text-white border-green-600 ${statusFilter === 'delivered' ? 'ring-4 ring-green-300' : ''}`}
            onClick={() => setStatusFilter('delivered')}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-7 h-7 opacity-80 flex-shrink-0" />
                <div>
                  <p className="text-xs text-white/80 uppercase tracking-wide whitespace-nowrap">Teslim Edildi</p>
                  <p className="text-xl font-bold">{statusStats.delivered || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* İPTAL EDİLDİ - Kırmızı */}
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg bg-gradient-to-br from-red-50 to-white border-red-200 ${statusFilter === 'cancelled' ? 'ring-2 ring-red-500' : ''}`}
            onClick={() => setStatusFilter('cancelled')}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <XCircle className="w-7 h-7 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide whitespace-nowrap">İptal Edildi</p>
                  <p className="text-xl font-bold text-red-600">{statusStats.cancelled || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Sipariş no, müşteri adı veya telefon ile ara..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Durum Filtrele" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Siparişler</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Orders Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th 
                      className="text-left p-4 min-w-[150px] cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleSort('order_number')}
                    >
                      <div className="flex items-center gap-2">
                        Sipariş No
                        {sortField === 'order_number' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-left p-4 min-w-[200px] cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleSort('customer')}
                    >
                      <div className="flex items-center gap-2">
                        Müşteri
                        {sortField === 'customer' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-center p-4 min-w-[150px] cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center gap-2 justify-center">
                        Sipariş Tarihi
                        {sortField === 'created_at' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th className="text-center p-4 min-w-[80px]">Fotoğraf</th>
                    <th className="text-left p-4 min-w-[200px]">Ürün Başlığı</th>
                    <th 
                      className="text-center p-4 min-w-[130px] cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleSort('total_amount')}
                    >
                      <div className="flex items-center gap-2 justify-center">
                        Toplam
                        {sortField === 'total_amount' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-center p-4 min-w-[140px] cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleSort('payment_method')}
                    >
                      <div className="flex items-center gap-2 justify-center">
                        Ödeme
                        {sortField === 'payment_method' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-center p-4 min-w-[150px] cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleSort('delivery_date')}
                    >
                      <div className="flex items-center gap-2 justify-center">
                        Teslim Tarihi
                        {sortField === 'delivery_date' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-center p-4 min-w-[150px] cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-2 justify-center">
                        Durum
                        {sortField === 'status' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-30" />
                        )}
                      </div>
                    </th>
                    <th className="text-center p-4 min-w-[150px]">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">Sipariş bulunamadı</p>
                      </td>
                    </tr>
                  ) : (
                    sortedOrders.map((order) => {
                      const statusConfig = getStatusConfig(order.status);
                      const StatusIcon = statusConfig.icon;
                      
                      return (
                        <tr key={order.id} className={`hover:bg-gray-50/80 transition-colors border-l-4 ${
                          order.status === 'delivered' ? 'border-l-green-400 bg-green-50/20' :
                          order.status === 'in_transit' ? 'border-l-orange-400 bg-orange-50/20' :
                          order.status === 'processing' ? 'border-l-blue-400 bg-blue-50/20' :
                          order.status === 'cancelled' ? 'border-l-red-400 bg-red-50/20' :
                          'border-l-gray-200'
                        }`}>
                          <td className="p-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-[#1e3a8a] bg-[#1e3a8a]/5 px-2 py-1 rounded">
                                  {order.order_number}
                                </span>
                                {order.notes && (
                                  <div className="relative group">
                                    <StickyNote className="w-4 h-4 text-amber-600" />
                                    <div className="absolute left-0 top-6 hidden group-hover:block z-10 w-72 p-3 bg-amber-50 border-2 border-amber-200 rounded-lg shadow-xl text-xs text-gray-800">
                                      <p className="font-bold text-amber-900 mb-1.5">📝 Müşteri Notu:</p>
                                      <p className="leading-relaxed">{order.notes}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-[#f97316]" />
                                <p className="text-sm font-semibold text-gray-900">{order.customer?.name || 'N/A'}</p>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Phone className="w-3 h-3" />
                                <span>{order.customer?.phone || 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <MapPin className="w-3 h-3" />
                                <span className="line-clamp-1" title={getFullAddress(order)}>{getShortAddress(order)}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            {order.created_at ? (
                              <>
                                <div className="text-sm text-gray-700">
                                  {new Date(order.created_at).toLocaleDateString('tr-TR', { 
                                    day: 'numeric', 
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {new Date(order.created_at).toLocaleTimeString('tr-TR', { 
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          {/* Fotoğraf */}
                          <td className="p-4">
                            {order.items?.[0] ? (
                              <div className="flex justify-center">
                                <div className="relative group cursor-pointer">
                                  <img 
                                    src={order.items[0].product_snapshot?.image || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200'} 
                                    alt={order.items[0].product_snapshot?.title || 'Ürün'}
                                    className="w-16 h-16 object-cover rounded-lg shadow-md ring-2 ring-gray-100 group-hover:scale-105 transition-transform duration-200"
                                  />
                                  {order.items.length > 1 && (
                                    <div 
                                      className="absolute -top-1 -right-1 bg-[#1e3a8a] text-white text-xs px-1.5 py-0.5 rounded-full font-bold shadow-lg cursor-help"
                                      title={order.items.map((item: any, idx: number) => `${idx + 1}. ${item.product_snapshot?.title || 'Ürün'}`).join('\n')}
                                    >
                                      +{order.items.length - 1}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                                  <span className="text-gray-400 text-xs">Yok</span>
                                </div>
                              </div>
                            )}
                          </td>
                          
                          {/* Ürün Başlığı */}
                          <td className="p-4">
                            {order.items?.[0] ? (
                              <div className="min-w-0 max-w-[250px] relative group">
                                <p 
                                  className="text-sm font-semibold text-gray-900 line-clamp-2 cursor-pointer hover:text-[#1e3a8a] transition-colors" 
                                >
                                  {order.items[0].product_snapshot?.title || 'Ürün'}
                                </p>
                                {/* Tooltip */}
                                <div className="absolute left-0 top-full mt-2 z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200">
                                  <div className="bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-xl max-w-sm whitespace-normal">
                                    {order.items[0].product_snapshot?.title || 'Ürün'}
                                    {order.items.length > 1 && (
                                      <div className="mt-2 pt-2 border-t border-white/20 text-xs">
                                        {order.items.slice(1).map((item: any, idx: number) => (
                                          <div key={idx} className="mt-1">
                                            {idx + 2}. {item.product_snapshot?.title || 'Ürün'}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                                  </div>
                                </div>
                                {order.items.length > 1 && (
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    Toplam {order.items.length} ürün
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className="text-center">
                                <p className="text-sm text-gray-400 italic">Ürün bilgisi yok</p>
                                <p className="text-xs text-gray-400 mt-1">(Eski sipariş)</p>
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <div className="inline-flex items-center gap-1 bg-gradient-to-r from-[#f97316]/10 to-[#f97316]/5 px-3 py-2 rounded-lg">
                              <Banknote className="w-4 h-4 text-[#f97316]" />
                              <p className="font-bold text-[#1e3a8a]">
                                {(order.total || 0).toLocaleString('tr-TR')} ₺
                              </p>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <Badge variant="outline" className="text-xs font-semibold border-2">
                              {getPaymentMethodLabel(order.payment_method)}
                            </Badge>
                          </td>
                          <td className="p-4 text-center">
                            <div className="bg-purple-50 px-2 py-2 rounded-lg inline-block">
                              <p className="text-sm font-semibold text-gray-900">
                                {new Date(order.delivery_date).toLocaleDateString('tr-TR', { 
                                  day: 'numeric', 
                                  month: 'short' 
                                })}
                              </p>
                              <p className="text-xs text-gray-600 mt-0.5">{order.delivery_time}</p>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  className={`${statusConfig.color} gap-1.5 px-3 py-1.5 shadow-sm border-2 hover:opacity-80 transition-opacity ${
                                    order.status === 'delivered' ? 'border-green-300 ring-2 ring-green-100' : ''
                                  } ${order.status === 'cancelled' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                  disabled={order.status === 'cancelled'}
                                  title={order.status === 'cancelled' ? 'İptal edilmiş siparişin durumu değiştirilemez' : 'Durumu değiştirmek için tıklayın'}
                                >
                                  <StatusIcon className="w-4 h-4" />
                                  <span className="font-semibold">{statusConfig.label}</span>
                                </Button>
                              </DropdownMenuTrigger>
                              {order.status !== 'cancelled' && (
                                <DropdownMenuContent align="center" className="w-56">
                                  {statusOptions.map((option) => (
                                    <DropdownMenuItem
                                      key={option.value}
                                      onClick={() => {
                                        setSelectedOrder(order);
                                        setNewStatus(option.value);
                                        setIsEditStatusModalOpen(true);
                                      }}
                                      disabled={order.status === option.value}
                                      className={`flex items-center gap-2 ${order.status === option.value ? 'bg-blue-50' : ''}`}
                                    >
                                      <option.icon className="w-4 h-4" />
                                      <span>{option.label}</span>
                                      {order.status === option.value && (
                                        <Check className="w-4 h-4 ml-auto text-blue-600" />
                                      )}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              )}
                            </DropdownMenu>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setIsDetailModalOpen(true);
                                }}
                                title="Detayları Gör"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setNewStatus(order.status);
                                  setIsEditStatusModalOpen(true);
                                }}
                                title={order.status === 'cancelled' ? 'İptal edilmiş siparişin durumu değiştirilemez' : 'Durumu Güncelle'}
                                disabled={order.status === 'cancelled'}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>

                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  setOrderToDelete(order);
                                  setIsDeleteModalOpen(true);
                                }}
                                title="Siparişi Sil"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>

                              {order.status === 'delivered' && (
                                <Link to={`/admin/raporlar/siparis/${order.id}`} target="_blank">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0 text-teal-600 hover:text-teal-700"
                                    title="Sipariş Raporu (Yeni Sekmede Aç)"
                                  >
                                    <FileText className="w-4 h-4" />
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Order Detail Modal */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-600" />
                Sipariş Detayı{selectedOrder ? ` - ${selectedOrder.order_number}` : ''}
              </DialogTitle>
              <DialogDescription>
                {selectedOrder ? (
                  <>Sipariş Tarihi: {new Date(selectedOrder.created_at).toLocaleDateString('tr-TR', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</>
                ) : (
                  'Sipariş bilgileri yükleniyor...'
                )}
              </DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <>

                <div className="space-y-6 mt-4">
                  {/* Customer Information */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600" />
                      Müşteri Bilgileri
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Ad Soyad</p>
                        <p className="text-sm text-gray-900">{selectedOrder.customer?.name || 'N/A'}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Telefon</p>
                        <p className="text-sm text-gray-900">{selectedOrder.customer?.phone || 'N/A'}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                        <p className="text-xs text-gray-500 mb-1">E-posta</p>
                        <p className="text-sm text-gray-900">{selectedOrder.customer?.email || 'N/A'}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                        <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          Teslimat Adresi
                        </p>
                        <p className="text-sm text-gray-900">
                          {getFullAddress(selectedOrder)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      Sipariş Ürünleri ({selectedOrder.items.length} Adet)
                    </h3>
                    <div className="space-y-2">
                      {selectedOrder.items.map((item: any, idx: number) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded-lg flex items-center gap-3">
                          <img 
                            src={item.product_snapshot?.image || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200'} 
                            alt={item.product_snapshot?.title || 'Ürün'}
                            className="w-16 h-16 object-cover rounded"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{item.product_snapshot?.title || 'Ürün'}</p>
                            <p className="text-xs text-gray-500">Adet: {item.quantity || 1}</p>
                            {/* Ürün Detay Sayfası Butonu */}
                            {item.product_id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 mt-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => {
                                  window.open(`/urunler/${item.product_id}`, '_blank');
                                }}
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Ürün Sayfası
                              </Button>
                            )}
                          </div>
                          <p className="font-bold text-[#1e3a8a]">
                            {(item.price || 0).toLocaleString('tr-TR')} ₺
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment and Delivery */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Banknote className="w-4 h-4 text-blue-600" />
                        Ödeme Bilgileri
                      </h3>
                      <div className="space-y-2">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Ödeme Yöntemi</p>
                          <p className="text-sm text-gray-900">{getPaymentMethodLabel(selectedOrder.payment_method)}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Toplam Tutar</p>
                          <p className="text-lg font-bold text-[#1e3a8a]">
                            {(selectedOrder.total || 0).toLocaleString('tr-TR')} ₺
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-blue-600" />
                          Teslimat Bilgileri
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditDeliveryDate(selectedOrder.delivery_date.split('T')[0]);
                            setEditDeliveryTime(selectedOrder.delivery_time || '');
                            setIsEditDateModalOpen(true);
                          }}
                          className="text-xs"
                        >
                          <Calendar className="w-3 h-3 mr-1" />
                          Tarih Değiştir
                        </Button>
                      </h3>
                      <div className="space-y-2">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Teslimat Tarihi</p>
                          <p className="text-sm text-gray-900">
                            {new Date(selectedOrder.delivery_date).toLocaleDateString('tr-TR', { 
                              day: 'numeric', 
                              month: 'long', 
                              year: 'numeric' 
                            })}
                          </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Zaman Aralığı</p>
                          <p className="text-sm text-gray-900">{selectedOrder.delivery_time || 'N/A'}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Teslimat Şekli</p>
                          <p className="text-sm text-gray-900">{selectedOrder.delivery_method || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Customer Notes */}
                  {selectedOrder.notes && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <StickyNote className="w-4 h-4 text-amber-600" />
                        Müşteri Notu
                      </h3>
                      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedOrder.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Status History */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      Durum Geçmişi
                    </h3>
                    <div className="space-y-3">
                      {(selectedOrder.statusHistory || []).map((history: any, idx: number) => {
                        const status = history.new_status || history.status;
                        const config = getStatusConfig(status);
                        const HistoryIcon = config.icon;
                        return (
                          <div key={idx} className="flex gap-3">
                            <div className="relative">
                              <div className={`w-8 h-8 rounded-full ${config.color} flex items-center justify-center`}>
                                <HistoryIcon className="w-4 h-4" />
                              </div>
                              {idx < selectedOrder.statusHistory.length - 1 && (
                                <div className="absolute top-8 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-gray-300" />
                              )}
                            </div>
                            <div className="flex-1 pb-6">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-gray-900">{config.label}</p>
                                <Badge variant="outline" className="text-xs">
                                  {(history.changed_at || history.date) ? new Date(history.changed_at || history.date).toLocaleDateString('tr-TR', { 
                                    day: 'numeric', 
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : '-'}
                                </Badge>
                              </div>
                              {history.note && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mt-1">
                                  <p className="text-xs font-medium text-amber-800 mb-0.5">💬 Not:</p>
                                  <p className="text-sm text-amber-900">{history.note}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick Status Update */}
                  <div className="border-t pt-4 space-y-2">
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400"
                      onClick={() => {
                        setNewStatus(selectedOrder.status);
                        setIsEditStatusModalOpen(true);
                      }}
                      disabled={selectedOrder.status === 'cancelled'}
                      title={selectedOrder.status === 'cancelled' ? 'İptal edilmiş siparişin durumu değiştirilemez' : ''}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      {selectedOrder.status === 'cancelled' ? 'Sipariş İptal Edilmiş' : 'Sipariş Durumunu Güncelle'}
                    </Button>
                    
                    {/* Sipariş Silme Butonu */}
                    <Button 
                      variant="outline"
                      className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-400"
                      onClick={() => {
                        setOrderToDelete(selectedOrder);
                        setIsDeleteModalOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Siparişi Sil (Kalıcı)
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Status Update Modal */}
        <Dialog open={isEditStatusModalOpen} onOpenChange={setIsEditStatusModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Sipariş Durumunu Güncelle</DialogTitle>
              <DialogDescription>
                {selectedOrder?.order_number} numaralı siparişin durumunu güncelleyin
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* Current Status */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Mevcut Durum</p>
                <Badge className={getStatusConfig(selectedOrder?.status || '').color}>
                  {getStatusConfig(selectedOrder?.status || '').label}
                </Badge>
              </div>

              {/* New Status */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Yeni Durum *
                </label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Durum seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => {
                      const Icon = status.icon;
                      return (
                        <SelectItem key={status.value} value={status.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {status.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Note */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Not (Opsiyonel)
                </label>
                <Textarea
                  placeholder="Durum değişikliği hakkında not ekleyin..."
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setIsEditStatusModalOpen(false);
                    setNewStatus('');
                    setStatusNote('');
                  }}
                >
                  İptal
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={() => handleStatusUpdate()}
                  disabled={!newStatus || newStatus === selectedOrder?.status}
                >
                  Güncelle
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Teslimat Tarihi Değiştirme Modal */}
        <Dialog open={isEditDateModalOpen} onOpenChange={setIsEditDateModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Teslimat Tarihi Değiştir
              </DialogTitle>
              <DialogDescription>
                {selectedOrder?.order_number} numaralı siparişin teslimat tarih ve saatini güncelleyin
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="edit-delivery-date">Teslimat Tarihi *</Label>
                <Input
                  id="edit-delivery-date"
                  type="date"
                  value={editDeliveryDate}
                  onChange={(e) => setEditDeliveryDate(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="edit-delivery-time">Teslimat Saati *</Label>
                <Input
                  id="edit-delivery-time"
                  type="time"
                  value={editDeliveryTime}
                  onChange={(e) => setEditDeliveryTime(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setIsEditDateModalOpen(false);
                    setEditDeliveryDate('');
                    setEditDeliveryTime('');
                  }}
                >
                  İptal
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleUpdateDeliveryDate}
                  disabled={!editDeliveryDate || !editDeliveryTime}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Tarihi Güncelle
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Order Modal */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Siparişi Sil
              </DialogTitle>
              <DialogDescription>
                Bu işlem geri alınamaz ve kalıcı olarak silinecektir.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* Warning Box */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900 mb-1">
                      {orderToDelete?.order_number} numaralı sipariş silinecek
                    </p>
                    <p className="text-sm text-red-700">
                      Bu işlem geri alınamaz. Sipariş hem admin panelinden hem de kullanıcı tarafından kalıcı olarak görünmez olacak.
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Details */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sipariş No:</span>
                  <span className="font-medium text-gray-900">{orderToDelete?.order_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Müşteri:</span>
                  <span className="font-medium text-gray-900">{orderToDelete?.customer?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tutar:</span>
                  <span className="font-medium text-gray-900">{(orderToDelete?.total || 0).toLocaleString('tr-TR')} ₺</span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setOrderToDelete(null);
                  }}
                >
                  İptal
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={async () => {
                    if (!accessToken) {
                      toast.error('Oturum bulunamadı');
                      return;
                    }
                    const toastId = toast.loading('Sipariş siliniyor...');
                    try {
                      const response = await fetch(
                        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/admin/orders/${orderToDelete.id}`,
                        {
                          method: 'DELETE',
                          headers: {
                            'Authorization': `Bearer ${accessToken}`,
                          },
                        }
                      );

                      toast.dismiss(toastId);

                      if (response.ok) {
                        toast.success('Sipariş başarıyla silindi');
                        setIsDeleteModalOpen(false);
                        setIsDetailModalOpen(false); // Close detail modal too
                        setOrderToDelete(null);
                        loadOrders(); // Refresh
                      } else {
                        const errorData = await response.json();
                        toast.error(errorData.error || 'Sipariş silinemedi');
                      }
                    } catch (error) {
                      toast.dismiss(toastId);
                      console.error('Error deleting order:', error);
                      toast.error('Sipariş silinirken hata oluştu');
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Siparişi Sil
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </AdminLayout>
  );
}