import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Bookmark,
  ChevronRight,
  Hexagon,
  History,
  List,
  LogOut,
  Moon,
  Search,
  Settings,
  User,
  X,
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useOverlay } from '../../context/OverlayContext';
import { useAuth } from '../../context/AuthContext';

// Profile drawer (prototype #profile-ov — X-style left sidebar). Signed-out:
// generic avatar + sign-in row; bookmarks gate through requireSignIn (the
// history list is local and works signed out).

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
        <ChevronRight size={15} color={danger ? theme.danger : theme.textMuted} />
      )}
    </Pressable>
  );
}

export default function ProfileDrawer() {
  const { mode, theme, toggleTheme } = useTheme();
  const { openOverlay, closeOverlay, showToast } = useOverlay();
  const { user, signedIn, signOut, requireSignIn } = useAuth();

  const close = () => closeOverlay('profile');
  const go = (overlay) => {
    close();
    openOverlay(overlay);
  };

  const initial = (user?.full_name || user?.email || '?').trim()[0]?.toUpperCase() || '?';
  const avatarTextColor = signedIn ? '#f2f2f2' : theme.textMuted;

  const openBookmarks = () => {
    if (!requireSignIn('view bookmarks')) {
      return; // sign-in sheet opens above the drawer
    }
    go({ id: 'bookmarks', type: 'sheet' });
  };

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
          <Text
            numberOfLines={1}
            style={[styles.headMail, { color: theme.textMuted }]}>
            {signedIn ? user?.email : 'Not signed in'}
          </Text>
        </View>
        <Pressable onPress={close} hitSlop={8} style={styles.closeBtn}>
          <X size={16} color={theme.textSecondary} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {!signedIn ? (
          <Pressable
            onPress={() => requireSignIn('continue')}
            style={[
              styles.signInRow,
              {
                backgroundColor: theme.accentSubtleBg,
                borderColor: theme.accentSubtleBorder,
              },
            ]}>
            <User size={16} color={theme.accentLight} />
            <Text style={[styles.signInText, { color: theme.accentLight }]}>
              Sign in to IntelMap24
            </Text>
            <ChevronRight size={15} color={theme.accentLight} />
          </Pressable>
        ) : null}

        <Text
          style={[
            styles.sec,
            { color: theme.textMuted, fontFamily: theme.fontMono },
          ]}>
          ACCOUNT
        </Text>
        <DrawerRow
          icon={<User size={17} color={theme.textSecondary} />}
          label="Profile"
          onPress={() => go({ id: 'profilePage', type: 'fullscreen' })}
        />
        <DrawerRow
          icon={<Bookmark size={17} color={theme.textSecondary} />}
          label="Bookmarks"
          onPress={openBookmarks}
        />
        <DrawerRow
          icon={<History size={17} color={theme.textSecondary} />}
          label="History"
          onPress={() => go({ id: 'history', type: 'sheet' })}
        />

        <Text
          style={[
            styles.sec,
            { color: theme.textMuted, fontFamily: theme.fontMono },
          ]}>
          BROWSE
        </Text>
        <DrawerRow
          icon={<List size={17} color={theme.textSecondary} />}
          label="All Incidents"
          onPress={() => go({ id: 'incidentsDirectory', type: 'fullscreen' })}
        />
        <DrawerRow
          icon={<Hexagon size={17} color={theme.textSecondary} />}
          label="Zones"
          onPress={() => go({ id: 'zonesDirectory', type: 'fullscreen' })}
        />
        <DrawerRow
          icon={<Search size={17} color={theme.textSecondary} />}
          label="Power Search"
          onPress={() => go({ id: 'powerSearch', type: 'fullscreen' })}
        />

        <Text
          style={[
            styles.sec,
            { color: theme.textMuted, fontFamily: theme.fontMono },
          ]}>
          PREFERENCES
        </Text>
        <DrawerRow
          icon={<Moon size={17} color={theme.textSecondary} />}
          label={`Theme: ${mode === 'dark' ? 'Dark' : 'Light'}`}
          trailing={
            <Text style={[styles.themeGlyph, { color: theme.textMuted }]}>◐</Text>
          }
          onPress={toggleTheme}
        />
        <DrawerRow
          icon={<Settings size={17} color={theme.textSecondary} />}
          label="Settings"
          onPress={() => go({ id: 'settings', type: 'sheet' })}
        />

        {signedIn ? (
          <DrawerRow
            icon={<LogOut size={17} color={theme.danger} />}
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
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  headId: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  headName: {
    fontSize: 15.5,
    fontWeight: '600',
  },
  headMail: {
    fontSize: 11.5,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  signInText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  sec: {
    fontSize: 9,
    letterSpacing: 1.8,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 9,
    marginHorizontal: 6,
  },
  rowLabel: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '500',
  },
  themeGlyph: {
    fontSize: 13,
  },
  tailPad: {
    height: 20,
  },
});
