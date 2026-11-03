import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import Reanimated, { useAnimatedRef } from 'react-native-reanimated';
import { LegacyScrollView } from 'react-native-gesture-handler';
import Svg, { Circle, Path } from 'react-native-svg';
import {
  Camera,
  ChevronLeft,
  ExternalLink,
  FileText,
  Heart,
  Link2,
  MessageCircle,
  Newspaper,
  Play,
  Repeat2,
  Star,
  X,
} from 'lucide-react-native';
import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';
import { useOverlay } from '../../context/OverlayContext';
import { useMap } from '../../context/MapContext';
import { useSelection } from '../../context/SelectionContext';
import { mediaUrl } from '../../services/api';
import { fetchTweet, getCachedTweet } from '../../services/x-post';
import VideoPlayer from './VideoPlayer';
import { Tag } from './PreviewCard';
import { bottomChromeInset } from '../../constants';

const AnimatedLegacyScrollView = Reanimated.createAnimatedComponent(LegacyScrollView);

const EvidenceScrollView = React.forwardRef(function EvidenceScrollView(
  { children, ...props },
  ref,
) {
  const scrollRef = useAnimatedRef();
  React.useImperativeHandle(
    ref,
    () => ({
      animatedRef: scrollRef,
      get handlerTag() {
        return scrollRef.current?.getNativeScrollRef?.()?.handlerTag ?? -1;
      },
      scrollTo: ({ y = 0, animated = false }) => {
        scrollRef.current?.scrollTo({ x: 0, y, animated });
      },
      scrollToEnd: ({ animated = false } = {}) => {
        scrollRef.current?.scrollToEnd({ animated });
      },
    }),
    [scrollRef],
  );

  return (
    <AnimatedLegacyScrollView
      ref={scrollRef}
      overScrollMode="never"
      removeClippedSubviews={false}
      {...props}>
      {children}
    </AnimatedLegacyScrollView>
  );
});

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

const MEDIA_BATCH_SIZE = 12;
const MEDIA_REVEAL_THRESHOLD = 240;

function orderMediaItems(items, featuredId) {
  return items
    .map((item, index) => ({
      item,
      index,
      priority: item.id === featuredId ? 2 : item.pinned ? 1 : 0,
    }))
    .sort((a, b) => b.priority - a.priority || a.index - b.index)
    .map(({ item }) => item);
}

const MediaCell = React.memo(function MediaCell({ item, index, total, hero, onOpen }) {
  const { theme } = useTheme();
  const isVideo = item.file_type === 'video';
  const uri = mediaUrl(item.thumbnail_url || (!isVideo ? item.file_url : null));
  const [failedUri, setFailedUri] = useState(null);
  const showFallback = !uri || failedUri === uri;
  const duration = isVideo && item.duration != null ? fmtDuration(item.duration) : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${isVideo ? 'Video' : 'Image'} ${index + 1} of ${total}${
        item.caption ? `: ${item.caption}` : ''
      }`}
      onPress={() => onOpen(index)}
      style={[
        hero ? styles.mediaHero : styles.mediaCell,
        { backgroundColor: theme.bgHover, borderColor: theme.borderSubtle },
      ]}>
      {uri && failedUri !== uri ? (
        <Image
          source={{ uri }}
          style={styles.mediaImg}
          resizeMode="cover"
          fadeDuration={0}
          onError={() => setFailedUri(uri)}
        />
      ) : null}
      {showFallback ? (
        <View style={styles.mediaFallback} pointerEvents="none">
          {isVideo ? (
            <Play size={22} color={theme.textSecondary} fill={theme.textSecondary} />
          ) : (
            <Camera size={22} color={theme.textSecondary} />
          )}
          <Text style={[styles.mediaFallbackText, { color: theme.textMuted, fontFamily: theme.fontMono }]}>
            {isVideo ? 'VIDEO' : 'IMAGE'}
          </Text>
        </View>
      ) : null}
      {isVideo && !showFallback ? (
        <View style={[styles.videoBadge, styles.overlayDim]} pointerEvents="none">
          <Play size={15} color="#fff" fill="#fff" />
        </View>
      ) : null}
      {duration && !showFallback ? (
        <View style={[styles.durChip, styles.overlayDim]} pointerEvents="none">
          <Text style={styles.durChipText}>{duration}</Text>
        </View>
      ) : null}
    </Pressable>
  );
});

function MediaGrid({ items, total, onOpen }) {
  if (!items.length) return null;
  const hasHero = total % 2 === 1;
  const pairs = hasHero ? items.slice(1) : items;

  return (
    <View style={styles.mediaGrid}>
      {hasHero ? (
        <MediaCell item={items[0]} index={0} total={total} hero onOpen={onOpen} />
      ) : null}
      <View style={styles.mediaPairs}>
        {pairs.map((item, i) => {
          const index = hasHero ? i + 1 : i;
          return (
            <MediaCell
              key={item.id}
              item={item}
              index={index}
              total={total}
              onOpen={onOpen}
            />
          );
        })}
      </View>
    </View>
  );
}

function compactNum(n) {
  if (n === null || n === undefined) {
    return null;
  }
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

function fmtDuration(s) {
  if (s == null) {
    return null;
  }
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

// Twitter-style verified badge: filled circle + white tick (gold for orgs).
function VerifiedBadge({ gold }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={10} fill={gold ? '#e3b008' : '#1d9bf0'} />
      <Path
        d="M8 12.5l2.5 2.5L16 9.5"
        stroke="#fff"
        strokeWidth={2.4}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// X-embed look-alike palette: black card in dark mode, white in light mode.
function tweetPalette(mode) {
  return mode === 'dark'
    ? { card: '#000000', border: '#2f3336', name: '#e7e9ea', sub: '#71767b', text: '#e7e9ea', hover: '#16181c' }
    : { card: '#ffffff', border: '#cfd9de', name: '#0f1419', sub: '#536471', text: '#0f1419', hover: '#f7f9f9' };
}

// X-style media mosaic: 1 = full-bleed, 2 = split, 3 = tall-left stack, 4 = 2x2.
function TweetMosaic({ items, onOpen, tw }) {
  const n = items.length;
  if (!n) {
    return null;
  }
  const renderCell = (m, i, style) => {
    const isVideo = m.file_type === 'video';
    const uri = mediaUrl(m.thumbnail_url || (!isVideo ? m.file_url : null));
    const dur = m.duration != null ? fmtDuration(m.duration) : null;
    return (
      <Pressable
        key={m.id}
        onPress={() => onOpen(i)}
        style={[styles.mosaicCell, { backgroundColor: tw.hover }, style]}>
        {uri ? <Image source={{ uri }} style={styles.mediaImg} resizeMode="cover" /> : null}
        {isVideo ? (
          <View style={[styles.videoBadge, styles.overlayDim]}>
            <Play size={15} color="#fff" fill="#fff" />
          </View>
        ) : null}
        {dur ? (
          <View style={[styles.durChip, styles.overlayDim]}>
            <Text style={styles.durChipText}>{dur}</Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

  if (n === 1) {
    const m = items[0];
    const ratio = m.width && m.height ? Math.min(1.91, Math.max(0.8, m.width / m.height)) : 1.6;
    return (
      <View style={[styles.mosaic, { borderColor: tw.border }]}>
        {renderCell(m, 0, { aspectRatio: ratio })}
      </View>
    );
  }
  if (n === 2) {
    return (
      <View style={[styles.mosaic, styles.mosaicRow, { borderColor: tw.border }, styles.mosaicTwo]}>
        {renderCell(items[0], 0, styles.mosaicFlex)}
        {renderCell(items[1], 1, styles.mosaicFlex)}
      </View>
    );
  }
  if (n === 3) {
    return (
      <View style={[styles.mosaic, styles.mosaicRow, { borderColor: tw.border }, styles.mosaicThree]}>
        {renderCell(items[0], 0, styles.mosaicFlex)}
        <View style={styles.mosaicCol}>
          {renderCell(items[1], 1, styles.mosaicFlex)}
          {renderCell(items[2], 2, styles.mosaicFlex)}
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.mosaic, { borderColor: tw.border }, styles.mosaicFour]}>
      <View style={styles.mosaicRowFlex}>
        {renderCell(items[0], 0, styles.mosaicFlex)}
        {renderCell(items[1], 1, styles.mosaicFlex)}
      </View>
      <View style={styles.mosaicRowFlex}>
        {renderCell(items[2], 2, styles.mosaicFlex)}
        {renderCell(items[3], 3, styles.mosaicFlex)}
      </View>
    </View>
  );
}

// Live tweet → native card (fxtwitter-resolved author/text/media/stats); its
// media opens in the app's own swipe gallery. Archived posts keep the snapshot
// view. Falls back to a plain text card if the tweet cannot be resolved.
export const XPostCard = React.memo(function XPostCard({ post }) {
  const { theme, mode } = useTheme();
  const { showToast } = useOverlay();
  const archiveImg = mediaUrl(post.archive_media_url || post.archive_media_thumbnail_url);
  const aw = parseFloat(post.archive_media_width) || 0;
  const ah = parseFloat(post.archive_media_height) || 0;
  const archiveAspect = aw > 0 && ah > 0 ? aw / ah : null;
  const archived = !!post.archived;
  const [tweet, setTweet] = useState(() => getCachedTweet(post.source_url));
  const [failed, setFailed] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(null);

  useEffect(() => {
    let alive = true;
    if (!archived && post.source_url) {
      fetchTweet(post.source_url).then((t) => {
        if (alive) {
          if (t) {
            setTweet(t);
          } else {
            setFailed(true);
          }
        }
      });
    }
    return () => {
      alive = false;
    };
  }, [archived, post.source_url]);

  const galleryItems = useMemo(
    () =>
      (tweet?.media || []).map((m, i) => ({
        id: `tw-${post.id}-${i}`,
        file_type: m.type,
        file_url: m.url,
        thumbnail_url: m.thumb,
        width: m.width,
        height: m.height,
        duration: m.duration,
        caption: null,
      })),
    [tweet, post.id],
  );

  const archiveGalleryItems = useMemo(
    () =>
      archiveImg
        ? [
            {
              id: `arch-${post.id}`,
              file_type: 'image',
              file_url: post.archive_media_url || post.archive_media_thumbnail_url,
              thumbnail_url: post.archive_media_thumbnail_url,
              width: post.archive_media_width,
              height: post.archive_media_height,
              caption: 'Original tweet is unavailable',
              fit: 'contain',
            },
          ]
        : [],
    [archiveImg, post.id, post.archive_media_url, post.archive_media_thumbnail_url, post.archive_media_width, post.archive_media_height],
  );

  const actions = archived ? null : (
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
  // notice; live posts render as native tweet cards.
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
          <Pressable onPress={() => setGalleryIndex(0)}>
            <Image
              source={{ uri: archiveImg }}
              style={[
                styles.xpArchiveImg,
                { backgroundColor: theme.bgHover },
                archiveAspect ? { height: undefined, aspectRatio: archiveAspect } : null,
              ]}
              resizeMode={archiveAspect ? 'cover' : 'contain'}
            />
          </Pressable>
        ) : post.description ? (
          <Text style={[styles.xpDesc, { color: theme.textSecondary }]}>
            {post.description}
          </Text>
        ) : null}
        {galleryIndex !== null ? (
          <MediaGalleryModal
            items={archiveGalleryItems}
            index={galleryIndex}
            onIndexChange={setGalleryIndex}
            onClose={() => setGalleryIndex(null)}
          />
        ) : null}
      </View>
    );
  }

  if (failed || (!tweet && !post.source_url)) {
    return (
      <View
        style={[
          styles.xpCard,
          { backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle },
        ]}>
        <Text style={[styles.xpDesc, { color: theme.textSecondary }]}>
          {post.description || 'X post'}
        </Text>
        {actions}
      </View>
    );
  }

  if (!tweet) {
    return (
      <View
        style={[
          styles.xpCard,
          { backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle },
        ]}>
        <View style={styles.xpSkeletonRow}>
          <View style={[styles.xpSkeletonAvatar, { backgroundColor: theme.bgHover }]} />
          <View style={styles.xpSkeletonCol}>
            <View style={[styles.xpSkeletonBar, { backgroundColor: theme.bgHover }]} />
            <View
              style={[styles.xpSkeletonBar, styles.xpSkeletonBarShort, { backgroundColor: theme.bgHover }]}
            />
          </View>
        </View>
      </View>
    );
  }

  const tw = tweetPalette(mode);
  return (
    <View
      style={[
        styles.twCard,
        { backgroundColor: tw.card, borderColor: tw.border },
      ]}>
      <View style={styles.xpHead}>
        {tweet.avatar ? (
          <Image source={{ uri: tweet.avatar }} style={styles.twAvatar} />
        ) : (
          <View style={[styles.xpAvatar, { backgroundColor: tw.hover }]}>
            <Text style={[styles.xpAvatarText, { color: tw.name }]}>𝕏</Text>
          </View>
        )}
        <View style={styles.xpUser}>
          <View style={styles.twNameRow}>
            <Text style={[styles.xpName, { color: tw.name }]} numberOfLines={1}>
              {tweet.name}
            </Text>
            {tweet.verified ? <VerifiedBadge gold={tweet.verifiedType === 'organization'} /> : null}
          </View>
          <Text style={[styles.xpHandle, { color: tw.sub }]} numberOfLines={1}>
            @{tweet.handle}
          </Text>
        </View>
        <Text style={[styles.twGlyph, { color: tw.name }]}>𝕏</Text>
      </View>
      {tweet.text ? (
        <Text style={[styles.twText, { color: tw.text }]}>{tweet.text}</Text>
      ) : null}
      <TweetMosaic items={galleryItems} onOpen={setGalleryIndex} tw={tw} />
      {tweet.date && isValid(tweet.date) ? (
        <Text style={[styles.twTime, { color: tw.sub }]}>
          {format(tweet.date, 'h:mm a · MMM d, yyyy')}
          {tweet.views !== null ? ` · ${compactNum(tweet.views)} Views` : ''}
        </Text>
      ) : null}
      <View style={[styles.twStatsBar, { borderTopColor: tw.border }]}>
        {tweet.replies !== null ? (
          <View style={styles.twStatItem}>
            <MessageCircle size={13} color={tw.sub} />
            <Text style={[styles.twStat, { color: tw.sub }]}>{compactNum(tweet.replies)}</Text>
          </View>
        ) : null}
        {tweet.retweets !== null ? (
          <View style={styles.twStatItem}>
            <Repeat2 size={14} color={tw.sub} />
            <Text style={[styles.twStat, { color: tw.sub }]}>{compactNum(tweet.retweets)}</Text>
          </View>
        ) : null}
        {tweet.likes !== null ? (
          <View style={styles.twStatItem}>
            <Heart size={13} color={tw.sub} />
            <Text style={[styles.twStat, { color: tw.sub }]}>{compactNum(tweet.likes)}</Text>
          </View>
        ) : null}
        <View style={styles.twStatSpacer} />
        {post.source_url ? (
          <Pressable
            onPress={() => Linking.openURL(post.source_url).catch(() => showToast('Could not open link'))}
            hitSlop={6}
            style={styles.twStatItem}>
            <ExternalLink size={12} color={tw.sub} />
            <Text style={[styles.twStat, { color: tw.sub }]}>Open on X</Text>
          </Pressable>
        ) : null}
        {post.source_url ? (
          <Pressable
            onPress={() => {
              Clipboard.setString(post.source_url);
              showToast('Link copied');
            }}
            hitSlop={6}
            style={styles.twStatItem}>
            <Link2 size={12} color={tw.sub} />
            <Text style={[styles.twStat, { color: tw.sub }]}>Copy</Text>
          </Pressable>
        ) : null}
      </View>
      {galleryIndex !== null ? (
        <MediaGalleryModal
          items={galleryItems}
          index={galleryIndex}
          onIndexChange={setGalleryIndex}
          onClose={() => setGalleryIndex(null)}
        />
      ) : null}
    </View>
  );
});

function urlHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function ArticleCard({ article }) {
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

export function AdminNoteCard({ note }) {
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
  const scale = item.fit === 'contain' ? 1 : 1.6;
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
export function MediaGalleryModal({ items, index, onIndexChange, onClose }) {
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
export const EvidenceBody = React.memo(function EvidenceBody({
  bottomPad = 0,
  bottomPadStyle,
  motionStyle,
  scrollHandlers,
  scrollRef,
}) {
  const { theme } = useTheme();
  const { showToast } = useOverlay();
  const { selectedId } = useMap();
  const { evidenceUpdate, getCachedDetail } = useSelection();
  const [tab, setTab] = useState('all');
  const [lbIndex, setLbIndex] = useState(null);
  const [mediaRenderCount, setMediaRenderCount] = useState(MEDIA_BATCH_SIZE);

  useEffect(() => {
    setTab('all');
    setLbIndex(null);
    setMediaRenderCount(MEDIA_BATCH_SIZE);
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
    const featuredMediaId = u.featured_item?.source_type === 'media' ? u.featured_item.item_id : null;
    return {
      mediaItems: orderMediaItems(ownMedia.length ? ownMedia : allMedia, featuredMediaId),
      xItems: ownX.length ? ownX : allX,
      articleItems: ownArticles.length ? ownArticles : allArticles,
      noteItems: ownNotes.length ? ownNotes : allNotes,
    };
  }, [evidenceUpdate, selectedId, getCachedDetail]);

  useEffect(() => {
    for (const post of xItems) {
      if (!post.archived && post.source_url) {
        fetchTweet(post.source_url).catch(() => {});
      }
    }
  }, [xItems]);

  const visibleMediaItems = useMemo(
    () => mediaItems.slice(0, mediaRenderCount),
    [mediaItems, mediaRenderCount],
  );
  const revealMediaBatch = useCallback(
    (event) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      if (
        contentOffset.y + layoutMeasurement.height >=
        contentSize.height - MEDIA_REVEAL_THRESHOLD
      ) {
        setMediaRenderCount((count) =>
          count >= mediaItems.length ? count : Math.min(count + MEDIA_BATCH_SIZE, mediaItems.length),
        );
      }
    },
    [mediaItems.length],
  );
  const handleScrollEndDrag = useCallback(
    (event) => {
      scrollHandlers?.onScrollEndDrag?.(event);
      if (Math.abs(event.nativeEvent.velocity?.y || 0) < 0.05) {
        revealMediaBatch(event);
      }
    },
    [revealMediaBatch, scrollHandlers],
  );
  const handleMomentumScrollEnd = useCallback(
    (event) => {
      scrollHandlers?.onMomentumScrollEnd?.(event);
      revealMediaBatch(event);
    },
    [revealMediaBatch, scrollHandlers],
  );
  const mediaContent = useMemo(
    () => <MediaGrid items={visibleMediaItems} total={mediaItems.length} onOpen={setLbIndex} />,
    [mediaItems.length, visibleMediaItems],
  );
  const listItems = useMemo(() => {
    const rows = [];
    if (tab === 'all' || tab === 'media') {
      if (mediaItems.length || tab === 'media') {
        rows.push({ key: 'media-heading', type: 'heading', label: `MEDIA (${mediaItems.length})` });
      }
      if (mediaItems.length) {
        rows.push({ key: 'media-grid', type: 'media' });
      } else if (tab === 'media') {
        rows.push({ key: 'media-empty', type: 'empty', label: '— no media attached to this update —' });
      }
    }
    if (tab === 'all' || tab === 'xposts') {
      rows.push({ key: 'x-heading', type: 'heading', label: `X POSTS (${xItems.length})` });
      if (xItems.length) {
        xItems.forEach((post) => rows.push({ key: `x-${post.id}`, type: 'x', post }));
      } else {
        rows.push({ key: 'x-empty', type: 'empty', label: '— no X posts linked —' });
      }
    }
    if (tab === 'all' || tab === 'articles') {
      rows.push({ key: 'articles-heading', type: 'heading', label: `ARTICLES (${articleItems.length})` });
      if (articleItems.length) {
        articleItems.forEach((article) => rows.push({ key: `article-${article.id}`, type: 'article', article }));
      } else {
        rows.push({ key: 'articles-empty', type: 'empty', label: '— no articles linked —' });
      }
    }
    if (tab === 'all' || tab === 'notes') {
      rows.push({ key: 'notes-heading', type: 'heading', label: `ADMIN NOTES (${noteItems.length})` });
      if (noteItems.length) {
        noteItems.forEach((note) => rows.push({ key: `note-${note.id}`, type: 'note', note }));
      } else {
        rows.push({ key: 'notes-empty', type: 'empty', label: '— no admin notes linked —' });
      }
    }
    return rows;
  }, [tab, mediaItems, xItems, articleItems, noteItems]);
  const renderItem = useCallback(
    ({ item }) => {
      if (item.type === 'heading') {
        return (
          <Text
            style={[
              styles.secLabel,
              item.key === 'media-heading' ? null : styles.xSecLabel,
              { color: theme.textMuted, fontFamily: theme.fontMono },
            ]}>
            {item.label}
          </Text>
        );
      }
      if (item.type === 'media') return mediaContent;
      if (item.type === 'x') return <XPostCard post={item.post} />;
      if (item.type === 'article') return <ArticleCard article={item.article} />;
      if (item.type === 'note') return <AdminNoteCard note={item.note} />;
      return (
        <Text style={[styles.empty, { color: theme.textMuted, fontFamily: theme.fontMono }]}>
          {item.label}
        </Text>
      );
    },
    [mediaContent, theme],
  );

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

  const headerContent = (
    <>
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}>
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
        </ScrollView>
      </View>
    </>
  );

  return (
    <View style={styles.bodyWrap}>
      <Reanimated.View style={styles.bodyWrap}>
        <EvidenceScrollView
          ref={scrollRef}
          style={styles.body}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          {...scrollHandlers}
          onScrollEndDrag={handleScrollEndDrag}
          onMomentumScrollEnd={handleMomentumScrollEnd}>
          <Reanimated.View style={motionStyle?.contentStyle}>
            {headerContent}
            {listItems.map((item) => (
              <React.Fragment key={item.key}>{renderItem({ item })}</React.Fragment>
            ))}
            {motionStyle ? (
              <Reanimated.View style={motionStyle.padStyle} />
            ) : bottomPadStyle ? (
              <Reanimated.View style={bottomPadStyle} />
            ) : (
              <Animated.View style={bottomPad ? { height: bottomPad } : styles.tailPad} />
            )}
          </Reanimated.View>
        </EvidenceScrollView>
      </Reanimated.View>

      {lbIndex !== null ? (
        <MediaGalleryModal
          items={mediaItems}
          index={lbIndex}
          onIndexChange={setLbIndex}
          onClose={() => setLbIndex(null)}
        />
      ) : null}
    </View>
  );
});

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
          paddingBottom: bottomChromeInset(insets),
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabBarContent: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 12,
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
    gap: 8,
  },
  mediaPairs: {
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
  mediaHero: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mediaImg: {
    width: '100%',
    height: '100%',
  },
  mediaFallback: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  mediaFallbackText: {
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 1,
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
  twAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  twGlyph: {
    fontSize: 14,
    fontWeight: '700',
  },
  twCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  twNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  twText: {
    fontSize: 13.5,
    lineHeight: 19,
    marginTop: 10,
  },
  twTime: {
    fontSize: 11.5,
    marginTop: 12,
  },
  twStatsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  twStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  twStatSpacer: {
    flex: 1,
  },
  mosaic: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 12,
  },
  mosaicRow: {
    flexDirection: 'row',
    gap: 2,
  },
  mosaicTwo: {
    aspectRatio: 1.78,
  },
  mosaicThree: {
    aspectRatio: 1.5,
  },
  mosaicFour: {
    aspectRatio: 1.6,
  },
  mosaicRowFlex: {
    flex: 1,
    flexDirection: 'row',
    gap: 2,
  },
  mosaicCol: {
    flex: 1,
    gap: 2,
  },
  mosaicFlex: {
    flex: 1,
  },
  mosaicCell: {
    overflow: 'hidden',
  },
  durChip: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durChipText: {
    color: '#fff',
    fontSize: 9.5,
    fontWeight: '700',
  },
  twStat: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  xpSkeletonRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  xpSkeletonAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  xpSkeletonCol: {
    flex: 1,
    gap: 7,
  },
  xpSkeletonBar: {
    height: 11,
    borderRadius: 5,
    width: '70%',
  },
  xpSkeletonBarShort: {
    width: '40%',
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
