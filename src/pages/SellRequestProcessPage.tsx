import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Package, Clock, CheckCircle, XCircle, Banknote, ArrowLeft, Home, ThumbsUp } from 'lucide-react@0.487.0';
import { toast } from 'sonner@2.0.3';

// Mock data - Gerçekte API'den gelecek
const mockRequests = [
  {
    id: 1,
    requestNumber: '#URN-45782',
    title: 'Samsung Buzdolabı 500 LT',
    requestedPrice: 12000,
    counterOffer: 8500,
    counterOfferNote: 'Ürünün durumu iyi ancak piyasa fiyatları nedeniyle bu fiyatı önerebiliyoruz.',
    finalPrice: null,
    status: 'counter_offer_sent', // pending, counter_offer_sent, approved, rejected, completed
    createdAt: '2025-01-15',
    rejectionReason: null,
  },
  {
    id: 2,
    requestNumber: '#URN-45783',
    title: 'Samsung Buzdolabı 500 LT',
    requestedPrice: 12000,
    finalPrice: 12000,
    status: 'approved',
    createdAt: '2025-01-10',
    rejectionReason: null,
  },
  {
    id: 3,
    requestNumber: '#URN-45784',
    title: 'Samsung Buzdolabı 500 LT',
    requestedPrice: 12000,
    finalPrice: null,
    status: 'rejected',
    createdAt: '2025-01-08',
    rejectionReason: 'Ürün fotoğraflarında buzdolabının kapak contasında aşırı yıpranma ve iç raflarında kırıklar tespit edilmiştir. Maalesef bu durumda ürünü satın alamıyoruz.',
  },
  {
    id: 4,
    requestNumber: '#URN-45785',
    title: 'Samsung Buzdolabı 500 LT',
    requestedPrice: 12000,
    finalPrice: null,
    status: 'pending',
    createdAt: '2025-01-18',
    rejectionReason: null,
  },
  {
    id: 5,
    requestNumber: '#URN-45786',
    title: 'Samsung Buzdolabı 500 LT',
    requestedPrice: 12000,
    finalPrice: 10500,
    status: 'completed',
    createdAt: '2025-01-05',
    completedAt: '2025-01-12',
    paymentStatus: 'paid',
    paymentMethod: 'Nakit',
    rejectionReason: null,
  },
];

export default function SellRequestProcessPage() {
  const { id } = useParams();
  const [request, setRequest] = useState(mockRequests.find(r => r.id === Number(id)));

  const handleApproveCounterOffer = () => {
    if (!request) return;
    
    const updatedRequest = {
      ...request,
      status: 'approved' as const,
      finalPrice: request.counterOffer,
    };
    
    setRequest(updatedRequest);
    toast.success('Karşı teklif onaylandı! Ürününüzü adresinizden teslim almaya geleceğiz.');
  };

  const handleRejectCounterOffer = () => {
    if (!request) return;
    
    const updatedRequest = {
      ...request,
      status: 'rejected' as const,
      rejectionReason: 'Müşteri karşı teklifi kabul etmedi.',
    };
    
    setRequest(updatedRequest);
    toast.error('Karşı teklif reddedildi. Satış işlemi iptal edilmiştir.');
  };

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-24">
        <Card className="p-8 text-center">
          <p className="text-gray-600 mb-4">Talep bulunamadı</p>
          <Link to="/hesabim/satis-taleplerim">
            <Button>Satış Taleplerime Dön</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-gray-50 via-white to-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-[var(--brand-orange-600)]/30 via-[var(--brand-orange-700)]/30 to-[var(--brand-coral-600)]/30 text-white py-10 pt-24">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            {/* Üst Navigasyon Butonları */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Link to="/hesabim">
                <Button variant="ghost" className="text-white hover:bg-white/20" size="sm">
                  <Home className="w-4 h-4 mr-2" />
                  Hesabıma Dön
                </Button>
              </Link>
              <Link to="/hesabim/satis-taleplerim">
                <Button variant="ghost" className="text-white hover:bg-white/20" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Satış Taleplerime Dön
                </Button>
              </Link>
            </div>
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-white to-gray-100 rounded-xl flex items-center justify-center shadow-xl">
                  <Package className="w-7 h-7 text-[var(--brand-orange-600)]" />
                </div>
                <div>
                  <h1 className="text-2xl mb-1 drop-shadow-lg font-bold">İşlem Detayları</h1>
                  <p className="text-white/90 text-sm font-medium drop-shadow">
                    {request.requestNumber}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-start lg:items-end gap-1.5">
                {request.status === 'pending' && (
                  <div className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-xl font-medium flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Beklemede
                  </div>
                )}
                {request.status === 'counter_offer_sent' && (
                  <div className="bg-orange-100 text-orange-700 px-4 py-2 rounded-xl font-medium flex items-center gap-2">
                    <Banknote className="w-5 h-5" />
                    Karşı Teklif Var
                  </div>
                )}
                {request.status === 'approved' && (
                  <div className="bg-green-100 text-green-700 px-4 py-2 rounded-xl font-medium flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Onaylandı
                  </div>
                )}
                {request.status === 'rejected' && (
                  <div className="bg-red-100 text-red-700 px-4 py-2 rounded-xl font-medium flex items-center gap-2">
                    <XCircle className="w-5 h-5" />
                    Reddedildi
                  </div>
                )}
                {request.status === 'completed' && (
                  <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-xl font-medium flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Tamamlandı
                  </div>
                )}
                <div className="text-left lg:text-right">
                  <p className="text-xs text-gray-300">Talep Edilen Fiyat</p>
                  <p className="text-xl font-bold">{request.requestedPrice.toLocaleString('tr-TR')} ₺</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-4">
          {/* DURUM KARTLARI */}
          
          {/* Beklemede */}
          {request.status === 'pending' && (
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 border-b p-4">
                <CardTitle className="flex items-center gap-2 text-yellow-700 text-base">
                  <Clock className="w-5 h-5" />
                  Talebiniz İnceleniyor
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 mb-2">İnceleme Aşamasında</p>
                    <p className="text-sm text-gray-700">
                      Ürününüz değerlendiriliyor. En kısa sürede size dönüş yapılacaktır.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Karşı Teklif */}
          {request.status === 'counter_offer_sent' && (
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b p-4">
                <CardTitle className="flex items-center gap-2 text-amber-700 text-base">
                  <Banknote className="w-5 h-5" />
                  Karşı Teklif
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {/* Fiyat Teklifi Kartı */}
                <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-300 rounded-xl p-6 mb-6">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                      <Banknote className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-amber-900">Karşı Teklif Aldınız!</h3>
                  </div>
                  
                  <p className="text-sm text-amber-700 mb-4 text-center">Firmamızdan özel fiyat teklifini değerlendirin</p>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Banknote className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Sizin Fiyatınız</p>
                        <p className="text-lg font-bold text-gray-500 line-through">{request.requestedPrice.toLocaleString('tr-TR')} ₺</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                      <div className="w-10 h-10 bg-[var(--brand-orange-100)] rounded-lg flex items-center justify-center flex-shrink-0">
                        <Banknote className="w-5 h-5 text-[var(--brand-orange-600)]" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Firma Teklifi</p>
                        <p className="text-xl font-bold text-[#f97316]">{request.counterOffer?.toLocaleString('tr-TR')} ₺</p>
                      </div>
                    </div>
                  </div>
                  
                  {request.counterOfferNote && (
                    <div className="bg-white border border-amber-200 rounded-lg p-4 mb-4">
                      <p className="text-xs text-gray-500 mb-1">📝 Açıklama</p>
                      <p className="text-sm text-gray-800">{request.counterOfferNote}</p>
                    </div>
                  )}
                </div>

                {/* Bilgilendirme Kartı */}
                <div className="bg-gradient-to-br from-blue-50 to-sky-50 border-2 border-blue-200 rounded-xl p-5 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <ThumbsUp className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-2">⚡ Hızlı Karar Verin!</h4>
                      <div className="space-y-2 text-sm text-blue-800">
                        <div className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <p><strong>Onaylarsanız:</strong> Ürününüzü adresinizden teslim almaya geleceğiz.</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <p><strong>Reddederseniz:</strong> Satış işlemi iptal edilecektir.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Aksiyon Butonları */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button 
                    onClick={handleApproveCounterOffer}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-6 text-base h-auto shadow-lg"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Fiyatı Onayla
                  </Button>
                  <Button 
                    onClick={handleRejectCounterOffer}
                    variant="outline"
                    className="border-2 border-red-500 text-red-700 hover:bg-red-50 py-6 text-base h-auto"
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    Fiyatı Reddet
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Onaylandı */}
          {request.status === 'approved' && (
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b p-4">
                <CardTitle className="flex items-center gap-2 text-green-700 text-base">
                  <CheckCircle className="w-5 h-5" />
                  Talebiniz Onaylandı!
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                      <CheckCircle className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-green-900">Tebrikler!</h3>
                  </div>
                  <p className="text-sm text-green-800 mb-6 text-center">
                    Ürününüz kabul edildi ve işlemler başlatıldı.
                  </p>
                  
                  {request.finalPrice && (
                    <div className="flex items-start gap-3 p-4 bg-white rounded-lg max-w-sm mx-auto shadow-md border border-green-200">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Banknote className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-green-600 mb-1 font-medium">Anlaşılan Fiyat</p>
                        <p className="text-2xl font-bold text-green-700">{request.finalPrice.toLocaleString('tr-TR')} ₺</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reddedildi */}
          {request.status === 'rejected' && (
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-red-50 to-rose-50 border-b p-4">
                <CardTitle className="flex items-center gap-2 text-red-700 text-base">
                  <XCircle className="w-5 h-5" />
                  Talep Reddedildi
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-300 rounded-xl p-6">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                      <XCircle className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-red-900">Üzgünüz</h3>
                  </div>
                  <p className="text-sm text-red-800 mb-6 text-center">
                    Maalesef ürününüz satış kriterlerimize uygun bulunmadı.
                  </p>
                  
                  {request.rejectionReason && (
                    <div className="flex items-start gap-3 p-4 bg-white rounded-lg shadow-md border border-red-200">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <XCircle className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-xs text-red-600 mb-1 font-medium">Red Gerekçesi</p>
                        <p className="text-sm text-gray-800">{request.rejectionReason}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tamamlandı */}
          {request.status === 'completed' && (
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-sky-50 border-b p-4">
                <CardTitle className="flex items-center gap-2 text-blue-700 text-base">
                  <CheckCircle className="w-5 h-5" />
                  İşlem Tamamlandı!
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="bg-gradient-to-br from-blue-50 to-sky-50 border-2 border-blue-300 rounded-xl p-6">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                      <CheckCircle className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-blue-900">Başarılı!</h3>
                  </div>
                  <p className="text-sm text-blue-800 mb-6 text-center">
                    Ürününüz başarıyla teslim alındı ve ödeme yapıldı.
                  </p>
                  
                  <div className="space-y-3 max-w-md mx-auto">
                    <div className="flex items-start gap-3 p-4 bg-white rounded-lg shadow-md border border-blue-200">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Banknote className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-blue-600 mb-1 font-medium">Anlaşılan Fiyat</p>
                        <p className="text-2xl font-bold text-blue-700">{request.finalPrice?.toLocaleString('tr-TR')} ₺</p>
                      </div>
                    </div>
                    
                    {request.completedAt && (
                      <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-200">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Teslim Tarihi</p>
                          <p className="font-medium text-sm text-gray-800">{new Date(request.completedAt).toLocaleDateString('tr-TR')}</p>
                        </div>
                      </div>
                    )}
                    
                    {request.paymentStatus && (
                      <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-200">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 mb-0.5">Ödeme Durumu</p>
                          <p className="font-medium text-sm text-green-700">
                            {request.paymentStatus === 'paid' ? 'Ödeme Tamamlandı' : 'Beklemede'}
                            {request.paymentMethod && ` (${request.paymentMethod})`}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}