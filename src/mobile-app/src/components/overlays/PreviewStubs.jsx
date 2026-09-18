import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useOverlay } from '../../context/OverlayContext';
import { useMap } from '../../context/MapContext';
import { useSelection } from '../../context/SelectionContext';
import { severityOf, zoneOverlayFor } from '../selection/PreviewCard';

// Temporary preview wiring — real directory / bookmarks / history surfaces
// land in later prompts; these rows exercise previewItemOnMap from both
// origin types (fullscreen stays mounted; sheets close + restore).

function PreviewRows({ origin }) {
  const { theme } = useTheme();
  const { incidents, zones, selectedId, loading } = useMap();
  const { previewItemOnMap } = useSelection();

  const rows = [
    ...incidents.slice(0, 4).map((i) => ({ kind: 'incident', item: i })),
    ...zones.slice(0, 2).map((z) => ({ kind: 'zone', item: z })),
  ];

  if (loading) {
    return (
      <Text style={[styles.note, { color: theme.textMuted, fontFamily: theme.fontMono }]}>
        LOADING…
      </Text>
    );
  }
  if (!rows.length) {
    return (
      <Text style={[styles.note, { color: theme.textMuted, fontFamily: theme.fontMono }]}>
        NOTHING IN RANGE — WIDEN THE DATE FILTER
      </Text>
    );
  }

  return rows.map(({ kind, item }) => {
    const color =
      kind === 'zone'
        ? item.zone_category_color || theme.accentLight
        : theme[`sev${severityOf(item)}`];
    const label =
      kind === 'zone'
        ? zoneOverlayFor(item.zone_category_name)?.code?.toUpperCase() || 'ZONE'
        : (item.category_name || item.domain_name || 'INCIDENT').toUpperCase();
    const highlighted = selectedId === item.id;
    return (
      <Pressable
        key={item.id}
        onPress={() => previewItemOnMap(kind, item, origin)}
        style={[
          styles.rowCard,
          {
            backgroundColor: theme.bgElevated,
            borderColor: highlighted ? theme.accentLight : theme.borderSubtle,
          },
        ]}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text
          numberOfLines={1}
          style={[styles.rowTitle, { color: theme.textPrimary }]}>
          {item.title}
        </Text>
        <Text
          style={[
            styles.rowLabel,
            { color: theme.textMuted, fontFamily: theme.fontMono },
          ]}>
          {label}
        </Text>
      </Pressable>
    );
  });
}

// Profile drawer body — dev rows wiring the pending surfaces (bookmarks,
// history, settings) until the real profile screen lands.
export function ProfileDrawerBody() {
  const { theme } = useTheme();
  const { openOverlay } = useOverlay();
  const rows = [
    { id: 'searchHub', label: 'Search hub (dev)' },
    { id: 'bookmarks', label: 'Bookmarks (dev)' },
    { id: 'history', label: 'History (dev)' },
    { id: 'settings', label: 'Settings (dev)' },
  ];
  return (
    <View style={styles.bodyPad}>
      {rows.map((r) => (
        <Pressable
          key={r.id}
          onPress={() => openOverlay({ id: r.id, type: 'sheet' })}
          style={[
            styles.rowCard,
            {
              backgroundColor: theme.bgElevated,
              borderColor: theme.borderSubtle,
            },
          ]}>
          <Text style={[styles.rowLabelBig, { color: theme.textPrimary }]}>
            {r.label}
          </Text>
          <Text style={{ color: theme.textMuted }}>›</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Note({ text }) {
  const { theme } = useTheme();
  return (
    <Text
      style={[styles.note, { color: theme.textMuted, fontFamily: theme.fontMono }]}>
      {text}
    </Text>
  );
}

export function SheetPreviewBody({ overlay }) {
  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Note text="— LIST DESIGN PENDING · PREVIEW ROWS DRIVE THE SELECTION FLOW —" />
      <PreviewRows origin={{ type: 'sheet', id: overlay.id }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: 16,
    gap: 8,
  },
  bodyPad: {
    padding: 16,
    gap: 8,
  },
  rowLabelBig: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  note: {
    fontSize: 9,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 8,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rowTitle: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
  },
  rowLabel: {
    fontSize: 9,
    letterSpacing: 1,
  },
});
