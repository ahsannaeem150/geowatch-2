import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icons, SOURCE_TYPE_ICONS } from './IncidentIcons.jsx';
import { relativeTime, sortPinned } from './IncidentUtils.js';
import { FeaturedCollapsedRow } from './SourceCards.jsx';
import { extractTweetRef, fetchTweet } from './x-post.js';
import Lightbox from './Lightbox.jsx';

const TwIcons = {
  reply: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
  repeat: (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  ),
  heart: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  play: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  ),
  dots: (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  ),
};

function VerifiedBadge({ gold }) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-label="Verified" role="img">
      <circle cx="12" cy="12" r="10" fill={gold ? '#e3b008' : '#1d9bf0'} />
      <path d="M8 12.5l2.5 2.5L16 9.5" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function compactNum(n) {
  if (n === null || n === undefined) return null;
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

function fmtTweetDate(d) {
  if (!d || Number.isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${time} · ${date}`;
}

function fmtDuration(s) {
  if (s == null) return null;
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

// Native X-embed-lookalike card: resolves the live tweet via fxtwitter and
// renders avatar/name/badge/text/media-mosaic/stats ourselves. Media opens in
// the shared Lightbox (swipe/arrow navigation). If the tweet cannot be
// resolved (deleted/blocked), onRender is never fired — the caller's render
// timeout then triggers the availability check, exactly as the old widget
// flow did, and the card degrades to the plain text card until archived.
export function XEmbed({ post, onRender, footActions }) {
  const [tweet, setTweet] = useState(null);
  const [failed, setFailed] = useState(false);
  const [lightbox, setLightbox] = useState(null); // { items, index }
  const ref = extractTweetRef(post.tweetUrl);

  useEffect(() => {
    let alive = true;
    if (ref) {
      fetchTweet(post.tweetUrl).then((t) => {
        if (!alive) return;
        if (t) {
          setTweet(t);
          onRender?.();
        } else {
          setFailed(true);
        }
      });
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.tweetUrl]);

  if (!ref || failed) {
    return <XPostCard post={post} />;
  }

  if (!tweet) {
    return (
      <div className="id-x-embed">
        <div className="id-x-embed__loader">
          {SOURCE_TYPE_ICONS.x_post} Loading post…
        </div>
      </div>
    );
  }

  const lbItems = tweet.media.map((m) => ({
    url: m.type === 'video' ? m.thumb || m.url : m.url,
    type: m.type,
    videoUrl: m.type === 'video' ? m.url : null,
    caption: null,
  }));
  const mosaicCount = Math.min(tweet.media.length, 4);

  return (
    <div className="id-tw">
      <div className="id-tw__head">
        {tweet.avatar ? (
          <img src={tweet.avatar} alt={tweet.name} className="id-tw__avatar" loading="lazy" />
        ) : (
          <span className="id-tw__avatar id-tw__avatar--fallback">{SOURCE_TYPE_ICONS.x_post}</span>
        )}
        <div className="id-tw__user">
          <div className="id-tw__name-row">
            <span className="id-tw__name">{tweet.name}</span>
            {tweet.verified && (
              <span
                className="id-tw__badge"
                title="Verified"
              >
                <VerifiedBadge gold={tweet.verifiedType === 'organization'} />
              </span>
            )}
            <span className="id-tw__handle">@{tweet.handle}</span>
          </div>
        </div>
        <span className="id-tw__logo">{Icons.xLogo}</span>
      </div>

      {tweet.text ? <div className="id-tw__text">{tweet.text}</div> : null}

      {tweet.media.length > 0 && (
        <div className="id-tw__mosaic" data-count={mosaicCount}>
          {tweet.media.slice(0, 4).map((m, i) => {
            const uri = m.type === 'video' ? m.thumb : m.url;
            const dur = m.type === 'video' ? fmtDuration(m.duration) : null;
            const style =
              tweet.media.length === 1 && m.width && m.height
                ? { aspectRatio: `${Math.min(1.91, Math.max(0.8, m.width / m.height))}` }
                : undefined;
            return (
              <button
                key={`${m.url}-${i}`}
                type="button"
                className="id-tw__cell"
                style={style}
                onClick={() => setLightbox({ items: lbItems, index: i })}>
                {uri && <img src={uri} alt="" loading="lazy" />}
                {m.type === 'video' && (
                  <span className="id-tw__play">{TwIcons.play}</span>
                )}
                {dur && <span className="id-tw__dur">{dur}</span>}
              </button>
            );
          })}
        </div>
      )}

      <div className="id-tw__stats">
        {tweet.date ? (
          <span className="id-tw__stat id-tw__stat--date">
            {fmtTweetDate(tweet.date)}
            {tweet.views !== null && ` · ${compactNum(tweet.views)} views`}
          </span>
        ) : null}
        {tweet.replies !== null && (
          <span className="id-tw__stat">{TwIcons.reply} {compactNum(tweet.replies)}</span>
        )}
        {tweet.retweets !== null && (
          <span className="id-tw__stat">{TwIcons.repeat} {compactNum(tweet.retweets)}</span>
        )}
        {tweet.likes !== null && (
          <span className="id-tw__stat">{TwIcons.heart} {compactNum(tweet.likes)}</span>
        )}
        {footActions ? <span className="id-tw__foot-actions">{footActions}</span> : null}
      </div>

      {lightbox && (
        <Lightbox
          items={lightbox.items}
          startIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}

export function ArchivedPost({ post, onOpen }) {
  if (!post.archiveUrl) return null;
  return (
    <div className="id-x-archive">
      <div className="id-x-archive__badge">Archived</div>
      <button type="button" className="id-x-archive__img-btn" onClick={onOpen} aria-label="View archived screenshot">
        <img
          src={post.archiveUrl}
          alt={`Archived post by ${post.author}`}
          className="id-x-archive__img"
          loading="lazy"
        />
      </button>
    </div>
  );
}

export function ArchiveLightbox({ post, onClose, portal = false }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    if (portal) document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      if (portal) document.body.style.overflow = '';
    };
  }, [onClose, portal]);

  if (!post) return null;
  const content = (
    <div className="id-x-lightbox" onClick={onClose}>
      <button type="button" className="id-x-lightbox__close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <div className="id-x-lightbox__notice">Original tweet unavailable · showing archived screenshot</div>
      <div className="id-x-lightbox__content" onClick={(e) => e.stopPropagation()}>
        <img src={post.archiveUrl} alt={`Archived post by ${post.author}`} />
      </div>
    </div>
  );
  return portal && typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}

export function XPostCard({ post }) {
  return (
    <div className="id-post">
      <div className="id-post__author">
        <img src={post.authorAvatar} alt={post.author} className="id-post__avatar" loading="lazy" />
        <div>
          <div className="id-post__name">{post.author}</div>
          <div className="id-post__handle">
            {post.handle} · {SOURCE_TYPE_ICONS.x_post}
          </div>
        </div>
      </div>
      <div className="id-post__text">{post.text}</div>
      {post.tweetUrl && (
        <a href={post.tweetUrl} target="_blank" rel="noreferrer" className="id-post__link">
          {Icons.link} View post
        </a>
      )}
    </div>
  );
}

export default function XPostCompactList({
  posts,
  pageSize = 8,
  mode = 'user',
  onEditItem,
  onDeleteItem,
  onPinItem,
  onFeatureItem,
  onArchiveSource,
  onCheckSource,
  onAutoCheck,
  featuredId,
  collapsedId = null,
  onExpandCollapsed,
  archivedLightboxPortal = false,
}) {
  const isAdmin = mode === 'admin' || mode === 'superadmin';
  const sortedPosts = useMemo(() => sortPinned(posts, featuredId), [posts, featuredId]);
  const [openIds, setOpenIds] = useState(new Set());
  const [renderedIds, setRenderedIds] = useState(new Set());
  const [loadedIds, setLoadedIds] = useState(new Set());
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [page, setPage] = useState(1);
  const [lightbox, setLightbox] = useState(null);
  const [checkingIds, setCheckingIds] = useState(new Set());
  const [autoCheckedIds, setAutoCheckedIds] = useState(new Set());
  const [menuFor, setMenuFor] = useState(null);

  // Escape closes the admin overflow menu (backdrop click already does).
  useEffect(() => {
    if (menuFor === null) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuFor(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuFor]);
  const checkTimers = useRef(new Map());
  const checkerRef = useRef(onAutoCheck ?? onCheckSource);
  checkerRef.current = onAutoCheck ?? onCheckSource;
  const openIdsRef = useRef(openIds);
  openIdsRef.current = openIds;

  const startRenderTimeout = useCallback((post) => {
    if (checkTimers.current.has(post.id)) return;
    setCheckingIds((prev) => new Set(prev).add(post.id));
    const timer = setTimeout(() => {
      checkTimers.current.delete(post.id);
      setCheckingIds((prev) => {
        const next = new Set(prev);
        next.delete(post.id);
        return next;
      });
      if (openIdsRef.current.has(post.id) && !post.archived) {
        setAutoCheckedIds((prev) => new Set(prev).add(post.id));
        checkerRef.current?.(post);
      }
    }, 7000);
    checkTimers.current.set(post.id, timer);
  }, []);

  const clearRenderTimeout = (postId) => {
    const timer = checkTimers.current.get(postId);
    if (timer) {
      clearTimeout(timer);
      checkTimers.current.delete(postId);
    }
    setCheckingIds((prev) => {
      const next = new Set(prev);
      next.delete(postId);
      return next;
    });
    // The tweet rendered live — that IS proof of availability, so suppress
    // every auto-check for this post (TTL refresh and render timeout alike).
    setLoadedIds((prev) => new Set(prev).add(postId));
  };

  const filtered = useMemo(
    () =>
      sortedPosts.filter(
        (p) =>
          p.author?.toLowerCase().includes(query.toLowerCase()) ||
          p.handle?.toLowerCase().includes(query.toLowerCase()) ||
          p.text?.toLowerCase().includes(query.toLowerCase())
      ),
    [sortedPosts, query]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagePosts = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize]
  );
  const allPageOpen = pagePosts.length > 0 && pagePosts.every((p) => openIds.has(p.id));

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    const TTL_MS = 60 * 60 * 1000;
    const activeIds = new Set();

    for (const post of pagePosts) {
      if (!openIds.has(post.id)) continue;
      activeIds.add(post.id);
      if (loadedIds.has(post.id)) continue;

      const age = post.lastCheckedAt
        ? Date.now() - new Date(post.lastCheckedAt).getTime()
        : Infinity;

      if (checkerRef.current && !post.archived && age > TTL_MS) {
        // Existing stale-data check
        setAutoCheckedIds((prev) => new Set(prev).add(post.id));
        checkerRef.current(post);
      } else if (checkerRef.current && !post.archived) {
        // If the live embed hasn't rendered within 7 seconds, force a check
        // regardless of TTL. This catches tweets that were deleted shortly
        // after they were added, before the next scheduled check.
        startRenderTimeout(post);
      }
    }

    // Cancel timers for posts that are no longer open or have been archived
    for (const [postId, timer] of checkTimers.current.entries()) {
      if (!activeIds.has(postId)) {
        clearTimeout(timer);
        checkTimers.current.delete(postId);
      }
    }

    setCheckingIds((prev) => {
      const next = new Set(prev);
      for (const id of prev) {
        if (!activeIds.has(id)) next.delete(id);
      }
      return next;
    });

    return () => {
      for (const timer of checkTimers.current.values()) clearTimeout(timer);
      checkTimers.current.clear();
    };
  }, [openIds, pagePosts, startRenderTimeout, loadedIds]);

  // Feed-style: every post starts expanded (this is the dedicated evidence
  // view — per-item expand clicks just hid evidence). Collapse stays
  // available per card and via "Collapse all".
  useEffect(() => {
    const ids = sortedPosts.map((p) => p.id);
    if (!ids.length) return;
    setOpenIds((prev) => new Set([...prev, ...ids]));
    setRenderedIds((prev) => new Set([...prev, ...ids]));
  }, [sortedPosts]);

  const openAll = () => {
    const next = new Set(openIds);
    pagePosts.forEach((p) => next.add(p.id));
    setOpenIds(next);
    setRenderedIds((prev) => new Set([...prev, ...pagePosts.map((p) => p.id)]));
  };

  const collapseAll = () => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      pagePosts.forEach((p) => next.delete(p.id));
      return next;
    });
  };

  const toggle = (id) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setRenderedIds((prev) => new Set(prev).add(id));
  };

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
    <div className="id-x-compact">
      <div className="id-x-compact__toolbar">
        <input
          type="text"
          className="id-x-compact__search"
          placeholder="Search posts…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="id-x-compact__collapse" onClick={openAll} disabled={allPageOpen}>
          Open all
        </button>
        <button className="id-x-compact__collapse" onClick={collapseAll} disabled={openIds.size === 0}>
          Collapse all
        </button>
      </div>

      <div className="id-x-compact__list">
        {pagePosts.map((post) => {
          // Featured item's original collapses to a marker (shown above in the
          // Featured block); the marker expands it back on demand.
          if (collapsedId === post.id) {
            return <FeaturedCollapsedRow key={post.id} onExpand={onExpandCollapsed} />;
          }
          const isOpen = openIds.has(post.id);
          return (
            <div key={post.id} className={`id-x-compact__item ${isOpen ? 'open' : ''}`} data-featured={featuredId === post.id || undefined}>
              {isOpen ? (
                // Expanded: slim control strip — the card itself carries the
                // identity, so the old full summary row is not repeated here.
                <div className="id-x-compact__bar">
                  <span className="id-x-compact__bar-meta">
                    {featuredId === post.id && (
                      <span className="id-x-compact__featured" title="Featured in update card">
                        {Icons.star}
                      </span>
                    )}
                    {post.pinned && featuredId !== post.id && (
                      <span className="id-x-compact__pinned" title="Pinned to top">
                        {Icons.pin}
                      </span>
                    )}
                  </span>
                  <span className="id-x-compact__bar-tools">
                    {isAdmin && (
                      <span className="id-x-menu-wrap">
                        <button
                          type="button"
                          className="id-x-iconbtn"
                          title="Post actions"
                          onClick={() => setMenuFor(menuFor === post.id ? null : post.id)}
                        >
                          {TwIcons.dots}
                        </button>
                        {menuFor === post.id && (
                          <>
                            <div className="id-x-menu__backdrop" onClick={() => setMenuFor(null)} />
                            <div className="id-x-menu">
                              {onFeatureItem && (
                                <button type="button" onClick={() => { setMenuFor(null); onFeatureItem(post.id); }}>
                                  {Icons.star} {featuredId === post.id ? 'Unfeature' : 'Feature'}
                                </button>
                              )}
                              {onPinItem && (
                                <button type="button" onClick={() => { setMenuFor(null); onPinItem(post, !post.pinned); }}>
                                  {Icons.pin} {post.pinned ? 'Unpin from top' : 'Pin to top'}
                                </button>
                              )}
                              {onEditItem && (
                                <button type="button" onClick={() => { setMenuFor(null); onEditItem(post); }}>
                                  {Icons.edit} Edit
                                </button>
                              )}
                              {onDeleteItem && (
                                <button
                                  type="button"
                                  className="danger"
                                  onClick={() => { setMenuFor(null); onDeleteItem(post.id); }}
                                >
                                  {Icons.trash} Delete
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </span>
                    )}
                    <button
                      type="button"
                      className="id-x-iconbtn"
                      title="Collapse"
                      onClick={() => toggle(post.id)}
                    >
                      ▲
                    </button>
                  </span>
                </div>
              ) : (
                <button className="id-x-compact__summary" onClick={() => toggle(post.id)}>
                  <img src={post.authorAvatar} alt={post.author} className="id-x-compact__avatar" loading="lazy" />
                  <span className="id-x-compact__main">
                    <span className="id-x-compact__top">
                      <span className="id-x-compact__author-line">
                        <span className="id-x-compact__name">{post.author}</span>
                        <span className="id-x-compact__handle">{post.handle}</span>
                        {featuredId === post.id && (
                          <span className="id-x-compact__featured" title="Featured in update card">
                            {Icons.star}
                          </span>
                        )}
                        {post.pinned && featuredId !== post.id && (
                          <span className="id-x-compact__pinned" title="Pinned to top">
                            {Icons.pin}
                          </span>
                        )}
                      </span>
                      <span className="id-x-compact__time">{relativeTime(post.timestamp)}</span>
                      <span className="id-x-compact__chevron">▼</span>
                    </span>
                  </span>
                </button>
              )}

              {renderedIds.has(post.id) && !post.archived && (
                <div className="id-x-compact__embed">
                  <XEmbed
                    post={post}
                    onRender={() => clearRenderTimeout(post.id)}
                    footActions={
                      isOpen ? (
                        <>
                          <a
                            className="id-x-iconbtn"
                            href={post.tweetUrl}
                            target="_blank"
                            rel="noreferrer"
                            title="Open on X"
                          >
                            {Icons.external}
                          </a>
                          <button
                            type="button"
                            className="id-x-iconbtn"
                            onClick={() => copyLink(post)}
                            title={copiedId === post.id ? 'Copied!' : 'Copy link'}
                          >
                            {copiedId === post.id ? Icons.check : Icons.link}
                          </button>
                          {onArchiveSource && (
                            <button
                              type="button"
                              className="id-x-iconbtn"
                              title="Archive"
                              onClick={() => onArchiveSource(post)}
                            >
                              {Icons.image}
                            </button>
                          )}
                        </>
                      ) : null
                    }
                  />
                  {checkingIds.has(post.id) && (
                    <div className="id-x-checking-notice">
                      <span className="id-x-checking-notice__spinner" />
                      Checking for an archived snapshot if this tweet doesn't load…
                    </div>
                  )}
                </div>
              )}

              {isOpen && post.archived && (
                <div className="id-x-compact__embed">
                  {autoCheckedIds.has(post.id) && (
                    <div className="id-x-archive-notice">
                      {Icons.info}
                      Original tweet is unavailable · showing archived snapshot
                    </div>
                  )}
                  <ArchivedPost post={post} onOpen={() => setLightbox(post)} />
                  <div className="id-x-iconrow">
                    {onCheckSource && (
                      <button
                        type="button"
                        className="id-x-iconbtn"
                        title="Check status"
                        onClick={() => onCheckSource(post)}
                      >
                        {Icons.refresh}
                      </button>
                    )}
                    {onArchiveSource && (
                      <button
                        type="button"
                        className="id-x-iconbtn"
                        title="Unarchive"
                        onClick={() => onArchiveSource(post)}
                      >
                        {Icons.undo}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="id-x-compact__empty">No posts match “{query}”</div>
      ) : (
        totalPages > 1 && (
          <div className="id-x-compact__pagination">
            <button className="id-x-compact__collapse" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}>
              Previous
            </button>
            <span className="id-x-compact__page-info">
              {safePage} / {totalPages}
            </span>
            <button className="id-x-compact__collapse" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
              Next
            </button>
          </div>
        )
      )}

      {lightbox && <ArchiveLightbox post={lightbox} onClose={() => setLightbox(null)} portal={archivedLightboxPortal} />}
    </div>
  );
}
