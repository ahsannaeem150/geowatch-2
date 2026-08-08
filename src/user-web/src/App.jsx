import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Header from './components/Layout/Header.jsx';
import Footer from './components/Layout/Footer.jsx';
import HomePage from './pages/HomePage.jsx';
import MapPage from './pages/MapPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import IncidentsPage from './pages/IncidentsPage.jsx';
import ZonesPage from './pages/ZonesPage.jsx';
import IncidentDetailPage from './components/IncidentDetail/IncidentDetailPage.jsx';
import ZoneDetailPage from './pages/ZoneDetailPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

// Trial pages are lazy-loaded so Vite code-splits their local CSS with the
// chunk: stale trial styles only load on /trial/* and can't leak global class
// overrides (e.g. .zone-btn--primary) into production pages.
const ZoneTrialSidebarPage = lazy(() => import('./pages/ZoneTrialSidebarPage.jsx'));
const ZoneTrialLayoutB = lazy(() => import('./pages/ZoneTrialLayoutB.jsx'));
const ZoneTrialMeterPage = lazy(() => import('./pages/ZoneTrialMeterPage.jsx'));
const ZoneStylesTrialPage = lazy(() => import('./pages/ZoneStylesTrialPage.jsx'));
const ZoneHeroesTrialPage = lazy(() => import('./pages/ZoneHeroesTrialPage.jsx'));
const ZoneSidebarAnimationTrialPage = lazy(() => import('./pages/ZoneSidebarAnimationTrialPage.jsx'));
const ZoneTrialCreatePage = lazy(() => import('./pages/ZoneTrialCreatePage.jsx'));

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

// Per-route document titles. Detail pages set their own title from the
// loaded incident/zone; everything else maps here.
const ROUTE_TITLES = [
  { match: /^\/$/, title: 'IntelMap24 - Conflict Monitor' },
  { match: /^\/map$/, title: 'Map — IntelMap24' },
  { match: /^\/incidents$/, title: 'Incidents — IntelMap24' },
  { match: /^\/zones$/, title: 'Zones — IntelMap24' },
  { match: /^\/about$/, title: 'About — IntelMap24' },
  // Catch-all (404) — keep last; detail pages override with the loaded title
  { match: /^\/(?!incident\/|zone\/|trial\/).*/, title: 'Page not found — IntelMap24' },
];

function RouteTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const hit = ROUTE_TITLES.find((r) => r.match.test(pathname));
    if (hit) document.title = hit.title;
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
        <Suspense fallback={null}>
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/incidents" element={<IncidentsPage />} />
            <Route path="/zones" element={<ZonesPage />} />
            <Route path="/incident/:id" element={<IncidentDetailPage />} />
            <Route path="/zone/:id" element={<ZoneDetailPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/trial/zone-sidebar" element={<ZoneTrialSidebarPage />} />
            <Route path="/trial/zone" element={<ZoneTrialLayoutB />} />
            <Route path="/trial/zone-meter" element={<ZoneTrialMeterPage />} />
            <Route path="/trial/zone-styles" element={<ZoneStylesTrialPage />} />
            <Route path="/trial/zone-heroes" element={<ZoneHeroesTrialPage />} />
            <Route path="/trial/zone-sidebar-animations" element={<ZoneSidebarAnimationTrialPage />} />
            <Route path="/trial/zone-create" element={<ZoneTrialCreatePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
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
      <RouteTitle />
      {!isMapPage && <Header />}
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
