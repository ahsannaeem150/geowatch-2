import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('geowatch_token');
    setUser(null);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.login(email, password);
    const { token, user } = res.data;
    localStorage.setItem('geowatch_token', token);
    setUser(user);
    return user;
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('geowatch_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((res) => setUser(res.data.user))
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
