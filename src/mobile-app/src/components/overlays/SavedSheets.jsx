import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bookmark, History } from 'lucide-react-native';
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

// Bookmarks + History bottom sheets (prototype #sheet-bookmarks /
// #sheet-history) — the map-base variants of the profile side panels. Row tap
// previews with a sheet origin: the sheet closes and is remembered, back from
// the preview chain reopens it (P5 flow).

function ago(iso) {
  const d = iso ? parseISO(iso) : null;
  return d && isValid(d) ? formatDistanceToNow(d, { addSuffix: true }) : '';
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
  const { openOverlay, closeOverlay, showToast } = useOverlay();
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
    body = saved.map((item) => {
      const kind = kindOfItem(item);
      return (
        <SavedItemRow
          key={item.id}
          kind={kind}
          item={item}
          highlighted={selectedId === item.id}
          onPress={() =>
            previewItemOnMap(kind, item, { type: 'sheet', id: 'bookmarks' })
          }
        />
      );
    });
  }

  return (
    <View style={styles.body}>
      <MetaRow
        count={`${signedIn ? saved.length : 0} SAVED`}
        note="Synced to your account"
      />
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}>
        {body}
      </ScrollView>
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
    body = history.map((h) => (
      <SavedItemRow
        key={`${h.kind}-${h.id}`}
        kind={h.kind}
        item={h.item}
        metaSuffix={ago(h.when) ? ` · ${ago(h.when)}` : ''}
        highlighted={selectedId === h.id}
        onPress={() =>
          previewItemOnMap(h.kind, h.item, { type: 'sheet', id: 'history' })
        }
      />
    ));
  }

  return (
    <View style={styles.body}>
      <MetaRow
        count={`${history.length} VIEWED`}
        note={history.length ? 'Clear all' : 'Local to this device'}
        noteColor={history.length ? theme.danger : undefined}
        onNotePress={history.length ? clearHistory : undefined}
      />
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}>
        {body}
      </ScrollView>
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
    paddingBottom: 20,
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
