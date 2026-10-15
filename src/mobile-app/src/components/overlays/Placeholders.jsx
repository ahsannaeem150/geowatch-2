import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import SignInModal from './SignInModal';
import LayersSheet from './LayersSheet';
import SettingsSheet, { LayersPrefsBody, NotifPrefsBody } from './SettingsSheet';
import SearchHubBody from './SearchHubBody';
import PowerSearchBody from './PowerSearchScreen';
import CommandPaletteBody from './CommandPalette';
import { IncidentsDirectoryBody, ZonesDirectoryBody } from './DirectoryScreen';
import ProfileDrawer from './ProfileDrawer';
import { ProfilePageBody, ProfilePanelBody } from './ProfileScreen';
import { BookmarksSheetBody, HistorySheetBody } from './SavedSheets';
import { ActivitySheetBody, AlertsSheetBody } from './ActivityAlerts';
import { AboutSheetBody, HelpSheetBody } from './SupportSheets';

// Placeholder overlay bodies — each mirrors the prototype's showPlaceholder:
// correct container type + title + close button + pending body copy.
// Swap entries here for real screens as they are designed.

export const OVERLAY_META = {
  // Profile drawer renders its own avatar header (prototype #profile-ov).
  profile: { title: 'Account', hideHeader: true },
  // Palette renders its own input row (ESC chip replaces the header close).
  commandPalette: { title: 'Search', hideHeader: true },
  searchHub: { title: 'Search', heightFraction: 0.82 },
  layers: { title: 'Map Layers', heightFraction: 0.6 },
  // Activity + Alerts are tab destinations: fullscreen pages with their own
  // header rows (back ‹ + title/subtitle + meta action), like directories.
  activity: { title: 'Live Activity', hideHeader: true },
  alerts: { title: 'Alerts', hideHeader: true },
  settings: { title: 'Settings', heightFraction: 0.7 },
  notifPrefs: { title: 'Notification Preferences', heightFraction: 0.7 },
  layersPref: { title: 'Default Map Layers', heightFraction: 0.7 },
  help: { title: 'Help & Feedback', heightFraction: 0.52 },
  about: { title: 'About', heightFraction: 0.52 },
  bookmarks: { title: 'Bookmarks', heightFraction: 0.7 },
  history: { title: 'History', heightFraction: 0.7 },
  // Power Search renders its own header and keeps the middle transparent so
  // the map shows through (prototype .ps-screen).
  powerSearch: { title: 'Power Search', hideHeader: true, transparent: true },
  // Directories render their own header (back ‹ + title/subtitle + Reset).
  incidentsDirectory: { title: 'Incidents', hideHeader: true },
  zonesDirectory: { title: 'Zones', hideHeader: true },
  // Profile page renders its own hero; the side panel (#pr-sidepanel) stacks
  // above it as another fullscreen with its own back ‹ row.
  profilePage: { title: 'Profile', hideHeader: true },
  profilePanel: { title: 'Profile panel', hideHeader: true },
  // Prototype sign-in card: bare sheet body, no grabber/title row, 22px corners.
  signIn: { title: 'Sign in', heightFraction: 0.52, hideHeader: true, topRadius: 22 },
};

// Real bodies keyed by overlay id — overrides PlaceholderBody when present.
export const OVERLAY_BODIES = {
  signIn: SignInModal,
  layers: LayersSheet,
  settings: SettingsSheet,
  searchHub: SearchHubBody,
  powerSearch: PowerSearchBody,
  commandPalette: CommandPaletteBody,
  incidentsDirectory: IncidentsDirectoryBody,
  zonesDirectory: ZonesDirectoryBody,
  bookmarks: BookmarksSheetBody,
  history: HistorySheetBody,
  activity: ActivitySheetBody,
  alerts: AlertsSheetBody,
  notifPrefs: NotifPrefsBody,
  layersPref: LayersPrefsBody,
  help: HelpSheetBody,
  about: AboutSheetBody,
  profile: ProfileDrawer,
  profilePage: ProfilePageBody,
  profilePanel: ProfilePanelBody,
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
