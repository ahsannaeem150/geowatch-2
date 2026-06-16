import React, { useState } from 'react';
import { formatDate, formatTime, parseCoordinates } from './IncidentUtils.js';

function CopyButton({ text, label = 'Copy', compact = false }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`id-copy-btn ${compact ? 'id-copy-btn--compact' : ''}`}
      title="Copy to clipboard"
    >
      {copied ? 'Copied' : label}
    </button>
  );
}

export default function DebugMetadata({ incident }) {
  const [open, setOpen] = useState(false);
  const coords = parseCoordinates(incident.coordinates || (incident.latitude != null && incident.longitude != null ? `${incident.latitude},${incident.longitude}` : null));
  return (
    <div className="id-debug-meta">
      <button type="button" className="id-debug-meta__header" onClick={() => setOpen((v) => !v)}>
        <span>Debug Metadata</span>
        <span className="id-debug-meta__chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="id-debug-meta__body">
          <div className="id-debug-meta__grid">
            <div className="id-debug-meta__field">
              <span>Incident ID</span>
              <span>{incident.id}</span>
            </div>
            <div className="id-debug-meta__field">
              <span>Created by</span>
              <span>{incident.createdByName || incident.createdBy || '—'}</span>
            </div>
            <div className="id-debug-meta__field">
              <span>Created at</span>
              <span>
                {formatDate(incident.createdAt)} · {formatTime(incident.createdAt)}
              </span>
            </div>
            <div className="id-debug-meta__field">
              <span>Updated at</span>
              <span>
                {incident.updatedAt ? `${formatDate(incident.updatedAt)} · ${formatTime(incident.updatedAt)}` : '—'}
              </span>
            </div>
            <div className="id-debug-meta__field">
              <span>Category ID</span>
              <span>{incident.categoryId || '—'}</span>
            </div>
            <div className="id-debug-meta__field">
              <span>Zone category ID</span>
              <span>{incident.zoneCategoryId || '—'}</span>
            </div>
            <div className="id-debug-meta__field">
              <span>Geometry</span>
              <span>{incident.geometryType || 'Point'}</span>
            </div>
            <div className="id-debug-meta__field">
              <span>Verification override</span>
              <span>{incident.verificationOverride || 'none'}</span>
            </div>
          </div>
          <div className="id-debug-meta__raw">
            <div className="id-debug-meta__raw-row">
              <span>Incident ID</span>
              <span>{incident.id}</span>
              <CopyButton text={incident.id} compact />
            </div>
            <div className="id-debug-meta__raw-row">
              <span>Created by ID</span>
              <span>{incident.createdBy || '—'}</span>
              <CopyButton text={incident.createdBy || ''} compact />
            </div>
            {coords && (
              <div className="id-debug-meta__raw-row">
                <span>Coordinates</span>
                <span>
                  {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                </span>
                <CopyButton text={`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`} compact />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
