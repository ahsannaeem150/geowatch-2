import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Activity, Bell, Eye, Map as MapIcon, Search } from 'lucide-react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useOverlay } from '../../../context/OverlayContext';
import { useLive } from '../../../context/LiveContext';

// Tab → overlay it opens; used both for press handling and for computing
// which tab is highlighted (the tab whose overlay is topmost).
const TABS = [
  { key: 'map', label: 'Map', Icon: MapIcon },
  { key: 'search', label: 'Search', Icon: Search, overlay: { id: 'powerSearch', type: 'fullscreen' } },
  { key: 'viewport', label: 'Incidents', Icon: Eye, overlay: { id: 'incidentsDirectory', type: 'fullscreen' } },
  { key: 'activity', label: 'Activity', Icon: Activity, overlay: { id: 'activity', type: 'fullscreen' } },
  { key: 'alerts', label: 'Alerts', Icon: Bell, overlay: { id: 'alerts', type: 'fullscreen' } },
];

export default function TabBar() {
  const { theme } = useTheme();
  const { openOverlay, closeAll, stack } = useOverlay();
  const { unreadCount } = useLive();
  const insets = useSafeAreaInsets();

  const badge =
    unreadCount > 0 ? (unreadCount > 9 ? '9+' : String(unreadCount)) : null;

  const topId = stack.length ? stack[stack.length - 1].id : null;

  const isActive = (tab) => {
    if (!topId) {
      return tab.key === 'map';
    }
    return tab.overlay?.id === topId;
  };

  const onPress = (tab) => {
    if (tab.key === 'map') {
      closeAll();
      return;
    }
    openOverlay(tab.overlay);
  };

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.bgGlass,
          borderTopColor: theme.borderSubtle,
          paddingBottom: 10 + insets.bottom,
        },
      ]}>
      {TABS.map((tab) => {
        const active = isActive(tab);
        const color = active ? theme.accentLight : theme.textMuted;
        const tabBadge = tab.key === 'alerts' ? badge : null;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onPress(tab)}
            style={styles.tab}>
            {active ? (
              <View
                style={[
                  styles.activeTick,
                  { backgroundColor: theme.accentLight },
                ]}
              />
            ) : null}
            <View>
              <tab.Icon size={22} color={color} strokeWidth={1.8} />
              {tabBadge ? (
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: theme.accentLight },
                  ]}>
                  <Text
                    style={[styles.badgeText, { fontFamily: theme.fontMono }]}>
                    {tabBadge}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, { color }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingHorizontal: 6,
    zIndex: 60,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingTop: 6,
  },
  activeTick: {
    position: 'absolute',
    top: -9,
    left: '25%',
    right: '25%',
    height: 2,
  },
  label: {
    fontSize: 9.5,
    fontWeight: '500',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -14,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
});
