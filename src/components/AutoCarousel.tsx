import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react@0.487.0';

interface AutoCarouselProps {
  children: React.ReactNode[];
  interval?: number; // Otomatik geçiş süresi (ms)
  itemsPerView?: number; // Aynı anda kaç ürün gösterilecek
}

export function AutoCarousel({ 
  children, 
  interval = 4000,
  itemsPerView = 4
}: AutoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [responsiveItemsPerView, setResponsiveItemsPerView] = useState(itemsPerView);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const totalItems = children.length;
  const maxIndex = Math.max(0, totalItems - responsiveItemsPerView);

  // Responsive items per view
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setResponsiveItemsPerView(1); // Mobile: 1 item
      } else if (window.innerWidth < 1024) {
        setResponsiveItemsPerView(2); // Tablet: 2 items
      } else {
        setResponsiveItemsPerView(itemsPerView); // Desktop: original value
      }
    };

    handleResize(); // İlk yükleme
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [itemsPerView]);

  // Reset index when responsive items per view changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [responsiveItemsPerView]);

  // Otomatik kayma fonksiyonu
  const startAutoSlide = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= maxIndex) {
          return 0; // Başa dön
        }
        return prev + 1;
      });
    }, interval);
  };

  // Otomatik kayma - hover olmadığında çalışır
  useEffect(() => {
    if (isHovered || totalItems <= responsiveItemsPerView) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      return;
    }

    startAutoSlide();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isHovered, interval, maxIndex, totalItems, responsiveItemsPerView]);

  const goToIndex = (index: number) => {
    setCurrentIndex(index);
    // Manuel tıklamadan sonra timer'ı resetle ve devam ettir
    if (!isHovered) {
      startAutoSlide();
    }
  };

  const goToPrev = () => {
    const newIndex = currentIndex === 0 ? maxIndex : currentIndex - 1;
    goToIndex(newIndex);
  };

  const goToNext = () => {
    const newIndex = currentIndex === maxIndex ? 0 : currentIndex + 1;
    goToIndex(newIndex);
  };

  return (
    <div 
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="overflow-hidden relative">
        <motion.div
          className="flex gap-4 items-stretch"
          animate={{
            x: `calc(-${currentIndex * (100 / responsiveItemsPerView)}% - ${currentIndex * 1}rem)`
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30
          }}
        >
          {children.map((child, index) => (
            <motion.div
              key={index}
              className="flex-shrink-0 h-full"
              style={{ 
                width: `calc((100% - ${(responsiveItemsPerView - 1) * 1}rem) / ${responsiveItemsPerView})`
              }}
            >
              {child}
            </motion.div>
          ))}
        </motion.div>

        {/* Navigation Arrows - Hover'da görünür */}
        {totalItems > responsiveItemsPerView && (
          <>
            <button
              onClick={goToPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-3 shadow-xl transition-all hover:scale-110 z-20 opacity-0 group-hover:opacity-100"
              aria-label="Önceki"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-3 shadow-xl transition-all hover:scale-110 z-20 opacity-0 group-hover:opacity-100"
              aria-label="Sonraki"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Progress Dots */}
      {totalItems > responsiveItemsPerView && (
        <div className="flex justify-center gap-3 mt-8">
          {Array.from({ length: maxIndex + 1 }).map((_, index) => (
            <button
              key={index}
              onClick={() => goToIndex(index)}
              className={`rounded-full transition-all duration-300 transform hover:scale-110 ${
                index === currentIndex
                  ? 'w-12 h-3 bg-gradient-to-r from-[#f97316] to-[#ea580c] shadow-lg'
                  : 'w-3 h-3 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Slide ${index + 1}'e git`}
            />
          ))}
        </div>
      )}
    </div>
  );
}