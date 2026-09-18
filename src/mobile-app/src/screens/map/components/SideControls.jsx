import React, { useCallback } from 'react';
import { PermissionsAndroid, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Layers, LocateFixed, Minus, Plus } from 'lucide-react-native';
import Geolocation from '@react-native-community/geolocation';
import { useTheme } from '../../../context/ThemeContext';
import { useOverlay } from '../../../context/OverlayContext';
import { useMap } from '../../../context/MapContext';

function CtrlButton({ onPress, children, theme }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: theme.bgGlass,
          borderColor: theme.borderSubtle,
          opacity: pressed ? 0.75 : 1,
        },
      ]}>
      {children}
    </Pressable>
  );
}

export default function SideControls() {
  const { theme } = useTheme();
  const { openOverlay, showToast, stack } = useOverlay();
  const { zoomIn, zoomOut, flyTo } = useMap();
  const insets = useSafeAreaInsets();

  const hidden = stack.length > 0;

  // Runtime permission → current position → fly the camera there.
  const locate = useCallback(async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location permission',
          message: 'IntelMap24 uses your location to center the map.',
          buttonPositive: 'OK',
        },
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        showToast('Location permission denied');
        return;
      }
      Geolocation.getCurrentPosition(
        (pos) =>
          flyTo([pos.coords.longitude, pos.coords.latitude], 11),
        () => showToast('Location unavailable'),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
      );
    } catch {
      showToast('Location unavailable');
    }
  }, [flyTo, showToast]);

  return (
    <View
      style={[
        styles.col,
        { bottom: insets.bottom + 96 },
        hidden && styles.hidden,
      ]}
      pointerEvents={hidden ? 'none' : 'box-none'}>
      <CtrlButton
        theme={theme}
        onPress={() => openOverlay({ id: 'layers', type: 'sheet' })}>
        <Layers size={18} color={theme.textPrimary} />
      </CtrlButton>
      <CtrlButton theme={theme} onPress={zoomIn}>
        <Plus size={18} color={theme.textPrimary} />
      </CtrlButton>
      <CtrlButton theme={theme} onPress={zoomOut}>
        <Minus size={18} color={theme.textPrimary} />
      </CtrlButton>
      <CtrlButton theme={theme} onPress={locate}>
        <LocateFixed size={17} color={theme.textPrimary} />
      </CtrlButton>
    </View>
  );
}

const styles = StyleSheet.create({
  col: {
    position: 'absolute',
    right: 12,
    gap: 8,
    zIndex: 30,
  },
  hidden: {
    opacity: 0,
  },
  btn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
