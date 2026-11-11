import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SheetScrollView } from './SheetContainer';
import { Bookmark, History } from 'lucide-react-native';
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
import NavigationHeader from './NavigationHeader';

// Bookmarks + History full-screen destinations, sharing the profile side-panel
// pattern. Row tap previews with a fullscreen origin: the page closes and is
// remembered, and Back from the preview chain reopens it.

function ago(iso) {
  return compactAgo(iso);
}

function MetaRow({ count, note, onNotePress, noteColor }) {
  const { theme } = useTheme();
  return (
    <View style={styles.metaRow}>
      <Text
        style={[
          styles.metaCount,
          { color: theme.accentLight, fontFamily: theme.fontMono },
        ]}>
        {count}
      </Text>
      {onNotePress ? (
        <Pressable onPress={onNotePress} hitSlop={8}>
          <Text
            style={[
              styles.metaNote,
              { color: noteColor || theme.textMuted, fontFamily: theme.fontMono },
            ]}>
            {note}
          </Text>
        </Pressable>
      ) : (
        <Text
          style={[
            styles.metaNote,
            { color: theme.textMuted, fontFamily: theme.fontMono },
          ]}>
          {note}
        </Text>
      )}
    </View>
  );
}

export function BookmarksSheetBody() {
  const { theme } = useTheme();
  const { openOverlay, closeOverlay } = useOverlay();
  const { signedIn, requireSignIn } = useAuth();
  const { selectedId } = useMap();
  const { previewItemOnMap } = useSelection();
  const { saved, loading, error, reload } = useSavedIncidents();

  const close = () => closeOverlay('bookmarks');

  let body = null;
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
        title="No bookmarks yet"
        sub="Tap the ☆ star on any incident or zone to save it here for quick access."
        ctaLabel="Browse Incidents"
        onCta={() => {
          close();
          openOverlay({ id: 'searchHub', type: 'sheet' });
        }}
      />
    );
  } else {
    body = (
      <SavedEntries
        history={saved.map((item) => ({ kind: kindOfItem(item), id: item.id, item }))}
        selectedId={selectedId}
        onOpen={(kind, item) =>
          previewItemOnMap(kind, item, { type: 'fullscreen', id: 'bookmarks' })
        }
        bodyStyle={styles.list}
        contentStyle={styles.listContent}
      />
    );
  }

  return (
    <View style={styles.body}>
      <NavigationHeader
        title="Bookmarks"
        subtitle="Saved incidents and zones"
        onBack={close}
      />
      <MetaRow
        count={`${signedIn ? saved.length : 0} SAVED`}
        note="Synced to your account"
      />
      <SheetScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}>
        {body}
      </SheetScrollView>
    </View>
  );
}

export function HistorySheetBody() {
  const { theme } = useTheme();
  const { closeOverlay } = useOverlay();
  const { selectedId } = useMap();
  const { previewItemOnMap, history, clearHistory } = useSelection();

  const close = () => closeOverlay('history');

  let body = null;
  if (!history.length) {
    body = (
      <PanelEmpty
        icon={<History size={26} color={theme.textMuted} />}
        title="Nothing viewed yet"
        sub="Incidents and zones you open on the map will appear here for quick access."
        ctaLabel="Go to Map"
        onCta={close}
      />
    );
  } else {
    body = (
      <SavedEntries
        history={history.map((entry) => ({
          ...entry,
          metaSuffix: ago(entry.when) ? ` · ${ago(entry.when)}` : '',
        }))}
        selectedId={selectedId}
        onOpen={(kind, item) =>
          previewItemOnMap(kind, item, { type: 'fullscreen', id: 'history' })
        }
        bodyStyle={styles.list}
        contentStyle={styles.listContent}
      />
    );
  }

  return (
    <View style={styles.body}>
      <NavigationHeader
        title="History"
        subtitle="Recently viewed incidents and zones"
        onBack={close}
      />
      <MetaRow
        count={`${history.length} VIEWED`}
        note={history.length ? 'Clear all' : 'Local to this device'}
        noteColor={history.length ? theme.danger : undefined}
        onNotePress={history.length ? clearHistory : undefined}
      />
      <SheetScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}>
        {body}
      </SheetScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  metaCount: {
    fontSize: 9.5,
    letterSpacing: 1.4,
  },
  metaNote: {
    fontSize: 9.5,
    letterSpacing: 0.8,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingTop: 2,
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
