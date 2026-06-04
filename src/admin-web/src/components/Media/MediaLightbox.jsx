import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

/**
 * MediaLightbox — Full-screen image viewer with keyboard navigation.
 *
 * Props:
 *   - items: Array of media objects
 *   - startIndex: number
 *   - onClose: () => void
 */
export function MediaLightbox({ items, startIndex = 0, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [loaded, setLoaded] = useState(false);

  const current = items[currentIndex];

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % items.length);
    setLoaded(false);
  }, [items.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + items.length) % items.length);
    setLoaded(false);
  }, [items.length]);

  // Keyboard navigation + body scroll lock
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose, goNext, goPrev]);

  if (!current) return null;

  return (
    <div className="media-lightbox" onClick={onClose}>
      <div className="media-lightbox-backdrop" />

      <div
        className="media-lightbox-content"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="media-lightbox-close"
          onClick={onClose}
          aria-label="Close lightbox"
        >
          <X size={28} />
        </button>

        {items.length > 1 && (
          <>
            <button
              className="media-lightbox-nav prev"
              onClick={goPrev}
              aria-label="Previous image"
            >
              <ChevronLeft size={28} />
            </button>
            <button
              className="media-lightbox-nav next"
              onClick={goNext}
              aria-label="Next image"
            >
              <ChevronRight size={28} />
            </button>
          </>
        )}

        <div className="media-lightbox-image-wrap">
          {!loaded && (
            <div className="media-lightbox-loader">
              <Loader2 size={24} className="media-lightbox-spinner" />
            </div>
          )}
          <img
            src={current.file_url}
            alt={current.original_name}
            className={`media-lightbox-image ${loaded ? 'loaded' : ''}`}
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
          />
        </div>

        <div className="media-lightbox-info">
          <span className="media-lightbox-counter">
            {currentIndex + 1} / {items.length}
          </span>
          <span className="media-lightbox-name">{current.original_name}</span>
          {current.width && current.height && (
            <span className="media-lightbox-dims">
              {current.width} × {current.height}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
