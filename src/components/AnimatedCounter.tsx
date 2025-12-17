import { useEffect, useRef, useState } from 'react';
import { useCountUp } from '../hooks/useCountUp';

interface AnimatedCounterProps {
  value: string; // "5000+", "10+", "%94" gibi
  className?: string;
}

export function AnimatedCounter({ value, className = '' }: AnimatedCounterProps) {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // String değerden sayıyı çıkar
  const parseValue = (val: string): { number: number; prefix: string; suffix: string } => {
    const match = val.match(/^(%?)(\d+)(\+?)$/);
    if (match) {
      return {
        prefix: match[1] || '',
        number: parseInt(match[2]),
        suffix: match[3] || ''
      };
    }
    return { prefix: '', number: 0, suffix: '' };
  };

  const { prefix, number, suffix } = parseValue(value);
  const count = useCountUp({ end: number, duration: 2500, isInView });

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      {
        threshold: 0.3, // %30'u görünür olduğunda başla
        rootMargin: '0px'
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {prefix}{count.toLocaleString('tr-TR')}{suffix}
    </div>
  );
}
