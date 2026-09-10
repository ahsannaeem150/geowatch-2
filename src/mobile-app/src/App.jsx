import React from 'react';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { OverlayProvider } from './context/OverlayContext';
import MapScreen from './screens/map/MapScreen';
import OverlayHost from './components/overlays/OverlayHost';

const Stack = createNativeStackNavigator();

function Root() {
  const { mode, theme } = useTheme();
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

  return (
    <OverlayProvider>
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Map" component={MapScreen} />
        </Stack.Navigator>
        <OverlayHost />
      </NavigationContainer>
    </OverlayProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Root />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
