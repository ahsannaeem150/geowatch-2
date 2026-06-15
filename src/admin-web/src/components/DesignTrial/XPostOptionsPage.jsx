import React, { useState, useCallback, useEffect } from 'react';
import './IncidentDetailTrial.css';
import './XPostOptionsPage.css';
import { XEmbed, Icons, relativeTime } from './IncidentDetailTrialCommon.jsx';

/* ─────────────────────────────────────────────────────────────────────────────
   X-post design option explorer.
   Only two candidates remain, each rendered at the real sidebar width (630 px)
   so we can compare them 1:1 before deciding which one to ship.
   Route: /xPostOptions
   ───────────────────────────────────────────────────────────────────────────── */

const POSTS = [
  {
    id: 'p1',
    author: 'Aviation Spotter',
    handle: '@aviationspotter',
    text: 'AN-32 crash reported at Jorhat. Rescue teams moving in.',
    tweetUrl: 'https://x.com/Twitter/status/20',
    authorAvatar: 'https://picsum.photos/seed/avspot/120/120',
    timestamp: '2026-06-13T17:05:00Z',
    archived: true,
    archivedAt: '2026-06-14T00:00:00Z',
    archiveUrl: '/archive/p1.png',
  },
  {
    id: 'p2',
    author: 'IAF MCC',
    handle: '@IAF_MCC',
    text: 'An Indian Air Force (IAF) AN-32 aircraft met with an accident today at Air Force Station Jorhat, Assam. Rescue operations have been launched. More details awaited.',
    tweetUrl: 'https://x.com/IAF_MCC/status/2065719865890205976',
    authorAvatar: 'https://picsum.photos/seed/iafmcc/120/120',
    timestamp: '2026-06-13T17:12:00Z',
    archivedAt: '2026-06-14T00:00:00Z',
    archiveUrl: '/archive/p2.png',
  },
  {
    id: 'p3',
    author: 'Rescue Watch',
    handle: '@rescue_watch',
    text: 'NDRF and IAF rescue personnel now on site. Weather slowing extraction.',
    tweetUrl: 'https://x.com/Twitter/status/20',
    authorAvatar: 'https://picsum.photos/seed/rescue/120/120',
    timestamp: '2026-06-13T19:35:00Z',
    archivedAt: '2026-06-14T00:00:00Z',
    archiveUrl: '/archive/p3.png',
  },
  {
    id: 'p4',
    author: 'Indian Air Force',
    handle: '@airforce_in',
    text: 'With deep regret, IAF confirms 5 personnel have lost their lives in the AN-32 crash at Jorhat. Rescue ops continue.',
    tweetUrl: 'https://x.com/Twitter/status/20',
    authorAvatar: 'https://picsum.photos/seed/iaf/120/120',
    timestamp: '2026-06-13T21:05:00Z',
    archivedAt: '2026-06-14T00:00:00Z',
    archiveUrl: '/archive/p4.png',
  },
  {
    id: 'p5',
    author: 'Defence Pro',
    handle: '@defencepro',
    text: 'Five bodies recovered from AN-32 wreckage. Identification process underway.',
    tweetUrl: 'https://x.com/Twitter/status/20',
    authorAvatar: 'https://picsum.photos/seed/defpro/120/120',
    timestamp: '2026-06-13T21:40:00Z',
    archivedAt: '2026-06-14T00:00:00Z',
    archiveUrl: '/archive/p5.png',
  },
  {
    id: 'p6',
    author: 'Rahul Reporter',
    handle: '@rahul_reporter',
    text: 'Families of the crew have been informed. Station medical officer issued formal confirmation.',
    tweetUrl: 'https://x.com/Twitter/status/20',
    authorAvatar: 'https://picsum.photos/seed/rahul/120/120',
    timestamp: '2026-06-13T22:10:00Z',
    archivedAt: '2026-06-14T00:00:00Z',
    archiveUrl: '/archive/p6.png',
  },
];

export default function XPostOptionsPage() {
  return (
    <div className="xpo-page">
      <div className="xpo-header">
        <h1 className="xpo-header__title">X / Twitter post display options</h1>
        <p className="xpo-header__desc">
          Both options are rendered at the real 630 px sidebar width so you can compare them 1:1.
        </p>
      </div>

      <div className="xpo-grid">
        <OptionCard title="Option 1 — Single active embed + thumbnail strip">
          <TweetDeck posts={POSTS} />
        </OptionCard>

        <OptionCard title="Option 2 — Compact list, click to expand (paginated)">
          <CompactList posts={POSTS} pageSize={3} />
        </OptionCard>
      </div>
    </div>
  );
}

function OptionCard({ title, children }) {
  return (
    <div className="xpo-card">
      <div className="xpo-card__title">{title}</div>
      <div className="xpo-card__body">{children}</div>
    </div>
  );
}

/* ─── Option 1: Tweet deck ─── */
function TweetDeck({ posts }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [rendered, setRendered] = useState(new Set([0]));
  const activePost = posts[activeIndex];

  const goNext = useCallback(() => {
    setActiveIndex((i) => (i + 1) % posts.length);
  }, [posts.length]);

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i - 1 + posts.length) % posts.length);
  }, [posts.length]);

  useEffect(() => {
    setRendered((prev) => new Set(prev).add(activeIndex));
  }, [activeIndex]);

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

  return (
    <div className="xpo-deck" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className="xpo-deck__stage">
        {posts.map((post, idx) =>
          rendered.has(idx) ? (
            <div
              key={post.id}
              className="xpo-deck__slide"
              style={{ display: idx === activeIndex ? 'block' : 'none' }}
            >
              <XEmbed post={post} />
            </div>
          ) : null
        )}
      </div>

      {posts.length > 1 && (
        <>
          <div className="xpo-deck__toolbar">
            <button className="xpo-deck__nav" onClick={goPrev} aria-label="Previous">
              {Icons.chevronLeft}
            </button>
            <span className="xpo-deck__counter">
              {activeIndex + 1} / {posts.length}
            </span>
            <button className="xpo-deck__nav" onClick={goNext} aria-label="Next">
              {Icons.chevronRight}
            </button>
          </div>

          <div className="xpo-deck__thumbs">
            {posts.map((post, idx) => (
              <button
                key={post.id}
                className={`xpo-deck__thumb ${idx === activeIndex ? 'active' : ''}`}
                onClick={() => setActiveIndex(idx)}
                title={`${post.author} — ${post.handle}`}
              >
                <img src={post.authorAvatar} alt={post.author} className="xpo-deck__thumb-avatar" />
                <span className="xpo-deck__thumb-text">
                  <span className="xpo-deck__thumb-name">{post.author}</span>
                  <span className="xpo-deck__thumb-handle">{post.handle}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Option 2: Compact paginated list ─── */
function CompactList({ posts, pageSize = 5 }) {
  const [openIds, setOpenIds] = useState(new Set());
  const [renderedIds, setRenderedIds] = useState(new Set());
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [page, setPage] = useState(1);

  const filtered = posts.filter(
    (p) =>
      p.author.toLowerCase().includes(query.toLowerCase()) ||
      p.handle.toLowerCase().includes(query.toLowerCase()) ||
      p.text.toLowerCase().includes(query.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagePosts = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const allPageOpen = pagePosts.length > 0 && pagePosts.every((p) => openIds.has(p.id));

  useEffect(() => {
    setPage(1);
    setOpenIds(new Set());
  }, [query]);

  useEffect(() => {
    setRenderedIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      openIds.forEach((id) => {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [openIds]);

  const toggle = (id) => {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openAll = () => {
    const ids = pagePosts.map((p) => p.id);
    setOpenIds(new Set(ids));
    setRenderedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const collapseAll = () => setOpenIds(new Set());

  const copyLink = async (post) => {
    try {
      await navigator.clipboard.writeText(post.tweetUrl);
      setCopiedId(post.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="xpo-compact">
      <div className="xpo-compact__toolbar">
        <input
          type="text"
          className="xpo-compact__search"
          placeholder="Search posts…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {pagePosts.length > 0 && (
          <>
            <button
              className="xpo-compact__collapse"
              onClick={openAll}
              disabled={allPageOpen}
            >
              Open all
            </button>
            <button
              className="xpo-compact__collapse"
              onClick={collapseAll}
              disabled={openIds.size === 0}
            >
              Collapse all
            </button>
          </>
        )}
      </div>

      <div className="xpo-compact__list">
        {pagePosts.map((post) => {
          const isOpen = openIds.has(post.id);

          return (
            <div key={post.id} className={`xpo-compact__item ${isOpen ? 'open' : ''}`}>
              <button className="xpo-compact__summary" onClick={() => toggle(post.id)}>
                <img src={post.authorAvatar} alt={post.author} className="xpo-compact__avatar" loading="lazy" />
                <span className="xpo-compact__main">
                  <span className="xpo-compact__top">
                    <span className="xpo-compact__author-line">
                      <span className="xpo-compact__name">{post.author}</span>
                      <span className="xpo-compact__handle">{post.handle}</span>
                    </span>
                    <span className="xpo-compact__time">{relativeTime(post.timestamp)}</span>
                    <span className="xpo-compact__chevron">{isOpen ? '▲' : '▼'}</span>
                  </span>
                </span>
              </button>

              {isOpen && (
                <div className="xpo-compact__embed">
                  {post.archived ? (
                    <ArchivedPost post={post} />
                  ) : renderedIds.has(post.id) ? (
                    <XEmbed post={post} />
                  ) : null}
                  <div className="xpo-compact__actions">
                    <a
                      className="xpo-compact__action"
                      href={post.tweetUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {Icons.external} {post.archived ? 'Try original' : 'Open on X'}
                    </a>
                    <button className="xpo-compact__action" onClick={() => copyLink(post)}>
                      {Icons.link} {copiedId === post.id ? 'Copied!' : 'Copy link'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="xpo-compact__empty">No posts match “{query}”</div>
      )}

      {totalPages > 1 && (
        <div className="xpo-compact__pagination">
          <button
            className="xpo-compact__page-btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
          >
            Previous
          </button>
          <span className="xpo-compact__page-info">
            {safePage} / {totalPages}
          </span>
          <button
            className="xpo-compact__page-btn"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Archived tweet fallback (screenshot + metadata) ─── */
function ArchivedPost({ post }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className="xpo-archive">
        <div className="xpo-archive__badge">Archived</div>
        <button
          className="xpo-archive__img-btn"
          onClick={() => setExpanded(true)}
          aria-label="View archived screenshot"
        >
          <img
            src={post.archiveUrl}
            alt={`Archived post by ${post.author}`}
            className="xpo-archive__img"
            loading="lazy"
          />
        </button>
      </div>

      {expanded && (
        <div className="xpo-lightbox" onClick={() => setExpanded(false)}>
          <button
            className="xpo-lightbox__close"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(false);
            }}
            aria-label="Close"
          >
            ×
          </button>
          <div className="xpo-lightbox__notice">
            Original tweet unavailable · showing archived screenshot
          </div>
          <img
            src={post.archiveUrl}
            alt={`Archived post by ${post.author}`}
            className="xpo-lightbox__img"
          />
        </div>
      )}
    </>
  );
}
