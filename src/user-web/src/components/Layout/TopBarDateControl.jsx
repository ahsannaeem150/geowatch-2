import React, { useEffect, useRef, useState } from 'react';
import { format, subDays, startOfMonth } from 'date-fns';
import { Calendar, ChevronDown } from 'lucide-react';
import { getDateFilterLabel } from '../TableUI/TableDateFilter.jsx';
import '../TableUI/table-ui.css';
import './TopBarDateControl.css';

/**
 * TopBarDateControl — the workspace top bar's date-range trigger.
 * Popover modeled on the TableUI date filter: presets, single-date mode,
 * custom-range mode (draft inputs, applies when both ends are picked).
 *
 * Selections drive the real map filtering:
 *   - "Today" preset → onResetToToday() (restores live mode)
 *   - anything else  → onDateRangeChange({ from, to }); "All time" → { from: null, to: null }
 *
 * The displayed selection is DERIVED from the `dateRange` prop so external
 * range changes (e.g. incident-click auto-jump) stay reflected truthfully.
 */

function toISODate(d) {
  return format(d, 'yyyy-MM-dd');
}

function parseISODate(v) {
  return new Date(`${v}T00:00:00`);
}

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

// Map the parent's dateRange back onto a preset/single/custom selection
function selectionFromRange(dateRange) {
  if (!dateRange?.from || !dateRange?.to) return { preset: 'all', from: '', to: '' };
  for (const p of PRESETS) {
    const r = p.range();
    if (r.from === dateRange.from && r.to === dateRange.to) return { preset: p.key, ...r };
  }
  if (dateRange.from === dateRange.to) {
    return { preset: 'single', from: dateRange.from, to: dateRange.to };
  }
  return { preset: 'custom', from: dateRange.from, to: dateRange.to };
}

// Compact label for the topbar's slim mode (<1640px)
function getShortLabel(df) {
  switch (df.preset) {
    case 'today': return 'Today';
    case 'yesterday': return 'Yest.';
    case 'last7': return '7 days';
    case 'last30': return '30 days';
    case 'month': return 'Month';
    case 'all': return 'All';
    case 'single': return format(parseISODate(df.from), 'MMM d');
    case 'custom':
      return `${format(parseISODate(df.from), 'MMM d')}–${format(parseISODate(df.to), 'MMM d')}`;
    default: return 'Today';
  }
}

export default function TopBarDateControl({
  slim = false,
  dateRange,
  onDateRangeChange,
  onResetToToday,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selection = selectionFromRange(dateRange);

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
      setCustomFrom(selection.preset === 'custom' ? selection.from : '');
      setCustomTo(selection.preset === 'custom' ? selection.to : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const apply = (next) => {
    if (next.preset === 'today') {
      onResetToToday?.();
    } else {
      onDateRangeChange?.({ from: next.from || null, to: next.to || null });
    }
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

  const isDefault = selection.preset === 'today';

  return (
    <div className="tbd" ref={containerRef} onKeyDown={onKeyDown}>
      <button
        type="button"
        className={`tbd-trigger${open ? ' open' : ''}${!isDefault ? ' active' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Date range"
      >
        <Calendar size={13} className="tbd-icon" />
        <span className="tbd-label">
          {slim ? getShortLabel(selection) : getDateFilterLabel(selection)}
        </span>
        <ChevronDown size={11} className="tbd-caret" />
      </button>

      {open && (
        <div className="tui-date-panel tbd-panel" role="dialog" aria-label="Date range">
          <div className="tui-date-section">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`tui-date-preset${selection.preset === p.key ? ' active' : ''}`}
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
              value={selection.preset === 'single' ? selection.from : ''}
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
