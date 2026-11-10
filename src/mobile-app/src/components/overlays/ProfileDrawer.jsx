import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Bookmark,
  ChevronRight,
  Hexagon,
  History,
  List,
  LogOut,
  Search,
  Settings,
  User,
  X,
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useOverlay } from '../../context/OverlayContext';
import { useAuth } from '../../context/AuthContext';

function DrawerRow({ icon, label, trailing, danger, onPress }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.bgHover : 'transparent' },
      ]}>
      {icon}
      <Text
        style={[
          styles.rowLabel,
          { color: danger ? theme.danger : theme.textPrimary },
        ]}>
        {label}
      </Text>
      {trailing ?? (
        <ChevronRight size={16} color={danger ? theme.danger : theme.textMuted} />
      )}
    </Pressable>
  );
}

export default function ProfileDrawer() {
  const { theme } = useTheme();
  const { openOverlay, closeOverlay, showToast } = useOverlay();
  const { user, signedIn, signOut, requireSignIn } = useAuth();

  const close = () => closeOverlay('profile');
  const go = (overlay) => {
    close();
    openOverlay(overlay);
  };

  const initial = (user?.full_name || user?.email || '?').trim()[0]?.toUpperCase() || '?';
  const avatarTextColor = signedIn ? '#f2f2f2' : theme.textMuted;

  const confirmSignOut = () => {
    Alert.alert('Sign out', 'Sign out of IntelMap24 on this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          close();
          signOut()
            .then(() => showToast('Signed out'))
            .catch(() => showToast('Signed out'));
        },
      },
    ]);
  };

  return (
    <View style={styles.body}>
      <View style={[styles.head, { borderBottomColor: theme.borderSubtle }]}>
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: signedIn ? theme.accent : theme.bgElevated,
              borderColor: signedIn ? theme.accentLight : theme.borderSubtle,
            },
          ]}>
          <Text style={[styles.avatarText, { color: avatarTextColor }]}>
            {signedIn ? initial : '?'}
          </Text>
        </View>
        <View style={styles.headId}>
          <Text
            numberOfLines={1}
            style={[
              styles.headName,
              { color: theme.textPrimary, fontFamily: theme.fontHead },
            ]}>
            {signedIn ? user?.full_name || 'User' : 'Guest'}
          </Text>
          <Text numberOfLines={1} style={[styles.headMail, { color: theme.textMuted }]}>
            {signedIn ? user?.email : 'Not signed in'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close account menu"
          onPress={close}
          hitSlop={6}
          style={({ pressed }) => [
            styles.closeBtn,
            { backgroundColor: pressed ? theme.bgHover : 'transparent' },
          ]}>
          <X size={18} color={theme.textSecondary} />
        </Pressable>
      </View>

      <ScrollView overScrollMode="never" showsVerticalScrollIndicator={false}>
        {!signedIn ? (
          <Pressable
            onPress={() => requireSignIn('continue')}
            style={({ pressed }) => [
              styles.signInRow,
              {
                backgroundColor: pressed ? theme.bgHover : theme.accentSubtleBg,
                borderColor: theme.accentSubtleBorder,
              },
            ]}>
            <User size={18} color={theme.accentLight} />
            <Text style={[styles.signInText, { color: theme.accentLight }]}>
              Sign in to IntelMap24
            </Text>
            <ChevronRight size={16} color={theme.accentLight} />
          </Pressable>
        ) : null}

        <Text style={[styles.sec, { color: theme.textMuted, fontFamily: theme.fontMono }]}>
          ACCOUNT
        </Text>
        <DrawerRow
          icon={<User size={21} color={theme.textSecondary} />}
          label="Profile"
          onPress={() => go({ id: 'profilePage', type: 'fullscreen' })}
        />
        <DrawerRow
          icon={<Bookmark size={21} color={theme.textSecondary} />}
          label="Bookmarks"
          onPress={() => go({ id: 'profilePanel', type: 'fullscreen', props: { panel: 'bookmarks' } })}
        />
        <DrawerRow
          icon={<History size={21} color={theme.textSecondary} />}
          label="History"
          onPress={() => go({ id: 'profilePanel', type: 'fullscreen', props: { panel: 'history' } })}
        />

        <Text style={[styles.sec, { color: theme.textMuted, fontFamily: theme.fontMono }]}>
          BROWSE
        </Text>
        <DrawerRow
          icon={<List size={21} color={theme.textSecondary} />}
          label="Incidents"
          onPress={() => go({ id: 'incidentsDirectory', type: 'fullscreen' })}
        />
        <DrawerRow
          icon={<Hexagon size={21} color={theme.textSecondary} />}
          label="Zones"
          onPress={() => go({ id: 'zonesDirectory', type: 'fullscreen' })}
        />
        <DrawerRow
          icon={<Search size={21} color={theme.textSecondary} />}
          label="Power Search"
          onPress={() => go({ id: 'powerSearch', type: 'fullscreen' })}
        />

        <Text style={[styles.sec, { color: theme.textMuted, fontFamily: theme.fontMono }]}>
          SETTINGS
        </Text>
        <DrawerRow
          icon={<Settings size={21} color={theme.textSecondary} />}
          label="Settings"
          onPress={() => go({ id: 'settings', type: 'fullscreen' })}
        />

        {signedIn ? (
          <DrawerRow
            icon={<LogOut size={21} color={theme.danger} />}
            label="Sign out"
            danger
            onPress={confirmSignOut}
          />
        ) : null}
        <View style={styles.tailPad} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 6,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '700',
  },
  headId: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  headName: {
    fontSize: 16,
    fontWeight: '600',
  },
  headMail: {
    fontSize: 12,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  signInText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  sec: {
    fontSize: 10.5,
    letterSpacing: 1.2,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 7,
  },
  row: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 12,
    marginHorizontal: 6,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  tailPad: {
    height: 10,
  },
});
