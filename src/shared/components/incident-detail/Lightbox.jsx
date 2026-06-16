import React, { useCallback, useEffect, useState } from 'react';
import { Icons } from './IncidentIcons.jsx';

export default function Lightbox({ items, startIndex = 0, onClose }) {
  const [index, setIndex] = useState(startIndex);
  const current = items[index];

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % items.length);
  }, [items.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, goNext, goPrev]);

  if (!current) return null;

  return (
    <div className="id-lightbox" onClick={onClose}>
      <button className="id-lightbox__close" aria-label="Close">
        ×
      </button>

      {items.length > 1 && (
        <>
          <button
            className="id-lightbox__nav id-lightbox__nav--prev"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="Previous"
          >
            {Icons.chevronLeft}
          </button>
          <button
            className="id-lightbox__nav id-lightbox__nav--next"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="Next"
          >
            {Icons.chevronRight}
          </button>
        </>
      )}

      <div className="id-lightbox__content" onClick={(e) => e.stopPropagation()}>
        <img src={current.url} alt={current.caption} />
        {current.caption && <div className="id-lightbox__caption">{current.caption}</div>}
        {items.length > 1 && (
          <div className="id-lightbox__counter">
            {index + 1} / {items.length}
          </div>
        )}
      </div>
    </div>
  );
}
