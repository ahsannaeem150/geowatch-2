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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useSelection } from '../../context/SelectionContext';
import { IncidentCard } from './PreviewCard';

// Incident drawer (prototype #drawer): fullscreen details surface.
// Back → pill (plain selection) or peek+emb (preview), via closeDrawer().
export default function IncidentDrawer() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { view, item, closeDrawer } = useSelection();
  const { width } = useWindowDimensions();
  const visible = view === 'drawer' && !!item;
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
    <Animated.View
      style={[
        styles.drawer,
        {
          backgroundColor: theme.bgSurface,
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom,
          transform: [
            {
              translateX: enter.interpolate({
                inputRange: [0, 1],
                outputRange: [width, 0],
              }),
            },
          ],
        },
      ]}>
      <View style={[styles.head, { borderBottomColor: theme.borderSubtle }]}>
        <Pressable
          onPress={closeDrawer}
          hitSlop={8}
          style={[styles.backBtn, { backgroundColor: theme.bgHover }]}>
          <ChevronLeft size={18} color={theme.textPrimary} />
        </Pressable>
        <Text
          style={[
            styles.title,
            { color: theme.textMuted, fontFamily: theme.fontMono },
          ]}>
          INCIDENT DETAILS
        </Text>
      </View>
      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}>
        <IncidentCard item={item} />
        <View
          style={[
            styles.stub,
            {
              backgroundColor: theme.bgElevated,
              borderColor: theme.borderSubtle,
            },
          ]}>
          <Text
            style={[
              styles.stubText,
              { color: theme.textMuted, fontFamily: theme.fontMono },
            ]}>
            FULL DETAIL VIEW — TIMELINE, SOURCES &amp; MEDIA ARRIVE IN A LATER
            PROMPT
          </Text>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  drawer: {
    ...StyleSheet.absoluteFill,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 11,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  body: {
    flex: 1,
  },
  stub: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
  },
  stubText: {
    fontSize: 9.5,
    letterSpacing: 1.2,
    lineHeight: 16,
  },
});
