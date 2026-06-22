import React, { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { usePublicAuth } from '../../contexts/PublicAuthContext.jsx';
import GoogleSignInButton from '../GoogleSignInButton/GoogleSignInButton.jsx';

export default function SignInModal({ onClose }) {
  const { login, isAuthenticated } = usePublicAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      onClose();
    }
  }, [isAuthenticated, onClose]);

  const handleCredential = useCallback(
    async (response) => {
      setError('');
      try {
        await login(response.credential);
      } catch (err) {
        console.error('Google login failed:', err);
        setError(err.message || 'Sign-in failed. Please try again.');
      }
    },
    [login]
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 11000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 380,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 18,
          padding: '28px 24px',
          textAlign: 'center',
          boxShadow: '0 24px 70px rgba(0,0,0,0.45)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <h2
          style={{
            margin: '0 0 8px',
            fontSize: 20,
            fontWeight: 800,
            color: 'var(--text-primary)',
          }}
        >
          Sign in to GeoWatch
        </h2>
        <p
          style={{
            margin: '0 0 24px',
            fontSize: 13,
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
          }}
        >
          Save incidents, get alerts, and access your personal dashboard.
        </p>

        <GoogleSignInButton onCredential={handleCredential} buttonWidth="220" />

        {error && (
          <div
            style={{
              marginTop: 16,
              fontSize: '12px',
              color: 'var(--danger)',
              lineHeight: 1.4,
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
