import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  addMonths,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfMonth,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../../context/ThemeContext';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Week starts Monday (getDay: 0=Sun → shift).
function monthGrid(month) {
  const first = startOfMonth(month);
  const offset = (getDay(first) + 6) % 7;
  const days = [];
  for (let i = 0; i < offset; i++) {
    days.push(null);
  }
  const end = endOfMonth(month).getDate();
  for (let d = 1; d <= end; d++) {
    days.push(new Date(first.getFullYear(), first.getMonth(), d));
  }
  while (days.length % 7 !== 0) {
    days.push(null);
  }
  return days;
}

/**
 * Compact calendar for the TimeStrip dropdown.
 * mode 'single': tap a day → onPickSingle(iso)
 * mode 'range':  first tap sets start, second tap sets end (auto-swapped if
 *                reversed) → onPickRange(fromIso, toIso)
 */
export default function MiniCalendar({
  mode,
  single,
  rangeFrom,
  rangeTo,
  onPickSingle,
  onPickRange,
}) {
  const { theme } = useTheme();
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [pendingFrom, setPendingFrom] = useState(null);
  // Single mode: a tap only stages the day — Apply confirms it.
  const [pendingDay, setPendingDay] = useState(() =>
    single ? parseISO(single) : null,
  );
  const days = useMemo(() => monthGrid(viewMonth), [viewMonth]);
  const applyBtnBg = pendingDay ? theme.accent : theme.bgElevated;
  const applyBtnFg = pendingDay ? '#ffffff' : theme.textMuted;

  const selSingle = pendingDay;
  const selFrom = pendingFrom || (rangeFrom ? parseISO(rangeFrom) : null);
  const selTo = pendingFrom ? null : rangeTo ? parseISO(rangeTo) : null;

  const handleDay = (day) => {
    if (mode === 'single') {
      setPendingDay(day);
      return;
    }
    if (!selFrom || (selFrom && selTo)) {
      setPendingFrom(day);
      return;
    }
    const [a, b] = day < selFrom ? [day, selFrom] : [selFrom, day];
    setPendingFrom(null);
    onPickRange(format(a, 'yyyy-MM-dd'), format(b, 'yyyy-MM-dd'));
  };

  const isBetween = (day) =>
    selFrom &&
    selTo &&
    isWithinInterval(day, { start: selFrom, end: selTo }) &&
    !isSameDay(day, selFrom) &&
    !isSameDay(day, selTo);
  const isEdge = (day) =>
    (selFrom && isSameDay(day, selFrom)) || (selTo && isSameDay(day, selTo));
  const isSingleSel = (day) =>
    mode === 'single' && selSingle && isSameDay(day, selSingle);

  return (
    <View>
      <View style={styles.header}>
        <Pressable
          onPress={() => setViewMonth((m) => addMonths(m, -1))}
          hitSlop={10}
          style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}>
          <ChevronLeft size={16} color={theme.textSecondary} />
        </Pressable>
        <Text style={[styles.monthLabel, { color: theme.textPrimary }]}>
          {format(viewMonth, 'MMMM yyyy')}
        </Text>
        <Pressable
          onPress={() => setViewMonth((m) => addMonths(m, 1))}
          hitSlop={10}
          style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}>
          <ChevronRight size={16} color={theme.textSecondary} />
        </Pressable>
      </View>
      <View style={styles.grid}>
        {WEEKDAYS.map((w, i) => (
          <Text
            key={i}
            style={[
              styles.weekday,
              { color: theme.textMuted, fontFamily: theme.fontMono },
            ]}>
            {w}
          </Text>
        ))}
        {days.map((day, i) => {
          if (!day) {
            return <View key={i} style={styles.cell} />;
          }
          const selected = isSingleSel(day) || isEdge(day);
          const between = isBetween(day);
          const isToday = isSameDay(day, new Date());
          return (
            <Pressable
              key={i}
              onPress={() => handleDay(day)}
              style={({ pressed }) => [
                styles.cell,
                between && { backgroundColor: theme.accentSubtleBg },
                pressed && !selected && { backgroundColor: theme.bgHover },
              ]}>
              <View
                style={[
                  styles.dayCircle,
                  selected && { backgroundColor: theme.accent },
                ]}>
                <Text
                  style={[
                    styles.dayText,
                    { color: theme.textSecondary },
                    isToday && !selected && { color: theme.accentLight },
                    selected && styles.daySelected,
                  ]}>
                  {day.getDate()}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      {mode === 'single' ? (
        <Pressable
          onPress={() =>
            pendingDay && onPickSingle(format(pendingDay, 'yyyy-MM-dd'))
          }
          disabled={!pendingDay}
          style={({ pressed }) => [
            styles.applyBtn,
            { backgroundColor: applyBtnBg },
            pressed && pendingDay && { opacity: 0.85 },
          ]}>
          <Text
            style={[
              styles.applyText,
              { color: applyBtnFg },
            ]}>
            {pendingDay ? `Apply · ${format(pendingDay, 'd MMM yyyy')}` : 'Tap a date'}
          </Text>
        </Pressable>
      ) : null}
      {mode === 'range' ? (
        <Text
          style={[
            styles.rangeHint,
            { color: theme.textMuted, fontFamily: theme.fontMono },
          ]}>
          {selFrom && !selTo
            ? `FROM ${format(selFrom, 'd MMM').toUpperCase()} · TAP END DATE`
            : rangeFrom && rangeTo
              ? `${rangeFrom} → ${rangeTo}`
              : 'TAP START DATE'}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  navBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.55,
  },
  monthLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 9,
    letterSpacing: 1,
    paddingBottom: 6,
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1.15,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 12.5,
  },
  daySelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  rangeHint: {
    fontSize: 9,
    letterSpacing: 1,
    textAlign: 'center',
    paddingTop: 8,
  },
  applyBtn: {
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
  },
  applyText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
