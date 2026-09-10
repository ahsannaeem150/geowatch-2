import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Layers, LocateFixed, Minus, Plus } from 'lucide-react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useOverlay } from '../../../context/OverlayContext';

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
  const insets = useSafeAreaInsets();

  const hidden = stack.length > 0;

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
      <CtrlButton theme={theme} onPress={() => showToast('Zoom in — coming soon')}>
        <Plus size={18} color={theme.textPrimary} />
      </CtrlButton>
      <CtrlButton theme={theme} onPress={() => showToast('Zoom out — coming soon')}>
        <Minus size={18} color={theme.textPrimary} />
      </CtrlButton>
      <CtrlButton theme={theme} onPress={() => showToast('Locate — coming soon')}>
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
