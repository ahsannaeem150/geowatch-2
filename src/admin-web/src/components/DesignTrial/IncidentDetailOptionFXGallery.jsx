import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './IncidentDetailTrial.css';
import {
  INCIDENT,
  TIMELINE,
  Icons,
  SummaryCard,
  TimelineItem,
  UpdateHeader,
  EvidencePreview,
  EvidenceBundle,
  VerificationBadge,
  Lightbox,
  XEmbed,
  Carousel,
  MediaThumb,
  ArticleCard,
  AdminNoteCard,
  formatTime,
  relativeTime,
  countSources,
  sourceCounts,
  SOURCE_TYPE_LABELS,
  SOURCE_TYPE_ICONS,
} from './IncidentDetailTrialCommon.jsx';

/* ─────────────────────────────────────────────────────────────────────────────
   Final incident-detail sidebar.
   - Matches the full incident-page structure: Initial Report, then Updates.
   - Main sidebar and evidence drawer are both 630px (user-web width).
   - Media lightbox with keyboard arrow navigation.
   - Drawer media + X-post carousels with keyboard arrow navigation.
   - Whole update card opens the drawer; media previews open the lightbox.
   - Full details / title link to /dashboard?incident=<id>.
   ───────────────────────────────────────────────────────────────────────────── */

export default function IncidentDetailOptionFXGallery() {
  const navigate = useNavigate();
  const [drawerEvent, setDrawerEvent] = useState(null);
  const [drawerTab, setDrawerTab] = useState('all');
  const [lightbox, setLightbox] = useState(null);
  const [copied, setCopied] = useState(false);

  const goFullDetails = () => navigate(`/dashboard?incident=${INCIDENT.id}`);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/dashboard?incident=${INCIDENT.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const openDrawer = (event, startingTab = 'all') => {
    setDrawerEvent(event);
    setDrawerTab(startingTab);
  };

  const closeDrawer = () => setDrawerEvent(null);

  const openLightbox = (items, startIndex = 0) => {
    setLightbox({ items, startIndex });
  };

  const closeLightbox = () => setLightbox(null);

  useEffect(() => {
    if (!drawerEvent || lightbox) return;
    const onKey = (e) => {
      if (e.key === 'Escape') closeDrawer();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerEvent, lightbox]);

  const initialReport = TIMELINE[0];
  const updates = TIMELINE.slice(1);

  return (
    <div className="id-trial-page">
      <div className="id-fake-map">
        <div className="id-fake-map-grid" />
        <div className="id-fake-map-markers">
          <span style={{ left: '24%', top: '34%' }} />
          <span style={{ left: '42%', top: '28%' }} />
          <span style={{ left: '54%', top: '46%' }} />
          <span style={{ left: '66%', top: '30%' }} />
          <span style={{ left: '44%', top: '62%' }} />
          <span style={{ left: '72%', top: '58%' }} />
        </div>
        <div className="id-fake-map-label">Selected incident</div>
      </div>

      <aside className="id-sidebar">
        <div className="id-sidebar__scroll">
          <SummaryCard incident={INCIDENT} onTitleClick={goFullDetails}>
            <div className="id-summary__actions">
              <button className="id-btn-primary" onClick={goFullDetails}>
                {Icons.external} Full details
              </button>
              <button className="id-btn" onClick={handleCopyLink}>
                {copied ? 'Copied!' : 'Copy incident link'}
              </button>
            </div>
          </SummaryCard>
          <div className="id-section-title">
            Initial Report
            <span>{formatTime(initialReport.timestamp)}</span>
          </div>

          <TimelineItem event={initialReport} index={0} total={TIMELINE.length}>
            <InitialReportCard
              event={initialReport}
              onOpenDrawer={openDrawer}
              onOpenLightbox={openLightbox}
            />
          </TimelineItem>

          <div className="id-section-title">Updates</div>
          {updates.map((event, idx) => (
            <TimelineItem key={event.id} event={event} index={idx + 1} total={TIMELINE.length}>
              <UpdateCard
                event={event}
                onOpenDrawer={openDrawer}
                onOpenLightbox={openLightbox}
              />
            </TimelineItem>
          ))}

          <div style={{ height: 40 }} />
        </div>
      </aside>

      {drawerEvent && (
        <>
          <div className="id-drawer-overlay" onClick={closeDrawer} />
          <div className="id-drawer">
            <div className="id-drawer__header">
              <div>
                <h3 className="id-drawer__title">{drawerEvent.summary}</h3>
                <div className="id-drawer__meta">
                  {formatTime(drawerEvent.timestamp)} · {relativeTime(drawerEvent.timestamp)}
                </div>
              </div>
              <button className="id-drawer__close" onClick={closeDrawer} aria-label="Close">
                ×
              </button>
            </div>

            <div className="id-drawer__body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <VerificationBadge status={drawerEvent.verification} />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    color: drawerEvent.type === 'report' ? 'var(--accent-light)' : 'var(--text-muted)',
                  }}
                >
                  {drawerEvent.type === 'report' ? 'Initial report' : 'Update'}
                </span>
              </div>

              <p
                style={{
                  fontSize: 14,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.7,
                  margin: '0 0 22px',
                }}
              >
                {drawerEvent.details}
              </p>

              {countSources(drawerEvent.sources) > 0 ? (
                <EvidenceBundleXGallery
                  event={drawerEvent}
                  activeTab={drawerTab}
                  onTabChange={setDrawerTab}
                  onMediaClick={openLightbox}
                />
              ) : (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  No evidence attached to this update.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {lightbox && (
        <Lightbox items={lightbox.items} startIndex={lightbox.startIndex} onClose={closeLightbox} />
      )}
    </div>
  );
}

function InitialReportCard({ event, onOpenDrawer, onOpenLightbox }) {
  return (
    <div className="id-latest" onClick={() => onOpenDrawer(event, 'all')}>
      <UpdateHeader event={event} />
      <h3 className="id-update-card__title">{event.summary}</h3>
      <p className="id-update-card__text">{event.details}</p>
      <EvidencePreview sources={event.sources} onMediaClick={onOpenLightbox} onOpenDrawer={() => onOpenDrawer(event, 'all')} />
    </div>
  );
}

function UpdateCard({ event, onOpenDrawer, onOpenLightbox }) {
  return (
    <div className="id-update-card" onClick={() => onOpenDrawer(event, 'all')}>
      <div className="id-update-card__body">
        <UpdateHeader event={event} />
        <h3 className="id-update-card__title">{event.summary}</h3>
        <p className="id-update-card__text">
          {event.details.length > 130 ? event.details.slice(0, 130) + '…' : event.details}
        </p>
        <EvidencePreview sources={event.sources} onMediaClick={onOpenLightbox} onOpenDrawer={() => onOpenDrawer(event, 'all')} />
      </div>
    </div>
  );
}

/* ─── Tweet deck: one embedded tweet at a time + thumbnail strip ─── */
function XPostDeck({ posts }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const activePost = posts[activeIndex];

  const goNext = useCallback(() => {
    setActiveIndex((i) => (i + 1) % posts.length);
  }, [posts.length]);

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i - 1 + posts.length) % posts.length);
  }, [posts.length]);

  useEffect(() => {
    if (!hovered) return;
    const onKey = (e) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [hovered, goNext, goPrev]);

  if (!posts?.length) return null;

  return (
    <div className="id-x-deck" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className="id-x-deck__stage">
        <XEmbed key={activePost.id} post={activePost} />

        {posts.length > 1 && (
          <>
            <button className="id-x-deck__nav id-x-deck__nav--prev" onClick={goPrev} aria-label="Previous">
              {Icons.chevronLeft}
            </button>
            <button className="id-x-deck__nav id-x-deck__nav--next" onClick={goNext} aria-label="Next">
              {Icons.chevronRight}
            </button>
            <div className="id-x-deck__counter">
              {activeIndex + 1} / {posts.length}
            </div>
          </>
        )}
      </div>

      {posts.length > 1 && (
        <div className="id-x-deck__thumbs">
          {posts.map((post, idx) => (
            <button
              key={post.id}
              className={`id-x-deck__thumb ${idx === activeIndex ? 'active' : ''}`}
              onClick={() => setActiveIndex(idx)}
              title={`${post.author} — ${post.text}`}
            >
              <img src={post.authorAvatar} alt={post.author} className="id-x-deck__thumb-avatar" />
              <span className="id-x-deck__thumb-text">
                <span className="id-x-deck__thumb-name">{post.author}</span>
                <span className="id-x-deck__thumb-handle">{post.handle}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Evidence bundle that uses the tweet deck for X posts ─── */
function EvidenceBundleXGallery({ event, activeTab, onTabChange, onMediaClick }) {
  const sources = event.sources || {};
  const counts = sourceCounts(sources);

  const tabs = [
    { key: 'all', label: `All (${countSources(sources)})` },
    { key: 'media', label: `${SOURCE_TYPE_ICONS.media} Media (${counts.media})` },
    { key: 'x_post', label: `${SOURCE_TYPE_ICONS.x_post} Posts (${counts.x_post})` },
    { key: 'news_article', label: `${SOURCE_TYPE_ICONS.news_article} Articles (${counts.news_article})` },
    { key: 'admin_note', label: `${SOURCE_TYPE_ICONS.admin_note} Notes (${counts.admin_note})` },
  ].filter((t) => {
    if (t.key === 'all') return countSources(sources) > 0;
    return counts[t.key] > 0;
  });

  const renderSection = (type, title) => {
    const items = sources[type];
    if (!items?.length) return null;
    return (
      <div className="id-evidence-section" key={type}>
        <div className="id-evidence-section__title">
          {SOURCE_TYPE_ICONS[type]} {title} ({items.length})
        </div>
        {type === 'media' ? (
          <Carousel
            items={items}
            itemWidth={300}
            gap={12}
            renderItem={(item) => (
              <MediaThumb
                item={item}
                onClick={() => onMediaClick?.(items, items.indexOf(item))}
                carousel
              />
            )}
          />
        ) : type === 'x_post' ? (
          <XPostDeck posts={items} />
        ) : type === 'news_article' ? (
          items.map((item) => <ArticleCard key={item.id} article={item} />)
        ) : (
          items.map((item) => <AdminNoteCard key={item.id} note={item} />)
        )}
      </div>
    );
  };

  return (
    <div>
      {tabs.length > 1 && (
        <div className="id-evidence-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`id-evidence-tab ${activeTab === tab.key ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'all' && (
        <>
          {counts.media > 0 && renderSection('media', SOURCE_TYPE_LABELS.media)}
          {counts.x_post > 0 && renderSection('x_post', SOURCE_TYPE_LABELS.x_post)}
          {counts.news_article > 0 && renderSection('news_article', SOURCE_TYPE_LABELS.news_article)}
          {counts.admin_note > 0 && renderSection('admin_note', SOURCE_TYPE_LABELS.admin_note)}
        </>
      )}
      {activeTab === 'media' && renderSection('media', SOURCE_TYPE_LABELS.media)}
      {activeTab === 'x_post' && renderSection('x_post', SOURCE_TYPE_LABELS.x_post)}
      {activeTab === 'news_article' && renderSection('news_article', SOURCE_TYPE_LABELS.news_article)}
      {activeTab === 'admin_note' && renderSection('admin_note', SOURCE_TYPE_LABELS.admin_note)}
    </div>
  );
}
