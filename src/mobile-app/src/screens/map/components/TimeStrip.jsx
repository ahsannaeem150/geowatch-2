import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, parseISO, isValid } from 'date-fns';
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronLeft,
} from 'lucide-react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useMap } from '../../../context/MapContext';
import MiniCalendar from './MiniCalendar';

const PRESETS = [
  'Today',
  'Yesterday',
  'Last 7 days',
  'Last 30 days',
  'This month',
  'All time',
];

function fmtInputDate(iso) {
  if (!iso) {
    return '';
  }
  const d = parseISO(iso);
  return isValid(d) ? format(d, 'd MMM yyyy') : '';
}

export default function TimeStrip() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  // Date selection lives in MapContext so the map (and later screens) read it.
  const { timeSel, pickPreset, applySingle, applyRange, dateRange } = useMap();
  const { preset, single, from, to } = timeSel;

  // Mode pill (mirrors the web TopBarModePill): LIVE only when the range is
  // exactly today — red pulsing dot + ticking clock. Any other range is
  // HISTORIC (amber, static dot, range label) and tapping it returns to live.
  // It says NOTHING about connectivity.
  const todayIso = format(new Date(), 'yyyy-MM-dd');
  const isLive = dateRange.from === todayIso && dateRange.to === todayIso;
  // Web TopBarModePill palette: tinted alert bg/border + matching text color.
  const modeColor = isLive ? theme.dangerText : theme.warning;
  const modeSoft = isLive ? theme.dangerTextSoft : theme.warningSoft;
  const modeBg = isLive ? theme.dangerBg : theme.warningBg;
  const modeBorder = isLive ? theme.dangerBorder : theme.warningBorder;

  const [now, setNow] = useState(() => new Date());
  const [open, setOpen] = useState(false);
  // Dropdown sub-view: null = main list, otherwise which date field the
  // calendar is editing ('single' | 'from' | 'to') — mirrors the web
  // TopBarDateControl where tapping a field opens the picker.
  const [calField, setCalField] = useState(null);

  // Live clock — 1s ticker, cleaned up on unmount.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Reset the calendar sub-view whenever the dropdown closes.
  useEffect(() => {
    if (!open) {
      setCalField(null);
    }
  }, [open]);

  // Pulsing live dot (live mode only).
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.3,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const dotOpacity = isLive ? pulse : 1;

  // Historic range label (ports the web TopBarModePill formatting).
  const historicText = useMemo(() => {
    if (!dateRange.from || !dateRange.to) {
      return 'ALL TIME';
    }
    const f = parseISO(dateRange.from);
    const t = parseISO(dateRange.to);
    if (dateRange.from === dateRange.to) {
      return format(f, 'd MMM yyyy').toUpperCase();
    }
    const sameYear = f.getFullYear() === t.getFullYear();
    const sameMonth = sameYear && f.getMonth() === t.getMonth();
    if (sameMonth) {
      return `${format(f, 'MMM d').toUpperCase()}–${format(t, 'd')} ${format(t, 'yyyy')}`;
    }
    if (sameYear) {
      return `${format(f, 'MMM d').toUpperCase()} – ${format(t, 'MMM d').toUpperCase()} ${format(t, 'yyyy')}`;
    }
    return `${format(f, 'd MMM yyyy').toUpperCase()} – ${format(t, 'd MMM yyyy').toUpperCase()}`;
  }, [dateRange.from, dateRange.to]);

  // Date button label (mirrors the prototype's preset-label logic).
  const label = useMemo(() => {
    if (preset) {
      return preset;
    }
    if (single) {
      return fmtInputDate(single) || 'Select date';
    }
    if (from || to) {
      const f = from ? parseISO(from) : null;
      const t = to ? parseISO(to) : null;
      if (f && t) {
        const sameMonth =
          f.getFullYear() === t.getFullYear() && f.getMonth() === t.getMonth();
        if (sameMonth) {
          return `${format(f, 'd')}–${format(t, 'd MMM')}`;
        }
        return `${format(f, 'd MMM')}–${format(t, 'd MMM')}`;
      }
      return `${f ? format(f, 'd MMM') : '…'} → ${t ? format(t, 'd MMM') : '…'}`;
    }
    return 'Today';
  }, [preset, single, from, to]);

  const handlePickPreset = (name) => {
    pickPreset(name);
    setOpen(false);
  };

  const handleCalendarPick = (iso) => {
    if (calField === 'single') {
      applySingle(iso);
      setCalField(null);
      setOpen(false);
      return;
    }
    applyRange(calField, iso);
    setCalField(null);
  };

  const calTitle =
    calField === 'single'
      ? 'SINGLE DATE'
      : calField === 'from'
        ? 'FROM DATE'
        : 'TO DATE';

  const calSelected =
    calField === 'single' ? single : calField === 'from' ? from : to;

  return (
    <View style={[styles.wrap, { top: insets.top + 64 }]} pointerEvents="box-none">
      <View style={styles.row}>
        <Pressable
          onPress={isLive ? undefined : () => pickPreset('Today')}
          disabled={isLive}
          style={[
            styles.liveBadge,
            {
              backgroundColor: modeBg,
              borderColor: modeBorder,
            },
          ]}>
          <Animated.View
            style={[
              styles.liveDot,
              {
                backgroundColor: modeColor,
                opacity: dotOpacity,
              },
              isLive && [styles.liveDotGlow, { shadowColor: modeColor }],
            ]}
          />
          {isLive ? (
            <>
              <Text
                style={[
                  styles.liveText,
                  { color: modeColor, fontFamily: theme.fontMono },
                ]}>
                LIVE
              </Text>
              <Text
                style={[
                  styles.liveSep,
                  { color: modeSoft, fontFamily: theme.fontMono },
                ]}>
                ·
              </Text>
              <Text
                style={[
                  styles.liveDay,
                  { color: modeColor, fontFamily: theme.fontMono },
                ]}
                numberOfLines={1}>
                {format(now, 'EEEE')}
              </Text>
              <Text
                style={[
                  styles.liveSep,
                  { color: modeSoft, fontFamily: theme.fontMono },
                ]}>
                ·
              </Text>
              <Text
                style={[
                  styles.liveDate,
                  { color: modeSoft, fontFamily: theme.fontMono },
                ]}
                numberOfLines={1}>
                {format(now, 'd MMMM yyyy')}
              </Text>
              <Text
                style={[
                  styles.liveClock,
                  { color: modeColor, fontFamily: theme.fontMono },
                ]}
                numberOfLines={1}>
                {format(now, 'HH:mm:ss')}
              </Text>
            </>
          ) : (
            <>
              <Text
                style={[
                  styles.liveText,
                  { color: modeColor, fontFamily: theme.fontMono },
                ]}
                numberOfLines={1}>
                {`HISTORIC · ${historicText}`}
              </Text>
              <Pressable
                onPress={() => pickPreset('Today')}
                style={({ pressed }) => [
                  styles.backSegment,
                  { borderLeftColor: modeBorder },
                  pressed && { opacity: 0.55 },
                ]}>
                <Text
                  style={[
                    styles.backSegmentText,
                    { color: modeColor, fontFamily: theme.fontMono },
                  ]}>
                  ↺ LIVE
                </Text>
              </Pressable>
            </>
          )}
        </Pressable>
        <Pressable
          onPress={() => setOpen((v) => !v)}
          style={[
            styles.dateBtn,
            {
              backgroundColor: theme.bgGlassSoft,
              borderColor: theme.borderSubtle,
            },
          ]}>
          <Calendar size={15} color={theme.success} />
          <Text
            style={[
              styles.dateLabel,
              { color: theme.textPrimary, fontFamily: theme.fontHead },
            ]}
            numberOfLines={1}>
            {label}
          </Text>
          <ChevronDown
            size={12}
            color={theme.textMuted}
            style={open ? styles.chevOpen : undefined}
          />
        </Pressable>
      </View>

      {open ? (
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
      ) : null}
      {open ? (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: theme.bgSurface,
              borderColor: theme.borderSubtle,
            },
          ]}>
          {calField ? (
            <View>
              <Pressable
                onPress={() => setCalField(null)}
                style={({ pressed }) => [
                  styles.calBack,
                  pressed && { opacity: 0.6 },
                ]}>
                <ChevronLeft size={14} color={theme.textMuted} />
                <Text
                  style={[
                    styles.calBackText,
                    { color: theme.textMuted, fontFamily: theme.fontMono },
                  ]}>
                  {calTitle}
                </Text>
              </Pressable>
              <MiniCalendar
                key={calField}
                mode="single"
                single={calSelected}
                onPickSingle={handleCalendarPick}
              />
            </View>
          ) : (
            <View>
              {PRESETS.map((name) => (
                <Pressable
                  key={name}
                  onPress={() => handlePickPreset(name)}
                  style={({ pressed }) => [
                    styles.dpItem,
                    preset === name && {
                      backgroundColor: theme.accentSubtleBg,
                    },
                    pressed && { backgroundColor: theme.bgHover },
                  ]}>
                  <Text
                    style={[
                      styles.dpItemText,
                      { color: theme.textSecondary },
                      preset === name && styles.dpItemSelected,
                      preset === name && {
                        color: theme.accentLight,
                      },
                    ]}>
                    {name}
                  </Text>
                </Pressable>
              ))}
              <Text
                style={[
                  styles.dpSec,
                  {
                    color: theme.textMuted,
                    borderTopColor: theme.borderSubtle,
                    fontFamily: theme.fontMono,
                  },
                ]}>
                Single date
              </Text>
              <View style={styles.dpFieldWrap}>
                <Pressable
                  onPress={() => setCalField('single')}
                  style={({ pressed }) => [
                    styles.dpField,
                    {
                      backgroundColor: theme.bgInput,
                      borderColor: theme.borderSubtle,
                    },
                    pressed && { opacity: 0.7 },
                  ]}>
                  <Text
                    style={[
                      styles.dpFieldText,
                      {
                        color: single ? theme.textPrimary : theme.textMuted,
                        fontFamily: theme.fontMono,
                      },
                    ]}>
                    {fmtInputDate(single) || 'Select date'}
                  </Text>
                  <Calendar size={14} color={theme.textMuted} />
                </Pressable>
              </View>
              <Text
                style={[
                  styles.dpSec,
                  {
                    color: theme.textMuted,
                    borderTopColor: theme.borderSubtle,
                    fontFamily: theme.fontMono,
                  },
                ]}>
                Custom range
              </Text>
              <View style={[styles.dpFieldWrap, styles.dpRangeRow]}>
                <Pressable
                  onPress={() => setCalField('from')}
                  style={({ pressed }) => [
                    styles.dpField,
                    styles.dpFieldFlex,
                    {
                      backgroundColor: theme.bgInput,
                      borderColor: theme.borderSubtle,
                    },
                    pressed && { opacity: 0.7 },
                  ]}>
                  <Text
                    style={[
                      styles.dpFieldText,
                      {
                        color: from ? theme.textPrimary : theme.textMuted,
                        fontFamily: theme.fontMono,
                      },
                    ]}>
                    {fmtInputDate(from) || 'From'}
                  </Text>
                  <Calendar size={14} color={theme.textMuted} />
                </Pressable>
                <ArrowRight size={14} color={theme.textMuted} />
                <Pressable
                  onPress={() => setCalField('to')}
                  style={({ pressed }) => [
                    styles.dpField,
                    styles.dpFieldFlex,
                    {
                      backgroundColor: theme.bgInput,
                      borderColor: theme.borderSubtle,
                    },
                    pressed && { opacity: 0.7 },
                  ]}>
                  <Text
                    style={[
                      styles.dpFieldText,
                      {
                        color: to ? theme.textPrimary : theme.textMuted,
                        fontFamily: theme.fontMono,
                      },
                    ]}>
                    {fmtInputDate(to) || 'To'}
                  </Text>
                  <Calendar size={14} color={theme.textMuted} />
                </Pressable>
              </View>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 40,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  liveBadge: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  liveDotGlow: {
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    flexShrink: 1,
  },
  liveClock: {
    marginLeft: 'auto',
    flexShrink: 0,
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  liveDay: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 0,
  },
  liveDate: {
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
  },
  liveSep: {
    fontSize: 12,
    fontWeight: '700',
  },
  backSegment: {
    flexShrink: 0,
    marginLeft: 'auto',
    alignSelf: 'stretch',
    justifyContent: 'center',
    borderLeftWidth: 1,
    paddingLeft: 10,
    marginRight: -12, // bleed to the pill edge — the segment IS the button
    paddingRight: 12,
  },
  backSegmentText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  dateBtn: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    maxWidth: 190,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1,
  },
  chevOpen: {
    transform: [{ rotate: '180deg' }],
  },
  dropdown: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 8,
  },
  backdrop: {
    position: 'absolute',
    top: 48, // below the pill row — taps on the map dismiss the dropdown
    left: -12,
    right: -12,
    height: 2400,
  },
  dpItem: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  dpItemText: {
    fontSize: 14,
  },
  dpItemSelected: {
    fontWeight: '600',
  },
  dpSec: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 6,
  },
  dpFieldWrap: {
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  dpRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dpField: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 12,
  },
  dpFieldFlex: {
    flex: 1,
  },
  dpFieldText: {
    fontSize: 12.5,
  },
  calBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  calBackText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
