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
import { ChevronRight, Info } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useMap } from '../../context/MapContext';
import { SEL_MODES, useSelection } from '../../context/SelectionContext';
import { useLive } from '../../context/LiveContext';
import { useOverlay } from '../../context/OverlayContext';
import LayersSheet from './LayersSheet';
import NavigationHeader from './NavigationHeader';

const MODE_META = {
  peek: {
    title: 'Peek panel',
    recommended: true,
    sub: 'Open a half-screen preview. Tap the preview to expand details. Back collapses to a small bar.',
  },
  compact: {
    title: 'Compact bar',
    recommended: false,
    sub: 'Open a small bar first. Tap the bar to expand full details.',
  },
  direct: {
    title: 'Direct panel',
    recommended: false,
    sub: 'Open full details immediately. Back collapses to a small bar.',
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
  },
];

const SECTION_COPY = {
  appearance: { title: 'Appearance', subtitle: 'Choose how IntelMap24 looks' },
  notifications: { title: 'Notifications', subtitle: 'Alerts and update preferences' },
  layers: { title: 'Default Map Layers', subtitle: 'Choose your startup layers' },
};

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

function SettingsGroup({ children, theme }) {
  return (
    <View
      style={[
        styles.group,
        { backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle },
      ]}>
      {children}
    </View>
  );
}

function SetRow({ name, sub, right, onPress, theme, last }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.setRow,
        !last && [styles.setRowDivider, { borderBottomColor: theme.borderSubtle }],
        { backgroundColor: pressed ? theme.bgHover : 'transparent' },
      ]}>
      <View style={styles.setRowBody}>
        <Text style={[styles.setName, { color: theme.textPrimary }]}>{name}</Text>
        {sub ? <Text style={[styles.setSub, { color: theme.textSecondary }]}>{sub}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

function ChoiceCard({ title, sub, selected, onPress, theme, recommended = false, last = false }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeCard,
        {
          backgroundColor: selected ? theme.accentSubtleBg : theme.bgElevated,
          borderColor: selected ? theme.accentLight : theme.borderSubtle,
        },
        last && { marginBottom: 0 },
        pressed && { opacity: 0.82 },
      ]}>
      <View
        style={[
          styles.radio,
          { borderColor: selected ? theme.accentLight : theme.borderSubtle },
        ]}>
        {selected ? (
          <View style={[styles.radioDot, { backgroundColor: theme.accentLight }]} />
        ) : null}
      </View>
      <View style={styles.modeBody}>
        <View style={styles.modeTitleRow}>
          <Text style={[styles.modeTitle, { color: theme.textPrimary }]}>{title}</Text>
          {recommended ? (
            <View
              style={[
                styles.recTag,
                {
                  backgroundColor: theme.accentSubtleBg,
                  borderColor: theme.accentSubtleBorder,
                },
              ]}>
              <Text style={[styles.recText, { color: theme.accentLight, fontFamily: theme.fontMono }]}>
                RECOMMENDED
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.modeSub, { color: theme.textSecondary }]}>{sub}</Text>
      </View>
    </Pressable>
  );
}

function ModeCard({ mode, theme }) {
  const { selMode, setSelMode } = useSelection();
  const meta = MODE_META[mode];
  return (
    <ChoiceCard
      title={meta.title}
      sub={meta.sub}
      recommended={meta.recommended}
      selected={selMode === mode}
      onPress={() => setSelMode(mode)}
      theme={theme}
    />
  );
}

export function NotifPrefsBody() {
  const { theme } = useTheme();
  const { notifPrefs, setNotifPref } = useLive();
  const { showToast } = useOverlay();
  return (
    <SheetScrollView contentContainerStyle={styles.bodyPad}>
      <SettingsGroup theme={theme}>
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
                  trackColor={{ false: theme.borderSubtle, true: theme.accent }}
                  thumbColor={on ? theme.accentLight : theme.textMuted}
                />
              }
            />
          );
        })}
      </SettingsGroup>
    </SheetScrollView>
  );
}

export function LayersPrefsBody() {
  return <LayersSheet />;
}

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

function AppearanceBody() {
  const { theme, themePreference, setThemePreference } = useTheme();
  const options = [
    {
      key: 'system',
      title: 'System default',
      sub: 'Follow your device appearance',
    },
    {
      key: 'dark',
      title: 'Dark',
      sub: 'Low-light tactical interface',
    },
    {
      key: 'light',
      title: 'Light',
      sub: 'Bright editorial interface',
    },
  ];
  return (
    <SheetScrollView contentContainerStyle={styles.bodyPad}>
      <SectionLabel theme={theme}>THEME</SectionLabel>
      {options.map((option, index) => (
        <ChoiceCard
          key={option.key}
          title={option.title}
          sub={option.sub}
          selected={themePreference === option.key}
          onPress={() => setThemePreference(option.key)}
          theme={theme}
          last={index === options.length - 1}
        />
      ))}
    </SheetScrollView>
  );
}

export function NotificationPrefsPage() {
  const { closeOverlay } = useOverlay();
  return (
    <View style={styles.page}>
      <NavigationHeader
        title="Notifications"
        subtitle="Alerts and update preferences"
        onBack={() => closeOverlay('notifPrefs')}
      />
      <NotifPrefsBody />
    </View>
  );
}

export function LayersPrefsPage() {
  const { closeOverlay } = useOverlay();
  return (
    <View style={styles.page}>
      <NavigationHeader
        title="Default Map Layers"
        subtitle="Choose your startup layers"
        onBack={() => closeOverlay('layersPref')}
      />
      <LayersPrefsBody />
    </View>
  );
}

export default function SettingsSheet() {
  const { theme, themePreference } = useTheme();
  const { closeOverlay, openOverlay } = useOverlay();
  const [section, setSection] = useState('main');
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (section !== 'main') {
      slide.setValue(36);
      Animated.timing(slide, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [section, slide]);

  useEffect(() => {
    if (section === 'main') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSection('main');
      return true;
    });
    return () => sub.remove();
  }, [section]);

  if (section !== 'main') {
    const copy = SECTION_COPY[section];
    return (
      <View style={styles.page}>
        <NavigationHeader
          title={copy.title}
          subtitle={copy.subtitle}
          onBack={() => setSection('main')}
        />
        <Animated.View style={[styles.subWrap, { transform: [{ translateX: slide }] }]}>
          {section === 'appearance' ? <AppearanceBody /> : null}
          {section === 'notifications' ? <NotifPrefsBody /> : null}
          {section === 'layers' ? <LayersPrefsBody /> : null}
        </Animated.View>
      </View>
    );
  }

  const preferenceLabel =
    themePreference === 'system' ? 'System default' : themePreference === 'dark' ? 'Dark' : 'Light';

  return (
    <View style={styles.page}>
      <NavigationHeader
        title="Settings"
        subtitle="Appearance, alerts and map behavior"
        onBack={() => closeOverlay('settings')}
      />
      <SheetScrollView contentContainerStyle={styles.bodyPad}>
        <SectionLabel theme={theme}>APPEARANCE</SectionLabel>
        <SettingsGroup theme={theme}>
          <SetRow
            name="Theme & appearance"
            sub={preferenceLabel}
            theme={theme}
            last
            onPress={() => setSection('appearance')}
            right={<ChevronRight size={17} color={theme.textMuted} />}
          />
        </SettingsGroup>

        <SectionLabel theme={theme} spaced>NOTIFICATIONS</SectionLabel>
        <SettingsGroup theme={theme}>
          <SetRow
            name="Alert preferences"
            sub="New incidents, updates, zones and sound"
            theme={theme}
            last
            onPress={() => setSection('notifications')}
            right={<ChevronRight size={17} color={theme.textMuted} />}
          />
        </SettingsGroup>

        <SectionLabel theme={theme} spaced>MAP & INTERACTION</SectionLabel>
        <SettingsGroup theme={theme}>
          <SetRow
            name="Default Map Layers"
            sub="Choose startup layers"
            theme={theme}
            onPress={() => setSection('layers')}
            right={<ChevronRight size={17} color={theme.textMuted} />}
          />
          <AutoZoomRow theme={theme} />
        </SettingsGroup>

        <SectionLabel theme={theme} spaced>SELECTION BEHAVIOR</SectionLabel>
        <Text style={[styles.selHint, { color: theme.textSecondary }]}>
          Choose what happens when you tap an incident or zone on the map.
        </Text>
        {SEL_MODES.map((m) => (
          <ModeCard key={m} mode={m} theme={theme} />
        ))}

        <SectionLabel theme={theme} spaced>SUPPORT</SectionLabel>
        <SettingsGroup theme={theme}>
          <SetRow
            name="Help & Feedback"
            sub="FAQs, app tour and contact"
            theme={theme}
            onPress={() => openOverlay({ id: 'help', type: 'sheet' })}
            right={<ChevronRight size={17} color={theme.textMuted} />}
          />
          <SetRow
            name="About IntelMap24"
            sub="Product information and version"
            theme={theme}
            last
            onPress={() => openOverlay({ id: 'about', type: 'sheet' })}
            right={<ChevronRight size={17} color={theme.textMuted} />}
          />
        </SettingsGroup>

        <View style={styles.footnote}>
          <Info size={13} color={theme.textMuted} />
          <Text style={[styles.footnoteText, { color: theme.textMuted, fontFamily: theme.fontMono }]}>
            Preferences are stored locally on this device.
          </Text>
        </View>
      </SheetScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  bodyPad: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  secLabel: {
    fontSize: 10.5,
    letterSpacing: 1.2,
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  secLabelSpaced: {
    paddingTop: 20,
  },
  group: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  setRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  setRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  setRowBody: {
    flex: 1,
    minWidth: 0,
  },
  setName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  setSub: {
    fontSize: 12,
    lineHeight: 17,
  },
  selHint: {
    fontSize: 12.5,
    lineHeight: 19,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  modeCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 10,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modeBody: {
    flex: 1,
    minWidth: 0,
  },
  modeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  modeTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  recTag: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  recText: {
    fontSize: 8.5,
    letterSpacing: 0.7,
  },
  modeSub: {
    fontSize: 12,
    lineHeight: 18,
  },
  footnote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingTop: 18,
    paddingHorizontal: 2,
  },
  footnoteText: {
    fontSize: 10.5,
    letterSpacing: 0.3,
  },
  subWrap: {
    flex: 1,
  },
});
