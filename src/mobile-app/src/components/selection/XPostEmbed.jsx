import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import WebView from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

// In-app fullscreen tweet reader: tapping a (scroll-safe) list embed opens
// the tweet on x.com inside a modal WebView instead of switching apps. The
// reader is fully interactive — X's own media viewer / video playback work
// inside it — and back returns to the evidence list.

// Mobile port of the web XEmbed (shared/incident-detail/XPostCompactList.jsx):
// the live tweet renders through X's official widgets.js inside a WebView —
// same blockquote markup the web hands to the widget. Height is reported back
// by an injected poller so the outer ScrollView owns all scrolling. If the
// widget never renders (offline, blocked, deleted tweet that the availability
// checker has not archived yet), we fall back to a plain text card.
const MIN_HEIGHT = 180;
const MAX_HEIGHT = 640;
const FALLBACK_TIMEOUT_MS = 9000;

const HEIGHT_POLLER = `
(function () {
  function report() {
    var h = document.documentElement.scrollHeight || document.body.scrollHeight;
    if (h && window.ReactNativeWebView) window.ReactNativeWebView.postMessage(String(h));
  }
  setInterval(report, 400);
  window.addEventListener('load', report);
  report();
})();
true;
`;

export default function XPostEmbed({ url, text, dark }) {
  const { theme } = useTheme();
  const [height, setHeight] = useState(0);
  const [failed, setFailed] = useState(false);
  const [readerOpen, setReaderOpen] = useState(false);
  const gotHeight = useRef(false);

  const themeAttr = dark ? 'dark' : 'light';
  const html = useMemo(
    () => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>html,body{margin:0;padding:0;background:transparent;}</style>
  </head>
  <body>
    <blockquote class="twitter-tweet" data-theme="${themeAttr}" data-conversation="none" data-dnt="true">
      <a href="${url}">${(text || '').replace(/</g, '&lt;')}</a>
    </blockquote>
    <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
  </body>
</html>`,
    [url, text, themeAttr],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      if (!gotHeight.current) {
        setFailed(true);
      }
    }, FALLBACK_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  if (failed) {
    return (
      <View style={[styles.fallback, { backgroundColor: theme.bgHover }]}>
        <Text style={[styles.fallbackText, { color: theme.textSecondary }]} numberOfLines={4}>
          {text || 'Post could not be loaded — it may have been deleted.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { height: height || MIN_HEIGHT }]}>
      <View style={styles.flex} pointerEvents="none">
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          style={styles.webview}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          javaScriptEnabled
          domStorageEnabled
          injectedJavaScript={HEIGHT_POLLER}
          onMessage={(e) => {
            const h = Number(e.nativeEvent.data);
            if (Number.isFinite(h) && h > 0) {
              gotHeight.current = true;
              setHeight(Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, h)));
            }
          }}
          onError={() => setFailed(true)}
        />
      </View>
      {/* Tap-through shield: the WebView must not swallow scroll gestures or
          fire in-embed clicks on accidental touches. A deliberate tap opens
          the in-app tweet reader; scrolling passes to the parent list. */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => setReaderOpen(true)}
      />
      {height === 0 ? (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator size="small" color={theme.textMuted} />
          <Text style={[styles.loaderText, { color: theme.textMuted, fontFamily: theme.fontMono }]}>
            Loading post…
          </Text>
        </View>
      ) : null}
      <TweetReader url={url} open={readerOpen} onClose={() => setReaderOpen(false)} />
    </View>
  );
}

function TweetReader({ url, open, onClose }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.readerWrap, { backgroundColor: theme.bgDeep }]}>
        <View
          style={[
            styles.readerHead,
            {
              paddingTop: insets.top + 8,
              backgroundColor: theme.bgSurface,
              borderBottomColor: theme.borderSubtle,
            },
          ]}>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            style={[styles.readerBack, { backgroundColor: theme.bgHover }]}>
            <ChevronLeft size={18} color={theme.textPrimary} />
          </Pressable>
          <Text style={[styles.readerTitle, { color: theme.textMuted, fontFamily: theme.fontMono }]}>
            POST
          </Text>
          <View style={styles.readerBack} />
        </View>
        {open ? (
          <WebView
            source={{ uri: url }}
            style={styles.readerWeb}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={styles.readerLoading}>
                <ActivityIndicator size="large" color={theme.textMuted} />
              </View>
            )}
          />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  flex: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  loaderText: {
    fontSize: 10.5,
    letterSpacing: 0.8,
  },
  fallback: {
    borderRadius: 10,
    padding: 14,
  },
  fallbackText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  readerWrap: {
    flex: 1,
  },
  readerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  readerBack: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    letterSpacing: 2.2,
  },
  readerWeb: {
    flex: 1,
  },
  readerLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
