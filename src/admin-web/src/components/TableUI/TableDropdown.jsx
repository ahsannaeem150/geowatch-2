import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import './table-ui.css';

/**
 * Small custom dropdown for table-directory toolbars.
 * Button trigger + absolutely-positioned panel; keyboard navigable
 * (arrows/Home/End/Enter/Escape/Tab), closes on outside click,
 * check mark on the active item. Options may carry a `color` dot.
 *
 * Props:
 *   value    — current option value
 *   options  — [{ value, label, color? }]
 *   onChange — called with the picked option's value
 *   icon     — optional leading icon node for the trigger
 *   title    — tooltip / accessible name fallback
 *   align    — panel alignment: 'left' (default) | 'right'
 */
export default function TableDropdown({ value, options, onChange, icon = null, title, align = 'left' }) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef(null);
  const panelRef = useRef(null);
  const triggerRef = useRef(null);

  const activeIndex = options.findIndex((o) => String(o.value) === String(value));
  const active = activeIndex >= 0 ? options[activeIndex] : null;

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

  // Move focus into the panel once it renders
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  const toggle = () => {
    setOpen((o) => {
      if (!o) setHighlight(activeIndex >= 0 ? activeIndex : 0);
      return !o;
    });
  };

  const select = (opt) => {
    onChange?.(opt.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(options.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setHighlight(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setHighlight(options.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const opt = options[highlight];
      if (opt) select(opt);
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div className="tui-dd" ref={containerRef} onKeyDown={onKeyDown}>
      <button
        type="button"
        ref={triggerRef}
        className={`tui-dd-trigger${open ? ' open' : ''}`}
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={title}
      >
        {icon}
        {active?.color && <span className="tui-dd-dot" style={{ background: active.color }} />}
        <span className="tui-dd-label">{active?.label ?? 'Select…'}</span>
        <ChevronDown size={12} className="tui-dd-caret" />
      </button>

      {open && (
        <div
          className={`tui-dd-panel${align === 'right' ? ' tui-dd-panel-right' : ''}`}
          role="listbox"
          ref={panelRef}
          tabIndex={-1}
        >
          {options.map((opt, i) => {
            const isActive = i === activeIndex;
            const isHi = i === highlight;
            return (
              <button
                key={String(opt.value)}
                type="button"
                role="option"
                aria-selected={isActive}
                className={`tui-dd-option${isActive ? ' active' : ''}${isHi ? ' highlight' : ''}`}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => select(opt)}
              >
                {opt.color && <span className="tui-dd-dot" style={{ background: opt.color }} />}
                <span className="tui-dd-option-label">{opt.label}</span>
                {isActive && <Check size={12} className="tui-dd-check" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
