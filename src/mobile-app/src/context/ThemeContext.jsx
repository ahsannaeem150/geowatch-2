import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, useColorScheme } from 'react-native';
import { THEMES } from '../theme/tokens';
import { STORAGE_KEYS } from '../constants';

const ThemeContext = createContext(null);
const PREFERENCES = new Set(['system', 'dark', 'light']);
const resolveMode = (preference, systemScheme) =>
  preference === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : preference;

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const systemSchemeRef = useRef(systemScheme);
  systemSchemeRef.current = systemScheme;
  const [mode, setMode] = useState('dark');
  const [themePreference, setThemePreferenceState] = useState('dark');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.THEME),
      AsyncStorage.getItem(STORAGE_KEYS.THEME_PREFERENCE),
    ])
      .then(([storedMode, storedPreference]) => {
        if (cancelled) return;
        const fallback = storedMode === 'light' || storedMode === 'dark' ? storedMode : 'dark';
        const nextPreference = PREFERENCES.has(storedPreference)
          ? storedPreference
          : fallback;
        const nextMode = resolveMode(nextPreference, systemSchemeRef.current);
        setThemePreferenceState(nextPreference);
        setMode(nextMode);
        NativeModules.LaunchPreferences?.setTheme(nextMode);
      })
      .catch(() => {
        if (!cancelled) NativeModules.LaunchPreferences?.setTheme('dark');
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded || themePreference !== 'system') return;
    const nextMode = resolveMode('system', systemScheme);
    setMode(nextMode);
    NativeModules.LaunchPreferences?.setTheme(nextMode);
    AsyncStorage.setItem(STORAGE_KEYS.THEME, nextMode).catch(() => {});
  }, [loaded, themePreference, systemScheme]);

  const setThemePreference = useCallback((next) => {
    const preference = PREFERENCES.has(next) ? next : 'dark';
    const nextMode = resolveMode(preference, systemScheme);
    setThemePreferenceState(preference);
    setMode(nextMode);
    NativeModules.LaunchPreferences?.setTheme(nextMode);
    AsyncStorage.setItem(STORAGE_KEYS.THEME_PREFERENCE, preference).catch(() => {});
    AsyncStorage.setItem(STORAGE_KEYS.THEME, nextMode).catch(() => {});
  }, [systemScheme]);

  const setTheme = useCallback((next) => {
    setThemePreference(next === 'light' ? 'light' : 'dark');
  }, [setThemePreference]);

  const toggleTheme = useCallback(() => {
    setTheme(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setTheme]);

  const value = useMemo(
    () => ({
      mode,
      theme: THEMES[mode],
      loaded,
      themePreference,
      setThemePreference,
      setTheme,
      toggleTheme,
    }),
    [mode, loaded, themePreference, setThemePreference, setTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export default ThemeContext;
