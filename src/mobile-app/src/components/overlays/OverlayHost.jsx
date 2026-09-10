import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useOverlay } from '../../context/OverlayContext';
import SheetContainer from './SheetContainer';
import { OVERLAY_META, PlaceholderBody } from './Placeholders';

// Z-order model (rendered bottom → top):
// map < side-controls < backdrop < sheets < fullscreen < left drawer
//   < top panels < modal < toast

const BACKDROP_TYPES = new Set(['sheet', 'drawerLeft', 'topPanel']);

function useEnter(progress) {
  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [progress]);
}

function HeaderRow({ overlay, title }) {
  const { theme } = useTheme();
  const { closeOverlay } = useOverlay();
  return (
    <View style={styles.headerRow}>
      <Text
        style={[
          styles.headerTitle,
          { color: theme.textPrimary, fontFamily: theme.fontHead },
        ]}>
        {title}
      </Text>
      <Pressable
        onPress={() => closeOverlay(overlay.id)}
        hitSlop={8}
        style={({ pressed }) => [
          styles.closeBtn,
          { backgroundColor: pressed ? theme.bgHover : 'transparent' },
        ]}>
        <X size={16} color={theme.textSecondary} />
      </Pressable>
    </View>
  );
}

function FullscreenContainer({ overlay, children }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  useEnter(progress);
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 0],
  });
  return (
    <Animated.View
      style={[
        styles.full,
        {
          backgroundColor: theme.bgDeep,
          opacity: progress,
          transform: [{ translateX }],
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom,
        },
      ]}>
      <HeaderRow overlay={overlay} title={overlay.props?.title} />
      <View style={styles.flex}>{children}</View>
    </Animated.View>
  );
}

function DrawerLeftContainer({ overlay, children }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  useEnter(progress);
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-320, 0],
  });
  return (
    <View style={styles.row} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.drawer,
          {
            backgroundColor: theme.bgSurface,
            borderRightColor: theme.borderSubtle,
            transform: [{ translateX }],
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom,
          },
        ]}>
        <HeaderRow overlay={overlay} title={overlay.props?.title} />
        <View style={styles.flex}>{children}</View>
      </Animated.View>
    </View>
  );
}

function TopPanelContainer({ overlay, children }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  useEnter(progress);
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, 0],
  });
  return (
    <View style={styles.topWrap} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.topPanel,
          {
            backgroundColor: theme.bgSurface,
            borderColor: theme.borderSubtle,
            opacity: progress,
            transform: [{ translateY }],
            marginTop: insets.top + 8,
          },
        ]}>
        <HeaderRow overlay={overlay} title={overlay.props?.title} />
        <View style={styles.topBody}>{children}</View>
      </Animated.View>
    </View>
  );
}

function ModalContainer({ overlay, children }) {
  const { theme } = useTheme();
  const progress = useRef(new Animated.Value(0)).current;
  useEnter(progress);
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
  });
  return (
    <View style={styles.modalWrap} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.modal,
          {
            backgroundColor: theme.bgSurface,
            borderColor: theme.borderSubtle,
            opacity: progress,
            transform: [{ scale }],
          },
        ]}>
        <HeaderRow overlay={overlay} title={overlay.props?.title} />
        <View style={styles.modalBody}>{children}</View>
      </Animated.View>
    </View>
  );
}

function Toast({ message }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.toast,
        {
          backgroundColor: theme.bgElevated,
          borderColor: theme.borderSubtle,
          bottom: insets.bottom + 96,
        },
      ]}
      pointerEvents="none">
      <Text
        style={[
          styles.toastText,
          { color: theme.textPrimary, fontFamily: theme.fontMono },
        ]}>
        {message}
      </Text>
    </View>
  );
}

export default function OverlayHost() {
  const { stack, topOverlay, closeOverlay, toast } = useOverlay();
  const hasBackdrop = stack.some((o) => BACKDROP_TYPES.has(o.type));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {hasBackdrop ? (
        <Pressable
          style={styles.backdrop}
          onPress={() => topOverlay && closeOverlay(topOverlay.id)}
        />
      ) : null}
      {stack.map((overlay) => {
        const meta = OVERLAY_META[overlay.id] ?? {};
        const resolved = {
          ...overlay,
          props: {
            title: meta.title ?? overlay.id,
            heightFraction: meta.heightFraction,
            meta: meta.meta,
            ...overlay.props,
          },
        };
        const body = overlay.props?.children ?? <PlaceholderBody />;
        switch (resolved.type) {
          case 'sheet':
            return (
              <SheetContainer key={resolved.id} overlay={resolved}>
                {body}
              </SheetContainer>
            );
          case 'fullscreen':
            return (
              <FullscreenContainer key={resolved.id} overlay={resolved}>
                {body}
              </FullscreenContainer>
            );
          case 'drawerLeft':
            return (
              <DrawerLeftContainer key={resolved.id} overlay={resolved}>
                {body}
              </DrawerLeftContainer>
            );
          case 'topPanel':
            return (
              <TopPanelContainer key={resolved.id} overlay={resolved}>
                {body}
              </TopPanelContainer>
            );
          case 'modal':
            return (
              <ModalContainer key={resolved.id} overlay={resolved}>
                {body}
              </ModalContainer>
            );
          default:
            return null;
        }
      })}
      {toast ? <Toast message={toast} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,.45)',
  },
  flex: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  full: {
    ...StyleSheet.absoluteFillObject,
  },
  row: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  drawer: {
    width: 300,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  topWrap: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 12,
  },
  topPanel: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: '70%',
  },
  topBody: {
    minHeight: 160,
  },
  modalWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modal: {
    alignSelf: 'stretch',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalBody: {
    minHeight: 140,
  },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  toastText: {
    fontSize: 11.5,
    letterSpacing: 0.4,
  },
});
