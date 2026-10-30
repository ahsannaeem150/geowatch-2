import React from 'react';
import Reanimated from 'react-native-reanimated';
import HandoffScrollView from '../overlays/HandoffScrollView';

export default function DetentScrollView({
  edge,
  scrollRef,
  bottomPadStyle,
  children,
  ...props
}) {
  return (
    <HandoffScrollView
      ref={scrollRef}
      showsVerticalScrollIndicator={false}
      scrollEnabled={edge.scrollableNow}
      scrollEventThrottle={16}
      onScroll={edge.onScroll}
      onScrollEndDrag={edge.onScrollEndDrag}
      onMomentumScrollBegin={edge.onMomentumScrollBegin}
      onMomentumScrollEnd={edge.onMomentumScrollEnd}
      onLayout={edge.onLayout}
      onContentSizeChange={edge.onContentSizeChange}
      {...props}>
      {children}
      <Reanimated.View style={bottomPadStyle} />
    </HandoffScrollView>
  );
}
