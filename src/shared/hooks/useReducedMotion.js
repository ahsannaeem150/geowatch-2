import { useEffect, useState } from 'react';

/**
 * useReducedMotion — true when the user prefers reduced motion, via EITHER
 * the OS media query or the manual app toggle (`.reduce-motion` on <html>,
 * persisted as geowatch_user_reduce_motion in localStorage). Reacts live to
 * both sources.
 */
function computeReduced() {
  if (typeof window === 'undefined') return false;
  const os = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const manual = document.documentElement.classList.contains('reduce-motion');
  return os || manual;
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(computeReduced);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(computeReduced());
    mq.addEventListener('change', onChange);
    const observer = new MutationObserver(onChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      mq.removeEventListener('change', onChange);
      observer.disconnect();
    };
  }, []);

  return reduced;
}

/** One-shot (non-reactive) check for imperative code paths. */
export function prefersReducedMotionNow() {
  return computeReduced();
}
