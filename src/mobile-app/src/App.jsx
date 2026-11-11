import React, { useCallback, useEffect, useState } from 'react';
import { initNetworkSimulation } from './services/networkSimulation';
import { StyleSheet } from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { OnboardingProvider, useOnboarding } from './context/OnboardingContext';
import { OverlayProvider } from './context/OverlayContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MapProvider } from './context/MapContext';
import { LiveProvider } from './context/LiveContext';
import { SelectionProvider } from './context/SelectionContext';
import MapScreen from './screens/map/MapScreen';
import OverlayHost from './components/overlays/OverlayHost';
import LaunchScreen from './components/launch/LaunchScreen';
import OnboardingScreen from './components/launch/OnboardingScreen';

const Stack = createNativeStackNavigator();

function ProductApp({ navTheme }) {
  return (
    <MapProvider>
      <LiveProvider>
        <SelectionProvider>
          <NavigationContainer theme={navTheme}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Map" component={MapScreen} />
            </Stack.Navigator>
            <OverlayHost />
          </NavigationContainer>
        </SelectionProvider>
      </LiveProvider>
    </MapProvider>
  );
}

function Root() {
  useEffect(() => {
    initNetworkSimulation();
  }, []);

  const { mode, theme, loaded } = useTheme();
  const { initializing } = useAuth();
  const {
    ready: onboardingReady,
    visible: onboardingVisible,
    completeOnboarding,
  } = useOnboarding();
  const [launchComplete, setLaunchComplete] = useState(false);
  const finishLaunch = useCallback(() => setLaunchComplete(true), []);
  const base = mode === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: theme.bgDeep,
      card: theme.bgSurface,
      primary: theme.accentLight,
      text: theme.textPrimary,
      border: theme.borderSubtle,
    },
  };

  if (!launchComplete) {
    return (
      <LaunchScreen
        ready={loaded && !initializing && onboardingReady}
        firstRun={onboardingVisible}
        onComplete={finishLaunch}
      />
    );
  }

  if (onboardingVisible) {
    return <OnboardingScreen onDone={completeOnboarding} />;
  }

  return <ProductApp navTheme={navTheme} />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ThemeProvider>
          <OnboardingProvider>
            <OverlayProvider>
              <AuthProvider>
                <Root />
              </AuthProvider>
            </OverlayProvider>
          </OnboardingProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
