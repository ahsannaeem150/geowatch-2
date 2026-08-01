import React, { useState, useMemo } from 'react';
import HeroSection from '../components/Home/HeroSection.jsx';
import StatsSection from '../components/Home/StatsSection.jsx';
import CategoryGrid from '../components/Home/CategoryGrid.jsx';
import FeaturedEvents from '../components/Home/FeaturedEvents.jsx';
import NewsTicker from '../components/Home/NewsTicker.jsx';
import BootSequence from '../components/Home/BootSequence.jsx';
import { useHomeData } from '../hooks/useHomeData.js';
import './HomePage.css';

function SectionDivider() {
  return (
    <div className="home-divider" style={{ padding: '24px' }}>
      <div className="home-divider__line" />
    </div>
  );
}

export default function HomePage() {
  const [booting, setBooting] = useState(() => {
    // Only show boot sequence on first visit per session
    return !sessionStorage.getItem('geowatch_booted');
  });

  // One consolidated fetch feeds every home section (see useHomeData)
  const { activeIncidents } = useHomeData();
  const tickerIncidents = useMemo(
    () =>
      [...activeIncidents]
        .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
        .slice(0, 10),
    [activeIncidents]
  );

  const handleBootComplete = () => {
    sessionStorage.setItem('geowatch_booted', 'true');
    setBooting(false);
  };

  return (
    <>
      {booting && <BootSequence onComplete={handleBootComplete} />}

      <div
        style={{
          opacity: booting ? 0 : 1,
          transition: 'opacity 0.8s ease 0.2s',
        }}
      >
        <HeroSection />
        <StatsSection />
        <SectionDivider />
        <CategoryGrid />
        <NewsTicker incidents={tickerIncidents} />
        <SectionDivider />
        <FeaturedEvents />
      </div>
    </>
  );
}
