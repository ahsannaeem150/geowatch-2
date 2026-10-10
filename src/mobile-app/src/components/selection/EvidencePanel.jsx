import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Clipboard,
  Easing,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera,
  ChevronLeft,
  ExternalLink,
  Link2,
  Star,
  X,
} from 'lucide-react-native';
import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';
import { useOverlay } from '../../context/OverlayContext';
import { useMap } from '../../context/MapContext';
import { useSelection } from '../../context/SelectionContext';
import { mediaUrl } from '../../services/api';
import { Tag } from './PreviewCard';

// Evidence panel (prototype #evi; openEvidence/closeEvi/switchPane/
// mediaBlock/xPostsBlock): fullscreen above the incident drawer, back ‹
// returns to the drawer, ✕ closes both (prototype closeDrawer from #evi).
//
// Per-update evidence = media rows + x_post sources attached to that update;
// when the update has none we fall back to the incident-level aggregate
// (all timeline rows), mirroring the web evidence rail's update matching.

function ago(iso) {
  const d = iso ? parseISO(iso) : null;
  return d && isValid(d) ? formatDistanceToNow(d, { addSuffix: true }) : '';
}

function fmtDate(iso) {
  const d = iso ? parseISO(iso) : null;
  return d && isValid(d) ? format(d, 'dd MMM yyyy') : '';
}

function MediaGrid({ items, onOpen }) {
  const { theme } = useTheme();
  if (!items.length) {
    return (
      <Text style={[styles.empty, { color: theme.textMuted, fontFamily: theme.fontMono }]}>
        — no media attached —
      </Text>
    );
  }
  return (
    <View style={styles.mediaGrid}>
      {items.map((m) => {
        const uri = mediaUrl(m.thumbnail_url || m.file_url);
        if (!uri) {
          return null;
        }
        return (
          <Pressable
            key={m.id}
            onPress={() => onOpen(m)}
            style={[styles.mediaCell, { backgroundColor: theme.bgHover, borderColor: theme.borderSubtle }]}>
            <Image source={{ uri }} style={styles.mediaImg} resizeMode="cover" />
          </Pressable>
        );
      })}
    </View>
  );
}

function XPostCard({ post }) {
  const { theme } = useTheme();
  const { showToast } = useOverlay();
  const name = post.account_display_name || post.account_username || 'X post';
  const handle = post.account_username ? `@${post.account_username}` : '';
  const archiveImg = mediaUrl(post.archive_media_url || post.archive_media_thumbnail_url);

  return (
    <View
      style={[
        styles.xpCard,
        { backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle },
      ]}>
      <View style={styles.xpHead}>
        <View style={[styles.xpAvatar, { backgroundColor: theme.bgHover }]}>
          <Text style={[styles.xpAvatarText, { color: theme.textPrimary }]}>𝕏</Text>
        </View>
        <View style={styles.xpUser}>
          <Text style={[styles.xpName, { color: theme.textPrimary }]} numberOfLines={1}>
            {name}
          </Text>
          {handle ? (
            <Text style={[styles.xpHandle, { color: theme.textMuted }]}>{handle}</Text>
          ) : null}
        </View>
        <Text style={[styles.xpAgo, { color: theme.textMuted }]} numberOfLines={1}>
          {ago(post.created_at)}
        </Text>
      </View>
      {post.archived ? (
        <Text
          style={[styles.xpArchived, { color: theme.sev2, fontFamily: theme.fontMono }]}>
          ARCHIVED{post.archive_reason ? ` — ${post.archive_reason}` : ''}
        </Text>
      ) : null}
      {post.description ? (
        <Text style={[styles.xpDesc, { color: theme.textSecondary }]}>
          {post.description}
        </Text>
      ) : null}
      {archiveImg ? (
        <Image
          source={{ uri: archiveImg }}
          style={[styles.xpArchiveImg, { backgroundColor: theme.bgHover }]}
          resizeMode="cover"
        />
      ) : null}
      <View style={styles.xpActions}>
        {post.source_url ? (
          <Pressable
            onPress={() => Linking.openURL(post.source_url).catch(() => showToast('Could not open link'))}
            style={[styles.xpBtn, { borderColor: theme.borderSubtle, backgroundColor: theme.bgHover }]}>
            <ExternalLink size={10} color={theme.textSecondary} />
            <Text style={[styles.xpBtnText, { color: theme.textSecondary }]}>Try original</Text>
          </Pressable>
        ) : null}
        {post.source_url ? (
          <Pressable
            onPress={() => {
              Clipboard.setString(post.source_url);
              showToast('Link copied');
            }}
            style={[styles.xpBtn, { borderColor: theme.borderSubtle, backgroundColor: theme.bgHover }]}>
            <Link2 size={10} color={theme.textSecondary} />
            <Text style={[styles.xpBtnText, { color: theme.textSecondary }]}>Copy link</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function XPostList({ items }) {
  const { theme } = useTheme();
  if (!items.length) {
    return (
      <Text style={[styles.empty, { color: theme.textMuted, fontFamily: theme.fontMono }]}>
        — no X posts linked —
      </Text>
    );
  }
  return (
    <View>
      {items.map((p) => (
        <XPostCard key={p.id} post={p} />
      ))}
    </View>
  );
}

// Evidence content (title, tabs, media grid, X posts, lightbox) — shared by
// the fullscreen panel (direct mode / zones) and the peek sheet's inline
// evidence sub-view.
export function EvidenceBody({ bottomPad = 0 }) {
  const { theme } = useTheme();
  const { showToast } = useOverlay();
  const { selectedId } = useMap();
  const { evidenceUpdate, getCachedDetail } = useSelection();
  const { width, height } = useWindowDimensions();
  const [tab, setTab] = useState('all');
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    setTab('all');
    setLightbox(null);
  }, [evidenceUpdate?.id]);

  // Update-attached evidence, falling back to the incident-level aggregate
  // when the update itself has none (web evidence-rail parity).
  const { mediaItems, xItems } = useMemo(() => {
    const u = evidenceUpdate;
    if (!u) {
      return { mediaItems: [], xItems: [] };
    }
    const detail = selectedId ? getCachedDetail(selectedId) : null;
    const allMedia = (detail?.timeline || []).flatMap((t) => t.media || []);
    const allX = (detail?.timeline || []).flatMap(
      (t) => t.sources?.x_post || [],
    );
    const ownMedia = u.media || [];
    const ownX = u.sources?.x_post || [];
    return {
      mediaItems: ownMedia.length ? ownMedia : allMedia,
      xItems: ownX.length ? ownX : allX,
    };
  }, [evidenceUpdate, selectedId, getCachedDetail]);

  if (!evidenceUpdate) {
    return null;
  }

  const u = evidenceUpdate;
  const verified = u.verification_status === 'verified';
  const tabs = [
    { key: 'all', label: `All (${mediaItems.length + xItems.length})` },
    { key: 'media', label: `Media (${mediaItems.length})`, icon: true },
    { key: 'xposts', label: `𝕏 Posts (${xItems.length})` },
  ];

  const lbUri = lightbox ? mediaUrl(lightbox.file_url || lightbox.thumbnail_url) : null;
  const lbW = parseFloat(lightbox?.width) || 0;
  const lbH = parseFloat(lightbox?.height) || 0;
  // Pan-on-Android: render the image larger than the viewport inside a
  // bidirectional ScrollView (no pinch-zoom lib in the dep set).
  const lbScale = 1.6;
  const lbImgW = width * lbScale;
  const lbImgH = lbW > 0 && lbH > 0 ? (lbImgW * lbH) / lbW : height * 0.7;

  return (
    <View style={styles.bodyWrap}>
      <View style={styles.headWrap}>
        <View style={styles.eviTitleRow}>
          <Text style={[styles.eviTitle, { color: theme.textPrimary, fontFamily: theme.fontHead }]}>
            {u.summary || 'Update'}
          </Text>
          <Pressable
            onPress={() => showToast('Saving arrives in a later prompt')}
            hitSlop={8}
            style={styles.starBtn}>
            <Star size={17} color={theme.textMuted} />
          </Pressable>
        </View>
        <Text style={[styles.eviTime, { color: theme.textMuted, fontFamily: theme.fontMono }]}>
          {fmtDate(u.update_date)} · {ago(u.update_date)}
        </Text>
        <View style={styles.eviBadges}>
          {verified ? <Tag color={theme.success} label="✓ Verified" dot /> : null}
          <Tag color={theme.textMuted} label="Update" />
        </View>
      </View>

      <View style={[styles.tabBar, { borderBottomColor: theme.borderSubtle }]}>
        {tabs.map((t) => {
          const active = tab === t.key;
          const tabStyle = {
            backgroundColor: active ? theme.accentSubtleBg : 'transparent',
            borderColor: active ? theme.accentSubtleBorder : theme.borderSubtle,
          };
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[styles.tabBtn, tabStyle]}>
              {t.icon ? (
                <Camera size={11} color={active ? theme.accentLight : theme.textSecondary} />
              ) : null}
              <Text
                style={[
                  styles.tabText,
                  {
                    color: active ? theme.accentLight : theme.textSecondary,
                    fontFamily: theme.fontMono,
                  },
                ]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {tab !== 'xposts' ? (
          <>
            <Text
              style={[styles.secLabel, { color: theme.textMuted, fontFamily: theme.fontMono }]}>
              MEDIA
            </Text>
            <MediaGrid items={mediaItems} onOpen={setLightbox} />
          </>
        ) : null}
        {tab !== 'media' ? (
          <>
            <Text
              style={[
                styles.secLabel,
                styles.xSecLabel,
                { color: theme.textMuted, fontFamily: theme.fontMono },
              ]}>
              X POSTS ({xItems.length})
            </Text>
            <XPostList items={xItems} />
          </>
        ) : null}
        <View style={bottomPad > 0 ? { height: bottomPad } : styles.tailPad} />
      </ScrollView>

      <Modal
        visible={!!lightbox}
        transparent
        animationType="fade"
        onRequestClose={() => setLightbox(null)}>
        <View style={styles.lbWrap}>
          <ScrollView
            style={styles.lbScroll}
            contentContainerStyle={styles.lbContent}
            maximumZoomScale={3}
            minimumZoomScale={1}
            bouncesZoom
            centerContent
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}>
            {lbUri ? (
              <Image
                source={{ uri: lbUri }}
                style={{ width: lbImgW, height: lbImgH }}
                resizeMode="contain"
              />
            ) : null}
          </ScrollView>
          <Pressable
            onPress={() => setLightbox(null)}
            hitSlop={10}
            style={[styles.lbClose, { backgroundColor: theme.bgHover }]}>
            <X size={18} color="#f2f2f2" />
          </Pressable>
          {lightbox?.caption ? (
            <View style={styles.lbCaptionWrap}>
              <Text style={styles.lbCaption}>{lightbox.caption}</Text>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

export default function EvidencePanel() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { selectedKind } = useMap();
  const { view, selMode, evidenceUpdate, closeEvidence, closeDrawer } =
    useSelection();
  const { width } = useWindowDimensions();
  // Fullscreen panel only for DIRECT mode incidents and zone evidence; the
  // peek/compact flow renders evidence inline inside the sheet.
  const visible =
    view === 'evidence' &&
    !!evidenceUpdate &&
    (selMode === 'direct' || selectedKind === 'zone');
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      enter.setValue(0);
      Animated.timing(enter, {
        toValue: 1,
        duration: 300,
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
        styles.panel,
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
          onPress={closeEvidence}
          hitSlop={8}
          style={[styles.backBtn, { backgroundColor: theme.bgHover }]}>
          <ChevronLeft size={18} color={theme.textPrimary} />
        </Pressable>
        <Text
          style={[styles.title, { color: theme.textMuted, fontFamily: theme.fontMono }]}
          numberOfLines={1}>
          UPDATE EVIDENCE
        </Text>
        <Pressable
          onPress={closeDrawer}
          hitSlop={8}
          style={[styles.backBtn, { backgroundColor: theme.bgHover }]}>
          <X size={16} color={theme.textPrimary} />
        </Pressable>
      </View>
      <EvidenceBody key={evidenceUpdate.id} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    ...StyleSheet.absoluteFill,
  },
  bodyWrap: {
    flex: 1,
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
    flex: 1,
    fontSize: 11,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  headWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  eviTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eviTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 23,
    paddingRight: 8,
  },
  starBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eviTime: {
    fontSize: 11,
    marginBottom: 10,
  },
  eviBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 10,
    letterSpacing: 0.6,
    fontWeight: '600',
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
  },
  secLabel: {
    fontSize: 9.5,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    paddingTop: 16,
    paddingBottom: 10,
  },
  xSecLabel: {
    paddingTop: 22,
  },
  empty: {
    fontSize: 10.5,
    letterSpacing: 0.6,
    paddingVertical: 14,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mediaCell: {
    width: '48.5%',
    aspectRatio: 1.3,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mediaImg: {
    width: '100%',
    height: '100%',
  },
  xpCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
    marginBottom: 10,
  },
  xpHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  xpAvatar: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpAvatarText: {
    fontSize: 15,
    fontWeight: '700',
  },
  xpUser: {
    flex: 1,
  },
  xpName: {
    fontSize: 13,
    fontWeight: '600',
  },
  xpHandle: {
    fontSize: 11,
    marginTop: 1,
  },
  xpAgo: {
    fontSize: 10.5,
    maxWidth: 90,
  },
  xpArchived: {
    fontSize: 8.5,
    letterSpacing: 1.2,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  xpDesc: {
    fontSize: 12.5,
    lineHeight: 18.5,
    marginTop: 8,
  },
  xpArchiveImg: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    marginTop: 10,
  },
  xpActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  xpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  xpBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tailPad: {
    height: 28,
  },
  lbWrap: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
  },
  lbScroll: {
    flex: 1,
  },
  lbContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lbClose: {
    position: 'absolute',
    top: 54,
    right: 18,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lbCaptionWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  lbCaption: {
    color: '#d1d5db',
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
  },
});
