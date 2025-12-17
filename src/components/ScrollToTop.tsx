import { useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();
  const params = useParams(); // URL parametrelerini de izle (örn: /urun/:id)

  useEffect(() => {
    // 1. Hemen scroll yap (instant, smooth değil)
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' as ScrollBehavior
    });
    
    // 2. DOM güncellendiğinde tekrar (React render tamamlandıktan sonra)
    const scrollToTopImmediate = () => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant' as ScrollBehavior
      });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    
    // Mikro-task kuyruğunda (Promise) tekrar yap
    Promise.resolve().then(scrollToTopImmediate);
    
    // requestAnimationFrame ile tekrar yap (browser render sonrası)
    requestAnimationFrame(scrollToTopImmediate);
    
    // setTimeout ile de garantiye al (sayfa tam yüklendikten sonra)
    const timeouts = [
      setTimeout(scrollToTopImmediate, 0),
      setTimeout(scrollToTopImmediate, 50),
      setTimeout(scrollToTopImmediate, 100),
      setTimeout(scrollToTopImmediate, 200)
    ];
    
    // Cleanup
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [pathname, params]); // pathname VE params değişince tetikle

  return null;
}