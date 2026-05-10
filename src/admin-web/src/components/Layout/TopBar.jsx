import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Button } from '@shared/components/Button.jsx';
import { Badge } from '@shared/components/Badge.jsx';
import SearchDropdown from '../SearchDropdown/SearchDropdown.jsx';
import DatePicker from '../DatePicker/DatePicker.jsx';
import { api } from '../../services/api.js';

export default function TopBar({
  onAddEvent,
  dateRange,
  onDateRangeChange,
  onResetToToday,
  onSearchSelect,
  onOpenSearchModal,
}) {
  const { user, logout } = useAuth();
  // Use local timezone date, not UTC (toISOString returns UTC which can be a day behind)
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isLive = dateRange.from === today && dateRange.to === today;

  // Search state (self-contained in TopBar)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchTimeoutRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Date range auto-sync: when user selects a From date, To matches it
  // (single-day view) so they don't accidentally load a huge date range.
  // If they want a range, they manually change To afterwards.
  const handleFromSelect = (date) => {
    let newTo = dateRange.to;
    if (date < today && dateRange.to === today) {
      newTo = date;
    } else if (date > dateRange.to) {
      newTo = date;
    }
    onDateRangeChange?.({ from: date, to: newTo });
  };

  const handleToSelect = (date) => {
    let newFrom = dateRange.from;
    if (date < dateRange.from) {
      newFrom = date;
    }
    onDateRangeChange?.({ from: newFrom, to: date });
  };

  // Debounced search API call
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchTotal(0);
      setShowDropdown(false);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await api.searchEvents({ q: searchQuery.trim(), limit: 5 });
        setSearchResults(res.data.events || []);
        setSearchTotal(res.data.count || 0);
        setShowDropdown(true);
        setHighlightedIndex(0);
      } catch {
        setSearchResults([]);
        setSearchTotal(0);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  const handleSearchInputChange = (value) => {
    setSearchQuery(value);
    if (!value.trim()) {
      setShowDropdown(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchTotal(0);
    setShowDropdown(false);
  };

  const handleSelectEvent = (event) => {
    setShowDropdown(false);
    setSearchQuery('');
    onSearchSelect?.(event);
  };

  const handleViewAll = () => {
    setShowDropdown(false);
    const q = searchQuery;
    setSearchQuery('');
    onOpenSearchModal?.(q);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showDropdown && searchResults.length > 0 && highlightedIndex >= 0) {
        handleSelectEvent(searchResults[highlightedIndex]);
      } else if (searchQuery.trim()) {
        handleViewAll();
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const inputStyle = {
    background: 'var(--bg-input)',
    border: isLive ? '1px solid var(--border-subtle)' : '1px solid rgba(245, 158, 11, 0.4)',
    borderRadius: 'var(--radius-sm)',
    padding: '5px 8px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    outline: 'none',
    cursor: 'pointer',
    width: '146px',
    transition: 'border-color 0.2s ease',
  };

  return (
    <header
      style={{
        height: '60px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        flexShrink: 0,
        zIndex: 100,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 700,
              color: '#f2f2f2',
              boxShadow: '0 0 20px var(--accent-glow-strong)',
            }}
          >
            G
          </div>
          <h1
            style={{
              fontSize: '17px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.3px',
            }}
          >
            GeoWatch
          </h1>
        </div>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1.2px',
            color: 'var(--text-muted)',
            padding: '3px 10px',
            borderRadius: '6px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          Admin
        </span>

        {/* Date Range Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>From</label>
          <DatePicker
            value={dateRange.from}
            onSelect={handleFromSelect}
            placeholder="From"
            style={inputStyle}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600 }}>→</span>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>To</label>
          <DatePicker
            value={dateRange.to}
            onSelect={handleToSelect}
            placeholder="To"
            style={inputStyle}
          />

          {/* Today button */}
          <button
            onClick={onResetToToday}
            disabled={isLive}
            style={{
              marginLeft: '4px',
              padding: '5px 12px',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              background: isLive ? 'var(--bg-deep)' : 'var(--bg-input)',
              color: isLive ? 'var(--text-muted)' : 'var(--accent-light)',
              cursor: isLive ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Today
          </button>

          {/* Event Search */}
          <div
            ref={searchContainerRef}
            style={{ position: 'relative', marginLeft: '12px', width: '280px' }}
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setShowDropdown(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search events..."
              style={{
                width: '100%',
                padding: '5px 30px 5px 10px',
                background: 'var(--bg-input)',
                border: searchQuery ? '1px solid var(--accent-light)' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontFamily: 'var(--font-sans)',
                outline: 'none',
                transition: 'border-color 0.2s ease',
              }}
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '14px',
                  cursor: 'pointer',
                  padding: '0 4px',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            )}

            {showDropdown && (
              <SearchDropdown
                query={searchQuery}
                results={searchResults}
                totalCount={searchTotal}
                loading={searchLoading}
                onSelect={handleSelectEvent}
                onViewAll={handleViewAll}
                onClose={() => setShowDropdown(false)}
                highlightedIndex={highlightedIndex}
                onHighlightChange={setHighlightedIndex}
              />
            )}
          </div>
        </div>
      </div>

      {/* Center: Mode Indicator Pill */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 18px',
          borderRadius: 'var(--radius-sm)',
          background: isLive ? 'rgba(90, 1, 28, 0.15)' : 'rgba(245, 158, 11, 0.10)',
          border: `1px solid ${isLive ? 'rgba(159, 18, 57, 0.40)' : 'rgba(245, 158, 11, 0.35)'}`,
        }}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isLive ? 'var(--danger-light)' : 'var(--warning)',
            boxShadow: isLive ? '0 0 10px var(--accent-glow-strong)' : 'none',
            animation: isLive ? 'pulse 2s ease-in-out infinite' : 'none',
          }}
        />
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '1px',
            color: isLive ? 'var(--danger-light)' : 'var(--warning)',
          }}
        >
          {isLive ? 'LIVE MODE' : 'HISTORIC MODE'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: user?.role === 'super_admin' ? 'var(--success)' : 'var(--warning)',
            }}
          />
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            {user?.full_name || user?.email}
          </span>
          <Badge status={user?.role === 'super_admin' ? 'active' : 'resolved'}>
            {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
          </Badge>
        </div>

        <Button variant="primary" size="sm" onClick={onAddEvent}>
          + Add Event
        </Button>
        <Button variant="ghost" size="sm" onClick={logout}>
          Logout
        </Button>
      </div>
    </header>
  );
}
