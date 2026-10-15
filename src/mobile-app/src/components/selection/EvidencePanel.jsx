import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Clipboard,
  Easing,
  FlatList,
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
  FileText,
  Link2,
  Newspaper,
  Play,
  Star,
  X,
} from 'lucide-react-native';
import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';
import { useOverlay } from '../../context/OverlayContext';
import { useMap } from '../../context/MapContext';
import { useSelection } from '../../context/SelectionContext';
import { mediaUrl } from '../../services/api';
import VideoPlayer from './VideoPlayer';
import XPostEmbed from './XPostEmbed';
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
      {items.map((m, i) => {
        const isVideo = m.file_type === 'video';
        const uri = mediaUrl(m.thumbnail_url || (!isVideo ? m.file_url : null));
        return (
          <Pressable
            key={m.id}
            onPress={() => onOpen(i)}
            style={[styles.mediaCell, { backgroundColor: theme.bgHover, borderColor: theme.borderSubtle }]}>
            {uri ? (
              <Image source={{ uri }} style={styles.mediaImg} resizeMode="cover" />
            ) : null}
            {isVideo ? (
              <>
                <View style={styles.videoScrim} pointerEvents="none" />
                <View style={[styles.videoBadge, styles.overlayDim]}>
                  <Play size={15} color="#fff" fill="#fff" />
                </View>
                <View style={[styles.videoTag, styles.overlayDim]}>
                  <Play size={8} color="#fff" fill="#fff" />
                  <Text style={[styles.videoTagText, { fontFamily: theme.fontMono }]}>
                    VIDEO
                  </Text>
                </View>
              </>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function XPostCard({ post }) {
  const { theme, mode } = useTheme();
  const { showToast } = useOverlay();
  const archiveImg = mediaUrl(post.archive_media_url || post.archive_media_thumbnail_url);
  const archived = !!post.archived;

  const actions = (
    <View style={styles.xpActions}>
      {post.source_url ? (
        <Pressable
          onPress={() => Linking.openURL(post.source_url).catch(() => showToast('Could not open link'))}
          style={[styles.xpBtn, { borderColor: theme.borderSubtle, backgroundColor: theme.bgHover }]}>
          <ExternalLink size={10} color={theme.textSecondary} />
          <Text style={[styles.xpBtnText, { color: theme.textSecondary }]}>
            {archived ? 'Try original' : 'Open on X'}
          </Text>
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
  );

  // Web parity: archived/unavailable posts show the captured snapshot with a
  // notice; live posts render the real tweet through X's embed widget.
  if (archived) {
    return (
      <View
        style={[
          styles.xpCard,
          { backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle },
        ]}>
        <View style={[styles.xpNotice, { backgroundColor: theme.bgHover }]}>
          <Text style={[styles.xpNoticeText, { color: theme.textMuted }]}>
            Original tweet is unavailable · showing archived snapshot
          </Text>
        </View>
        {archiveImg ? (
          <Image
            source={{ uri: archiveImg }}
            style={[styles.xpArchiveImg, { backgroundColor: theme.bgHover }]}
            resizeMode="cover"
          />
        ) : post.description ? (
          <Text style={[styles.xpDesc, { color: theme.textSecondary }]}>
            {post.description}
          </Text>
        ) : null}
        <Text style={[styles.xpArchived, { color: theme.sev2, fontFamily: theme.fontMono }]}>
          ARCHIVED{post.archive_reason ? ` — ${post.archive_reason}` : ''}
        </Text>
        {actions}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.xpCard,
        styles.xpCardLive,
        { backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle },
      ]}>
      {post.source_url ? (
        <XPostEmbed url={post.source_url} text={post.description} dark={mode === 'dark'} />
      ) : (
        <Text style={[styles.xpDesc, { color: theme.textSecondary }]}>
          {post.description || 'X post'}
        </Text>
      )}
      {actions}
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

function urlHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function ArticleCard({ article }) {
  const { theme } = useTheme();
  const { showToast } = useOverlay();
  const host = urlHost(article.source_url);
  return (
    <View
      style={[
        styles.artCard,
        { backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle },
      ]}>
      <Pressable
        onPress={() =>
          article.source_url
            ? Linking.openURL(article.source_url).catch(() => showToast('Could not open link'))
            : null
        }
        style={styles.artMain}>
        <View style={[styles.artIcon, { backgroundColor: theme.accentSubtleBg }]}>
          <Newspaper size={15} color={theme.accentLight} />
        </View>
        <View style={styles.artBody}>
          <Text style={[styles.artTitle, { color: theme.textPrimary }]} numberOfLines={3}>
            {article.description || host || 'News article'}
          </Text>
          {host ? (
            <Text style={[styles.artPub, { color: theme.textMuted, fontFamily: theme.fontMono }]}>
              {host}
            </Text>
          ) : null}
        </View>
        {article.source_url ? <ExternalLink size={13} color={theme.textMuted} /> : null}
      </Pressable>
      {article.source_url ? (
        <View style={styles.artActions}>
          <Pressable
            onPress={() => {
              Clipboard.setString(article.source_url);
              showToast('Link copied');
            }}
            style={[styles.xpBtn, { borderColor: theme.borderSubtle, backgroundColor: theme.bgHover }]}>
            <Link2 size={10} color={theme.textSecondary} />
            <Text style={[styles.xpBtnText, { color: theme.textSecondary }]}>Copy link</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function AdminNoteCard({ note }) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const TRUNCATE_AT = 140;
  const text = note.description || '';
  const isLong = text.length > TRUNCATE_AT;
  const display = expanded || !isLong ? text : `${text.slice(0, TRUNCATE_AT)}…`;
  return (
    <View
      style={[
        styles.noteCard,
        { backgroundColor: theme.accentSubtleBg, borderColor: theme.accentSubtleBorder },
      ]}>
      <View style={styles.noteLabelRow}>
        <FileText size={11} color={theme.accentLight} />
        <Text style={[styles.noteLabel, { color: theme.accentLight, fontFamily: theme.fontMono }]}>
          ADMIN NOTE
        </Text>
        <Text style={[styles.noteAgo, { color: theme.textMuted }]}>{ago(note.created_at)}</Text>
      </View>
      <Text style={[styles.noteText, { color: theme.textSecondary }]}>{display}</Text>
      {isLong ? (
        <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={6}>
          <Text style={[styles.noteMore, { color: theme.accentLight }]}>
            {expanded ? 'Show less' : 'Read more'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// Pan-on-Android image page: render the image larger than the viewport
// inside a bidirectional ScrollView (no pinch-zoom lib in the dep set).
function GalleryImage({ item, width, height }) {
  const uri = mediaUrl(item.file_url || item.thumbnail_url);
  const w = parseFloat(item.width) || 0;
  const h = parseFloat(item.height) || 0;
  const scale = 1.6;
  const imgW = width * scale;
  const imgH = w > 0 && h > 0 ? (imgW * h) / w : height * 0.7;
  return (
    <ScrollView
      style={styles.lbScroll}
      contentContainerStyle={styles.lbContent}
      maximumZoomScale={3}
      minimumZoomScale={1}
      bouncesZoom
      centerContent
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: imgW, height: imgH }}
          resizeMode="contain"
        />
      ) : null}
    </ScrollView>
  );
}

// Swipe gallery modal: horizontal paging over all media items (images +
// videos), counter chip top-left, per-page caption, ✕ closes.
function MediaGalleryModal({ items, index, onIndexChange, onClose }) {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const current = items[index] || null;

  return (
    <Modal
      visible={index !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.lbWrap}>
        {index !== null ? (
          <FlatList
            data={items}
            horizontal
            pagingEnabled
            initialScrollIndex={index}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            keyExtractor={(m) => String(m.id)}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              onIndexChange(
                Math.max(
                  0,
                  Math.min(
                    items.length - 1,
                    Math.round(e.nativeEvent.contentOffset.x / width),
                  ),
                ),
              )
            }
            renderItem={({ item, index: i }) => (
              <View style={{ width, height }}>
                {item.file_type === 'video' ? (
                  <VideoPlayer
                    uri={mediaUrl(item.file_url)}
                    poster={mediaUrl(item.thumbnail_url)}
                    active={i === index}
                  />
                ) : (
                  <GalleryImage item={item} width={width} height={height} />
                )}
              </View>
            )}
          />
        ) : null}
        {items.length > 1 ? (
          <View
            style={[
              styles.lbCounter,
              { top: insets.top + 16 }, styles.overlayDim,
            ]}>
            <Text style={[styles.lbCounterText, { fontFamily: theme.fontMono }]}>
              {(index ?? 0) + 1} / {items.length}
            </Text>
          </View>
        ) : null}
        <Pressable
          onPress={onClose}
          hitSlop={10}
          style={[
            styles.lbClose,
            { top: insets.top + 10 }, styles.overlayDim,
          ]}>
          <X size={18} color="#f2f2f2" />
        </Pressable>
        {current?.caption ? (
          <View
            style={[
              styles.lbCaptionWrap,
              { bottom: insets.bottom + 12 },
              current.file_type === 'video' ? styles.lbCaptionAboveControls : null,
            ]}>
            <Text style={styles.lbCaption}>{current.caption}</Text>
          </View>
        ) : null}
      </View>
    </Modal>
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
  const [tab, setTab] = useState('all');
  const [lbIndex, setLbIndex] = useState(null);

  useEffect(() => {
    setTab('all');
    setLbIndex(null);
  }, [evidenceUpdate?.id]);

  // Update-attached evidence, falling back to the incident-level aggregate
  // when the update itself has none (web evidence-rail parity).
  const { mediaItems, xItems, articleItems, noteItems } = useMemo(() => {
    const u = evidenceUpdate;
    if (!u) {
      return { mediaItems: [], xItems: [], articleItems: [], noteItems: [] };
    }
    const detail = selectedId ? getCachedDetail(selectedId) : null;
    const tl = detail?.timeline || [];
    const allMedia = tl.flatMap((t) => t.media || []);
    const allX = tl.flatMap((t) => t.sources?.x_post || []);
    const allArticles = tl.flatMap((t) => t.sources?.news_article || []);
    const allNotes = tl.flatMap((t) => t.sources?.admin_note || []);
    const ownMedia = u.media || [];
    const ownX = u.sources?.x_post || [];
    const ownArticles = u.sources?.news_article || [];
    const ownNotes = u.sources?.admin_note || [];
    return {
      mediaItems: ownMedia.length ? ownMedia : allMedia,
      xItems: ownX.length ? ownX : allX,
      articleItems: ownArticles.length ? ownArticles : allArticles,
      noteItems: ownNotes.length ? ownNotes : allNotes,
    };
  }, [evidenceUpdate, selectedId, getCachedDetail]);

  if (!evidenceUpdate) {
    return null;
  }

  const u = evidenceUpdate;
  const verified = u.verification_status === 'verified';
  const total = mediaItems.length + xItems.length + articleItems.length + noteItems.length;
  const tabs = [
    { key: 'all', label: `All (${total})` },
    { key: 'media', label: `Media (${mediaItems.length})`, icon: 'camera' },
    { key: 'xposts', label: `𝕏 Posts (${xItems.length})` },
    { key: 'articles', label: `Articles (${articleItems.length})`, icon: 'news' },
    { key: 'notes', label: `Notes (${noteItems.length})`, icon: 'note' },
  ];

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
          const iconColor = active ? theme.accentLight : theme.textSecondary;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[styles.tabBtn, tabStyle]}>
              {t.icon === 'camera' ? <Camera size={11} color={iconColor} /> : null}
              {t.icon === 'news' ? <Newspaper size={11} color={iconColor} /> : null}
              {t.icon === 'note' ? <FileText size={11} color={iconColor} /> : null}
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

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        overScrollMode="never">
        {tab === 'all' || tab === 'media' ? (
          <>
            <Text
              style={[styles.secLabel, { color: theme.textMuted, fontFamily: theme.fontMono }]}>
              MEDIA ({mediaItems.length})
            </Text>
            <MediaGrid items={mediaItems} onOpen={setLbIndex} />
          </>
        ) : null}
        {tab === 'all' || tab === 'xposts' ? (
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
        {tab === 'all' || tab === 'articles' ? (
          <>
            <Text
              style={[
                styles.secLabel,
                styles.xSecLabel,
                { color: theme.textMuted, fontFamily: theme.fontMono },
              ]}>
              ARTICLES ({articleItems.length})
            </Text>
            {articleItems.length ? (
              <View>
                {articleItems.map((a) => (
                  <ArticleCard key={a.id} article={a} />
                ))}
              </View>
            ) : (
              <Text style={[styles.empty, { color: theme.textMuted, fontFamily: theme.fontMono }]}>
                — no articles linked —
              </Text>
            )}
          </>
        ) : null}
        {tab === 'all' || tab === 'notes' ? (
          <>
            <Text
              style={[
                styles.secLabel,
                styles.xSecLabel,
                { color: theme.textMuted, fontFamily: theme.fontMono },
              ]}>
              ADMIN NOTES ({noteItems.length})
            </Text>
            {noteItems.length ? (
              <View>
                {noteItems.map((n) => (
                  <AdminNoteCard key={n.id} note={n} />
                ))}
              </View>
            ) : (
              <Text style={[styles.empty, { color: theme.textMuted, fontFamily: theme.fontMono }]}>
                — no admin notes —
              </Text>
            )}
          </>
        ) : null}
        <View style={bottomPad > 0 ? { height: bottomPad } : styles.tailPad} />
      </ScrollView>

      <MediaGalleryModal
        items={mediaItems}
        index={lbIndex}
        onIndexChange={setLbIndex}
        onClose={() => setLbIndex(null)}
      />
    </View>
  );
}

export default function EvidencePanel() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { view, selMode, evidenceUpdate, closeEvidence, closeDrawer } =
    useSelection();
  const { width } = useWindowDimensions();
  // Fullscreen panel only for DIRECT-mode incidents; the peek/compact sheet
  // flow (incidents AND zones) renders evidence inline inside the sheet.
  const visible =
    view === 'evidence' && !!evidenceUpdate && selMode === 'direct';
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
  videoScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '42%',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  videoBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -19,
    marginTop: -19,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoTag: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  videoTagText: {
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#fff',
  },
  lbCounter: {
    position: 'absolute',
    left: 18,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  lbCounterText: {
    color: '#e5e7eb',
    fontSize: 11,
    fontWeight: '600',
  },
  overlayDim: {
    backgroundColor: 'rgba(0,0,0,0.55)',
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
  xpCardLive: {
    padding: 10,
  },
  xpNotice: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  xpNoticeText: {
    fontSize: 11,
    fontWeight: '500',
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
  artCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
    marginBottom: 10,
  },
  artMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  artIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artBody: {
    flex: 1,
  },
  artTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  artPub: {
    fontSize: 10,
    letterSpacing: 0.6,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  artActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 11,
  },
  noteCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
    marginBottom: 10,
  },
  noteLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noteLabel: {
    fontSize: 9,
    letterSpacing: 1.6,
    fontWeight: '700',
    flex: 1,
  },
  noteAgo: {
    fontSize: 10.5,
  },
  noteText: {
    fontSize: 12.5,
    lineHeight: 18.5,
    marginTop: 8,
  },
  noteMore: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 7,
  },
  tailPad: {
    height: 28,
  },
  lbWrap: {
    flex: 1,
    backgroundColor: '#000',
  },
  lbCaptionAboveControls: {
    bottom: 118,
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
