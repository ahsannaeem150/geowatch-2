import React, { useState, useCallback, useEffect } from 'react';
import { Star } from 'lucide-react';
import { api } from '../../services/api.js';
import { usePublicAuth } from '../../contexts/PublicAuthContext.jsx';
import { useSignInModal } from '../../contexts/SignInModalContext.jsx';
import { ErrorBanner } from '@shared/components/AsyncStates.jsx';

export default function SaveButton({ incidentId, initialSaved = false, size = 16, onChange }) {
  const { isAuthenticated } = usePublicAuth();
  const { openSignInModal } = useSignInModal();
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSaved(initialSaved);
  }, [initialSaved]);

  useEffect(() => {
    if (!error) return undefined;
    const timeout = setTimeout(() => setError(''), 4500);
    return () => clearTimeout(timeout);
  }, [error]);

  const handleToggle = useCallback(
    async (e) => {
      e.stopPropagation();
      if (loading) return;

      if (!isAuthenticated) {
        openSignInModal();
        return;
      }

      setLoading(true);
      setError('');
      try {
        if (saved) {
          await api.unsaveIncident(incidentId);
          setSaved(false);
          onChange?.(false);
        } else {
          await api.saveIncident(incidentId);
          setSaved(true);
          onChange?.(true);
        }
      } catch (err) {
        setError(err.message || 'Saved status could not be updated. Try again.');
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, loading, saved, incidentId, onChange, openSignInModal]
  );

  return (
    <>
      <button
        onClick={handleToggle}
        disabled={loading}
        title={saved ? 'Remove from saved' : 'Save incident'}
        aria-label={saved ? 'Remove from saved' : 'Save incident'}
        aria-busy={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          borderRadius: 'var(--radius-sm)',
          border: 'none',
          background: saved ? 'var(--alert-warning-bg)' : 'transparent',
          color: saved ? 'var(--warning)' : 'var(--text-muted)',
          cursor: loading ? 'wait' : 'pointer',
          transition: 'color 0.15s ease, background 0.15s ease, opacity 0.15s ease',
          opacity: loading ? 0.6 : 1,
          padding: 0,
        }}
        onMouseEnter={(e) => {
          if (!saved) e.currentTarget.style.color = 'var(--warning)';
        }}
        onMouseLeave={(e) => {
          if (!saved) e.currentTarget.style.color = 'var(--text-muted)';
        }}
      >
        <Star size={size} fill={saved ? 'currentColor' : 'none'} />
      </button>
      {error && (
        <div style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 12000, width: 'min(360px, calc(100vw - 48px))' }}>
          <ErrorBanner message={error} onRetry={handleToggle} retryScope="local" />
        </div>
      )}
    </>
  );
}
