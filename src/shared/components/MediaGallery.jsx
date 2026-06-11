import { useState } from 'react';
import { Camera, Video, X } from 'lucide-react';
import { MediaLightbox } from './MediaLightbox.jsx';

/**
 * MediaGallery — Thumbnail grid with lightbox viewer.
 *
 * Props:
 *   - media: Array<{ id, file_url, thumbnail_url, file_type, width, height, original_name }>
 *   - onDelete: (mediaId) => void
 *   - canEdit: boolean
 */
export function MediaGallery({ media, onDelete, canEdit = false }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);

  if (!media || media.length === 0) return null;

  const images = media.filter((m) => m.file_type === 'image');
  const videos = media.filter((m) => m.file_type === 'video');

  return (
    <div className="media-gallery">
      {images.length > 0 && (
        <div className="media-section">
          <h4 className="media-section-title">
            <Camera size={14} />
            Photos <span className="media-section-count">({images.length})</span>
          </h4>
          <div className="media-grid">
            {images.map((item, index) => (
              <div
                key={item.id}
                className="media-grid-item"
                onClick={() => setLightboxIndex(index)}
              >
                <img
                  src={item.thumbnail_url || item.file_url}
                  alt={item.original_name}
                  loading="lazy"
                  className="media-thumb"
                />
                {canEdit && (
                  <button
                    className="media-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(item.id);
                    }}
                    title="Delete"
                    aria-label="Delete media"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {videos.length > 0 && (
        <div className="media-section">
          <h4 className="media-section-title">
            <Video size={14} />
            Videos <span className="media-section-count">({videos.length})</span>
          </h4>
          <div className="media-grid">
            {videos.map((item) => (
              <div
                key={item.id}
                className="media-grid-item media-video-item"
              >
                <video
                  src={item.file_url}
                  className="media-thumb"
                  preload="metadata"
                  controls
                />
                {canEdit && (
                  <button
                    className="media-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(item.id);
                    }}
                    title="Delete"
                    aria-label="Delete media"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {lightboxIndex !== null && (
        <MediaLightbox
          items={images}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
