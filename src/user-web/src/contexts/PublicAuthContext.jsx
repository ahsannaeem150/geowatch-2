import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { api } from '../services/api.js';

const PublicAuthContext = createContext(null);

export function usePublicAuth() {
  return useContext(PublicAuthContext);
}

export function PublicAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('geowatch_public_token');
    setUser(null);
  }, []);

  const login = useCallback(async (idToken) => {
    const res = await api.publicLogin(idToken);
    const { token, user } = res.data;
    localStorage.setItem('geowatch_public_token', token);
    setUser(user);
    return user;
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('geowatch_public_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.publicMe()
      .then((res) => setUser(res.data.user))
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [logout]);

  return (
    <PublicAuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
      {children}
    </PublicAuthContext.Provider>
  );
}
