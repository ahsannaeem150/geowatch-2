import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button.jsx';

/**
 * Styled confirmation modal for destructive or important actions.
 *
 * Props:
 *   isOpen       — boolean
 *   title        — modal heading
 *   message      — modal body text
 *   confirmText  — label for the confirm button (default "Confirm")
 *   cancelText   — label for the cancel button (default "Cancel")
 *   danger       — if true, confirm button uses danger variant
 *   onConfirm    — called when confirm is clicked
 *   onCancel     — called when cancel is clicked, overlay is clicked, or Escape is pressed
 */
export function ConfirmDialog({
  isOpen = false,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel?.();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel?.();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--backdrop)',
        padding: 'var(--space-md)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          padding: 'var(--space-md)',
        }}
        role="dialog"
        aria-modal="true"
      >
        <h3
          style={{
            margin: '0 0 var(--space-sm)',
            fontSize: 'var(--text-h3)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {title}
        </h3>
        <p
          style={{
            margin: '0 0 var(--space-md)',
            fontSize: 'var(--text-body)',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            fontFamily: 'var(--font-sans)',
          }}
        >
          {message}
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
