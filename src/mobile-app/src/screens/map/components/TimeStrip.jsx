import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, parseISO, isValid } from 'date-fns';
import { ArrowRight, Calendar, ChevronDown } from 'lucide-react-native';
import { useTheme } from '../../../context/ThemeContext';

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

  const [now, setNow] = useState(() => new Date());
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState('Today');
  const [single, setSingle] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Live clock — 1s ticker, cleaned up on unmount.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Pulsing live dot.
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

  // Date button label (mirrors the prototype's preset-label logic).
  const label = useMemo(() => {
    if (preset) {
      return preset;
    }
    if (single) {
      return fmtInputDate(single) || 'Select date';
    }
    if (from || to) {
      const a = fmtInputDate(from) || '…';
      const b = fmtInputDate(to) || '…';
      return `${a} → ${b}`;
    }
    return 'Today';
  }, [preset, single, from, to]);

  const pickPreset = (name) => {
    setPreset(name);
    setSingle('');
    setFrom('');
    setTo('');
    setOpen(false);
  };

  const applySingle = (value) => {
    setSingle(value);
    if (value) {
      setPreset(null);
      setFrom('');
      setTo('');
    }
  };

  const applyRange = (which, value) => {
    if (which === 'from') {
      setFrom(value);
    } else {
      setTo(value);
    }
    if (value) {
      setPreset(null);
      setSingle('');
    }
  };

  return (
    <View style={[styles.wrap, { top: insets.top + 64 }]} pointerEvents="box-none">
      <View style={styles.row}>
        <View
          style={[
            styles.liveBadge,
            {
              backgroundColor: theme.accentSubtleBg,
              borderColor: theme.danger,
            },
          ]}>
          <Animated.View
            style={[
              styles.liveDot,
              { backgroundColor: theme.danger, opacity: pulse },
            ]}
          />
          <Text
            style={[
              styles.liveText,
              { color: theme.danger, fontFamily: theme.fontMono },
            ]}>
            LIVE
          </Text>
          <Text
            style={[
              styles.liveText,
              styles.sep,
              { color: theme.danger, fontFamily: theme.fontMono },
            ]}>
            •
          </Text>
          <Text
            style={[
              styles.liveText,
              { color: theme.danger, fontFamily: theme.fontMono },
            ]}>
            {format(now, 'EEE dd MMM').toUpperCase()}
          </Text>
          <Text
            style={[
              styles.liveText,
              styles.sep,
              { color: theme.danger, fontFamily: theme.fontMono },
            ]}>
            •
          </Text>
          <Text
            style={[
              styles.liveText,
              { color: theme.danger, fontFamily: theme.fontMono },
            ]}>
            {format(now, 'HH:mm:ss')}
          </Text>
        </View>
        <Pressable
          onPress={() => setOpen((v) => !v)}
          style={[
            styles.dateBtn,
            {
              backgroundColor: theme.bgGlass,
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
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: theme.bgSurface,
              borderColor: theme.borderSubtle,
            },
          ]}>
          {PRESETS.map((name) => (
            <Pressable
              key={name}
              onPress={() => pickPreset(name)}
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
            Single Date
          </Text>
          <View style={styles.dpInputRow}>
            <TextInput
              value={single}
              onChangeText={applySingle}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.textMuted}
              style={[
                styles.dpInput,
                {
                  backgroundColor: theme.bgInput,
                  borderColor: theme.borderSubtle,
                  color: theme.textPrimary,
                  fontFamily: theme.fontMono,
                },
              ]}
            />
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
            Custom Range
          </Text>
          <View style={styles.dpInputRow}>
            <TextInput
              value={from}
              onChangeText={(v) => applyRange('from', v)}
              placeholder="From"
              placeholderTextColor={theme.textMuted}
              style={[
                styles.dpInput,
                {
                  backgroundColor: theme.bgInput,
                  borderColor: theme.borderSubtle,
                  color: theme.textPrimary,
                  fontFamily: theme.fontMono,
                },
              ]}
            />
            <ArrowRight size={14} color={theme.textMuted} />
            <TextInput
              value={to}
              onChangeText={(v) => applyRange('to', v)}
              placeholder="To"
              placeholderTextColor={theme.textMuted}
              style={[
                styles.dpInput,
                {
                  backgroundColor: theme.bgInput,
                  borderColor: theme.borderSubtle,
                  color: theme.textPrimary,
                  fontFamily: theme.fontMono,
                },
              ]}
            />
          </View>
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
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  liveText: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  sep: {
    opacity: 0.45,
  },
  dateBtn: {
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    maxWidth: 190,
  },
  dateLabel: {
    fontSize: 12.5,
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
  dpItem: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  dpItemText: {
    fontSize: 13.5,
  },
  dpItemSelected: {
    fontWeight: '600',
  },
  dpSec: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    paddingTop: 12,
    paddingBottom: 7,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 6,
  },
  dpInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  dpInput: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 12.5,
    paddingHorizontal: 12,
  },
});
