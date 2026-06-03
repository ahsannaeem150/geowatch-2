import React, { createContext, useState, useEffect, useCallback } from 'react';

const THEME_KEY = 'geowatch-theme';
const STYLE_KEY = 'geowatch-style';

export const ThemeContext = createContext({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
  style: 'tactical',
  setStyle: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return 'dark';
  });

  const [style, setStyleState] = useState(() => {
    try {
      const saved = localStorage.getItem(STYLE_KEY);
      if (['tactical', 'saas', 'glass'].includes(saved)) return saved;
    } catch {}
    return 'tactical';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-style', style);
    try {
      localStorage.setItem(STYLE_KEY, style);
    } catch {}
  }, [style]);

  const setTheme = useCallback((newTheme) => {
    if (newTheme === 'light' || newTheme === 'dark') {
      setThemeState(newTheme);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const setStyle = useCallback((newStyle) => {
    if (['tactical', 'saas', 'glass'].includes(newStyle)) {
      setStyleState(newStyle);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, style, setStyle }}>
      {children}
    </ThemeContext.Provider>
  );
}
