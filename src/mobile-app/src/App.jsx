import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { OverlayProvider } from './context/OverlayContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import MapScreen from './screens/map/MapScreen';
import OverlayHost from './components/overlays/OverlayHost';

const Stack = createNativeStackNavigator();

function Splash() {
  const { theme } = useTheme();
  return (
    <View style={[styles.splash, { backgroundColor: theme.bgDeep }]}>
      <View
        style={[
          styles.splashLogo,
          {
            backgroundColor: theme.accent,
            borderColor: theme.accentLight,
            shadowColor: theme.accentLight,
          },
        ]}>
        <Text style={[styles.splashLogoText, { fontFamily: theme.fontMono }]}>
          24
        </Text>
      </View>
      <Text
        style={[
          styles.splashTitle,
          { color: theme.textPrimary, fontFamily: theme.fontHead },
        ]}>
        IntelMap24
      </Text>
    </View>
  );
}

function Root() {
  const { mode, theme, loaded } = useTheme();
  const { initializing } = useAuth();
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

  if (!loaded || initializing) {
    return <Splash />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Map" component={MapScreen} />
      </Stack.Navigator>
      <OverlayHost />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <OverlayProvider>
          <AuthProvider>
            <Root />
          </AuthProvider>
        </OverlayProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    elevation: 6,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  splashLogoText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  splashTitle: {
    fontSize: 19,
    fontWeight: '600',
  },
});
