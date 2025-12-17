import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Download, Printer, Package, Calendar, Banknote, MapPin, User, Phone, Mail, FileText } from 'lucide-react@0.487.0';
import { Button } from '../components/ui/button';
import { ORDER_STATUS_CONFIG } from '../types';
import { projectId } from '../utils/supabase/info';
import { useAuth } from '../contexts/AuthContext';

export default function ReportViewPage() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { accessToken } = useAuth();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Admin mi customer mı kontrol et
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Geri dönüş URL'ini belirle
  const getBackUrl = () => {
    if (isAdminRoute) {
      if (type === 'order' || type === 'siparis') return '/admin/siparisler';
      if (type === 'service') return '/admin/teknik-servis';
      if (type === 'moving') return '/admin/nakliye';
      return '/admin/hizli-erisim';
    }
    
    if (type === 'order' || type === 'siparis') return '/hesabim/siparislerim';
    if (type === 'service') return '/hesabim/teknik-servis';
    if (type === 'moving') return '/hesabim/nakliye';
    if (type === 'sell') return '/hesabim/satis-taleplerim';
    return '/hesabim/raporlarim';
  };

  const getBackButtonText = () => {
    if (isAdminRoute) {
      if (type === 'order' || type === 'siparis') return 'Siparişlere Dön';
      if (type === 'service') return 'Teknik Servise Dön';
      if (type === 'moving') return 'Nakliyeye Dön';
      return 'Admin Panele Dön';
    }
    
    if (type === 'order' || type === 'siparis') return 'Siparişlerime Dön';
    if (type === 'service') return 'Servislerime Dön';
    if (type === 'moving') return 'Nakliye Taleplerime Dön';
    if (type === 'sell') return 'Satış Taleplerime Dön';
    return 'Raporlarıma Dön';
  };

  // Backend'den rapor verilerini çek
  useEffect(() => {
    const fetchReport = async () => {
      if (!accessToken || !id) {
        setError('Rapor yüklenemedi');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log(`[REPORT] Fetching report for ${type}:${id}`);
        
        if (type === 'order' || type === 'siparis') {
          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/report/order/${id}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            }
          );
          
          if (!response.ok) {
            throw new Error('Rapor yüklenemedi');
          }
          
          const data = await response.json();
          console.log('[REPORT] Report data:', data);
          setReport(data.report);
        } else if (type === 'sell') {
          // Satış talebi detaylarını çek - admin veya user endpoint'ine göre
          const endpoint = isAdminRoute 
            ? `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/admin/sell-requests`
            : `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/user-sell-requests`;
          
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('[REPORT] Sell request error:', response.status, errorText);
            throw new Error(`Satış talepleri yüklenemedi (${response.status})`);
          }
          
          const data = await response.json();
          console.log('[REPORT] Sell requests data:', data);
          
          // ID'ye göre talebi bul - admin ve user endpoint'leri farklı field kullanıyor
          const requests = isAdminRoute ? (data.requests || []) : (data.sellRequests || []);
          console.log('[REPORT] Requests array:', requests);
          
          const sellRequestData = requests.find((r: any) => r.id.toString() === id);
          
          if (!sellRequestData) {
            console.error('[REPORT] Request not found. ID:', id, 'Available IDs:', requests.map((r: any) => r.id));
            throw new Error('Satış talebi bulunamadı');
          }
          
          console.log('[REPORT] Found sell request:', sellRequestData);
          
          // Sell request verisini rapor formatına çevir
          const sellReport = {
            type: 'sell',
            requestId: sellRequestData.id || id,
            requestNumber: sellRequestData.request_id || `URN-${id}`,
            title: sellRequestData.title,
            brand: sellRequestData.brand,
            model: sellRequestData.model,
            year: sellRequestData.year,
            condition: (() => {
              const cond = sellRequestData.condition;
              if (cond === 'yeni') return 'Yeni (Sıfır)';
              if (cond === 'cok-iyi') return 'Çok İyi';
              if (cond === 'iyi') return 'İyi';
              if (cond === 'orta') return 'Orta';
              if (cond === 'bakim-gerekli') return 'Bakım Gerekli';
              return cond;
            })(),
            description: sellRequestData.description,
            askingPrice: sellRequestData.asking_price,
            offerPrice: sellRequestData.admin_offer_price,
            finalPrice: sellRequestData.admin_offer_price, // Kabul edilen fiyat
            status: sellRequestData.status,
            pickupDate: sellRequestData.pickup_date,
            pickupTime: sellRequestData.pickup_time,
            createdAt: sellRequestData.created_at,
            completedAt: sellRequestData.updated_at,
            customer: sellRequestData.customer,
            images: sellRequestData.images || [],
          };
          
          setReport(sellReport);
        } else if (type === 'service') {
          // Teknik servis detaylarını çek - admin veya user endpoint'ine göre
          const endpoint = isAdminRoute 
            ? `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/technical-service/admin/requests`
            : `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/technical-service/my-requests`;
          
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('[REPORT] Service error:', response.status, errorText);
            throw new Error(`Teknik servis talepleri yüklenemedi (${response.status})`);
          }
          
          const data = await response.json();
          console.log('[REPORT] Service requests data:', data);
          
          // ID'ye göre talebi bul
          const requests = data.requests || [];
          const serviceRequestData = requests.find((r: any) => r.id.toString() === id);
          
          if (!serviceRequestData) {
            throw new Error('Teknik servis talebi bulunamadı');
          }
          
          console.log('[REPORT] Found service request:', serviceRequestData);
          
          // Service verisini rapor formatına çevir
          const serviceReport = {
            type: 'service',
            requestId: serviceRequestData.id || id,
            requestNumber: serviceRequestData.service_id || `SRV-${id}`,
            title: `${serviceRequestData.product_type || 'Ürün'} - ${serviceRequestData.brand || ''} ${serviceRequestData.model || ''}`.trim(),
            productType: serviceRequestData.product_type,
            brand: serviceRequestData.brand,
            model: serviceRequestData.model,
            serialNumber: serviceRequestData.serial_number,
            problem: serviceRequestData.problem_description,
            diagnosis: serviceRequestData.diagnosis,
            repairDetails: serviceRequestData.repair_details,
            cost: serviceRequestData.cost,
            estimatedCost: serviceRequestData.estimated_price,
            status: serviceRequestData.status,
            appointmentDate: serviceRequestData.preferred_date,
            appointmentTime: serviceRequestData.preferred_time,
            completedDate: serviceRequestData.completed_date,
            createdAt: serviceRequestData.created_at,
            customer: serviceRequestData.customer,
            images: serviceRequestData.images || [],
          };
          
          setReport(serviceReport);
        } else {
          // Diğer rapor tipleri için henüz endpoint yok
          setError('Bu rapor tipi henüz desteklenmiyor');
        }
        
      } catch (err: any) {
        console.error('[REPORT] Error fetching report:', err);
        setError(err.message || 'Rapor yüklenirken hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [type, id, accessToken]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    alert('PDF indirme özelliği yakında eklenecek!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a8a] mx-auto mb-4"></div>
          <p className="text-gray-600">Rapor yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Rapor Bulunamadı</h2>
          <p className="text-gray-600 mb-6">{error || 'Aradığınız rapor bulunamadı.'}</p>
          <Button onClick={() => navigate(getBackUrl())}>Geri Dön</Button>
        </div>
      </div>
    );
  }

  // Status bilgilerini al
  const getStatusConfig = () => {
    if (type === 'sell') {
      const sellStatusConfig: Record<string, any> = {
        'reviewing': { label: 'İnceleniyor', color: 'yellow', icon: '🔍' },
        'offer_sent': { label: 'Teklif Gönderildi', color: 'blue', icon: '💰' },
        'accepted': { label: 'Kabul Edildi', color: 'green', icon: '✅' },
        'rejected': { label: 'Reddedildi', color: 'red', icon: '❌' },
        'completed': { label: 'Tamamlandı', color: 'green', icon: '✔️' },
      };
      return sellStatusConfig[report.status] || { label: report.status, color: 'gray', icon: '❓' };
    }
    if (type === 'service') {
      const serviceStatusConfig: Record<string, any> = {
        'pending': { label: 'Beklemede', color: 'yellow', icon: '⏳' },
        'diagnosed': { label: 'Teşhis Edildi', color: 'blue', icon: '🔍' },
        'in_repair': { label: 'Onarımda', color: 'orange', icon: '🔧' },
        'ready': { label: 'Teslime Hazır', color: 'green', icon: '✅' },
        'completed': { label: 'Tamamlandı', color: 'green', icon: '✔️' },
        'cancelled': { label: 'İptal Edildi', color: 'red', icon: '❌' },
      };
      return serviceStatusConfig[report.status] || { label: report.status, color: 'gray', icon: '❓' };
    }
    return ORDER_STATUS_CONFIG[report.status as keyof typeof ORDER_STATUS_CONFIG] || 
      { label: report.status, color: 'gray', icon: '❓' };
  };

  const statusConfig = getStatusConfig();

  // Sell tipi için özel render
  if (type === 'sell') {
    return (
      <div className="min-h-screen bg-white">
        {/* Yazdırma Butonları */}
        <div className={`print:hidden bg-gray-100 border-b ${isAdminRoute ? 'pt-4' : 'pt-20'}`}>
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate(getBackUrl())}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {getBackButtonText()}
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                <Download className="w-4 h-4 mr-2" />
                PDF İndir
              </Button>
              <Button variant="default" size="sm" onClick={handlePrint} className="bg-gray-800 hover:bg-gray-900">
                <Printer className="w-4 h-4 mr-2" />
                Yazdır
              </Button>
            </div>
          </div>
        </div>

        {/* PDF İçeriği */}
        <div className="max-w-[210mm] mx-auto p-8 print:p-12 bg-white">
          {/* Başlık */}
          <div className="border-b-4 border-[#1e3a8a] pb-6 mb-8">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-[#1e3a8a] mb-1 uppercase tracking-wide">ERSİN SPOT</h1>
                <p className="text-sm text-gray-700 font-medium mb-4">İkinci El Ürün Alım Satım ve Teknik Servis</p>
                <div className="text-xs text-gray-600 space-y-1">
                  <p><strong>Telefon:</strong> 0507 194 05 50</p>
                  <p><strong>E-posta:</strong> ersin1235@gmail.com</p>
                </div>
              </div>
              <div className="text-right border-2 border-[#1e3a8a] p-4 min-w-[180px]">
                <div className="text-[10px] text-gray-600 mb-1 font-semibold uppercase">Rapor Tarihi</div>
                <div className="font-bold text-gray-900 text-sm mb-3">
                  {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div className="text-[10px] text-gray-600 mb-1 font-semibold uppercase">Talep No</div>
                <div className="font-bold text-[#1e3a8a] text-xl">#{report.requestNumber}</div>
              </div>
            </div>
          </div>

          {/* Rapor Başlığı */}
          <div className="border-l-4 border-[#f97316] pl-4 mb-8">
            <h2 className="text-2xl font-bold text-[#1e3a8a] uppercase tracking-wide mb-2">SATIŞ RAPORU</h2>
            <div className="text-sm flex items-center gap-2">
              <span className="text-gray-600">Durum:</span>
              <span className="font-bold text-green-600">{statusConfig.icon} {statusConfig.label}</span>
            </div>
          </div>

          {/* Ürün Bilgileri */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">ÜRÜN BİLGİLERİ</h3>
            <div className="bg-gray-50 p-6 rounded-lg space-y-3">
              <div className="flex items-start gap-3">
                <Package className="w-5 h-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-600 mb-0.5">Ürün Adı</p>
                  <p className="font-semibold text-gray-900">{report.title}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 mb-0.5">Marka</p>
                  <p className="font-semibold text-gray-900">{report.brand}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-0.5">Model</p>
                  <p className="font-semibold text-gray-900">{report.model || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-0.5">Durum</p>
                  <p className="font-semibold text-gray-900">{report.condition}</p>
                </div>
                {report.year && (
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Yıl</p>
                    <p className="font-semibold text-gray-900">{report.year}</p>
                  </div>
                )}
              </div>
              {report.description && (
                <div>
                  <p className="text-xs text-gray-600 mb-1">Açıklama</p>
                  <p className="text-sm text-gray-700">{report.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Fiyat Bilgileri */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">FİYAT BİLGİLERİ</h3>
            <div className="bg-green-50 p-6 rounded-lg border-2 border-green-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 mb-1">İstenen Fiyat</p>
                  <p className="text-lg font-semibold text-gray-700">{report.askingPrice?.toLocaleString('tr-TR')} ₺</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Teklif Edilen Fiyat</p>
                  <p className="text-lg font-semibold text-blue-600">{report.offerPrice?.toLocaleString('tr-TR')} ₺</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-green-300">
                <p className="text-xs text-gray-600 mb-1">Satış Fiyatı (Kabul Edilen)</p>
                <p className="text-2xl font-bold text-green-600">{report.finalPrice?.toLocaleString('tr-TR')} ₺</p>
              </div>
            </div>
          </div>

          {/* Müşteri Bilgileri */}
          {report.customer && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">MÜŞTERİ BİLGİLERİ</h3>
              <div className="bg-gray-50 p-6 rounded-lg space-y-3">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Ad Soyad</p>
                    <p className="font-semibold text-gray-900">{report.customer.name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Telefon</p>
                    <p className="font-semibold text-gray-900">{report.customer.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">E-posta</p>
                    <p className="font-semibold text-gray-900">{report.customer.email}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Alım Randevusu */}
          {(report.pickupDate || report.pickupTime) && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">ALIM RANDEVUSU</h3>
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <div className="grid grid-cols-2 gap-4">
                  {report.pickupDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-xs text-gray-600 mb-0.5">Alım Tarihi</p>
                        <p className="font-bold text-gray-900">
                          {new Date(report.pickupDate).toLocaleDateString('tr-TR', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                  {report.pickupTime && (
                    <div>
                      <p className="text-xs text-gray-600 mb-0.5">Alım Saati</p>
                      <p className="font-bold text-gray-900">{report.pickupTime}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t-2 border-gray-300 pt-6 mt-8 text-center text-xs text-gray-600">
            <p>Bu rapor Ersin Spot tarafından otomatik olarak oluşturulmuştur.</p>
            <p className="mt-1">Satış işleminiz başarıyla tamamlanmıştır. Ürününüzü teslim ettiğiniz için teşekkür ederiz.</p>
          </div>
        </div>
      </div>
    );
  }

  // Service tipi için özel render
  if (type === 'service') {
    return (
      <div className="min-h-screen bg-white">
        {/* Yazdırma Butonları */}
        <div className={`print:hidden bg-gray-100 border-b ${isAdminRoute ? 'pt-4' : 'pt-20'}`}>
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate(getBackUrl())}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {getBackButtonText()}
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                <Download className="w-4 h-4 mr-2" />
                PDF İndir
              </Button>
              <Button variant="default" size="sm" onClick={handlePrint} className="bg-gray-800 hover:bg-gray-900">
                <Printer className="w-4 h-4 mr-2" />
                Yazdır
              </Button>
            </div>
          </div>
        </div>

        {/* PDF İçeriği */}
        <div className="max-w-[210mm] mx-auto p-8 print:p-12 bg-white">
          {/* Başlık */}
          <div className="border-b-4 border-[#1e3a8a] pb-6 mb-8">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-[#1e3a8a] mb-1 uppercase tracking-wide">ERSİN SPOT</h1>
                <p className="text-sm text-gray-700 font-medium mb-4">İkinci El Ürün Alım Satım ve Teknik Servis</p>
                <div className="text-xs text-gray-600 space-y-1">
                  <p><strong>Telefon:</strong> 0507 194 05 50</p>
                  <p><strong>E-posta:</strong> ersin1235@gmail.com</p>
                </div>
              </div>
              <div className="text-right border-2 border-[#1e3a8a] p-4 min-w-[180px]">
                <div className="text-[10px] text-gray-600 mb-1 font-semibold uppercase">Rapor Tarihi</div>
                <div className="font-bold text-gray-900 text-sm mb-3">
                  {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div className="text-[10px] text-gray-600 mb-1 font-semibold uppercase">Servis No</div>
                <div className="font-bold text-[#1e3a8a] text-xl">#{report.requestNumber}</div>
              </div>
            </div>
          </div>

          {/* Rapor Başlığı */}
          <div className="border-l-4 border-[#f97316] pl-4 mb-8">
            <h2 className="text-2xl font-bold text-[#1e3a8a] uppercase tracking-wide mb-2">TEKNİK SERVİS RAPORU</h2>
            <div className="text-sm flex items-center gap-2">
              <span className="text-gray-600">Durum:</span>
              <span className="font-bold text-green-600">{statusConfig.icon} {statusConfig.label}</span>
            </div>
          </div>

          {/* Ürün Bilgileri */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">ÜRÜN BİLGİLERİ</h3>
            <div className="bg-gray-50 p-6 rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 mb-0.5">Ürün Tipi</p>
                  <p className="font-semibold text-gray-900">{report.productType}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-0.5">Marka</p>
                  <p className="font-semibold text-gray-900">{report.brand}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-0.5">Model</p>
                  <p className="font-semibold text-gray-900">{report.model || '-'}</p>
                </div>
                {report.serialNumber && (
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Seri No</p>
                    <p className="font-semibold text-gray-900">{report.serialNumber}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Arıza ve Onarım Bilgileri */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">ARIZA VE ONARIM BİLGİLERİ</h3>
            <div className="bg-gray-50 p-6 rounded-lg space-y-4">
              {report.problem && (
                <div>
                  <p className="text-xs text-gray-600 mb-1 font-semibold">Arıza Açıklaması</p>
                  <p className="text-sm text-gray-900">{report.problem}</p>
                </div>
              )}
              {report.diagnosis && (
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-xs text-gray-600 mb-1 font-semibold">Teşhis</p>
                  <p className="text-sm text-gray-900">{report.diagnosis}</p>
                </div>
              )}
              {report.repairDetails && (
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-xs text-gray-600 mb-1 font-semibold">Yapılan İşlemler</p>
                  <p className="text-sm text-gray-900">{report.repairDetails}</p>
                </div>
              )}
            </div>
          </div>

          {/* Maliyet Bilgileri */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">MALİYET BİLGİLERİ</h3>
            <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-200">
              <div className="grid grid-cols-2 gap-4">
                {report.estimatedCost && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Tahmini Maliyet</p>
                    <p className="text-lg font-semibold text-gray-700">{report.estimatedCost?.toLocaleString('tr-TR')} ₺</p>
                  </div>
                )}
                {report.cost && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Toplam Ücret</p>
                    <p className="text-2xl font-bold text-blue-600">{report.cost?.toLocaleString('tr-TR')} ₺</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Müşteri Bilgileri */}
          {report.customer && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">MÜŞTERİ BİLGİLERİ</h3>
              <div className="bg-gray-50 p-6 rounded-lg space-y-3">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Ad Soyad</p>
                    <p className="font-semibold text-gray-900">{report.customer.name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Telefon</p>
                    <p className="font-semibold text-gray-900">{report.customer.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">E-posta</p>
                    <p className="font-semibold text-gray-900">{report.customer.email}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Randevu Bilgileri */}
          {(report.appointmentDate || report.completedDate) && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">TARİHLER</h3>
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  {report.appointmentDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-xs text-gray-600 mb-0.5">Randevu Tarihi</p>
                        <p className="font-bold text-gray-900">
                          {new Date(report.appointmentDate).toLocaleDateString('tr-TR', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                        </p>
                        {report.appointmentTime && (
                          <p className="text-sm text-gray-600">{report.appointmentTime}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {report.completedDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-xs text-gray-600 mb-0.5">Tamamlanma Tarihi</p>
                        <p className="font-bold text-gray-900">
                          {new Date(report.completedDate).toLocaleDateString('tr-TR', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t-2 border-gray-300 pt-6 mt-8 text-center text-xs text-gray-600">
            <p>Bu rapor Ersin Spot tarafından otomatik olarak oluşturulmuştur.</p>
            <p className="mt-1">Teknik servis hizmetimizi kullandığınız için teşekkür ederiz.</p>
          </div>
        </div>
      </div>
    );
  }

  // Order tipi için eski render
  return (
    <div className="min-h-screen bg-white">
      {/* Yazdırma Butonları - Ekranda görünür, yazdırmada gizli */}
      <div className={`print:hidden bg-gray-100 border-b ${isAdminRoute ? 'pt-4' : 'pt-20'}`}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(getBackUrl())}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {getBackButtonText()}
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
            >
              <Download className="w-4 h-4 mr-2" />
              PDF İndir
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handlePrint}
              className="bg-gray-800 hover:bg-gray-900"
            >
              <Printer className="w-4 h-4 mr-2" />
              Yazdır
            </Button>
          </div>
        </div>
      </div>

      {/* PDF İçeriği - A4 Sayfa Formatı */}
      <div className="max-w-[210mm] mx-auto p-8 print:p-12 bg-white">
        
        {/* Başlık */}
        <div className="border-b-4 border-[#1e3a8a] pb-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#1e3a8a] mb-1 uppercase tracking-wide">ERSİN SPOT</h1>
              <p className="text-sm text-gray-700 font-medium mb-4">İkinci El Ürünler ve Teknik Servis Hizmetleri</p>
              <div className="text-xs text-gray-600 space-y-1">
                <p><strong>Adres:</strong> Buca, İzmir</p>
                <p><strong>Telefon:</strong> 0232 XXX XX XX</p>
                <p><strong>E-posta:</strong> info@ersinspot.com</p>
                <p><strong>Web:</strong> www.ersinspot.com</p>
              </div>
            </div>
            <div className="text-right border-2 border-[#1e3a8a] p-4 min-w-[180px]">
              <div className="text-[10px] text-gray-600 mb-1 font-semibold uppercase">Rapor Tarihi</div>
              <div className="font-bold text-gray-900 text-sm mb-3">{new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              <div className="text-[10px] text-gray-600 mb-1 font-semibold uppercase">Rapor No</div>
              <div className="font-bold text-[#1e3a8a] text-xl">#{report.reportNumber}</div>
            </div>
          </div>
        </div>

        {/* Rapor Başlığı */}
        <div className="border-l-4 border-[#f97316] pl-4 mb-8">
          <h2 className="text-2xl font-bold text-[#1e3a8a] uppercase tracking-wide mb-2">{report.title}</h2>
          <div className="text-sm flex items-center gap-2">
            <span className="text-gray-600">Durum:</span>
            <span className="font-bold text-[#f97316]">{statusConfig.icon} {statusConfig.label}</span>
          </div>
        </div>

        {/* Sipariş Bilgileri */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-blue-600 uppercase tracking-wide font-semibold">Sipariş Tarihi</p>
            </div>
            <p className="font-bold text-gray-900">{report.orderDate}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <p className="text-xs text-purple-600 uppercase tracking-wide font-semibold">Teslimat Tarihi</p>
            </div>
            <p className="font-bold text-gray-900">{report.deliveryDate}</p>
            <p className="text-xs text-gray-600 mt-1">{report.deliveryTime}</p>
          </div>
        </div>

        {/* Müşteri Bilgileri */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">MÜŞTERİ BİLGİLERİ</h3>
          <div className="bg-gray-50 p-6 rounded-lg space-y-3">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-gray-600 mt-0.5" />
              <div>
                <p className="text-xs text-gray-600 mb-0.5">Ad Soyad</p>
                <p className="font-semibold text-gray-900">{report.customer.name}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-gray-600 mt-0.5" />
              <div>
                <p className="text-xs text-gray-600 mb-0.5">Telefon</p>
                <p className="font-semibold text-gray-900">{report.customer.phone}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-gray-600 mt-0.5" />
              <div>
                <p className="text-xs text-gray-600 mb-0.5">E-posta</p>
                <p className="font-semibold text-gray-900">{report.customer.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-600 mt-0.5" />
              <div>
                <p className="text-xs text-gray-600 mb-0.5">Teslimat Adresi</p>
                <p className="font-semibold text-gray-900">{report.customer.address}</p>
                <p className="text-sm text-gray-700">{report.customer.district}, {report.customer.city}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Ürünler Listesi */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">SİPARİŞ İÇERİĞİ</h3>
          <table className="w-full border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-3 text-xs font-semibold text-gray-700 border-b border-gray-300">Ürün Adı</th>
                <th className="text-center p-3 text-xs font-semibold text-gray-700 border-b border-gray-300">Durum</th>
                <th className="text-center p-3 text-xs font-semibold text-gray-700 border-b border-gray-300">Adet</th>
                <th className="text-right p-3 text-xs font-semibold text-gray-700 border-b border-gray-300">Birim Fiyat</th>
                <th className="text-right p-3 text-xs font-semibold text-gray-700 border-b border-gray-300">Toplam</th>
              </tr>
            </thead>
            <tbody>
              {report.items.map((item: any, idx: number) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="p-3 text-sm text-gray-900">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-xs text-gray-600">{item.brand} - {item.category}</p>
                    </div>
                  </td>
                  <td className="p-3 text-center text-xs text-gray-700">{item.condition}</td>
                  <td className="p-3 text-center text-sm text-gray-900">{item.quantity}</td>
                  <td className="p-3 text-right text-sm font-semibold text-gray-900">{item.price.toLocaleString('tr-TR')} ₺</td>
                  <td className="p-3 text-right text-sm font-bold text-[#1e3a8a]">{(item.price * item.quantity).toLocaleString('tr-TR')} ₺</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Özet */}
        <div className="mb-8 border-t-2 border-gray-300 pt-6">
          <div className="max-w-md ml-auto space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Ara Toplam</span>
              <span className="font-semibold text-gray-900">{report.subtotal.toLocaleString('tr-TR')} ₺</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Teslimat Ücreti</span>
              <span className="font-semibold text-gray-900">
                {report.deliveryFee === 0 ? 'ÜCRETSİZ' : `${report.deliveryFee.toLocaleString('tr-TR')} ₺`}
              </span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t-2 border-[#1e3a8a]">
              <span className="text-lg font-bold text-[#1e3a8a]">GENEL TOPLAM</span>
              <span className="text-2xl font-bold text-[#f97316]">{report.total.toLocaleString('tr-TR')} ₺</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Ödeme Yöntemi</span>
              <span className="font-semibold text-gray-900">{report.paymentMethod}</span>
            </div>
          </div>
        </div>

        {/* Notlar */}
        {report.notes && (
          <div className="mb-8 bg-amber-50 border-l-4 border-amber-400 p-4">
            <h3 className="text-sm font-bold text-amber-800 mb-2">Notlar</h3>
            <p className="text-sm text-amber-900">{report.notes}</p>
          </div>
        )}

        {/* Alt Bilgi */}
        <div className="border-t-2 border-gray-300 pt-6 mt-8">
          <div className="text-center text-xs text-gray-600 space-y-1">
            <p className="font-semibold">Bu rapor otomatik olarak oluşturulmuştur.</p>
            <p>Ersin Spot - İkinci El Ürünler ve Teknik Servis Hizmetleri</p>
            <p>© 2025 Tüm hakları saklıdır.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
