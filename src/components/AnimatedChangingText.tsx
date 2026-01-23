import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export function AnimatedChangingText() {
  const words = [
    { text: 'güvenilir', color: 'bg-[#1e3a8a]' },
    { text: 'kaliteli', color: 'bg-[#f97316]' },
    { text: 'ekonomik', color: 'bg-[#7FA99B]' },
    { text: 'hızlı', color: 'bg-[#FF8A6B]' },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [key, setKey] = useState(0); // Timer'ı reset etmek için

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % words.length);
    }, 2500); // Her 2.5 saniyede değişir

    return () => clearInterval(interval);
  }, [key]); // key değiştiğinde timer yeniden başlar

  // Çizgiye tıklandığında
  const handleBarClick = (index: number) => {
    setCurrentIndex(index);
    setKey(prev => prev + 1); // Timer'ı reset et
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 bg-gradient-to-b from-gray-50 via-blue-50/40 to-gray-100">
      <div className="text-center max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl lg:text-4xl leading-tight mb-4">
          <span className="text-gray-900">İzmir'in en </span>
          <AnimatePresence mode="wait">
            <motion.span
              key={currentIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="inline-block relative"
            >
              <span
                className={`${words[currentIndex].color} text-white px-6 py-2 rounded-lg font-bold inline-block shadow-lg`}
                style={{ fontWeight: 700 }}
              >
                {words[currentIndex].text}
              </span>
            </motion.span>
          </AnimatePresence>
          <br className="md:hidden" />
          <span className="text-gray-900"> ikinci el mağazası</span>
        </h2>
        <motion.p
          className="text-gray-600 text-lg md:text-xl mt-6 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Beyaz eşya, elektronik ve mobilya ürünlerinde <strong>10 yıllık tecrübe</strong> ile
          <br className="hidden md:block" />
          müşteri memnuniyetini ön planda tutuyoruz.
        </motion.p>
      </div>

      {/* Progress Bar - Tıklanabilir */}
      <div className="mt-12 flex gap-3">
        {words.map((_, index) => (
          <div
            key={index}
            onClick={() => handleBarClick(index)}
            className="relative h-1 w-16 bg-gray-200 rounded-full overflow-hidden cursor-pointer transition-transform hover:scale-105 active:scale-95"
            role="button"
            aria-label={`${words[index].text} sloganına geç`}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleBarClick(index);
              }
            }}
          >
            {index === currentIndex && (
              <motion.div
                key={key} // Timer reset edildiğinde animasyonu yeniden başlat
                className={`absolute inset-0 ${words[currentIndex].color}`}
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 2.5, ease: 'linear' }}
              />
            )}
            {index < currentIndex && (
              <div className={`absolute inset-0 ${words[index].color}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}