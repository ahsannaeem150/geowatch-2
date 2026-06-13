import React, { useRef, useState, useMemo } from 'react';
import {
  INCIDENT, TIMELINE, Icons, ThemeShell, TopBar, IncidentHero,
  Badge, Button, formatDate, formatTime, countEvidence,
  XPostCard, ArticleCard, AdminNoteCard, MediaThumb, Lightbox,
  VERIFICATION,
} from './SidebarTrialShared.jsx';

/* ─── Option 4: Horizontal Evidence Decks per Update ─── */

function HorizontalDeck({ title, icon, count, children, itemWidth = 280 }) {
  const ref = useRef(null);

  const scroll = (dir) => {
    if (!ref.current) return;
    ref.current.scrollBy({ left: dir * itemWidth * 1.2, behavior: 'smooth' });
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
          {icon} {title} ({count})
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => scroll(-1)} style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{Icons.chevronLeft}</button>
          <button onClick={() => scroll(1)} style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{Icons.chevronRight}</button>
        </div>
      </div>
      <div
        ref={ref}
        style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', padding: '4px 2px 12px', scrollbarWidth: 'none' }}
      >
        {children}
      </div>
    </div>
  );
}

function Slide({ children, width = 280 }) {
  return (
    <div style={{ flex: '0 0 auto', width, scrollSnapAlign: 'start' }}>
      {children}
    </div>
  );
}

function TimelineEvent({ event, onMediaClick }) {
  const sources = event.sources || {};
  const ver = VERIFICATION[event.verification] || VERIFICATION.unverified;

  return (
    <div style={{ position: 'relative', paddingLeft: 24, marginBottom: 28 }}>
      <div style={{ position: 'absolute', left: 0, top: 8, width: 12, height: 12, borderRadius: '50%', background: event.type === 'report' ? '#818cf8' : '#38bdf8', border: '2px solid var(--bg-primary)' }} />
      <div style={{ position: 'absolute', left: 5, top: 22, bottom: -28, width: 2, background: 'var(--border-subtle)' }} />

      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: event.type === 'report' ? '#818cf8' : '#38bdf8', letterSpacing: '0.06em' }}>{event.type === 'report' ? 'Initial report' : 'Update'}</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{formatDate(event.timestamp)} · {formatTime(event.timestamp)}</span>
          <Badge color={ver.color} bg={ver.bg}>{ver.label}</Badge>
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{event.summary}</h3>
        <p style={{ margin: '0 0 16px', fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{event.details}</p>

        {sources.media?.length > 0 && (
          <HorizontalDeck title="Media" icon="📷" count={sources.media.length} itemWidth={220}>
            {sources.media.map((img) => (
              <Slide key={img.id} width={220}>
                <MediaThumb item={img} onClick={onMediaClick} />
              </Slide>
            ))}
          </HorizontalDeck>
        )}

        {sources.x_post?.length > 0 && (
          <HorizontalDeck title="Posts" icon="𝕏" count={sources.x_post.length} itemWidth={320}>
            {sources.x_post.map((post) => (
              <Slide key={post.id} width={320}>
                <XPostCard post={post} embed />
              </Slide>
            ))}
          </HorizontalDeck>
        )}

        {sources.news_article?.length > 0 && (
          <HorizontalDeck title="Articles" icon="📰" count={sources.news_article.length} itemWidth={320}>
            {sources.news_article.map((article) => (
              <Slide key={article.id} width={320}>
                <ArticleCard article={article} />
              </Slide>
            ))}
          </HorizontalDeck>
        )}

        {sources.admin_note?.length > 0 && (
          <HorizontalDeck title="Notes" icon="📝" count={sources.admin_note.length} itemWidth={320}>
            {sources.admin_note.map((note) => (
              <Slide key={note.id} width={320}>
                <AdminNoteCard note={note} />
              </Slide>
            ))}
          </HorizontalDeck>
        )}
      </div>
    </div>
  );
}

export default function SidebarTrial2Option4() {
  const [theme, setTheme] = useState('dark');
  const [lightboxItem, setLightboxItem] = useState(null);

  const sorted = useMemo(() => [...TIMELINE].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)), []);

  return (
    <ThemeShell theme={theme}>
      <TopBar title="Option 4 — Horizontal Evidence Decks" theme={theme} setTheme={setTheme} backTo="/sidebarTrial2" />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 60px' }}>
          <IncidentHero incident={INCIDENT} />

          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 22 }}>Story timeline</div>
          {sorted.map((event) => (
            <TimelineEvent key={event.id} event={event} onMediaClick={setLightboxItem} />
          ))}
        </div>
      </div>

      {lightboxItem && <Lightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />}
    </ThemeShell>
  );
}
