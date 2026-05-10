import React from 'react';
import HeroSection from '../components/Home/HeroSection.jsx';
import StatsSection from '../components/Home/StatsSection.jsx';
import CategoryGrid from '../components/Home/CategoryGrid.jsx';
import FeaturedEvents from '../components/Home/FeaturedEvents.jsx';

export default function HomePage() {
  return (
    <div>
      <HeroSection />
      <StatsSection />
      <CategoryGrid />
      <FeaturedEvents />
    </div>
  );
}
