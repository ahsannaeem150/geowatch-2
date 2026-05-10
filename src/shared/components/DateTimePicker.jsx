import React, { useState, useEffect, useRef } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  getYear,
  setYear,
  setMonth,
  setHours,
  setMinutes,
} from 'date-fns';

export default function DateTimePicker({ value, onChange, placeholder = 'Select date & time' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => (value ? new Date(value) : new Date()));
  const containerRef = useRef(null);

  const selectedDate = value ? new Date(value) : null;

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update viewDate when value changes externally
  useEffect(() => {
    if (value) {
      setViewDate(new Date(value));
    }
  }, [value]);

  const handleSelectDay = (day) => {
    let next = day;
    if (selectedDate) {
      next = setHours(next, selectedDate.getHours());
      next = setMinutes(next, selectedDate.getMinutes());
    } else {
      next = setHours(next, new Date().getHours());
      next = setMinutes(next, new Date().getMinutes());
    }
    onChange?.(next.toISOString());
  };

  const handleTimeChange = (field, val) => {
    if (!selectedDate) return;
    const num = parseInt(val, 10);
    if (Number.isNaN(num)) return;
    let next = selectedDate;
    if (field === 'hours') {
      next = setHours(next, Math.max(0, Math.min(23, num)));
    } else if (field === 'minutes') {
      next = setMinutes(next, Math.max(0, Math.min(59, num)));
    }
    onChange?.(next.toISOString());
  };

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const displayValue = selectedDate
    ? format(selectedDate, 'MMM dd, yyyy HH:mm')
    : '';

  const years = Array.from({ length: 11 }, (_, i) => getYear(new Date()) - 5 + i);
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger Input */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        style={{
          width: '100%',
          background: 'var(--bg-input)',
          border: `1px solid ${isOpen ? 'var(--accent-light)' : 'var(--border-subtle)'}`,
          borderRadius: 'var(--radius-sm)',
          padding: '10px 12px',
          color: selectedDate ? 'var(--text-primary)' : 'var(--text-muted)',
          fontSize: '13px',
          fontFamily: 'var(--font-mono)',
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          outline: 'none',
        }}
      >
        <span>{displayValue || placeholder}</span>
        <span style={{ fontSize: '12px', opacity: 0.6 }}>📅</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 100,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            padding: '14px',
            width: '280px',
          }}
        >
          {/* Header: Month/Year nav */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            <button
              type="button"
              onClick={() => setViewDate(subMonths(viewDate, 1))}
              style={arrowBtnStyle}
            >
              ‹
            </button>

            <div style={{ display: 'flex', gap: '6px' }}>
              <select
                value={viewDate.getMonth()}
                onChange={(e) => setViewDate(setMonth(viewDate, parseInt(e.target.value)))}
                style={selectStyle}
              >
                {months.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              <select
                value={getYear(viewDate)}
                onChange={(e) => setViewDate(setYear(viewDate, parseInt(e.target.value)))}
                style={selectStyle}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setViewDate(addMonths(viewDate, 1))}
              style={arrowBtnStyle}
            >
              ›
            </button>
          </div>

          {/* Day headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '2px',
              marginBottom: '4px',
            }}
          >
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <div
                key={d}
                style={{
                  textAlign: 'center',
                  fontSize: '10px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  padding: '4px 0',
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '2px',
              marginBottom: '12px',
            }}
          >
            {days.map((day) => {
              const inMonth = isSameMonth(day, viewDate);
              const selected = selectedDate && isSameDay(day, selectedDate);
              const today = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  style={{
                    aspectRatio: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: selected ? 700 : 400,
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: selected
                      ? 'var(--accent-light)'
                      : today
                      ? 'rgba(159, 18, 57, 0.1)'
                      : 'transparent',
                    color: selected
                      ? 'var(--bg-deep)'
                      : inMonth
                      ? 'var(--text-primary)'
                      : 'var(--text-muted)',
                    cursor: 'pointer',
                    boxShadow: today && !selected ? 'inset 0 0 0 1px var(--accent-light)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!selected) e.currentTarget.style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    if (!selected) e.currentTarget.style.background = today ? 'rgba(159, 18, 57, 0.1)' : 'transparent';
                  }}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          {/* Time picker */}
          <div
            style={{
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
              Time
            </span>
            <input
              type="number"
              min={0}
              max={23}
              value={selectedDate ? selectedDate.getHours() : ''}
              onChange={(e) => handleTimeChange('hours', e.target.value)}
              placeholder="HH"
              style={timeInputStyle}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>:</span>
            <input
              type="number"
              min={0}
              max={59}
              value={selectedDate ? selectedDate.getMinutes() : ''}
              onChange={(e) => handleTimeChange('minutes', e.target.value)}
              placeholder="MM"
              style={timeInputStyle}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const arrowBtnStyle = {
  width: '28px',
  height: '28px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  fontSize: '16px',
  cursor: 'pointer',
};

const selectStyle = {
  background: 'var(--bg-input)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: '12px',
  padding: '4px 8px',
  outline: 'none',
  cursor: 'pointer',
};

const timeInputStyle = {
  width: '44px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: '13px',
  fontFamily: 'var(--font-mono)',
  padding: '6px 8px',
  textAlign: 'center',
  outline: 'none',
};
