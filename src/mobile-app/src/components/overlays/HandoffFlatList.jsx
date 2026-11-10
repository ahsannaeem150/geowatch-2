import React, { forwardRef, useImperativeHandle } from 'react';
import { LegacyFlatList } from 'react-native-gesture-handler';
import Reanimated, { useAnimatedRef } from 'react-native-reanimated';

const AnimatedFlatList = Reanimated.createAnimatedComponent(LegacyFlatList);

const HandoffFlatList = forwardRef(function HandoffFlatList(props, ref) {
  const listRef = useAnimatedRef();

  useImperativeHandle(
    ref,
    () => ({
      animatedRef: listRef,
      get handlerTag() {
        return (
          listRef.current?.getNativeScrollRef?.()?.handlerTag ?? -1
        );
      },
      scrollTo: ({ y = 0, animated = false }) => {
        listRef.current?.scrollToOffset({ offset: y, animated });
      },
      scrollToEnd: ({ animated = false } = {}) => {
        listRef.current?.scrollToEnd({ animated });
      },
    }),
    [listRef],
  );

  return (
    <AnimatedFlatList
      ref={listRef}
      overScrollMode="never"
      removeClippedSubviews={false}
      {...props}
    />
  );
});

export default HandoffFlatList;
