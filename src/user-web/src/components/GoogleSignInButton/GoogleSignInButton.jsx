import React, { useRef, useLayoutEffect, useState } from 'react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function GoogleSignInButton({ onCredential, buttonWidth = '160' }) {
  const buttonRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useLayoutEffect(() => {
    if (!GOOGLE_CLIENT_ID || !buttonRef.current) return;

    let interval;
    let timeout;

    const tryRender = () => {
      if (!buttonRef.current) return false;
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: onCredential,
          });
          window.google.accounts.id.renderButton(buttonRef.current, {
            theme: 'outline',
            size: 'medium',
            text: 'signin_with',
            shape: 'pill',
            width: buttonWidth,
          });
          return true;
        } catch (err) {
          console.warn('Google Sign-In render failed:', err);
          setFailed(true);
          return true;
        }
      }
      return false;
    };

    if (tryRender()) return;

    interval = setInterval(() => {
      if (tryRender()) {
        clearInterval(interval);
        clearTimeout(timeout);
      }
    }, 200);

    timeout = setTimeout(() => {
      clearInterval(interval);
      setFailed(true);
    }, 8000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      if (buttonRef.current) {
        buttonRef.current.innerHTML = '';
      }
    };
  }, [onCredential, buttonWidth]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sign-in not configured</div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div ref={buttonRef} style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
      {failed && (
        <div
          style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            maxWidth: '220px',
            textAlign: 'center',
            lineHeight: 1.4,
          }}
          title="Google Sign-In could not load. Check your ad blocker or network connection."
        >
          Sign-in unavailable. Check your network or ad blocker.
        </div>
      )}
    </div>
  );
}
