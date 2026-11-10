import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';

const OnboardingContext = createContext(null);
const FORCE_ONBOARDING_EVERY_LAUNCH = true;

export function OnboardingProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (FORCE_ONBOARDING_EVERY_LAUNCH) {
      setVisible(true);
      setReady(true);
      return undefined;
    }
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE)
      .then((stored) => {
        if (!cancelled) setVisible(stored !== '1');
      })
      .catch(() => {
        if (!cancelled) setVisible(true);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const completeOnboarding = useCallback(() => {
    setVisible(false);
    AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, '1').catch(() => {});
  }, []);

  const replayOnboarding = useCallback(() => {
    setVisible(true);
  }, []);

  const value = useMemo(
    () => ({ ready, visible, completeOnboarding, replayOnboarding }),
    [ready, visible, completeOnboarding, replayOnboarding],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}
