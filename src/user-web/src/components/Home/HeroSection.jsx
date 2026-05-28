import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Info } from 'lucide-react';
import HeroMap from './HeroMap.jsx';
import FadeIn from './FadeIn.jsx';

export default function HeroSection() {
  return (
    <section className="home-hero">
      <HeroMap />

      {/* Strong multi-layer gradient overlays for text readability */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          background: `
            radial-gradient(ellipse 60% 50% at 50% 50%, rgba(5,5,5,0.3) 0%, rgba(5,5,5,0.7) 70%, rgba(5,5,5,0.95) 100%),
            linear-gradient(to bottom, rgba(5,5,5,0.8) 0%, rgba(5,5,5,0.2) 30%, rgba(5,5,5,0.2) 70%, rgba(5,5,5,0.9) 100%),
            linear-gradient(to right, rgba(5,5,5,0.6) 0%, rgba(5,5,5,0) 30%, rgba(5,5,5,0) 70%, rgba(5,5,5,0.6) 100%)
          `,
        }}
      />

      {/* Subtle animated scan line */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
        }}
      />

      <div className="home-hero__content">
        <FadeIn delay={200}>
          <div className="home-badge">
            <span className="home-badge__dot" />
            <span className="home-badge__text">Live Monitoring Active</span>
          </div>
        </FadeIn>

        <FadeIn delay={350}>
          <h1 className="home-headline">
            Conflict Intelligence,
            <br />
            <span className="home-headline__accent">Mapped in Real Time</span>
          </h1>
        </FadeIn>

        <FadeIn delay={500}>
          <p className="home-subheadline">
            Track conflicts, protests, and disasters as they unfold. GeoWatch monitors
            global incidents so you can understand the story behind the headlines.
          </p>
        </FadeIn>

        <FadeIn delay={650}>
          <div className="home-ctas">
            <Link to="/map" className="home-cta home-cta--primary">
              <ArrowRight size={16} strokeWidth={2.5} />
              Enter the Map
            </Link>
            <Link to="/about" className="home-cta home-cta--secondary">
              <Info size={16} strokeWidth={2.5} />
              About GeoWatch
            </Link>
          </div>
        </FadeIn>
      </div>

      <FadeIn delay={900} direction="none">
        <div className="home-scroll-indicator">
          <div className="home-scroll-indicator__line" />
          <span className="home-scroll-indicator__text">Scroll</span>
        </div>
      </FadeIn>
    </section>
  );
}
