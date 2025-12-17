import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { ShoppingCart, Heart, LogIn, UserPlus } from 'lucide-react@0.487.0';

interface GuestUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: 'cart' | 'favorite'; // Sepete ekle veya favorilere ekle
}

export default function GuestUserDialog({ 
  open, 
  onOpenChange, 
  action
}: GuestUserDialogProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = () => {
    onOpenChange(false);
    // Mevcut sayfayı returnUrl olarak kaydet
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    navigate(`/giris?returnUrl=${returnUrl}`);
  };

  const handleRegister = () => {
    onOpenChange(false);
    // Mevcut sayfayı returnUrl olarak kaydet
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    navigate(`/kayit?returnUrl=${returnUrl}`);
  };

  const dialogContent = {
    cart: {
      icon: ShoppingCart,
      title: 'Sepete Eklemek İçin',
      description: 'Ürünü sepete eklemek için giriş yapmanız gerekmektedir.',
      loginButtonText: 'Giriş Yaparak Devam Et',
    },
    favorite: {
      icon: Heart,
      title: 'Favorilere Eklemek İçin',
      description: 'Favorilere ürün ekleyebilmek için giriş yapmanız gerekmektedir.',
      loginButtonText: 'Giriş Yap',
    },
  };

  const content = dialogContent[action];
  const Icon = content.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1e3a8a] to-[#f97316] flex items-center justify-center">
              <Icon className="w-8 h-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl text-[#1e3a8a]">
            {content.title}
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            {content.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-6">
          {/* Giriş Yap Butonu */}
          <Button
            onClick={handleLogin}
            className="w-full bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white py-6 text-base"
            size="lg"
          >
            <LogIn className="w-5 h-5 mr-2" />
            {content.loginButtonText}
          </Button>
          {/* Kayıt Ol Butonu */}
          <Button
            onClick={handleRegister}
            className="w-full bg-[#f97316] hover:bg-[#f97316]/90 text-white py-6 text-base"
            size="lg"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Kayıt Ol
          </Button>
        </div>

        {/* Bilgilendirme */}
        <div className="mt-6 p-4 bg-gradient-to-br from-[#FFF8F3] to-[#FFF4F1] rounded-lg border border-[#f97316]/20">
          <p className="text-sm text-gray-600 text-center">
            {action === 'cart' ? (
              <>
                <span className="text-[#1e3a8a] font-semibold">Giriş yaparak</span> siparişlerinizi takip edebilir, 
                <span className="text-[#1e3a8a] font-semibold"> favorilerinizi</span> yönetebilir ve 
                <span className="text-[#1e3a8a] font-semibold"> hızlı alışveriş</span> yapabilirsiniz.
              </>
            ) : (
              <>
                <span className="text-[#1e3a8a] font-semibold">Giriş yaparak</span> beğendiğiniz ürünleri 
                <span className="text-[#1e3a8a] font-semibold"> favorilerinize</span> ekleyebilir ve 
                <span className="text-[#1e3a8a] font-semibold"> kolayca</span> ulaşabilirsiniz.
              </>
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}