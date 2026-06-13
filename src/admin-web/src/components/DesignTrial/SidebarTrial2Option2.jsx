import React, { useRef, useState, useMemo } from 'react';
import {
  INCIDENT, TIMELINE, Icons, ThemeShell, TopBar, IncidentHero,
  Badge, formatDate, formatTime, relativeTime, countEvidence,
  XPostCard, ArticleCard, AdminNoteCard, MediaGrid, Lightbox,
  VERIFICATION,
} from './SidebarTrialShared.jsx';

/* ─── Option 2: Horizontal Timeline ─── */

function TimelineCard({ event, isActive, onMediaClick }) {
  const sources = event.sources || {};
  const ver = VERIFICATION[event.verification] || VERIFICATION.unverified;

  return (
    <div
      style={{
        flex: '0 0 auto',
        width: '72vw',
        maxWidth: 920,
        minWidth: 320,
        marginRight: 24,
        scrollSnapAlign: 'center',
        background: 'var(--bg-elevated)',
        border: isActive ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
        borderRadius: 24,
        padding: 26,
        opacity: isActive ? 1 : 0.55,
        transform: isActive ? 'scale(1)' : 'scale(0.96)',
        transition: 'opacity 0.3s, transform 0.3s, border-color 0.3s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: event.type === 'report' ? '#818cf8' : '#38bdf8', letterSpacing: '0.06em' }}>{event.type === 'report' ? 'Initial report' : 'Update'}</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{formatDate(event.timestamp)} · {formatTime(event.timestamp)}</span>
          <Badge color={ver.color} bg={ver.bg}>{ver.label}</Badge>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{countEvidence(event)} items</div>
      </div>

      <h3 style={{ margin: '0 0 10px', fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>{event.summary}</h3>
      <p style={{ margin: '0 0 18px', fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{event.details}</p>

      {/* Evidence bento inside card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {sources.media?.length > 0 && (
          <div style={{ gridColumn: '1 / 3' }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.05em' }}>📷 Media</div>
            <MediaGrid items={sources.media} onItemClick={onMediaClick} maxVisible={4} />
          </div>
        )}
        {sources.x_post?.length > 0 && (
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.05em' }}>𝕏 Posts</div>
            {sources.x_post.slice(0, 2).map((post) => <XPostCard key={post.id} post={post} embed />)}
            {sources.x_post.length > 2 && <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 8 }}>+{sources.x_post.length - 2} more posts</div>}
          </div>
        )}
        {sources.news_article?.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.05em' }}>📰 Articles</div>
            {sources.news_article.map((article) => <ArticleCard key={article.id} article={article} />)}
          </div>
        )}
        {sources.admin_note?.length > 0 && (
          <div style={{ gridColumn: '1 / 3' }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.05em' }}>📝 Notes</div>
            {sources.admin_note.map((note) => <AdminNoteCard key={note.id} note={note} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SidebarTrial2Option2() {
  const [theme, setTheme] = useState('dark');
  const [lightboxItem, setLightboxItem] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef(null);

  const sorted = useMemo(() => [...TIMELINE].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)), []);

  const scrollTo = (idx) => {
    if (!scrollRef.current) return;
    const card = scrollRef.current.children[idx];
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      setActiveIndex(idx);
    }
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const center = container.scrollLeft + container.clientWidth / 2;
    let closest = 0;
    let minDist = Infinity;
    Array.from(container.children).forEach((child, idx) => {
      const childCenter = child.offsetLeft + child.clientWidth / 2;
      const dist = Math.abs(center - childCenter);
      if (dist < minDist) { minDist = dist; closest = idx; }
    });
    setActiveIndex(closest);
  };

  return (
    <ThemeShell theme={theme}>
      <TopBar title="Option 2 — Horizontal Timeline" theme={theme} setTheme={setTheme} backTo="/sidebarTrial2" />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px 60px' }}>
          <IncidentHero incident={INCIDENT} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Story timeline</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => scrollTo(Math.max(0, activeIndex - 1))} style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{Icons.chevronLeft}</button>
              <button onClick={() => scrollTo(Math.min(sorted.length - 1, activeIndex + 1))} style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{Icons.chevronRight}</button>
            </div>
          </div>

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', padding: '20px 0 40px', scrollbarWidth: 'none' }}
          >
            {sorted.map((event, idx) => (
              <TimelineCard key={event.id} event={event} isActive={idx === activeIndex} onMediaClick={setLightboxItem} />
            ))}
          </div>

          {/* Time markers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: -20, padding: '0 10vw' }}>
            <div style={{ flex: 1, height: 2, background: 'var(--border-subtle)', position: 'relative' }}>
              {sorted.map((event, idx) => {
                const left = sorted.length > 1 ? `${(idx / (sorted.length - 1)) * 100}%` : '0%';
                return (
                  <button
                    key={event.id}
                    onClick={() => scrollTo(idx)}
                    style={{ position: 'absolute', left, top: -5, transform: 'translateX(-50%)', width: 12, height: 12, borderRadius: '50%', border: 'none', background: idx === activeIndex ? 'var(--accent-light)' : 'var(--text-muted)', cursor: 'pointer' }}
                    title={event.summary}
                  />
                );
              })}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10, fontSize: 13, color: 'var(--text-muted)' }}>
            {formatDate(sorted[activeIndex].timestamp)} — {sorted[activeIndex].summary}
          </div>
        </div>
      </div>

      {lightboxItem && <Lightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />}
    </ThemeShell>
  );
}
