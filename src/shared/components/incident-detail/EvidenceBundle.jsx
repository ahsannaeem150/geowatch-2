import React, { useEffect, useMemo, useState } from 'react';
import { Icons, SOURCE_TYPE_ICONS, SOURCE_TYPE_LABELS } from './IncidentIcons.jsx';
import { sortPinned, countSources, sourceCounts } from './IncidentUtils.js';
import { AdminMediaThumb, MediaThumb, MediaGrid, EditableArticleCard, EditableAdminNoteCard, ArticleCard, AdminNoteCard } from './SourceCards.jsx';
import XPostCompactList from './XPostCompactList.jsx';

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function Carousel({ items, renderItem, itemWidth, gap = 10, keyboard = true }) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);

  const goNext = () => setIndex((i) => (i + 1) % items.length);
  const goPrev = () => setIndex((i) => (i - 1 + items.length) % items.length);

  useEffect(() => {
    if (!keyboard || !hovered) return;
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
  }, [keyboard, hovered]);

  if (!items?.length) return null;

  const trackStyle = itemWidth
    ? { transform: `translateX(calc(-${index} * (${itemWidth}px + ${gap}px)))` }
    : { transform: `translateX(-${index * 100}%)` };

  return (
    <div className="id-carousel" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className="id-carousel__track" style={trackStyle}>
        {items.map((item, i) => (
          <div
            key={item.id ?? i}
            className="id-carousel__item"
            style={itemWidth ? { flex: `0 0 ${itemWidth}px` } : { width: '100%', flexShrink: 0 }}
          >
            {renderItem(item, i)}
          </div>
        ))}
      </div>
      {items.length > 1 && (
        <>
          <button
            className="id-carousel__btn id-carousel__btn--prev"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="Previous"
          >
            {Icons.chevronLeft}
          </button>
          <button
            className="id-carousel__btn id-carousel__btn--next"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="Next"
          >
            {Icons.chevronRight}
          </button>
          <div className="id-carousel__counter">
            {index + 1} / {items.length}
          </div>
        </>
      )}
    </div>
  );
}

function GridCarousel({ items, renderItem, pageSize = 4, keyboard = true }) {
  const [page, setPage] = useState(0);
  const [hovered, setHovered] = useState(false);
  const pages = useMemo(() => chunk(items, pageSize), [items, pageSize]);

  const goNext = () => setPage((p) => (p + 1) % pages.length);
  const goPrev = () => setPage((p) => (p - 1 + pages.length) % pages.length);

  useEffect(() => {
    setPage(0);
  }, [items.length]);

  useEffect(() => {
    if (!keyboard || !hovered) return;
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
  }, [keyboard, hovered, pages.length]);

  if (!items?.length) return null;

  return (
    <div className="id-grid-carousel" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className="id-grid-carousel__track" style={{ transform: `translateX(-${page * 100}%)` }}>
        {pages.map((pageItems, i) => {
          const gridClass = `id-twitter-grid id-twitter-grid--${pageItems.length >= 4 ? '4' : pageItems.length}`;
          return (
            <div key={i} className="id-grid-carousel__page">
              <div className={gridClass}>
                {pageItems.map((item, idx) => (
                  <div key={item.id ?? idx} className="id-twitter-grid__cell">
                    {renderItem(item, items.indexOf(item))}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {pages.length > 1 && (
        <>
          <button
            className="id-carousel__btn id-carousel__btn--prev"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="Previous"
          >
            {Icons.chevronLeft}
          </button>
          <button
            className="id-carousel__btn id-carousel__btn--next"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="Next"
          >
            {Icons.chevronRight}
          </button>
          <div className="id-carousel__counter">
            {page + 1} / {pages.length}
          </div>
        </>
      )}
    </div>
  );
}

export default function EvidenceBundle({
  event,
  activeTab,
  onTabChange,
  onMediaClick,
  mode = 'user',
  onAddEvidence,
  onEditEvidence,
  onDeleteEvidence,
  onPinEvidence,
  onFeatureEvidence,
  onArchiveSource,
  onCheckSource,
  onAutoCheck,
  featuredItem,
  mediaItemWidth = 300,
  mediaLayout = 'carousel',
  autoScrollFeatured = true,
}) {
  const isAdmin = mode === 'admin' || mode === 'superadmin';
  const sources = event.sources || {};

  const isFeatured = (type, item) =>
    featuredItem && featuredItem.sourceType === type && (featuredItem.sourceId === item.id || featuredItem.itemId === item.id);
  const defaultOrder = ['media', 'x_post', 'news_article', 'admin_note'];

  const sortedByType = useMemo(() => {
    const out = {};
    defaultOrder.forEach((key) => {
      const featuredId = featuredItem?.sourceType === key ? featuredItem.sourceId || featuredItem.itemId : null;
      out[key] = sortPinned(sources[key], featuredId);
    });
    return out;
  }, [sources, featuredItem]);

  const counts = sourceCounts(sortedByType);
  const total = countSources(sortedByType);

  const categoryOrder = useMemo(() => {
    const priority = (key) => {
      if (featuredItem?.sourceType === key) return 2;
      if (sortedByType[key]?.some((x) => x.pinned)) return 1;
      return 0;
    };
    return [...defaultOrder].sort((a, b) => priority(b) - priority(a));
  }, [sortedByType, featuredItem]);

  const tabs = [
    { key: 'all', label: `All (${total})` },
    { key: 'media', label: `${SOURCE_TYPE_ICONS.media} Media (${counts.media})` },
    { key: 'x_post', label: `${SOURCE_TYPE_ICONS.x_post} Posts (${counts.x_post})` },
    { key: 'news_article', label: `${SOURCE_TYPE_ICONS.news_article} Articles (${counts.news_article})` },
    { key: 'admin_note', label: `${SOURCE_TYPE_ICONS.admin_note} Notes (${counts.admin_note})` },
  ].filter((t) => {
    if (t.key === 'all') return total > 0;
    return counts[t.key] > 0;
  });

  const AddEvidenceBar = () => (
    <div className="id-drawer-add-bar">
      <span className="id-drawer-add-bar__label">Add evidence</span>
      {defaultOrder.map((type) => (
        <button
          key={type}
          type="button"
          className="id-drawer-add-bar__btn"
          onClick={() => onAddEvidence?.(event.id, type)}
          title={`Add ${SOURCE_TYPE_LABELS[type]}`}
        >
          {SOURCE_TYPE_ICONS[type]} {Icons.plus} {SOURCE_TYPE_LABELS[type]}
        </button>
      ))}
    </div>
  );

  const SectionTitle = ({ type, title, count, featured, pinned }) => (
    <div className="id-evidence-section__title">
      <span>
        {SOURCE_TYPE_ICONS[type]} {title} ({count})
        {featured && <span className="id-section-badge id-section-badge--featured">{Icons.star} Featured</span>}
        {!featured && pinned && <span className="id-section-badge id-section-badge--pinned">{Icons.pin} Pinned</span>}
      </span>
      {isAdmin && (
        <button type="button" className="id-evidence-section__add" onClick={() => onAddEvidence?.(event.id, type)}>
          {Icons.plus} Add
        </button>
      )}
    </div>
  );

  const renderSection = (type, title) => {
    const items = sortedByType[type];
    if (!items?.length) return null;
    const hasFeatured = items.some((item) => isFeatured(type, item));
    const hasPinned = items.some((item) => item.pinned);
    return (
      <div className="id-evidence-section" key={type}>
        <SectionTitle type={type} title={title} count={items.length} featured={hasFeatured} pinned={hasPinned} />
        {type === 'media' ? (
          mediaLayout === 'grid' ? (
            <div className="id-media-grid">
              {items.map((item) =>
                isAdmin ? (
                  <AdminMediaThumb
                    key={item.id}
                    item={item}
                    onClick={() => onMediaClick?.(items, items.indexOf(item))}
                    onEdit={() => onEditEvidence?.(event.id, 'media', item)}
                    onDelete={() => onDeleteEvidence?.(event.id, 'media', item.id)}
                    onPin={() => onPinEvidence?.(event.id, 'media', item.id, !item.pinned)}
                    onFeature={() => onFeatureEvidence?.(event.id, { sourceType: 'media', sourceId: item.id })}
                    featured={isFeatured('media', item)}
                  />
                ) : (
                  <MediaThumb
                    key={item.id}
                    item={item}
                    onClick={() => onMediaClick?.(items, items.indexOf(item))}
                  />
                )
              )}
            </div>
          ) : mediaLayout === 'grid-carousel' ? (
            <GridCarousel
              items={items}
              pageSize={4}
              renderItem={(item) => {
                const idx = items.indexOf(item);
                const featured = isFeatured('media', item);
                return isAdmin ? (
                  <div className="id-twitter-grid__cell">
                    <button
                      type="button"
                      className="id-media-thumb"
                      onClick={() => onMediaClick?.(items, idx)}
                    >
                      <img src={item.url} alt={item.caption} loading="lazy" />
                      {featured && (
                        <span className="id-featured-badge">
                          {Icons.star} Featured
                        </span>
                      )}
                      {item.pinned && !featured && (
                        <span className="id-pinned-badge">
                          {Icons.pin} Pinned
                        </span>
                      )}
                      {item.caption && <div className="id-media-thumb__caption">{item.caption}</div>}
                    </button>
                    <div className="id-admin-media__toolbar">
                      {onFeatureEvidence && (
                        <button
                          type="button"
                          className={featured ? 'feature active' : 'feature'}
                          onClick={() => onFeatureEvidence?.(event.id, { sourceType: 'media', sourceId: item.id })}
                          title={featured ? 'Remove from update card' : 'Feature in update card'}
                        >
                          {Icons.star}
                        </button>
                      )}
                      <button
                        type="button"
                        className={item.pinned ? 'pin active' : 'pin'}
                        onClick={() => onPinEvidence?.(event.id, 'media', item.id, !item.pinned)}
                        title={item.pinned ? 'Unpin from top' : 'Pin to top'}
                      >
                        {Icons.pin}
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditEvidence?.(event.id, 'media', item)}
                        title="Edit"
                      >
                        {Icons.edit}
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => onDeleteEvidence?.(event.id, 'media', item.id)}
                        title="Delete"
                      >
                        {Icons.trash}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="id-twitter-grid__cell"
                    onClick={() => onMediaClick?.(items, idx)}
                  >
                    <img src={item.url} alt={item.caption} loading="lazy" />
                    {item.caption && <div className="id-media-thumb__caption">{item.caption}</div>}
                  </button>
                );
              }}
            />
          ) : (
            <Carousel
              items={items}
              itemWidth={mediaItemWidth}
              gap={12}
              renderItem={(item) =>
                isAdmin ? (
                  <AdminMediaThumb
                    item={item}
                    onClick={() => onMediaClick?.(items, items.indexOf(item))}
                    onEdit={() => onEditEvidence?.(event.id, 'media', item)}
                    onDelete={() => onDeleteEvidence?.(event.id, 'media', item.id)}
                    onPin={() => onPinEvidence?.(event.id, 'media', item.id, !item.pinned)}
                    onFeature={() => onFeatureEvidence?.(event.id, { sourceType: 'media', sourceId: item.id })}
                    featured={isFeatured('media', item)}
                  />
                ) : (
                  <MediaThumb item={item} onClick={() => onMediaClick?.(items, items.indexOf(item))} carousel />
                )
              }
            />
          )
        ) : type === 'x_post' ? (
          <XPostCompactList
            posts={items}
            mode={mode}
            onEditItem={(item) => onEditEvidence?.(event.id, 'x_post', item)}
            onDeleteItem={(itemId) => onDeleteEvidence?.(event.id, 'x_post', itemId)}
            onPinItem={(item) => onPinEvidence?.(event.id, 'x_post', item.id, !item.pinned)}
            onFeatureItem={(itemId) => onFeatureEvidence?.(event.id, { sourceType: 'x_post', sourceId: itemId })}
            onArchiveSource={onArchiveSource ? (item) => onArchiveSource?.(event.id, item) : undefined}
            onCheckSource={onCheckSource ? (item) => onCheckSource?.(event.id, item) : undefined}
            onAutoCheck={onAutoCheck ? (item) => onAutoCheck?.(event.id, item) : undefined}
            featuredId={featuredItem?.sourceType === 'x_post' ? featuredItem.sourceId || featuredItem.itemId : null}
          />
        ) : type === 'news_article' ? (
          <div className="id-editable-list">
            {items.map((item) =>
              isAdmin ? (
                <EditableArticleCard
                  key={item.id}
                  article={item}
                  onEdit={() => onEditEvidence?.(event.id, 'news_article', item)}
                  onDelete={() => onDeleteEvidence?.(event.id, 'news_article', item.id)}
                  onPin={() => onPinEvidence?.(event.id, 'news_article', item.id, !item.pinned)}
                  onFeature={() => onFeatureEvidence?.(event.id, { sourceType: 'news_article', sourceId: item.id })}
                  featured={isFeatured('news_article', item)}
                />
              ) : (
                <ArticleCard key={item.id} article={item} />
              )
            )}
          </div>
        ) : (
          <div className="id-editable-list">
            {items.map((item) =>
              isAdmin ? (
                <EditableAdminNoteCard
                  key={item.id}
                  note={item}
                  onEdit={() => onEditEvidence?.(event.id, 'admin_note', item)}
                  onDelete={() => onDeleteEvidence?.(event.id, 'admin_note', item.id)}
                  onPin={() => onPinEvidence?.(event.id, 'admin_note', item.id, !item.pinned)}
                  onFeature={() => onFeatureEvidence?.(event.id, { sourceType: 'admin_note', sourceId: item.id })}
                  featured={isFeatured('admin_note', item)}
                />
              ) : (
                <AdminNoteCard key={item.id} note={item} />
              )
            )}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (!autoScrollFeatured || !featuredItem) return;
    const timer = setTimeout(() => {
      const el = document.querySelector('[data-featured="true"]');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
    return () => clearTimeout(timer);
  }, [autoScrollFeatured, featuredItem?.sourceType, featuredItem?.sourceId, activeTab]);

  return (
    <div>
      {isAdmin && <AddEvidenceBar />}
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
      {total === 0 ? (
        <div className="id-evidence-empty">No evidence attached to this update.</div>
      ) : (
        <>
          {activeTab === 'all' && categoryOrder.map((type) => counts[type] > 0 && renderSection(type, SOURCE_TYPE_LABELS[type]))}
          {activeTab === 'media' && renderSection('media', SOURCE_TYPE_LABELS.media)}
          {activeTab === 'x_post' && renderSection('x_post', SOURCE_TYPE_LABELS.x_post)}
          {activeTab === 'news_article' && renderSection('news_article', SOURCE_TYPE_LABELS.news_article)}
          {activeTab === 'admin_note' && renderSection('admin_note', SOURCE_TYPE_LABELS.admin_note)}
        </>
      )}
    </div>
  );
}
