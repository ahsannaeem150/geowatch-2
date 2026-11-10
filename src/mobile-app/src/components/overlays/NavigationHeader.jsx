import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

export default function NavigationHeader({ title, subtitle, onBack, right }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.wrap, { borderBottomColor: theme.borderSubtle }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Back from ${title}`}
        onPress={onBack}
        hitSlop={6}
        style={({ pressed }) => [
          styles.backButton,
          { backgroundColor: pressed ? theme.bgHover : 'transparent' },
        ]}>
        <ChevronLeft size={21} color={theme.textPrimary} />
      </Pressable>
      <View style={styles.copy}>
        <Text
          numberOfLines={1}
          style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontHead }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={[styles.subtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>{right || null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 1,
  },
  right: {
    minWidth: 4,
    alignItems: 'flex-end',
  },
});
