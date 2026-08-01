import React from 'react';
import { useInView } from './useInView.js';
import { useReducedMotion } from '@shared/hooks/useReducedMotion.js';

export default function FadeIn({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  distance = 24,
  duration = 700,
  threshold = 0.15,
}) {
  const { ref, isInView } = useInView({ threshold });
  const reducedMotion = useReducedMotion();

  const transforms = {
    up: `translateY(${distance}px)`,
    down: `translateY(-${distance}px)`,
    left: `translateX(${distance}px)`,
    right: `translateX(-${distance}px)`,
    none: 'none',
  };

  const visible = reducedMotion || isInView;

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : transforms[direction],
        transition: reducedMotion
          ? 'none'
          : `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        willChange: 'opacity, transform',
      }}
      className={className}
    >
      {children}
    </div>
  );
}
