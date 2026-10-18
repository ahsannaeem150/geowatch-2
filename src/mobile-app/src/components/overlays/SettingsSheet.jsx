import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SheetScrollView } from './SheetContainer';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useMap } from '../../context/MapContext';
import { SEL_MODES, useSelection } from '../../context/SelectionContext';
import { useLive } from '../../context/LiveContext';
import { useOverlay } from '../../context/OverlayContext';
import LayersSheet from './LayersSheet';

// Settings sheet (prototype #sheet-settings): main view with Appearance /
// Notifications / Default Map Layers rows + Selection Behavior mode cards;
// Notifications and Layers slide in as nested subviews (settingsSection /
// settingsBack), hardware back returns to the main view first.

const MODE_META = {
  peek: {
    title: 'Peek panel',
    recommended: true,
    sub: 'Tap opens a half-screen preview. Tap the preview to expand full details. Back collapses to a small bar.',
  },
  compact: {
    title: 'Compact bar',
    recommended: false,
    sub: 'Tap opens a small bar at the bottom. Tap the bar to expand full details.',
  },
  direct: {
    title: 'Direct panel',
    recommended: false,
    sub: 'Tap opens full details immediately. Back collapses to a small bar.',
  },
};

const NOTIF_ROWS = [
  {
    key: 'newIncidents',
    name: 'New incident alerts',
    sub: 'Notify when new incidents appear',
    toastOn: 'New incident alerts enabled',
    toastOff: 'New incident alerts disabled',
  },
  {
    key: 'updates',
    name: 'Incident updates',
    sub: 'Notify on timeline updates of incidents you recently viewed',
    toastOn: 'Update alerts enabled',
    toastOff: 'Update alerts disabled',
  },
  {
    key: 'zones',
    name: 'Zone activations',
    sub: 'NOTAM, curfews, exclusion zones',
    toastOn: 'Zone alerts enabled',
    toastOff: 'Zone alerts disabled',
  },
  {
    key: 'criticalOnly',
    name: 'Critical severity only',
    sub: 'Only S4 and S5 incidents',
    toastOn: 'Severity 4+ alerts enabled',
    toastOff: 'Severity 4+ alerts disabled',
  },
  {
    key: 'sound',
    name: 'Sound',
    sub: 'Play sound with alerts',
    toastOn: 'Sound enabled',
    toastOff: 'Sound disabled',
    // Stored only — no audio playback wired yet.
  },
];

function SectionLabel({ children, theme, spaced }) {
  return (
    <Text
      style={[
        styles.secLabel,
        spaced && styles.secLabelSpaced,
        { color: theme.textMuted, fontFamily: theme.fontMono },
      ]}>
      {children}
    </Text>
  );
}

function SetRow({ name, sub, right, onPress, theme, last }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.setRow,
        !last && styles.setRowGap,
        { backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle },
        pressed && { opacity: 0.75 },
      ]}>
      <View style={styles.setRowBody}>
        <Text style={[styles.setName, { color: theme.textPrimary }]}>{name}</Text>
        <Text style={[styles.setSub, { color: theme.textSecondary }]}>{sub}</Text>
      </View>
      {right}
    </Pressable>
  );
}

// The 5-toggle body — shared by the settings subview and the standalone
// 'notifPrefs' sheet opened from the profile page (prototype #sheet-notifprefs).
export function NotifPrefsBody() {
  const { theme } = useTheme();
  const { notifPrefs, setNotifPref } = useLive();
  const { showToast } = useOverlay();
  return (
    <SheetScrollView contentContainerStyle={styles.bodyPad}>
      {NOTIF_ROWS.map((row, i) => {
        const on = notifPrefs[row.key] !== false;
        return (
          <SetRow
            key={row.key}
            name={row.name}
            sub={row.sub}
            last={i === NOTIF_ROWS.length - 1}
            theme={theme}
            onPress={() => {
              setNotifPref(row.key, !on);
              showToast(on ? row.toastOff : row.toastOn);
            }}
            right={
              <Switch
                value={on}
                onValueChange={(v) => {
                  setNotifPref(row.key, v);
                  showToast(v ? row.toastOn : row.toastOff);
                }}
                trackColor={{
                  false: theme.borderSubtle,
                  true: theme.accent,
                }}
                thumbColor={on ? theme.accentLight : theme.textMuted}
              />
            }
          />
        );
      })}
    </SheetScrollView>
  );
}

// Startup-layer defaults share the ONE layer store MapContext already
// persists (STORAGE_KEYS.LAYERS, applied at launch) — the Layers sheet and
// this subview edit the same toggles (simplification noted in the P12 brief).
export function LayersPrefsBody() {
  return <LayersSheet />;
}

// "Auto-zoom on selection" — web Settings drawer parity: off keeps the
// user's zoom and pans only (MapContext persists STORAGE_KEYS.AUTO_ZOOM).
function AutoZoomRow({ theme }) {
  const { autoZoomEnabled, setAutoZoomEnabled } = useMap();
  return (
    <SetRow
      name="Auto-zoom on selection"
      sub="Zoom map to selected incidents and zones"
      theme={theme}
      last
      onPress={() => setAutoZoomEnabled(!autoZoomEnabled)}
      right={
        <Switch
          value={autoZoomEnabled}
          onValueChange={setAutoZoomEnabled}
          trackColor={{ false: theme.borderSubtle, true: theme.accent }}
          thumbColor={autoZoomEnabled ? theme.accentLight : theme.textMuted}
        />
      }
    />
  );
}

function ModeCard({ mode, theme }) {
  const { selMode, setSelMode } = useSelection();
  const meta = MODE_META[mode];
  const selected = selMode === mode;
  return (
    <Pressable
      onPress={() => setSelMode(mode)}
      style={({ pressed }) => [
        styles.modeCard,
        {
          backgroundColor: selected ? theme.accentSubtleBg : theme.bgElevated,
          borderColor: selected ? theme.accentLight : theme.borderSubtle,
        },
        pressed && { opacity: 0.8 },
      ]}>
      <View
        style={[
          styles.radio,
          { borderColor: selected ? theme.accentLight : theme.borderSubtle },
        ]}>
        {selected ? (
          <View
            style={[styles.radioDot, { backgroundColor: theme.accentLight }]}
          />
        ) : null}
      </View>
      <View style={styles.modeBody}>
        <View style={styles.modeTitleRow}>
          <Text style={[styles.modeTitle, { color: theme.textPrimary }]}>
            {meta.title}
          </Text>
          {meta.recommended ? (
            <View
              style={[
                styles.recTag,
                {
                  backgroundColor: theme.accentSubtleBg,
                  borderColor: theme.accentSubtleBorder,
                },
              ]}>
              <Text
                style={[
                  styles.recText,
                  { color: theme.accentLight, fontFamily: theme.fontMono },
                ]}>
                RECOMMENDED
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.modeSub, { color: theme.textSecondary }]}>
          {meta.sub}
        </Text>
      </View>
    </Pressable>
  );
}

const SUB_TITLES = {
  notifications: 'Notification Preferences',
  layers: 'Default Map Layers',
};

export default function SettingsSheet() {
  const { mode, theme, toggleTheme } = useTheme();
  const [section, setSection] = useState('main');
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (section !== 'main') {
      slide.setValue(40);
      Animated.timing(slide, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [section, slide]);

  // Hardware back returns to the main view before the sheet itself closes.
  useEffect(() => {
    if (section === 'main') {
      return undefined;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSection('main');
      return true;
    });
    return () => sub.remove();
  }, [section]);

  if (section !== 'main') {
    return (
      <Animated.View
        style={[styles.subWrap, { transform: [{ translateX: slide }] }]}>
        <View
          style={[styles.subHead, { borderBottomColor: theme.borderSubtle }]}>
          <Pressable
            onPress={() => setSection('main')}
            hitSlop={8}
            style={({ pressed }) => [
              styles.backBtn,
              { backgroundColor: pressed ? theme.bgHover : 'transparent' },
            ]}>
            <ChevronLeft size={18} color={theme.textSecondary} />
          </Pressable>
          <Text
            style={[
              styles.subTitle,
              { color: theme.textSecondary, fontFamily: theme.fontMono },
            ]}>
            {SUB_TITLES[section].toUpperCase()}
          </Text>
        </View>
        {section === 'notifications' ? <NotifPrefsBody /> : <LayersPrefsBody />}
      </Animated.View>
    );
  }

  return (
    <SheetScrollView contentContainerStyle={styles.bodyPad}>
      <SectionLabel theme={theme}>APPEARANCE</SectionLabel>
      <SetRow
        name="Theme"
        sub="Toggle dark or light mode"
        theme={theme}
        onPress={toggleTheme}
        right={
          <Text
            style={[
              styles.rowValue,
              { color: theme.accentLight, fontFamily: theme.fontMono },
            ]}>
            {mode === 'dark' ? 'Dark' : 'Light'}
          </Text>
        }
      />
      <SetRow
        name="Notifications"
        sub="Alerts & update preferences"
        theme={theme}
        onPress={() => setSection('notifications')}
        right={<ChevronRight size={16} color={theme.textMuted} />}
      />
      <SetRow
        name="Default Map Layers"
        sub="Choose startup layers"
        theme={theme}
        last
        onPress={() => setSection('layers')}
        right={<ChevronRight size={16} color={theme.textMuted} />}
      />

      <SectionLabel theme={theme} spaced>
        SELECTION BEHAVIOR
      </SectionLabel>
      <Text style={[styles.selHint, { color: theme.textSecondary }]}>
        Choose what happens when you tap an incident or zone on the map.
      </Text>
      {SEL_MODES.map((m) => (
        <ModeCard key={m} mode={m} theme={theme} />
      ))}
      <AutoZoomRow theme={theme} />

      <View style={styles.footnote}>
        <Info size={12} color={theme.textMuted} />
        <Text
          style={[
            styles.footnoteText,
            { color: theme.textMuted, fontFamily: theme.fontMono },
          ]}>
          Preferences are stored locally on this device.
        </Text>
      </View>
    </SheetScrollView>
  );
}

const styles = StyleSheet.create({
  bodyPad: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 24,
  },
  secLabel: {
    fontSize: 10,
    letterSpacing: 1.6,
    paddingVertical: 8,
  },
  secLabelSpaced: {
    paddingTop: 18,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 11,
    paddingVertical: 11,
    paddingHorizontal: 13,
    gap: 10,
  },
  setRowGap: {
    marginBottom: 9,
  },
  setRowBody: {
    flex: 1,
    minWidth: 0,
  },
  setName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  setSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  rowValue: {
    fontSize: 10.5,
    letterSpacing: 0.8,
  },
  selHint: {
    fontSize: 11.5,
    lineHeight: 17,
    marginBottom: 12,
  },
  modeCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 11,
    marginBottom: 9,
  },
  radio: {
    width: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  radioDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  modeBody: {
    flex: 1,
    minWidth: 0,
  },
  modeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  modeTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  recTag: {
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  recText: {
    fontSize: 8,
    letterSpacing: 0.8,
  },
  modeSub: {
    fontSize: 11,
    lineHeight: 16,
  },
  footnote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingTop: 16,
    paddingHorizontal: 2,
  },
  footnoteText: {
    fontSize: 10,
    letterSpacing: 0.4,
  },
  subWrap: {
    flex: 1,
  },
  subHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subTitle: {
    fontSize: 10.5,
    letterSpacing: 1.4,
  },
});
