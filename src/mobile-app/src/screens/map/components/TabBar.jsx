import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Activity, Bell, List, Map as MapIcon, Search } from 'lucide-react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useOverlay } from '../../../context/OverlayContext';
import { useLive } from '../../../context/LiveContext';
import { useSelection } from '../../../context/SelectionContext';

const TABS = [
  { key: 'map', label: 'Map', Icon: MapIcon },
  { key: 'search', label: 'Search', Icon: Search, overlay: { id: 'powerSearch', type: 'fullscreen' } },
  { key: 'viewport', label: 'Incidents', Icon: List, overlay: { id: 'incidentsDirectory', type: 'fullscreen' } },
  { key: 'activity', label: 'Activity', Icon: Activity, overlay: { id: 'activity', type: 'fullscreen' } },
  { key: 'alerts', label: 'Alerts', Icon: Bell, overlay: { id: 'alerts', type: 'fullscreen' } },
];

function tabState(theme, active, pressed) {
  return {
    backgroundColor: active ? theme.accent : pressed ? theme.bgHover : 'transparent',
  };
}

export default function TabBar() {
  const { theme } = useTheme();
  const { openOverlay, closeAll, stack } = useOverlay();
  const { origin, view, closePreview, collapsePeek } = useSelection();
  const { unreadCount } = useLive();
  const insets = useSafeAreaInsets();

  const badge =
    unreadCount > 0 ? (unreadCount > 9 ? '9+' : String(unreadCount)) : null;

  const topId = stack.length ? stack[stack.length - 1].id : null;

  const isActive = (tab) => {
    if (!topId) return tab.key === 'map';
    return tab.overlay?.id === topId;
  };

  const onPress = (tab) => {
    if (tab.key === 'map') {
      if (origin && origin.id !== 'powerSearch') closePreview();
      if (view !== 'idle' && view !== 'pill') collapsePeek();
      closeAll();
      return;
    }
    if (origin && origin.id !== 'powerSearch') {
      closePreview();
    } else if (view !== 'idle' && view !== 'pill') {
      collapsePeek();
    }
    openOverlay(tab.overlay);
  };

  return (
    <View
      style={[
        styles.barWrap,
        {
          backgroundColor: theme.bgSurface,
          borderTopColor: theme.borderSubtle,
          borderBottomColor: theme.accentSubtleBorder,
          paddingBottom: 2 + insets.bottom,
        },
      ]}>
      <View style={[styles.bar, { backgroundColor: theme.bgSurface }]}>
        {TABS.map((tab) => {
          const active = isActive(tab);
          const color = active ? '#f2f2f2' : theme.textMuted;
          const tabBadge = tab.key === 'alerts' ? badge : null;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${tab.label} tab`}
              onPress={() => onPress(tab)}
              style={({ pressed }) => [
                styles.tab,
                tabState(theme, active, pressed),
              ]}>
              <View style={styles.iconWrap}>
                <tab.Icon
                  size={22}
                  color={color}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                {tabBadge ? (
                  <View style={[styles.badge, { backgroundColor: theme.accentLight }]}>
                    <Text style={[styles.badgeText, { fontFamily: theme.fontMono }]}>
                      {tabBadge}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                style={[
                  styles.label,
                  active ? styles.labelActive : styles.labelInactive,
                  { color },
                ]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 1,
    zIndex: 60,
  },
  bar: {
    height: 56,
    flexDirection: 'row',
    padding: 4,
  },
  tab: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 14,
  },
  iconWrap: {
    height: 25,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10.5,
    lineHeight: 13,
    letterSpacing: 0.1,
  },
  labelActive: {
    fontWeight: '600',
  },
  labelInactive: {
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -9,
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
