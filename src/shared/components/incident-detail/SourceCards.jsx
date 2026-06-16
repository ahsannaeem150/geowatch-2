import React, { useState } from 'react';
import { Icons, SOURCE_TYPE_ICONS } from './IncidentIcons.jsx';

export function MediaThumb({ item, onClick, carousel }) {
  return (
    <button className={`id-media-thumb ${carousel ? 'id-media-thumb--carousel' : ''}`} onClick={() => onClick?.(item)}>
      <img src={item.url} alt={item.caption} />
      {item.caption && <div className="id-media-thumb__caption">{item.caption}</div>}
    </button>
  );
}

export function MediaGrid({ items, onItemClick, maxVisible = 4, featuredId = null }) {
  if (!items?.length) return null;
  return (
    <div className="id-media-grid">
      {items.map((item) => (
        <MediaThumb key={item.id} item={item} onClick={onItemClick} />
      ))}
    </div>
  );
}

export function AdminMediaThumb({ item, onClick, onEdit, onDelete, onPin, onFeature, featured }) {
  return (
    <div className="id-admin-media" data-featured={featured || undefined}>
      <button type="button" className="id-media-thumb id-media-thumb--carousel" onClick={() => onClick?.(item)}>
        <img src={item.url} alt={item.caption} />
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
        {onFeature && (
          <button
            type="button"
            className={featured ? 'feature active' : 'feature'}
            onClick={onFeature}
            title={featured ? 'Remove from update card' : 'Feature in update card'}
          >
            {Icons.star}
          </button>
        )}
        <button
          type="button"
          className={item.pinned ? 'pin active' : 'pin'}
          onClick={onPin}
          title={item.pinned ? 'Unpin from top' : 'Pin to top'}
        >
          {Icons.pin}
        </button>
        <button type="button" onClick={onEdit} title="Edit">
          {Icons.edit}
        </button>
        <button type="button" className="danger" onClick={onDelete} title="Delete">
          {Icons.trash}
        </button>
      </div>
    </div>
  );
}

export function ArticleCard({ article, isFeatured = false }) {
  return (
    <a href={article.url} target="_blank" rel="noreferrer" className="id-article">
      <span className="id-article__icon">{Icons.link}</span>
      <div className="id-article__body">
        <div className="id-article__title">{article.title}</div>
        <div className="id-article__pub">{article.publisher}</div>
      </div>
      {Icons.external}
    </a>
  );
}

export function AdminNoteCard({ note, isFeatured = false }) {
  const [expanded, setExpanded] = useState(false);
  const TRUNCATE_AT = 140;
  const isLong = note.text?.length > TRUNCATE_AT;
  const displayText = expanded || !isLong ? note.text : `${note.text.slice(0, TRUNCATE_AT)}…`;

  return (
    <div className="id-note">
      <div className="id-note__label">
        {SOURCE_TYPE_ICONS.admin_note} Admin note · {note.author}
      </div>
      <div className="id-note__text">{displayText}</div>
      {isLong && (
        <button type="button" className="id-note__more" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}

function EvidenceToolbar({ item, onEdit, onDelete, onPin, onFeature, featured }) {
  return (
    <div className="id-evidence-toolbar">
      {onFeature && (
        <button
          type="button"
          className={featured ? 'id-evidence-toolbar__btn id-evidence-toolbar__btn--feature active' : 'id-evidence-toolbar__btn'}
          onClick={onFeature}
          title={featured ? 'Remove from update card' : 'Feature this item in the update card'}
        >
          {Icons.star} {featured ? 'Featured' : 'Feature'}
        </button>
      )}
      <button
        type="button"
        className={item.pinned ? 'id-evidence-toolbar__btn id-evidence-toolbar__btn--pin active' : 'id-evidence-toolbar__btn'}
        onClick={onPin}
        title={item.pinned ? 'Unpin from top' : 'Pin to top of this list'}
      >
        {Icons.pin} {item.pinned ? 'Pinned' : 'Pin to top'}
      </button>
      <button type="button" className="id-evidence-toolbar__btn" onClick={onEdit}>
        {Icons.edit} Edit
      </button>
      <button type="button" className="id-evidence-toolbar__btn id-evidence-toolbar__btn--danger" onClick={onDelete}>
        {Icons.trash} Delete
      </button>
    </div>
  );
}

export function EditableArticleCard({ article, onEdit, onDelete, onPin, onFeature, featured }) {
  return (
    <div className={`id-editable-card ${featured ? 'id-editable-card--featured' : ''}`} data-featured={featured || undefined}>
      <EvidenceToolbar item={article} onEdit={onEdit} onDelete={onDelete} onPin={onPin} onFeature={onFeature} featured={featured} />
      <ArticleCard article={article} isFeatured={featured} />
    </div>
  );
}

export function EditableAdminNoteCard({ note, onEdit, onDelete, onPin, onFeature, featured }) {
  const [expanded, setExpanded] = useState(false);
  const TRUNCATE_AT = 140;
  const isLong = note.text?.length > TRUNCATE_AT;
  const displayText = expanded || !isLong ? note.text : `${note.text.slice(0, TRUNCATE_AT)}…`;

  return (
    <div className={`id-editable-card id-note ${featured ? 'id-editable-card--featured' : ''}`} data-featured={featured || undefined}>
      <EvidenceToolbar item={note} onEdit={onEdit} onDelete={onDelete} onPin={onPin} onFeature={onFeature} featured={featured} />
      <div className="id-note__label">
        {SOURCE_TYPE_ICONS.admin_note} Admin note · {note.author}
      </div>
      <div className="id-note__text">{displayText}</div>
      {isLong && (
        <button type="button" className="id-note__more" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}
