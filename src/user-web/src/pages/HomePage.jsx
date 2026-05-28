import React, { useState, useEffect } from 'react';
import HeroSection from '../components/Home/HeroSection.jsx';
import StatsSection from '../components/Home/StatsSection.jsx';
import CategoryGrid from '../components/Home/CategoryGrid.jsx';
import FeaturedEvents from '../components/Home/FeaturedEvents.jsx';
import NewsTicker from '../components/Home/NewsTicker.jsx';
import BootSequence from '../components/Home/BootSequence.jsx';
import { api } from '../services/api.js';
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
  const [tickerIncidents, setTickerIncidents] = useState([]);

  useEffect(() => {
    // Fetch incidents for the news ticker
    api
      .getIncidents({ status: 'active' })
      .then((res) => {
        const active = res.data.incidents || [];
        active.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
        setTickerIncidents(active.slice(0, 10));
      })
      .catch(() => setTickerIncidents([]));
  }, []);

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
