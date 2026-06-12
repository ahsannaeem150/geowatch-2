import { useState, useCallback } from 'react';

/**
 * Hook for managing a map context menu.
 *
 * Returns:
 *   isOpen   — boolean
 *   position — { x, y } in client coordinates
 *   feature  — optional feature/object attached when the menu was opened
 *   open(position, feature?) — opens the menu
 *   close()  — closes the menu
 */
export function useMapContextMenu() {
  const [state, setState] = useState({
    isOpen: false,
    position: { x: 0, y: 0 },
    feature: null,
  });

  const open = useCallback((position, feature = null) => {
    setState({
      isOpen: true,
      position,
      feature,
    });
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return {
    isOpen: state.isOpen,
    position: state.position,
    feature: state.feature,
    open,
    close,
  };
}
