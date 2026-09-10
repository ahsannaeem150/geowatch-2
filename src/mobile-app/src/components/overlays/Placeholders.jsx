import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import SignInModal from './SignInModal';

// Placeholder overlay bodies — each mirrors the prototype's showPlaceholder:
// correct container type + title + close button + pending body copy.
// Swap entries here for real screens as they are designed.

export const OVERLAY_META = {
  profile: { title: 'Account' },
  commandPalette: { title: 'Search' },
  searchHub: { title: 'Search', heightFraction: 0.82 },
  layers: { title: 'Map Layers', heightFraction: 0.6 },
  activity: { title: 'Live Activity', heightFraction: 0.6, meta: 'LIVE · REAL-TIME VIA SSE' },
  alerts: { title: 'Alerts', heightFraction: 0.6, meta: '9+ UNREAD' },
  settings: { title: 'Settings', heightFraction: 0.7 },
  bookmarks: { title: 'Bookmarks', heightFraction: 0.7 },
  history: { title: 'History', heightFraction: 0.7 },
  powerSearch: { title: 'Power Search' },
  incidentsDirectory: { title: 'Incidents' },
  zonesDirectory: { title: 'Zones' },
  profilePage: { title: 'Profile' },
  // Prototype sign-in card: bare sheet body, no grabber/title row, 22px corners.
  signIn: { title: 'Sign in', heightFraction: 0.52, hideHeader: true, topRadius: 22 },
};

// Real bodies keyed by overlay id — overrides PlaceholderBody when present.
export const OVERLAY_BODIES = {
  signIn: SignInModal,
};

export function PlaceholderBody() {
  const { theme } = useTheme();
  return (
    <View style={styles.body}>
      <Text
        style={[
          styles.text,
          { color: theme.textMuted, fontFamily: theme.fontMono },
        ]}>
        — screen design pending —
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 12,
    letterSpacing: 0.4,
  },
});
