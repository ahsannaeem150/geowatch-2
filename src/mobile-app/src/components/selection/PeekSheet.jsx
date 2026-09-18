import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useMap } from '../../context/MapContext';
import { useSelection } from '../../context/SelectionContext';
import { IncidentCard, ZoneInfo } from './PreviewCard';

// Peek sheet (prototype #peek): stage-1 half panel. Whole sheet is tappable
// → full details; a map tap collapses it to the pill (handled in
// SelectionContext.handleMapPress).
export default function PeekSheet() {
  const { theme } = useTheme();
  const { view, item, expandFromPeek } = useSelection();
  const { selectedKind } = useMap();
  const { height: windowHeight } = useWindowDimensions();
  const height = Math.round(windowHeight * 0.46);
  const visible = view === 'peek' && !!item;
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      enter.setValue(0);
      Animated.timing(enter, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, enter]);

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.sheet,
          {
            height,
            backgroundColor: theme.bgSurface,
            borderColor: theme.borderSubtle,
            transform: [
              {
                translateY: enter.interpolate({
                  inputRange: [0, 1],
                  outputRange: [height, 0],
                }),
              },
            ],
          },
        ]}>
        <Pressable onPress={expandFromPeek} style={styles.press}>
          <View style={styles.head}>
            <View
              style={[styles.grabber, { backgroundColor: theme.borderSubtle }]}
            />
            <View style={styles.hintRow}>
              <Text
                style={[
                  styles.hint,
                  { color: theme.textMuted, fontFamily: theme.fontMono },
                ]}>
                TAP TO OPEN FULL DETAILS ▴
              </Text>
            </View>
          </View>
          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}>
            {selectedKind === 'zone' ? (
              <ZoneInfo item={item} />
            ) : (
              <IncidentCard item={item} />
            )}
          </ScrollView>
        </Pressable>
        {/* peek-fade: gradient approximation via stacked opacity strips
            (no gradient lib in the dep set) */}
        <View style={styles.fade} pointerEvents="none">
          {[0.12, 0.3, 0.55, 0.8, 1].map((o) => (
            <View
              key={o}
              style={[
                styles.fadeStrip,
                { backgroundColor: theme.bgSurface, opacity: o },
              ]}
            />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  press: {
    flex: 1,
  },
  head: {
    paddingTop: 10,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
  hintRow: {
    alignItems: 'center',
    paddingBottom: 6,
  },
  hint: {
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  body: {
    flex: 1,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 44,
  },
  fadeStrip: {
    flex: 1,
  },
});
