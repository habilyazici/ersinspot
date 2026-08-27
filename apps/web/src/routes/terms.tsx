/**
 * Kullanım koşulları.
 *
 * Metin, sistemin GERÇEK davranışını anlatır: teslimat ücreti eşiği, keşif
 * ücreti, iptal edilebilir sipariş durumları ve hizmet verilen ilçeler hep
 * paylaşılan sabitlerden okunur. Sayı elle yazılsaydı kural değiştiğinde
 * koşullar metni sessizce yanlış hale gelirdi — ve yanlış bir koşul metni,
 * hiç olmamasından kötüdür.
 *
 * HUKUKİ İNCELEME GEREKİR. Buradaki metin, işleyişin dürüst bir özetidir;
 * yayına almadan önce bir hukukçu tarafından gözden geçirilmelidir. Özellikle
 * cayma hakkı, ayıplı mal ve garanti maddeleri mevzuata göre
 * biçimlendirilmelidir.
 */

import { Link } from 'react-router-dom';
import {
  DELIVERY_FEE_OTHER_DISTRICT,
  FREE_DELIVERY_THRESHOLD,
  INSPECTION_FEE,
  SERVICED_DISTRICTS,
} from '@ersinspot/shared';
import { PageContainer, PageHeader, Section } from '@/components/ui/page.tsx';
import { formatPrice } from '@/lib/format.ts';

export default function TermsPage() {
  return (
    <PageContainer width="prose">
      <PageHeader
        title="Kullanım Koşulları"
        description="Bu sayfa, Ersin Spot üzerinden yapılan alışveriş ve hizmet taleplerinde geçerli olan kuralları açıklar."
      />

      <div className="mt-8 space-y-8 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-slate-700">
        <Section title="Kapsam">
          <p>
            Bu koşullar, ersinspot.com üzerinden yapılan ürün siparişleri ile nakliye, teknik servis
            ve ürün satma taleplerini kapsar. Siteyi kullanarak bu koşulları kabul etmiş olursunuz.
          </p>
        </Section>

        <Section title="Hesap">
          <p>
            Sipariş vermek ve hizmet talebi oluşturmak için hesap açmanız gerekir. Verdiğiniz ad,
            telefon ve adres bilgilerinin doğru olmasından siz sorumlusunuz; teslimat ve randevular
            bu bilgilere göre planlanır. Hesabınızın şifresini paylaşmayın.
          </p>
          <p>
            Nakliye, teknik servis ve ürün satma taleplerinde e-posta adresinizi doğrulamanız
            istenir. Bu adım, ekibimizin gerçek bir talebe yola çıkmasını güvence altına alır.
          </p>
        </Section>

        <Section title="Ürünler ve Fiyatlar">
          <p>
            Sitede satılan ürünler ikinci eldir. Her ürünün durumu (sıfır ayarında, iyi, orta,
            yıpranmış) ilan sayfasında belirtilir ve fotoğraflar ürünün kendisine aittir.
          </p>
          <p>
            Fiyatlar Türk Lirası cinsindendir ve KDV dahildir. Bir ürün tek adettir: siparişi
            oluşturulan ürün aynı anda başka birine satılamaz, sipariş iptal edilirse yeniden satışa
            açılır.
          </p>
          <p>
            Sipariş tutarı, siparişi onayladığınız anda sunucu tarafından kesinleştirilir. Sepetteki
            bir ürünün fiyatı bu arada değiştiyse sipariş oluşturulmaz ve güncel tutar size
            gösterilir.
          </p>
        </Section>

        <Section title="Teslimat">
          <p>
            Teslimat, {SERVICED_DISTRICTS.length} ilçede yapılır: {SERVICED_DISTRICTS.join(', ')}.
            Mağazadan teslim alma seçeneğinde teslimat ücreti alınmaz.
          </p>
          <p>
            Buca dışındaki ilçelere teslimat ücreti {formatPrice(DELIVERY_FEE_OTHER_DISTRICT)}
            &apos;dir. {formatPrice(FREE_DELIVERY_THRESHOLD)} ve üzeri siparişlerde teslimat
            ücretsizdir.
          </p>
          <p>
            Teslimat günü ve saat aralığı sipariş sırasında seçilir. Teslimat öncesinde sizi
            telefonla arayarak teyit ederiz.
          </p>
        </Section>

        <Section title="Ödeme">
          <p>
            Kapıda nakit ödeme ve havale/EFT kabul edilir. Havale seçildiğinde sipariş, ödeme
            bildiriminiz ulaşana kadar &quot;ödeme bekleniyor&quot; durumunda tutulur.
          </p>
        </Section>

        <Section title="Sipariş İptali">
          <p>
            Siparişinizi, hazırlığa geçilmeden önce hesabınızdan kendiniz iptal edebilirsiniz.
            Hazırlanmaya başlanmış veya yola çıkmış bir sipariş için bizimle iletişime geçmeniz
            gerekir.
          </p>
          <p>
            Mesafeli satış sözleşmelerinde geçerli olan cayma hakkınız saklıdır. Cayma talebinizi
            iletişim kanallarımızdan bildirebilirsiniz.
          </p>
        </Section>

        <Section title="Teknik Servis">
          <p>
            Teknik servis talebinde {formatPrice(INSPECTION_FEE)} keşif ücreti alınır. Bu ücret,
            teknisyenimizin adresinize gelip arızayı yerinde incelemesinin karşılığıdır ve talebi
            oluştururken onaylamanız istenir.
          </p>
          <p>
            Onarımı bize yaptırmanız hâlinde keşif ücreti toplam tutardan düşülür. Onarım fiyatı,
            arıza görüldükten sonra ayrı bir teklif olarak iletilir; kabul edip etmemek size
            kalmıştır.
          </p>
        </Section>

        <Section title="Nakliye">
          <p>
            Nakliye formunda gösterilen tutar bir TAHMİNDİR ve bağlayıcı değildir. Bağlayıcı fiyat,
            ekibimiz talebinizi inceledikten sonra ilettiği tekliftir. Teklifi kabul ettiğinizde
            taşınma günü için randevu verilir.
          </p>
          <p>
            Eşya listesini eksiksiz vermeniz, teklifin gerçeğe yakın olmasını sağlar. Taşınma günü
            listede olmayan eşyalar için ek ücret doğabilir.
          </p>
        </Section>

        <Section title="Ürün Satma">
          <p>
            Ürününüzü satın almamız için önce fotoğraflarıyla birlikte tanıtmanız gerekir. Ekibimiz
            inceledikten sonra size bir fiyat teklifi sunar. Teklifi kabul ederseniz ürün
            adresinizden teslim alınır.
          </p>
          <p>
            Teklif, ürünün fotoğraflarda ve açıklamada bildirdiğiniz durumda olduğu varsayımıyla
            verilir. Teslim alma sırasında ürünün bildirilenden farklı olması hâlinde teklif
            güncellenebilir.
          </p>
        </Section>

        <Section title="Kişisel Veriler">
          <p>
            Ad, telefon, e-posta ve adres bilgileriniz yalnızca siparişinizi ve hizmet talebinizi
            yerine getirmek için kullanılır. Bu bilgiler üçüncü kişilerle pazarlama amacıyla
            paylaşılmaz.
          </p>
          <p>
            Sipariş ve talep kayıtlarınız, yasal saklama yükümlülükleri ve olası uyuşmazlıklar
            nedeniyle saklanır.
          </p>
        </Section>

        <Section title="İletişim">
          <p>
            Bu koşullarla ilgili sorularınız için{' '}
            <Link to="/sss" className="font-medium text-brand-navy-700 hover:underline">
              sıkça sorulan sorular
            </Link>{' '}
            sayfasına bakabilir veya bize doğrudan yazabilirsiniz.
          </p>
        </Section>
      </div>
    </PageContainer>
  );
}
