import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SEL_MODES, useSelection } from '../../context/SelectionContext';

const MODE_LABELS = {
  peek: 'Peek panel',
  compact: 'Compact bar',
  direct: 'Direct panel',
};

// Settings body — dev-only selection-mode switch until the real Settings
// screen lands (prototype setSelMode + .mode-card row).
export default function SettingsSheet() {
  const { theme } = useTheme();
  const { selMode, setSelMode } = useSelection();

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text
        style={[
          styles.section,
          { color: theme.textMuted, fontFamily: theme.fontMono },
        ]}>
        SELECTION (DEV)
      </Text>
      <View style={styles.row}>
        {SEL_MODES.map((mode) => {
          const selected = selMode === mode;
          return (
            <Pressable
              key={mode}
              onPress={() => setSelMode(mode)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected
                    ? theme.accentSubtleBg
                    : theme.bgElevated,
                  borderColor: selected
                    ? theme.accentLight
                    : theme.borderSubtle,
                },
              ]}>
              <Text
                style={[
                  styles.chipText,
                  { color: selected ? theme.accentLight : theme.textSecondary },
                ]}>
                {MODE_LABELS[mode]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text
        style={[
          styles.note,
          { color: theme.textMuted, fontFamily: theme.fontMono },
        ]}>
        — SETTINGS SCREEN DESIGN PENDING · MODE PERSISTS ACROSS LAUNCHES —
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: 16,
  },
  section: {
    fontSize: 9.5,
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  note: {
    fontSize: 9,
    letterSpacing: 1,
    textAlign: 'center',
  },
});
