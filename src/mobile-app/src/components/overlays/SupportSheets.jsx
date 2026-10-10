import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Mail } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useOverlay } from '../../context/OverlayContext';
import pkg from '../../../package.json';

// Minimal support sheets (P12): About = brand + version + one-paragraph
// product description; Help = mailto row + FAQ placeholder.

export function AboutSheetBody() {
  const { theme } = useTheme();
  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text
        style={[
          styles.brand,
          { color: theme.textPrimary, fontFamily: theme.fontMono },
        ]}>
        INTELMAP <Text style={{ color: theme.accentLight }}>24</Text>
      </Text>
      <Text
        style={[
          styles.version,
          { color: theme.textMuted, fontFamily: theme.fontMono },
        ]}>
        VERSION {pkg.version}
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle },
        ]}>
        <Text style={[styles.desc, { color: theme.textSecondary }]}>
          IntelMap24 is a live map of global conflicts and major events —
          incidents, polygon zones and verified timeline updates, plotted as
          they happen and curated by a staff newsroom around the clock.
        </Text>
      </View>
      <Text
        style={[
          styles.legal,
          { color: theme.textMuted, fontFamily: theme.fontMono },
        ]}>
        © 2026 INTELMAP24
      </Text>
    </ScrollView>
  );
}

export function HelpSheetBody() {
  const { theme } = useTheme();
  const { showToast } = useOverlay();
  const openMail = () => {
    Linking.openURL('mailto:feedback@intelmap24.com?subject=IntelMap24%20feedback').catch(
      () => showToast('No mail app available'),
    );
  };
  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Pressable
        onPress={openMail}
        style={({ pressed }) => [
          styles.mailRow,
          { backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle },
          pressed && { opacity: 0.75 },
        ]}>
        <Mail size={16} color={theme.textSecondary} />
        <View style={styles.mailBody}>
          <Text style={[styles.mailName, { color: theme.textPrimary }]}>
            Email feedback
          </Text>
          <Text style={[styles.mailSub, { color: theme.textSecondary }]}>
            feedback@intelmap24.com
          </Text>
        </View>
        <ChevronRight size={16} color={theme.textMuted} />
      </Pressable>
      <Text
        style={[
          styles.faqHead,
          { color: theme.textMuted, fontFamily: theme.fontMono },
        ]}>
        FAQ
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle },
        ]}>
        <Text style={[styles.desc, { color: theme.textSecondary }]}>
          Frequently asked questions will live here. Until then, reach us by
          email — every report is read.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
  },
  brand: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 6,
  },
  version: {
    fontSize: 10,
    letterSpacing: 1.4,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  desc: {
    fontSize: 12.5,
    lineHeight: 19,
  },
  legal: {
    fontSize: 10,
    letterSpacing: 1.2,
    textAlign: 'center',
    marginTop: 18,
  },
  mailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderWidth: 1,
    borderRadius: 11,
    paddingVertical: 12,
    paddingHorizontal: 13,
  },
  mailBody: {
    flex: 1,
    minWidth: 0,
  },
  mailName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  mailSub: {
    fontSize: 11,
  },
  faqHead: {
    fontSize: 10,
    letterSpacing: 1.6,
    paddingVertical: 8,
    marginTop: 10,
  },
});
