import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Header from './components/Layout/Header.jsx';
import Footer from './components/Layout/Footer.jsx';
import HomePage from './pages/HomePage.jsx';
import MapPage from './pages/MapPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import IncidentDetailPage from './components/IncidentDetail/IncidentDetailPage.jsx';
import ZoneTrialSidebarPage from './pages/ZoneTrialSidebarPage.jsx';
import ZoneTrialLayoutB from './pages/ZoneTrialLayoutB.jsx';
import ZoneTrialMeterPage from './pages/ZoneTrialMeterPage.jsx';
import ZoneStylesTrialPage from './pages/ZoneStylesTrialPage.jsx';
import ZoneHeroesTrialPage from './pages/ZoneHeroesTrialPage.jsx';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const pageTransition = {
  duration: 0.35,
  ease: [0.16, 1, 0.3, 1],
};

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={pageTransition}
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
      >
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/incident/:id" element={<IncidentDetailPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/trial/zone-sidebar" element={<ZoneTrialSidebarPage />} />
          <Route path="/trial/zone" element={<ZoneTrialLayoutB />} />
          <Route path="/trial/zone-meter" element={<ZoneTrialMeterPage />} />
          <Route path="/trial/zone-styles" element={<ZoneStylesTrialPage />} />
          <Route path="/trial/zone-heroes" element={<ZoneHeroesTrialPage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  const location = useLocation();
  const isMapPage = location.pathname === '/map';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-gradient)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)',
        overflow: isMapPage ? 'hidden' : 'auto',
      }}
    >
      <ScrollToTop />
      <Header />
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: isMapPage ? 'hidden' : 'visible',
        }}
      >
        <AnimatedRoutes />
      </main>
      {!isMapPage && <Footer />}
    </div>
  );
}
