import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Truck, FileText, CheckCircle } from 'lucide-react';

interface MovingReportModalProps {
  open: boolean;
  onClose: () => void;
  request: any;
}

export default function MovingReportModal({ open, onClose, request }: MovingReportModalProps) {
  if (!request) return null;

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  // Rapor numarası oluştur
  const raporNo = request.requestNumber || request.request_number || `NAK-${request.id}`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <div className="print:p-8">
          <DialogHeader className="print:border-b print:pb-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-3 text-2xl">
                  <Truck className="w-7 h-7 text-orange-600" />
                  Nakliye Hizmet Raporu
                </DialogTitle>
                <p className="text-sm text-gray-500 mt-1">Rapor No: {raporNo}</p>
              </div>
              <div className="print:hidden">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                  Tamamlandı
                </span>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-6 space-y-6">
            {/* Başlık */}
            <div className="text-center border-b pb-4">
              <h2 className="text-xl text-gray-900 mb-2">
                {request.homeSize || request.home_size} Nakliye Hizmeti
              </h2>
              <p className="text-sm text-gray-600">
                {request.fromAddress || request.from_address} → {request.toAddress || request.to_address}
              </p>
            </div>

            {/* Firma ve Nakliye Bilgileri */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm text-gray-900 mb-3">Hizmet Veren Firma</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-900">Ersin Spot</p>
                  <p className="text-gray-600">0 507 194 05 50</p>
                  <p className="text-gray-600">ersin1235@gmail.com</p>
                  <p className="text-gray-600">İzmir, Buca</p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm text-gray-900 mb-3">Nakliye Bilgileri</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-gray-500">Nakliye Tarihi</p>
                    <p className="text-gray-900">
                      {formatDate(request.moving_date || request.appointmentDate)}
                      {request.preferred_time || request.appointmentTime ? ` - ${request.preferred_time || request.appointmentTime}` : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Toplam Tutar</p>
                    <p className="text-xl text-[#1e3a8a]">
                      {Number(
                        request.admin_offer_price || 
                        request.admin_offer || 
                        request.adminOffer || 
                        request.calculatedPrice || 
                        0
                      ).toLocaleString('tr-TR')} ₺
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Nakliye Detayları */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="flex items-center gap-2 mb-3 text-gray-900">
                <FileText className="w-5 h-5" />
                Nakliye Detayları
              </h3>
              
              {/* Müşteri Bilgileri */}
              <div className="mb-4 pb-4 border-b border-gray-200">
                <h4 className="text-sm mb-2 text-gray-900">Müşteri Bilgileri</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Ad Soyad:</span>
                    <span className="ml-2 text-gray-900">{request.customerName || request.customer_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Telefon:</span>
                    <span className="ml-2 text-gray-900">{request.customerPhone || request.customer_phone}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">E-posta:</span>
                    <span className="ml-2 text-gray-900">{request.customerEmail || request.customer_email}</span>
                  </div>
                </div>
              </div>

              {/* Adres Bilgileri */}
              <div className="mb-4 pb-4 border-b border-gray-200">
                <h4 className="text-sm mb-2 text-gray-900">Adres Bilgileri</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  {/* Nereden */}
                  <div>
                    <p className="text-orange-600 mb-1">📍 Nereden</p>
                    <p className="text-gray-900 mb-1">{request.fromAddress || request.from_address}</p>
                    <div className="text-gray-600 text-xs space-y-0.5">
                      {(request.fromCity || request.from_city) && <p>Şehir: {request.fromCity || request.from_city}</p>}
                      {(request.fromDistrict || request.from_district) && <p>İlçe: {request.fromDistrict || request.from_district}</p>}
                      <p>Kat: {request.fromFloor || request.from_floor || request.floor || 0}</p>
                      <p>Asansör: {request.fromHasElevator || request.from_has_elevator || request.elevator_from ? 'Var ✅' : 'Yok ❌'}</p>
                    </div>
                  </div>

                  {/* Nereye */}
                  <div>
                    <p className="text-blue-600 mb-1">📍 Nereye</p>
                    <p className="text-gray-900 mb-1">{request.toAddress || request.to_address}</p>
                    <div className="text-gray-600 text-xs space-y-0.5">
                      {(request.toCity || request.to_city) && <p>Şehir: {request.toCity || request.to_city}</p>}
                      {(request.toDistrict || request.to_district) && <p>İlçe: {request.toDistrict || request.to_district}</p>}
                      <p>Kat: {request.toFloor || request.to_floor || request.target_floor || 0}</p>
                      <p>Asansör: {request.toHasElevator || request.to_has_elevator || request.elevator_to ? 'Var ✅' : 'Yok ❌'}</p>
                    </div>
                  </div>
                </div>
                {request.distance && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <span className="text-gray-500 text-sm">Mesafe:</span>
                    <span className="ml-2 text-blue-900">{Number(request.distance).toFixed(1)} km</span>
                  </div>
                )}
              </div>

              {/* Ev ve Eşya Bilgileri */}
              <div>
                <h4 className="text-sm mb-2 text-gray-900">Ev ve Eşya Bilgileri</h4>
                <div className="text-sm space-y-2">
                  <p className="text-gray-900">Ev Büyüklüğü: <span className="text-gray-900">{request.homeSize || request.home_size}</span></p>
                  
                  {/* Seçili Eşyalar */}
                  {request.selectedItems && request.selectedItems.length > 0 && (
                    <div>
                      <p className="text-gray-500 mb-1">Taşınan Eşyalar:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {request.selectedItems.map((item: any, index: number) => (
                          <span key={index} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-900">
                            {item.name || item.item_name}
                            {item.quantity > 1 && <span className="text-gray-500">x{item.quantity}</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Özel Eşyalar */}
                  {request.customItems && request.customItems.length > 0 && (
                    <div>
                      <p className="text-gray-500 mb-1">Özel Eşyalar:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {request.customItems.map((item: any, index: number) => (
                          <span key={index} className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 border border-orange-200 rounded text-xs text-gray-900">
                            {item.name || item.item_name}
                            {item.quantity > 1 && <span className="text-gray-500">x{item.quantity}</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Yapılan İşlemler */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="flex items-center gap-2 mb-3 text-gray-900">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Yapılan İşlemler
              </h3>
              <ul className="space-y-2">
                {yapilanIslemler.map((islem, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-900">{islem}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Notlar */}
            {(request.notes || request.description || request.admin_notes || request.adminNote) && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="flex items-center gap-2 mb-3 text-gray-900">
                  <FileText className="w-5 h-5 text-yellow-600" />
                  Notlar
                </h3>
                <div className="space-y-2 text-sm">
                  {(request.notes || request.description) && (
                    <div>
                      <p className="text-gray-500 mb-1">Müşteri Notu:</p>
                      <p className="text-gray-900">{request.notes || request.description}</p>
                    </div>
                  )}
                  {(request.admin_notes || request.adminNote) && (
                    <div className={request.notes || request.description ? 'pt-2 border-t border-yellow-200' : ''}>
                      <p className="text-gray-500 mb-1">Admin Notu:</p>
                      <p className="text-gray-900">{request.admin_notes || request.adminNote}</p>
                    </div>
                  )}
                </div>
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
      </DialogContent>
    </Dialog>
  );
}
