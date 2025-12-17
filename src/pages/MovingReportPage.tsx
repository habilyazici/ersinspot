import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Download, Printer, Truck, Calendar, Banknote, MapPin, User, Phone, Mail, FileText, CheckCircle } from 'lucide-react@0.487.0';
import { Button } from '../components/ui/button';
import { projectId } from '../utils/supabase/info';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner@2.0.3';

export default function MovingReportPage() {
  const { id } = useParams<{ id: string }>();
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
    if (isAdminRoute) return '/admin/nakliye';
    return '/hesabim/nakliye';
  };

  const getBackButtonText = () => {
    if (isAdminRoute) return 'Nakliye Yönetimine Dön';
    return 'Nakliye Randevularıma Dön';
  };

  // Backend'den nakliye rapor verilerini çek
  useEffect(() => {
    const fetchReport = async () => {
      if (!accessToken || !id) {
        setError('Rapor yüklenemedi');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log(`[MOVING-REPORT] Fetching report for moving:${id}`);
        
        // Nakliye taleplerini çek - admin veya user endpoint'ine göre
        const endpoint = isAdminRoute 
          ? `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/moving/admin/requests`
          : `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/moving/my-requests`;
        
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[MOVING-REPORT] Error:', response.status, errorText);
          throw new Error(`Nakliye talepleri yüklenemedi (${response.status})`);
        }
        
        const data = await response.json();
        console.log('[MOVING-REPORT] Data:', data);
        
        // ID veya request_number'a göre talebi bul
        const requests = data.requests || [];
        const movingRequestData = requests.find((r: any) => 
          r.id.toString() === id || r.request_number === id
        );
        
        if (!movingRequestData) {
          console.error('[MOVING-REPORT] Request not found. ID:', id);
          throw new Error('Nakliye talebi bulunamadı');
        }
        
        console.log('[MOVING-REPORT] Found moving request:', movingRequestData);
        
        // Moving verisini rapor formatına çevir
        const movingReport = {
          type: 'moving',
          requestId: movingRequestData.id || id,
          requestNumber: movingRequestData.request_number || `NAK-${id}`,
          homeSize: movingRequestData.home_size,
          fromAddress: movingRequestData.from_address,
          toAddress: movingRequestData.to_address,
          fromCity: movingRequestData.from_city,
          fromDistrict: movingRequestData.from_district,
          toCity: movingRequestData.to_city,
          toDistrict: movingRequestData.to_district,
          fromFloor: movingRequestData.from_floor,
          toFloor: movingRequestData.to_floor,
          fromHasElevator: movingRequestData.from_has_elevator,
          toHasElevator: movingRequestData.to_has_elevator,
          movingDate: movingRequestData.moving_date,
          preferredTime: movingRequestData.preferred_time,
          distance: movingRequestData.distance,
          selectedItems: movingRequestData.selected_items || [],
          customItems: movingRequestData.custom_items || [],
          totalPrice: movingRequestData.admin_offer_price || movingRequestData.admin_offer || 0,
          status: movingRequestData.status,
          createdAt: movingRequestData.created_at,
          completedAt: movingRequestData.updated_at,
          customer: {
            name: movingRequestData.customer_name,
            phone: movingRequestData.customer_phone,
            email: movingRequestData.customer_email,
          },
          notes: movingRequestData.notes,
          adminNotes: movingRequestData.admin_notes,
          description: movingRequestData.description,
        };
        
        setReport(movingReport);
        
      } catch (err: any) {
        console.error('[MOVING-REPORT] Error fetching report:', err);
        setError(err.message || 'Rapor yüklenirken hata oluştu');
        toast.error('Rapor yüklenemedi', {
          description: err.message
        });
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [id, accessToken, isAdminRoute]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    alert('PDF indirme özelliği yakında eklenecek!');
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Yapılan işlemler - nakliye için özel
  const yapilanIslemler = [
    'Eşyalar özenle paketlendi ve korundu',
    'Profesyonel ekip tarafından taşındı',
    'Tüm eşyalar hasarsız teslim edildi',
    'Beyaz eşyalar ve mobilyalar yerlerine yerleştirildi',
    'Ambalaj malzemeleri toplandı'
  ];

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
          <h2 className="text-2xl font-bold text-[#1e3a8a] uppercase tracking-wide mb-2">NAKLİYE HİZMET RAPORU</h2>
          <div className="text-sm flex items-center gap-2">
            <span className="text-gray-600">Durum:</span>
            <span className="font-bold text-green-600">✔️ Tamamlandı</span>
          </div>
        </div>

        {/* Nakliye Özeti */}
        <div className="bg-gradient-to-r from-orange-50 to-blue-50 p-6 rounded-lg mb-8 border-2 border-orange-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">NAKLİYE ÖZETİ</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-600 mb-1">Ev Büyüklüğü</p>
              <p className="font-semibold text-gray-900">{report.homeSize}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Nakliye Tarihi</p>
              <p className="font-semibold text-gray-900">
                {formatDate(report.movingDate)}
                {report.preferredTime && <span className="text-gray-600"> - {report.preferredTime}</span>}
              </p>
            </div>
            {report.distance && (
              <div>
                <p className="text-xs text-gray-600 mb-1">Mesafe</p>
                <p className="font-semibold text-blue-900">{Number(report.distance).toFixed(1)} km</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-600 mb-1">Toplam Tutar</p>
              <p className="text-xl font-bold text-[#1e3a8a]">{report.totalPrice.toLocaleString('tr-TR')} ₺</p>
            </div>
          </div>
        </div>

        {/* Adres Bilgileri */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">ADRES BİLGİLERİ</h3>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Nereden */}
            <div className="bg-orange-50 p-6 rounded-lg border-2 border-orange-200">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-5 h-5 text-orange-600" />
                <h4 className="font-bold text-orange-800">Nereden</h4>
              </div>
              <p className="text-gray-900 font-semibold mb-3">{report.fromAddress}</p>
              <div className="text-sm text-gray-700 space-y-1">
                {report.fromCity && <p>Şehir: {report.fromCity}</p>}
                {report.fromDistrict && <p>İlçe: {report.fromDistrict}</p>}
                <p>Kat: {report.fromFloor || 0}</p>
                <p>Asansör: {report.fromHasElevator ? 'Var ✅' : 'Yok ❌'}</p>
              </div>
            </div>

            {/* Nereye */}
            <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-5 h-5 text-blue-600" />
                <h4 className="font-bold text-blue-800">Nereye</h4>
              </div>
              <p className="text-gray-900 font-semibold mb-3">{report.toAddress}</p>
              <div className="text-sm text-gray-700 space-y-1">
                {report.toCity && <p>Şehir: {report.toCity}</p>}
                {report.toDistrict && <p>İlçe: {report.toDistrict}</p>}
                <p>Kat: {report.toFloor || 0}</p>
                <p>Asansör: {report.toHasElevator ? 'Var ✅' : 'Yok ❌'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Eşya Bilgileri */}
        {(report.selectedItems.length > 0 || report.customItems.length > 0) && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">TAŞINAN EŞYALAR</h3>
            <div className="bg-gray-50 p-6 rounded-lg space-y-4">
              {report.selectedItems.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2 font-semibold">Standart Eşyalar:</p>
                  <div className="flex flex-wrap gap-2">
                    {report.selectedItems.map((item: any, index: number) => (
                      <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-gray-200 rounded-lg text-sm text-gray-900">
                        <span className="font-medium">{item.name || item.item_name}</span>
                        {item.quantity > 1 && <span className="text-gray-500 font-semibold">x{item.quantity}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {report.customItems.length > 0 && (
                <div className={report.selectedItems.length > 0 ? 'pt-4 border-t border-gray-200' : ''}>
                  <p className="text-sm text-gray-600 mb-2 font-semibold">Özel Eşyalar:</p>
                  <div className="flex flex-wrap gap-2">
                    {report.customItems.map((item: any, index: number) => (
                      <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border-2 border-orange-300 rounded-lg text-sm text-gray-900">
                        <span className="font-medium">{item.name || item.item_name}</span>
                        {item.quantity > 1 && <span className="text-gray-500 font-semibold">x{item.quantity}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Yapılan İşlemler */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">YAPILAN İŞLEMLER</h3>
          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <ul className="space-y-3">
              {yapilanIslemler.map((islem, index) => (
                <li key={index} className="flex items-start gap-3 text-sm">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-900">{islem}</span>
                </li>
              ))}
            </ul>
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
          </div>
        </div>

        {/* Notlar */}
        {(report.notes || report.description || report.adminNotes) && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">NOTLAR</h3>
            <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 space-y-3">
              {(report.notes || report.description) && (
                <div>
                  <p className="text-xs text-gray-600 mb-1 font-semibold">Müşteri Notu:</p>
                  <p className="text-sm text-gray-900">{report.notes || report.description}</p>
                </div>
              )}
              {report.adminNotes && (
                <div className={report.notes || report.description ? 'pt-3 border-t border-yellow-300' : ''}>
                  <p className="text-xs text-gray-600 mb-1 font-semibold">Firma Notu:</p>
                  <p className="text-sm text-gray-900">{report.adminNotes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fiyat Detayı */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">FİYAT DETAYI</h3>
          <div className="bg-gradient-to-br from-[#1e3a8a]/10 to-[#f97316]/10 p-6 rounded-lg border-2 border-[#1e3a8a]">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Banknote className="w-6 h-6 text-[#f97316]" />
                <span className="text-lg font-bold text-gray-900">Toplam Ücret</span>
              </div>
              <span className="text-3xl font-bold text-[#1e3a8a]">{report.totalPrice.toLocaleString('tr-TR')} ₺</span>
            </div>
            <p className="text-xs text-gray-600 mt-3">KDV Dahil</p>
          </div>
        </div>

        {/* İmza ve Onay */}
        <div className="grid grid-cols-2 gap-8 pt-8 border-t-2 border-gray-300 mb-8">
          <div className="text-center">
            <div className="border-t-2 border-gray-400 pt-3 mt-20">
              <p className="text-sm font-semibold text-gray-900">Firma Yetkilisi</p>
              <p className="text-xs text-gray-600 mt-1">Ersin Spot</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t-2 border-gray-400 pt-3 mt-20">
              <p className="text-sm font-semibold text-gray-900">Müşteri</p>
              <p className="text-xs text-gray-600 mt-1">İmza & Onay</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-300 pt-6 text-center text-xs text-gray-600">
          <p className="mb-1 font-semibold">Ersin Spot - İkinci El Ürün Alım Satımı, Teknik Servis ve Nakliye Hizmetleri</p>
          <p>Bu rapor {new Date().toLocaleDateString('tr-TR')} tarihinde otomatik olarak oluşturulmuştur.</p>
          <p className="mt-2">İzmir, Buca | Tel: 0 507 194 05 50 | ersin1235@gmail.com</p>
          <p className="mt-3">Nakliye hizmetimizi kullandığınız için teşekkür ederiz.</p>
        </div>
      </div>
    </div>
  );
}
