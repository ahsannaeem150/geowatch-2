import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from './IncidentIcons.jsx';

const PlayIcon = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);
const PauseIcon = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
  </svg>
);
const MuteIcon = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);
const VolumeIcon = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

function fmtTime(s) {
  if (!Number.isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

// Custom lightbox video player (mobile-style): click toggles play, draggable
// seek slider, time readout, mute toggle. Native controls are intentionally
// off so the UI is consistent; codec failures show an explicit fallback.
function LightboxVideo({ src, poster }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(NaN);
  const [muted, setMuted] = useState(true); // start muted so autoplay is allowed
  const [error, setError] = useState(false);
  const [seeking, setSeeking] = useState(false);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const onSeek = (e) => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration)) return;
    const t = (Number(e.target.value) / 1000) * v.duration;
    v.currentTime = t;
    setTime(t);
  };

  if (error) {
    return (
      <div className="id-lightbox__video-error">
        <p>This video format is not supported by your browser.</p>
        <a href={src} target="_blank" rel="noreferrer" className="id-lightbox__video-error-link">
          Download / open video directly
        </a>
      </div>
    );
  }

  const progress = Number.isFinite(duration) && duration > 0 ? (time / duration) * 1000 : 0;

  return (
    <div className="id-lightbox__video">
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        autoPlay
        muted
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={() => {
          if (!seeking && videoRef.current) setTime(videoRef.current.currentTime);
        }}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration)}
        onEnded={() => setPlaying(false)}
        onError={() => setError(true)}
      />
      {!playing && (
        <button
          type="button"
          className="id-lightbox__video-bigplay"
          onClick={togglePlay}
          aria-label="Play"
        >
          {PlayIcon}
        </button>
      )}
      <div className="id-lightbox__video-controls" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="id-lightbox__video-btn"
          onClick={togglePlay}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? PauseIcon : PlayIcon}
        </button>
        <span className="id-lightbox__video-time">
          {fmtTime(time)} / {fmtTime(duration)}
        </span>
        <input
          type="range"
          className="id-lightbox__video-seek"
          min="0"
          max="1000"
          value={progress}
          onChange={onSeek}
          onPointerDown={() => setSeeking(true)}
          onPointerUp={() => setSeeking(false)}
          aria-label="Seek"
        />
        <button
          type="button"
          className="id-lightbox__video-btn"
          onClick={() => {
            const v = videoRef.current;
            if (!v) return;
            v.muted = !v.muted;
            setMuted(v.muted);
          }}
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? MuteIcon : VolumeIcon}
        </button>
      </div>
    </div>
  );
}

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

  // Rendered via portal to <body>: position:fixed must resolve against the
  // viewport. Inside drawer/panel containers (transform animations, local
  // stacking contexts) the overlay gets clipped or painted UNDER the drawer
  // (.id-drawer z-200 / .zone-drawer z-300 vs .id-lightbox z-1000).
  return createPortal(
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
        {current.type === 'video' && current.videoUrl ? (
          <LightboxVideo key={current.videoUrl} src={current.videoUrl} poster={current.url} />
        ) : (
          <img src={current.url} alt={current.caption} />
        )}
        {current.caption && <div className="id-lightbox__caption">{current.caption}</div>}
        {items.length > 1 && (
          <div className="id-lightbox__counter">
            {index + 1} / {items.length}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
