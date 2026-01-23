import { ShoppingCart, Package, ArrowRight, Sparkles } from 'lucide-react@0.487.0';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';

interface ProductActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductActionModal({ open, onOpenChange }: ProductActionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-0 bg-gradient-to-br from-blue-100/60 via-gray-50 to-green-100/60" aria-describedby={undefined}>
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#f97316] rounded-full opacity-10 blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#1e3a8a] rounded-full opacity-10 blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-[#7FA99B] to-[#FF8A6B] rounded-full opacity-5 blur-3xl"></div>
        </div>

        <div className="relative z-10 p-6">
          <DialogHeader className="mb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-[#f97316] animate-pulse" />
              <DialogTitle className="text-3xl text-center bg-gradient-to-r from-[#1e3a8a] via-[#f97316] to-[#1e3a8a] bg-clip-text text-transparent">
                Ürün Alım-Satım
              </DialogTitle>
              <Sparkles className="w-5 h-5 text-[#f97316] animate-pulse" />
            </div>
            <DialogDescription className="text-center text-base text-gray-600">
              İhtiyacınıza uygun seçeneği seçin ve hemen başlayın
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ÜRÜN ALMAK */}
            <Link to="/urunler" onClick={() => onOpenChange(false)} className="group">
              <div className="relative h-full p-6 rounded-2xl bg-white border-2 border-blue-200 hover:border-blue-500 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* Icon Circle with Animation */}
                <div className="relative z-10 mb-4 flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
                    <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                      <ShoppingCart className="w-10 h-10 text-blue-600 group-hover:scale-110 transition-transform" />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="relative z-10 text-center">
                  <h3 className="text-xl mb-2 text-gray-900 group-hover:text-blue-600 transition-colors">
                    Ürün Almak İstiyorum
                  </h3>
                  <p className="text-gray-600 mb-3 leading-relaxed text-sm">
                    Satılık ürünleri inceleyin ve kaliteli ikinci el ürünleri uygun fiyatlarla satın alın
                  </p>
                  
                  {/* Features */}
                  <div className="space-y-1.5 mb-4 text-sm text-left">
                    <div className="flex items-center gap-2 text-gray-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      <span>Geniş ürün katalogu</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      <span>Test edilmiş ürünler</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      <span>Güvenli alışveriş</span>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="flex items-center justify-center gap-2 text-blue-600 group-hover:gap-4 transition-all">
                    <span className="font-semibold">Ürün İncele</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Decorative Corner */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500 opacity-5 rounded-bl-full group-hover:scale-150 transition-transform duration-500"></div>
              </div>
            </Link>

            {/* ÜRÜN SATMAK */}
            <Link to="/urun-sat" onClick={() => onOpenChange(false)} className="group">
              <div className="relative h-full p-6 rounded-2xl bg-white border-2 border-green-200 hover:border-green-500 transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/20 overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* Icon Circle with Animation */}
                <div className="relative z-10 mb-4 flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
                    <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300 shadow-lg">
                      <Package className="w-10 h-10 text-green-600 group-hover:scale-110 transition-transform" />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="relative z-10 text-center">
                  <h3 className="text-xl mb-2 text-gray-900 group-hover:text-green-600 transition-colors">
                    Ürün Satmak İstiyorum
                  </h3>
                  <p className="text-gray-600 mb-3 leading-relaxed text-sm">
                    Kullanmadığınız ürünleri değerlendirin ve anında nakit kazanın
                  </p>
                  
                  {/* Features */}
                  <div className="space-y-1.5 mb-4 text-sm text-left">
                    <div className="flex items-center gap-2 text-gray-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      <span>Hızlı değerlendirme</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      <span>Adil fiyat teklifi</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      <span>Anında ödeme</span>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="flex items-center justify-center gap-2 text-green-600 group-hover:gap-4 transition-all">
                    <span className="font-semibold">Ürün Sat</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Decorative Corner */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-green-500 opacity-5 rounded-bl-full group-hover:scale-150 transition-transform duration-500"></div>
              </div>
            </Link>
          </div>

          {/* Bottom Info */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              💡 Tüm ürünlerimiz titizlikle kontrol edilir ve test edilir
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}