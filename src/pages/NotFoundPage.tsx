import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Home, Search, Package, ArrowLeft, HelpCircle, Tv, Sofa, Refrigerator } from 'lucide-react@0.487.0';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  const [floatingItems, setFloatingItems] = useState([
    { icon: Tv, x: 10, y: 20, delay: 0 },
    { icon: Sofa, x: 80, y: 15, delay: 0.2 },
    { icon: Refrigerator, x: 15, y: 70, delay: 0.4 },
    { icon: Package, x: 85, y: 65, delay: 0.6 },
  ]);

  const popularPages = [
    { title: 'Ana Sayfa', path: '/', icon: Home, color: 'bg-[#f97316]' },
    { title: 'Ürünler', path: '/urunler', icon: Package, color: 'bg-[#1e3a8a]' },
    { title: 'Hakkımızda', path: '/hakkimizda', icon: HelpCircle, color: 'bg-[#7FA99B]' },
    { title: 'İletişim', path: '/iletisim', icon: Search, color: 'bg-[#8B6F47]' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F1EDE3] via-white to-[#7FA99B]/10 relative overflow-hidden pt-20">
      {/* Floating Background Items */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {floatingItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={index}
              className="absolute text-gray-200"
              style={{ left: `${item.x}%`, top: `${item.y}%` }}
              animate={{
                y: [0, -20, 0],
                rotate: [0, 5, -5, 0],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 4,
                delay: item.delay,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Icon className="w-16 h-16 md:w-24 md:h-24" />
            </motion.div>
          );
        })}
      </div>

      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* 404 Number Animation */}
          <motion.div 
            className="text-center mb-8"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
          >
            <motion.div
              className="inline-block"
              animate={{ 
                rotate: [0, 2, -2, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <h1 className="text-[120px] md:text-[200px] leading-none font-black bg-gradient-to-br from-[#f97316] via-[#FF8A6B] to-[#1e3a8a] bg-clip-text text-transparent drop-shadow-2xl">
                404
              </h1>
            </motion.div>
          </motion.div>

          {/* Main Content */}
          <motion.div
            className="text-center mb-12"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl mb-4 text-gray-800">
              Aradığınız Sayfa Bulunamadı
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-2">
              Üzgünüz! Aradığınız sayfa taşınmış, silinmiş veya hiç var olmamış olabilir.
            </p>
            <p className="text-gray-500">
              Ama endişelenmeyin, size yardımcı olmak için buradayız! 😊
            </p>
          </motion.div>

          {/* Floating Card with Fun Message */}
          <motion.div
            className="bg-white rounded-2xl shadow-xl p-8 mb-12 border-2 border-[#f97316]/20"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <div className="flex items-start gap-4">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="w-16 h-16 bg-gradient-to-br from-[#f97316] to-[#FF8A6B] rounded-full flex items-center justify-center flex-shrink-0">
                  <Package className="w-8 h-8 text-white" />
                </div>
              </motion.div>
              <div>
                <h3 className="text-xl mb-2 text-gray-800">
                  Belki bu ürünü satmıştık? 🤔
                </h3>
                <p className="text-gray-600 mb-4">
                  Ersin Spot'ta tüm ürünlerimiz ikinci el ve tekil olduğu için satılan ürünler siteden kaldırılır. 
                  Eğer bir ürün arıyorsanız, güncel ürünlerimize göz atabilir veya size özel ürün bulma hizmetimizden yararlanabilirsiniz!
                </p>
                <div className="flex gap-3 flex-wrap">
                  <Link to="/urunler">
                    <Button className="bg-[#f97316] hover:bg-[#ea580c]">
                      <Package className="w-4 h-4 mr-2" />
                      Tüm Ürünleri Gör
                    </Button>
                  </Link>
                  <Link to="/iletisim">
                    <Button variant="outline" className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white">
                      <Search className="w-4 h-4 mr-2" />
                      Ürün Arama Talebi
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Popular Pages Grid */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <h3 className="text-center mb-6 text-gray-700">
              Veya buradan devam edebilirsiniz:
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              {popularPages.map((page, index) => {
                const Icon = page.icon;
                return (
                  <motion.div
                    key={page.path}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 + index * 0.1, duration: 0.4 }}
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link to={page.path}>
                      <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all p-6 text-center border-2 border-transparent hover:border-[#f97316]/30 cursor-pointer group h-full">
                        <div className={`w-14 h-14 ${page.color} rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                          <Icon className="w-7 h-7 text-white" />
                        </div>
                        <p className="font-medium text-gray-800">{page.title}</p>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Back Button */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <Button
              onClick={() => window.history.back()}
              variant="outline"
              size="lg"
              className="border-2 border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Önceki Sayfaya Dön
            </Button>
          </motion.div>

          {/* Fun Statistics */}
          <motion.div
            className="mt-16 bg-gradient-to-r from-[#1e3a8a]/10 via-[#7FA99B]/10 to-[#f97316]/10 rounded-2xl p-8"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            <h3 className="text-center mb-6 text-gray-700">
              Bu sayfayı bulamasanız da, bunları bulabilirsiniz:
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: 'Mutlu Müşteri', value: '5000+', color: 'text-[#f97316]' },
                { label: 'Yıllık Tecrübe', value: '10+', color: 'text-[#1e3a8a]' },
                { label: 'Tamamlanan Servis', value: '5000+', color: 'text-[#7FA99B]' },
                { label: 'Memnuniyet Oranı', value: '%94', color: 'text-[#8B6F47]' },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  className="text-center"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 1 + index * 0.1, duration: 0.4 }}
                >
                  <div className={`text-3xl md:text-4xl mb-1 ${stat.color}`}>
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Footer Message */}
          <motion.div
            className="text-center mt-12 text-gray-500 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
          >
            <p>
              Sorun devam ederse, lütfen{' '}
              <Link to="/iletisim" className="text-[#f97316] hover:underline font-medium">
                bizimle iletişime geçin
              </Link>
              {' '}veya{' '}
              <a href="tel:+905071940550" className="text-[#1e3a8a] hover:underline font-medium">
                0 507 194 05 50
              </a>
              {' '}numaralı telefondan arayın.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}