import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { Package, Wrench, Truck, ArrowRight, MapPin, Star, Quote, ChevronDown, HelpCircle } from 'lucide-react@0.487.0';
import { ProductActionModal } from '../components/ProductActionModal';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { AnimatedChangingText } from '../components/AnimatedChangingText';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { AutoCarousel } from '../components/AutoCarousel';
import { ProductHoverCard } from '../components/ProductHoverCard';
import { BlogHoverCard } from '../components/BlogHoverCard';
import { blogPosts as allBlogPosts, blogCategories } from '../data/blogDataNew';
import { motion, useInView } from 'motion/react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Skeleton } from '../components/ui/skeleton';
import heroImage from 'figma:asset/facc037a29e3a8a3cbca1ab79b70926b98b651e6.png';
import productBgImage from 'figma:asset/405756ada35c95c954c3a9d85068fc1c8f322048.png';
import blogHeroImage from 'figma:asset/a0e4f8d4b2c80c2a029c288861035705b329e078.png';

export default function HomePage() {
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Supabase config - ensure keys are available at runtime
  const supabaseProjectId = projectId;
  const supabaseAnonKey = publicAnonKey;

  // Refs for scroll animations
  const statsRef = useRef(null);
  const servicesRef = useRef(null);
  const featuredRef = useRef(null);
  const howItWorksRef = useRef(null);
  const testimonialsRef = useRef(null);
  const ctaRef = useRef(null);
  const blogRef = useRef(null);
  const faqRef = useRef(null);
  const categoriesRef = useRef(null);

  // InView hooks
  const statsInView = useInView(statsRef, { once: true, amount: 0.3 });
  const servicesInView = useInView(servicesRef, { once: true, amount: 0.2 });
  const featuredInView = useInView(featuredRef, { once: true, amount: 0.2 });
  const howItWorksInView = useInView(howItWorksRef, { once: true, amount: 0.2 });
  const testimonialsInView = useInView(testimonialsRef, { once: true, amount: 0.2 });
  const ctaInView = useInView(ctaRef, { once: true, amount: 0.3 });
  const blogInView = useInView(blogRef, { once: true, amount: 0.15 });
  const faqInView = useInView(faqRef, { once: true, amount: 0.15 });
  const categoriesInView = useInView(categoriesRef, { once: true, amount: 0.2 });

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
  };

  const fadeInLeft = {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } }
  };

  const fadeInRight = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  };

  const scaleIn = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } }
  };
  
  // Backend'den öne çıkan ürünleri yükle
  useEffect(() => {
    const loadFeaturedProducts = async () => {
      try {
        setLoadingProducts(true);
        console.log('[HOME] Loading featured products...');
        
        const response = await fetch(
          `https://${supabaseProjectId}.supabase.co/functions/v1/make-server-0f4d2485/products?limit=25`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
          }
        );

        console.log('[HOME] Response status:', response.status, response.statusText);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('[HOME] ❌ Error response:', errorData);
          setFeaturedProducts([]);
          return;
        }
        
        const data = await response.json();
        console.log('[HOME] ✅ Products loaded:', data);
        
        const products = data.products || [];
        
        // ✅ Ürün yoksa bile hata değil - boş liste göster
        if (products.length === 0) {
          console.log('[HOME] No products found - showing empty state');
          setFeaturedProducts([]);
          return;
        }
        
        // Formatla
        const formatted = products.map((p: any) => ({
          id: p.id,
          title: p.title,
          price: p.price,
          image: p.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1758488438758-5e2eedf769ce?w=500',
          images: p.images?.map((img: any) => img.image_url) || [],
          condition: p.condition,
          category: p.category?.name || 'Kategorisiz',
          warranty: p.warranty || 'Garanti Yok', // Backend'den artık string olarak geliyor
          status: p.status, // Ürün durumu - backend'den geliyor
          stock: p.status === 'for_sale' ? 'Satışta' : p.status === 'sold' ? 'Satıldı' : 'Depoda',
        }));

        console.log('[HOME] ✅ Formatted products:', formatted.length);
        setFeaturedProducts(formatted);
      } catch (error) {
        console.error('[HOME] ❌ Exception while loading products:', error);
        console.error('[HOME] ❌ Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          projectId: supabaseProjectId,
          publicAnonKey: supabaseAnonKey ? 'EXISTS' : 'MISSING',
        });
        setFeaturedProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    loadFeaturedProducts();
  }, []);
  
  // MOCK DATA SİLİNDİ - TÜM VERİLER BACKEND'DEN GELİYOR
  
  // Eski blog posts mock verisi - Bu kısmı koruyoruz çünkü blog sistemi henüz backend'e taşınmadı
  const oldBlogMockData = [
    {
      id: 1,
      title: 'Samsung Buzdolabı 528 LT',
      price: 25000,
      image: 'https://images.unsplash.com/photo-1758488438758-5e2eedf769ce?w=500',
      images: [
        'https://images.unsplash.com/photo-1758488438758-5e2eedf769ce?w=500',
        'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=500',
        'https://images.unsplash.com/photo-1584568694952-1b37d0b654e3?w=500',
      ],
      condition: 'Sıfır Ayarında',
      category: 'Beyaz Eşya',
      warranty: '6 Ay',
      stock: 'Stokta Var',
    },
    {
      id: 2,
      title: 'LG Çamaşır Makinesi 9 KG',
      price: 12000,
      image: 'https://images.unsplash.com/photo-1754732693535-7ffb5e1a51d6?w=500',
      images: [
        'https://images.unsplash.com/photo-1754732693535-7ffb5e1a51d6?w=500',
        'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=500',
        'https://images.unsplash.com/photo-1622355341752-bf5de6b5b0c8?w=500',
      ],
      condition: 'Az Kullanılmış',
      category: 'Beyaz Eşya',
      warranty: '3 Ay',
      stock: 'Son 1 Ürün',
    },
    {
      id: 3,
      title: 'Samsung 55" Smart TV',
      price: 18000,
      image: 'https://images.unsplash.com/photo-1601944177325-f8867652837f?w=500',
      images: [
        'https://images.unsplash.com/photo-1601944177325-f8867652837f?w=500',
        'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500',
        'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=500',
      ],
      condition: 'İyi',
      category: 'Elektronik',
      warranty: '1 Yıl',
      stock: 'Stokta Var',
    },
    {
      id: 4,
      title: 'Arçelik Bulaşık Makinesi',
      price: 8500,
      image: 'https://images.unsplash.com/photo-1715249891414-9c531b63b031?w=500',
      images: [
        'https://images.unsplash.com/photo-1715249891414-9c531b63b031?w=500',
        'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=500',
        'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=500',
      ],
      condition: 'Sıfır Ayarında',
      category: 'Beyaz Eşya',
      warranty: '3 Ay',
      stock: 'Stokta Var',
    },
    {
      id: 5,
      title: 'Bosch Fırın Ankastre',
      price: 6500,
      image: 'https://images.unsplash.com/photo-1754568401041-11ad5769ed7e?w=500',
      images: [
        'https://images.unsplash.com/photo-1754568401041-11ad5769ed7e?w=500',
        'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=500',
        'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=500',
      ],
      condition: 'İyi',
      category: 'Beyaz Eşya',
      warranty: '3 Ay',
      stock: 'Stokta Var',
    },
    {
      id: 6,
      title: 'Sony PlayStation 5',
      price: 15000,
      image: 'https://images.unsplash.com/photo-1622979138084-c03ae28968ed?w=500',
      images: [
        'https://images.unsplash.com/photo-1622979138084-c03ae28968ed?w=500',
        'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=500',
        'https://images.unsplash.com/photo-1622297845775-5ff3fef71d13?w=500',
      ],
      condition: 'Az Kullanılmış',
      category: 'Elektronik',
      warranty: '6 Ay',
      stock: 'Stokta Var',
    },
    {
      id: 7,
      title: 'Vestel Klima 12.000 BTU',
      price: 9000,
      image: 'https://images.unsplash.com/photo-1757219525975-03b5984bc6e8?w=500',
      images: [
        'https://images.unsplash.com/photo-1757219525975-03b5984bc6e8?w=500',
        'https://images.unsplash.com/photo-1631545806609-47c7c441c87e?w=500',
        'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=500',
      ],
      condition: 'İyi',
      category: 'Beyaz Eşya',
      warranty: '3 Ay',
      stock: 'Son 1 Ürün',
    },
    {
      id: 8,
      title: 'Kanepe Takımı 3+2+1',
      price: 18000,
      image: 'https://images.unsplash.com/photo-1759722665935-0967b4e0da93?w=500',
      images: [
        'https://images.unsplash.com/photo-1759722665935-0967b4e0da93?w=500',
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500',
        'https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=500',
      ],
      condition: 'Az Kullanılmış',
      category: 'Mobilya',
      warranty: '6 Ay',
      stock: 'Stokta Var',
    },
    {
      id: 9,
      title: 'Apple MacBook Air M1',
      price: 22000,
      image: 'https://images.unsplash.com/photo-1625296277602-a9f0b67b3a99?w=500',
      images: [
        'https://images.unsplash.com/photo-1625296277602-a9f0b67b3a99?w=500',
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500',
        'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=500',
      ],
      condition: 'Sıfır Ayarında',
      category: 'Elektronik',
      warranty: '1 Yıl',
      stock: 'Stokta Var',
    },
    {
      id: 10,
      title: 'Yemek Masası 6 Kişilik',
      price: 7500,
      image: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=500',
      images: [
        'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=500',
        'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=500',
        'https://images.unsplash.com/photo-1556909114-44e3e70034e2?w=500',
      ],
      condition: 'İyi',
      category: 'Mobilya',
      warranty: '3 Ay',
      stock: 'Stokta Var',
    },
  ];

  const services = [
    {
      icon: Package,
      title: 'Ürün Alım-Satım',
      description: 'Sıfır ayarında, az kullanılmış ve iyi durumda geniş ürün yelpazesi',
      action: 'modal', // Modal açacak
      color: 'bg-cyan-600',
      image: productBgImage,
      buttonText: 'Ürün İncele veya Sat',
      details: {
        features: [
          '1000+ Ürün Çeşidi',
          'Ücretsiz Ürün Testi',
          '6 Ay Garanti',
          'Takas İmkanı'
        ],
        priceRange: '500₺ - 50.000₺',
        deliveryInfo: 'Buca İçi Ücretsiz Teslimat'
      }
    },
    {
      icon: Wrench,
      title: 'Teknik Servis',
      description: 'Uzman ekibimizle tüm beyaz eşya, elektronik ve mobilya cihazlarınıza teknik destek',
      link: '/teknik-servis',
      color: 'bg-emerald-600',
      image: 'https://images.unsplash.com/photo-1744302570694-3f8949445c2b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXBhaXIlMjB0ZWNobmljaWFuJTIwdG9vbHN8ZW58MXx8fHwxNjM0MzA3NjN8MA&ixlib=rb-4.1.0&q=80&w=1080',
      buttonText: 'Randevu Oluştur',
      details: {
        features: [
          '3 Uzman Teknisyen',
          'Aynı Gün Servis',
          'Orijinal Yedek Parça',
          'Online Randevu'
        ],
        priceRange: '200₺ - 2.000₺',
        deliveryInfo: 'Tüm İzmir İlçelerine Servis'
      }
    },
    {
      icon: Truck,
      title: 'Nakliye',
      description: 'Profesyonel ekip ile güvenli ve hızlı nakliye hizmeti',
      link: '/nakliye',
      color: 'bg-purple-600',
      image: 'https://images.unsplash.com/photo-1752550218113-b8f5823e5d9c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3ZpbmclMjB0cnVjayUyMGJveGVzfGVufDF8fHx8MTc2MzQ3NzQxNHww&ixlib=rb-4.1.0&q=80&w=1080',
      buttonText: 'Randevu Oluştur',
      details: {
        features: [
          'Sigortalı Taşıma',
          'Profesyonel Ekip',
          'Ambalaj Malzemesi',
          'Asansör & Vinç Hizmeti'
        ],
        priceRange: '1.500₺ - 5.000₺',
        deliveryInfo: 'Tüm İzmir ve Türkiye'
      }
    },
  ];

  // Blog Posts - blogData'dan ilk 6 yazıyı al
  const blogPosts = allBlogPosts.slice(0, 6);
  
  // Category renk helper fonksiyonu
  const getPostCategoryColor = (categoryId: string) => {
    const categoryMap: Record<string, string> = {
      'bakim': 'bg-[#1e3a8a]',
      'tasinma': 'bg-[#f97316]',
      'alisveris': 'bg-[#8B6F47]',
      'teknik': 'bg-[#7FA99B]',
      'enerji': 'bg-emerald-600',
    };
    return categoryMap[categoryId] || 'bg-gray-600';
  };

  return (
    <div className="overflow-x-hidden">
      {/* Hero Section with Image */}
      <section className="relative h-[700px] overflow-hidden -mt-20 pt-20">
        {/* Background Video - YouTube */}
        <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-[#2563eb]/60 via-[#3b82f6]/50 to-[#60a5fa]/50">
          <iframe
            src="https://www.youtube.com/embed/eGOmpuOVEDc?autoplay=1&mute=1&loop=1&playlist=eGOmpuOVEDc&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&disablekb=1&fs=0&iv_load_policy=3&vq=small"
            className="pointer-events-none"
            allow="autoplay; encrypted-media"
            loading="lazy"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '130%',
              height: '130%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              border: 'none',
              objectFit: 'cover'
            }}
          ></iframe>
        </div>

        {/* Content */}
        <div className="relative container mx-auto px-4 h-full flex items-center justify-center">
          <motion.div 
            className="max-w-4xl text-white text-center"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            {/* Ana Başlık */}
            <motion.div className="mb-6" variants={fadeInUp}>
              <h1 className="text-4xl md:text-5xl lg:text-6xl leading-tight text-white mb-4 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]" style={{ fontWeight: 700 }}>
                Kaliteli Ürünlerde
                <br />
                <span className="bg-gradient-to-r from-[#f97316] to-[#fb923c] bg-clip-text text-transparent drop-shadow-none">
                  Güvenin Adresi
                </span>
              </h1>
            </motion.div>

            {/* Alt Başlık */}
            <motion.p 
              className="text-xl md:text-2xl mb-6 text-white leading-relaxed max-w-3xl mx-auto drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]" 
              style={{ fontWeight: 600 }}
              variants={fadeInUp}
            >
              Kaliteli • Uygun Fiyatlı • Garantili
            </motion.p>

            {/* Açıklama Metni */}
            <motion.p 
              className="text-base md:text-lg text-white/95 mb-4 max-w-2xl mx-auto leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
              variants={fadeInUp}
            >
              Beyaz eşya, elektronik ve mobilya alım-satımında <strong>10 yıllık deneyim</strong>. 
              Teknik servis ve nakliye hizmetlerimizle her zaman yanınızdayız.
            </motion.p>

            {/* Lokasyon Bilgisi */}
            <motion.p 
              className="text-base text-white/90 mb-8 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] flex items-center justify-center gap-2"
              variants={fadeInUp}
            >
              <MapPin className="w-5 h-5" />
              <span><strong>İzmir Buca</strong> merkezli, tüm İzmir'e hizmet</span>
            </motion.p>

            {/* CTA Buton */}
            <motion.div 
              className="flex justify-center"
              variants={scaleIn}
            >
              <Link to="/urunler">
                <Button 
                  size="lg" 
                  className="relative bg-gradient-to-r from-orange-400 via-[#f97316] to-[#FF8A6B] hover:from-orange-500 hover:via-[#ea580c] hover:to-[#ff7a5b] text-white shadow-2xl text-base px-8 py-6 transform hover:scale-105 transition-all duration-300 border-2 border-white/50 hover:border-white/80 ring-2 ring-[#f97316]/40 hover:ring-4 hover:ring-[#f97316]/60 overflow-hidden group"
                  style={{
                    backgroundSize: '200% 100%',
                    animation: 'gradient-shift 4s ease infinite'
                  }}
                >
                  {/* Glow efekti */}
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer"></span>
                  
                  <span className="relative z-10 flex items-center">
                    Ürünleri İncele
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Animated Changing Words Section - YENİ */}
      <section className="py-20 bg-gradient-to-br from-[#1e3a8a]/5 via-white to-[#f97316]/5 overflow-hidden">
        <div className="container mx-auto px-4">
          <AnimatedChangingText />
        </div>
      </section>

      {/* Featured Products - ÖNCELİĞE ALINMIŞ */}
      <section ref={featuredRef} className="py-20 bg-gradient-to-b from-gray-50 via-gray-100 to-gray-50 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            className="absolute top-20 left-10 w-96 h-96 bg-[#f97316]/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              x: [0, 30, 0],
              y: [0, -20, 0],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="absolute bottom-20 right-10 w-80 h-80 bg-[#7FA99B]/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.3, 1],
              x: [0, -40, 0],
              y: [0, 30, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#1e3a8a]/5 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            className="text-center mb-12"
            initial="hidden"
            animate={featuredInView ? "visible" : "hidden"}
            variants={staggerContainer}
          >
            <motion.div variants={scaleIn}>
              <Badge className="bg-[#f97316] text-white mb-4 text-sm px-4 py-1 shadow-lg">
                <Package className="w-3.5 h-3.5 mr-1.5 inline-block" />
                ÖNE ÇIKAN ÜRÜNLER
              </Badge>
            </motion.div>
            <motion.h2 className="mb-2 text-4xl" variants={fadeInUp}>Yeni Gelen Ürünlerimiz</motion.h2>
            <motion.div className="flex items-center justify-center gap-3 mb-6" variants={scaleIn}>
              <div className="h-1 w-16 bg-[#f97316] rounded-full"></div>
              <div className="h-1 w-24 bg-[#7FA99B] rounded-full"></div>
              <div className="h-1 w-16 bg-[#f97316] rounded-full"></div>
            </motion.div>
            <motion.p className="text-gray-600 max-w-2xl mx-auto" variants={fadeInUp}>
              Sıfır ayarında, az kullanılmış ve iyi durumda geniş ürün yelpazemizi keşfedin
            </motion.p>
          </motion.div>

          {/* Loading State */}
          {loadingProducts ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-4" />
                    <Skeleton className="h-8 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="space-y-6">
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">Şu anda öne çıkan ürün bulunmamaktadır</p>
                <p className="text-sm text-gray-400">Veritabanınız boş görünüyor. Test verisi eklemek için aşağıdaki butonu kullanın.</p>
              </div>
              
              {/* No products placeholder */}
              <div className="max-w-2xl mx-auto text-center py-12">
                <p className="text-gray-600">Henüz ürün bulunmamaktadır.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Carousel Wrapper - Desktop 4, Tablet 2, Mobile 1 - BÜYÜK ÜRÜNLER! */}
              <motion.div 
                className="hidden lg:block mb-4"
                initial="hidden"
                animate={featuredInView ? "visible" : "hidden"}
                variants={fadeInUp}
              >
                <AutoCarousel interval={1800} itemsPerView={4}>
                  {featuredProducts.map((product) => (
                    <ProductHoverCard 
                      key={product.id} 
                      product={product} 
                      showStockBadge={true}
                      isSold={product.status === 'sold'}
                    />
                  ))}
                </AutoCarousel>
              </motion.div>

              {/* Tablet - 2 items */}
              <motion.div 
                className="hidden md:block lg:hidden mb-4"
                initial="hidden"
                animate={featuredInView ? "visible" : "hidden"}
                variants={fadeInUp}
              >
                <AutoCarousel interval={1800} itemsPerView={2}>
                  {featuredProducts.map((product) => (
                    <ProductHoverCard 
                      key={product.id} 
                      product={product} 
                      showStockBadge={true}
                      isSold={product.status === 'sold'}
                    />
                  ))}
                </AutoCarousel>
              </motion.div>

              {/* Mobile - 1 item */}
              <motion.div 
                className="block md:hidden mb-4"
                initial="hidden"
                animate={featuredInView ? "visible" : "hidden"}
                variants={fadeInUp}
              >
                <AutoCarousel interval={1800} itemsPerView={1}>
                  {featuredProducts.map((product) => (
                    <ProductHoverCard 
                      key={product.id} 
                      product={product} 
                      showStockBadge={true}
                      isSold={product.status === 'sold'}
                    />
                  ))}
                </AutoCarousel>
              </motion.div>
            </>
          )}

          {/* Tümünü Gör Butonu - Ürünlerin Altında */}
          <motion.div 
            className="text-center mt-12"
            initial="hidden"
            animate={featuredInView ? "visible" : "hidden"}
            variants={scaleIn}
          >
            <Link to="/urunler">
              <motion.div
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button size="lg" className="bg-[#f97316] hover:bg-[#ea580c] text-white px-8 py-6 shadow-xl hover:shadow-2xl transition-all duration-300">
                  Tüm Ürünleri Görüntüle
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Services Section - ENHANCED */}
      <section ref={servicesRef} className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-16"
            initial="hidden"
            animate={servicesInView ? "visible" : "hidden"}
            variants={staggerContainer}
          >
            <motion.div variants={scaleIn}>
              <Badge className="bg-[var(--brand-coral-500)] text-white mb-4 text-sm px-4 py-1">
                HİZMETLERİMİZ
              </Badge>
            </motion.div>
            <motion.h2 className="mb-2 text-4xl" variants={fadeInUp}>Neler Sunuyoruz?</motion.h2>
            {/* Dekoratif Alt Çizgi */}
            <motion.div className="flex items-center justify-center gap-3 mb-6" variants={scaleIn}>
              <div className="h-1 w-16 bg-[var(--brand-coral-500)] rounded-full"></div>
              <div className="h-1 w-24 bg-[var(--brand-teal-500)] rounded-full"></div>
              <div className="h-1 w-16 bg-[var(--brand-coral-500)] rounded-full"></div>
            </motion.div>
            <motion.p className="text-gray-600 max-w-3xl mx-auto text-lg" variants={fadeInUp}>
              İzmir genelinde profesyonel hizmet sunuyoruz. Beyaz eşya alım satımından teknik servise, nakliye 
              hizmetinden ev kurulumlarına kadar geniş bir yelpazede kaliteli ve güvenilir çözümler sunarak 
              her zaman yanınızdayız. Müşteri memnuniyeti odaklı yaklaşımımızla, ihtiyaçlarınıza en uygun hizmeti 
              sağlamak için buradayız.
            </motion.p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto"
            initial="hidden"
            animate={servicesInView ? "visible" : "hidden"}
            variants={staggerContainer}
          >
            {services.map((service, index) => {
              const ServiceCard = (
                <motion.div variants={fadeInUp}>
                  <Card className="group border-0 overflow-hidden hover:shadow-2xl h-full transform hover:scale-105 hover:-translate-y-1 transition-all duration-500 relative cursor-pointer">
                    <div className="relative h-[400px]">
                      {/* Background Image */}
                      <ImageWithFallback
                        src={service.image}
                        alt={service.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/40"></div>
                      
                      {/* Content */}
                      <CardContent className="relative h-full p-8 flex flex-col justify-between text-white">
                        <div className="flex justify-center">
                          <div className={`${service.color} w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-500 group-hover:rotate-12 group-hover:scale-110`}>
                            <service.icon className="w-10 h-10 text-white transition-transform duration-500 group-hover:scale-110" />
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <h3 className="mb-4 text-2xl text-white">{service.title}</h3>
                          <p className="text-gray-200 mb-6 leading-relaxed">{service.description}</p>
                          <div className="flex items-center justify-center text-[#f97316] transition-all duration-300 group-hover:gap-4 gap-2 animate-pulse group-hover:animate-none">
                            <span className="mr-2">{service.buttonText}</span>
                            <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-2" />
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                </motion.div>
              );

              // Modal için action varsa div ile sar, yoksa Link
              if (service.action === 'modal') {
                return (
                  <div 
                    key={index} 
                    onClick={() => setIsProductModalOpen(true)}
                  >
                    {ServiceCard}
                  </div>
                );
              }

              return (
                <Link key={index} to={service.link}>
                  {ServiceCard}
                </Link>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Blog Section - ÖNCELİKLİ OLARAK BURAYA TAŞINDI */}
      <section ref={blogRef} className="py-16 relative bg-gradient-to-b from-gray-50 via-white to-gray-50">
        <div className="container mx-auto px-6 lg:px-8 relative z-10">
          <motion.div 
            className="flex flex-col justify-center items-center mb-16 gap-6 max-w-4xl mx-auto"
            initial="hidden"
            animate={blogInView ? "visible" : "hidden"}
            variants={staggerContainer}
          >
            <div className="text-center">
              <motion.div variants={scaleIn}>
                <Badge className="bg-[#f97316] text-white mb-4 text-sm px-4 py-1">
                  BLOG & HABERLER
                </Badge>
              </motion.div>
              <motion.h2 className="mb-2 text-4xl" variants={fadeInUp}>Haberler & İpuçları</motion.h2>
              <motion.div className="flex items-center justify-center gap-3 mb-6" variants={scaleIn}>
                <div className="h-1 w-16 bg-[#f97316] rounded-full"></div>
                <div className="h-1 w-24 bg-white rounded-full"></div>
                <div className="h-1 w-16 bg-[#f97316] rounded-full"></div>
              </motion.div>
              <motion.p className="text-gray-600 max-w-2xl mx-auto" variants={fadeInUp}>
                Beyaz eşya bakımı, taşınma ipuçları, enerji tasarrufu ve daha fazlası hakkında uzman yazıları keşfedin.
              </motion.p>
            </div>
          </motion.div>

          {/* Blog Carousel */}
          <motion.div 
            className="mb-8 max-w-7xl mx-auto"
            initial="hidden"
            animate={blogInView ? "visible" : "hidden"}
            variants={fadeInUp}
          >
            <AutoCarousel interval={2000} itemsPerView={3}>
              {blogPosts.map((post) => (
                <BlogHoverCard 
                  key={post.id}
                  post={post}
                  categoryLabel={blogCategories.find(cat => cat.id === post.category)?.label || ''}
                  categoryColor={getPostCategoryColor(post.category)}
                />
              ))}
            </AutoCarousel>
          </motion.div>

          {/* Tüm Bloglar Butonu */}
          <motion.div 
            className="text-center"
            initial="hidden"
            animate={blogInView ? "visible" : "hidden"}
            variants={scaleIn}
          >
            <Link to="/blog">
              <Button size="lg" className="bg-[#f97316] hover:bg-[#ea580c] text-white px-8 py-6 transform hover:scale-105 transition-all duration-300">
                Tüm Blogları Görüntüle
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* FAQ Preview Section - ANA SAYFAYA EKLENEN POPÜLER SORULAR */}
      <section ref={faqRef} className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-12"
            initial="hidden"
            animate={faqInView ? "visible" : "hidden"}
            variants={staggerContainer}
          >
            <motion.div variants={scaleIn}>
              <Badge className="bg-[#7FA99B] text-white mb-4 text-sm px-4 py-1">
                <HelpCircle className="w-3.5 h-3.5 mr-1.5 inline-block" />
                SIKÇA SORULAN SORULAR
              </Badge>
            </motion.div>
            <motion.h2 className="mb-2 text-4xl" variants={fadeInUp}>Merak Edilenler</motion.h2>
            <motion.div className="flex items-center justify-center gap-3 mb-6" variants={scaleIn}>
              <div className="h-1 w-16 bg-[#7FA99B] rounded-full"></div>
              <div className="h-1 w-24 bg-[#f97316] rounded-full"></div>
              <div className="h-1 w-16 bg-[#7FA99B] rounded-full"></div>
            </motion.div>
            <motion.p className="text-gray-600 max-w-2xl mx-auto" variants={fadeInUp}>
              En sık sorulan sorulara hızlıca göz atın, detaylı bilgi için SSS sayfamızı ziyaret edin
            </motion.p>
          </motion.div>

          <motion.div 
            className="max-w-4xl mx-auto space-y-4"
            initial="hidden"
            animate={faqInView ? "visible" : "hidden"}
            variants={staggerContainer}
          >
            {/* Soru 1 */}
            <motion.div
              variants={{
                hidden: { opacity: 0, x: -30 },
                visible: { opacity: 1, x: 0, transition: { duration: 0.5, delay: 0 } }
              }}
              whileHover={{ scale: 1.02 }}
            >
              <Card 
                className={`cursor-pointer transition-all duration-300 hover:shadow-xl ${openFAQ === 1 ? 'ring-2 ring-[#7FA99B] shadow-2xl' : 'hover:border-[#7FA99B]/50'}`}
                onClick={() => setOpenFAQ(openFAQ === 1 ? null : 1)}
              >
                <CardContent className="p-0">
                  <div className="py-3 px-4 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <Badge 
                          variant="outline" 
                          className={`${openFAQ === 1 ? 'bg-[#7FA99B] text-white border-[#7FA99B]' : 'bg-gray-100 text-gray-700 border-gray-300'} text-xs shrink-0`}
                        >
                          1
                        </Badge>
                        <h3 className="text-gray-900 flex-1 leading-tight">
                          Sattığınız ürünler yeni mi, ikinci el mi?
                        </h3>
                      </div>
                    </div>
                    <ChevronDown className={`w-6 h-6 text-[#7FA99B] shrink-0 transition-transform duration-300 ${openFAQ === 1 ? 'rotate-180' : ''}`} />
                  </div>
                  <div className={`overflow-hidden transition-all duration-300 ${openFAQ === 1 ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="px-6 pb-6 pt-0">
                      <div className="border-t border-gray-200 pt-4">
                        <p className="text-gray-600 leading-relaxed">
                          Ersin Spot olarak sıfır ayarında, az kullanılmış ve iyi durumda ürünler satıyoruz. Tüm ürünlerimiz teknik kontrolden geçirilmiş, test edilmiş ve temizlenmiş olarak satışa sunulmaktadır.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Soru 2 */}
            <motion.div
              variants={{
                hidden: { opacity: 0, x: -30 },
                visible: { opacity: 1, x: 0, transition: { duration: 0.5, delay: 0.1 } }
              }}
              whileHover={{ scale: 1.02 }}
            >
              <Card 
                className={`cursor-pointer transition-all duration-300 hover:shadow-xl ${openFAQ === 2 ? 'ring-2 ring-[#f97316] shadow-2xl' : 'hover:border-[#f97316]/50'}`}
                onClick={() => setOpenFAQ(openFAQ === 2 ? null : 2)}
              >
                <CardContent className="p-0">
                  <div className="py-3 px-4 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <Badge 
                          variant="outline" 
                          className={`${openFAQ === 2 ? 'bg-[#f97316] text-white border-[#f97316]' : 'bg-gray-100 text-gray-700 border-gray-300'} text-xs shrink-0`}
                        >
                          2
                        </Badge>
                        <h3 className="text-gray-900 flex-1 leading-tight">
                          Ürünler garanti kapsamında mı?
                        </h3>
                      </div>
                    </div>
                    <ChevronDown className={`w-6 h-6 text-[#f97316] shrink-0 transition-transform duration-300 ${openFAQ === 2 ? 'rotate-180' : ''}`} />
                  </div>
                  <div className={`overflow-hidden transition-all duration-300 ${openFAQ === 2 ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="px-6 pb-6 pt-0">
                      <div className="border-t border-gray-200 pt-4">
                        <p className="text-gray-600 leading-relaxed">
                          Evet! Satışını gerçekleştirdiğimiz tüm ürünlerde 3 aylık Ersin Spot garantisi bulunmaktadır. Elektronik ürünlerde mekanik arızalar, beyaz eşyalarda motor ve kompresör arızaları garanti kapsamındadır.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Soru 3 */}
            <motion.div
              variants={{
                hidden: { opacity: 0, x: -30 },
                visible: { opacity: 1, x: 0, transition: { duration: 0.5, delay: 0.2 } }
              }}
              whileHover={{ scale: 1.02 }}
            >
              <Card 
                className={`cursor-pointer transition-all duration-300 hover:shadow-xl ${openFAQ === 3 ? 'ring-2 ring-[#1e3a8a] shadow-2xl' : 'hover:border-[#1e3a8a]/50'}`}
                onClick={() => setOpenFAQ(openFAQ === 3 ? null : 3)}
              >
                <CardContent className="p-0">
                  <div className="py-3 px-4 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <Badge 
                          variant="outline" 
                          className={`${openFAQ === 3 ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]' : 'bg-gray-100 text-gray-700 border-gray-300'} text-xs shrink-0`}
                        >
                          3
                        </Badge>
                        <h3 className="text-gray-900 flex-1 leading-tight">
                          Teknik servis randevusu nasıl alabilirim?
                        </h3>
                      </div>
                    </div>
                    <ChevronDown className={`w-6 h-6 text-[#1e3a8a] shrink-0 transition-transform duration-300 ${openFAQ === 3 ? 'rotate-180' : ''}`} />
                  </div>
                  <div className={`overflow-hidden transition-all duration-300 ${openFAQ === 3 ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="px-6 pb-6 pt-0">
                      <div className="border-t border-gray-200 pt-4">
                        <p className="text-gray-600 leading-relaxed">
                          Web sitemizin "Teknik Servis" sayfasından online randevu oluşturabilirsiniz. Arızalı cihazınızın fotoğrafını veya videosunu yükleyerek ön değerlendirme yapılmasını sağlayabilirsiniz. Randevu sonrası uzman teknisyenimiz adresinize gelir.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Soru 4 */}
            <motion.div
              variants={{
                hidden: { opacity: 0, x: -30 },
                visible: { opacity: 1, x: 0, transition: { duration: 0.5, delay: 0.3 } }
              }}
              whileHover={{ scale: 1.02 }}
            >
              <Card 
                className={`cursor-pointer transition-all duration-300 hover:shadow-xl ${openFAQ === 4 ? 'ring-2 ring-[#FF8A6B] shadow-2xl' : 'hover:border-[#FF8A6B]/50'}`}
                onClick={() => setOpenFAQ(openFAQ === 4 ? null : 4)}
              >
                <CardContent className="p-0">
                  <div className="py-3 px-4 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <Badge 
                          variant="outline" 
                          className={`${openFAQ === 4 ? 'bg-[#FF8A6B] text-white border-[#FF8A6B]' : 'bg-gray-100 text-gray-700 border-gray-300'} text-xs shrink-0`}
                        >
                          4
                        </Badge>
                        <h3 className="text-gray-900 flex-1 leading-tight">
                          Nakliye hizmeti nasıl çalışıyor?
                        </h3>
                      </div>
                    </div>
                    <ChevronDown className={`w-6 h-6 text-[#FF8A6B] shrink-0 transition-transform duration-300 ${openFAQ === 4 ? 'rotate-180' : ''}`} />
                  </div>
                  <div className={`overflow-hidden transition-all duration-300 ${openFAQ === 4 ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="px-6 pb-6 pt-0">
                      <div className="border-t border-gray-200 pt-4">
                        <p className="text-gray-600 leading-relaxed">
                          Web sitemizin "Taşımacılık" bölümünden nakliye randevusu oluşturabilirsiniz. Ev büyüklüğü ve taşınacak eşya envanterinize göre ekibimiz size özel fiyat teklifi hazırlar.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Soru 5 */}
            <motion.div
              variants={{
                hidden: { opacity: 0, x: -30 },
                visible: { opacity: 1, x: 0, transition: { duration: 0.5, delay: 0.4 } }
              }}
              whileHover={{ scale: 1.02 }}
            >
              <Card 
                className={`cursor-pointer transition-all duration-300 hover:shadow-xl ${openFAQ === 5 ? 'ring-2 ring-[#8B6F47] shadow-2xl' : 'hover:border-[#8B6F47]/50'}`}
                onClick={() => setOpenFAQ(openFAQ === 5 ? null : 5)}
              >
                <CardContent className="p-0">
                  <div className="py-3 px-4 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <Badge 
                          variant="outline" 
                          className={`${openFAQ === 5 ? 'bg-[#8B6F47] text-white border-[#8B6F47]' : 'bg-gray-100 text-gray-700 border-gray-300'} text-xs shrink-0`}
                        >
                          5
                        </Badge>
                        <h3 className="text-gray-900 flex-1 leading-tight">
                          Hangi ödeme yöntemlerini kabul ediyorsunuz?
                        </h3>
                      </div>
                    </div>
                    <ChevronDown className={`w-6 h-6 text-[#8B6F47] shrink-0 transition-transform duration-300 ${openFAQ === 5 ? 'rotate-180' : ''}`} />
                  </div>
                  <div className={`overflow-hidden transition-all duration-300 ${openFAQ === 5 ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="px-6 pb-6 pt-0">
                      <div className="border-t border-gray-200 pt-4">
                        <p className="text-gray-600 leading-relaxed">
                          Nakit, kredi kartı ve banka kartı ile ödeme kabul ediyoruz. Online siparişlerde ödeme teslimat sırasında yapılmaktadır. Kredi kartına taksit imkanı mevcuttur. Havale/EFT ile de ödeme kabul edilmektedir.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Tüm SSS'lere Git Butonu */}
          <div className="text-center mt-12">
            <Link to="/sss">
              <Button size="lg" className="bg-gradient-to-r from-[#7FA99B] to-[#6B8F83] hover:from-[#6B8F83] hover:to-[#5A7A6F] text-white px-8 py-6 shadow-xl">
                Tüm Soruları Görüntüle
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Customer Reviews Section - EN SONA TAŞINDI */}
      <section ref={testimonialsRef} className="py-16 bg-gradient-to-br from-orange-50/30 via-white to-blue-50/30 relative overflow-hidden">
        {/* Animated Background Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            className="absolute top-20 left-10 w-72 h-72 bg-[#f97316]/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              x: [0, 30, 0],
              y: [0, -20, 0],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="absolute bottom-20 right-10 w-96 h-96 bg-[#1e3a8a]/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.3, 1],
              x: [0, -40, 0],
              y: [0, 30, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#7FA99B]/8 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.15, 1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            className="text-center mb-16"
            initial="hidden"
            animate={testimonialsInView ? "visible" : "hidden"}
            variants={staggerContainer}
          >
            <motion.div variants={scaleIn}>
              <Badge className="bg-[#1e3a8a] text-white mb-4 text-sm px-4 py-1 shadow-lg">
                MÜŞTERİ YORUMLARI
              </Badge>
            </motion.div>
            <motion.h2 
              className="mb-2 text-4xl"
              variants={fadeInUp}
            >
              Müşterilerimiz Ne Diyor?
            </motion.h2>
            <motion.div 
              className="flex items-center justify-center gap-3 mb-6" 
              variants={scaleIn}
            >
              <motion.div 
                className="h-1 w-16 bg-[#f97316] rounded-full"
                animate={{ scaleX: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <motion.div 
                className="h-1 w-24 bg-[#1e3a8a] rounded-full"
                animate={{ scaleX: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
              />
              <motion.div 
                className="h-1 w-16 bg-[#f97316] rounded-full"
                animate={{ scaleX: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
              />
            </motion.div>
            <motion.p 
              className="text-gray-600 max-w-2xl mx-auto"
              variants={fadeInUp}
            >
              Binlerce müşterimizin memnuniyeti bizim en büyük başarımız
            </motion.p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto"
            initial="hidden"
            animate={testimonialsInView ? "visible" : "hidden"}
            variants={staggerContainer}
          >
            {/* Yorum 1 - 4 YILDIZ */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 50, rotateX: -15 },
                visible: { opacity: 1, y: 0, rotateX: 0, transition: { duration: 0.6, delay: 0 } }
              }}
              whileHover={{ 
                y: -12, 
                scale: 1.05,
                rotateY: 5,
                transition: { duration: 0.3 }
              }}
            >
              <Card className="relative overflow-hidden hover:shadow-2xl transition-all duration-500 border-t-4 border-t-[#f97316] bg-gradient-to-br from-white to-[#FFF8F3] h-full">
                <CardContent className="p-6">
                  <motion.div
                    animate={{ 
                      rotate: [0, 5, -5, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      duration: 4, 
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <Quote className="w-12 h-12 text-[#f97316] opacity-20 absolute top-4 right-4" />
                  </motion.div>
                  <div className="flex items-center gap-4 mb-4">
                    <motion.div 
                      className="w-14 h-14 rounded-full bg-gradient-to-br from-[#1e3a8a] to-[#3b82f6] flex items-center justify-center text-white text-xl shadow-lg"
                      whileHover={{ 
                        scale: 1.15, 
                        rotate: 360,
                        transition: { duration: 0.6 }
                      }}
                    >
                      ZA
                    </motion.div>
                    <div>
                      <h4 className="text-gray-900">Zeynep Aydın</h4>
                      <div className="flex items-center text-yellow-500">
                        {[...Array(4)].map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                          >
                            <Star className="w-4 h-4 fill-current" />
                          </motion.div>
                        ))}
                        <Star className="w-4 h-4 text-gray-300" />
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 leading-relaxed">
                    "Buzdolabımız bozulmuştu, aynı gün randevu aldık ve ertesi gün tamamen onarıldı. Fiyat biraz yüksek geldi ama hizmet kalitesi iyiydi. Tavsiye ederim."
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Yorum 2 - 5 YILDIZ */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 50, rotateX: -15 },
                visible: { opacity: 1, y: 0, rotateX: 0, transition: { duration: 0.6, delay: 0.15 } }
              }}
              whileHover={{ 
                y: -12, 
                scale: 1.05,
                rotateY: 5,
                transition: { duration: 0.3 }
              }}
            >
              <Card className="relative overflow-hidden hover:shadow-2xl transition-all duration-500 border-t-4 border-t-[#7FA99B] bg-gradient-to-br from-white to-[#F0F6F4] backdrop-blur-sm h-full">
                <CardContent className="p-6">
                  <motion.div
                    animate={{ 
                      rotate: [0, -5, 5, 0],
                      scale: [1, 1.15, 1]
                    }}
                    transition={{ 
                      duration: 5, 
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <Quote className="w-12 h-12 text-[#7FA99B] opacity-20 absolute top-4 right-4" />
                  </motion.div>
                  <div className="flex items-center gap-4 mb-4">
                    <motion.div 
                      className="w-14 h-14 rounded-full bg-gradient-to-br from-[#7FA99B] to-[#6B8F83] flex items-center justify-center text-white text-xl shadow-lg"
                      whileHover={{ 
                        scale: 1.15, 
                        rotate: 360,
                        transition: { duration: 0.6 }
                      }}
                    >
                      AÖ
                    </motion.div>
                    <div>
                      <h4 className="text-gray-900">Ahmet Öztürk</h4>
                      <div className="flex items-center text-yellow-500">
                        {[...Array(5)].map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.15 + i * 0.1, duration: 0.5 }}
                          >
                            <Star className="w-4 h-4 fill-current" />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 leading-relaxed">
                    "Taşınma işlemimiz çok profesyonel bir şekilde gerçekleti. Ekip son derece dikkatli ve güler yüzlüydü. Hiçbir eşyam zarar görmedi. Çok teşekkürler!"
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Yorum 3 - 4 YILDIZ */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 50, rotateX: -15 },
                visible: { opacity: 1, y: 0, rotateX: 0, transition: { duration: 0.6, delay: 0.3 } }
              }}
              whileHover={{ 
                y: -12, 
                scale: 1.05,
                rotateY: 5,
                transition: { duration: 0.3 }
              }}
            >
              <Card className="relative overflow-hidden hover:shadow-2xl transition-all duration-500 border-t-4 border-t-[#FF8A6B] bg-gradient-to-br from-white to-[#FFF4F1] backdrop-blur-sm h-full">
                <CardContent className="p-6">
                  <motion.div
                    animate={{ 
                      rotate: [0, 5, -5, 0],
                      scale: [1, 1.12, 1]
                    }}
                    transition={{ 
                      duration: 4.5, 
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <Quote className="w-12 h-12 text-[#FF8A6B] opacity-20 absolute top-4 right-4" />
                  </motion.div>
                  <div className="flex items-center gap-4 mb-4">
                    <motion.div 
                      className="w-14 h-14 rounded-full bg-gradient-to-br from-[#FF8A6B] to-[#E67557] flex items-center justify-center text-white text-xl shadow-lg"
                      whileHover={{ 
                        scale: 1.15, 
                        rotate: 360,
                        transition: { duration: 0.6 }
                      }}
                    >
                      FY
                    </motion.div>
                    <div>
                      <h4 className="text-gray-900">Fatma Yılmaz</h4>
                      <div className="flex items-center text-yellow-500">
                        {[...Array(4)].map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                          >
                            <Star className="w-4 h-4 fill-current" />
                          </motion.div>
                        ))}
                        <Star className="w-4 h-4 text-gray-300" />
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 leading-relaxed">
                    "Az kullanılmış çamaşır makinesi aldım, ürün sıfır ayarındaydı ve çalışır durumdaydı. Teslimat hızlıydı ancak kurulum için biraz beklettiler. Genel olarak memnunum."
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Trust Badges */}
          <motion.div 
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center"
            initial="hidden"
            animate={testimonialsInView ? "visible" : "hidden"}
            variants={staggerContainer}
          >
            <motion.div
              variants={fadeInUp}
              whileHover={{ scale: 1.1, y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <AnimatedCounter value="5000+" className="text-4xl text-[#1e3a8a] mb-2" />
              <p className="text-gray-600">Mutlu Müşteri</p>
            </motion.div>
            <motion.div
              variants={fadeInUp}
              whileHover={{ scale: 1.1, y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <AnimatedCounter value="10+" className="text-4xl text-[#1e3a8a] mb-2" />
              <p className="text-gray-600">Yıllık Tecrübe</p>
            </motion.div>
            <motion.div
              variants={fadeInUp}
              whileHover={{ scale: 1.1, y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <AnimatedCounter value="5000+" className="text-4xl text-[#1e3a8a] mb-2" />
              <p className="text-gray-600">Tamamlanan Servis</p>
            </motion.div>
            <motion.div
              variants={fadeInUp}
              whileHover={{ scale: 1.1, y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <AnimatedCounter value="%94" className="text-4xl text-[#1e3a8a] mb-2" />
              <p className="text-gray-600">Memnuniyet Oranı</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Product Action Modal */}
      <ProductActionModal
        open={isProductModalOpen}
        onOpenChange={setIsProductModalOpen}
      />

    </div>
  );
}