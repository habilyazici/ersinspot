import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Download,
  Eye,
  Calendar,
  Package,
  Wrench,
  Truck,
  ShoppingCart,
  CheckCircle,
  Clock,
  XCircle,
  Printer,
  User,
  ArrowLeft
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

type ReportType = 'siparis' | 'servis' | 'nakliye';
type ReportStatus = 'tamamlandi' | 'devam-ediyor' | 'iptal';

interface Report {
  id: string;
  raporNo: string;
  tip: ReportType;
  baslik: string;
  tarih: string;
  durum: ReportStatus;
  tutar: number;
  detaylar: string;
  notlar?: string;
  yapilan: string[];
  firma: {
    ad: string;
    telefon: string;
    email: string;
    adres: string;
  };
}

export default function MyReportsPage() {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // LocalStorage'dan tamamlanmış siparişleri al ve rapora çevir - snake_case status kullan
  const storedOrders = JSON.parse(localStorage.getItem('ersinspot-orders') || '[]');
  const completedOrderReports: Report[] = storedOrders
    .filter((order: any) => order.status === 'delivered')
    .map((order: any) => ({
      id: order.id,
      raporNo: order.orderNumber || `RPT-${order.id}`,
      tip: 'siparis' as ReportType,
      baslik: order.items[0]?.name || 'Sipariş',
      tarih: order.createdAt ? new Date(order.createdAt).toLocaleString('tr-TR') : '-',
      durum: 'tamamlandi' as ReportStatus,
      tutar: order.total || order.payment?.total || 0,
      detaylar: order.items.map((item: any) => item.name).join(', '),
      notlar: 'Siparişiniz başarıyla teslim edilmiştir.',
      yapilan: [
        'Ürünler kalite kontrolünden geçirildi',
        'Tüm ürünler test edildi',
        'Garanti belgesi verildi',
        'Sorunsuz teslim edildi'
      ],
      firma: {
        ad: 'Ersin Spot',
        telefon: '0 507 194 05 50',
        email: 'ersin1235@gmail.com',
        adres: 'Buca, İzmir'
      }
    }));

  // Mock Data - Kullanıcının raporları
  const mockReports: Report[] = [
    {
      id: '1',
      raporNo: 'RPT-2025-001',
      tip: 'siparis',
      baslik: 'Samsung Buzdolabı 528 LT Satış',
      tarih: '2025-11-21 14:30',
      durum: 'tamamlandi',
      tutar: 25000,
      detaylar: 'Samsung Buzdolabı 528 LT XL Geniş No-Frost, Az Kullanılmış',
      notlar: 'Ürün test edildi, sorunsuz çalışıyor. Garanti belgesi verildi.',
      yapilan: [
        'Ürün kalite kontrolü yapıldı',
        'Cihaz temizlendi ve test edildi',
        'Tüm fonksiyonlar kontrol edildi',
        '1 yıl garanti belgesi verildi',
        'Kullanım kılavuzu teslim edildi'
      ],
      firma: {
        ad: 'Ersin Spot',
        telefon: '0 507 194 05 50',
        email: 'ersin1235@gmail.com',
        adres: 'Buca, İzmir'
      }
    },
    {
      id: '2',
      raporNo: 'RPT-2025-003',
      tip: 'nakliye',
      baslik: '3+1 Ev Taşıma - Buca/Karşıyaka',
      tarih: '2025-11-19 08:00',
      durum: 'tamamlandi',
      tutar: 3500,
      detaylar: '3+1 Daire, 120m², Mesafe: 15km',
      notlar: 'Tüm eşyalar hasarsız teslim edildi. Profesyonel paketleme yapıldı.',
      yapilan: [
        'Eşyalar özenle paketlendi',
        '2 kişilik profesyonel ekip ile taşındı',
        'Beyaz eşyalar montaj edildi',
        'Mobilyalar yerlerine yerleştirildi',
        'Ambalaj malzemeleri toplandı'
      ],
      firma: {
        ad: 'Ersin Spot',
        telefon: '0 507 194 05 50',
        email: 'ersin1235@gmail.com',
        adres: 'Buca, İzmir'
      }
    },
    {
      id: '3',
      raporNo: 'RPT-2025-005',
      tip: 'servis',
      baslik: 'Çamaşır Makinesi Genel Bakım',
      tarih: '2025-11-15 10:30',
      durum: 'tamamlandi',
      tutar: 450,
      detaylar: 'LG Çamaşır Makinesi - Genel bakım ve temizlik',
      notlar: 'Cihazınız bakım sonrası test edildi, sorunsuz çalışıyor.',
      yapilan: [
        'Filtreler temizlendi',
        'Pompa kontrol edildi',
        'Su giriş hortumları kontrol edildi',
        'Tambur temizliği yapıldı',
        '6 ay garanti verildi'
      ],
      firma: {
        ad: 'Ersin Spot',
        telefon: '0 507 194 05 50',
        email: 'ersin1235@gmail.com',
        adres: 'Buca, İzmir'
      }
    },
  ];

  // Tüm raporları birleştir (localStorage siparişleri + mock data)
  const myReports: Report[] = [...completedOrderReports, ...mockReports];

  const getReportTypeIcon = (type: ReportType) => {
    switch (type) {
      case 'siparis':
        return <ShoppingCart className="w-5 h-5" />;
      case 'servis':
        return <Wrench className="w-5 h-5" />;
      case 'nakliye':
        return <Truck className="w-5 h-5" />;
    }
  };

  const getReportTypeName = (type: ReportType) => {
    switch (type) {
      case 'siparis':
        return 'Ürün Alımı';
      case 'servis':
        return 'Teknik Servis';
      case 'nakliye':
        return 'Nakliye Hizmeti';
    }
  };

  const getReportTypeColor = (type: ReportType) => {
    switch (type) {
      case 'siparis':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'servis':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'nakliye':
        return 'bg-purple-100 text-purple-700 border-purple-200';
    }
  };

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case 'tamamlandi':
        return (
          <Badge className="bg-green-100 text-green-700 border border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Tamamlandı
          </Badge>
        );
      case 'devam-ediyor':
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Devam Ediyor
          </Badge>
        );
      case 'iptal':
        return (
          <Badge className="bg-red-100 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            İptal
          </Badge>
        );
    }
  };

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
    setShowReportModal(true);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/hesabim"
            className="inline-flex items-center gap-2 text-[#1e3a8a] hover:text-[#2563eb] mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Hesabıma Dön
          </Link>
          <h1 className="text-gray-900 mb-2">Raporlarım</h1>
          <p className="text-gray-600">Aldığınız hizmetlerin tüm raporlarını görüntüleyin</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Toplam Rapor</p>
                  <p className="text-3xl text-gray-900">{myReports.length}</p>
                </div>
                <div className="bg-blue-500 p-3 rounded-lg text-white">
                  <FileText className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Tamamlanan</p>
                  <p className="text-3xl text-gray-900">
                    {myReports.filter(r => r.durum === 'tamamlandi').length}
                  </p>
                </div>
                <div className="bg-green-500 p-3 rounded-lg text-white">
                  <CheckCircle className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Toplam Tutar</p>
                  <p className="text-3xl text-gray-900">
                    {myReports.reduce((sum, r) => sum + r.tutar, 0).toLocaleString('tr-TR')} ₺
                  </p>
                </div>
                <div className="bg-[#f97316] p-3 rounded-lg text-white">
                  <Package className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myReports.map((report) => (
            <Card key={report.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg border ${getReportTypeColor(report.tip)}`}>
                      {getReportTypeIcon(report.tip)}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{report.raporNo}</p>
                      <p className="text-sm text-gray-900">{getReportTypeName(report.tip)}</p>
                    </div>
                  </div>
                  {getStatusBadge(report.durum)}
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="text-gray-900 mb-3 line-clamp-2">{report.baslik}</h3>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {report.tarih}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Package className="w-4 h-4 text-gray-400" />
                    {report.detaylar}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-xl text-[#1e3a8a]">
                    {report.tutar.toLocaleString('tr-TR')} ₺
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewReport(report)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Görüntüle
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {myReports.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-gray-900 mb-2">Henüz Rapor Bulunmuyor</h3>
              <p className="text-gray-600 mb-6">
                Aldığınız hizmetlerle ilgili raporlar burada görünecektir.
              </p>
              <div className="flex gap-3 justify-center">
                <Link to="/urunler">
                  <Button className="bg-[#1e3a8a]">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Ürünlere Göz At
                  </Button>
                </Link>
                <Link to="/teknik-servis">
                  <Button variant="outline">
                    <Wrench className="w-4 h-4 mr-2" />
                    Servis Talebi
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Report Detail Modal */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedReport && (
            <div className="print:p-8">
              <DialogHeader className="print:border-b print:pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="flex items-center gap-3 text-2xl">
                      {getReportTypeIcon(selectedReport.tip)}
                      Hizmet Raporu
                    </DialogTitle>
                    <p className="text-sm text-gray-500 mt-1">Rapor No: {selectedReport.raporNo}</p>
                  </div>
                  <div className="print:hidden">
                    {getStatusBadge(selectedReport.durum)}
                  </div>
                </div>
              </DialogHeader>

              <div className="mt-6 space-y-6">
                {/* Başlık */}
                <div className="text-center border-b pb-4">
                  <h2 className="text-xl text-gray-900 mb-2">{selectedReport.baslik}</h2>
                  <p className="text-sm text-gray-600">{getReportTypeName(selectedReport.tip)}</p>
                </div>

                {/* Firma ve Tarih Bilgileri */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-sm text-gray-900 mb-3">Hizmet Veren Firma</h3>
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-900">{selectedReport.firma.ad}</p>
                      <p className="text-gray-600">{selectedReport.firma.telefon}</p>
                      <p className="text-gray-600">{selectedReport.firma.email}</p>
                      <p className="text-gray-600">{selectedReport.firma.adres}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm text-gray-900 mb-3">Hizmet Bilgileri</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-gray-500">Tarih & Saat</p>
                        <p className="text-gray-900">{selectedReport.tarih}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Toplam Tutar</p>
                        <p className="text-xl text-[#1e3a8a]">
                          {selectedReport.tutar.toLocaleString('tr-TR')} ₺
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hizmet Detayları */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="flex items-center gap-2 mb-3 text-gray-900">
                    <FileText className="w-5 h-5" />
                    Hizmet Detayları
                  </h3>
                  <p className="text-sm text-gray-900">{selectedReport.detaylar}</p>
                </div>

                {/* Yapılan İşlemler */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="flex items-center gap-2 mb-3 text-gray-900">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Yapılan İşlemler
                  </h3>
                  <ul className="space-y-2">
                    {selectedReport.yapilan.map((islem, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-900">{islem}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Notlar */}
                {selectedReport.notlar && (
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="flex items-center gap-2 mb-3 text-gray-900">
                      <FileText className="w-5 h-5 text-yellow-600" />
                      Notlar
                    </h3>
                    <p className="text-sm text-gray-900">{selectedReport.notlar}</p>
                  </div>
                )}

                {/* İmza ve Onay */}
                <div className="grid grid-cols-2 gap-6 pt-6 border-t">
                  <div className="text-center">
                    <div className="border-t-2 border-gray-300 pt-2 mt-16">
                      <p className="text-sm text-gray-600">Firma Yetkilisi</p>
                      <p className="text-xs text-gray-500 mt-1">Ersin Spot</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="border-t-2 border-gray-300 pt-2 mt-16">
                      <p className="text-sm text-gray-600">Müşteri</p>
                      <p className="text-xs text-gray-500 mt-1">İmza & Onay</p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center text-xs text-gray-500 pt-4 border-t">
                  <p className="mb-1">Ersin Spot - İkinci El Ürün Alım Satımı, Teknik Servis ve Nakliye Hizmetleri</p>
                  <p>Bu rapor {new Date().toLocaleDateString('tr-TR')} tarihinde oluşturulmuştur.</p>
                  <p className="mt-2">İzmir, Buca | Tel: 0 507 194 05 50 | ersin1235@gmail.com</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}