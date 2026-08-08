import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Map as MapIcon, ArrowLeft } from 'lucide-react';
import { useReducedMotion } from '@shared/hooks/useReducedMotion.js';
import './NotFoundPage.css';

const EASE = [0.16, 1, 0.3, 1];

/**
 * 404 — "off the map". One visual idea: a blinking targeting reticle that
 * can't acquire the requested location.
 */
export default function NotFoundPage() {
  const reduced = useReducedMotion();

  useEffect(() => {
    document.title = 'Page not found — IntelMap24';
  }, []);

  const rise = (delay) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.55, delay, ease: EASE },
        };

  return (
    <div className="nf-page">
      <div className="nf-panel">
        <div className="nf-grid" aria-hidden="true" />
        <span className="nf-corner nf-corner--tl">ERR/404</span>
        <span className="nf-corner nf-corner--br">NO FIX ACQUIRED</span>

        <motion.svg
          className="nf-reticle"
          viewBox="0 0 120 120"
          fill="none"
          aria-hidden="true"
          {...(reduced
            ? {}
            : {
                initial: { opacity: 0, scale: 0.85 },
                animate: { opacity: 1, scale: 1 },
                transition: { duration: 0.6, ease: EASE },
              })}
        >
          <circle className="nf-reticle__ping" cx="60" cy="60" r="34" />
          <circle cx="60" cy="60" r="34" />
          <circle cx="60" cy="60" r="18" />
          <line x1="60" y1="6" x2="60" y2="30" />
          <line x1="60" y1="90" x2="60" y2="114" />
          <line x1="6" y1="60" x2="30" y2="60" />
          <line x1="90" y1="60" x2="114" y2="60" />
          <circle className="nf-reticle__dot nf-reticle__blink" cx="60" cy="60" r="3" />
        </motion.svg>

        <motion.div className="nf-coords" {...rise(0.1)}>
          404°00′N 00°00′E
        </motion.div>

        <motion.div className="nf-status" {...rise(0.2)}>
          <span className="nf-status-dot" />
          SIGNAL LOST
        </motion.div>

        <motion.p className="nf-line font-longform" {...rise(0.28)}>
          This location isn&rsquo;t on our map. The page you asked for was moved, renamed, or never
          reported at these coordinates.
        </motion.p>

        <motion.div className="nf-actions" {...rise(0.36)}>
          <Link to="/map" className="nf-btn nf-btn--primary">
            <MapIcon size={14} />
            Open the map
          </Link>
          <Link to="/" className="nf-btn nf-btn--ghost">
            <ArrowLeft size={14} />
            Home
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
