import { useEffect, useState } from 'react';
import { useReducedMotion } from '@shared/hooks/useReducedMotion.js';

export function useCountUp(end, duration = 1200, startOn = true) {
  const [count, setCount] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!startOn) {
      setCount(0);
      return;
    }

    // Reduced motion: land on the final value immediately, no animation
    if (reducedMotion) {
      setCount(end);
      return;
    }

    let startTime = null;
    let rafId = null;

    const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = easeOutQuart(progress);
      setCount(Math.floor(eased * end));

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [end, duration, startOn, reducedMotion]);

  return count;
}
