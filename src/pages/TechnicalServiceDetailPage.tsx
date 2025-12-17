import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Wrench, MapPin, Calendar, ArrowLeft, Phone, Mail, User, Clock, CheckCircle2, AlertCircle, FileText, Home, Banknote, XCircle, ThumbsUp, Package } from 'lucide-react@0.487.0';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner@2.0.3';
import { useAuth } from '../contexts/AuthContext';
import { projectId } from '../utils/supabase/info';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

export default function TechnicalServiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const [request, setRequest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResponding, setIsResponding] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // Talep detaylarını yükle
  useEffect(() => {
    const loadRequestDetails = async () => {
      if (!user || !accessToken) {
        toast.error('Lütfen giriş yapın');
        navigate('/giris');
        return;
      }

      try {
        setIsLoading(true);
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

        if (response.ok) {
          const data = await response.json();
          console.log('🔍 Technical Service Requests:', data.requests);
          const foundRequest = data.requests.find((r: any) => r.id.toString() === id);
          if (foundRequest) {
            console.log('✅ Found Request:', foundRequest);
            console.log('📷 Photos:', foundRequest.photos);
            setRequest(foundRequest);
          } else {
            toast.error('Talep bulunamadı');
            navigate('/hesabim/teknik-servis');
          }
        } else {
          toast.error('Talep yüklenirken bir hata oluştu');
        }
      } catch (error) {
        console.error('[TECH SERVICE DETAIL] Talep detay yükleme hatası:', error);
        toast.error('Teknik servis detayları yüklenirken bir hata oluştu');
      } finally {
        setIsLoading(false);
      }
    };

    loadRequestDetails();
  }, [id, user, accessToken, navigate]);

  // Fiyat teklifini kabul et
  const handleApprovePrice = async () => {
    if (isResponding) return;
    
    try {
      setIsResponding(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/technical-service/${id}/respond`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ response: 'approved' }),
        }
      );

      if (response.ok) {
        toast.success('✅ Fiyat teklifi onaylandı! Teknisyenimiz belirlenen tarihte adresinize gelecektir.');
        setRequest({ ...request, status: 'approved' });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Bir hata oluştu');
      }
    } catch (error) {
      console.error('Error approving price:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setIsResponding(false);
    }
  };

  // Fiyat teklifini reddet
  const handleRejectPrice = async () => {
    if (isResponding) return;
    
    try {
      setIsResponding(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/technical-service/${id}/respond`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ response: 'rejected' }),
        }
      );

      if (response.ok) {
        toast.error('Fiyat teklifi reddedildi. Talebiniz iptal edildi.');
        setRequest({ ...request, status: 'cancelled' });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Bir hata oluştu');
      }
    } catch (error) {
      console.error('Error rejecting price:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setIsResponding(false);
    }
  };

  // Talebi iptal et (sadece reviewing durumunda)
  const handleCancelRequest = async () => {
    if (isCancelling) return;
    
    try {
      setIsCancelling(true);
      setCancelDialogOpen(false);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/technical-service/${id}/cancel`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        toast.success('Talep başarıyla iptal edildi.');
        setRequest({ ...request, status: 'cancelled' });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Bir hata oluştu');
      }
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setIsCancelling(false);
    }
  };

  // İptal edilebilir mi kontrol et
  const canCancelRequest = (status: string) => {
    return status === 'reviewing' || status === 'quoted';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
      reviewing: { label: 'İnceleniyor', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: Clock },
      quoted: { label: 'Fiyat Teklifi Verildi', color: 'text-blue-700', bg: 'bg-blue-100', icon: Banknote },
      approved: { label: 'Onaylandı', color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle2 },
      in_progress: { label: 'Servis Devam Ediyor', color: 'text-orange-700', bg: 'bg-orange-100', icon: Wrench },
      completed: { label: 'Tamamlandı', color: 'text-purple-700', bg: 'bg-purple-100', icon: CheckCircle2 },
      cancelled: { label: 'İptal Edildi', color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
    };

    const config = statusConfig[status] || { label: status, color: 'text-gray-700', bg: 'bg-gray-100', icon: Clock };
    const Icon = config.icon;
    
    return (
      <div className={`${config.bg} ${config.color} px-4 py-2 rounded-xl font-medium flex items-center gap-2`}>
        <Icon className="w-5 h-5" />
        {config.label}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f97316] mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-24">
        <Card className="p-8 text-center">
          <p className="text-gray-600 mb-4">Talep bulunamadı</p>
          <Link to="/hesabim/teknik-servis">
            <Button>Taleplerime Dön</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-gray-50 via-white to-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-[var(--brand-orange-600)]/30 via-[var(--brand-orange-500)]/30 to-[var(--brand-coral-500)]/30 text-white py-10 pt-24">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Link to="/hesabim">
                <Button variant="ghost" className="text-white hover:bg-white/20" size="sm">
                  <Home className="w-4 h-4 mr-2" />
                  Hesabıma Dön
                </Button>
              </Link>
              <Link to="/hesabim/teknik-servis">
                <Button variant="ghost" className="text-white hover:bg-white/20" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Taleplerime Dön
                </Button>
              </Link>
            </div>
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-white to-gray-100 rounded-xl flex items-center justify-center shadow-xl">
                  <Wrench className="w-7 h-7 text-[#f97316]" />
                </div>
                <div>
                  <h1 className="text-2xl mb-1 drop-shadow-lg font-bold">Teknik Servis Detayları</h1>
                  <p className="text-white/90 text-sm font-medium drop-shadow">
                    Talep #{request.request_number}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-start lg:items-end gap-1.5">
                {getStatusBadge(request.status)}
                {request.estimated_price && (
                  <div className="text-left lg:text-right">
                    <p className="text-xs text-gray-300">Teklif Edilen Fiyat</p>
                    <p className="text-xl font-bold">{request.estimated_price.toLocaleString('tr-TR')} ₺</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Fiyat Teklifi Onay/Red Bölümü */}
          {request.status === 'quoted' && request.estimated_price && (
            <Card className="shadow-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                    <Banknote className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-blue-900">Fiyat Teklifi Geldi!</h3>
                    <p className="text-sm text-blue-700">Teklifimizi inceleyip onaylayabilir veya reddedebilirsiniz.</p>
                  </div>
                </div>
                
                <div className="bg-white p-5 rounded-xl border-2 border-blue-300 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">Tahmini Fiyat:</span>
                    <span className="text-3xl font-bold text-[#1e3a8a]">{request.estimated_price.toLocaleString('tr-TR')} ₺</span>
                  </div>
                  {request.admin_notes && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-gray-600 mb-1">📝 Not:</p>
                      <p className="text-sm text-gray-800">{request.admin_notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={handleApprovePrice} 
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    disabled={isResponding}
                  >
                    <ThumbsUp className="w-4 h-4 mr-2" />
                    Teklifi Onayla
                  </Button>
                  <Button 
                    onClick={handleRejectPrice} 
                    variant="outline" 
                    className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                    disabled={isResponding}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reddet
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Cihaz Bilgileri */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-white border-b p-4">
                <CardTitle className="flex items-center gap-2 text-[#f97316] text-base">
                  <Wrench className="w-5 h-5" />
                  Cihaz Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 text-[#f97316]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-0.5">Cihaz Türü</p>
                      <p className="font-medium text-sm text-gray-800">{request.product_type}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Wrench className="w-5 h-5 text-[#f97316]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-0.5">Marka</p>
                      <p className="font-medium text-sm text-gray-800">{request.product_brand || '-'}</p>
                    </div>
                  </div>

                  {request.product_model && (
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Wrench className="w-5 h-5 text-[#f97316]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-0.5">Model</p>
                        <p className="font-medium text-sm text-gray-800">{request.product_model}</p>
                      </div>
                    </div>
                  )}

                  {request.warranty_status && (
                    <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                      <p className="text-xs text-blue-600 mb-0.5 font-medium">🛡️ Garanti Durumu</p>
                      <p className="font-medium text-sm text-blue-800">{request.warranty_status}</p>
                    </div>
                  )}

                  {request.problem_category && (
                    <div className="p-3 bg-amber-50 rounded-lg border-l-4 border-amber-500">
                      <p className="text-xs text-amber-600 mb-0.5 font-medium">🔖 Sorun Kategorisi</p>
                      <p className="font-medium text-sm text-amber-800">{request.problem_category}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Randevu Bilgileri */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-white border-b p-4">
                <CardTitle className="flex items-center gap-2 text-[#f97316] text-base">
                  <Calendar className="w-5 h-5" />
                  Randevu Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-[#f97316]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Tercih Edilen Tarih</p>
                      <p className="font-medium text-sm text-gray-800">
                        {request.preferred_date && format(new Date(request.preferred_date), 'PPP', { locale: tr })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-[#f97316]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Tercih Edilen Saat</p>
                      <p className="font-medium text-sm text-gray-800">{request.preferred_time}</p>
                    </div>
                  </div>

                  {request.completed_at && (
                    <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Tamamlanma Tarihi</p>
                        <p className="font-medium text-sm text-gray-800">
                          {format(new Date(request.completed_at), 'PPP', { locale: tr })}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-[#f97316]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Servis Adresi</p>
                      {/* Detaylı adres bilgileri */}
                      <div className="space-y-0.5">
                        {request.service_neighborhood && (
                          <p className="font-medium text-sm text-gray-800">{request.service_neighborhood}</p>
                        )}
                        {request.service_street && (
                          <p className="text-sm text-gray-700">{request.service_street}</p>
                        )}
                        {(request.service_building_no || request.service_apartment_no) && (
                          <p className="text-sm text-gray-700">
                            {request.service_building_no && `No: ${request.service_building_no}`}
                            {request.service_building_no && request.service_apartment_no && ' / '}
                            {request.service_apartment_no && `Daire: ${request.service_apartment_no}`}
                          </p>
                        )}
                        <p className="text-xs text-gray-600 mt-1 font-medium">
                          {[request.service_district, request.service_city].filter(Boolean).join(' / ')}
                        </p>
                      </div>
                      
                      {/* Eğer yeni yapı yoksa eski yapıyı göster (fallback) */}
                      {!request.service_neighborhood && !request.service_street && (
                        <p className="font-medium text-sm text-gray-800">{request.service_address}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sorun Açıklaması */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-white border-b p-4">
              <CardTitle className="flex items-center gap-2 text-[#f97316] text-base">
                <AlertCircle className="w-5 h-5" />
                Sorun Açıklaması
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#f97316] to-[#fb923c] rounded-full"></div>
                <div className="pl-5 pr-4 py-4 bg-gradient-to-br from-orange-50/50 to-white rounded-xl border border-orange-100">
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{request.problem_description}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fotoğraflar */}
          {request.photos && request.photos.length > 0 ? (
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-white border-b p-4">
                <CardTitle className="flex items-center gap-2 text-[#f97316] text-base">
                  <FileText className="w-5 h-5" />
                  Cihaz Fotoğrafları ({request.photos.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {request.photos.map((photo: any, index: number) => (
                    <div key={photo.id} className="group relative">
                      <div className="aspect-square overflow-hidden rounded-xl border-2 border-gray-200 shadow-md hover:shadow-xl transition-all duration-300">
                        <ImageWithFallback 
                          src={photo.photo_url} 
                          alt={`Cihaz ${index + 1}`} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                        {index + 1}/{request.photos.length}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b p-4">
                <CardTitle className="flex items-center gap-2 text-gray-600 text-base">
                  <FileText className="w-5 h-5" />
                  Cihaz Fotoğrafları
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Henüz fotoğraf eklenmedi</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Güncelleme Geçmişi */}
          {request.updates && request.updates.length > 0 && (
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-white border-b p-4">
                <CardTitle className="flex items-center gap-2 text-[#f97316] text-base">
                  <Clock className="w-5 h-5" />
                  Güncelleme Geçmişi
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {request.updates.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((update: any) => (
                    <div key={update.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-[#f97316] rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-800 font-medium">{update.note}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(update.created_at), 'PPp', { locale: tr })}
                          {update.created_by && ` • ${update.created_by === 'admin' ? 'Admin' : update.created_by === 'customer' ? 'Müşteri' : 'Sistem'}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* İptal Butonu - MyOrdersPage gibi */}
          {canCancelRequest(request.status) && (
            <Card className="shadow-lg border-red-200 bg-red-50/50">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 flex-1">
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-red-900 mb-0.5">Talebi İptal Et</h4>
                      <p className="text-xs text-red-700">
                        Bu talebi iptal etmek istiyorsanız, aşağıdaki butona tıklayabilirsiniz.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-500 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm whitespace-nowrap"
                    onClick={() => setCancelDialogOpen(true)}
                    disabled={isCancelling}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />
                    İptal Et
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      {/* İptal Onay Dialog'u */}
      {cancelDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <XCircle className="w-6 h-6" />
                Talebi İptal Et
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-6">
                <strong>#{request.request_number}</strong> numaralı teknik servis talebinizi iptal etmek istediğinizden emin misiniz? 
                Bu işlem geri alınamaz.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCancelDialogOpen(false)}
                  className="flex-1"
                  disabled={isCancelling}
                >
                  Vazgeç
                </Button>
                <Button
                  onClick={handleCancelRequest}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  disabled={isCancelling}
                >
                  {isCancelling ? 'İptal Ediliyor...' : 'Talebi İptal Et'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
