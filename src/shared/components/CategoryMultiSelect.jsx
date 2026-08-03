import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Multi-select category filter — domains-first accordion.
 * Pure React + inline styles (CSS vars only) so it renders identically in
 * all three apps; icons are tiny inline SVGs (no icon-library dependency).
 *
 * The panel opens on the clean domain list (all collapsed). Each domain row
 * is a tri-state checkbox (all/some/none of its categories selected) +
 * domain color dot + name + selected/total count + expand chevron; drilling
 * in reveals the category rows. Selection is always the flat category-value
 * list — a domain toggle adds/removes ALL its category values, so consumers
 * (e.g. IncidentsPage sending `categorySlugs`) need no domain-level params.
 *
 * Props:
 *   categories  — full list. Incident categories carry
 *                 domain_id/domain_name/domain_color and group under domain
 *                 rows; flat lists (e.g. zone categories) render ungrouped.
 *   selectedIds — array (or Set) of selected values; empty = All (no filter)
 *   onChange    — called with the next full values array
 *   placeholder — trigger label (default "Categories")
 *   getValue    — value accessor, default cat.slug ?? cat.id
 *
 * Pinned chips at the panel top collapse a fully selected domain to one
 * chip (`<Domain> · all`) and list partial picks individually. The search
 * row (only for long lists, >= SEARCH_THRESHOLD) matches domains AND
 * categories and auto-expands hits; empty query returns to the collapsed
 * default. Closes on outside mousedown and Escape (focus returns to the
 * trigger), flips upward when the viewport below is tight, and all motion
 * is suppressed under reduced motion.
 */
const SEARCH_THRESHOLD = 8;
const PANEL_EST_HEIGHT = 360;

const Icons = {
  chevronDown: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  check: (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  dash: (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
    </svg>
  ),
  search: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
  x: (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  ),
};

export default function CategoryMultiSelect({
  categories = [],
  selectedIds,
  onChange,
  placeholder = 'Categories',
  getValue = (cat) => cat.slug ?? cat.id,
}) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(() => new Set());
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const searchRef = useRef(null);

  const selected = useMemo(
    () => new Set(Array.from(selectedIds || []).map(String)),
    [selectedIds]
  );
  const valueOf = (cat) => String(getValue(cat));

  // Group by domain; categories without domain fields form one flat group
  const groups = useMemo(() => {
    const byDomain = new Map();
    for (const cat of categories) {
      const key = cat.domain_id ?? 'flat';
      if (!byDomain.has(key)) {
        byDomain.set(key, {
          id: key,
          name: cat.domain_name || '',
          color: cat.domain_color || '',
          cats: [],
        });
      }
      byDomain.get(key).cats.push(cat);
    }
    return Array.from(byDomain.values());
  }, [categories]);

  // Per-group selection aggregate: slugs, selected count, fully-selected flag
  const groupStats = useMemo(
    () =>
      groups.map((g) => {
        const slugs = g.cats.map(valueOf);
        const selCount = slugs.filter((s) => selected.has(s)).length;
        return { ...g, slugs, selCount, full: slugs.length > 0 && selCount === slugs.length };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, selected]
  );

  const query = search.trim().toLowerCase();
  const searching = query.length > 0;

  // While searching: domains and categories both match; hits auto-expand.
  // Empty query restores the collapsed default view.
  const visibleGroups = useMemo(() => {
    if (!searching) {
      return groupStats.map((g) => ({ ...g, visibleCats: g.cats, forceOpen: false }));
    }
    return groupStats
      .map((g) => {
        const domainHit = g.name && g.name.toLowerCase().includes(query);
        if (domainHit) return { ...g, visibleCats: g.cats, forceOpen: true };
        const catHits = g.cats.filter((c) => (c.name || '').toLowerCase().includes(query));
        if (catHits.length > 0) return { ...g, visibleCats: catHits, forceOpen: true };
        return null;
      })
      .filter(Boolean);
  }, [groupStats, searching, query]);

  const showSearch = categories.length >= SEARCH_THRESHOLD;

  // Close on outside mousedown
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

  // Focus the search row when the panel opens
  useEffect(() => {
    if (open && showSearch) searchRef.current?.focus();
  }, [open, showSearch]);

  const close = ({ refocus = false } = {}) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  const toggle = () => {
    if (!open && triggerRef.current) {
      // Flip upward when the space below the trigger can't fit the panel
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUp(spaceBelow < PANEL_EST_HEIGHT && rect.top > spaceBelow);
      setSearch('');
    }
    setOpen((o) => !o);
  };

  const toggleExpand = (key) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleValue = (v) => {
    const next = new Set(selected);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange?.(Array.from(next));
  };

  // Domain toggle = add/remove ALL of the domain's category values
  const toggleDomain = (group) => {
    const next = new Set(selected);
    if (group.full) group.slugs.forEach((s) => next.delete(s));
    else group.slugs.forEach((s) => next.add(s));
    onChange?.(Array.from(next));
  };

  // Trigger summary: whole domains vs partial category picks
  const fullDomains = groupStats.filter((g) => g.name && g.full).length;
  const partialCount = groupStats.reduce(
    (n, g) => n + (g.name && g.full ? 0 : g.selCount),
    0
  );
  let stateText = 'All';
  if (selected.size > 0) {
    const parts = [];
    if (fullDomains > 0) parts.push(`${fullDomains} domain${fullDomains === 1 ? '' : 's'}`);
    if (partialCount > 0) parts.push(`${partialCount} categor${partialCount === 1 ? 'y' : 'ies'}`);
    stateText = parts.length > 0 ? parts.join(' · ') : `${selected.size} selected`;
  }

  // Pinned chips: a fully selected domain collapses to one chip; partial
  // picks (and flat ungrouped selections) list individual categories.
  const chips = useMemo(() => {
    const out = [];
    for (const g of groupStats) {
      if (g.selCount === 0) continue;
      if (g.name && g.full) {
        out.push({
          key: `domain-${g.id}`,
          label: `${g.name} · all`,
          color: g.color,
          onRemove: () => toggleDomain(g),
        });
      } else {
        for (const cat of g.cats) {
          const v = valueOf(cat);
          if (selected.has(v)) {
            out.push({ key: v, label: cat.name, color: '', onRemove: () => toggleValue(v) });
          }
        }
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupStats, selected]);

  const onTriggerKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      toggle();
    } else if (open && e.key === 'Escape') {
      e.preventDefault();
      close({ refocus: true });
    }
  };

  const renderCategoryRow = (cat, { indented = false } = {}) => {
    const v = valueOf(cat);
    const isActive = selected.has(v);
    return (
      <button
        key={v}
        type="button"
        role="option"
        aria-selected={isActive}
        onClick={() => toggleValue(v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '5px 8px',
          paddingLeft: indented ? '31px' : '8px',
          background: 'transparent',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
          fontSize: '12px',
          fontWeight: isActive ? 700 : 600,
          fontFamily: 'var(--font-sans)',
          cursor: 'pointer',
          textAlign: 'left',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--bg-elevated)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <span
          style={{
            width: '13px',
            height: '13px',
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            border: `1px solid ${isActive ? 'var(--accent-light)' : 'var(--border-strong)'}`,
            background: isActive ? 'var(--accent)' : 'transparent',
            color: 'var(--text-on-accent)',
            transition: 'all 0.15s ease',
          }}
        >
          {isActive && Icons.check}
        </span>
        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {cat.name}
        </span>
      </button>
    );
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        ref={triggerRef}
        onClick={toggle}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Filter by category"
        style={{
          height: '34px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          padding: '0 10px',
          background: 'var(--bg-input)',
          border: `1px solid ${open ? 'var(--accent-light)' : 'var(--border-subtle)'}`,
          borderRadius: 'var(--radius-md)',
          color: open ? 'var(--text-primary)' : 'var(--text-secondary)',
          fontSize: '12px',
          fontWeight: 600,
          fontFamily: 'var(--font-sans)',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          whiteSpace: 'nowrap',
        }}
      >
        <span>{placeholder}</span>
        {selected.size === 0 ? (
          <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>All</span>
        ) : (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              maxWidth: '170px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              padding: '2px 7px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--accent-subtle-bg)',
              border: '1px solid var(--accent-subtle-border)',
              color: 'var(--accent-light)',
              fontSize: '10px',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '0.2px',
            }}
          >
            {stateText}
          </span>
        )}
        <span
          style={{
            display: 'inline-flex',
            color: 'var(--text-muted)',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
          }}
        >
          {Icons.chevronDown}
        </span>
      </button>

      {open && (
        <div
          className={`cms-panel${openUp ? ' cms-panel-up' : ''}`}
          role="listbox"
          aria-multiselectable="true"
          aria-label={placeholder}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              close({ refocus: true });
            }
          }}
          style={{
            position: 'absolute',
            ...(openUp ? { bottom: 'calc(100% + 6px)' } : { top: 'calc(100% + 6px)' }),
            left: 0,
            minWidth: '264px',
            maxWidth: '320px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 300,
            fontFamily: 'var(--font-sans)',
          }}
        >
          {/* Pinned selection as removable chips */}
          {chips.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '5px',
                padding: '9px 10px',
                borderBottom: '1px solid var(--border-subtle)',
                flexShrink: 0,
              }}
            >
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  className="cms-chip"
                  onClick={chip.onRemove}
                  title="Remove from filter"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 7px',
                    background: 'var(--accent-subtle-bg)',
                    border: '1px solid var(--accent-subtle-border)',
                    borderRadius: 'var(--radius-pill)',
                    color: 'var(--accent-light)',
                    fontSize: '10px',
                    fontWeight: 700,
                    fontFamily: 'var(--font-sans)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {chip.color && (
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: chip.color,
                        flexShrink: 0,
                      }}
                    />
                  )}
                  {chip.label}
                  {Icons.x}
                </button>
              ))}
            </div>
          )}

          {showSearch && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '8px 10px',
                borderBottom: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                flexShrink: 0,
              }}
            >
              {Icons.search}
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search domains and categories…"
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontFamily: 'var(--font-sans)',
                }}
              />
            </div>
          )}

          {/* Quick actions */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              padding: '7px 10px',
              borderBottom: '1px solid var(--border-subtle)',
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={() => onChange?.(categories.map(valueOf))}
              style={{
                flex: 1,
                padding: '4px 8px',
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)',
                fontSize: '10px',
                fontWeight: 700,
                fontFamily: 'var(--font-sans)',
                letterSpacing: '0.4px',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => onChange?.([])}
              disabled={selected.size === 0}
              style={{
                flex: 1,
                padding: '4px 8px',
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: selected.size === 0 ? 'var(--text-muted)' : 'var(--text-secondary)',
                fontSize: '10px',
                fontWeight: 700,
                fontFamily: 'var(--font-sans)',
                letterSpacing: '0.4px',
                textTransform: 'uppercase',
                cursor: selected.size === 0 ? 'default' : 'pointer',
                opacity: selected.size === 0 ? 0.55 : 1,
              }}
            >
              Clear
            </button>
          </div>

          {/* Domain rows (collapsed by default) with drill-in categories */}
          <div style={{ overflowY: 'auto', maxHeight: '280px', padding: '4px' }}>
            {visibleGroups.length === 0 && (
              <div style={{ padding: '14px 10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                No domains or categories match “{search.trim()}”.
              </div>
            )}
            {visibleGroups.map((group) => {
              if (!group.name) {
                // Flat ungrouped fallback (e.g. zone categories)
                return (
                  <div key={String(group.id)}>
                    {group.visibleCats.map((cat) => renderCategoryRow(cat))}
                  </div>
                );
              }
              const isOpen = group.forceOpen || expanded.has(group.id);
              const triState = group.full ? 'full' : group.selCount > 0 ? 'some' : 'none';
              return (
                <div key={String(group.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '2px 2px 2px 6px' }}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={triState === 'full' ? 'true' : triState === 'some' ? 'mixed' : 'false'}
                      title={
                        triState === 'full'
                          ? `Remove all ${group.name} categories`
                          : `Select all ${group.name} categories`
                      }
                      onClick={() => toggleDomain(group)}
                      style={{
                        width: '13px',
                        height: '13px',
                        flexShrink: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px',
                        border: `1px solid ${triState === 'none' ? 'var(--border-strong)' : 'var(--accent-light)'}`,
                        background: triState === 'none' ? 'transparent' : 'var(--accent)',
                        color: 'var(--text-on-accent)',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {triState === 'full' ? Icons.check : triState === 'some' ? Icons.dash : null}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleExpand(group.id)}
                      aria-expanded={isOpen}
                      title={isOpen ? `Collapse ${group.name}` : `Show ${group.name} categories`}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '7px',
                        padding: '6px 6px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        fontWeight: 700,
                        fontFamily: 'var(--font-sans)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--bg-elevated)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {group.color && (
                        <span
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            background: group.color,
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {group.name}
                      </span>
                      {group.selCount > 0 && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            fontVariantNumeric: 'tabular-nums',
                            color: 'var(--accent-light)',
                            flexShrink: 0,
                          }}
                        >
                          {group.selCount}/{group.cats.length}
                        </span>
                      )}
                      <span
                        style={{
                          display: 'inline-flex',
                          color: 'var(--text-muted)',
                          flexShrink: 0,
                          transform: isOpen ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.15s ease',
                        }}
                      >
                        {Icons.chevronDown}
                      </span>
                    </button>
                  </div>
                  {isOpen && (
                    <div className="cms-cats">
                      {group.visibleCats.map((cat) => renderCategoryRow(cat, { indented: true }))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes cms-panel-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cms-panel-in-up {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cms-cats-in {
          from { opacity: 0; transform: translateY(-3px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .cms-panel { animation: cms-panel-in 150ms ease-out; }
        .cms-panel-up { animation: cms-panel-in-up 150ms ease-out; }
        .cms-cats { animation: cms-cats-in 150ms ease-out; }
        /* Chip remove affordance brightens on chip hover */
        .cms-chip svg { opacity: 0.55; transition: opacity 0.15s ease; }
        .cms-chip:hover svg { opacity: 1; }
        @media (prefers-reduced-motion: reduce) {
          .cms-panel, .cms-panel-up, .cms-cats { animation: none; }
          .cms-chip svg { transition: none; }
        }
        .reduce-motion .cms-panel, .reduce-motion .cms-panel-up, .reduce-motion .cms-cats { animation: none; }
        .reduce-motion .cms-chip svg { transition: none; }
      `}</style>
    </div>
  );
}
