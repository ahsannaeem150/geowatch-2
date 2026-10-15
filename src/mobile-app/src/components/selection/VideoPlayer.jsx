import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Pause,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import Video from 'react-native-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

// X-style inline video player: tap toggles play/pause (center icon flash),
// bottom bar = play button, tap-to-seek progress bar, elapsed/total time,
// mute toggle. Used by the evidence lightbox gallery.
function fmtTime(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function VideoPlayer({ uri, poster, active }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const playerRef = useRef(null);
  const [paused, setPaused] = useState(true);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [barW, setBarW] = useState(0);
  const flash = useRef(new Animated.Value(0)).current;

  // Pause when the gallery swipes to another page or the lightbox closes.
  useEffect(() => {
    if (!active) setPaused(true);
  }, [active]);

  const flashIcon = () => {
    flash.setValue(1);
    Animated.timing(flash, {
      toValue: 0,
      duration: 550,
      useNativeDriver: true,
    }).start();
  };

  const togglePlay = () => {
    setPaused((p) => !p);
    flashIcon();
  };

  const seekTo = (x) => {
    if (!barW || !duration) return;
    const ratio = Math.min(Math.max(x / barW, 0), 1);
    playerRef.current?.seek(ratio * duration);
    setPosition(ratio * duration);
  };

  const progress = duration > 0 ? position / duration : 0;

  return (
    <View style={styles.wrap}>
      <Video
        ref={playerRef}
        source={{ uri }}
        style={styles.flex}
        resizeMode="contain"
        paused={paused}
        muted={muted}
        poster={poster || undefined}
        posterResizeMode="contain"
        onLoad={(d) => setDuration(d.duration)}
        onProgress={(d) => setPosition(d.currentTime)}
        onEnd={() => {
          setPaused(true);
          setPosition(0);
          playerRef.current?.seek(0);
        }}
        progressUpdateInterval={250}
      />
      {/* Tap layer sits ABOVE the video surface (SurfaceView swallows touches
          of a wrapping Pressable on some devices). */}
      <Pressable style={StyleSheet.absoluteFill} onPress={togglePlay} />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.flashIcon,
          {
            opacity: flash,
            transform: [{ scale: flash.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
          },
        ]}>
        {paused ? (
          <Play size={34} color="#fff" fill="#fff" />
        ) : (
          <Pause size={34} color="#fff" fill="#fff" />
        )}
      </Animated.View>

      <View
        style={[
          styles.controls,
          styles.overlayDim,
          { bottom: insets.bottom + 8 },
        ]}>
        <Pressable onPress={togglePlay} hitSlop={8} style={styles.ctrlBtn}>
          {paused ? (
            <Play size={16} color="#fff" fill="#fff" />
          ) : (
            <Pause size={16} color="#fff" fill="#fff" />
          )}
        </Pressable>
        <Text style={[styles.time, { fontFamily: theme.fontMono }]}>
          {fmtTime(position)}
        </Text>
        <View
          style={styles.barTrack}
          onLayout={(e) => setBarW(e.nativeEvent.layout.width)}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(e) => seekTo(e.nativeEvent.locationX)}
          onResponderMove={(e) => seekTo(e.nativeEvent.locationX)}>
          <View style={[styles.barBg, styles.barTrackBg]}>
            <View
              style={[
                styles.barFill,
                { backgroundColor: theme.accentLight, width: `${progress * 100}%` },
              ]}
            />
          </View>
          <View
            style={[
              styles.knob,
              {
                backgroundColor: theme.accentLight,
                left: `${progress * 100}%`,
              },
            ]}
          />
        </View>
        <Text style={[styles.time, { fontFamily: theme.fontMono }]}>
          {fmtTime(duration)}
        </Text>
        <Pressable onPress={() => setMuted((m) => !m)} hitSlop={8} style={styles.ctrlBtn}>
          {muted ? (
            <VolumeX size={16} color="#fff" />
          ) : (
            <Volume2 size={16} color="#fff" />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignSelf: 'stretch',
  },
  flex: {
    flex: 1,
  },
  flashIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -36,
    marginTop: -36,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 0,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ctrlBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: {
    color: '#e5e7eb',
    fontSize: 11,
    minWidth: 32,
    textAlign: 'center',
  },
  barTrack: {
    flex: 1,
    height: 26,
    justifyContent: 'center',
  },
  barBg: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: 3,
    borderRadius: 2,
  },
  knob: {
    position: 'absolute',
    width: 11,
    height: 11,
    borderRadius: 6,
    marginLeft: -5,
  },
  overlayDim: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  barTrackBg: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
});
