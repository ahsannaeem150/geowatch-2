import React, { useState, useEffect, useRef, useCallback } from 'react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORTS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const WEEKDAY_SHORTS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function formatDateString(year, month, day) {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function parseDateString(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

function isSameDay(dateStr, year, month, day) {
  const parsed = parseDateString(dateStr);
  if (!parsed) return false;
  return parsed.year === year && parsed.month === month && parsed.day === day;
}

function isToday(year, month, day) {
  const now = new Date();
  return (
    now.getFullYear() === year &&
    now.getMonth() === month &&
    now.getDate() === day
  );
}

function generateCalendarDays(year, month) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const days = [];

  // Previous month days
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({
      day: daysInPrevMonth - i,
      month: prevMonth,
      year: prevYear,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      day: i,
      month,
      year,
      isCurrentMonth: true,
    });
  }

  // Next month days
  const remaining = 42 - days.length;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  for (let i = 1; i <= remaining; i++) {
    days.push({
      day: i,
      month: nextMonth,
      year: nextYear,
      isCurrentMonth: false,
    });
  }

  return days;
}

export default function DatePicker({ value, onSelect, placeholder, style }) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState('days');

  // viewDate controls which month is shown in the calendar
  const parsed = parseDateString(value);
  const initialView = parsed
    ? new Date(parsed.year, parsed.month, 1)
    : new Date();
  const [viewDate, setViewDate] = useState(initialView);

  const containerRef = useRef(null);

  // Sync viewDate when value changes from parent (e.g. Today button)
  useEffect(() => {
    const p = parseDateString(value);
    if (p) {
      setViewDate(new Date(p.year, p.month, 1));
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setViewMode('days');
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setViewMode('days');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleDayClick = useCallback(
    (year, month, day) => {
      const dateStr = formatDateString(year, month, day);
      onSelect?.(dateStr);
      setIsOpen(false);
      setViewMode('days');
    },
    [onSelect]
  );

  const goToPrevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToPrevYear = () => {
    setViewDate((prev) => new Date(prev.getFullYear() - 1, prev.getMonth(), 1));
  };

  const goToNextYear = () => {
    setViewDate((prev) => new Date(prev.getFullYear() + 1, prev.getMonth(), 1));
  };

  const displayValue = value
    ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`
    : '';

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const calendarDays = generateCalendarDays(year, month);

  // ─── Render ───
  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger */}
      <div
        onClick={() => setIsOpen((o) => !o)}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span style={{ flex: 1 }}>
          {displayValue || (
            <span style={{ color: 'var(--text-muted)' }}>{placeholder}</span>
          )}
        </span>
        <span style={{ fontSize: '10px', opacity: 0.6 }}>▼</span>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 200,
            width: '260px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            padding: '12px',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {viewMode === 'days' ? (
            <DaysView
              year={year}
              month={month}
              value={value}
              calendarDays={calendarDays}
              onDayClick={handleDayClick}
              onMonthYearClick={() => setViewMode('months')}
              onPrevMonth={goToPrevMonth}
              onNextMonth={goToNextMonth}
            />
          ) : (
            <MonthsView
              year={year}
              onPrevYear={goToPrevYear}
              onNextYear={goToNextYear}
              onMonthSelect={(m) => {
                setViewDate(new Date(year, m, 1));
                setViewMode('days');
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───

function DaysView({
  year,
  month,
  value,
  calendarDays,
  onDayClick,
  onMonthYearClick,
  onPrevMonth,
  onNextMonth,
}) {
  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
        }}
      >
        <NavArrow onClick={onPrevMonth}>←</NavArrow>
        <div
          onClick={onMonthYearClick}
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            cursor: 'pointer',
            userSelect: 'none',
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          {MONTH_NAMES[month]} {year}
        </div>
        <NavArrow onClick={onNextMonth}>→</NavArrow>
      </div>

      {/* Weekday headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '2px',
          marginBottom: '4px',
        }}
      >
        {WEEKDAY_SHORTS.map((wd) => (
          <div
            key={wd}
            style={{
              textAlign: 'center',
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              padding: '4px 0',
            }}
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '2px',
        }}
      >
        {calendarDays.map((d, i) => {
          const selected = isSameDay(value, d.year, d.month, d.day);
          const today = isToday(d.year, d.month, d.day);
          return (
            <button
              key={i}
              onClick={() => onDayClick(d.year, d.month, d.day)}
              style={{
                appearance: 'none',
                border: 'none',
                background: selected
                  ? 'var(--accent-light)'
                  : 'transparent',
                color: selected
                  ? 'var(--bg-deep)'
                  : d.isCurrentMonth
                  ? 'var(--text-primary)'
                  : 'var(--text-muted)',
                fontSize: '12px',
                fontWeight: selected ? 700 : 500,
                fontFamily: 'var(--font-mono)',
                width: '100%',
                aspectRatio: '1',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                outline: 'none',
                boxShadow: today && !selected
                  ? 'inset 0 0 0 1px var(--accent-light)'
                  : 'none',
                transition: 'background 0.12s ease, color 0.12s ease',
              }}
              onMouseEnter={(e) => {
                if (!selected) {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (!selected) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {d.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MonthsView({ year, onPrevYear, onNextYear, onMonthSelect }) {
  return (
    <div>
      {/* Year header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}
      >
        <NavArrow onClick={onPrevYear}>←</NavArrow>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {year}
        </div>
        <NavArrow onClick={onNextYear}>→</NavArrow>
      </div>

      {/* Month grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '4px',
        }}
      >
        {MONTH_SHORTS.map((name, index) => (
          <button
            key={name}
            onClick={() => onMonthSelect(index)}
            style={{
              appearance: 'none',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 500,
              fontFamily: 'var(--font-sans)',
              padding: '10px 0',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              transition: 'background 0.12s ease, color 0.12s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

function NavArrow({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        appearance: 'none',
        border: 'none',
        background: 'transparent',
        color: 'var(--text-secondary)',
        fontSize: '13px',
        fontWeight: 700,
        width: '28px',
        height: '28px',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.12s ease, color 0.12s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-hover)';
        e.currentTarget.style.color = 'var(--text-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--text-secondary)';
      }}
    >
      {children}
    </button>
  );
}
