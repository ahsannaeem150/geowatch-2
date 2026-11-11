import React from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SheetScrollView } from './SheetContainer';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  History,
  LogOut,
  Settings,
} from 'lucide-react-native';
import { compactAgo } from '../../services/live-utils';
import { useTheme } from '../../context/ThemeContext';
import { ErrorState, ResultRowsSkeleton } from '../AsyncStates';
import { useOverlay } from '../../context/OverlayContext';
import { useAuth } from '../../context/AuthContext';
import { useMap } from '../../context/MapContext';
import { useSelection } from '../../context/SelectionContext';
import {
  PanelEmpty,
  SavedEntries,
  kindOfItem,
  useSavedIncidents,
} from './profileShared';

// Profile page (prototype #prof-screen) + the bookmarks/history side panel
// (#pr-sidepanel). The panel is a fullscreen overlay stacked above the page,
// so hardware back naturally walks panel → page → map.

function ago(iso) {
  return compactAgo(iso);
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
  const { theme } = useTheme();
  const { openOverlay, closeOverlay, showToast } = useOverlay();
  const { user, signedIn, signOut } = useAuth();
  const { history } = useSelection();
  const { saved, loading: savedLoading } = useSavedIncidents();

  const bookmarkCount = savedLoading ? '…' : signedIn ? saved.length : 0;
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
      contentContainerStyle={styles.pageContent}
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
        icon={<Settings size={18} color={theme.textSecondary} />}
        label="Settings"
        sub="Appearance, alerts, map behavior and support"
        onPress={() => openOverlay({ id: 'settings', type: 'fullscreen' })}
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
  const { closeOverlay } = useOverlay();
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
      body = <ResultRowsSkeleton rows={6} saved label="Loading bookmarks" />;
    } else if (error) {
      body = (
        <ErrorState
          title="Could not load bookmarks"
          message="Check your connection and try again."
          onRetry={reload}
          style={styles.errorCard}
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
      body = (
        <SavedEntries
          history={saved.map((item) => ({ kind: kindOfItem(item), id: item.id, item }))}
          selectedId={selectedId}
          onOpen={openItem}
          bodyStyle={styles.panelBody}
          contentStyle={styles.panelBodyContent}
        />
      );
    }
  } else if (!history.length) {
    body = (
      <PanelEmpty
        icon={<History size={26} color={theme.textMuted} />}
        title="Nothing viewed yet"
        sub="Open an incident or zone on the map and it appears here."
      />
    );
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
      {which === 'history' && history.length ? (
        <SavedEntries
          history={history.map((entry) => ({
            ...entry,
            metaSuffix: ago(entry.when) ? ` · ${ago(entry.when)}` : '',
          }))}
          selectedId={selectedId}
          onOpen={openItem}
          bodyStyle={styles.panelBody}
          contentStyle={styles.panelBodyContent}
        />
      ) : (
        <SheetScrollView
          style={styles.panelBody}
          contentContainerStyle={styles.panelBodyContent}
          showsVerticalScrollIndicator={false}>
          {body}
        </SheetScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  pageContent: {
    paddingBottom: 10,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  backBtn: {
    position: 'absolute',
    left: 14,
    top: 10,
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatar: {
    width: 60,
    height: 60,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  heroAvatarText: {
    fontSize: 23,
    fontWeight: '700',
  },
  heroName: {
    fontSize: 20,
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
    fontSize: 9.5,
    letterSpacing: 1,
  },
  heroSignIn: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 12,
  },
  heroSignInText: {
    color: '#f2f2f2',
    fontSize: 13.5,
    fontWeight: '600',
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'stretch',
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 9.5,
    letterSpacing: 1.1,
  },
  secHead: {
    fontSize: 10.5,
    letterSpacing: 1.2,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 7,
  },
  pageRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 12,
    marginHorizontal: 6,
  },
  pageRowBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  pageRowLabel: {
    fontSize: 14.5,
    fontWeight: '500',
  },
  pageRowSub: {
    fontSize: 12,
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
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
  },
  clearText: {
    fontSize: 10.5,
    letterSpacing: 1,
  },
  panelBody: {
    flex: 1,
  },
  panelBodyContent: {
    paddingTop: 12,
    paddingBottom: 10,
  },
  skWrap: {
    paddingHorizontal: 14,
    gap: 8,
  },
  skRow: {
    height: 66,
    borderRadius: 12,
  },
  errorCard: {
    margin: 16,
  },
});
