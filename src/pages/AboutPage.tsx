import { useRef } from 'react';
import { Target, Users, Award, TrendingUp, Clock, Shield } from 'lucide-react@0.487.0';
import { Card, CardContent } from '../components/ui/card';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { motion, useInView } from 'motion/react';
import logo from 'figma:asset/355ff2021d31b6f59d280dc2fdf15900e1bcd0b0.png';
import shopImage from 'figma:asset/facc037a29e3a8a3cbca1ab79b70926b98b651e6.png';

export default function AboutPage() {
  // Refs for scroll animations
  const heroRef = useRef(null);
  const storyRef = useRef(null);
  const visionRef = useRef(null);
  const valuesRef = useRef(null);
  const teamRef = useRef(null);

  // InView hooks
  const heroInView = useInView(heroRef, { once: true, amount: 0.3 });
  const storyInView = useInView(storyRef, { once: true, amount: 0.3 });
  const visionInView = useInView(visionRef, { once: true, amount: 0.3 });
  const valuesInView = useInView(valuesRef, { once: true, amount: 0.2 });
  const teamInView = useInView(teamRef, { once: true, amount: 0.2 });

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
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } }
  };

  const values = [
    {
      icon: Shield,
      title: 'Güvenilirlik',
      description: 'Müşterilerimize her zaman dürüst ve şeffaf hizmet sunuyoruz.',
      color: 'from-[#1e3a8a] to-[#3b82f6]'
    },
    {
      icon: Award,
      title: 'Kalite',
      description: 'Sadece kaliteli ve kontrol edilmiş ürünler satışa sunulmaktadır.',
      color: 'from-[#f97316] to-[#fb923c]'
    },
    {
      icon: TrendingUp,
      title: 'İşletme Büyümesi',
      description: 'Sektöre örnek gösterilen bir marka haline gelmek ve hizmet kalitemizi sürekli geliştirerek büyümektir.',
      color: 'from-[#7FA99B] to-[#6B8F83]'
    },
    {
      icon: Clock,
      title: 'Hızlı Hizmet',
      description: 'Randevularınızı ve siparişlerinizi zamanında teslim ediyoruz.',
      color: 'from-[#FF8A6B] to-[#E67557]'
    },
  ];

  const services = [
    {
      icon: Target,
      title: 'İkinci El Ürün Satışı',
      description: 'Beyaz eşya, elektronik ve mobilya kategorilerinde geniş ürün yelpazesi sunuyoruz. Tüm ürünlerimiz titizlikle kontrol edilir ve test edilir.',
      color: 'bg-blue-500',
    },
    {
      icon: Award,
      title: 'Teknik Servis',
      description: 'Uzman teknisyenlerimiz ile tüm beyaz eşya ve elektronik cihazlarınıza profesyonel teknik servis desteği sağlıyoruz.',
      color: 'bg-green-500',
    },
    {
      icon: Target,
      title: 'Taşımacılık',
      description: 'Ev eşyalarınızı güvenli ve hızlı bir şekilde yeni adresinize taşıyoruz. Profesyonel ekibimiz tüm süreçte yanınızda.',
      color: 'bg-orange-500',
    },
  ];

  const team = [
    {
      name: 'Ersin Korkmaz',
      role: 'Teknik Servis Uzmanı',
      experience: '10+ yıl deneyim',
      color: 'from-[#1e3a8a] to-[#3b82f6]'
    },
    {
      name: 'Selim Tezcan',
      role: 'Teknik Servis Uzmanı',
      experience: '8 yıl deneyim',
      color: 'from-[#f97316] to-[#fb923c]'
    },
    {
      name: 'Ali Efe Karademir',
      role: 'Çalışan',
      experience: '5 yıl deneyim',
      color: 'from-[#7FA99B] to-[#6B8F83]'
    },
  ];

  const stats = [
    { number: '5000+', label: 'Mutlu Müşteri' },
    { number: '10+', label: 'Yıllık Tecrübe' },
    { number: '5000+', label: 'Tamamlanan Servis' },
    { number: '%94', label: 'Memnuniyet Oranı' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50/50 via-white to-gray-50/50">
      {/* Hero Section with Image & Stats Overlay */}
      <section ref={heroRef} className="relative h-[700px] overflow-hidden -mt-20 pt-20">
        {/* Animated Background Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            className="absolute top-20 left-10 w-96 h-96 bg-[#f97316]/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              x: [0, 40, 0],
              y: [0, -30, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-[#1e3a8a]/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.3, 1],
              x: [0, -50, 0],
              y: [0, 40, 0],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>

        {/* Background Image */}
        <div className="absolute inset-0">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1643705314142-6f072c3d48fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzZWNvbmRoYW5kJTIwcmVmcmlnZXJhdG9yJTIwYXBwbGlhbmNlc3xlbnwxfHx8fDE3NjM1NzI0MjR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            alt="Ersin Spot İkinci El Beyaz Eşya"
            className="w-full h-full object-cover"
          />
          {/* Modern Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#2563eb]/60 via-[#3b82f6]/50 to-[#f97316]/50"></div>
        </div>

        {/* Stats Cards Overlay - Centered */}
        <div className="relative z-10 container mx-auto px-4 h-full flex items-center justify-center">
          <div className="max-w-5xl mx-auto w-full">
            <motion.div 
              className="text-center mb-12"
              initial="hidden"
              animate={heroInView ? "visible" : "hidden"}
              variants={staggerContainer}
            >
              <motion.h1 
                className="text-white mb-4 text-5xl drop-shadow-2xl"
                variants={fadeInUp}
              >
                Hakkımızda
              </motion.h1>
              <motion.p 
                className="text-white/90 text-xl drop-shadow-lg max-w-2xl mx-auto"
                variants={fadeInUp}
              >
                İzmir'in güvenilir adresi, 10 yılı aşkın tecrübesi ile hizmetinizde
              </motion.p>
            </motion.div>
            
            <motion.div 
              className="grid grid-cols-2 md:grid-cols-4 gap-6"
              initial="hidden"
              animate={heroInView ? "visible" : "hidden"}
              variants={staggerContainer}
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  variants={{
                    hidden: { opacity: 0, y: 50, rotateX: -20 },
                    visible: { opacity: 1, y: 0, rotateX: 0, transition: { duration: 0.6, delay: index * 0.1 } }
                  }}
                  whileHover={{ 
                    scale: 1.1, 
                    y: -10,
                    rotateY: 5,
                    transition: { duration: 0.3 }
                  }}
                >
                  <Card className="text-center bg-white/95 backdrop-blur-md border-0 shadow-2xl hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)] transition-all duration-300">
                    <CardContent className="p-8">
                      <AnimatedCounter 
                        value={stat.number} 
                        className="text-4xl font-bold bg-gradient-to-r from-[#1e3a8a] to-[#f97316] bg-clip-text text-transparent mb-3 drop-shadow-lg"
                      />
                      <div className="text-gray-700 font-semibold text-sm">{stat.label}</div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Our Story Section - With Beautiful Header */}
      <section ref={storyRef} className="py-20 container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Beautiful Section Header */}
          <motion.div 
            className="text-center mb-12"
            initial="hidden"
            animate={storyInView ? "visible" : "hidden"}
            variants={staggerContainer}
          >
            <motion.div className="inline-block mb-4" variants={scaleIn}>
              <motion.div 
                className="w-20 h-1 bg-gradient-to-r from-[#1e3a8a] via-[#f97316] to-[#1e3a8a] mx-auto rounded-full"
                animate={{ scaleX: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>
            <motion.h2 
              className="mb-4 bg-gradient-to-r from-[#1e3a8a] via-[#f97316] to-[#1e3a8a] bg-clip-text text-transparent text-4xl"
              variants={fadeInUp}
            >
              Hikayemiz
            </motion.h2>
            <motion.p 
              className="text-gray-600 text-lg max-w-2xl mx-auto"
              variants={fadeInUp}
            >
              10 yılı aşkın deneyimimizle İzmir'in güvenilir adresi
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            animate={storyInView ? "visible" : "hidden"}
            variants={fadeInUp}
          >
            <Card className="bg-gradient-to-br from-white via-orange-50/30 to-blue-50/30 border-0 shadow-2xl hover:shadow-3xl transition-all duration-500">
              <CardContent className="p-10">
                <div className="space-y-6 text-gray-700 leading-relaxed">
                  <p>
                    <strong>Ersin Spot</strong>, 2015 yılında Ersin Yılmaz tarafından İzmir Buca'da küçük bir mağaza olarak kuruldu. 
                    O günden bugüne, müşteri memnuniyetini her şeyin üstünde tutarak büyüdük ve gelişmeye devam ediyoruz.
                  </p>
                  
                  <p>
                    İlk günden itibaren amacımız, sıfır, az kullanılmış ve ikinci el ürünlerin hem ekonomik hem de çevre dostu bir alternatif olduğunu 
                    göstermek ve müşterilerimize güvenilir, kaliteli hizmet sunmaktı. Bugün 5000'den fazla mutlu müşterimizle, 
                    bu misyonumuzu başarıyla sürdürüyoruz.
                  </p>

                  <p>
                    <strong>Üç ana hizmet kolumuz:</strong>
                  </p>

                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>İkinci El Ürün Alım-Satımı:</strong> Beyaz eşya, elektronik ve mobilya kategorilerinde 
                    geniş ürün yelpazemiz var. Tüm ürünlerimiz uzman ekibimiz tarafından test edilir ve garanti ile satışa sunulur.</li>
                    
                    <li><strong>Teknik Servis:</strong> 10 yıllık deneyime sahip teknisyen ekibimizle, tüm beyaz eşya ve 
                    elektronik cihazlarınıza hızlı ve kaliteli tamir hizmeti veriyoruz. Orijinal yedek parça kullanımı ve 
                    garantili işçilik bizim standartlarımızdır.</li>
                    
                    <li><strong>Taşımacılık:</strong> Profesyonel nakliye ekibimizle ev ve ofis taşımalarınızı güvenle 
                    gerçekleştiriyoruz. Eşyalarınızın paketlenmesinden yerleştirilmesine kadar tüm süreçte yanınızdayız.</li>
                  </ul>

                  <p>
                    İzmir Buca Menderes Mahallesi'ndeki mağazamızda, geniş showroom alanımızda ürünlerimizi yerinde 
                    inceleyebilir, uzman ekibimizden danışmanlık alabilirsiniz. Müşteri memnuniyetindeki %94'lük oranımız, 
                    işimizi ne kadar ciddiye aldığımızın en büyük göstergesidir.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Vision & Mission Section */}
      <section ref={visionRef} className="py-16 bg-gradient-to-br from-blue-50/50 via-white to-orange-50/50 relative overflow-hidden">
        {/* Background Animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            className="absolute top-0 left-0 w-64 h-64 bg-[#1e3a8a]/5 rounded-full blur-3xl"
            animate={{
              x: [0, 100, 0],
              y: [0, 50, 0],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="absolute bottom-0 right-0 w-72 h-72 bg-[#f97316]/5 rounded-full blur-3xl"
            animate={{
              x: [0, -80, 0],
              y: [0, -40, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto"
            initial="hidden"
            animate={visionInView ? "visible" : "hidden"}
            variants={staggerContainer}
          >
            {/* Vision Card */}
            <motion.div
              variants={{
                hidden: { opacity: 0, x: -50, rotateY: -10 },
                visible: { opacity: 1, x: 0, rotateY: 0, transition: { duration: 0.6 } }
              }}
              whileHover={{ 
                y: -10, 
                scale: 1.02,
                rotateY: 5,
                transition: { duration: 0.3 }
              }}
            >
              <Card className="bg-gradient-to-br from-white to-blue-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 h-full">
                <CardContent className="p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <motion.div 
                      className="w-16 h-16 bg-gradient-to-br from-[#1e3a8a] to-[#3b82f6] rounded-full flex items-center justify-center shadow-lg"
                      whileHover={{ 
                        rotate: 360, 
                        scale: 1.1,
                        transition: { duration: 0.6 }
                      }}
                    >
                      <Target className="w-8 h-8 text-white" />
                    </motion.div>
                    <h2 className="bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6] bg-clip-text text-transparent">Vizyonumuz</h2>
                  </div>
                  <p className="text-gray-700 leading-relaxed">
                    İzmir'in en güvenilir ve tercih edilen ürün satış, teknik servis ve taşımacılık 
                    firması olmak. Sürdürülebilir tüketime öncülük ederek, çevreye duyarlı ve ekonomik çözümler 
                    sunmak. Sektöre örnek gösterilen bir marka haline gelmek ve hizmet kalitemizi sürekli geliştirerek büyümektir.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Mission Card */}
            <motion.div
              variants={{
                hidden: { opacity: 0, x: 50, rotateY: 10 },
                visible: { opacity: 1, x: 0, rotateY: 0, transition: { duration: 0.6 } }
              }}
              whileHover={{ 
                y: -10, 
                scale: 1.02,
                rotateY: -5,
                transition: { duration: 0.3 }
              }}
            >
              <Card className="bg-gradient-to-br from-white to-orange-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 h-full">
                <CardContent className="p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <motion.div 
                      className="w-16 h-16 bg-gradient-to-br from-[#f97316] to-[#fb923c] rounded-full flex items-center justify-center shadow-lg"
                      whileHover={{ 
                        rotate: 360, 
                        scale: 1.1,
                        transition: { duration: 0.6 }
                      }}
                    >
                      <Award className="w-8 h-8 text-white" />
                    </motion.div>
                    <h2 className="bg-gradient-to-r from-[#f97316] to-[#fb923c] bg-clip-text text-transparent">Misyonumuz</h2>
                  </div>
                  <p className="text-gray-700 leading-relaxed">
                    Müşterilerimize kaliteli, güvenilir ve uygun fiyatlı ürünler sunmak.
                    <br />
                    Teknik servis hizmetlerimizle cihazların ömrünü uzatmak ve gereksiz tüketimi azaltmak.
                    <br />
                    Profesyonel taşımacılık hizmetimizle müşterilerimizin hayatını kolaylaştırmak.
                    <br />
                    Her zaman dürüst, şeffaf ve müşteri odaklı hizmet vermek.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section ref={valuesRef} className="py-16 bg-gradient-to-b from-gray-50 via-white to-gray-50 relative overflow-hidden">
        {/* Background Image - Very Faded */}
        <div className="absolute inset-0 z-0">
          <img 
            src={shopImage} 
            alt="Ersin Spot Mağaza" 
            className="w-full h-full object-cover opacity-5"
          />
        </div>

        {/* Animated Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-[#f97316]/20 rounded-full"
              initial={{
                x: Math.random() * window.innerWidth,
                y: Math.random() * 500,
              }}
              animate={{
                y: [null, Math.random() * -200],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: i * 0.5,
              }}
            />
          ))}
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            className="text-center mb-12"
            initial="hidden"
            animate={valuesInView ? "visible" : "hidden"}
            variants={staggerContainer}
          >
            <motion.h2 className="mb-4" variants={fadeInUp}>Değerlerimiz</motion.h2>
            <motion.p className="text-gray-600 max-w-2xl mx-auto" variants={fadeInUp}>
              Çalışma prensiplerimiz ve müşterilerimize verdiğimiz değerler
            </motion.p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            initial="hidden"
            animate={valuesInView ? "visible" : "hidden"}
            variants={staggerContainer}
          >
            {values.map((value, index) => (
              <motion.div
                key={index}
                variants={{
                  hidden: { opacity: 0, y: 50, scale: 0.9 },
                  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, delay: index * 0.1 } }
                }}
                whileHover={{ 
                  y: -15, 
                  scale: 1.05,
                  rotateZ: 2,
                  transition: { duration: 0.3 }
                }}
              >
                <Card className="text-center hover:shadow-2xl transition-all duration-300 relative overflow-hidden border-0 bg-gradient-to-br from-white to-gray-50 h-full">
                  {/* Card background - even more faded */}
                  <div className="absolute inset-0 z-0">
                    <img 
                      src={shopImage} 
                      alt="" 
                      className="w-full h-full object-cover opacity-3"
                    />
                  </div>

                  <CardContent className="p-6 relative z-10">
                    <motion.div 
                      className={`w-16 h-16 bg-gradient-to-br ${value.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl`}
                      whileHover={{ 
                        rotate: 360, 
                        scale: 1.15,
                        transition: { duration: 0.6 }
                      }}
                    >
                      <value.icon className="w-8 h-8 text-white" />
                    </motion.div>
                    <h3 className="mb-3">{value.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{value.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Team Section */}
      <section ref={teamRef} className="py-20 bg-gradient-to-br from-orange-50/30 via-white to-blue-50/30 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            className="absolute top-10 right-10 w-80 h-80 bg-[#7FA99B]/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
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
            animate={teamInView ? "visible" : "hidden"}
            variants={staggerContainer}
          >
            <motion.h2 className="mb-4" variants={fadeInUp}>Ekibimiz</motion.h2>
            <motion.p className="text-gray-600 max-w-2xl mx-auto" variants={fadeInUp}>
              Uzman ve deneyimli ekibimiz her zaman hizmetinizde
            </motion.p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto"
            initial="hidden"
            animate={teamInView ? "visible" : "hidden"}
            variants={staggerContainer}
          >
            {team.map((member, index) => (
              <motion.div
                key={index}
                variants={{
                  hidden: { opacity: 0, y: 50, rotateX: -15 },
                  visible: { opacity: 1, y: 0, rotateX: 0, transition: { duration: 0.6, delay: index * 0.15 } }
                }}
                whileHover={{ 
                  y: -12, 
                  scale: 1.05,
                  transition: { duration: 0.3 }
                }}
              >
                <Card className="text-center hover:shadow-2xl transition-all duration-500 bg-white border border-gray-200 hover:border-gray-300">
                  <CardContent className="p-8">
                    <motion.div 
                      className={`w-24 h-24 bg-gradient-to-br ${member.color} rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl`}
                      whileHover={{ 
                        rotate: 360, 
                        scale: 1.1,
                        transition: { duration: 0.6 }
                      }}
                    >
                      <Users className="w-12 h-12 text-white" />
                    </motion.div>
                    <h3 className="mb-2">{member.name}</h3>
                    <p className="text-gray-600 mb-2">{member.role}</p>
                    <p className="text-sm text-gray-500">{member.experience}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
}