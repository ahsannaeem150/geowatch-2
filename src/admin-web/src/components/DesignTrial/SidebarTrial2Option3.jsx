import React, { useState, useMemo } from 'react';
import {
  INCIDENT, TIMELINE, Icons, ThemeShell, TopBar, IncidentHero,
  Badge, formatDate, formatTime, relativeTime, countEvidence,
  XPostCard, ArticleCard, AdminNoteCard, MediaGrid, Lightbox,
  VERIFICATION,
} from './SidebarTrialShared.jsx';

/* ─── Option 3: Bento Grid per Update ─── */

function BentoCell({ children, colSpan = 1, rowSpan = 1, title, icon }) {
  return (
    <div
      style={{
        gridColumn: colSpan ? `span ${colSpan}` : undefined,
        gridRow: rowSpan ? `span ${rowSpan}` : undefined,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 18,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, border-color 0.2s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {title && (
        <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.06em' }}>
          {icon && <span style={{ marginRight: 5 }}>{icon}</span>}
          {title}
        </div>
      )}
      <div style={{ flex: 1, overflow: 'hidden' }}>{children}</div>
    </div>
  );
}

function BentoEvent({ event, onMediaClick }) {
  const sources = event.sources || {};
  const ver = VERIFICATION[event.verification] || VERIFICATION.unverified;

  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 14, height: 14, borderRadius: '50%', background: event.type === 'report' ? '#818cf8' : '#38bdf8', border: '3px solid var(--bg-primary)', boxShadow: '0 0 0 3px rgba(56,189,248,0.12)' }} />
        <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: event.type === 'report' ? '#818cf8' : '#38bdf8', letterSpacing: '0.06em' }}>{event.type === 'report' ? 'Initial report' : 'Update'}</span>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{formatDate(event.timestamp)} · {formatTime(event.timestamp)}</span>
        <Badge color={ver.color} bg={ver.bg}>{ver.label}</Badge>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <BentoCell colSpan={2} title={event.summary}>
          <p style={{ margin: 0, fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{event.details}</p>
        </BentoCell>

        <BentoCell title="Meta" icon="ℹ️">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Type</span><br />{event.type === 'report' ? 'Initial report' : 'Update'}</div>
            <div><span style={{ color: 'var(--text-muted)' }}>Evidence</span><br />{countEvidence(event)} items</div>
            <div><span style={{ color: 'var(--text-muted)' }}>Time</span><br />{relativeTime(event.timestamp)}</div>
          </div>
        </BentoCell>

        {sources.media?.length > 0 && (
          <BentoCell colSpan={2} rowSpan={2} title={`Media (${sources.media.length})`} icon="📷">
            <MediaGrid items={sources.media} onItemClick={onMediaClick} maxVisible={4} />
          </BentoCell>
        )}

        {sources.x_post?.length > 0 && (
          <BentoCell title={`Posts (${sources.x_post.length})`} icon="𝕏">
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {sources.x_post.slice(0, 2).map((post) => <XPostCard key={post.id} post={post} embed />)}
              {sources.x_post.length > 2 && <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 6 }}>+{sources.x_post.length - 2} more</div>}
            </div>
          </BentoCell>
        )}

        {sources.news_article?.length > 0 && (
          <BentoCell title={`Articles (${sources.news_article.length})`} icon="📰">
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {sources.news_article.map((article) => <ArticleCard key={article.id} article={article} />)}
            </div>
          </BentoCell>
        )}

        {sources.admin_note?.length > 0 && (
          <BentoCell colSpan={sources.media?.length ? 1 : 3} title={`Notes (${sources.admin_note.length})`} icon="📝">
            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              {sources.admin_note.map((note) => <AdminNoteCard key={note.id} note={note} />)}
            </div>
          </BentoCell>
        )}
      </div>
    </div>
  );
}

export default function SidebarTrial2Option3() {
  const [theme, setTheme] = useState('dark');
  const [lightboxItem, setLightboxItem] = useState(null);

  const sorted = useMemo(() => [...TIMELINE].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)), []);

  return (
    <ThemeShell theme={theme}>
      <TopBar title="Option 3 — Bento Grid per Update" theme={theme} setTheme={setTheme} backTo="/sidebarTrial2" />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 60px' }}>
          <IncidentHero incident={INCIDENT} />

          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 22 }}>Story timeline</div>
          {sorted.map((event) => (
            <BentoEvent key={event.id} event={event} onMediaClick={setLightboxItem} />
          ))}
        </div>
      </div>

      {lightboxItem && <Lightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />}
    </ThemeShell>
  );
}
