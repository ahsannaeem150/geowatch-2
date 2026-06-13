import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  INCIDENT, TIMELINE, Icons, ThemeShell, TopBar,
  Badge, formatDate, formatTime, countEvidence,
  XPostCarousel, ArticleCard, AdminNoteCard, MediaGrid, Lightbox,
  VERIFICATION, SEVERITY_LABELS,
} from './SidebarTrialShared.jsx';
import './SidebarTrial2Option1.css';

/* ─── Option 1: Sticky Evidence Rail — Awwwards-level polish ─── */

function Hero({ incident, heroImage }) {
  const sev = SEVERITY_LABELS[incident.severity] || SEVERITY_LABELS[3];
  const ver = VERIFICATION[incident.verification] || VERIFICATION.unverified;

  return (
    <div className="opt1-hero">
      <div
        className="opt1-hero-bg"
        style={{ backgroundImage: `url(${heroImage?.url || 'https://picsum.photos/seed/hero/1600/700'})` }}
      />
      <div className="opt1-hero-overlay" />
      <div className="opt1-hero-content">
        <div className="opt1-hero-meta">
          <span className="opt1-hero-meta-item"><span className="opt1-live-dot" /> {incident.status}</span>
          <span className="opt1-hero-meta-item">{sev.label}</span>
          <span className="opt1-hero-meta-item" style={{ color: ver.color }}>{ver.label}</span>
          <span className="opt1-hero-meta-item">{Icons.mapPin} {incident.location}</span>
          <span className="opt1-hero-meta-item">{Icons.calendar} {formatDate(incident.startDate)}</span>
          <span className="opt1-hero-meta-item">{Icons.hash} {incident.category}</span>
        </div>
        <h1 className="opt1-hero-title">{incident.title}</h1>
        <p className="opt1-hero-desc">{incident.description}</p>
      </div>
    </div>
  );
}

function EvidenceRail({ event, onMediaClick, onPrev, onNext, hasPrev, hasNext }) {
  if (!event) return null;
  const sources = event.sources || {};
  const ver = VERIFICATION[event.verification] || VERIFICATION.unverified;

  return (
    <div className="opt1-rail">
      <div className="opt1-rail-card opt1-rail-card--enter" key={event.id}>
        <div className="opt1-rail-header">
          <div>
            <div className="opt1-rail-title">{event.summary}</div>
            <div className="opt1-rail-sub">{formatDate(event.timestamp)} · {formatTime(event.timestamp)} · {countEvidence(event)} evidence items</div>
          </div>
          <Badge color={ver.color} bg={ver.bg}>{ver.label}</Badge>
        </div>

        <div className="opt1-bento">
          {sources.media?.length > 0 && (
            <div className="opt1-bento-cell opt1-bento-cell--wide">
              <div className="opt1-bento-label">📷 Media ({sources.media.length})</div>
              <MediaGrid items={sources.media} onItemClick={onMediaClick} maxVisible={4} />
            </div>
          )}

          {sources.x_post?.length > 0 && (
            <div className="opt1-bento-cell opt1-bento-cell--wide">
              <div className="opt1-bento-label">𝕏 Posts ({sources.x_post.length})</div>
              <XPostCarousel posts={sources.x_post} />
            </div>
          )}

          {sources.news_article?.length > 0 && (
            <div className="opt1-bento-cell opt1-bento-cell--wide">
              <div className="opt1-bento-label">📰 Articles ({sources.news_article.length})</div>
              <div className="opt1-bento-scroll">
                {sources.news_article.map((article) => <ArticleCard key={article.id} article={article} />)}
              </div>
            </div>
          )}

          {sources.admin_note?.length > 0 && (
            <div className="opt1-bento-cell opt1-bento-cell--wide">
              <div className="opt1-bento-label">📝 Notes ({sources.admin_note.length})</div>
              <div className="opt1-bento-scroll">
                {sources.admin_note.map((note) => <AdminNoteCard key={note.id} note={note} />)}
              </div>
            </div>
          )}
        </div>

        <div className="opt1-rail-nav">
          <button onClick={onPrev} disabled={!hasPrev}>{Icons.chevronLeft} Prev</button>
          <button onClick={onNext} disabled={!hasNext}>Next {Icons.chevronRight}</button>
        </div>
      </div>
    </div>
  );
}

export default function SidebarTrial2Option1() {
  const [theme, setTheme] = useState('dark');
  const [activeId, setActiveId] = useState(TIMELINE[0].id);
  const [lightboxItem, setLightboxItem] = useState(null);
  const [progress, setProgress] = useState(0);
  const [lineProgress, setLineProgress] = useState(0);
  const itemRefs = useRef({});
  const timelineRef = useRef(null);

  const sorted = useMemo(() => [...TIMELINE].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)), []);
  const activeIndex = useMemo(() => sorted.findIndex((e) => e.id === activeId), [sorted, activeId]);
  const activeEvent = sorted[activeIndex] || sorted[0];
  const DEFAULT_HERO_IMAGE = 'https://images.unsplash.com/photo-1562742382-d2a5c01dff21?auto=format&fit=crop&w=1600&q=80';

  // Scroll progress bars (active event is only changed by explicit interaction)
  // Use the natural page/window scroll so the progress line matches the screen scrollbar.
  useEffect(() => {
    const computePageProgress = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) * 100 : 0;
    };

    const computeLineProgress = () => {
      if (!timelineRef.current) return computePageProgress();
      const targetY = window.innerHeight * 0.35;

      let lineIdx = 0;
      sorted.forEach((event, idx) => {
        const eventEl = itemRefs.current[event.id];
        if (!eventEl) return;
        const eventTop = eventEl.getBoundingClientRect().top;
        if (eventTop <= targetY) lineIdx = idx;
      });

      const lineEl = itemRefs.current[sorted[lineIdx].id];
      const nextEvent = sorted[lineIdx + 1];
      const nextEl = nextEvent ? itemRefs.current[nextEvent.id] : null;
      let fraction = 0;
      if (lineEl && nextEl) {
        const lineTop = lineEl.getBoundingClientRect().top;
        const nextTop = nextEl.getBoundingClientRect().top;
        const span = nextTop - lineTop;
        fraction = span > 0 ? Math.max(0, Math.min(1, (targetY - lineTop) / span)) : 0;
      }
      const total = Math.max(1, sorted.length - 1);
      const eventProgress = ((lineIdx + fraction) / total) * 100;
      // Clamp to the actual page scroll so the line always reaches the bottom
      // when the user has scrolled to the end of the page.
      return Math.max(eventProgress, computePageProgress());
    };

    const onScroll = () => {
      const pageProgress = computePageProgress();
      setProgress(pageProgress);
      setLineProgress(computeLineProgress());
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [sorted]);

  // Keyboard nav
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        goTo(Math.min(sorted.length - 1, activeIndex + 1));
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        goTo(Math.max(0, activeIndex - 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIndex, sorted.length]);

  const goTo = (idx) => {
    const event = sorted[idx];
    if (!event) return;
    setActiveId(event.id);

    const el = itemRefs.current[event.id];
    if (!el) return;

    const targetOffset = window.innerHeight * 0.35;
    const desiredScrollTop = window.scrollY + el.getBoundingClientRect().top - targetOffset;

    window.scrollTo({ top: desiredScrollTop, behavior: 'smooth' });
  };

  return (
    <ThemeShell theme={theme} scrollable>
      <div className="option1-root" data-theme={theme}>
        <TopBar className="opt1-topbar" title="Option 1 — Sticky Evidence Rail" theme={theme} setTheme={setTheme} backTo="/sidebarTrial2" />

        <div className="opt1-progress-bar" style={{ width: `${progress}%` }} />

        <main className="opt1-main">
          <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 24px 80px' }}>
            <Hero incident={INCIDENT} heroImage={{ url: DEFAULT_HERO_IMAGE }} />

            <div className="opt1-section-title">Story timeline</div>
            <div className="opt1-grid">
              {/* Left: timeline */}
              <div className="opt1-timeline" ref={timelineRef}>
                <div className="opt1-timeline-track">
                  <div className="opt1-timeline-progress" style={{ height: `${lineProgress}%` }} />
                </div>

                {sorted.map((event, idx) => {
                  const ver = VERIFICATION[event.verification] || VERIFICATION.unverified;
                  const isActive = activeId === event.id;
                  const typeColor = event.type === 'report' ? '#818cf8' : '#38bdf8';
                  return (
                    <div
                      key={event.id}
                      ref={(el) => (itemRefs.current[event.id] = el)}
                      data-id={event.id}
                      onClick={() => goTo(idx)}
                      className={`opt1-event ${isActive ? 'opt1-event--active' : ''}`}
                      style={{ animationDelay: `${idx * 80}ms` }}
                    >
                      <div className="opt1-event-dot" />
                      <div className="opt1-event-type" style={{ color: typeColor }}>{event.type === 'report' ? 'Initial report' : 'Update'}</div>
                      <div className="opt1-event-head">
                        <span className="opt1-event-date">{formatDate(event.timestamp)} · {formatTime(event.timestamp)}</span>
                        <Badge color={ver.color} bg={ver.bg}>{ver.label}</Badge>
                      </div>
                      <h3 className="opt1-event-title">{event.summary}</h3>
                      <p className="opt1-event-desc">{event.details}</p>
                      <div className="opt1-event-footer">
                        <span>{countEvidence(event)} evidence items</span>
                        <span style={{ color: 'var(--accent-light)' }}>→</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right: sticky evidence rail */}
              <EvidenceRail
                event={activeEvent}
                onMediaClick={setLightboxItem}
                onPrev={() => goTo(activeIndex - 1)}
                onNext={() => goTo(activeIndex + 1)}
                hasPrev={activeIndex > 0}
                hasNext={activeIndex < sorted.length - 1}
              />
            </div>
          </div>
        </main>

        {lightboxItem && <Lightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />}
      </div>
    </ThemeShell>
  );
}
