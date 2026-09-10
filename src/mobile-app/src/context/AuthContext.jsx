import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useOverlay } from './OverlayContext';
import { getStoredToken, registerSessionExpiredHandler } from '../services/api';
import {
  configureGoogleSignIn,
  fetchMe,
  isSignInCancellation,
  signInWithGoogle,
  signOut as authServiceSignOut,
} from '../services/auth.service';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { openOverlay, showToast } = useOverlay();
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    registerSessionExpiredHandler(() => setUser(null));
    configureGoogleSignIn();

    let cancelled = false;
    (async () => {
      try {
        const token = await getStoredToken();
        if (token) {
          const me = await fetchMe();
          if (!cancelled) {
            setUser(me);
          }
        }
      } catch {
        // any boot failure (expired token, offline, …) → signed-out state
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async () => {
    try {
      const nextUser = await signInWithGoogle();
      setUser(nextUser);
      return nextUser;
    } catch (err) {
      if (isSignInCancellation(err)) {
        return null;
      }
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    await authServiceSignOut();
    setUser(null);
  }, []);

  const requireSignIn = useCallback(
    (actionLabel) => {
      if (user) {
        return true;
      }
      showToast(`Sign in to ${actionLabel}`);
      openOverlay({ id: 'signIn', type: 'sheet' });
      return false;
    },
    [user, openOverlay, showToast],
  );

  const value = useMemo(
    () => ({
      user,
      signedIn: !!user,
      initializing,
      signIn,
      signOut,
      requireSignIn,
    }),
    [user, initializing, signIn, signOut, requireSignIn],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

export default AuthContext;
