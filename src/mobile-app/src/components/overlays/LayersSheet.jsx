import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useMap } from '../../context/MapContext';
import { DOMAINS, ZONE_OVERLAYS } from '../../constants';

// Layers sheet body — mirrors the prototype's renderLayers() (index.html):
// two groups (Incident Domains, Zone Overlays), per-row eye toggle,
// Show all/Hide all per group, live "n/total" counts.

function LayerRow({ entry, visible, onToggle, theme }) {
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.borderSubtle },
        pressed && { backgroundColor: theme.bgHover },
      ]}>
      <View
        style={[
          styles.code,
          {
            borderColor: `${entry.color}55`,
            backgroundColor: `${entry.color}18`,
          },
        ]}>
        <Text
          style={[
            styles.codeText,
            { color: entry.color, fontFamily: theme.fontMono },
          ]}>
          {entry.code}
        </Text>
      </View>
      <Text
        style={[
          styles.name,
          { color: visible ? theme.textPrimary : theme.textMuted },
          !visible && styles.nameOff,
        ]}
        numberOfLines={1}>
        {entry.name}
      </Text>
      {visible ? (
        <Eye size={16} color={theme.accentLight} />
      ) : (
        <EyeOff size={16} color={theme.textMuted} />
      )}
    </Pressable>
  );
}

function LayerGroup({ title, shown, total, onShowAll, onHideAll, theme }) {
  return (
    <View style={styles.group}>
      <Text
        style={[
          styles.groupTitle,
          { color: theme.textSecondary, fontFamily: theme.fontMono },
        ]}>
        {title} · {shown}/{total}
      </Text>
      <View style={styles.bulk}>
        <Pressable
          onPress={onShowAll}
          style={({ pressed }) => [
            styles.bulkBtn,
            {
              backgroundColor: theme.bgHover,
              borderColor: theme.borderSubtle,
            },
            pressed && { opacity: 0.7 },
          ]}>
          <Text
            style={[
              styles.bulkText,
              { color: theme.textSecondary, fontFamily: theme.fontMono },
            ]}>
            Show all
          </Text>
        </Pressable>
        <Pressable
          onPress={onHideAll}
          style={({ pressed }) => [
            styles.bulkBtn,
            {
              backgroundColor: theme.bgHover,
              borderColor: theme.borderSubtle,
            },
            pressed && { opacity: 0.7 },
          ]}>
          <Text
            style={[
              styles.bulkText,
              { color: theme.textSecondary, fontFamily: theme.fontMono },
            ]}>
            Hide all
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function LayersSheet() {
  const { theme } = useTheme();
  const {
    layerVisibility,
    toggleDomainLayer,
    toggleZoneLayer,
    setAllDomainLayers,
    setAllZoneLayers,
  } = useMap();

  const domainsShown = DOMAINS.filter(
    (d) => layerVisibility.domains[d.slug] !== false,
  ).length;
  const zonesShown = ZONE_OVERLAYS.filter(
    (z) => layerVisibility.zones[z.slug] !== false,
  ).length;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      <LayerGroup
        title="Incident Domains"
        shown={domainsShown}
        total={DOMAINS.length}
        onShowAll={() => setAllDomainLayers(true)}
        onHideAll={() => setAllDomainLayers(false)}
        theme={theme}
      />
      {DOMAINS.map((d) => (
        <LayerRow
          key={d.slug}
          entry={d}
          visible={layerVisibility.domains[d.slug] !== false}
          onToggle={() => toggleDomainLayer(d.slug)}
          theme={theme}
        />
      ))}
      <LayerGroup
        title="Zone Overlays"
        shown={zonesShown}
        total={ZONE_OVERLAYS.length}
        onShowAll={() => setAllZoneLayers(true)}
        onHideAll={() => setAllZoneLayers(false)}
        theme={theme}
      />
      {ZONE_OVERLAYS.map((z) => (
        <LayerRow
          key={z.slug}
          entry={z}
          visible={layerVisibility.zones[z.slug] !== false}
          onToggle={() => toggleZoneLayer(z.slug)}
          theme={theme}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 6,
    paddingHorizontal: 16,
  },
  groupTitle: {
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  bulk: {
    flexDirection: 'row',
    gap: 8,
  },
  bulkBtn: {
    borderRadius: 5,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  bulkText: {
    fontSize: 9,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  code: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  name: {
    flex: 1,
    fontSize: 12.5,
  },
  nameOff: {
    textDecorationLine: 'line-through',
  },
});
