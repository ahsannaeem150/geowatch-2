import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icons, SOURCE_TYPE_ICONS } from './IncidentIcons.jsx';
import { relativeTime, sortPinned } from './IncidentUtils.js';

let twitterScriptPromise = null;
function loadTwitterScript() {
  if (twitterScriptPromise) return twitterScriptPromise;
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.twttr?.widgets) return Promise.resolve(window.twttr);
  twitterScriptPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://platform.twitter.com/widgets.js';
    script.async = true;
    script.charset = 'utf-8';
    script.onload = () => resolve(window.twttr);
    document.body.appendChild(script);
  });
  return twitterScriptPromise;
}

function getTweetId(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    const idx = parts.indexOf('status');
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
  } catch {
    // ignore
  }
  return null;
}

export function XEmbed({ post, onRender }) {
  const ref = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const tweetId = getTweetId(post.tweetUrl);

  if (!tweetId) {
    return <XPostCard post={post} />;
  }

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      try {
        const twttr = await loadTwitterScript();
        if (!ref.current || cancelled) return;
        await twttr.widgets.load(ref.current);
        if (!cancelled) setLoaded(true);
      } catch {
        // ignore
      }
    };
    render();
    return () => {
      cancelled = true;
    };
  }, [post.tweetUrl]);

  useEffect(() => {
    if (loaded) onRender?.();
  }, [loaded, onRender]);

  return (
    <div className="id-x-embed">
      <blockquote ref={ref} className="twitter-tweet" data-theme="dark" data-conversation="none">
        <a href={post.tweetUrl} target="_blank" rel="noreferrer">
          {post.text}
        </a>
      </blockquote>
      {!loaded && (
        <div className="id-x-embed__loader">
          {SOURCE_TYPE_ICONS.x_post} Loading post…
        </div>
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
  pageSize = 5,
  mode = 'user',
  onEditItem,
  onDeleteItem,
  onPinItem,
  onFeatureItem,
  onArchiveSource,
  onCheckSource,
  onAutoCheck,
  featuredId,
  archivedLightboxPortal = false,
}) {
  const isAdmin = mode === 'admin' || mode === 'superadmin';
  const sortedPosts = useMemo(() => sortPinned(posts, featuredId), [posts, featuredId]);
  const [openIds, setOpenIds] = useState(new Set());
  const [renderedIds, setRenderedIds] = useState(new Set());
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [page, setPage] = useState(1);
  const [lightbox, setLightbox] = useState(null);
  const [checkingIds, setCheckingIds] = useState(new Set());
  const [autoCheckedIds, setAutoCheckedIds] = useState(new Set());
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

      const age = post.lastCheckedAt
        ? Date.now() - new Date(post.lastCheckedAt).getTime()
        : Infinity;

      if (checkerRef.current && age > TTL_MS) {
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
  }, [openIds, pagePosts, startRenderTimeout]);

  useEffect(() => {
    const priorityIds = sortedPosts.filter((p) => p.pinned || p.id === featuredId).map((p) => p.id);
    if (!priorityIds.length) return;
    setOpenIds((prev) => new Set([...prev, ...priorityIds]));
    setRenderedIds((prev) => new Set([...prev, ...priorityIds]));
  }, [sortedPosts, featuredId]);

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
          const isOpen = openIds.has(post.id);
          return (
            <div key={post.id} className={`id-x-compact__item ${isOpen ? 'open' : ''}`} data-featured={featuredId === post.id || undefined}>
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
                    {isAdmin && (
                      <span className="id-x-compact__admin">
                        {onFeatureItem && (
                          <button
                            type="button"
                            className={`id-x-compact__feature-btn ${featuredId === post.id ? 'active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onFeatureItem?.(post.id);
                            }}
                            title={featuredId === post.id ? 'Remove from featured' : 'Feature this post'}
                          >
                            {Icons.star}
                            <span>{featuredId === post.id ? 'Featured' : 'Feature'}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className={post.pinned ? 'pin active' : 'pin'}
                          onClick={(e) => {
                            e.stopPropagation();
                            onPinItem?.(post, !post.pinned);
                          }}
                          title={post.pinned ? 'Unpin from top' : 'Pin to top'}
                        >
                          {Icons.pin}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditItem?.(post);
                          }}
                          title="Edit"
                        >
                          {Icons.edit}
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteItem?.(post.id);
                          }}
                          title="Delete"
                        >
                          {Icons.trash}
                        </button>
                      </span>
                    )}
                    <span className="id-x-compact__chevron">{isOpen ? '▲' : '▼'}</span>
                  </span>
                </span>
              </button>

              {renderedIds.has(post.id) && !post.archived && (
                <div className="id-x-compact__embed">
                  <XEmbed post={post} onRender={() => clearRenderTimeout(post.id)} />
                  {checkingIds.has(post.id) && (
                    <div className="id-x-checking-notice">
                      <span className="id-x-checking-notice__spinner" />
                      Checking for an archived snapshot if this tweet doesn't load…
                    </div>
                  )}
                  {isOpen && (
                    <div className="id-x-compact__actions">
                      <a className="id-x-compact__action" href={post.tweetUrl} target="_blank" rel="noreferrer">
                        {Icons.external} Open on X
                      </a>
                      <button className="id-x-compact__action" onClick={() => copyLink(post)}>
                        {Icons.link} {copiedId === post.id ? 'Copied!' : 'Copy link'}
                      </button>
                      {onArchiveSource && (
                        <button
                          className="id-x-compact__action"
                          onClick={() => onArchiveSource(post)}
                        >
                          {Icons.image} Archive
                        </button>
                      )}
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
                  <div className="id-x-compact__actions">
                    <a className="id-x-compact__action" href={post.tweetUrl} target="_blank" rel="noreferrer">
                      {Icons.external} Try original
                    </a>
                    <button className="id-x-compact__action" onClick={() => copyLink(post)}>
                      {Icons.link} {copiedId === post.id ? 'Copied!' : 'Copy link'}
                    </button>
                    {onCheckSource && (
                      <button
                        className="id-x-compact__action"
                        onClick={() => onCheckSource(post)}
                      >
                        {Icons.refresh} Check status
                      </button>
                    )}
                    {onArchiveSource && (
                      <button
                        className="id-x-compact__action"
                        onClick={() => onArchiveSource(post)}
                      >
                        {Icons.undo} Unarchive
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
