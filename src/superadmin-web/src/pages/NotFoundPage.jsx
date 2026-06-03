import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          fontSize: 72,
          fontWeight: 800,
          background: 'linear-gradient(135deg, var(--navy-300), var(--navy-600))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1,
          marginBottom: 16,
        }}
      >
        404
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>
        Page not found
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/superadmin"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 18px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--navy-600)',
          color: '#fff',
          textDecoration: 'none',
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>
    </div>
  );
}
