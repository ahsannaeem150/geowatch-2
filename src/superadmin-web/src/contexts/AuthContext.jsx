import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { login as apiLogin, getMe } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    const token = localStorage.getItem('superadmin_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await getMe();
      if (data?.user?.role === 'super_admin') {
        setUser(data.user);
      } else {
        // Not a superadmin — clear token
        localStorage.removeItem('superadmin_token');
      }
    } catch {
      localStorage.removeItem('superadmin_token');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = useCallback(async (email, password) => {
    const data = await apiLogin(email, password);
    if (!data?.token) {
      throw new Error('No token received');
    }

    localStorage.setItem('superadmin_token', data.token);

    if (data.user?.role !== 'super_admin') {
      localStorage.removeItem('superadmin_token');
      throw new Error('Insufficient permissions. Superadmin access only.');
    }

    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('superadmin_token');
    setUser(null);
    window.location.reload();
  }, []);

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isSuperAdmin: user?.role === 'super_admin',
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
