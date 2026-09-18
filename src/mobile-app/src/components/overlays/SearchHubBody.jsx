import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Filter, Hexagon, List, Search } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useOverlay } from '../../context/OverlayContext';

// Search hub sheet (prototype #sheet-search / openSearchHub): input + chips
// into the directory fullscreens and power search. Result rows arrive with
// the power-search prompt — the input is wired but only hints for now.

const CHIPS = [
  {
    id: 'incidentsDirectory',
    type: 'fullscreen',
    label: 'All Incidents',
    Icon: List,
    power: false,
  },
  {
    id: 'zonesDirectory',
    type: 'fullscreen',
    label: 'Zones',
    Icon: Hexagon,
    power: false,
  },
  {
    id: 'powerSearch',
    type: 'fullscreen',
    label: 'Power Search',
    Icon: Filter,
    power: true,
  },
];

export default function SearchHubBody() {
  const { theme } = useTheme();
  const { openOverlay } = useOverlay();
  const [q, setQ] = useState('');

  return (
    <View style={styles.body}>
      <View
        style={[
          styles.searchRow,
          { backgroundColor: theme.bgInput, borderColor: theme.borderSubtle },
        ]}>
        <Search size={15} color={theme.textMuted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search incidents, zones, locations…"
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={[
            styles.searchInput,
            { color: theme.textPrimary, fontFamily: theme.fontHead },
          ]}
        />
      </View>

      <View style={styles.chipRow}>
        {CHIPS.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => openOverlay({ id: c.id, type: c.type })}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: c.power
                  ? theme.accentSubtleBg
                  : pressed
                    ? theme.bgHover
                    : theme.bgElevated,
                borderColor: c.power ? theme.accentLight : theme.borderSubtle,
              },
            ]}>
            <c.Icon
              size={13}
              color={c.power ? theme.accentLight : theme.textSecondary}
            />
            <Text
              style={[
                styles.chipText,
                { fontFamily: theme.fontMono },
                { color: c.power ? theme.accentLight : theme.textSecondary },
              ]}>
              {c.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text
        style={[
          styles.note,
          { color: theme.textMuted, fontFamily: theme.fontMono },
        ]}>
        — LIVE RESULTS ARRIVE WITH POWER SEARCH —
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  note: {
    fontSize: 9,
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 8,
  },
});
