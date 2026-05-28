import React, { useState } from 'react';
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          animation: 'fadeIn 0.4s ease forwards',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'linear-gradient(135deg, var(--navy-600), var(--navy-800))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 8px 24px rgba(37, 99, 235, 0.25)',
            }}
          >
            <Shield size={28} style={{ color: '#fff' }} />
          </div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              marginBottom: 6,
              letterSpacing: '-0.02em',
            }}
          >
            <span style={{ color: 'var(--text-primary)' }}>Geo</span>
            <span className="console-gradient-text">Watch</span>
            <span style={{ color: 'var(--text-primary)' }}> Console</span>
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Superadmin access only
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 14,
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 14px',
                background: 'rgba(244, 63, 94, 0.08)',
                border: '1px solid rgba(244, 63, 94, 0.2)',
                borderRadius: 8,
                color: 'var(--danger)',
                fontSize: 13,
              }}
            >
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@geowatch.local"
              required
              style={{
                background: 'var(--bg-base)',
                border: '1px solid var(--border-default)',
                borderRadius: 8,
                padding: '11px 14px',
                color: 'var(--text-primary)',
                fontSize: 14,
                fontFamily: 'var(--font-sans)',
                outline: 'none',
                transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--navy-500)';
                e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border-default)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 8,
                  padding: '11px 42px 11px 14px',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  fontFamily: 'var(--font-sans)',
                  outline: 'none',
                  transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--navy-500)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border-default)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: 4,
              padding: '12px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, var(--navy-600), var(--navy-700))',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              transition: 'opacity var(--transition-fast), box-shadow var(--transition-fast)',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) e.target.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = '0 4px 14px rgba(37, 99, 235, 0.3)';
            }}
          >
            {isLoading ? 'Signing in...' : 'Sign in to Console'}
          </button>
        </form>

        {/* Footer */}
        <p
          style={{
            textAlign: 'center',
            marginTop: 20,
            fontSize: 12,
            color: 'var(--text-disabled)',
          }}
        >
          GeoWatch Platform Control Tower · v1.0.0
        </p>
      </div>
    </div>
  );
}
