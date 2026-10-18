import React from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SheetScrollView } from './SheetContainer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  History,
  Info,
  Layers,
  LogOut,
  Moon,
} from 'lucide-react-native';
import { formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';
import { useOverlay } from '../../context/OverlayContext';
import { useAuth } from '../../context/AuthContext';
import { useMap } from '../../context/MapContext';
import { useSelection } from '../../context/SelectionContext';
import {
  PanelEmpty,
  SavedItemRow,
  kindOfItem,
  useSavedIncidents,
} from './profileShared';

// Profile page (prototype #prof-screen) + the bookmarks/history side panel
// (#pr-sidepanel). The panel is a fullscreen overlay stacked above the page,
// so hardware back naturally walks panel → page → map.

function ago(iso) {
  const d = iso ? parseISO(iso) : null;
  return d && isValid(d) ? formatDistanceToNow(d, { addSuffix: true }) : '';
}

function PageRow({ icon, label, sub, onPress }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pageRow,
        { backgroundColor: pressed ? theme.bgHover : 'transparent' },
      ]}>
      {icon}
      <View style={styles.pageRowBody}>
        <Text style={[styles.pageRowLabel, { color: theme.textPrimary }]}>
          {label}
        </Text>
        {sub ? (
          <Text style={[styles.pageRowSub, { color: theme.textMuted }]}>
            {sub}
          </Text>
        ) : null}
      </View>
      <ChevronRight size={15} color={theme.textMuted} />
    </Pressable>
  );
}

export function ProfilePageBody() {
  const { mode, theme, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { openOverlay, closeOverlay, showToast } = useOverlay();
  const { user, signedIn, signOut } = useAuth();
  const { history } = useSelection();
  const { saved } = useSavedIncidents();

  const bookmarkCount = signedIn ? saved.length : 0;
  const initial =
    (user?.full_name || user?.email || '?').trim()[0]?.toUpperCase() || '?';
  const heroAvatarTextColor = signedIn ? '#f2f2f2' : theme.textMuted;

  const openPanel = (panel) =>
    openOverlay({ id: 'profilePanel', type: 'fullscreen', props: { panel } });

  const confirmSignOut = () => {
    Alert.alert('Sign out', 'Sign out of IntelMap24 on this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          closeOverlay('profilePage');
          signOut()
            .then(() => showToast('Signed out'))
            .catch(() => showToast('Signed out'));
        },
      },
    ]);
  };

  return (
    <SheetScrollView
      style={styles.page}
      contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
      showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <Pressable
          onPress={() => closeOverlay('profilePage')}
          hitSlop={8}
          style={[styles.backBtn, { backgroundColor: theme.bgHover }]}>
          <ChevronLeft size={18} color={theme.textPrimary} />
        </Pressable>
        <View
          style={[
            styles.heroAvatar,
            {
              backgroundColor: signedIn ? theme.accent : theme.bgElevated,
              borderColor: signedIn ? theme.accentLight : theme.borderSubtle,
            },
          ]}>
          <Text style={[styles.heroAvatarText, { color: heroAvatarTextColor }]}>
            {signedIn ? initial : '?'}
          </Text>
        </View>
        <Text
          style={[
            styles.heroName,
            { color: theme.textPrimary, fontFamily: theme.fontHead },
          ]}>
          {signedIn ? user?.full_name || 'User' : 'Guest'}
        </Text>
        <Text style={[styles.heroMail, { color: theme.textSecondary }]}>
          {signedIn ? user?.email : 'Browsing without an account'}
        </Text>
        {signedIn ? (
          <View
            style={[
              styles.heroBadge,
              {
                backgroundColor: theme.accentSubtleBg,
                borderColor: theme.accentSubtleBorder,
              },
            ]}>
            <View style={[styles.heroBadgeDot, { backgroundColor: theme.success }]} />
            <Text
              style={[
                styles.heroBadgeText,
                { color: theme.accentLight, fontFamily: theme.fontMono },
              ]}>
              SIGNED IN WITH GOOGLE
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={() => openOverlay({ id: 'signIn', type: 'sheet' })}
            style={[styles.heroSignIn, { backgroundColor: theme.accent }]}>
            <Text style={styles.heroSignInText}>Sign in with Google</Text>
          </Pressable>
        )}
        <View style={styles.statRow}>
          <Pressable
            onPress={() => openPanel('bookmarks')}
            style={[
              styles.statCard,
              { backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle },
            ]}>
            <Text style={[styles.statValue, { color: theme.textPrimary }]}>
              {bookmarkCount}
            </Text>
            <Text
              style={[
                styles.statLabel,
                { color: theme.textMuted, fontFamily: theme.fontMono },
              ]}>
              BOOKMARKS
            </Text>
          </Pressable>
          <Pressable
            onPress={() => openPanel('history')}
            style={[
              styles.statCard,
              { backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle },
            ]}>
            <Text style={[styles.statValue, { color: theme.textPrimary }]}>
              {history.length}
            </Text>
            <Text
              style={[
                styles.statLabel,
                { color: theme.textMuted, fontFamily: theme.fontMono },
              ]}>
              VIEWED
            </Text>
          </Pressable>
        </View>
      </View>

      <Text
        style={[styles.secHead, { color: theme.textMuted, fontFamily: theme.fontMono }]}>
        MY ACTIVITY
      </Text>
      <PageRow
        icon={<Bookmark size={17} color={theme.textSecondary} />}
        label="Bookmarks"
        sub={`Saved incidents & zones · ${bookmarkCount}`}
        onPress={() => openPanel('bookmarks')}
      />
      <PageRow
        icon={<History size={17} color={theme.textSecondary} />}
        label="History"
        sub={`Recently viewed · ${history.length}`}
        onPress={() => openPanel('history')}
      />

      <View style={[styles.divider, { backgroundColor: theme.borderSubtle }]} />
      <Text
        style={[styles.secHead, { color: theme.textMuted, fontFamily: theme.fontMono }]}>
        PREFERENCES
      </Text>
      <PageRow
        icon={<Bell size={17} color={theme.textSecondary} />}
        label="Notifications"
        sub="Alerts & update preferences"
        onPress={() => openOverlay({ id: 'notifPrefs', type: 'sheet' })}
      />
      <PageRow
        icon={<Layers size={17} color={theme.textSecondary} />}
        label="Default Map Layers"
        sub="Choose startup layers"
        onPress={() => openOverlay({ id: 'layersPref', type: 'sheet' })}
      />
      <PageRow
        icon={<Moon size={17} color={theme.textSecondary} />}
        label={`Theme: ${mode === 'dark' ? 'Dark' : 'Light'}`}
        sub="Tap to toggle dark / light"
        onPress={toggleTheme}
      />

      <View style={[styles.divider, { backgroundColor: theme.borderSubtle }]} />
      <Text
        style={[styles.secHead, { color: theme.textMuted, fontFamily: theme.fontMono }]}>
        SUPPORT
      </Text>
      <PageRow
        icon={<HelpCircle size={17} color={theme.textSecondary} />}
        label="Help & Feedback"
        onPress={() => openOverlay({ id: 'help', type: 'sheet' })}
      />
      <PageRow
        icon={<Info size={17} color={theme.textSecondary} />}
        label="About"
        onPress={() => openOverlay({ id: 'about', type: 'sheet' })}
      />

      {signedIn ? (
        <Pressable
          onPress={confirmSignOut}
          style={[
            styles.signOutBtn,
            { borderColor: theme.danger, backgroundColor: theme.bgElevated },
          ]}>
          <LogOut size={15} color={theme.danger} />
          <Text style={[styles.signOutText, { color: theme.danger }]}>Sign Out</Text>
        </Pressable>
      ) : null}
      <Text
        style={[
          styles.version,
          { color: theme.textMuted, fontFamily: theme.fontMono },
        ]}>
        INTELMAP24 · V0.1.0 · © 2026
      </Text>
    </SheetScrollView>
  );
}

// ─── Side panel (#pr-sidepanel): bookmarks or history list stacked over the
// profile page. Row tap → previewItemOnMap with the panel staying mounted
// (fullscreen origin); back restores with the row highlighted.
export function ProfilePanelBody({ overlay }) {
  const { theme } = useTheme();
  const { closeOverlay, showToast } = useOverlay();
  const { signedIn, requireSignIn } = useAuth();
  const { selectedId } = useMap();
  const { previewItemOnMap, history, clearHistory } = useSelection();
  const { saved, loading, error, reload } = useSavedIncidents();

  const which = overlay?.props?.panel === 'history' ? 'history' : 'bookmarks';
  const close = () => closeOverlay('profilePanel');

  const openItem = (kind, item) =>
    previewItemOnMap(kind, item, { type: 'fullscreen' });

  let body = null;
  if (which === 'bookmarks') {
    if (!signedIn) {
      body = (
        <PanelEmpty
          icon={<Bookmark size={26} color={theme.textMuted} />}
          title="Sign in to see your saved incidents & zones"
          sub="Bookmarks sync to your account across devices."
          ctaLabel="Sign in →"
          onCta={() => {
            close();
            requireSignIn('view bookmarks');
          }}
        />
      );
    } else if (loading) {
      body = (
        <View style={styles.skWrap}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[styles.skRow, { backgroundColor: theme.bgElevated }]}
            />
          ))}
        </View>
      );
    } else if (error) {
      body = (
        <PanelEmpty
          icon={<Bookmark size={26} color={theme.textMuted} />}
          title="Could not load bookmarks"
          sub="Check the connection and try again."
          ctaLabel="Retry"
          onCta={() => {
            showToast('Refreshing bookmarks');
            reload();
          }}
        />
      );
    } else if (!saved.length) {
      body = (
        <PanelEmpty
          icon={<Bookmark size={26} color={theme.textMuted} />}
          title="Nothing saved yet"
          sub="Tap the ☆ star on any incident or zone to save it here."
        />
      );
    } else {
      body = saved.map((item) => {
        const kind = kindOfItem(item);
        return (
          <SavedItemRow
            key={item.id}
            kind={kind}
            item={item}
            highlighted={selectedId === item.id}
            onPress={() => openItem(kind, item)}
          />
        );
      });
    }
  } else if (!history.length) {
    body = (
      <PanelEmpty
        icon={<History size={26} color={theme.textMuted} />}
        title="Nothing viewed yet"
        sub="Open an incident or zone on the map and it appears here."
      />
    );
  } else {
    body = history.map((h) => (
      <SavedItemRow
        key={`${h.kind}-${h.id}`}
        kind={h.kind}
        item={h.item}
        metaSuffix={ago(h.when) ? ` · ${ago(h.when)}` : ''}
        highlighted={selectedId === h.id}
        onPress={() => openItem(h.kind, h.item)}
      />
    ));
  }

  return (
    <View style={styles.panel}>
      <View style={[styles.panelHead, { borderBottomColor: theme.borderSubtle }]}>
        <Pressable
          onPress={close}
          hitSlop={8}
          style={[styles.panelBackBtn, { backgroundColor: theme.bgHover }]}>
          <ChevronLeft size={18} color={theme.textPrimary} />
        </Pressable>
        <Text
          style={[
            styles.panelTitle,
            { color: theme.textPrimary, fontFamily: theme.fontHead },
          ]}>
          {which === 'bookmarks' ? 'Bookmarks' : 'History'}
        </Text>
        {which === 'history' && history.length ? (
          <Pressable onPress={clearHistory} hitSlop={8}>
            <Text
              style={[
                styles.clearText,
                { color: theme.danger, fontFamily: theme.fontMono },
              ]}>
              CLEAR ALL
            </Text>
          </Pressable>
        ) : null}
      </View>
      <SheetScrollView
        style={styles.panelBody}
        contentContainerStyle={styles.panelBodyContent}
        showsVerticalScrollIndicator={false}>
        {body}
      </SheetScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 18,
    paddingHorizontal: 16,
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    top: 14,
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatar: {
    width: 72,
    height: 72,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
    marginBottom: 12,
  },
  heroAvatarText: {
    fontSize: 26,
    fontWeight: '700',
  },
  heroName: {
    fontSize: 19,
    fontWeight: '600',
  },
  heroMail: {
    fontSize: 12.5,
    marginTop: 3,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
    marginTop: 10,
  },
  heroBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  heroBadgeText: {
    fontSize: 9,
    letterSpacing: 1.2,
  },
  heroSignIn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  heroSignInText: {
    color: '#f2f2f2',
    fontSize: 13,
    fontWeight: '600',
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'stretch',
    marginTop: 18,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 8.5,
    letterSpacing: 1.4,
  },
  secHead: {
    fontSize: 9.5,
    letterSpacing: 1.8,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 6,
  },
  pageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 9,
    marginHorizontal: 6,
  },
  pageRowBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  pageRowLabel: {
    fontSize: 13.5,
    fontWeight: '500',
  },
  pageRowSub: {
    fontSize: 11,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 18,
    marginTop: 14,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 18,
    marginTop: 22,
    borderWidth: 1,
    borderRadius: 11,
    paddingVertical: 12,
  },
  signOutText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    fontSize: 9,
    letterSpacing: 1.2,
    marginTop: 18,
  },
  panel: {
    flex: 1,
  },
  panelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  panelBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  clearText: {
    fontSize: 9.5,
    letterSpacing: 1.2,
  },
  panelBody: {
    flex: 1,
  },
  panelBodyContent: {
    paddingTop: 12,
    paddingBottom: 24,
  },
  skWrap: {
    paddingHorizontal: 14,
    gap: 8,
  },
  skRow: {
    height: 66,
    borderRadius: 12,
  },
});
