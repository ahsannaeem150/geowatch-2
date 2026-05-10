import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../../services/api.js';
import { Button } from '@shared/components/Button.jsx';
import { Badge } from '@shared/components/Badge.jsx';
import { SeverityBadge } from '@shared/components/SeverityBadge.jsx';
import TimelineEntry from '@shared/components/TimelineEntry.jsx';
import { CATEGORY_LABELS, SEVERITY_SCALE, CATEGORY_COLORS } from '@shared/constants.js';
import { format } from 'date-fns';

export default function EventDetailPanel({ incidentId, onEdit, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Timeline state
  const [expandedUpdateId, setExpandedUpdateId] = useState(null);
  const [isAddingUpdate, setIsAddingUpdate] = useState(false);
  const [editingUpdateId, setEditingUpdateId] = useState(null);
  const [newSummary, setNewSummary] = useState('');
  const [newUpdateDate, setNewUpdateDate] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editUpdateDate, setEditUpdateDate] = useState('');
  const [editSourceUrl, setEditSourceUrl] = useState('');
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = latest first, 'asc' = oldest first

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.getIncident(incidentId);
      setData(res.data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [incidentId]);

  const resetAddForm = () => {
    setIsAddingUpdate(false);
    setNewSummary('');
    setNewUpdateDate('');
    setNewSourceUrl('');
  };

  const resetEditForm = () => {
    setEditingUpdateId(null);
    setEditSummary('');
    setEditUpdateDate('');
    setEditSourceUrl('');
  };

  const handleAddUpdate = async () => {
    if (!newSummary.trim()) return;
    setTimelineLoading(true);
    try {
      await api.addTimeline(incidentId, {
        summary: newSummary.trim(),
        updateDate: newUpdateDate ? new Date(newUpdateDate).toISOString() : undefined,
        sourceUrl: newSourceUrl.trim() || undefined,
      });
      resetAddForm();
      await fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleEditUpdate = async (updateId) => {
    if (!editSummary.trim()) return;
    setTimelineLoading(true);
    try {
      const payload = {
        summary: editSummary.trim(),
        updateDate: editUpdateDate ? new Date(editUpdateDate).toISOString() : undefined,
      };
      // Only send sourceUrl if it was changed (undefined = don't touch, empty = clear)
      if (editSourceUrl !== undefined) {
        payload.sourceUrl = editSourceUrl.trim() || null;
      }
      await api.updateTimeline(incidentId, updateId, payload);
      resetEditForm();
      await fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleDeleteUpdate = async (updateId) => {
    if (!confirm('Are you sure you want to delete this timeline update?')) return;
    setTimelineLoading(true);
    try {
      await api.deleteTimeline(incidentId, updateId);
      await fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setTimelineLoading(false);
    }
  };

  const startEditing = (update) => {
    setEditingUpdateId(update.id);
    setEditSummary(update.summary);
    setEditUpdateDate(format(new Date(update.update_date), "yyyy-MM-dd'T'HH:mm"));
    setEditSourceUrl(update.source_url || '');
    setExpandedUpdateId(update.id);
  };

  const sortedTimeline = useMemo(() => {
    if (!data?.timeline) return [];
    const sorted = [...data.timeline];
    sorted.sort((a, b) => {
      const diff = new Date(a.update_date) - new Date(b.update_date);
      return sortOrder === 'asc' ? diff : -diff;
    });
    return sorted;
  }, [data?.timeline, sortOrder]);

  if (loading) {
    return (
      <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>
        Loading incident details...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', color: 'var(--danger)' }}>
        {error}
      </div>
    );
  }

  if (!data) return null;

  const { incident, sources, timeline } = data;
  const catColor = CATEGORY_COLORS[incident.category];

  const sectionTitle = (text) => (
    <h4
      style={{
        fontSize: '12px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '1px',
        color: 'var(--text-muted)',
        marginBottom: '10px',
        marginTop: '20px',
      }}
    >
      {text}
    </h4>
  );

  const inputBase = {
    background: 'var(--bg-deep)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    width: '100%',
    outline: 'none',
  };

  const labelBase = {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: 600,
    display: 'block',
    marginBottom: '6px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div
        style={{
          padding: '20px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: '16px',
            bottom: '16px',
            width: '3px',
            borderRadius: '0 2px 2px 0',
            background: catColor,
            opacity: 0.7,
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <Badge category={incident.category}>{CATEGORY_LABELS[incident.category]}</Badge>
          <Badge status={incident.status}>{incident.status}</Badge>
        </div>
        <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px', lineHeight: 1.2 }}>
          {incident.title}
        </h2>
        <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          {parseFloat(incident.latitude ?? 0).toFixed(4)}, {parseFloat(incident.longitude ?? 0).toFixed(4)}
        </p>
      </div>

      {/* Meta */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
        }}
      >
        <MetaItem label="Severity" severity={incident.severity} />
        <MetaItem label="Start" date={format(new Date(incident.start_date), 'MMM dd, yyyy')} time={format(new Date(incident.start_date), 'h:mm a')} />
        <MetaItem label="End" date={incident.end_date ? format(new Date(incident.end_date), 'MMM dd, yyyy') : 'Ongoing'} time={incident.end_date ? format(new Date(incident.end_date), 'h:mm a') : null} />
        <MetaItem label="Created" date={format(new Date(incident.created_at), 'MMM dd, yyyy')} time={format(new Date(incident.created_at), 'h:mm a')} />
      </div>

      {/* Description */}
      {incident.description && (
        <div>
          {sectionTitle('Description')}
          <p
            style={{
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              fontSize: '13px',
              background: 'var(--bg-input)',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {incident.description}
          </p>
        </div>
      )}

      {/* Sources */}
      {sources.length > 0 && (
        <div>
          {sectionTitle('Sources')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sources.map((src) => (
              <SourceItem key={src.id} source={src} />
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div>
        {/* Timeline Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
            marginTop: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h4
              style={{
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: 'var(--text-muted)',
                margin: 0,
              }}
            >
              Updates
            </h4>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--accent-light)',
                background: 'rgba(159, 18, 57, 0.12)',
                padding: '2px 8px',
                borderRadius: '10px',
              }}
            >
              {timeline.length}
            </span>
          </div>
          <button
            onClick={() => setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {sortOrder === 'desc' ? 'Latest first' : 'Oldest first'} ↕
          </button>
        </div>

        {/* Add Update button */}
        {!isAddingUpdate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsAddingUpdate(true);
              setNewUpdateDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
            }}
            style={{ marginBottom: '12px' }}
          >
            + Add Update
          </Button>
        )}

        {/* Add Update Inline Form */}
        {isAddingUpdate && (
          <div
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-hover)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <label style={labelBase}>Update Summary</label>
            <textarea
              value={newSummary}
              onChange={(e) => setNewSummary(e.target.value)}
              rows={3}
              placeholder="Describe the latest development..."
              style={{ ...inputBase, resize: 'vertical', marginBottom: '10px' }}
            />
            <label style={labelBase}>Date & Time</label>
            <input
              type="datetime-local"
              value={newUpdateDate}
              onChange={(e) => setNewUpdateDate(e.target.value)}
              style={{ ...inputBase, fontFamily: 'var(--font-mono)', marginBottom: '10px', padding: '8px 12px' }}
            />
            <label style={labelBase}>X / Twitter Post URL (optional)</label>
            <input
              type="url"
              value={newSourceUrl}
              onChange={(e) => setNewSourceUrl(e.target.value)}
              placeholder="https://x.com/..."
              style={{ ...inputBase, fontFamily: 'var(--font-mono)', marginBottom: '12px', padding: '8px 12px' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddUpdate}
                disabled={!newSummary.trim() || timelineLoading}
              >
                {timelineLoading ? 'Saving...' : 'Save Update'}
              </Button>
              <Button variant="ghost" size="sm" onClick={resetAddForm}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Timeline entries */}
        <div>
          {sortedTimeline.length === 0 && !isAddingUpdate && (
            <div
              style={{
                textAlign: 'center',
                padding: '32px 20px',
                color: 'var(--text-muted)',
                fontSize: '13px',
                border: '1px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.5 }}>📝</div>
              <div>No updates yet.</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>Click "+ Add Update" to add the first entry.</div>
            </div>
          )}

          {sortedTimeline.map((update, index) => {
            const isEditing = editingUpdateId === update.id;

            if (isEditing) {
              return (
                <div
                  key={update.id}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-hover)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    marginBottom: '14px',
                  }}
                >
                  <label style={labelBase}>Edit Summary</label>
                  <textarea
                    value={editSummary}
                    onChange={(e) => setEditSummary(e.target.value)}
                    rows={3}
                    style={{ ...inputBase, resize: 'vertical', marginBottom: '10px' }}
                  />
                  <label style={labelBase}>Date & Time</label>
                  <input
                    type="datetime-local"
                    value={editUpdateDate}
                    onChange={(e) => setEditUpdateDate(e.target.value)}
                    style={{ ...inputBase, fontFamily: 'var(--font-mono)', marginBottom: '10px', padding: '8px 12px' }}
                  />
                  <label style={labelBase}>X / Twitter Post URL (optional)</label>
                  <input
                    type="url"
                    value={editSourceUrl}
                    onChange={(e) => setEditSourceUrl(e.target.value)}
                    placeholder="https://x.com/..."
                    style={{ ...inputBase, fontFamily: 'var(--font-mono)', marginBottom: '12px', padding: '8px 12px' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleEditUpdate(update.id)}
                      disabled={!editSummary.trim() || timelineLoading}
                    >
                      {timelineLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={resetEditForm}>
                      Cancel
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <TimelineEntry
                key={update.id}
                update={update}
                isLatest={sortOrder === 'desc' ? index === 0 : index === sortedTimeline.length - 1}
                isExpanded={expandedUpdateId === update.id}
                onToggle={() =>
                  setExpandedUpdateId(expandedUpdateId === update.id ? null : update.id)
                }
                isAdmin={true}
                onEdit={() => startEditing(update)}
                onDelete={() => handleDeleteUpdate(update.id)}
                isFirst={index === 0}
                isLast={index === sortedTimeline.length - 1}
              />
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
        <Button variant="primary" onClick={() => onEdit?.(incident)}>
          Edit Incident
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

function MetaItem({ label, value, date, time, severity }) {
  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '14px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          fontSize: '10px',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '1.2px',
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      {severity !== undefined && (
        <div style={{ marginTop: '8px' }}>
          <SeverityBadge level={severity} wide />
        </div>
      )}
      {value && (
        <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '6px', letterSpacing: '-0.2px' }}>
          {value}
        </p>
      )}
      {date && (
        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '6px', letterSpacing: '-0.2px' }}>
          {date}
        </p>
      )}
      {time && (
        <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
          {time}
        </p>
      )}
    </div>
  );
}

function SourceItem({ source }) {
  const embedRef = useRef(null);

  // Force dark theme on all Twitter embeds (new + existing in DB)
  const darkEmbedHtml = source.embed_html
    ? source.embed_html.replace(
        /class="twitter-tweet"/g,
        'class="twitter-tweet" data-theme="dark"'
      )
    : null;

  useEffect(() => {
    if (darkEmbedHtml && embedRef.current && window.twttr?.widgets) {
      window.twttr.widgets.load(embedRef.current);
    }
  }, [darkEmbedHtml]);

  if (darkEmbedHtml) {
    return (
      <div
        style={{
          background: 'var(--bg-input)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
        }}
      >
        <div
          ref={embedRef}
          style={{ padding: '12px' }}
          dangerouslySetInnerHTML={{ __html: darkEmbedHtml }}
        />
        {source.description && (
          <p style={{ padding: '0 12px 12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            {source.description}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--bg-input)',
        padding: '12px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <Badge category={source.source_type === 'x_post' ? 'diplomacy' : source.source_type === 'news_article' ? 'info' : 'other'}>
          {source.source_type}
        </Badge>
        {source.source_url && (
          <a
            href={source.source_url}
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--accent-light)', fontSize: '12px', textDecoration: 'none' }}
          >
            View source →
          </a>
        )}
      </div>
      {source.description && (
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{source.description}</p>
      )}
    </div>
  );
}
