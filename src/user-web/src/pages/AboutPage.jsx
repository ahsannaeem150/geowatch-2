import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { api } from '../services/api.js';
import { SEVERITY_SCALE } from '@shared/constants.js';
import { useReducedMotion } from '@shared/hooks/useReducedMotion.js';
import { useCountUp } from '../components/Home/useCountUp.js';
import { useInView } from '../components/Home/useInView.js';
import './AboutPage.css';

// One-line meanings for the severity ramp (the existing methodology copy's
// factors — casualties, geographic spread, geopolitical impact — in strip form)
const SEV_MEANINGS = {
  1: 'Isolated incident with no wider impact.',
  2: 'Localized tension; limited geographic spread.',
  3: 'Regional impact; escalation or casualties likely.',
  4: 'Major escalation with cross-border significance.',
  5: 'Mass-casualty or geopolitical shock event.',
};

const EASE = [0.16, 1, 0.3, 1];

/** Scroll-triggered reveal, disabled under reduced motion. */
function Reveal({ children, delay = 0, y = 18, className, style }) {
  const reduced = useReducedMotion();
  if (reduced) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function SectionLabel({ num, children }) {
  return (
    <div className="about-section__label">
      <span className="about-section__label-num">{num}</span>
      <span>{children}</span>
    </div>
  );
}

function Stat({ value, label, delay }) {
  const { ref, isInView } = useInView();
  const count = useCountUp(value, 1400, isInView);
  return (
    <Reveal className="about-stat" delay={delay}>
      <div ref={ref}>
        <div className="about-stat__value">{count.toLocaleString()}</div>
        <div className="about-stat__label">{label}</div>
      </div>
    </Reveal>
  );
}

function Reticle({ className }) {
  return (
    <svg className={`about-reticle ${className || ''}`} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <circle className="about-reticle__ping" cx="60" cy="60" r="34" />
      <circle cx="60" cy="60" r="34" />
      <circle cx="60" cy="60" r="18" />
      <line x1="60" y1="6" x2="60" y2="30" />
      <line x1="60" y1="90" x2="60" y2="114" />
      <line x1="6" y1="60" x2="30" y2="60" />
      <line x1="90" y1="60" x2="114" y2="60" />
      <circle className="about-reticle__dot" cx="60" cy="60" r="3" />
    </svg>
  );
}

const MISSION_LINES = [
  'GeoWatch is a real-time conflict',
  'intelligence platform that monitors',
  'and maps global incidents as they unfold.',
];

export default function AboutPage() {
  const reduced = useReducedMotion();
  const [stats, setStats] = useState({ active: 0, today: 0, countries: 0, sources: 0 });
  const [domains, setDomains] = useState([]);

  // Live coverage numbers — same endpoints/derivation as the home StatsSection
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const fallback = { data: { incidents: [], count: 0 } };

    const fetchActive = api.getIncidents({ status: 'active' }).catch(() => fallback);
    const fetchToday = api.getIncidents({ dateFrom: today, dateTo: today }).catch(() => fallback);
    const fetchAll = api.getIncidents({}).catch(() => fallback);

    Promise.all([fetchActive, fetchToday, fetchAll])
      .then(([activeRes, todayRes, allRes]) => {
        const incidents = allRes.data?.incidents || [];
        const countries = new Set(
          incidents.map((i) => i.location_context?.split(',').pop()?.trim()).filter(Boolean)
        ).size;
        const sourceNames = new Set(incidents.map((i) => i.source_name).filter(Boolean));
        setStats({
          active: activeRes.data?.count ?? 0,
          today: todayRes.data?.count ?? 0,
          countries,
          sources: sourceNames.size,
        });
      })
      .catch(() => {});
  }, []);

  // Real domain legend
  useEffect(() => {
    api
      .getDomains()
      .then((res) => setDomains(res.data?.domains || []))
      .catch(() => setDomains([]));
  }, []);

  return (
    <div className="about-page">
      {/* ─── Mission hero ─── */}
      <section className="about-hero">
        <div className="about-hero__grid" aria-hidden="true" />
        <Reticle className="about-hero__reticle" />
        <div className="about-hero__coords">30.3753°N 69.3451°E — GLOBAL WATCH</div>
        <h1 className="about-hero__mission">
          {MISSION_LINES.map((line, i) => (
            <span className="about-hero__mask" key={i}>
              {reduced ? (
                <span style={{ display: 'block' }}>{line}</span>
              ) : (
                <motion.span
                  style={{ display: 'block' }}
                  initial={{ y: '110%' }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.7, delay: 0.08 + i * 0.09, ease: EASE }}
                >
                  {line}
                </motion.span>
              )}
            </span>
          ))}
        </h1>
        <motion.p
          className="about-hero__sub font-longform"
          {...(reduced
            ? {}
            : {
                initial: { opacity: 0, y: 12 },
                animate: { opacity: 1, y: 0 },
                transition: { duration: 0.6, delay: 0.45, ease: EASE },
              })}
        >
          From border clashes to diplomatic developments, protests to natural disasters — we track
          it all so you can understand the story behind the headlines.
        </motion.p>
      </section>

      {/* ─── Live coverage ─── */}
      <section className="about-section">
        <SectionLabel num="01">Live coverage</SectionLabel>
        <div className="about-stats">
          <Stat value={stats.active} label="Active events" delay={0} />
          <Stat value={stats.today} label="Events today" delay={0.08} />
          <Stat value={stats.countries} label="Countries monitored" delay={0.16} />
          <Stat value={stats.sources} label="Data sources" delay={0.24} />
        </div>
      </section>

      {/* ─── Severity scale showcase ─── */}
      <section className="about-section">
        <SectionLabel num="02">The severity scale</SectionLabel>
        <div className="about-sev">
          {SEVERITY_SCALE.map((sev, i) => (
            <div className="about-sev__step" key={sev.value}>
              <div className="about-sev__bar-zone">
                {reduced ? (
                  <div
                    className="about-sev__bar"
                    style={{ height: `${18 + sev.value * 18}%`, background: sev.color, opacity: 0.85 }}
                  />
                ) : (
                  <motion.div
                    className="about-sev__bar"
                    style={{ background: sev.color, opacity: 0.85 }}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${18 + sev.value * 18}%` }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.7, delay: i * 0.1, ease: EASE }}
                  />
                )}
              </div>
              <div className="about-sev__num" style={{ color: sev.color }}>
                {sev.value}
              </div>
              <div className="about-sev__name">{sev.label}</div>
              <div className="about-sev__desc">{SEV_MEANINGS[sev.value]}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Domain legend ─── */}
      <section className="about-section">
        <SectionLabel num="03">Monitored domains</SectionLabel>
        <div className="about-domains">
          {domains.map((d, i) => (
            <Reveal className="about-domain" key={d.id || d.slug} delay={Math.min(i * 0.05, 0.4)} y={10}>
              <span className="about-domain__dot" style={{ background: d.color || '#6b7280', color: d.color || '#6b7280' }} />
              <span className="about-domain__name">{d.name}</span>
              {d.slug && <span className="about-domain__slug">{d.slug}</span>}
            </Reveal>
          ))}
          {domains.length === 0 && (
            <div className="about-domain">
              <span style={{ color: 'var(--text-muted)', fontSize: 'var(--caption)' }}>Loading domains…</span>
            </div>
          )}
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="about-section">
        <SectionLabel num="04">How it works</SectionLabel>
        <div>
          <Reveal className="about-principle" y={12}>
            <span className="about-principle__num">01</span>
            <span className="about-principle__title">Sources</span>
            <span className="about-principle__text font-longform">
              Our data comes from verified open-source channels — news reports, social media
              monitoring, satellite imagery analysis, and on-the-ground partner networks.
            </span>
          </Reveal>
          <Reveal className="about-principle" delay={0.08} y={12}>
            <span className="about-principle__num">02</span>
            <span className="about-principle__title">Tracking</span>
            <span className="about-principle__text font-longform">
              Events are tracked from initial report through resolution, with timeline updates
              providing context as situations develop. Incidents remain active until marked
              resolved, with a 24-hour grace period for final updates.
            </span>
          </Reveal>
          <Reveal className="about-principle" delay={0.16} y={12}>
            <span className="about-principle__num">03</span>
            <span className="about-principle__title">Scoring</span>
            <span className="about-principle__text font-longform">
              Every incident is tagged with severity, category, location, and timeline updates.
              Severity scores weigh casualties, geographic spread, and geopolitical impact.
            </span>
          </Reveal>
        </div>
      </section>

      {/* ─── Closing CTA ─── */}
      <Reveal className="about-cta" y={14}>
        <Link to="/map" className="about-cta__btn">
          Open the map
          <ArrowUpRight size={15} />
        </Link>
        <span className="about-cta__caption">LIVE 24/7 — NO ACCOUNT NEEDED</span>
      </Reveal>
    </div>
  );
}
