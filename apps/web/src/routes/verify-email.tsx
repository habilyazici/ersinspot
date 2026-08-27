/**
 * E-posta doğrulama.
 *
 * Kayıt sonrası gönderilen e-postadaki bağlantının indiği sayfa. Sunucu
 * `${WEB_ORIGIN}/eposta-dogrula?token=...` adresini yazıyordu ama bu sayfa
 * hiç yoktu: kayıt olan hiç kimse e-postasını doğrulayamıyordu. Doğrulama
 * nakliye, teknik servis ve ürün satma taleplerinin ön koşulu olduğu için üç
 * akış birden kapalıydı.
 *
 * Jeton adres çubuğundan okunur ve sayfa açılır açılmaz TEK KEZ gönderilir.
 * Kullanıcıdan ayrıca bir düğmeye basması istenmez — e-postadaki bağlantıya
 * tıklamak zaten niyet beyanıdır.
 */

import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CircleCheck, CircleX, Loader2 } from 'lucide-react';
import { ApiError } from '@ersinspot/shared';
import { Button } from '@/components/ui/button.tsx';
import { PageContainer, PageHeader } from '@/components/ui/page.tsx';
import { useVerifyEmail } from '@/features/auth';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const verifyEmail = useVerifyEmail();

  /*
    Doğrulama tek kez çalışmalıdır: jeton tek kullanımlıktır ve React'in
    geliştirme modundaki çift çalıştırması ikinci isteği "geçersiz jeton"
    hatasıyla döndürürdü.
  */
  const requested = useRef(false);

  useEffect(() => {
    if (token === '' || requested.current) return;
    requested.current = true;
    verifyEmail.mutate(token);
  }, [token, verifyEmail]);

  if (token === '') {
    return (
      <PageContainer width="narrow">
        <PageHeader
          align="center"
          icon={CircleX}
          title="Bağlantı eksik"
          description="Doğrulama bağlantısı geçersiz görünüyor. E-postadaki bağlantıyı olduğu gibi kopyalayıp tarayıcınıza yapıştırmayı deneyin."
        />

        <div className="mt-8 text-center">
          <Button asChild variant="outline">
            <Link to="/">Anasayfaya dön</Link>
          </Button>
        </div>
      </PageContainer>
    );
  }

  if (verifyEmail.isPending || verifyEmail.isIdle) {
    return (
      <PageContainer width="narrow">
        <PageHeader
          align="center"
          icon={Loader2}
          title="Doğrulanıyor"
          description="E-posta adresiniz doğrulanıyor, lütfen bekleyin."
        />
      </PageContainer>
    );
  }

  if (verifyEmail.isError) {
    const message =
      verifyEmail.error instanceof ApiError
        ? verifyEmail.error.message
        : 'Doğrulama tamamlanamadı. Lütfen tekrar deneyin.';

    return (
      <PageContainer width="narrow">
        <PageHeader align="center" icon={CircleX} title="Doğrulanamadı" description={message} />

        <p className="mt-6 text-center text-sm text-slate-600">
          Bağlantının süresi dolmuş olabilir. Hesabınıza giriş yapıp yeni bir doğrulama e-postası
          isteyebilirsiniz.
        </p>

        <div className="mt-6 flex justify-center gap-2">
          <Button asChild>
            <Link to="/giris">Giriş yap</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Anasayfa</Link>
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer width="narrow">
      <PageHeader
        align="center"
        icon={CircleCheck}
        title="E-postanız doğrulandı"
        description="Artık nakliye, teknik servis ve ürün satma taleplerini oluşturabilirsiniz."
      />

      <div className="mt-8 flex justify-center gap-2">
        <Button asChild>
          <Link to="/urunler">Ürünlere göz at</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/hesabim">Hesabım</Link>
        </Button>
      </div>
    </PageContainer>
  );
}
