import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

// LIFO stack of overlays: { id, type, props }
// Types: 'sheet' | 'fullscreen' | 'drawerLeft' | 'topPanel' | 'modal'
const OverlayContext = createContext(null);

export function OverlayProvider({ children }) {
  const [stack, setStack] = useState([]);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const openOverlay = useCallback((overlay) => {
    setStack((prev) => {
      const filtered = prev.filter((o) => o.id !== overlay.id);
      return [...filtered, overlay];
    });
  }, []);

  const closeOverlay = useCallback((id) => {
    setStack((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const closeAll = useCallback(() => {
    setStack([]);
  }, []);

  const showToast = useCallback((message) => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const topOverlay = stack.length ? stack[stack.length - 1] : null;

  const value = useMemo(
    () => ({
      stack,
      openOverlay,
      closeOverlay,
      closeAll,
      topOverlay,
      toast,
      showToast,
    }),
    [stack, openOverlay, closeOverlay, closeAll, topOverlay, toast, showToast],
  );

  return (
    <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>
  );
}

export function useOverlay() {
  const ctx = useContext(OverlayContext);
  if (!ctx) {
    throw new Error('useOverlay must be used within OverlayProvider');
  }
  return ctx;
}

export default OverlayContext;
