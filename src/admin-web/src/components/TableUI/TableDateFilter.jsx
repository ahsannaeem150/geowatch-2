import React, { useEffect, useRef, useState } from 'react';
import { format, subDays, startOfMonth } from 'date-fns';
import { Calendar, ChevronDown } from 'lucide-react';
import './table-ui.css';

function toISODate(d) {
  return format(d, 'yyyy-MM-dd');
}

function parseISODate(v) {
  return new Date(`${v}T00:00:00`);
}

export const ALL_TIME_FILTER = { preset: 'all', from: '', to: '' };

const PRESETS = [
  {
    key: 'today',
    label: 'Today',
    range: () => ({ from: toISODate(new Date()), to: toISODate(new Date()) }),
  },
  {
    key: 'yesterday',
    label: 'Yesterday',
    range: () => {
      const y = subDays(new Date(), 1);
      return { from: toISODate(y), to: toISODate(y) };
    },
  },
  {
    key: 'last7',
    label: 'Last 7 days',
    range: () => ({ from: toISODate(subDays(new Date(), 6)), to: toISODate(new Date()) }),
  },
  {
    key: 'last30',
    label: 'Last 30 days',
    range: () => ({ from: toISODate(subDays(new Date(), 29)), to: toISODate(new Date()) }),
  },
  {
    key: 'month',
    label: 'This month',
    range: () => ({ from: toISODate(startOfMonth(new Date())), to: toISODate(new Date()) }),
  },
  { key: 'all', label: 'All time', range: () => ({ from: '', to: '' }) },
];

export function getDateFilterLabel(df) {
  if (!df || df.preset === 'all' || (!df.from && !df.to)) return 'All time';
  const preset = PRESETS.find((p) => p.key === df.preset);
  if (preset) return preset.label;
  if (df.preset === 'single') return format(parseISODate(df.from), 'MMM d, yyyy');
  return `${format(parseISODate(df.from), 'MMM d')} – ${format(parseISODate(df.to), 'MMM d, yyyy')}`;
}

/**
 * Analytics-style date filter popover for table-directory toolbars.
 * Presets, a single-date mode, and a custom range mode (native date inputs).
 * Selection applies immediately; "All time" clears the filter.
 *
 * Props:
 *   value    — { preset, from, to } (see ALL_TIME_FILTER)
 *   onChange — called with the next filter object
 */
export default function TableDateFilter({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Draft custom range — applies only once both ends are picked
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDocDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [open]);

  // Sync the custom draft from the applied value each time the panel opens
  useEffect(() => {
    if (open) {
      setCustomFrom(value.preset === 'custom' ? value.from : '');
      setCustomTo(value.preset === 'custom' ? value.to : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const apply = (next) => {
    onChange?.(next);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(false);
    }
  };

  const handleSingle = (v) => {
    if (!v) return;
    apply({ preset: 'single', from: v, to: v });
  };

  const handleCustom = (field, v) => {
    const from = field === 'from' ? v : customFrom;
    const to = field === 'to' ? v : customTo;
    setCustomFrom(from);
    setCustomTo(to);
    if (from && to) {
      apply(from <= to ? { preset: 'custom', from, to } : { preset: 'custom', from: to, to: from });
    }
  };

  const isAllTime = value.preset === 'all';

  return (
    <div className="tui-date" ref={containerRef} onKeyDown={onKeyDown}>
      <button
        type="button"
        className={`tui-date-trigger${open ? ' open' : ''}${!isAllTime ? ' filtered' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Filter by date"
      >
        <Calendar size={14} className="tui-date-trigger-icon" />
        <span className="tui-date-trigger-label">{getDateFilterLabel(value)}</span>
        <ChevronDown size={12} className="tui-dd-caret" />
      </button>

      {open && (
        <div className="tui-date-panel" role="dialog" aria-label="Date filter">
          <div className="tui-date-section">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`tui-date-preset${value.preset === p.key ? ' active' : ''}`}
                onClick={() => apply({ preset: p.key, ...p.range() })}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="tui-date-divider" />

          <div className="tui-date-section">
            <span className="tui-date-caption">Single date</span>
            <input
              type="date"
              className="tui-date-input"
              value={value.preset === 'single' ? value.from : ''}
              onChange={(e) => handleSingle(e.target.value)}
            />
          </div>

          <div className="tui-date-divider" />

          <div className="tui-date-section">
            <span className="tui-date-caption">Custom range</span>
            <div className="tui-date-range">
              <input
                type="date"
                className="tui-date-input"
                value={customFrom}
                onChange={(e) => handleCustom('from', e.target.value)}
              />
              <span className="tui-date-range-arrow">→</span>
              <input
                type="date"
                className="tui-date-input"
                value={customTo}
                onChange={(e) => handleCustom('to', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
