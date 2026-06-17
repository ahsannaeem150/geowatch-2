import React, { useMemo, useState } from 'react';
import { Icons, SOURCE_TYPE_ICONS, SOURCE_TYPE_LABELS } from './IncidentIcons.jsx';
import { sortPinned, countEvidence, formatDate, formatTime } from './IncidentUtils.js';
import { VerificationBadge } from './IncidentBadges.jsx';
import XPostCompactList, { XEmbed, ArchivedPost, ArchiveLightbox } from './XPostCompactList.jsx';
import { ArticleCard, AdminNoteCard, EditableArticleCard, EditableAdminNoteCard, MediaGrid } from './SourceCards.jsx';


export function findItemByFeature(sources, featured) {
  if (!featured || !sources) return null;
  const list = sources[featured.sourceType];
  return list?.find((x) => x.id === (featured.sourceId || featured.itemId)) || null;
}

function RailFeaturedContent({ sourceType, item, onMediaClick, onArchivedOpen }) {
  if (sourceType === 'media') {
    return (
      <button type="button" className="opt1-featured-media" onClick={() => onMediaClick?.([item], 0)}>
        <img src={item.url} alt={item.caption} loading="lazy" />
        {item.caption && <div className="opt1-featured-media__caption">{item.caption}</div>}
      </button>
    );
  }
  if (sourceType === 'x_post') {
    if (item.archived) {
      return (
        <div key={item.id} className="opt1-featured-embed">
          <ArchivedPost post={item} onOpen={() => onArchivedOpen?.(item)} />
        </div>
      );
    }
    return (
      <div key={item.id} className="opt1-featured-embed">
        <XEmbed post={item} />
      </div>
    );
  }
  if (sourceType === 'news_article') {
    return <ArticleCard article={item} />;
  }
  if (sourceType === 'admin_note') {
    return <AdminNoteCard note={item} />;
  }
  return null;
}

export function RailFeaturedSection({ event, featuredItem, onMediaClick, onClearFeature, isAdmin }) {
  const [archivedLightbox, setArchivedLightbox] = useState(null);
  const item = findItemByFeature(event.sources, featuredItem);
  if (!item) return null;
  return (
    <div className="opt1-featured-block">
      <div className="opt1-featured-block__header">
        <span className="opt1-featured-block__label">{Icons.star} Featured</span>
        {isAdmin && (
          <button type="button" className="opt1-featured-block__remove" onClick={onClearFeature}>
            Remove
          </button>
        )}
      </div>
      <div className="opt1-featured-block__body">
        <RailFeaturedContent
          sourceType={featuredItem.sourceType}
          item={item}
          onMediaClick={onMediaClick}
          onArchivedOpen={setArchivedLightbox}
        />
      </div>
      {archivedLightbox && (
        <ArchiveLightbox post={archivedLightbox} onClose={() => setArchivedLightbox(null)} portal />
      )}
    </div>
  );
}

function EditableMediaThumb({ item, onClick, onEdit, onDelete, onPin, onFeature, isFeatured }) {
  return (
    <div className="opt1-media-wrap">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onClick?.(item)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.(item);
          }
        }}
        className="opt1-media-thumb"
      >
        <img src={item.url} alt={item.caption} className="opt1-media-thumb__img" />
        {item.pinned && (
          <span className="opt1-pinned-badge opt1-pinned-badge--thumb">
            {Icons.pin} Pinned
          </span>
        )}
        {isFeatured && (
          <span className="opt1-featured-badge opt1-featured-badge--thumb">
            {Icons.star} Featured
          </span>
        )}
        {item.caption && <div className="opt1-media-caption">{item.caption}</div>}
      </div>
      <div className="opt1-evidence-toolbar">
        {onFeature && (
          <button
            type="button"
            className={isFeatured ? 'opt1-feature active' : 'opt1-feature'}
            onClick={onFeature}
            title={isFeatured ? 'Remove from featured' : 'Feature this item'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              borderRadius: 8,
              background: isFeatured ? 'rgba(245,158,11,0.14)' : 'var(--bg-hover)',
              color: isFeatured ? '#fbbf24' : 'var(--text-secondary)',
              border: `1px solid ${isFeatured ? 'rgba(245,158,11,0.35)' : 'var(--border-subtle)'}`,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {Icons.star} {isFeatured ? 'Featured' : 'Feature'}
          </button>
        )}
        <button
          type="button"
          onClick={onPin}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 8px',
            borderRadius: 8,
            background: item.pinned ? 'rgba(245,158,11,0.12)' : 'var(--bg-hover)',
            color: item.pinned ? '#fbbf24' : 'var(--text-secondary)',
            border: `1px solid ${item.pinned ? 'rgba(245,158,11,0.25)' : 'var(--border-subtle)'}`,
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {Icons.pin} {item.pinned ? 'Pinned' : 'Pin'}
        </button>
        <button
          type="button"
          onClick={onEdit}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 8px',
            borderRadius: 8,
            background: 'var(--bg-hover)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-subtle)',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {Icons.edit} Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 8px',
            borderRadius: 8,
            background: 'rgba(239,68,68,0.12)',
            color: 'var(--danger-light)',
            border: '1px solid rgba(239,68,68,0.25)',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {Icons.trash} Delete
        </button>
      </div>
    </div>
  );
}

function EditableMediaGrid({ items, onItemClick, onEdit, onDelete, onPin, onFeature, featuredId }) {
  if (!items?.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
      {items.map((item) => (
        <EditableMediaThumb
          key={item.id}
          item={item}
          onClick={onItemClick}
          onEdit={() => onEdit(item)}
          onDelete={() => onDelete(item.id)}
          onPin={() => onPin(item.id)}
          onFeature={onFeature ? () => onFeature(item.id) : undefined}
          isFeatured={featuredId === item.id}
        />
      ))}
    </div>
  );
}

export default function EvidenceRail({
  event,
  mode,
  onMediaClick,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  onAddEvidence,
  onEditEvidence,
  onDeleteEvidence,
  onPinEvidence,
  onFeatureEvidence,
  onClearFeature,
  onArchiveSource,
  onCheckSource,
  onAutoCheck,
  featuredItem,
  extraTabs = [],
}) {
  if (!event) return null;
  const isAdmin = mode === 'admin' || mode === 'superadmin';
  const [filter, setFilter] = useState('all');
  const sources = event.sources || {};
  const ver = { color: '#9ca3af' };

  const featuredMediaId = featuredItem?.sourceType === 'media' ? featuredItem.sourceId || featuredItem.itemId : null;
  const featuredPostId = featuredItem?.sourceType === 'x_post' ? featuredItem.sourceId || featuredItem.itemId : null;
  const featuredArticleId = featuredItem?.sourceType === 'news_article' ? featuredItem.sourceId || featuredItem.itemId : null;
  const featuredNoteId = featuredItem?.sourceType === 'admin_note' ? featuredItem.sourceId || featuredItem.itemId : null;

  const media = useMemo(() => sortPinned(sources.media || [], featuredMediaId), [sources.media, featuredMediaId]);
  const posts = useMemo(() => sortPinned(sources.x_post || [], featuredPostId), [sources.x_post, featuredPostId]);
  const articles = useMemo(() => sortPinned(sources.news_article || [], featuredArticleId), [sources.news_article, featuredArticleId]);
  const notes = useMemo(() => sortPinned(sources.admin_note || [], featuredNoteId), [sources.admin_note, featuredNoteId]);

  const counts = {
    all: media.length + posts.length + articles.length + notes.length,
    media: media.length,
    x_post: posts.length,
    news_article: articles.length,
    admin_note: notes.length,
  };

  const tabs = [
    { key: 'all', label: 'All', icon: '⊕' },
    { key: 'media', label: SOURCE_TYPE_LABELS.media, icon: SOURCE_TYPE_ICONS.media },
    { key: 'x_post', label: SOURCE_TYPE_LABELS.x_post, icon: SOURCE_TYPE_ICONS.x_post },
    { key: 'news_article', label: SOURCE_TYPE_LABELS.news_article, icon: SOURCE_TYPE_ICONS.news_article },
    { key: 'admin_note', label: SOURCE_TYPE_LABELS.admin_note, icon: SOURCE_TYPE_ICONS.admin_note },
    ...extraTabs.map((t) => ({ key: t.key, label: t.label, icon: t.icon })),
  ];

  extraTabs.forEach((t) => {
    counts[t.key] = t.count ?? 0;
  });

  const show = (key) => filter === 'all' || filter === key;
  const isEmpty = counts[filter] === 0;

  const defaultOrder = ['media', 'x_post', 'news_article', 'admin_note'];
  const pinnedSet = new Set(
    defaultOrder.filter((key) => {
      const list = { media, x_post: posts, news_article: articles, admin_note: notes }[key];
      return list.some((item) => item.pinned);
    })
  );
  const categoryOrder = [
    ...defaultOrder.filter((key) => pinnedSet.has(key)),
    ...defaultOrder.filter((key) => !pinnedSet.has(key)),
  ];

  const SectionHeader = ({ typeKey, count }) => (
    <div className="opt1-bento-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span>
        {SOURCE_TYPE_ICONS[typeKey]} {SOURCE_TYPE_LABELS[typeKey]} ({count})
      </span>
      {isAdmin && (
        <button type="button" className="opt1-mini-add" onClick={() => onAddEvidence?.(event.id, typeKey)}>
          {Icons.plus} Add
        </button>
      )}
    </div>
  );

  const renderSection = (key) => {
    if (!show(key)) return null;
    const map = {
      media: {
        count: media.length,
        render: () =>
          isAdmin ? (
            <EditableMediaGrid
              items={media}
              onItemClick={onMediaClick}
              onEdit={(item) => onEditEvidence?.(event.id, 'media', item)}
              onDelete={(id) => onDeleteEvidence?.(event.id, 'media', id)}
              onPin={(id) => onPinEvidence?.(event.id, 'media', id)}
              onFeature={isAdmin ? (id) => onFeatureEvidence?.(event.id, { sourceType: 'media', sourceId: id }) : undefined}
              featuredId={featuredMediaId}
            />
          ) : (
            <MediaGrid items={media} onItemClick={onMediaClick} />
          ),
      },
      x_post: {
        count: posts.length,
        render: () => (
          <XPostCompactList
            posts={posts}
            mode={mode}
            archivedLightboxPortal
            onEditItem={(item) => onEditEvidence?.(event.id, 'x_post', item)}
            onDeleteItem={(itemId) => onDeleteEvidence?.(event.id, 'x_post', itemId)}
            onPinItem={(itemId) => onPinEvidence?.(event.id, 'x_post', itemId)}
            onFeatureItem={isAdmin ? (itemId) => onFeatureEvidence?.(event.id, { sourceType: 'x_post', sourceId: itemId }) : undefined}
            onArchiveSource={onArchiveSource ? (item) => onArchiveSource?.(event.id, item) : undefined}
            onCheckSource={onCheckSource ? (item) => onCheckSource?.(event.id, item) : undefined}
            onAutoCheck={onAutoCheck ? (item) => onAutoCheck?.(event.id, item) : undefined}
            featuredId={featuredPostId}
          />
        ),
      },
      news_article: {
        count: articles.length,
        render: () =>
          isAdmin ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {articles.map((article) => (
                <EditableArticleCard
                  key={article.id}
                  article={article}
                  onEdit={() => onEditEvidence?.(event.id, 'news_article', article)}
                  onDelete={() => onDeleteEvidence?.(event.id, 'news_article', article.id)}
                  onPin={() => onPinEvidence?.(event.id, 'news_article', article.id)}
                  onFeature={isAdmin ? () => onFeatureEvidence?.(event.id, { sourceType: 'news_article', sourceId: article.id }) : undefined}
                  isFeatured={featuredArticleId === article.id}
                />
              ))}
            </div>
          ) : (
            articles.map((article) => <ArticleCard key={article.id} article={article} isFeatured={featuredArticleId === article.id} />)
          ),
      },
      admin_note: {
        count: notes.length,
        render: () =>
          isAdmin ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {notes.map((note) => (
                <EditableAdminNoteCard
                  key={note.id}
                  note={note}
                  onEdit={() => onEditEvidence?.(event.id, 'admin_note', note)}
                  onDelete={() => onDeleteEvidence?.(event.id, 'admin_note', note.id)}
                  onPin={() => onPinEvidence?.(event.id, 'admin_note', note.id)}
                  onFeature={isAdmin ? () => onFeatureEvidence?.(event.id, { sourceType: 'admin_note', sourceId: note.id }) : undefined}
                  isFeatured={featuredNoteId === note.id}
                />
              ))}
            </div>
          ) : (
            notes.map((note) => <AdminNoteCard key={note.id} note={note} isFeatured={featuredNoteId === note.id} />)
          ),
      },
    };
    const section = map[key];
    if (section.count === 0) return null;
    return (
      <div key={key} className="opt1-bento-cell opt1-bento-cell--wide">
        <SectionHeader typeKey={key} count={section.count} />
        {key === 'news_article' || key === 'admin_note' ? (
          <div className="opt1-bento-scroll">{section.render()}</div>
        ) : (
          section.render()
        )}
      </div>
    );
  };

  return (
    <div className="opt1-rail">
      <div className="opt1-rail-card opt1-rail-card--enter" key={event.id}>
        <div className="opt1-rail-header">
          <div>
            <div className="opt1-rail-title">{event.summary}</div>
            <div className="opt1-rail-sub">
              {formatDate(event.timestamp || event.updateDate)} · {formatTime(event.timestamp || event.updateDate)} · {countEvidence(event)} evidence items
            </div>
          </div>
          <VerificationBadge status={event.verification || event.verificationStatus} />
        </div>

        {filter === 'all' && featuredItem && (
          <RailFeaturedSection
            event={event}
            featuredItem={featuredItem}
            onMediaClick={onMediaClick}
            onClearFeature={() => onClearFeature?.(event.id)}
            isAdmin={isAdmin}
          />
        )}

        <div className="opt1-filter-tabs" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={filter === tab.key}
              onClick={() => setFilter(tab.key)}
              className={`opt1-filter-tab ${filter === tab.key ? 'opt1-filter-tab--active' : ''}`}
            >
              <span className="opt1-filter-tab__icon">{tab.icon}</span>
              <span className="opt1-filter-tab__label">{tab.label}</span>
              <span className="opt1-filter-tab__count">{counts[tab.key]}</span>
            </button>
          ))}
        </div>

        <div className="opt1-bento">
          {categoryOrder.map((key) => renderSection(key))}

          {(() => {
            const activeExtra = extraTabs.find((t) => t.key === filter);
            if (!activeExtra) return null;
            return (
              <div key={activeExtra.key} className="opt1-bento-cell opt1-bento-cell--wide">
                <div className="opt1-bento-label">{activeExtra.label}</div>
                <div className="opt1-bento-scroll">{activeExtra.render?.()}</div>
              </div>
            );
          })()}

          {isEmpty && (
            <div className="opt1-empty-state">
              No {filter === 'all' ? 'evidence' : SOURCE_TYPE_LABELS[filter].toLowerCase()} for this update.
              {isAdmin && (
                <button
                  type="button"
                  className="opt1-empty-add"
                  onClick={() => onAddEvidence?.(event.id, filter === 'all' ? 'media' : filter)}
                >
                  {Icons.plus} Add {filter === 'all' ? 'evidence' : SOURCE_TYPE_LABELS[filter]}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="opt1-rail-nav">
          <button onClick={onPrev} disabled={!hasPrev}>
            {Icons.chevronLeft} Prev
          </button>
          <button onClick={onNext} disabled={!hasNext}>
            Next {Icons.chevronRight}
          </button>
        </div>
      </div>
    </div>
  );
}
