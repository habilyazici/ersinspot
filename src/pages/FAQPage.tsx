import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, HelpCircle, ChevronDown, ChevronUp, MessageSquare, Package, Wrench, Truck, CreditCard, Shield, Maximize2, Minimize2, Tag, Phone, Mail, Clock } from 'lucide-react@0.487.0';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { motion } from 'motion/react';

interface FAQItem {
  id: number;
  question: string;
  answer: string;
  category: 'genel' | 'urunler' | 'teknik-servis' | 'tasimacilik' | 'odeme' | 'garanti';
}

const faqData: FAQItem[] = [
  // GENEL SORULAR
  {
    id: 1,
    question: 'Ersin Spot nedir ve hangi hizmetleri sunuyor?',
    answer: 'Ersin Spot, İzmir Buca merkezli 10+ yıllık tecrübesiyle ikinci el ve az kullanılmış beyaz eşya, elektronik ve mobilya alım-satımı yapan güvenilir bir firmadır. Aynı zamanda profesyonel teknik servis ve nakliye hizmetleri sunmaktayız. 5000+ mutlu müşterimiz ve %94 memnuniyet oranımızla İzmir genelinde hizmet veriyoruz.',
    category: 'genel'
  },
  {
    id: 2,
    question: 'Hizmet verdiğiniz bölgeler nerelerdir?',
    answer: 'Ana merkezimiz İzmir Buca\'da bulunmaktadır ve İzmir genelinde hizmet vermekteyiz. Nakliye ve teknik servis hizmetlerimiz için adresinize geliyoruz. Detaylı bölge bilgisi için 0 507 194 05 50 numaralı telefondan bize ulaşabilirsiniz.',
    category: 'genel'
  },
  {
    id: 3,
    question: 'Çalışma saatleriniz nedir?',
    answer: 'Hafta içi 09:00 - 19:00, Cumartesi 09:00 - 18:00 saatleri arasında hizmet vermekteyiz. Pazar günleri kapalıyız. Acil durumlar için online randevu sistemi üzerinden hafta içi randevu oluşturabilirsiniz.',
    category: 'genel'
  },
  
  // ÜRÜNLER HAKKINDA
  {
    id: 4,
    question: 'Sattığınız ürünler yeni mi, ikinci el mi?',
    answer: 'Ersin Spot olarak sadece ikinci el ve az kullanılmış ürünler satıyoruz. Sıfır ürün kesinlikle bulunmamaktadır. Tüm ürünlerimiz teknik kontrolden geçirilmiş, test edilmiş ve temizlenmiş olarak satışa sunulmaktadır. Her ürünün durumu (Az Kullanılmış, İkinci El, Yenilenmiş) açıkça belirtilmiştir.',
    category: 'urunler'
  },
  {
    id: 5,
    question: 'Ürünler garanti kapsamında mı?',
    answer: 'Evet! Satışını gerçekleştirdiğimiz tüm ürünlerde 3 aylık Ersin Spot garantisi bulunmaktadır. Ürün kategorisine göre garanti kapsamı değişiklik gösterebilir. Elektronik ürünlerde mekanik arızalar, beyaz eşyalarda motor ve kompresör arızaları garanti kapsamındadır. Detaylar ürün sayfasında belirtilmektedir.',
    category: 'urunler'
  },
  {
    id: 6,
    question: 'Ürünleri online sipariş edebilir miyim?',
    answer: 'Evet! Web sitemiz üzerinden sepete ekleme yaparak online sipariş verebilirsiniz. Siparişinizi verdikten sonra en kısa sürede sizinle iletişime geçerek teslimat detaylarını planlıyoruz. Ödeme işlemini teslimat sırasında nakit veya kredi kartı ile yapabilirsiniz.',
    category: 'urunler'
  },
  {
    id: 7,
    question: 'Ürünü beğenmezsem iade edebilir miyim?',
    answer: 'Ürünü teslim aldıktan sonra 3 gün içinde herhangi bir hasar vermeden iade edebilirsiniz. İade koşulları: Ürün orijinal ambalajında olmalı, kullanılmamış olmalı ve fatura ile birlikte teslim edilmelidir. İade onayı sonrası ödemeniz 5 iş günü içinde iade edilir.',
    category: 'urunler'
  },
  {
    id: 8,
    question: 'Kullanılmış ürün satmak istiyorum, nasıl yapabilirim?',
    answer: 'Web sitemizde "Ürün Sat" bölümünden ürününüzün fotoğraflarını (minimum 5 adet) ve detaylarını yükleyebilirsiniz. Uzman ekibimiz ürününüzü değerlendirerek size en iyi fiyat teklifini sunar. Anlaşma sağlanması durumunda ürünü adresinizden ücretsiz olarak alıyoruz.',
    category: 'urunler'
  },
  {
    id: 9,
    question: 'Toplu alımda indirim var mı?',
    answer: 'Evet! 3 veya daha fazla ürün alımlarında özel indirimler sunuyoruz. Ayrıca komple beyaz eşya veya elektronik paketlerinde kampanyalı fiyatlarımız bulunmaktadır. Detaylı bilgi için müşteri temsilcilerimizle iletişime geçebilirsiniz.',
    category: 'urunler'
  },
  {
    id: 10,
    question: 'Ürünlerin fotoğrafları gerçek mi?',
    answer: 'Evet, web sitemizde gördüğünüz tüm ürün fotoğrafları satışta olan gerçek ürünlere aittir. Her ürün için minimum 5 farklı açıdan çekilmiş fotoğraf bulunmaktadır. Böylece ürünü her yönüyle görebilir ve bilinçli karar verebilirsiniz.',
    category: 'urunler'
  },

  // TEKNİK SERVİS
  {
    id: 11,
    question: 'Teknik servis randevusu nasıl alabilirim?',
    answer: 'Web sitemizin "Teknik Servis" sayfasından online randevu oluşturabilirsiniz. Arızalı cihazınızın fotoğrafını veya videosunu yükleyerek ön değerlendirme yapılmasını sağlayabilirsiniz. Randevu sonrası uzman teknisyenimiz adresinize gelir ve yerinde tamir işlemini gerçekleştirir.',
    category: 'teknik-servis'
  },
  {
    id: 12,
    question: 'Teknik servis ücretleri nasıl belirleniyor?',
    answer: 'Servis ücretleri cihazın türüne, arıza durumuna ve gerekli parçalara göre belirlenir. Web sitemizden randevu oluştururken arıza fotoğrafı/videosu yüklerseniz, admin panelimizdeki uzman ekibimiz tahmini maliyet bilgisini size önceden iletir. Böylece sürpriz ücretlerle karşılaşmazsınız.',
    category: 'teknik-servis'
  },
  {
    id: 13,
    question: 'Hangi markaların servisini yapıyorsunuz?',
    answer: 'Arçelik, Beko, Bosch, Samsung, LG, Siemens, Vestel, Profilo, Altus gibi tüm yerli ve yabancı markaların beyaz eşya ve elektronik ürünlerinin servisini yapmaktayız. 10+ yıllık tecrübemiz ve uzman kadromuzla kaliteli hizmet sunuyoruz.',
    category: 'teknik-servis'
  },
  {
    id: 29,
    question: 'Samsung ürünlerinin servisini yapabiliyor musunuz?',
    answer: 'Evet! Samsung buzdolapları, çamaşır makineleri, bulaşık makineleri ve tüm beyaz eşya ürünlerinin yetkili olmayan ancak uzman servis hizmeti veriyoruz. Samsung ürünleri için orijinal yedek parça kullanımı ve garantili işçilik sunuyoruz. Samsung Digital Inverter kompresörlü buzdolapları, QuickDrive çamaşır makineleri ve WaterWall bulaşık makineleri konusunda özel uzmanlığımız bulunmaktadır.',
    category: 'teknik-servis'
  },
  {
    id: 30,
    question: 'Samsung buzdolaplarında sık görülen arızalar nelerdir?',
    answer: 'Samsung buzdolaplarında en sık karşılaşılan sorunlar: 1) No Frost sisteminde buz oluşumu (defrost sensörü arızası), 2) Digital Inverter kompresör hataları (genellikle elektronik kart kaynaklı), 3) Kapı sensörü sorunları, 4) Twin Cooling sisteminde fan arızaları. Tüm bu arızalarda uzman teknisyenlerimiz yerinde müdahale edebilir. Samsung Family Hub akıllı buzdolaplarında yazılım güncellemeleri ve ekran sorunlarına da destek veriyoruz.',
    category: 'teknik-servis'
  },
  {
    id: 31,
    question: 'Samsung çamaşır makinelerinde EcoBubble teknolojisi ne işe yarar?',
    answer: 'Samsung EcoBubble teknolojisi, deterjanı su ile karıştırarak köpük halinde çamaşırlara uygular, böylece düşük sıcaklıklarda bile etkili yıkama sağlar. Bu teknoloji %40\'a varan enerji tasarrufu sunar. İkinci el Samsung EcoBubble modellerimizde bu sistem tam çalışır durumdadır. Ayrıca AddWash özelliği sayesinde yıkama başladıktan sonra unutulan çamaşırları ekleyebilirsiniz. QuickDrive teknolojisi ile yıkama süresi %50 azalır.',
    category: 'urunler'
  },
  {
    id: 32,
    question: 'Samsung bulaşık makinelerinde WaterWall teknolojisi nedir?',
    answer: 'Samsung WaterWall teknolojisi, geleneksel sprey kollar yerine hareketli su duvarı sistemi kullanır. Bu sayede bulaşıklar %20 daha sessiz ve %99.99 hijyenik temizlenir. Zone Booster özelliği ile alt sepetteki yoğun kirli bulaşıklar için ekstra basınç sağlanır. İkinci el Samsung WaterWall modellerimizde bu teknoloji test edilerek satışa sunulur. Ayrıca FlexLoad ayarlanabilir sepet sistemi ile farklı boyutlarda bulaşıklar yerleştirilebilir.',
    category: 'urunler'
  },
  {
    id: 14,
    question: 'Yapılan tamirat garanti kapsamında mı?',
    answer: 'Evet! Tüm teknik servis işlemlerimizde kullanılan yedek parçalar ve işçilik 90 gün garanti kapsamındadır. Garanti süresi içinde aynı arızanın tekrar etmesi durumunda ücretsiz olarak müdahale edilir.',
    category: 'teknik-servis'
  },
  {
    id: 15,
    question: 'Servis randevusunu iptal edebilir miyim?',
    answer: 'Evet, randevunuzdan 24 saat öncesine kadar ücretsiz olarak iptal edebilir veya tarih değişikliği yapabilirsiniz. Hesabınızdaki "Teknik Servis Randevularım" bölümünden randevunuzu yönetebilirsiniz.',
    category: 'teknik-servis'
  },

  // TAŞIMACILIK
  {
    id: 16,
    question: 'Nakliye hizmeti nasıl çalışıyor?',
    answer: 'Web sitemizin "Taşımacılık" bölümünden nakliye randevusu oluşturabilirsiniz. Ev büyüklüğü (1+1, 2+1, vb.) ve taşınacak eşya envanterinize göre ekibimiz size özel fiyat teklifi hazırlar. Fiyat teklifini onayladıktan sonra belirlediğiniz tarih ve saatte profesyonel ekibimiz eşyalarınızı güvenle taşır.',
    category: 'tasimacilik'
  },
  {
    id: 17,
    question: 'Taşımacılık ücreti nasıl hesaplanıyor?',
    answer: 'Nakliye ücretleri 3 faktöre göre belirlenir: 1) Taşınma mesafesi, 2) Ev büyüklüğü, 3) Taşınacak eşya miktarı. Randevu formu doldurulduktan sonra ekibimiz talebinizi inceler ve size özel fiyat teklifi sunar. Fiyat belirlendikten sonra "Nakliye Taleplerim" sayfanızdan görüntüleyip onaylayabilir veya reddedebilirsiniz.',
    category: 'tasimacilik'
  },
  {
    id: 18,
    question: 'Eşyaların hasar görmesi durumunda ne olur?',
    answer: 'Tüm taşımacılık işlemlerimiz sigorta kapsamındadır. Nakliye sırasında oluşabilecek hasarlarda sigortamız devreye girer. Ancak 5000+ başarılı taşıma deneyimimizde hasar oranımız %1\'in altındadır. Profesyonel paketleme ve güvenli taşıma ekipmanlarımızla eşyalarınız güvende.',
    category: 'tasimacilik'
  },
  {
    id: 19,
    question: 'Sadece beyaz eşya taşıması yapıyor musunuz?',
    answer: 'Hayır, ev taşımacılığı konusunda tam hizmet sunuyoruz. Beyaz eşya, mobilya, elektronik eşya ve tüm ev eşyalarınızı taşıyoruz. Ayrıca sadece beyaz eşya taşıma hizmetimiz de mevcuttur. İhtiyacınıza göre özel paket oluşturulur.',
    category: 'tasimacilik'
  },
  {
    id: 20,
    question: 'Nakliye sırasında asansör yoksa ne olur?',
    answer: 'Asansörsüz binalarda ek kat ücreti uygulanmaktadır. Randevu formunda binanızın asansör durumunu ve kat bilgisini belirtmeniz durumunda size doğru fiyat teklifi sunulur. Profesyonel ekibimiz asansörsüz binalarda da güvenli taşıma garantisi verir.',
    category: 'tasimacilik'
  },

  // ÖDEME
  {
    id: 21,
    question: 'Hangi ödeme yöntemlerini kabul ediyorsunuz?',
    answer: 'Nakit, kredi kartı ve banka kartı ile ödeme kabul ediyoruz. Online siparişlerde ödeme teslimat sırasında yapılmaktadır. Kredi kartına taksit imkanı mevcuttur (banka kampanyalarına göre değişir). Havale/EFT ile de ödeme kabul edilmektedir.',
    category: 'odeme'
  },
  {
    id: 22,
    question: 'Taksit imkanı var mı?',
    answer: 'Evet! Kredi kartlarına özel taksit seçeneklerimiz bulunmaktadır. Banka kampanyalarına göre 3, 6, 9 veya 12 aya kadar taksit yapabilirsiniz. Taksit oranları bankanızın kampanyasına göre değişmektedir. Detaylı bilgi için teslimat sırasında POS cihazından öğrenebilirsiniz.',
    category: 'odeme'
  },
  {
    id: 23,
    question: 'Online ödeme güvenli mi?',
    answer: 'Müşteri güvenliği bizim önceliğimizdir. Şu an için online ödeme sistemimiz bulunmamaktadır, tüm ödemeler teslimat sırasında güvenli POS cihazı ile veya nakit olarak alınmaktadır. Böylece ürünü görmeden ödeme yapma riski ortadan kalkar.',
    category: 'odeme'
  },
  {
    id: 24,
    question: 'Fatura kesiyor musunuz?',
    answer: 'Evet, tüm satışlarımızda fatura kesilmektedir. Bireysel veya kurumsal fatura seçenekleri mevcuttur. Sipariş sırasında fatura bilgilerinizi belirtmeniz yeterlidir. E-fatura gönderimine de olanak sağlıyoruz.',
    category: 'odeme'
  },

  // GARANTİ VE DESTEK
  {
    id: 25,
    question: 'Garanti kapsamı nedir?',
    answer: 'Tüm ürünlerimizde 3 aylık Ersin Spot garantisi bulunmaktadır. Garanti kapsamında mekanik arızalar, motor problemleri ve fonksiyon bozukluklar yer alır. Kullanıcı hatasından kaynaklanan arızalar, fiziksel hasarlar ve yanlış kullanım garanti kapsamı dışındadır.',
    category: 'garanti'
  },
  {
    id: 26,
    question: 'Garanti sürecinde nasıl destek alabilirim?',
    answer: 'Garanti kapsamındaki arızalarda 0 507 194 05 50 numaralı telefondan veya ersin1235@gmail.com e-posta adresinden bize ulaşabilirsiniz. Arızalı ürünü mağazamıza getirmeniz veya teknik servis randevusu oluşturmanız yeterlidir. Garanti kapsamındaki tüm işlemler ücretsizdir.',
    category: 'garanti'
  },
  {
    id: 27,
    question: 'Müşteri memnuniyeti garantiniz var mı?',
    answer: '5000+ mutlu müşteri ve %94 memnuniyet oranı ile sektörde öncüyüz. Müşteri memnuniyeti bizim için öncelik. Herhangi bir sorunuz veya şikayetiniz olduğunda anında çözüm üretiyoruz. Memnuniyetinizi sağlamak için elimizden geleni yapıyoruz.',
    category: 'garanti'
  },
  {
    id: 28,
    question: 'Ürün değişimi yapabiliyor musunuz?',
    answer: 'Evet, garanti süresi içinde ürününüzde tekrarlayan arıza olması durumunda ürün değişimi yapılabilir. Ayrıca teslimattan sonraki 3 gün içinde ürünü beğenmemeniz durumunda da (hasarsız ve kullanılmamış ise) değişim veya iade hakkınız bulunmaktadır.',
    category: 'garanti'
  },
];

const categories = [
  { value: 'hepsi', label: 'Tüm Sorular', icon: HelpCircle },
  { value: 'genel', label: 'Genel Sorular', icon: MessageSquare },
  { value: 'urunler', label: 'Ürünler', icon: Package },
  { value: 'teknik-servis', label: 'Teknik Servis', icon: Wrench },
  { value: 'tasimacilik', label: 'Taşımacılık', icon: Truck },
  { value: 'odeme', label: 'Ödeme', icon: CreditCard },
  { value: 'garanti', label: 'Garanti & Destek', icon: Shield },
];

export default function FAQPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('hepsi');
  const [searchQuery, setSearchQuery] = useState('');
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [expandAll, setExpandAll] = useState(false);

  // Filtreleme
  const filteredFAQs = faqData.filter(faq => {
    const matchesCategory = selectedCategory === 'hepsi' || faq.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleFAQ = (id: number) => {
    setOpenFAQ(openFAQ === id ? null : id);
  };

  // Tüm soruları genişlet/daralt
  const handleExpandAll = () => {
    if (expandAll) {
      setOpenFAQ(null);
      setExpandAll(false);
    } else {
      setExpandAll(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-gray-50 via-blue-50/50 to-orange-50/40 text-gray-900 py-20 overflow-hidden border-b border-gray-200">
        {/* Animated Background Shapes - YUMUŞAK */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-64 h-64 bg-[#1e3a8a]/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-[#f97316]/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#7FA99B]/5 rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="bg-[#f97316] hover:bg-[#ea580c] text-white mb-4 px-4 py-1.5">
              <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
              Sıkça Sorulan Sorular
            </Badge>
            
            <h1 className="mb-6 text-gray-900">
              Size Nasıl Yardımcı Olabiliriz?
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              İkinci el ürünler, teknik servis ve taşımacılık hizmetlerimiz hakkında merak ettiğiniz her şey burada!
            </p>

            {/* Arama Kutusu */}
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Sorunuzu arayın... (örn: garanti, ürün değişimi, teslimat)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-6 text-lg bg-gradient-to-br from-blue-50/40 via-orange-50/30 to-teal-50/40 text-gray-900 border-0 shadow-2xl focus:ring-4 focus:ring-[#f97316]/30"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Kategori Filtreleri */}
      <section className="py-8 bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between gap-4">
            {/* Kategori Butonları */}
            <div className="flex flex-wrap gap-3 justify-center flex-1">
              {categories.map((category) => {
                const Icon = category.icon;
                const isActive = selectedCategory === category.value;
                return (
                  <Button
                    key={category.value}
                    onClick={() => setSelectedCategory(category.value)}
                    variant={isActive ? 'default' : 'outline'}
                    className={`
                      ${isActive 
                        ? 'bg-[#f97316] text-white hover:bg-[#ea580c] shadow-lg border-0' 
                        : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                      }
                      transition-all duration-300 group
                    `}
                  >
                    <Icon className={`w-4 h-4 mr-2 ${isActive ? '' : 'group-hover:scale-110 transition-transform'}`} />
                    {category.label}
                  </Button>
                );
              })}
            </div>

            {/* BLOG Link - GÖZE ÇARPICI */}
            <Link to="/blog">
              <Button
                size="default"
                className="whitespace-nowrap bg-[#1e3a8a] text-white hover:bg-[#1e40af] border-0 shadow-lg hover:shadow-xl transition-all duration-300 flex-shrink-0"
              >
                <Tag className="w-4 h-4 mr-2" />
                <span className="font-medium">Blog & İpuçları</span>
              </Button>
            </Link>
          </div>

          {/* Sonuç Sayısı */}
          {searchQuery && (
            <div className="text-center mt-4 text-gray-600">
              <span className="bg-[#f97316]/10 text-[#f97316] px-3 py-1 rounded-full text-sm">
                {filteredFAQs.length} sonuç bulundu
              </span>
            </div>
          )}
        </div>
      </section>

      {/* FAQ Liste */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Genişlet/Daralt Butonu */}
            {filteredFAQs.length > 0 && (
              <div className="flex justify-end mb-4">
                <Button
                  onClick={handleExpandAll}
                  variant="outline"
                  size="sm"
                  className="text-[#f97316] border-[#f97316] hover:bg-[#f97316] hover:text-white transition-all duration-300"
                >
                  {expandAll ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-2" />
                      Tüm Soruları Daralt
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-2" />
                      Tüm Soruları Genişlet
                    </>
                  )}
                </Button>
              </div>
            )}

            {filteredFAQs.length === 0 ? (
              <Card className="text-center py-16 border-2 border-dashed">
                <CardContent className="pt-6">
                  <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-gray-700 mb-2">Sonuç Bulunamadı</h3>
                  <p className="text-gray-500">
                    Aradığınız kriterlere uygun soru bulunamadı. Lütfen farklı bir arama yapın.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredFAQs.map((faq, index) => {
                  const isOpen = openFAQ === faq.id || expandAll;
                  
                  // Ana sayfadaki gibi döngüsel renk sistemi
                  const colorScheme = [
                    { ring: '#7FA99B', badge: '#7FA99B', chevron: '#7FA99B', hover: '#7FA99B/50' },
                    { ring: '#f97316', badge: '#f97316', chevron: '#f97316', hover: '#f97316/50' },
                    { ring: '#1e3a8a', badge: '#1e3a8a', chevron: '#1e3a8a', hover: '#1e3a8a/50' },
                  ];
                  const colorIndex = index % 3;
                  const colors = colorScheme[colorIndex];
                  
                  return (
                    <motion.div
                      key={faq.id}
                      whileHover={{ scale: 1.02 }}
                    >
                      <Card 
                        className={`cursor-pointer transition-all duration-300 hover:shadow-xl ${isOpen ? 'ring-2 shadow-2xl' : ''}`}
                        style={{
                          borderColor: isOpen ? colors.ring : undefined,
                          '--tw-ring-color': colors.ring,
                        } as any}
                        onClick={() => toggleFAQ(faq.id)}
                      >
                        <CardContent className="p-0">
                          <div className="py-3 px-4 flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-start gap-3">
                                <Badge 
                                  variant="outline" 
                                  className="text-xs shrink-0"
                                  style={{
                                    backgroundColor: isOpen ? colors.badge : '#f3f4f6',
                                    color: isOpen ? 'white' : '#374151',
                                    borderColor: isOpen ? colors.badge : '#d1d5db',
                                  }}
                                >
                                  {index + 1}
                                </Badge>
                                <h3 className="text-gray-900 flex-1 leading-tight">
                                  {faq.question}
                                </h3>
                              </div>
                            </div>
                            
                            <ChevronDown 
                              className={`w-6 h-6 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                              style={{ color: colors.chevron }}
                            />
                          </div>

                          {/* Cevap */}
                          <div 
                            className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
                          >
                            <div className="px-6 pb-6 pt-0">
                              <div className="border-t border-gray-200 pt-4">
                                <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                                  {faq.answer}
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* İletişim CTA */}
      <section className="py-16 bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] text-white relative overflow-hidden">
        {/* Animated Background */}
        <motion.div 
          className="absolute inset-0 opacity-10"
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <motion.div 
            className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"
            animate={{
              x: [0, 50, 0],
              y: [0, -30, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="absolute bottom-0 right-0 w-96 h-96 bg-[#f97316] rounded-full blur-3xl"
            animate={{
              x: [0, -50, 0],
              y: [0, 30, 0],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>

        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white/30 rounded-full"
              initial={{
                x: Math.random() * window.innerWidth,
                y: Math.random() * 400,
              }}
              animate={{
                y: [null, Math.random() * -200],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            />
          ))}
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
          >
            <motion.h2 
              className="mb-4 text-white"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Sorunuza Cevap Bulamadınız mı?
            </motion.h2>
            
            <motion.p 
              className="text-xl text-gray-100 mb-8 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              Uzman ekibimiz size yardımcı olmak için hazır! Hemen iletişime geçin.
            </motion.p>

            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <motion.div
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  asChild
                  size="lg"
                  className="bg-[#f97316] hover:bg-[#ea580c] text-white shadow-xl hover:shadow-2xl transition-all duration-300"
                >
                  <a href="tel:+905071940550" className="flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    0 507 194 05 50
                  </a>
                </Button>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  asChild
                  size="lg"
                  variant="outline"
                  className="bg-white text-[#1e3a8a] hover:bg-gray-100 border-2 border-white shadow-xl"
                >
                  <Link to="/iletisim" className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    İletişim Formu
                  </Link>
                </Button>
              </motion.div>
            </motion.div>

            {/* Çalışma Saatleri */}
            <motion.div 
              className="mt-8 inline-block bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="flex items-center justify-center gap-2 text-sm text-gray-100">
                <Clock className="w-4 h-4" />
                <span>Hafta içi 09:00 - 19:00 | Cumartesi 09:00 - 18:00</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}