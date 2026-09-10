import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search } from 'lucide-react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useOverlay } from '../../../context/OverlayContext';

export default function TopBar() {
  const { theme } = useTheme();
  const { openOverlay } = useOverlay();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.row, { top: insets.top + 8 }]} pointerEvents="box-none">
      <Pressable
        onPress={() => openOverlay({ id: 'profile', type: 'drawerLeft' })}
        style={[
          styles.avatar,
          {
            backgroundColor: theme.accent,
            borderColor: theme.accentLight,
          },
        ]}>
        <Text style={styles.avatarText}>A</Text>
      </Pressable>
      <Pressable
        onPress={() => openOverlay({ id: 'commandPalette', type: 'topPanel' })}
        style={[
          styles.pill,
          {
            backgroundColor: theme.bgGlass,
            borderColor: theme.borderSubtle,
          },
        ]}>
        <Search size={16} color={theme.textMuted} />
        <Text style={[styles.pillText, { color: theme.textMuted }]}>
          Search incidents & locations
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 10,
    zIndex: 30,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  pill: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 15,
  },
  pillText: {
    fontSize: 13.5,
  },
});
